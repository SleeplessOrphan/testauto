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
  return {
    ...state,
    snakes: state.snakes.map((s) => {
      const d = DELTAS[s.pendingDirection];
      const head = { x: s.segments[0].x + d.x, y: s.segments[0].y + d.y };
      return {
        ...s,
        direction: s.pendingDirection,
        segments: [head, ...s.segments.slice(0, -1)],
      };
    }),
  };
}
