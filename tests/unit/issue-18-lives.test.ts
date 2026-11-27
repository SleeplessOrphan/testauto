import { describe, expect, it } from "vitest";
import { GRID_COLUMNS, GRID_ROWS } from "@/lib/game/constants";
import { advance } from "@/lib/game/loop";
import { queueDirection } from "@/lib/game/movement";
import { EMPTY_STATS } from "@/lib/game/scoring";
import type { Direction, GameState, PlayerId, PlayerStats, Position, Snake } from "@/lib/game/types";
import { STARTING_LIVES, loseLife } from "@/lib/game/lives";

/*
 * Assumed API (see .pipeline/questions.md):
 *   src/lib/game/lives.ts exports STARTING_LIVES (3) and loseLife(state, player, rng?) => GameState.
 *   PlayerStats gains `lives`, `collisions` and `longestLength`; EMPTY_STATS = 3 / 0 / 3.
 *   GameState gains `eliminated?: PlayerId[]`. An eliminated player's snake is removed from `state.snakes`
 *   and their tiles from `state.tiles`.
 *   advance() (loop.ts) applies loseLife to every player that collides.
 */

type Stats = PlayerStats & { lives: number; collisions: number; longestLength: number };
type State = GameState & { eliminated?: PlayerId[] };
const stat = (s: GameState, p: PlayerId) => s.stats![p] as Stats;
const DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function snake(player: PlayerId, head: Position, direction: Direction, length = 3): Snake {
  const d = DELTA[direction];
  return {
    player,
    direction,
    pendingDirection: direction,
    segments: Array.from({ length }, (_, i) => ({ x: head.x - d.x * i, y: head.y - d.y * i })),
  };
}

function make(s1: Snake, s2: Snake, extra: Partial<GameState> = {}, lives: [number, number] = [3, 3]): GameState {
  return {
    snakes: [s1, s2],
    stats: {
      1: { ...EMPTY_STATS, lives: lives[0] } as PlayerStats,
      2: { ...EMPTY_STATS, lives: lives[1] } as PlayerStats,
    },
    ...extra,
  };
}

/** P1 about to hit the right wall; P2 far away heading left in open space. */
const wallCrash = (extra: Partial<GameState> = {}, lives: [number, number] = [3, 3]) =>
  make(snake(1, { x: GRID_COLUMNS - 1, y: 3 }, "right"), snake(2, { x: 30, y: 20 }, "left"), extra, lives);

const rngs = [() => 0, () => 0.5, () => 0.999, (() => { let i = 0; return () => ((i += 0.137) % 1); })()];

const key = (p: Position) => p.x + "," + p.y;
function expectSafe(state: GameState, player: PlayerId) {
  const sn = state.snakes.find((s) => s.player === player)!;
  expect(sn).toBeDefined();
  expect(sn.segments).toHaveLength(3);
  expect(sn.stopped).toBeFalsy();
  expect(sn.pendingDirection).toBe(sn.direction);
  const d = DELTA[sn.direction];
  sn.segments.forEach((c, i) => {
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x).toBeLessThan(GRID_COLUMNS);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeLessThan(GRID_ROWS);
    if (i > 0) expect(key(c)).toBe(key({ x: sn.segments[i - 1].x - d.x, y: sn.segments[i - 1].y - d.y }));
  });
  const others: Position[] = [
    ...state.snakes.filter((s) => s.player !== player).flatMap((s) => s.segments),
    ...(state.obstacles ?? []),
    ...(state.tiles ?? []),
  ];
  for (const c of sn.segments) {
    for (const o of others) expect(Math.abs(c.x - o.x) + Math.abs(c.y - o.y)).toBeGreaterThan(1);
  }
  // Clear space ahead of the head.
  const used = new Set(others.map(key));
  for (let k = 1; k <= 2; k++) {
    const a = { x: sn.segments[0].x + d.x * k, y: sn.segments[0].y + d.y * k };
    expect(a.x >= 0 && a.x < GRID_COLUMNS && a.y >= 0 && a.y < GRID_ROWS).toBe(true);
    expect(used.has(key(a))).toBe(false);
  }
}

describe("starting values", () => {
  it("every player starts with three lives, no collisions and a longest length of three", () => {
    expect(STARTING_LIVES).toBe(3);
    const e = EMPTY_STATS as Stats;
    expect(e.lives).toBe(3);
    expect(e.collisions).toBe(0);
    expect(e.longestLength).toBe(3);
  });
});

