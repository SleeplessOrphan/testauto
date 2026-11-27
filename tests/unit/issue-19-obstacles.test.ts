import { describe, expect, it } from "vitest";
import { GRID_COLUMNS, GRID_ROWS } from "@/lib/game/constants";
import { advance } from "@/lib/game/loop";
import { createInitialState } from "@/lib/game/state";
import { generateObstacles } from "@/lib/game/obstacles";
import { EMPTY_STATS } from "@/lib/game/scoring";
import type { GameState, Position } from "@/lib/game/types";

/*
 * Assumed API (see .pipeline/questions.md):
 *   src/lib/game/obstacles.ts exports generateObstacles(state, count, rng?) => Position[]
 *   (distinct in-grid cells, free of snakes, tiles, and a safety margin of 3 cells straight in front of each head).
 *   advance() (loop.ts) treats state.obstacles as blocking cells.
 */

const k = (p: Position) => p.x + "," + p.y;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

function forbidden(state: GameState): Set<string> {
  const s = new Set<string>();
  for (const sn of state.snakes) {
    for (const p of sn.segments) s.add(k(p));
    const [dx, dy] = DELTA[sn.direction];
    for (let i = 1; i <= 3; i++) s.add(k({ x: sn.segments[0].x + dx * i, y: sn.segments[0].y + dy * i }));
  }
  for (const t of state.tiles ?? []) s.add(k(t));
  return s;
}

describe("generateObstacles", () => {
  it("returns the requested number of distinct in-grid cells for many seeds", () => {
    for (const count of [0, 4, 8]) {
      for (let seed = 1; seed <= 40; seed++) {
        const state = createInitialState();
        const obs = generateObstacles(state, count, mulberry(seed));
        expect(obs).toHaveLength(count);
        expect(new Set(obs.map(k)).size).toBe(count);
        for (const p of obs) {
          expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThan(GRID_COLUMNS);
          expect(p.y).toBeLessThan(GRID_ROWS);
        }
      }
    }
  });

  it("avoids snakes, the safety margin in front of each head and answer tiles", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const base = createInitialState();
      const tiles = [
        { player: 1 as const, x: 10, y: 3, value: 1 },
        { player: 2 as const, x: 20, y: 12, value: 2 },
        { player: 1 as const, x: 25, y: 20, value: 3 },
      ];
      const state: GameState = { ...base, tiles };
      const bad = forbidden(state);
      for (const p of generateObstacles(state, 8, mulberry(seed))) expect(bad.has(k(p))).toBe(false);
    }
  });

  it("fills exactly the free cells when the board is almost full", () => {
    const state = createInitialState();
    const bad = forbidden(state);
    const free: Position[] = [];
    for (let x = 0; x < GRID_COLUMNS; x++)
      for (let y = 0; y < GRID_ROWS; y++) if (!bad.has(x + "," + y)) free.push({ x, y });
    const spare = free.slice(0, 4);
    const filled = free.slice(4).map((p, i) => ({ player: 1 as const, x: p.x, y: p.y, value: i }));
    const obs = generateObstacles({ ...state, tiles: filled }, 4, mulberry(7));
    expect(obs.map(k).sort()).toEqual(spare.map(k).sort());
  });

  it("is repeatable for the same seed and varies between seeds", () => {
    const state = createInitialState();
    const a = generateObstacles(state, 8, mulberry(5)).map(k).join("|");
    expect(generateObstacles(state, 8, mulberry(5)).map(k).join("|")).toBe(a);
    const others = new Set<string>();
    for (let s = 6; s < 16; s++) others.add(generateObstacles(state, 8, mulberry(s)).map(k).join("|"));
    expect(others.size).toBeGreaterThan(1);
  });

  it("does not mutate the state", () => {
    const state = createInitialState();
    const copy = JSON.stringify(state);
    generateObstacles(state, 8, mulberry(3));
    expect(JSON.stringify(state)).toBe(copy);
  });
});

describe("obstacles in collision detection", () => {
  it("a snake that moves into an obstacle loses a life and does not enter the cell", () => {
    const base = createInitialState();
    const head = base.snakes[0].segments[0];
    const state: GameState = {
      ...base,
      stats: { 1: EMPTY_STATS, 2: EMPTY_STATS },
      obstacles: [{ x: head.x + 1, y: head.y }],
    };
    const next = advance(state);
    expect(next.stats![1].lives).toBe(EMPTY_STATS.lives - 1);
    expect(next.stats![2].lives).toBe(EMPTY_STATS.lives);
    const s1 = next.snakes.find((s) => s.player === 1)!;
    expect(s1.segments.some((p) => k(p) === k({ x: head.x + 1, y: head.y }))).toBe(false);
  });

  it("without obstacles the same move is safe", () => {
    const base = createInitialState();
    const next = advance({ ...base, stats: { 1: EMPTY_STATS, 2: EMPTY_STATS }, obstacles: [] });
    expect(next.stats![1].lives).toBe(EMPTY_STATS.lives);
  });
});
