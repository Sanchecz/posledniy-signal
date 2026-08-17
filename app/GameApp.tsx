"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ACHIEVEMENTS,
  GAME_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  RESONANCE_THRESHOLD,
  STORY_CHAPTERS,
  UPGRADES,
  type AttributeId,
  type StoryChapter,
  type UpgradeId,
} from "./game/config";
import {
  addEchoes,
  applyStoryChoice,
  calculateOfflineProgress,
  createInitialState,
  enterResonance,
  formatNumber,
  getCurrentChapter,
  getEarnedAchievementIds,
  getEnding,
  getNarrativeTransmission,
  getNextChapter,
  getPendingChapter,
  getProductionStats,
  getResonanceGain,
  getUpgradeCost,
  normalizeGameState,
  purchaseUpgrade,
  type GameState,
} from "./game/engine";
import { PwaRegistrar } from "./PwaRegistrar";
import { StoryScene } from "./StoryScene";

type TabId = "signal" | "upgrade" | "chronicle";
type Burst = { id: number; left: number; value: number; critical: boolean };
type OfflineReport = { seconds: number; reward: number };
type ChoiceReveal = { chapterId: number; reply: string; path: AttributeId };

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const NAV_ITEMS: readonly { id: TabId; label: string; icon: string }[] = [
  { id: "signal", label: "История", icon: "◉" },
  { id: "upgrade", label: "Усиления", icon: "⌁" },
  { id: "chronicle", label: "Судьба", icon: "◫" },
];

const PATH_COPY: Record<AttributeId, { label: string; icon: string; color: string }> = {
  empathy: { label: "Близость", icon: "♥", color: "rose" },
  will: { label: "Авантюризм", icon: "ϟ", color: "gold" },
  insight: { label: "Тайна", icon: "◇", color: "cyan" },
};