describe("loseLife", () => {
  it("costs one life and counts the collision", () => {
    const next = loseLife(wallCrash(), 1);
    expect(stat(next, 1).lives).toBe(2);
    expect(stat(next, 1).collisions).toBe(1);
    expect(stat(next, 2).lives).toBe(3);
    expect(stat(next, 2).collisions).toBe(0);
  });

  it("works when the state has no stats yet", () => {
    const state: GameState = { snakes: wallCrash().snakes };
    const next = loseLife(state, 2);
    expect(stat(next, 2).lives).toBe(2);
    expect(stat(next, 1).lives).toBe(3);
  });

  it("respawns the snake at a safe place with three segments, even from a long snake", () => {
    for (const rng of rngs) {
      const state = wallCrash();
      state.snakes[0] = snake(1, { x: GRID_COLUMNS - 1, y: 3 }, "right", 7);
      const next = loseLife(state, 1, rng);
      expectSafe(next, 1);
      expect((next as State).eliminated ?? []).not.toContain(1);
    }
  });

  it("leaves the other snake untouched", () => {
    const state = wallCrash();
    const next = loseLife(state, 1);
    expect(next.snakes.find((s) => s.player === 2)).toEqual(state.snakes[1]);
  });

  it("keeps score, question and every tile", () => {
    const tiles = [
      { player: 1 as const, x: 5, y: 5, value: 3 },
      { player: 1 as const, x: 8, y: 9, value: 4 },
      { player: 2 as const, x: 20, y: 12, value: 9 },
    ];
    const state = wallCrash({ tiles, questions: { 1: { text: "1 + 2", answer: 3 }, 2: { text: "4 + 5", answer: 9 } } });
    state.stats![1] = { ...state.stats![1], score: 40, correct: 4, incorrect: 1 };
    for (const rng of rngs) {
      const next = loseLife(state, 1, rng);
      expect(stat(next, 1).score).toBe(40);
      expect(stat(next, 1).correct).toBe(4);
      expect(stat(next, 1).incorrect).toBe(1);
      expect(next.questions).toEqual(state.questions);
      expect(next.tiles).toEqual(tiles);
      expectSafe(next, 1);
    }
  });

  it("respawns inside the only free area when the rest of the board is blocked", () => {
    // Free pocket: x 10..20, y 5..15. Everything else is an obstacle except P2's snake cells.
    const p2 = snake(2, { x: 32, y: 22 }, "left");
    const p2cells = new Set(p2.segments.map(key));
    const obstacles: Position[] = [];
    for (let x = 0; x < GRID_COLUMNS; x++)
      for (let y = 0; y < GRID_ROWS; y++) {
        const inPocket = x >= 10 && x <= 20 && y >= 5 && y <= 15;
        if (!inPocket && !p2cells.has(key({ x, y }))) obstacles.push({ x, y });
      }
    const state = make(snake(1, { x: 15, y: 5 }, "up"), p2, { obstacles });
    for (const rng of rngs) {
      const next = loseLife(state, 1, rng);
      expectSafe(next, 1);
      for (const c of next.snakes.find((s) => s.player === 1)!.segments) {
        expect(c.x).toBeGreaterThanOrEqual(10);
        expect(c.x).toBeLessThanOrEqual(20);
        expect(c.y).toBeGreaterThanOrEqual(5);
        expect(c.y).toBeLessThanOrEqual(15);
      }
    }
  });

  it("does not respawn next to the other snake or on a tile", () => {
    const tiles = Array.from({ length: 12 }, (_, i) => ({ player: 1 as const, x: 2 + i * 3, y: 12, value: i }));
    const state = make(snake(1, { x: GRID_COLUMNS - 1, y: 3 }, "right"), snake(2, { x: 20, y: 12 }, "left"), { tiles });
    for (const rng of rngs) expectSafe(loseLife(state, 1, rng), 1);
  });

  it("eliminates a player on the final life: snake and tiles removed, other player's tiles kept", () => {
    const tiles = [
      { player: 1 as const, x: 5, y: 5, value: 3 },
      { player: 2 as const, x: 20, y: 12, value: 9 },
      { player: 2 as const, x: 22, y: 14, value: 1 },
    ];
    const state = wallCrash({ tiles }, [1, 3]);
    state.stats![1] = { ...state.stats![1], score: 25 };
    const next = loseLife(state, 1);
    expect(stat(next, 1).lives).toBe(0);
    expect(stat(next, 1).collisions).toBe(1);
    expect(stat(next, 1).score).toBe(25);
    expect((next as State).eliminated).toContain(1);
    expect((next as State).eliminated).not.toContain(2);
    expect(next.snakes.map((s) => s.player)).toEqual([2]);
    expect(next.tiles).toEqual(tiles.filter((t) => t.player === 2));
    expect(next.snakes[0]).toEqual(state.snakes[1]);
  });

  it("ignores a player who is already eliminated", () => {
    const eliminated = loseLife(wallCrash({}, [1, 3]), 1);
    const again = loseLife(eliminated, 1);
    expect(stat(again, 1).lives).toBe(0);
    expect(stat(again, 1).collisions).toBe(1);
    expect(again.snakes).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const state = wallCrash();
    const copy = JSON.parse(JSON.stringify(state));
    loseLife(state, 1);
    expect(state).toEqual(copy);
  });

  it("keeps the longest length when a long snake respawns at three segments", () => {
    const state = wallCrash();
    state.snakes[0] = snake(1, { x: GRID_COLUMNS - 1, y: 3 }, "right", 6);
    state.stats![1] = { ...state.stats![1], longestLength: 6 } as PlayerStats;
    const next = loseLife(state, 1);
    expect(stat(next, 1).longestLength).toBe(6);
    expect(next.snakes.find((s) => s.player === 1)!.segments).toHaveLength(3);
  });
});

