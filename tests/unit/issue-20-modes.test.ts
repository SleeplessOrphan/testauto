import { describe, expect, it } from "vitest";
import { EMPTY_STATS } from "@/lib/game/scoring";
import type { GameState, PlayerId, PlayerStats, Snake } from "@/lib/game/types";
import { loseLife as loseLifeBase } from "@/lib/game/lives";
import { checkGameEnd, finishGame } from "@/lib/game/modes";
import type { GameMode } from "@/lib/game/modes";

/*
 * Assumed API (see .pipeline/questions.md), module src/lib/game/modes.ts:
 *   type GameMode = { kind: 'timed'; minutes: 1|3|5 } | { kind: 'survival' }
 *                 | { kind: 'target'; target: 100|200|500 } | { kind: 'practice' }
 *   checkGameEnd(state, mode) => { ended: boolean; outcome?: 'win'|'draw'|'none'; winner?: PlayerId }
 *     (outcome/winner absent while not ended; winner only with outcome 'win')
 *   finishGame(state, mode) => same shape with ended: true (ends Practice from the pause menu)
 *   GameState gains `timeRemaining?: number` (seconds left; Timed mode).
 *   loseLife(state, player, rng?, mode?) never eliminates when mode.kind === 'practice'.
 */

type LoseLife = (s: GameState, p: PlayerId, rng?: () => number, mode?: GameMode) => GameState;
const loseLife = loseLifeBase as unknown as LoseLife;

const stats = (score: number, lives = 3): PlayerStats => ({ ...EMPTY_STATS, score, lives });
const state = (
  s1: number,
  s2: number,
  o: { lives?: [number, number]; eliminated?: PlayerId[]; time?: number } = {},
): GameState =>
  ({
    snakes: [],
    stats: { 1: stats(s1, o.lives?.[0] ?? 3), 2: stats(s2, o.lives?.[1] ?? 3) },
    eliminated: o.eliminated,
    timeRemaining: o.time,
  }) as GameState;

const timed = (minutes: 1 | 3 | 5 = 3): GameMode => ({ kind: "timed", minutes });
const survival: GameMode = { kind: "survival" };
const target = (t: 100 | 200 | 500 = 100): GameMode => ({ kind: "target", target: t });
const practice: GameMode = { kind: "practice" };

describe("Timed mode", () => {
  it.each([1, 3, 5] as const)("keeps going while time remains (%i min)", (m) => {
    expect(checkGameEnd(state(50, 10, { time: 30 }), timed(m)).ended).toBe(false);
    expect(checkGameEnd(state(50, 10, { time: 0.001 }), timed(m)).ended).toBe(false);
  });
  it("ends at zero and the higher score wins", () => {
    expect(checkGameEnd(state(50, 10, { time: 0 }), timed())).toMatchObject({ ended: true, outcome: "win", winner: 1 });
    expect(checkGameEnd(state(10, 50, { time: 0 }), timed())).toMatchObject({ ended: true, outcome: "win", winner: 2 });
  });
  it("equal scores at zero is a draw", () => {
    const r = checkGameEnd(state(40, 40, { time: 0 }), timed());
    expect(r).toMatchObject({ ended: true, outcome: "draw" });
    expect(r.winner).toBeUndefined();
  });
  it("0-0 at zero is a draw", () => {
    expect(checkGameEnd(state(0, 0, { time: 0 }), timed())).toMatchObject({ ended: true, outcome: "draw" });
  });
  it("one eliminated player does not end the game while time remains", () => {
    expect(checkGameEnd(state(5, 90, { lives: [0, 3], eliminated: [1], time: 20 }), timed()).ended).toBe(false);
    expect(checkGameEnd(state(90, 5, { lives: [3, 0], eliminated: [2], time: 20 }), timed()).ended).toBe(false);
  });
  it("eliminated player can still win on score when the timer expires", () => {
    expect(checkGameEnd(state(90, 5, { lives: [0, 3], eliminated: [1], time: 0 }), timed())).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
  });
  it("both eliminated ends the game early, highest score wins", () => {
    expect(checkGameEnd(state(30, 20, { lives: [0, 0], eliminated: [1, 2], time: 50 }), timed())).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
    expect(checkGameEnd(state(20, 30, { lives: [0, 0], eliminated: [2, 1], time: 50 }), timed())).toMatchObject({
      ended: true, outcome: "win", winner: 2,
    });
  });
  it("both eliminated with equal scores is a draw", () => {
    expect(checkGameEnd(state(20, 20, { lives: [0, 0], eliminated: [1, 2], time: 50 }), timed())).toMatchObject({
      ended: true, outcome: "draw",
    });
  });
  it("does not end on score alone", () => {
    expect(checkGameEnd(state(9999, 0, { time: 10 }), timed()).ended).toBe(false);
  });
});

