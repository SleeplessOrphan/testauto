import { describe, expect, it } from "vitest";
import { EMPTY_STATS, STREAK_BONUS, nextStats } from "@/lib/game/scoring";
import type { PlayerStats } from "@/lib/game/types";

/*
 * Assumed API (see .pipeline/questions.md):
 *   PlayerStats gains `streak` (current consecutive correct) and `longestStreak` (best so far), in src/lib/game/types.ts
 *   EMPTY_STATS has both at 0; STREAK_BONUS = 20 exported from src/lib/game/scoring.ts
 *   nextStats(stats, correct) applies streak, bonus and longest streak.
 */

function run(answers: boolean[], from: PlayerStats = EMPTY_STATS): PlayerStats[] {
  const out: PlayerStats[] = [];
  let s = from;
  for (const a of answers) {
    s = nextStats(s, a);
    out.push(s);
  }
  return out;
}
const correct = (n: number) => Array<boolean>(n).fill(true);

describe("streak counting", () => {
  it("starts at zero", () => {
    expect(EMPTY_STATS.streak).toBe(0);
    expect(EMPTY_STATS.longestStreak).toBe(0);
    expect(STREAK_BONUS).toBe(20);
  });
  it("rises by one per correct answer", () => {
    expect(run(correct(4)).map((s) => s.streak)).toEqual([1, 2, 3, 4]);
  });
  it("resets to zero on an incorrect answer", () => {
    const r = run([true, true, true, false]);
    expect(r[3].streak).toBe(0);
    expect(r[3].correct).toBe(3);
    expect(r[3].incorrect).toBe(1);
  });
  it("an incorrect answer at zero streak keeps it at zero", () => {
    expect(nextStats(EMPTY_STATS, false).streak).toBe(0);
  });
  it("starts counting again after a reset", () => {
    expect(run([true, true, false, true])[3].streak).toBe(1);
  });
});

describe("streak bonus", () => {
  it("gives no bonus for the first four correct answers", () => {
    expect(run(correct(4)).map((s) => s.score)).toEqual([10, 20, 30, 40]);
  });
  it("adds 20 on top of the usual 10 at the fifth consecutive correct answer", () => {
    expect(run(correct(5))[4].score).toBe(40 + 10 + 20);
  });
  it("gives no bonus at the sixth to ninth", () => {
    expect(run(correct(9)).map((s) => s.score).slice(4)).toEqual([70, 80, 90, 100, 110]);
  });
  it("adds a second 20 at the tenth", () => {
    expect(run(correct(10))[9].score).toBe(110 + 10 + 20);
  });
  it("gives no further bonus after ten (eleven to fifteen)", () => {
    const r = run(correct(15));
    expect(r[10].score).toBe(140 + 10);
    expect(r[14].score).toBe(140 + 50);
  });
  it("needs five in a row: an incorrect answer in between prevents the bonus", () => {
    const r = run([true, true, true, true, false, true]);
    expect(r[5].score).toBe(45);
    expect(r[5].streak).toBe(1);
  });
  it("a reset streak can earn the bonus again", () => {
    const r = run([...correct(5), false, ...correct(5)]);
    expect(r[5].score).toBe(65);
    expect(r[10].score).toBe(65 + 50 + 20);
    expect(r[10].streak).toBe(5);
  });
  it("uses the stored streak on carried-in stats", () => {
    const s = nextStats({ score: 100, correct: 4, incorrect: 0, streak: 4, longestStreak: 4 }, true);
    expect(s.score).toBe(130);
    expect(s.streak).toBe(5);
  });
  it("an incorrect answer never earns a bonus and keeps the 5-point penalty", () => {
    const s = nextStats({ score: 50, correct: 5, incorrect: 0, streak: 4, longestStreak: 4 }, false);
    expect(s.score).toBe(45);
    expect(s.streak).toBe(0);
  });
});

describe("longest streak", () => {
  it("tracks the best run", () => {
    const r = run([true, true, true, false, true]);
    expect(r[2].longestStreak).toBe(3);
    expect(r[3].longestStreak).toBe(3);
    expect(r[4].longestStreak).toBe(3);
  });
  it("is raised only when the current streak beats it", () => {
    const r = run([...correct(2), false, ...correct(4)]);
    expect(r[6].longestStreak).toBe(4);
    expect(r[6].streak).toBe(4);
  });
  it("is not reduced by a reset", () => {
    const r = run([...correct(6), false]);
    expect(r[6].streak).toBe(0);
    expect(r[6].longestStreak).toBe(6);
  });
  it("does not mutate its input", () => {
    const before = { ...EMPTY_STATS };
    nextStats(EMPTY_STATS, true);
    expect(EMPTY_STATS).toEqual(before);
  });
});