describe("advance with lives", () => {
  it("a wall crash costs one life, respawns safely and the other player keeps moving", () => {
    const next = advance(wallCrash());
    expect(stat(next, 1).lives).toBe(2);
    expect(stat(next, 1).collisions).toBe(1);
    expectSafe(next, 1);
    expect(stat(next, 2).lives).toBe(3);
    expect(stat(next, 2).collisions).toBe(0);
    const p2 = next.snakes.find((s) => s.player === 2)!;
    expect(p2.segments[0]).toEqual({ x: 29, y: 20 });
    expect(p2.stopped).toBeFalsy();
  });

  it("the respawned snake keeps moving and does not lose another life straight away", () => {
    let state = advance(wallCrash());
    for (let i = 0; i < 2; i++) state = advance(state);
    expect(stat(state, 1).lives).toBe(2);
    expect(stat(state, 1).collisions).toBe(1);
    expect(state.snakes.find((s) => s.player === 1)!.segments).toHaveLength(3);
  });

  it("keeps score and question across the crash", () => {
    const questions = { 1: { text: "2 + 2", answer: 4 }, 2: { text: "3 + 3", answer: 6 } };
    const state = wallCrash({ questions });
    state.stats![1] = { ...state.stats![1], score: 30 };
    const next = advance(state);
    expect(stat(next, 1).score).toBe(30);
    expect(next.questions).toEqual(questions);
  });

  it("both players lose a life when heads meet", () => {
    const state = make(snake(1, { x: 10, y: 10 }, "right"), snake(2, { x: 12, y: 10 }, "left"));
    const next = advance(state);
    expect(stat(next, 1).lives).toBe(2);
    expect(stat(next, 2).lives).toBe(2);
    expectSafe(next, 1);
    expectSafe(next, 2);
  });

  it("eliminates a player on the final life and the survivor carries on", () => {
    const tiles = [
      { player: 1 as const, x: 5, y: 5, value: 3 },
      { player: 2 as const, x: 20, y: 12, value: 9 },
    ];
    let state = advance(wallCrash({ tiles }, [1, 3]));
    expect((state as State).eliminated).toEqual([1]);
    expect(stat(state, 1).lives).toBe(0);
    expect(state.snakes.map((s) => s.player)).toEqual([2]);
    expect(state.tiles).toEqual([tiles[1]]);
    state = advance(state);
    state = advance(state);
    expect(state.snakes).toHaveLength(1);
    expect(state.snakes[0].segments[0]).toEqual({ x: 27, y: 20 });
    expect(stat(state, 1).lives).toBe(0);
    expect(stat(state, 1).collisions).toBe(1);
    expect(stat(state, 2).lives).toBe(3);
  });

  it("an eliminated player's keys no longer affect the game", () => {
    const state = advance(wallCrash({}, [1, 3]));
    const after = queueDirection(state, 1, "up");
    expect(after.snakes.map((s) => s.player)).toEqual([2]);
    expect(after.snakes[0]).toEqual(state.snakes[0]);
    expect(advance(after).snakes.map((s) => s.player)).toEqual([2]);
    // The survivor still answers to their own keys.
    expect(queueDirection(after, 2, "up").snakes[0].pendingDirection).toBe("up");
  });

  it("two players eliminated in the same cycle both lose their snakes", () => {
    const state = make(snake(1, { x: 10, y: 10 }, "right"), snake(2, { x: 12, y: 10 }, "left"), {}, [1, 1]);
    const next = advance(state);
    expect(next.snakes).toHaveLength(0);
    expect([...((next as State).eliminated ?? [])].sort()).toEqual([1, 2]);
  });
});

describe("longest snake length", () => {
  const tiles = (value: number) => [{ player: 1 as const, x: 11, y: 10, value }];
  const q = { 1: { text: "q", answer: 5 }, 2: { text: "q", answer: 5 } };

  it("rises when a correct answer grows the snake", () => {
    const state = make(snake(1, { x: 10, y: 10 }, "right"), snake(2, { x: 30, y: 20 }, "left"), { tiles: tiles(5), questions: q });
    const next = advance(state);
    expect(next.snakes[0].segments).toHaveLength(4);
    expect(stat(next, 1).longestLength).toBe(4);
  });

  it("does not fall when an incorrect answer shrinks the snake", () => {
    const state = make(snake(1, { x: 10, y: 10 }, "right", 4), snake(2, { x: 30, y: 20 }, "left"), { tiles: tiles(7), questions: q });
    state.stats![1] = { ...state.stats![1], longestLength: 4 } as PlayerStats;
    const next = advance(state);
    expect(next.snakes[0].segments).toHaveLength(3);
    expect(stat(next, 1).longestLength).toBe(4);
  });
});