function serializeState(state: GameState, now = Date.now()): string {
  return JSON.stringify({ ...state, lastSavedAt: now });
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.floor(seconds / 60));
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export function GameApp() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("signal");
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [storyModal, setStoryModal] = useState<StoryChapter | null>(null);
  const [choiceReveal, setChoiceReveal] = useState<ChoiceReveal | null>(null);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSnapshotAt, setSettingsSnapshotAt] = useState(0);
  const [resetArmed, setResetArmed] = useState(false);
  const [resonanceOpen, setResonanceOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleNativeBack = (event: Event) => {
      let handled = true;

      if (settingsOpen) {
        setSettingsOpen(false);
        setResetArmed(false);
      } else if (resetArmed) setResetArmed(false);
      else if (resonanceOpen) setResonanceOpen(false);
      else if (storyModal) setStoryModal(null);
      else if (choiceReveal) setChoiceReveal(null);
      else if (offlineReport) setOfflineReport(null);
      else if (activeTab !== "signal") setActiveTab("signal");
      else handled = false;

      if (handled) event.preventDefault();
    };

    window.addEventListener("last-signal:native-back", handleNativeBack);
    return () => window.removeEventListener("last-signal:native-back", handleNativeBack);
  }, [activeTab, choiceReveal, offlineReport, resetArmed, resonanceOpen, settingsOpen, storyModal]);

  const stateRef = useRef(game);
  const initializedRef = useRef(false);
  const comboRef = useRef(0);
  const lastTapAtRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  const updateGame = useCallback((updater: (previous: GameState) => GameState) => {
    setGame((previous) => {
      const next = updater(previous);
      stateRef.current = next;
      return next;
    });
  }, []);

  const save = useCallback((state = stateRef.current) => {
    try {
      window.localStorage.setItem(GAME_STORAGE_KEY, serializeState(state));
    } catch {
      // The in-memory game continues if durable browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const now = Date.now();
    let restored = createInitialState(now);
    try {
      let saved = window.localStorage.getItem(GAME_STORAGE_KEY);
      if (!saved) {
        for (const key of LEGACY_STORAGE_KEYS) {
          saved = window.localStorage.getItem(key);
          if (saved) break;
        }
      }
      if (saved) restored = normalizeGameState(JSON.parse(saved), now);
    } catch {
      restored = createInitialState(now);
    }

    const offline = calculateOfflineProgress(restored, now);
    const hydrated = addEchoes({ ...restored, lastSavedAt: now }, offline.reward);
    stateRef.current = hydrated;
    setGame(hydrated);
    setReady(true);
    setIsOnline(window.navigator.onLine);
    lastTickAtRef.current = now;
    if (offline.seconds >= 60 && offline.reward > 0) queueMicrotask(() => setOfflineReport(offline));
    try {
      window.localStorage.setItem(GAME_STORAGE_KEY, serializeState(hydrated, now));
      for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
    } catch {
      // Migration stays valid in memory even when storage is blocked.
    }
  }, []);

  useEffect(() => {
    stateRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!ready) return;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(1, Math.max(0, (now - lastTickAtRef.current) / 1_000));
      lastTickAtRef.current = now;
      const passive = getProductionStats(stateRef.current).passivePerSecond;
      if (passive > 0 && document.visibilityState === "visible") {
        updateGame((previous) => addEchoes(previous, passive * elapsed));
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [ready, updateGame]);

  useEffect(() => {
    if (!ready) return;
    const saveTimer = window.setInterval(() => save(), 2_000);
    const handleVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = now;
        save();
        return;
      }
      if (hiddenAtRef.current) {
        const offline = calculateOfflineProgress({ ...stateRef.current, lastSavedAt: hiddenAtRef.current }, now);
        if (offline.reward > 0) updateGame((previous) => addEchoes(previous, offline.reward));
        if (offline.seconds >= 60 && offline.reward > 0) setOfflineReport(offline);
      }
      hiddenAtRef.current = null;
      lastTickAtRef.current = now;
    };
    const handlePageHide = () => save();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.clearInterval(saveTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
      save();
    };
  }, [ready, save, updateGame]);

  useEffect(() => {
    if (!ready) return;
    const earned = getEarnedAchievementIds(game);
    const fresh = earned.filter((id) => !game.achievements.includes(id));
    if (!fresh.length) return;
    updateGame((previous) => ({
      ...previous,
      achievements: [...new Set([...previous.achievements, ...fresh])],
    }));
    const achievement = ACHIEVEMENTS.find((item) => item.id === fresh.at(-1));
    if (achievement) queueMicrotask(() => setAchievementToast(achievement.label));
  }, [game, ready, updateGame]);

  useEffect(() => {
    if (!achievementToast) return;
    const timeout = window.setTimeout(() => setAchievementToast(null), 3_400);
    return () => window.clearTimeout(timeout);
  }, [achievementToast]);

  useEffect(() => {
    if (combo <= 0) return;
    const timeout = window.setTimeout(() => {
      comboRef.current = 0;
      setCombo(0);
    }, 1_550);
    return () => window.clearTimeout(timeout);
  }, [combo]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    void audioRef.current?.close();
  }, []);

  const changeTab = useCallback((nextTab: TabId) => {
    if (nextTab === activeTab || viewTransitioning) return;
    setViewTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveTab(nextTab);
      setViewTransitioning(false);
      transitionTimerRef.current = null;
    }, 140);
  }, [activeTab, viewTransitioning]);

  const stats = useMemo(() => getProductionStats(game), [game]);
  const pendingChapter = useMemo(() => getPendingChapter(game), [game]);
  const currentChapter = useMemo(() => getCurrentChapter(game.lifetimeEchoes), [game.lifetimeEchoes]);
  const revealChapter = choiceReveal
    ? STORY_CHAPTERS.find((chapter) => chapter.id === choiceReveal.chapterId) ?? null
    : null;
  const displayChapter = revealChapter ?? pendingChapter ?? currentChapter;
  const nextChapter = useMemo(() => getNextChapter(game.lifetimeEchoes), [game.lifetimeEchoes]);
  const chapterProgress = nextChapter
    ? Math.min(100, (game.lifetimeEchoes / nextChapter.threshold) * 100)
    : 100;
  const resonanceGain = getResonanceGain(game.cycleEchoes);
  const ending = getEnding(game);

  const playTone = useCallback((critical: boolean) => {
    if (!stateRef.current.soundEnabled) return;
    try {
      const context = audioRef.current ?? new window.AudioContext();
      audioRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(critical ? 710 : 430, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(critical ? 1_080 : 650, context.currentTime + 0.08);
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.11);
    } catch {
      // Audio is progressive enhancement and can be blocked by the device.
    }
  }, []);

  const pulse = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!ready || pendingChapter || choiceReveal) return;
    const now = Date.now();
    const nextCombo = now - lastTapAtRef.current <= 1_450 ? comboRef.current + 1 : 1;
    lastTapAtRef.current = now;
    comboRef.current = nextCombo;
    setCombo(nextCombo);
    const currentStats = getProductionStats(stateRef.current);
    const critical = Math.random() < currentStats.criticalChance;
    const comboMultiplier = 1 + Math.min(nextCombo, currentStats.maxCombo) * 0.035;
    const gain = currentStats.tapPower * comboMultiplier * (critical ? currentStats.criticalMultiplier : 1);
    updateGame((previous) => addEchoes(previous, gain, true));
    const rect = event.currentTarget.getBoundingClientRect();
    const left = event.clientX
      ? Math.min(85, Math.max(15, ((event.clientX - rect.left) / rect.width) * 100))
      : 50;
    const id = now + Math.random();
    setBursts((previous) => [...previous.slice(-7), { id, left, value: gain, critical }]);
    window.setTimeout(() => setBursts((previous) => previous.filter((burst) => burst.id !== id)), 850);
    if (stateRef.current.hapticsEnabled && "vibrate" in navigator) navigator.vibrate(critical ? [18, 26, 22] : 12);
    playTone(critical);
  }, [choiceReveal, pendingChapter, playTone, ready, updateGame]);

  const startGame = () => {
    updateGame((previous) => ({ ...previous, started: true, readChapters: [0] }));
  };

  const buyUpgrade = (id: UpgradeId) => {
    const before = stateRef.current;
    const next = purchaseUpgrade(before, id);
    if (next === before) return;
    updateGame(() => next);
    if (before.hapticsEnabled && "vibrate" in navigator) navigator.vibrate(18);
  };

  const chooseStory = (chapter: StoryChapter, choiceId: string) => {
    const choice = chapter.choices?.find((candidate) => candidate.id === choiceId);
    if (!choice) return;
    const before = stateRef.current;
    const next = applyStoryChoice(before, chapter.id, choiceId);
    if (next === before) return;
    updateGame(() => next);
    setChoiceReveal({ chapterId: chapter.id, reply: choice.reply, path: choice.attribute });
    if (before.hapticsEnabled && "vibrate" in navigator) navigator.vibrate([18, 28, 18]);
  };

  const continueAfterChoice = () => {
    setViewTransitioning(true);
    window.setTimeout(() => {
      setChoiceReveal(null);
      setViewTransitioning(false);
    }, 170);
  };

  const closeStory = () => setStoryModal(null);

  const confirmResonance = () => {
    updateGame((previous) => enterResonance(previous));
    setResonanceOpen(false);
    changeTab("signal");
    if (game.hapticsEnabled && "vibrate" in navigator) navigator.vibrate([30, 40, 30]);
  };

  const resetSave = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    const reset = createInitialState();
    stateRef.current = reset;
    setGame(reset);
    setActiveTab("signal");
    setChoiceReveal(null);
    setSettingsOpen(false);
    setResetArmed(false);
    try {
      window.localStorage.removeItem(GAME_STORAGE_KEY);
      for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
    } catch {
      // The in-memory reset still succeeds when storage is unavailable.
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <main className="game-shell">
      <PwaRegistrar />
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />

      <div className="app-frame">
        <header className="topbar">
          <button className="chapter-chip" type="button" onClick={() => changeTab("chronicle")} aria-label={`Открыть судьбу. ${displayChapter.number}: ${displayChapter.title}`}>
            <span className="chapter-dot" aria-hidden="true" />
            <span><small>{displayChapter.number}</small><strong>{displayChapter.title}</strong></span>
          </button>
          <button className="icon-button" type="button" onClick={() => { setSettingsSnapshotAt(Date.now()); setSettingsOpen(true); }} aria-label="Открыть настройки"><span aria-hidden="true">•••</span></button>
        </header>

        <section className="resource-panel" aria-live="polite">
          <span className="eyebrow">ЭХО СИГНАЛА</span>
          <div className="resource-value"><span className="resource-glyph" aria-hidden="true">◈</span><strong>{formatNumber(game.echoes)}</strong></div>
          <div className="production-line"><span>+{formatNumber(stats.passivePerSecond)} / сек</span>{game.resonance > 0 && <span>Резонанс ×{stats.globalMultiplier.toFixed(2)}</span>}</div>
          <div className="path-strip" aria-label="Ваш путь">
            {(Object.keys(PATH_COPY) as AttributeId[]).map((path) => <span className={`path-${PATH_COPY[path].color}`} key={path}><i aria-hidden="true">{PATH_COPY[path].icon}</i>{PATH_COPY[path].label} <strong>{game.attributes[path]}</strong></span>)}
          </div>
        </section>

        <div className={`view-stack${viewTransitioning ? " is-transitioning" : ""}`}>
          {activeTab === "signal" && (
            <section className="narrative-view" aria-labelledby="signal-heading">
              <h1 id="signal-heading" className="sr-only">История последнего сигнала</h1>
              <div className="scene-shell" key={displayChapter.id}>
                <StoryScene chapter={displayChapter} selectedPath={choiceReveal?.path} />
              </div>

              <article className="dialogue-panel">
                <div className="dialogue-speaker"><span className="avatar" aria-hidden="true">М</span><span><strong>МИРА</strong><small><i className={isOnline ? "online" : "offline"} /> {isOnline ? "РЯДОМ" : "АВТОНОМНАЯ ПАМЯТЬ"}</small></span><span className="waveform" aria-hidden="true">▁▃▆▄▂▅▃</span></div>
                <p>«{getNarrativeTransmission(game, displayChapter)}»</p>
              </article>

              {choiceReveal ? (
                <article className={`choice-consequence path-${choiceReveal.path}`}>
                  <small>ВАШ ОТВЕТ ИЗМЕНИЛ ИСТОРИЮ</small>
                  <p>{choiceReveal.reply}</p>
                  <button className="primary-button" type="button" onClick={continueAfterChoice}>Продолжить путь <span aria-hidden="true">→</span></button>
                </article>
              ) : pendingChapter?.id === displayChapter.id && pendingChapter.choices ? (
                <div className="inline-choice-block" aria-label="Варианты ответа">
                  <div className="choice-prompt"><span>ВАШ ОТВЕТ</span><small>Изменит отношения и финал</small></div>
                  <div className="inline-choices">
                    {pendingChapter.choices.map((choice, index) => (
                      <button className={`path-${choice.attribute}`} type="button" key={choice.id} onClick={() => chooseStory(pendingChapter, choice.id)}>
                        <i aria-hidden="true">0{index + 1}</i><span><strong>{choice.label}</strong><small>{choice.effect}</small></span><em aria-hidden="true">→</em>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="clicker-zone">
                  <button className="impulse-button" type="button" onPointerDown={pulse} disabled={!ready || !game.started} aria-label={`Послать импульс и получить ${formatNumber(stats.tapPower)} эха`}>
                    <span className="impulse-rings" aria-hidden="true"><i /></span>
                    <span><small>{combo > 1 ? `СЕРИЯ ×${combo}` : "УСИЛИТЬ СИГНАЛ"}</small><strong>ПОСЛАТЬ ИМПУЛЬС</strong><em>+{formatNumber(stats.tapPower)} ◈</em></span>
                  </button>
                  {bursts.map((burst) => <span className={`tap-burst story-burst${burst.critical ? " is-critical" : ""}`} style={{ left: `${burst.left}%` }} key={burst.id} aria-hidden="true">+{formatNumber(burst.value)}{burst.critical ? " КРИТ" : ""}</span>)}
                  {nextChapter ? (
                    <div className="chapter-progress" aria-label={`Прогресс до следующей сцены: ${Math.floor(chapterProgress)}%`}>
                      <div className="progress-label"><span>До сцены «{nextChapter.title}»</span><span>{formatNumber(game.lifetimeEchoes)} / {formatNumber(nextChapter.threshold)}</span></div>
                      <div className="progress-track"><span style={{ width: `${chapterProgress}%` }} /></div>
                    </div>
                  ) : <span className="story-complete">ИСТОРИЯ ЗАВЕРШЕНА · ОТКРЫТ НОВЫЙ ЦИКЛ</span>}
                </div>
              )}
            </section>
          )}

          {activeTab === "upgrade" && (
            <section className="list-view" aria-labelledby="upgrade-heading">
              <div className="section-heading"><span><small>КЛИКЕР-КОНТУР</small><h2 id="upgrade-heading">Усиления сигнала</h2></span><span className="count-badge">{UPGRADES.reduce((sum, item) => sum + game.upgrades[item.id], 0)} ур.</span></div>
              <p className="section-lead">Накликайте эхо, купите модуль и откройте следующую сцену. Автоматические модули работают даже при закрытом приложении.</p>
              <div className="upgrade-list">
                {UPGRADES.map((upgrade) => {
                  const level = game.upgrades[upgrade.id];
                  const cost = getUpgradeCost(upgrade.id, level);
                  const affordable = game.echoes >= cost;
                  return (
                    <button className={`upgrade-card${affordable ? " can-buy" : ""}`} type="button" key={upgrade.id} onClick={() => buyUpgrade(upgrade.id)} disabled={!affordable} aria-label={`${upgrade.name}, уровень ${level}. ${upgrade.description}. Цена ${formatNumber(cost)} эха`}>
                      <span className="upgrade-icon" aria-hidden="true">{upgrade.icon}</span>
                      <span className="upgrade-copy"><span><strong>{upgrade.name}</strong><em>УР. {level}</em></span><small>{upgrade.description}</small></span>
                      <span className="upgrade-cost"><i aria-hidden="true">◈</i>{formatNumber(cost)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "chronicle" && (
            <section className="list-view chronicle-view" aria-labelledby="chronicle-heading">
              <div className="section-heading"><span><small>КАРТА РЕШЕНИЙ</small><h2 id="chronicle-heading">Ваша судьба</h2></span><span className="count-badge">{Object.keys(game.choices).length}/10 выборов</span></div>
              <p className="section-lead">Близость, авантюризм и тайна открывают разные реплики и семь возможных финалов.</p>

              <article className={`ending-card ending-${ending.id}`}>
                <div><small>{ending.kicker}</small><h3>{ending.title}</h3><p>{ending.summary}</p></div>
                <span className="ending-mark" aria-hidden="true">{ending.id === "unfinished" ? "?" : "✦"}</span>
                <div className="destiny-paths">
                  {(Object.keys(PATH_COPY) as AttributeId[]).map((path) => (
                    <span key={path}><i className={`path-${PATH_COPY[path].color}`} aria-hidden="true">{PATH_COPY[path].icon}</i><small>{PATH_COPY[path].label}</small><strong>{game.attributes[path]}</strong><em><b style={{ width: `${Math.min(100, game.attributes[path] * 9)}%` }} /></em></span>
                  ))}
                </div>
              </article>

              <div className="timeline">
                {STORY_CHAPTERS.map((chapter) => {
                  const unlocked = game.lifetimeEchoes >= chapter.threshold;
                  const choice = chapter.choices?.find((item) => item.id === game.choices[String(chapter.id)]);
                  return (
                    <article className={`timeline-item${unlocked ? " unlocked" : ""}`} key={chapter.id}>
                      <div className="timeline-node" aria-hidden="true">{choice ? "◆" : unlocked ? "✦" : "·"}</div>
                      <div><small>{chapter.number} · {unlocked ? chapter.location : `${formatNumber(chapter.threshold)} ЭХА`}</small><h3>{unlocked ? chapter.title : "Зашифрованная сцена"}</h3><p>{unlocked ? chapter.summary : "Усильте сигнал, чтобы восстановить эту часть истории."}</p>{choice && <span className={`choice-mark path-${choice.attribute}`}>Ваш ответ: {choice.label} · {choice.effect}</span>}{unlocked && <button className="text-button" type="button" onClick={() => setStoryModal(chapter)}>Пересмотреть сцену</button>}</div>
                    </article>
                  );
                })}
              </div>

              <article className={`resonance-card${resonanceGain > 0 ? " is-ready" : ""}`}><span className="resonance-symbol" aria-hidden="true">∞</span><div><small>НОВАЯ ИГРА +</small><h3>Резонанс</h3><p>Сбросьте эхо и модули, сохранив все отношения и решения. Каждый уровень навсегда даёт +18% к клику и сбору.</p><div className="progress-track"><span style={{ width: `${Math.min(100, (game.cycleEchoes / RESONANCE_THRESHOLD) * 100)}%` }} /></div><div className="resonance-foot"><span>{formatNumber(game.cycleEchoes)} / {formatNumber(RESONANCE_THRESHOLD)}</span><button type="button" disabled={resonanceGain === 0} onClick={() => setResonanceOpen(true)}>{resonanceGain > 0 ? `Новый цикл · +${resonanceGain}` : "Сигнал слаб"}</button></div></div></article>

              <div className="achievement-grid">{ACHIEVEMENTS.map((achievement) => { const unlocked = game.achievements.includes(achievement.id); return <div className={unlocked ? "achievement unlocked" : "achievement"} key={achievement.id}><span aria-hidden="true">{unlocked ? "✦" : "○"}</span><div><strong>{achievement.label}</strong><small>{achievement.detail}</small></div></div>; })}</div>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => <button type="button" key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => changeTab(item.id)} aria-current={activeTab === item.id ? "page" : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}{item.id === "upgrade" && UPGRADES.some((upgrade) => game.echoes >= getUpgradeCost(upgrade.id, game.upgrades[upgrade.id])) && <i className="nav-notice" aria-label="Доступно улучшение" />}{item.id === "signal" && pendingChapter && <i className="nav-notice choice-notice" aria-label="Доступен сюжетный выбор" />}</button>)}
        </nav>
      </div>

      {!game.started && ready && (
        <div className="modal-backdrop intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-title"><div className="intro-card"><div className="intro-orbit" aria-hidden="true"><span>N</span></div><span className="eyebrow">ИНТЕРАКТИВНАЯ НОВЕЛЛА-КЛИКЕР</span><h2 id="intro-title">Последний сигнал</h2><p>Кликайте, усиливайте станцию и открывайте живые сцены. Ваши ответы решат, станет ли история Миры любовью, безумным приключением или тайной размером с город.</p><blockquote>«Я ждала тебя двести лет. Начнём сначала?»</blockquote><button className="primary-button" type="button" onClick={startGame}>Коснуться сигнала</button><small>12 сцен · 10 решений · 7 концовок</small></div></div>
      )}

      {storyModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="story-title"><article className="story-dialog replay-dialog"><StoryScene chapter={storyModal} selectedPath={storyModal.choices?.find((choice) => choice.id === game.choices[String(storyModal.id)])?.attribute} /><span className="eyebrow">{storyModal.number}</span><h2 id="story-title">{storyModal.title}</h2><p>{storyModal.summary}</p><blockquote>«{getNarrativeTransmission(game, storyModal)}»</blockquote>{storyModal.choices?.find((choice) => choice.id === game.choices[String(storyModal.id)]) && <div className="replay-choice">Вы ответили: <strong>{storyModal.choices.find((choice) => choice.id === game.choices[String(storyModal.id)])?.label}</strong></div>}<button className="secondary-button" type="button" onClick={closeStory}>Закрыть сцену</button></article></div>
      )}

      {offlineReport && <div className="toast offline-toast" role="status"><span aria-hidden="true">⌁</span><div><strong>Станция работала {formatDuration(offlineReport.seconds)}</strong><small>Собрано +{formatNumber(offlineReport.reward)} эха</small></div><button type="button" onClick={() => setOfflineReport(null)} aria-label="Закрыть уведомление">×</button></div>}
      {achievementToast && <div className="toast achievement-toast" role="status"><span aria-hidden="true">✦</span><div><small>НОВЫЙ ЗНАК</small><strong>{achievementToast}</strong></div></div>}

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section className="settings-dialog"><div className="dialog-title-row"><div><small>СИСТЕМА</small><h2 id="settings-title">Настройки</h2></div><button type="button" onClick={() => { setSettingsOpen(false); setResetArmed(false); }} aria-label="Закрыть настройки">×</button></div><label className="setting-row"><span><strong>Звук импульса</strong><small>Короткий синтезированный отклик</small></span><input type="checkbox" checked={game.soundEnabled} onChange={(event) => updateGame((previous) => ({ ...previous, soundEnabled: event.target.checked }))} /></label><label className="setting-row"><span><strong>Виброотклик</strong><small>Если поддерживается устройством</small></span><input type="checkbox" checked={game.hapticsEnabled} onChange={(event) => updateGame((previous) => ({ ...previous, hapticsEnabled: event.target.checked }))} /></label><div className="setting-row"><span><strong>Статус сети</strong><small>Игра работает и без подключения</small></span><em className={isOnline ? "status-online" : "status-offline"}>{isOnline ? "В сети" : "Офлайн"}</em></div>{installPrompt && <button className="primary-button install-button" type="button" onClick={installApp}>Установить на телефон</button>}<div className="save-summary"><span><small>В ИГРЕ</small><strong>{formatNumber(Math.max(0, settingsSnapshotAt - game.startedAt) / 3_600_000)} ч</strong></span><span><small>ИМПУЛЬСОВ</small><strong>{formatNumber(game.totalTaps)}</strong></span><span><small>РЕШЕНИЙ</small><strong>{Object.keys(game.choices).length}</strong></span></div><button className={`danger-button${resetArmed ? " armed" : ""}`} type="button" onClick={resetSave}>{resetArmed ? "Нажмите ещё раз: удалить прогресс" : "Начать историю заново"}</button><p className="privacy-note">Без аккаунта и трекеров. Сохранение хранится только в памяти этого устройства.</p></section></div>
      )}

      {resonanceOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="resonance-title"><section className="confirm-dialog"><span className="confirm-symbol" aria-hidden="true">∞</span><span className="eyebrow">НОВАЯ ИГРА +</span><h2 id="resonance-title">Начать новый цикл?</h2><p>Эхо и уровни модулей обнулятся. Все ответы, отношения, сцены и достижения сохранятся.</p><strong className="gain-preview">+{resonanceGain} резонанс · +{resonanceGain * 18}% навсегда</strong><button className="primary-button" type="button" onClick={confirmResonance}>Запустить новый цикл</button><button className="secondary-button" type="button" onClick={() => setResonanceOpen(false)}>Вернуться</button></section></div>
      )}
    </main>
  );
}
