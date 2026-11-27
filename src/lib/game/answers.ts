import { GRID_COLUMNS, GRID_ROWS } from './constants';
import type { AnswerTile, GameState, PlayerId, Position } from './types';

export type PlacementResult = { ok: true; tiles: AnswerTile[] } | { ok: false };

const key = (x: number, y: number) => x + ',' + y;

/**
 * Places a player's three answer tiles on free cells that the player's snake head can reach
 * (flood fill over cells not blocked by snakes, obstacles or tiles). Never mutates the state.
 */
export function placeAnswerTiles(
  state: GameState,
  player: PlayerId,
  values: readonly number[],
  rng: () => number = Math.random,
): PlacementResult {
  const blocked = new Set<string>();
  for (const s of state.snakes) for (const p of s.segments) blocked.add(key(p.x, p.y));
  for (const p of state.obstacles ?? []) blocked.add(key(p.x, p.y));
  for (const t of state.tiles ?? []) blocked.add(key(t.x, t.y));

  const snake = state.snakes.find((s) => s.player === player);
  if (!snake) return { ok: false };
  const head = snake.segments[0];

  const seen = new Set<string>([key(head.x, head.y)]);
  const queue: Position[] = [head];
  const reachable: Position[] = [];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= GRID_COLUMNS || ny >= GRID_ROWS || blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
      reachable.push({ x: nx, y: ny });
    }
  }
  if (reachable.length < values.length) return { ok: false };

  // Partial Fisher-Yates: pick distinct cells without shuffling the whole list.
  const tiles: AnswerTile[] = values.map((value, i) => {
    const j = i + Math.floor(rng() * (reachable.length - i));
    [reachable[i], reachable[j]] = [reachable[j], reachable[i]];
    return { player, x: reachable[i].x, y: reachable[i].y, value };
  });
  return { ok: true, tiles };
}
