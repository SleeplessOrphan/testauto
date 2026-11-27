import { resolveCollisions } from './collision';
import type { Direction, GameState, PlayerId, Position } from './types';

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Reversals are checked against the direction actually travelled, so two quick keys can't reverse a snake. */
export function queueDirection(state: GameState, player: PlayerId, direction: Direction): GameState {
  return {
    ...state,
    snakes: state.snakes.map((s) =>
      s.player === player && direction !== OPPOSITE[s.direction]
        ? { ...s, pendingDirection: direction }
        : s,
    ),
  };
}

export function step(state: GameState): GameState {
  const heads = {} as Record<PlayerId, Position>;
  for (const s of state.snakes) {
    const d = DELTAS[s.pendingDirection];
    heads[s.player] = { x: s.segments[0].x + d.x, y: s.segments[0].y + d.y };
  }
  const collisions = resolveCollisions(state, heads);

  return {
    ...state,
    collisions,
    snakes: state.snakes.map((s) =>
      collisions.includes(s.player)
        ? s
        : {
            ...s,
            direction: s.pendingDirection,
            segments: [heads[s.player], ...(s.growing ? s.segments : s.segments.slice(0, -1))],
          },
    ),
  };
}
