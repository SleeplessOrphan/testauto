import { describe, expect, it } from "vitest";
import { computeResults } from "@/lib/game/results";
import { EMPTY_STATS } from "@/lib/game/scoring";
import type { GameState, PlayerStats } from "@/lib/game/types";

/*
 * Assumed API (see .pipeline/questions.md): src/lib/game/results.ts exports
 *   computeResults(state: GameState): Record<1 | 2, {
 *     score, correct, incorrect, total, accuracy: number | null,
 *     longestStreak, longestLength, collisions }>
 * accuracy is null when nothing was answered, else Math.round(correct / total * 100).
 * The state is never mutated.
 */
const mk = (a: Partial<PlayerStats>, b: Partial<PlayerStats>): GameState => ({
  snakes: [],
  stats: { 1: { ...EMPTY_STATS, ...a }, 2: { ...EMPTY_STATS, ...b } },
});

describe("computeResults", () => {
  it("copies the raw statistics for each player", () => {
    const r = computeResults(
      mk(
        { score: 70, correct: 9, incorrect: 3, longestStreak: 5, longestLength: 12, collisions: 2 },
        { score: 15, correct: 2, incorrect: 1, longestStreak: 2, longestLength: 5, collisions: 4 },
      ),
    );
    expect(r[1]).toMatchObject({ score: 70, correct: 9, incorrect: 3, total: 12, longestStreak: 5, longestLength: 12, collisions: 2 });
    expect(r[2]).toMatchObject({ score: 15, correct: 2, incorrect: 1, total: 3, longestStreak: 2, longestLength: 5, collisions: 4 });
  });

  it("accuracy is null when no questions were answered", () => {
    const r = computeResults(mk({}, { correct: 1 }));
    expect(r[1].total).toBe(0);
    expect(r[1].accuracy).toBeNull();
    expect(r[2].accuracy).toBe(100);
  });

  it("accuracy is a whole-number percentage", () => {
    const r = computeResults(mk({ correct: 1, incorrect: 2 }, { correct: 2, incorrect: 1 }));
    expect(r[1].accuracy).toBe(33);
    expect(r[2].accuracy).toBe(67);
    expect(computeResults(mk({ incorrect: 4 }, {}))[1].accuracy).toBe(0);
    expect(Number.isInteger(computeResults(mk({ correct: 7, incorrect: 1 }, {}))[1].accuracy)).toBe(true);
  });

  it("does not mutate the state", () => {
    const s = mk({ correct: 1 }, {});
    const copy = JSON.stringify(s);
    computeResults(s);
    expect(JSON.stringify(s)).toBe(copy);
  });

  it("falls back to zeros when the state has no stats", () => {
    const r = computeResults({ snakes: [] });
    for (const p of [1, 2] as const) {
      expect(r[p]).toMatchObject({ score: 0, correct: 0, incorrect: 0, total: 0, accuracy: null, collisions: 0 });
    }
  });
});
