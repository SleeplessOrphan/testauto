import { GRID_COLUMNS, GRID_ROWS } from './constants';
import { EMPTY_STATS, MIN_SNAKE_LENGTH } from './scoring';
import type { Direction, GameState, PlayerId, Position, Snake } from './types';

export const STARTING_LIVES = 3;

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const DIRECTIONS = Object.keys(DELTAS) as Direction[];
/** Free cells the respawned head must have in front of it, so it does not crash straight away. */
const CLEAR_AHEAD = 2;

type Placement = { segments: Position[]; direction: Direction; runway: number };

const inGrid =(p: Position) => p.x >= 0 && p.y >= 0 && p.x < GRID_COLUMNS && p.y < GRID_ROWS;
const key = (p: Position) => p.x + ',' + p.y;

/** All three-segment placements that fit; `margin` keeps them off cells next to anything in the way. */
function placements(blockers: Position[], margin: boolean): Placement[] {
  const used = new Set(blockers.map(key));
  const near = (p: Position) =>
    used.has(key(p)) ||
    (margin && DIRECTIONS.some((d) => used.has(key({ x: p.x + DELTAS[d].x, y: p.y + DELTAS[d].y }))));
  const found: Placement[] = [];
  for (let x = 0; x < GRID_COLUMNS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (const direction of DIRECTIONS) {
        const d = DELTAS[direction];
        const segments = Array.from({ length: MIN_SNAKE_LENGTH }, (_, i) => ({ x: x - d.x * i, y: y - d.y * i }));
        const ahead = Array.from({ length: CLEAR_AHEAD }, (_, i) => ({ x: x + d.x * (i + 1), y: y + d.y * (i + 1) }));
        if (segments.every((p) => inGrid(p) && !near(p)) && ahead.every((p) => inGrid(p) && !used.has(key(p)))) {
          let runway = CLEAR_AHEAD;
          const cell = (n: number) => ({ x: x + d.x * n, y: y + d.y * n });
          while (inGrid(cell(runway + 1)) && !used.has(key(cell(runway + 1)))) runway++;
          found.push({ segments, direction, runway });
        }
      }
    }
  }
  return found;
}

/**
 * Charges a player one life for a collision. With lives left the snake respawns at a safe spot with
 * three segments (score, question and tiles are kept); on the last life the player is eliminated and
 * their snake and tiles are removed. Never mutates the state.
 */
export function loseLife(state: GameState, player: PlayerId, rng: () => number = Math.random): GameState {
  const old = state.snakes.find((s) => s.player === player);
  if (!old || state.eliminated?.includes(player)) return state;

  const before = { 1: EMPTY_STATS, 2: EMPTY_STATS, ...state.stats }[player];
  const lives = before.lives - 1;
  const stats = {
    1: EMPTY_STATS,
    2: EMPTY_STATS,
    ...state.stats,
    [player]: { ...before, lives, collisions: before.collisions + 1 },
  };

  const others = state.snakes.filter((s) => s.player !== player);
  const eliminate = (): GameState => ({
    ...state,
    stats,
    snakes: others,
    tiles: state.tiles?.filter((t) => t.player !== player),
    eliminated: [...(state.eliminated ?? []), player],
  });
  if (lives <= 0) return eliminate();

  const blockers = [
    ...others.flatMap((s) => s.segments),
    ...(state.obstacles ?? []),
    ...(state.tiles ?? []),
  ];
  // If the board is too crowded for a comfortable spot, accept touching cells before giving up.
  let options = placements(blockers, true);
  if (options.length === 0) options = placements(blockers, false);
  if (options.length === 0) return eliminate();

  // Any spot with a clear run ahead will do; always taking the longest run made a lone snake outlive slow games.
  const pick = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
  const respawned: Snake = {
    player,
    segments: pick.segments,
    direction: pick.direction,
    pendingDirection: pick.direction,
  };
  return { ...state, stats, snakes: state.snakes.map((s) => (s === old ? respawned : s)) };
}
