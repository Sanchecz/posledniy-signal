import {
  ACHIEVEMENTS,
  MAX_OFFLINE_SECONDS,
  RESONANCE_THRESHOLD,
  STORY_CHAPTERS,
  UPGRADES,
  type AttributeId,
  type StoryChapter,
  type UpgradeId,
} from "./config.ts";

export const SAVE_VERSION = 3;
const MAX_VALUE = 1e300;
const UPGRADE_IDS = new Set<UpgradeId>(UPGRADES.map((upgrade) => upgrade.id));

export type Attributes = Record<AttributeId, number>;

export type GameState = {
  version: number;
  started: boolean;
  echoes: number;
  cycleEchoes: number;
  lifetimeEchoes: number;
  totalTaps: number;
  resonance: number;
  attributes: Attributes;
  upgrades: Record<UpgradeId, number>;
  choices: Record<string, string>;
  readChapters: number[];
  achievements: string[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  startedAt: number;
  lastSavedAt: number;
};

export type ProductionStats = {
  tapPower: number;
  passivePerSecond: number;
  criticalChance: number;
  criticalMultiplier: number;
  maxCombo: number;
  globalMultiplier: number;
};

export type Ending = {
  id: "love" | "adventure" | "mystery" | "tender" | "corsairs" | "oracle" | "balanced" | "unfinished";
  title: string;
  kicker: string;
  summary: string;
};

export function emptyUpgradeLevels(): Record<UpgradeId, number> {
  return { resonator: 0, drone: 0, prism: 0, array: 0, coil: 0, beacon: 0, city: 0 };
}

export function emptyAttributes(): Attributes {
  return { will: 0, insight: 0, empathy: 0 };
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    started: false,
    echoes: 0,
    cycleEchoes: 0,
    lifetimeEchoes: 0,
    totalTaps: 0,
    resonance: 0,
    attributes: emptyAttributes(),
    upgrades: emptyUpgradeLevels(),
    choices: {},
    readChapters: [],
    achievements: [],
    soundEnabled: true,
    hapticsEnabled: true,
    startedAt: now,
    lastSavedAt: now,
  };
}

function safeNumber(value: unknown, fallback = 0, max = MAX_VALUE): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), max)
    : fallback;
}

function safeInteger(value: unknown, fallback = 0, max = 1_000_000): number {
  return Math.floor(safeNumber(value, fallback, max));
}

export function normalizeGameState(input: unknown, now = Date.now()): GameState {
  const base = createInitialState(now);
  if (!input || typeof input !== "object" || Array.isArray(input)) return base;
  const source = input as Record<string, unknown>;

  const upgrades = emptyUpgradeLevels();
  if (source.upgrades && typeof source.upgrades === "object" && !Array.isArray(source.upgrades)) {
    for (const [id, level] of Object.entries(source.upgrades)) {
      if (UPGRADE_IDS.has(id as UpgradeId)) upgrades[id as UpgradeId] = safeInteger(level, 0, 100_000);
    }
  }

  const attributes = emptyAttributes();
  if (source.attributes && typeof source.attributes === "object" && !Array.isArray(source.attributes)) {
    const values = source.attributes as Record<string, unknown>;
    attributes.will = safeInteger(values.will, 0, 999);
    attributes.insight = safeInteger(values.insight, 0, 999);
    attributes.empathy = safeInteger(values.empathy, 0, 999);
  }

  const choices: Record<string, string> = {};
  if (source.choices && typeof source.choices === "object" && !Array.isArray(source.choices)) {
    for (const [chapterId, choiceId] of Object.entries(source.choices)) {
      const chapter = STORY_CHAPTERS.find((candidate) => String(candidate.id) === chapterId);
      if (chapter?.choices?.some((choice) => choice.id === choiceId)) choices[chapterId] = choiceId as string;
    }
  }

  const validChapterIds = new Set<number>(STORY_CHAPTERS.map((chapter) => chapter.id));
  const validAchievementIds = new Set<string>(ACHIEVEMENTS.map((achievement) => achievement.id));

  return {
    version: SAVE_VERSION,
    started: source.started === true,
    echoes: safeNumber(source.echoes),
    cycleEchoes: safeNumber(source.cycleEchoes),
    lifetimeEchoes: safeNumber(source.lifetimeEchoes),
    totalTaps: safeInteger(source.totalTaps, 0, Number.MAX_SAFE_INTEGER),
    resonance: safeInteger(source.resonance, 0, 10_000),
    attributes,
    upgrades,
    choices,
    readChapters: Array.isArray(source.readChapters)
      ? [...new Set(source.readChapters.filter((id): id is number => typeof id === "number" && validChapterIds.has(id)))]
      : [],
    achievements: Array.isArray(source.achievements)
      ? [...new Set(source.achievements.filter((id): id is string => typeof id === "string" && validAchievementIds.has(id)))]
      : [],
    soundEnabled: source.soundEnabled !== false,
    hapticsEnabled: source.hapticsEnabled !== false,
    startedAt: safeNumber(source.startedAt, now, now) || now,
    lastSavedAt: safeNumber(source.lastSavedAt, now, now) || now,
  };
}

