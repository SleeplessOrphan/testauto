import { GRID_COLUMNS, GRID_ROWS } from './constants';
import type { Direction, GameState, Position } from './types';

/** Free cells kept straight ahead of each snake head so nobody starts next to an obstacle. */
export const SAFETY_MARGIN = 3;

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const key = (p: Position) => p.x + ',' + p.y;

/**
 * Picks `count` distinct cells for obstacles, avoiding snakes, the safety margin in front of each
 * head and answer tiles. Never mutates the state; call it once at the start of a game.
 */
export function generateObstacles(
  state: GameState,
  count: number,
  rng: () => number = Math.random,
): Position[] {
  const taken = new Set<string>();
  for (const s of state.snakes) {
    for (const p of s.segments) taken.add(key(p));
    const head = s.segments[0];
    const d = DELTAS[s.direction];
    for (let i = 1; i <= SAFETY_MARGIN; i++) taken.add(key({ x: head.x + d.x * i, y: head.y + d.y * i }));
  }
  for (const t of state.tiles ?? []) taken.add(key(t));
  for (const o of state.obstacles ?? []) taken.add(key(o));

  const free: Position[] = [];
  for (let x = 0; x < GRID_COLUMNS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) if (!taken.has(x + ',' + y)) free.push({ x, y });
  }
  const n = Math.min(count, free.length);
  // Partial Fisher-Yates: distinct picks without shuffling the whole list.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (free.length - i));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free.slice(0, n);
}