describe("Survival mode", () => {
  it("has no timer: time remaining of zero is irrelevant", () => {
    expect(checkGameEnd(state(5, 5, { time: 0 }), survival).ended).toBe(false);
    expect(checkGameEnd(state(5, 5), survival).ended).toBe(false);
  });
  it("keeps going when players have lost some but not all lives", () => {
    expect(checkGameEnd(state(5, 5, { lives: [1, 2] }), survival).ended).toBe(false);
  });
  it("ends when one player is eliminated; the survivor wins even with a lower score", () => {
    expect(checkGameEnd(state(0, 500, { lives: [0, 1], eliminated: [1] }), survival)).toMatchObject({
      ended: true, outcome: "win", winner: 2,
    });
    expect(checkGameEnd(state(500, 0, { lives: [3, 0], eliminated: [2] }), survival)).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
    expect(checkGameEnd(state(7, 7, { lives: [2, 0], eliminated: [2] }), survival)).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
  });
  it("both eliminated: highest score wins", () => {
    expect(checkGameEnd(state(10, 20, { lives: [0, 0], eliminated: [1, 2] }), survival)).toMatchObject({
      ended: true, outcome: "win", winner: 2,
    });
    expect(checkGameEnd(state(20, 10, { lives: [0, 0], eliminated: [1, 2] }), survival)).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
  });
  it("both eliminated with equal scores is a draw", () => {
    expect(checkGameEnd(state(10, 10, { lives: [0, 0], eliminated: [1, 2] }), survival)).toMatchObject({
      ended: true, outcome: "draw",
    });
  });
});

describe("Target Score mode", () => {
  it.each([100, 200, 500] as const)("ends when a player reaches exactly %i", (t) => {
    expect(checkGameEnd(state(t, 0), target(t))).toMatchObject({ ended: true, outcome: "win", winner: 1 });
    expect(checkGameEnd(state(0, t), target(t))).toMatchObject({ ended: true, outcome: "win", winner: 2 });
  });
  it.each([100, 200, 500] as const)("does not end one point below %i", (t) => {
    expect(checkGameEnd(state(t - 1, t - 1), target(t)).ended).toBe(false);
  });
  it("ends when a player exceeds the target", () => {
    expect(checkGameEnd(state(130, 20), target(100))).toMatchObject({ ended: true, outcome: "win", winner: 1 });
  });
  it("a score of 100 does not satisfy a target of 200", () => {
    expect(checkGameEnd(state(100, 150), target(200)).ended).toBe(false);
  });
  it("both reach target in the same cycle: highest score wins", () => {
    expect(checkGameEnd(state(110, 120), target(100))).toMatchObject({ ended: true, outcome: "win", winner: 2 });
    expect(checkGameEnd(state(125, 100), target(100))).toMatchObject({ ended: true, outcome: "win", winner: 1 });
  });
  it("both reach target with identical scores is a draw", () => {
    expect(checkGameEnd(state(100, 100), target(100))).toMatchObject({ ended: true, outcome: "draw" });
    expect(checkGameEnd(state(210, 210), target(200))).toMatchObject({ ended: true, outcome: "draw" });
  });
  it("one eliminated and the other still below target: keeps going", () => {
    expect(checkGameEnd(state(10, 50, { lives: [0, 3], eliminated: [1] }), target(100)).ended).toBe(false);
  });
  it("one eliminated and the other reaches target: the other wins", () => {
    expect(checkGameEnd(state(10, 100, { lives: [0, 3], eliminated: [1] }), target(100))).toMatchObject({
      ended: true, outcome: "win", winner: 2,
    });
  });
  it("both eliminated before target: highest score wins, equal is a draw", () => {
    expect(checkGameEnd(state(40, 30, { lives: [0, 0], eliminated: [1, 2] }), target(100))).toMatchObject({
      ended: true, outcome: "win", winner: 1,
    });
    expect(checkGameEnd(state(30, 40, { lives: [0, 0], eliminated: [1, 2] }), target(100))).toMatchObject({
      ended: true, outcome: "win", winner: 2,
    });
    expect(checkGameEnd(state(30, 30, { lives: [0, 0], eliminated: [1, 2] }), target(100))).toMatchObject({
      ended: true, outcome: "draw",
    });
  });
});

