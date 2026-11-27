import { GRID_COLUMNS, GRID_ROWS } from './constants';
import { step } from './movement';
import type { GameState } from './types';

/** 5 cells per second until gameplay difficulty is built. */
export const TICK_MS = 200;

/** Longest frame gap we account for, so a background tab does not fast-forward the snakes on return. */
const MAX_FRAME_MS = 250;

/** Turns elapsed time into whole ticks and carries the remainder to the next frame. */
export function accumulate(remainderMs: number, frameMs: number, tickMs = TICK_MS) {
  const total = remainderMs + Math.min(Math.max(frameMs, 0), MAX_FRAME_MS);
  const ticks = Math.floor(total / tickMs);
  return { ticks, remainderMs: total - ticks * tickMs };
}

/** One movement cycle. A snake that would leave the grid or hit a snake stays put for good (lives come later). */
export function advance(state: GameState): GameState {
  const moved = step(state);
  const occupied = new Set(
    state.snakes.flatMap((s) => s.segments.slice(0, -1).map((p) => p.x + ',' + p.y)),
  );
  return {
    snakes: state.snakes.map((s, i) => {
      if (s.stopped) return s;
      const head = moved.snakes[i].segments[0];
      const blocked =
        head.x < 0 || head.y < 0 || head.x >= GRID_COLUMNS || head.y >= GRID_ROWS ||
        occupied.has(head.x + ',' + head.y);
      return blocked ? { ...s, stopped: true } : moved.snakes[i];
    }),
  };
}
