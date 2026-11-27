import { GRID_COLUMNS, GRID_ROWS } from './constants';
import { loseLife } from './lives';
import { step } from './movement';
import type { GameState } from './types';

/** Default tick length; the game screen passes the one for the chosen gameplay difficulty. */
export const TICK_MS = 200;

/** Longest frame gap we account for, so a background tab does not fast-forward the snakes on return. */
const MAX_FRAME_MS = 250;

/** Turns elapsed time into whole ticks and carries the remainder to the next frame. */
export function accumulate(remainderMs: number, frameMs: number, tickMs = TICK_MS) {
  const total = remainderMs + Math.min(Math.max(frameMs, 0), MAX_FRAME_MS);
  const ticks = Math.floor(total / tickMs);
  return { ticks, remainderMs: total - ticks * tickMs };
}

/** One movement cycle. A snake that would leave the grid or hit a snake costs a life and respawns, or is eliminated on its last life. */
export function advance(state: GameState): GameState {
  const moved = step(state);
  // A moving snake frees its tail cell, but a stopped snake keeps it.
  const occupied = new Set(
    state.snakes.flatMap((s) =>
      (s.stopped ? s.segments : s.segments.slice(0, -1)).map((p) => p.x + ',' + p.y),
    ),
  );
  const key = (i: number) => moved.snakes[i].segments[0].x + ',' + moved.snakes[i].segments[0].y;
  const blocked = state.snakes.map((s, i) => {
    if (s.stopped) return false;
    const head = moved.snakes[i].segments[0];
    return (
      head.x < 0 || head.y < 0 || head.x >= GRID_COLUMNS || head.y >= GRID_ROWS ||
      occupied.has(key(i)) ||
      (state.obstacles ?? []).some((o) => o.x === head.x && o.y === head.y)
    );
  });
  // Two heads entering the same empty cell stop both snakes.
  state.snakes.forEach((a, i) =>
    state.snakes.forEach((b, j) => {
      if (i < j && !a.stopped && !b.stopped && key(i) === key(j)) {
        blocked[i] = true;
        blocked[j] = true;
      }
    }),
  );
  // Keep step()'s scoring changes (tiles, stats, refresh); a blocked snake stays put until loseLife respawns it.
  let next: GameState = {
    ...moved,
    snakes: state.snakes.map((s, i) => (s.stopped || blocked[i] ? s : moved.snakes[i])),
  };
  state.snakes.forEach((s, i) => {
    if (blocked[i]) next = loseLife(next, s.player);
  });
  // Longest length is tracked after respawns too, which never lengthen a snake.
  if (next.stats) {
    const updated = { ...next.stats };
    for (const s of next.snakes) {
      const st = updated[s.player];
      if (s.segments.length > st.longestLength) updated[s.player] = { ...st, longestLength: s.segments.length };
    }
    next = { ...next, stats: updated };
  }
  return next;
}