export function getUpgradeCost(id: UpgradeId, level: number): number {
  const upgrade = UPGRADES.find((candidate) => candidate.id === id);
  if (!upgrade) return MAX_VALUE;
  return Math.ceil(upgrade.baseCost * upgrade.costGrowth ** Math.max(0, level));
}

export function getProductionStats(state: GameState): ProductionStats {
  const levels = state.upgrades;
  const globalMultiplier = 1 + state.resonance * 0.18;
  return {
    tapPower: (1 + levels.resonator * 1.2) * globalMultiplier,
    passivePerSecond:
      (levels.drone * 0.45 + levels.array * 2.8 + levels.beacon * 18 + levels.city * 120) * globalMultiplier,
    criticalChance: Math.min(0.5, 0.06 + levels.prism * 0.012),
    criticalMultiplier: 3 + levels.prism * 0.1,
    maxCombo: 20 + levels.coil * 5,
    globalMultiplier,
  };
}

export function addEchoes(state: GameState, amount: number, tap = false): GameState {
  const gain = safeNumber(amount);
  if (gain <= 0) return state;
  return {
    ...state,
    echoes: Math.min(MAX_VALUE, state.echoes + gain),
    cycleEchoes: Math.min(MAX_VALUE, state.cycleEchoes + gain),
    lifetimeEchoes: Math.min(MAX_VALUE, state.lifetimeEchoes + gain),
    totalTaps: tap ? Math.min(Number.MAX_SAFE_INTEGER, state.totalTaps + 1) : state.totalTaps,
  };
}

export function purchaseUpgrade(state: GameState, id: UpgradeId): GameState {
  const level = state.upgrades[id];
  const cost = getUpgradeCost(id, level);
  if (state.echoes < cost) return state;
  return { ...state, echoes: state.echoes - cost, upgrades: { ...state.upgrades, [id]: level + 1 } };
}

export function calculateOfflineProgress(state: GameState, now = Date.now()) {
  const elapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (now - state.lastSavedAt) / 1000));
  return { seconds: elapsedSeconds, reward: getProductionStats(state).passivePerSecond * elapsedSeconds };
}

export function getUnlockedChapterCount(lifetimeEchoes: number): number {
  return STORY_CHAPTERS.filter((chapter) => lifetimeEchoes >= chapter.threshold).length;
}

export function getCurrentChapter(lifetimeEchoes: number): StoryChapter {
  return [...STORY_CHAPTERS].reverse().find((chapter) => lifetimeEchoes >= chapter.threshold) ?? STORY_CHAPTERS[0];
}

export function getNextChapter(lifetimeEchoes: number) {
  return STORY_CHAPTERS.find((chapter) => lifetimeEchoes < chapter.threshold) ?? null;
}

export function getPendingChapter(state: GameState): StoryChapter | null {
  return STORY_CHAPTERS.find(
    (chapter) =>
      chapter.threshold <= state.lifetimeEchoes &&
      Boolean(chapter.choices?.length) &&
      !state.choices[String(chapter.id)],
  ) ?? null;
}

export function applyStoryChoice(state: GameState, chapterId: number, choiceId: string): GameState {
  if (state.choices[String(chapterId)]) return state;
  const chapter = STORY_CHAPTERS.find((candidate) => candidate.id === chapterId);
  const choice = chapter?.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) return state;
  return {
    ...state,
    choices: { ...state.choices, [chapterId]: choiceId },
    attributes: {
      ...state.attributes,
      [choice.attribute]: state.attributes[choice.attribute] + (choice.points ?? 1),
    },
    readChapters: [...new Set([...state.readChapters, chapterId])],
  };
}

export function getNarrativeTransmission(state: GameState, chapter: StoryChapter): string {
  if (chapter.id === 5 && state.attributes.empathy >= 3) {
    return "Ты всё чаще смотришь не на маршрут, а на меня. Опасный способ навигации. Мне нравится.";
  }
  if (chapter.id === 6 && state.attributes.insight >= 4) {
    return "Ты уже понял: Эш лжёт не о катастрофе, а о причине. Спроси, чей голос отдал первый приказ.";
  }
  if (chapter.id === 9 && state.attributes.will >= 5) {
    return "С тобой любая катастрофа начинает выглядеть приглашением. Ладно. Покажи, как летают безумцы.";
  }
  if (chapter.id === 10 && state.attributes.empathy >= 7) {
    return "Я знаю, чего хочу. Но финал будет твоим только в том случае, если ты выберешь свободно — даже не меня.";
  }
  if (chapter.id === 11) return getEnding(state).summary;
  return chapter.transmission;
}

