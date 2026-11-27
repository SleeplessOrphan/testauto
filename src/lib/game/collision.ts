import { GRID_COLUMNS, GRID_ROWS } from './constants';
import type { GameState, PlayerId, Position } from './types';

const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;
const hits = (cells: Position[], p: Position) => cells.some((c) => same(c, p));

/**
 * Decides which players collide this cycle, judging both proposed heads against the
 * board as it stands before anything moves. Returns player ids in ascending order.
 */
export function resolveCollisions(
  state: GameState,
  proposedHeads: Record<PlayerId, Position>,
  obstacles: Position[] = state.obstacles ?? [],
): PlayerId[] {
  const collided = new Set<PlayerId>();
  // A colliding snake doesn't move, so its tail is not vacated and others can hit it. That can
  // cause further collisions, so judge again until no new player collides.
  let size = -1;
  while (collided.size !== size) {
    size = collided.size;
    judge(state, proposedHeads, obstacles, collided);
  }
  return [...collided].sort((x, y) => x - y);
}

function judge(
  state: GameState,
  proposedHeads: Record<PlayerId, Position>,
  obstacles: Position[],
  collided: Set<PlayerId>,
): void {
  for (const snake of state.snakes) {
    const head = proposedHeads[snake.player];
    if (head.x < 0 || head.x >= GRID_COLUMNS || head.y < 0 || head.y >= GRID_ROWS) {
      collided.add(snake.player);
      continue;
    }
    if (hits(obstacles, head)) {
      collided.add(snake.player);
      continue;
    }
    for (const other of state.snakes) {
      // The tail cell is free in the same cycle unless the snake grows; the old head cell
      // stays occupied because the body moves into it.
      let occupied = other.growing || collided.has(other.player) ? other.segments : other.segments.slice(0, -1);
      // A head proposed onto the snake's own neck is a reversal, which the engine never
      // performs (queueDirection rejects it), so it is not judged as a self-collision.
      if (other === snake) occupied = occupied.filter((c, i) => i !== 1);
      if (hits(occupied, head)) {
        collided.add(snake.player);
        break;
      }
    }
  }

  // Heads meeting in one cell, or swapping cells (a swap is also caught above as a body
  // hit, but is checked explicitly so it doesn't depend on that).
  const [a, b] = state.snakes;
  if (a && b) {
    const ha = proposedHeads[a.player];
    const hb = proposedHeads[b.player];
    if (same(ha, hb) || (same(ha, b.segments[0]) && same(hb, a.segments[0]))) {
      collided.add(a.player);
      collided.add(b.player);
    }
  }
}