describe("Practice mode", () => {
  it("never ends on its own", () => {
    expect(checkGameEnd(state(0, 0), practice).ended).toBe(false);
    expect(checkGameEnd(state(100000, 0, { time: 0 }), practice).ended).toBe(false);
    expect(checkGameEnd(state(500, 500), practice).ended).toBe(false);
  });
  it("ending it gives a result with no winner, whatever the scores", () => {
    for (const [a, b] of [[0, 0], [50, 10], [10, 50], [30, 30]] as const) {
      const r = finishGame(state(a, b), practice);
      expect(r).toMatchObject({ ended: true, outcome: "none" });
      expect(r.winner).toBeUndefined();
    }
  });
});

describe("checkGameEnd purity", () => {
  it("does not mutate the state", () => {
    const s = state(10, 10, { lives: [0, 0], eliminated: [1, 2], time: 0 });
    const copy = JSON.parse(JSON.stringify(s));
    checkGameEnd(s, timed());
    checkGameEnd(s, survival);
    expect(JSON.parse(JSON.stringify(s))).toEqual(copy);
  });
});

describe("Practice mode lives", () => {
  const snake = (player: PlayerId, y: number): Snake => ({
    player,
    direction: "right",
    pendingDirection: "right",
    segments: [{ x: 10, y }, { x: 9, y }, { x: 8, y }],
  });
  const base = (lives: number): GameState => ({
    snakes: [snake(1, 5), snake(2, 20)],
    stats: { 1: stats(42, lives), 2: stats(7, 3) },
  });

  it("respawns instead of eliminating, even on the final life, repeatedly", () => {
    let s = base(1);
    for (let i = 0; i < 6; i++) {
      s = loseLife(s, 1, () => 0.3, practice);
      expect(s.eliminated ?? []).not.toContain(1);
      expect(s.snakes.some((x) => x.player === 1 && x.segments.length === 3)).toBe(true);
      expect(s.stats![1].lives).toBeGreaterThan(0);
    }
    expect(s.stats![1].score).toBe(42);
    expect(s.stats![1].collisions).toBe(6);
  });
  it("respawns even when lives are already 0", () => {
    const s = loseLife(base(0), 1, () => 0.3, practice);
    expect(s.eliminated ?? []).not.toContain(1);
    expect(s.snakes.some((x) => x.player === 1)).toBe(true);
  });
  it("other modes still eliminate on the final life", () => {
    for (const m of [timed(), survival, target()]) {
      expect(loseLife(base(1), 1, () => 0.3, m).eliminated).toContain(1);
    }
    expect(loseLife(base(1), 1, () => 0.3).eliminated).toContain(1);
  });
  it("other modes still deduct a life while some remain", () => {
    expect(loseLife(base(3), 1, () => 0.3, survival).stats![1].lives).toBe(2);
  });
  it("does not mutate the input state", () => {
    const s = base(1);
    const copy = JSON.parse(JSON.stringify(s));
    loseLife(s, 1, () => 0.3, practice);
    expect(JSON.parse(JSON.stringify(s))).toEqual(copy);
  });
  it("scores and accuracy stats survive a practice respawn", () => {
    const s = base(1);
    s.stats![1] = { ...s.stats![1], correct: 4, incorrect: 2, streak: 3, longestStreak: 3 };
    const r = loseLife(s, 1, () => 0.3, practice).stats![1];
    expect(r).toMatchObject({ score: 42, correct: 4, incorrect: 2 });
  });
});
