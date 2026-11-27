import { describe, expect, it } from "vitest";
import { placeAnswerTiles } from "@/lib/game/answers";
import { GRID_COLUMNS, GRID_ROWS } from "@/lib/game/constants";
import { createInitialState } from "@/lib/game/state";
import type { GameState, Position } from "@/lib/game/types";

/*
 * Assumed API (see .pipeline/questions.md), module src/lib/game/answers.ts:
 *   placeAnswerTiles(state, player, values, rng?) =>
 *     { ok: true, tiles: { player, x, y, value }[] } | { ok: false }
 * `values` are the three option numbers.
 */

const key = (p: Position) => `${p.x},${p.y}`;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function allCells(): Position[] {
  const out: Position[] = [];
  for (let y = 0; y < GRID_ROWS; y++) for (let x = 0; x < GRID_COLUMNS; x++) out.push({ x, y });
  return out;
}

function place(state: GameState, player: 1 | 2, values = [7, 11, 13], rng = seeded(3)) {
  return placeAnswerTiles(state, player, values, rng);
}

describe("placeAnswerTiles", () => {
  it("places three tiles with the given values and owner, inside the grid, on distinct cells", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = place(createInitialState(), 1, [7, 11, 13], seeded(seed));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.tiles).toHaveLength(3);
      expect(r.tiles.map((t) => t.value).sort((a, b) => a - b)).toEqual([7, 11, 13]);
      for (const t of r.tiles) {
        expect(t.player).toBe(1);
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThan(GRID_COLUMNS);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeLessThan(GRID_ROWS);
      }
      expect(new Set(r.tiles.map(key)).size).toBe(3);
    }
  });

  it("never overlaps snakes, obstacles or existing tiles", () => {
    const base = createInitialState();
    const obstacles = allCells().filter((p) => (p.x * 7 + p.y * 3) % 5 === 0);
    const state = { ...base, obstacles, tiles: [{ player: 2, x: 1, y: 1, value: 5 }] } as GameState;
    const blocked = new Set([...state.snakes.flatMap((s) => s.segments), ...obstacles, { x: 1, y: 1 }].map(key));
    for (let seed = 1; seed <= 50; seed++) {
      const r = place(state, 1, [1, 2, 3], seeded(seed));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      for (const t of r.tiles) expect(blocked.has(key(t))).toBe(false);
    }
  });

  it("places tiles only on cells reachable from the owner's head", () => {
    const base = createInitialState();
    const wall = allCells().filter((p) => p.x === 20);
    const state: GameState = { ...base, obstacles: wall };
    expect(base.snakes[0].segments[0].x).toBeLessThan(20);
    expect(base.snakes[1].segments[0].x).toBeGreaterThan(20);
    for (let seed = 1; seed <= 40; seed++) {
      const a = place(state, 1, [1, 2, 3], seeded(seed));
      const b = place(state, 2, [1, 2, 3], seeded(seed));
      expect(a.ok && b.ok).toBe(true);
      if (!a.ok || !b.ok) return;
      for (const t of a.tiles) expect(t.x).toBeLessThan(20);
      for (const t of b.tiles) expect(t.x).toBeGreaterThan(20);
    }
  });

  it("reports failure when fewer than three cells are free", () => {
    const base = createInitialState();
    const snakeCells = new Set(base.snakes.flatMap((s) => s.segments).map(key));
    const free = allCells().filter((p) => !snakeCells.has(key(p)));
    const keepKeys = new Set(free.slice(0, 2).map(key));
    const obstacles = free.filter((p) => !keepKeys.has(key(p)));
    expect(place({ ...base, obstacles }, 1).ok).toBe(false);
  });

  it("reports failure when the head is walled in", () => {
    const base = createInitialState();
    const head = base.snakes[0].segments[0];
    const obstacles = [
      { x: head.x + 1, y: head.y },
      { x: head.x, y: head.y - 1 },
      { x: head.x, y: head.y + 1 },
    ];
    expect(place({ ...base, obstacles }, 1).ok).toBe(false);
  });

  it("succeeds with exactly three free reachable cells", () => {
    const base = createInitialState();
    const snakeCells = new Set(base.snakes.flatMap((s) => s.segments).map(key));
    const head = base.snakes[0].segments[0];
    const free = [1, 2, 3].map((d) => ({ x: head.x + d, y: head.y }));
    const freeKeys = new Set(free.map(key));
    const obstacles = allCells().filter((p) => !snakeCells.has(key(p)) && !freeKeys.has(key(p)));
    const r = place({ ...base, obstacles }, 1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(new Set(r.tiles.map(key))).toEqual(freeKeys);
  });

  it("does not mutate the state it is given", () => {
    const state = createInitialState();
    const copy = JSON.stringify(state);
    place(state, 2);
    expect(JSON.stringify(state)).toBe(copy);
  });
});
