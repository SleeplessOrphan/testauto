import { resolveCollisions } from './collision';
import { CORRECT_POINTS, EMPTY_STATS, nextSnakeLength, nextStats } from './scoring';
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

  // A moving snake whose head lands on one of its own tiles collects it.
  const collected = new Map<PlayerId, boolean>();
  for (const s of state.snakes) {
    const q = state.questions?.[s.player];
    if (!q || collisions.includes(s.player)) continue;
    const h = heads[s.player];
    const tile = (state.tiles ?? []).find((t) => t.player === s.player && t.x === h.x && t.y === h.y);
    if (tile) collected.set(s.player, tile.value === q.answer);
  }

  let scoring: Partial<GameState> = {};
  if (collected.size > 0) {
    const stats = { 1: EMPTY_STATS, 2: EMPTY_STATS, ...state.stats };
    const results = { ...state.results };
    for (const [p, ok] of collected) {
      const before = stats[p];
      stats[p] = nextStats(before, ok);
      const bonus = ok ? stats[p].score - before.score - CORRECT_POINTS : 0;
      results[p] = { seq: (state.results?.[p]?.seq ?? 0) + 1, correct: ok, answer: state.questions![p]!.answer, bonus };
    }
    scoring = {
      stats,
      results,
      refresh: [...(state.refresh ?? []), ...collected.keys()],
      tiles: (state.tiles ?? []).filter((t) => !collected.has(t.player)),
    };
  }

  return {
    ...state,
    ...scoring,
    collisions,
    snakes: state.snakes.map((s) => {
      if (collisions.includes(s.player)) return s;
      const ok = collected.get(s.player);
      if (ok === undefined) {
        return {
          ...s,
          direction: s.pendingDirection,
          segments: [heads[s.player], ...(s.growing ? s.segments : s.segments.slice(0, -1))],
        };
      }
      // Growth keeps the tail; shrinking trims the end, never below the minimum length.
      return {
        ...s,
        direction: s.pendingDirection,
        segments: [heads[s.player], ...s.segments].slice(0, nextSnakeLength(s.segments.length, ok)),
      };
    }),
  };
}