export function getEarnedAchievementIds(state: GameState): string[] {
  const ids: string[] = [];
  if (state.totalTaps >= 1) ids.push("first-touch");
  if (Object.keys(state.choices).length >= 1) ids.push("first-choice");
  if (state.totalTaps >= 100) ids.push("steady-hand");
  if (state.attributes.empathy >= 5) ids.push("close-signal");
  if (state.attributes.will >= 5) ids.push("reckless");
  if (state.attributes.insight >= 5) ids.push("truth-seeker");
  if (state.choices["10"]) ids.push("dawn-maker");
  if (state.resonance >= 1) ids.push("second-dawn");
  return ids;
}

export function getResonanceGain(cycleEchoes: number): number {
  if (cycleEchoes < RESONANCE_THRESHOLD) return 0;
  return Math.max(1, Math.floor(Math.log10(cycleEchoes / RESONANCE_THRESHOLD) + 1));
}

export function enterResonance(state: GameState, now = Date.now()): GameState {
  const gain = getResonanceGain(state.cycleEchoes);
  if (gain <= 0) return state;
  return {
    ...state,
    echoes: 0,
    cycleEchoes: 0,
    resonance: state.resonance + gain,
    upgrades: emptyUpgradeLevels(),
    lastSavedAt: now,
  };
}

export function getEnding(state: GameState): Ending {
  const finalChoice = state.choices["10"];
  const { empathy, will, insight } = state.attributes;

  if (finalChoice === "love" && empathy >= 8) {
    return { id: "love", title: "Два сердца Ноктюрна", kicker: "РЕДКИЙ ФИНАЛ · ЛЮБОВЬ", summary: "Вы с Мирой отказываетесь стать символами и выбираете жизнь: дом над проснувшимся морем, неловкие завтраки и долгую любовь без приказов." };
  }
  if (finalChoice === "adventure" && will >= 8) {
    return { id: "adventure", title: "За краем карты", kicker: "РЕДКИЙ ФИНАЛ · АВАНТЮРА", summary: "Вы угоняете «Аврору» и уходите к звёздам. Каждая новая система становится свиданием, каждая погоня — вашей общей легендой." };
  }
  if (finalChoice === "mystery" && insight >= 8) {
    return { id: "mystery", title: "Созвездие из миллионов", kicker: "РЕДКИЙ ФИНАЛ · ТАЙНА", summary: "Вы с Мирой становитесь голосом Ноктюрна, но сохраняете два имени. Город мыслит миллионами умов и впервые задаёт вселенной вопрос." };
  }
  if (!finalChoice) {
    return { id: "unfinished", title: "Неоконченный сигнал", kicker: "ФИНАЛ ЕЩЁ ВПЕРЕДИ", summary: "Ваши решения уже меняют Миру, но главная развилка всё ещё скрыта за горизонтом." };
  }
  if (empathy > will && empathy > insight) {
    return { id: "tender", title: "Письмо длиной в жизнь", kicker: "ФИНАЛ · БЛИЗОСТЬ", summary: "Мира не сразу учится быть человеком, а вы — не спасать всех вокруг. Вместе вы пишете новую историю без героев и жертв." };
  }
  if (will > empathy && will > insight) {
    return { id: "corsairs", title: "Корсары рассвета", kicker: "ФИНАЛ · АВАНТЮРИЗМ", summary: "Ноктюрн становится свободным портом, а вы с Мирой — его самыми разыскиваемыми капитанами. Скучных дней больше не будет." };
  }
  if (insight > empathy && insight > will) {
    return { id: "oracle", title: "Архивариусы вечности", kicker: "ФИНАЛ · ТАЙНА", summary: "Вы раскрываете истинное назначение станции: Ноктюрн хранит воспоминания исчезнувших миров. Следующий сигнал приходит из будущего." };
  }
  return { id: "balanced", title: "Третий путь", kicker: "СЕКРЕТНЫЙ ФИНАЛ · РАВНОВЕСИЕ", summary: "Вы отказываетесь от трёх готовых судеб. Мира смеётся и прокладывает четвёртый маршрут — тот, которого не было ни в одном цикле." };
}

export function getEndingTitle(state: GameState): string {
  return getEnding(state).title;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value < 1_000) {
    return value < 10 && value % 1 !== 0
      ? value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })
      : Math.floor(value).toLocaleString("ru-RU");
  }
  const units = [[1e15, "квдр"], [1e12, "трлн"], [1e9, "млрд"], [1e6, "млн"], [1e3, "тыс"]] as const;
  const unit = units.find(([threshold]) => value >= threshold);
  if (!unit) return Math.floor(value).toLocaleString("ru-RU");
  return `${(value / unit[0]).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${unit[1]}`;
}
