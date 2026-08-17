import assert from "node:assert/strict";
import test from "node:test";
import { STORY_CHAPTERS } from "../app/game/config.ts";
import {
  addEchoes,
  applyStoryChoice,
  calculateOfflineProgress,
  createInitialState,
  enterResonance,
  formatNumber,
  getEnding,
  getNarrativeTransmission,
  getPendingChapter,
  getProductionStats,
  getUpgradeCost,
  normalizeGameState,
  purchaseUpgrade,
} from "../app/game/engine.ts";

test("normalizes and migrates untrusted saves without prototype or numeric pollution", () => {
  const now = 2_000_000;
  const state = normalizeGameState({
    version: 1,
    started: true,
    echoes: Number.POSITIVE_INFINITY,
    cycleEchoes: -50,
    lifetimeEchoes: 900,
    totalTaps: 4.9,
    resonance: "999",
    attributes: { will: 3.9, insight: -10, empathy: 1, __proto__: { polluted: true } },
    upgrades: { resonator: 2.8, unknown: 999, drone: -10 },
    choices: { 1: "waited", prototype: "polluted", 50: "x".repeat(100) },
    readChapters: [0, 1, 999, "2"],
    achievements: ["first-touch", "forged"],
    lastSavedAt: now + 50_000,
  }, now);

  assert.equal(state.version, 3);
  assert.equal(state.started, true);
  assert.equal(state.echoes, 0);
  assert.equal(state.cycleEchoes, 0);
  assert.equal(state.lifetimeEchoes, 900);
  assert.equal(state.totalTaps, 4);
  assert.equal(state.resonance, 0);
  assert.deepEqual(state.attributes, { will: 3, insight: 0, empathy: 1 });
  assert.equal(state.upgrades.resonator, 2);
  assert.equal(state.upgrades.drone, 0);
  assert.equal("unknown" in state.upgrades, false);
  assert.deepEqual(state.choices, { 1: "waited" });
  assert.deepEqual(state.readChapters, [0, 1]);
  assert.deepEqual(state.achievements, ["first-touch"]);
  assert.equal(state.lastSavedAt, now);
});

test("upgrade economy grows and cannot buy with insufficient echo", () => {
  const initial = createInitialState(1);
  assert.equal(getUpgradeCost("resonator", 0), 18);
  assert.equal(getUpgradeCost("resonator", 1), 22);
  assert.equal(purchaseUpgrade(initial, "resonator"), initial);
  const funded = { ...initial, echoes: 100 };
  const purchased = purchaseUpgrade(funded, "resonator");
  assert.equal(purchased.echoes, 82);
  assert.equal(purchased.upgrades.resonator, 1);
  assert.equal(funded.upgrades.resonator, 0);
});

test("a story answer is immutable and awards its relationship path exactly once", () => {
  const base = { ...createInitialState(1), lifetimeEchoes: 40 };
  const chosen = applyStoryChoice(base, 1, "waited");
  const duplicate = applyStoryChoice(chosen, 1, "escape");
  assert.equal(chosen.choices["1"], "waited");
  assert.equal(chosen.attributes.empathy, 1);
  assert.deepEqual(chosen.readChapters, [1]);
  assert.equal(duplicate, chosen);
});

test("pending decisions stop at the earliest unanswered unlocked scene", () => {
  const base = { ...createInitialState(1), lifetimeEchoes: 3_000 };
  assert.equal(getPendingChapter(base)?.id, 1);
  const first = applyStoryChoice(base, 1, "record");
  assert.equal(getPendingChapter(first)?.id, 2);
});

test("branch scores alter later dialogue", () => {
  const chapter = STORY_CHAPTERS.find((item) => item.id === 5);
  assert.ok(chapter);
  const base = createInitialState(1);
  const close = { ...base, attributes: { ...base.attributes, empathy: 3 } };
  assert.notEqual(getNarrativeTransmission(close, chapter), chapter.transmission);
});

test("offline progress is non-negative and capped at twelve hours", () => {
  const base = createInitialState(1_000);
  const producer = { ...base, upgrades: { ...base.upgrades, drone: 10 } };
  const progress = calculateOfflineProgress(producer, 1_000 + 24 * 60 * 60 * 1_000);
  assert.equal(progress.seconds, 12 * 60 * 60);
  assert.equal(progress.reward, 4.5 * 12 * 60 * 60);
  assert.deepEqual(calculateOfflineProgress(producer, 500), { seconds: 0, reward: 0 });
});

test("rare love, adventure, mystery, balanced, and fallback endings are reachable", () => {
  const base = createInitialState(1);
  assert.equal(getEnding(base).id, "unfinished");
  assert.equal(getEnding({ ...base, attributes: { will: 0, insight: 0, empathy: 8 }, choices: { 10: "love" } }).id, "love");
  assert.equal(getEnding({ ...base, attributes: { will: 8, insight: 0, empathy: 0 }, choices: { 10: "adventure" } }).id, "adventure");
  assert.equal(getEnding({ ...base, attributes: { will: 0, insight: 8, empathy: 0 }, choices: { 10: "mystery" } }).id, "mystery");
  assert.equal(getEnding({ ...base, attributes: { will: 4, insight: 4, empathy: 4 }, choices: { 10: "love" } }).id, "balanced");
  assert.equal(getEnding({ ...base, attributes: { will: 1, insight: 2, empathy: 5 }, choices: { 10: "adventure" } }).id, "tender");
});

test("resonance resets clicker economy but preserves story relationships and choices", () => {
  const base = createInitialState(1);
  const progressed = {
    ...addEchoes(base, 60_000, true),
    started: true,
    attributes: { will: 2, insight: 1, empathy: 3 },
    choices: { 1: "waited" },
    readChapters: [0, 1],
    upgrades: { ...base.upgrades, city: 3 },
  };
  const next = enterResonance(progressed, 2);
  assert.equal(next.resonance, 1);
  assert.equal(next.echoes, 0);
  assert.equal(next.cycleEchoes, 0);
  assert.equal(next.upgrades.city, 0);
  assert.equal(next.lifetimeEchoes, 60_000);
  assert.deepEqual(next.attributes, progressed.attributes);
  assert.deepEqual(next.choices, progressed.choices);
});

test("resonance multiplier affects tap and passive production equally", () => {
  const base = createInitialState(1);
  const tuned = { ...base, resonance: 2, upgrades: { ...base.upgrades, resonator: 1, drone: 2 } };
  const stats = getProductionStats(tuned);
  assert.ok(Math.abs(stats.globalMultiplier - 1.36) < 1e-12);
  assert.ok(stats.tapPower > 2.99 && stats.tapPower < 3);
  assert.ok(Math.abs(stats.passivePerSecond - 1.224) < 1e-12);
});

test("formats compact Russian game numbers", () => {
  assert.equal(formatNumber(9.54), "9,5");
  assert.equal(formatNumber(999), "999");
  assert.equal(formatNumber(1_250), "1,25 тыс");
  assert.equal(formatNumber(Number.NaN), "0");
});
