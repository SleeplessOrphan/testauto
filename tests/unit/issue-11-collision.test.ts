// Expected modules: src/lib/game/collision.ts, src/lib/game/movement.ts, src/lib/game/types.ts
// Assumed API (see .pipeline/questions.md):
//  collision: resolveCollisions(state, proposedHeads: Record<1|2, Position>, obstacles?: Position[]) => PlayerId[]
//    (sorted ascending list of players who collided; pure, does not mutate)
//  Snake gets optional `growing?: boolean` (true = tail does not move this cycle)
//  GameState gets optional `obstacles?: Position[]` and `collisions?: PlayerId[]`
//  step(state) => GameState whose `collisions` is the (sorted) list of players that collided this cycle;
//    a colliding snake does not move at all (segments and direction unchanged).
import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, GRID_ROWS } from '@/lib/game/constants';
import { resolveCollisions } from '@/lib/game/collision';
import { step } from '@/lib/game/movement';
import type {
  Direction,
  GameState as BaseState,
  PlayerId,
  Position,
  Snake as BaseSnake,
} from '@/lib/game/types';

// Fields this task adds to the types (optional, so the base types stay compatible).
type Snake = BaseSnake & { growing?: boolean };
type GameState = Omit<BaseState, 'snakes'> & {
  snakes: Snake[];
  obstacles?: Position[];
  collisions?: PlayerId[];
};

const mk = (
  player: PlayerId,
  cells: [number, number][],
  dir: Direction,
  extra: Partial<Snake> = {},
): Snake => ({
  player,
  segments: cells.map(([x, y]) => ({ x, y })),
  direction: dir,
  pendingDirection: dir,
  ...extra,
});
const st = (a: Snake, b: Snake, obstacles?: Position[]): GameState =>
  ({ snakes: [a, b], ...(obstacles ? { obstacles } : {}) }) as GameState;
const P = (x: number, y: number): Position => ({ x, y });

const far = () =>
  mk(2, [[30, 20], [31, 20], [32, 20]], 'left');
const farHeads = { 1: P(0, 0), 2: P(29, 20) };

describe('resolveCollisions', () => {
  it('reports nothing for free movement', () => {
    const s = st(mk(1, [[5, 5], [4, 5], [3, 5]], 'right'), far());
    expect(resolveCollisions(s, { 1: P(6, 5), 2: P(29, 20) })).toEqual([]);
  });

  it('detects walls on all four sides, and allows edge cells', () => {
    const s = st(mk(1, [[5, 5], [4, 5], [3, 5]], 'right'), far());
    for (const p of [P(-1, 5), P(GRID_COLUMNS, 5), P(5, -1), P(5, GRID_ROWS)]) {
      expect(resolveCollisions(s, { 1: p, 2: P(29, 20) })).toEqual([1]);
    }
    for (const p of [P(0, 5), P(GRID_COLUMNS - 1, 5), P(5, 0), P(5, GRID_ROWS - 1)]) {
      expect(resolveCollisions(s, { 1: p, 2: P(29, 20) })).toEqual([]);
    }
  });

  it('reports only player 2 when player 2 hits the wall', () => {
    const s = st(mk(1, [[5, 5], [4, 5], [3, 5]], 'right'), far());
    expect(resolveCollisions(s, { 1: P(6, 5), 2: P(-1, 20) })).toEqual([2]);
  });

  it('detects own body', () => {
    const a = mk(1, [[5, 5], [6, 5], [6, 6], [5, 6], [4, 6]], 'left');
    expect(resolveCollisions(st(a, far()), { ...farHeads, 1: P(5, 6) })).toEqual([1]);
  });

  it('detects obstacles (argument or state) and ignores other cells', () => {
    const a = mk(1, [[5, 5], [4, 5], [3, 5]], 'right');
    const heads = { 1: P(6, 5), 2: P(29, 20) };
    expect(resolveCollisions(st(a, far()), heads, [P(6, 5)])).toEqual([1]);
    expect(resolveCollisions(st(a, far()), heads, [P(7, 5), P(6, 6)])).toEqual([]);
  });

  it('only the responsible player collides when hitting the other snake body', () => {
    const a = mk(1, [[10, 5], [9, 5], [8, 5]], 'right');
    const b = mk(2, [[11, 4], [11, 5], [11, 6], [11, 7]], 'up');
    expect(resolveCollisions(st(a, b), { 1: P(11, 5), 2: P(11, 3) })).toEqual([1]);
    const b2 = mk(2, [[9, 4], [9, 3], [9, 2]], 'down');
    expect(resolveCollisions(st(a, b2), { 1: P(11, 5), 2: P(9, 5) })).toEqual([2]);
  });

  it("moving into a cell the other snake's head just left collides (its body fills it)", () => {
    const a = mk(1, [[10, 5], [9, 5], [8, 5]], 'right');
    const b = mk(2, [[11, 5], [12, 5], [13, 5]], 'up');
    expect(resolveCollisions(st(a, b), { 1: P(11, 5), 2: P(11, 4) })).toEqual([1]);
  });

  it('both heads into the same cell: both collide', () => {
    const a = mk(1, [[9, 5], [8, 5], [7, 5]], 'right');
    const b = mk(2, [[11, 5], [12, 5], [13, 5]], 'left');
    expect(resolveCollisions(st(a, b), { 1: P(10, 5), 2: P(10, 5) })).toEqual([1, 2]);
  });

  it('heads exchanging positions: both collide', () => {
    const a = mk(1, [[10, 5], [9, 5], [8, 5]], 'right');
    const b = mk(2, [[11, 5], [12, 5], [13, 5]], 'left');
    expect(resolveCollisions(st(a, b), { 1: P(11, 5), 2: P(10, 5) })).toEqual([1, 2]);
  });

  it('own tail cell vacated this cycle is not a collision', () => {
    const a = mk(1, [[5, 5], [6, 5], [6, 6], [5, 6]], 'left');
    expect(resolveCollisions(st(a, far()), { ...farHeads, 1: P(5, 6) })).toEqual([]);
  });

  it('own tail cell is a collision when the snake is growing', () => {
    const a = mk(1, [[5, 5], [6, 5], [6, 6], [5, 6]], 'left', { growing: true });
    expect(resolveCollisions(st(a, far()), { ...farHeads, 1: P(5, 6) })).toEqual([1]);
  });

  it("other snake's vacating tail is not a collision; a growing tail is", () => {
    const a = mk(1, [[10, 5], [9, 5], [8, 5]], 'right');
    const b = mk(2, [[12, 4], [12, 3], [11, 5]], 'up');
    expect(resolveCollisions(st(a, b), { 1: P(11, 5), 2: P(12, 3) })).toEqual([]);
    const bg = { ...b, growing: true };
    expect(resolveCollisions(st(a, bg), { 1: P(11, 5), 2: P(12, 3) })).toEqual([1]);
  });

  it('only the tail is vacated, not the second-to-last segment', () => {
    const a = mk(1, [[5, 5], [6, 5], [6, 6], [5, 6], [4, 6]], 'left');
    expect(resolveCollisions(st(a, far()), { ...farHeads, 1: P(4, 6) })).toEqual([]);
    expect(resolveCollisions(st(a, far()), { ...farHeads, 1: P(5, 6) })).toEqual([1]);
  });

  it('is pure', () => {
    const s = st(mk(1, [[5, 5], [4, 5], [3, 5]], 'right'), far());
    const copy = JSON.parse(JSON.stringify(s));
    resolveCollisions(s, { 1: P(-1, 5), 2: P(29, 20) });
    expect(s).toEqual(copy);
  });
});

const runStep = (s: GameState): GameState => step(s as BaseState) as GameState;

describe('step reports collisions', () => {
  const heads = (s: GameState) => s.snakes.map((x) => x.segments[0]);
  const seg = (s: GameState, p: PlayerId) => s.snakes.find((x) => x.player === p)!.segments;

  it('reports an empty collision list when nothing is hit', () => {
    const s = runStep(st(mk(1, [[5, 5], [4, 5], [3, 5]], 'right'), far()));
    expect(s.collisions).toEqual([]);
  });

  it('a snake that hits the wall does not move; the other still does', () => {
    const a = mk(1, [[GRID_COLUMNS - 1, 5], [GRID_COLUMNS - 2, 5], [GRID_COLUMNS - 3, 5]], 'right');
    const s1 = runStep(st(a, far()));
    expect(s1.collisions).toEqual([1]);
    expect(seg(s1, 1)).toEqual(a.segments);
    expect(seg(s1, 2)[0]).toEqual(P(29, 20));
  });

  it('head-on into the same cell reports both and neither moves', () => {
    const a = mk(1, [[9, 5], [8, 5], [7, 5]], 'right');
    const b = mk(2, [[11, 5], [12, 5], [13, 5]], 'left');
    const s1 = runStep(st(a, b));
    expect(s1.collisions).toEqual([1, 2]);
    expect(heads(s1)).toEqual([P(9, 5), P(11, 5)]);
  });

  it('swap reports both and neither moves', () => {
    const a = mk(1, [[10, 5], [9, 5], [8, 5]], 'right');
    const b = mk(2, [[11, 5], [12, 5], [13, 5]], 'left');
    const s1 = runStep(st(a, b));
    expect(s1.collisions).toEqual([1, 2]);
    expect(heads(s1)).toEqual([P(10, 5), P(11, 5)]);
  });

  it('uses pendingDirection and obstacles from state', () => {
    const a = mk(1, [[5, 5], [4, 5], [3, 5]], 'right', { pendingDirection: 'down' });
    const s1 = runStep(st(a, far(), [P(5, 6)]));
    expect(s1.collisions).toEqual([1]);
    expect(seg(s1, 1)).toEqual(a.segments);
  });

  it('moving into a vacating own tail is allowed and moves', () => {
    const a = mk(1, [[5, 5], [6, 5], [6, 6], [5, 6]], 'left', { pendingDirection: 'down' });
    const s1 = runStep(st(a, far()));
    expect(s1.collisions).toEqual([]);
    expect(seg(s1, 1)[0]).toEqual(P(5, 6));
  });

  it('collisions do not persist into the next step', () => {
    const a = mk(1, [[GRID_COLUMNS - 1, 5], [GRID_COLUMNS - 2, 5], [GRID_COLUMNS - 3, 5]], 'right');
    const s1 = runStep(st(a, far()));
    expect(s1.collisions).toEqual([1]);
    const s2 = runStep({
      ...s1,
      snakes: s1.snakes.map((x) => (x.player === 1 ? { ...x, pendingDirection: 'up' as const } : x)),
    });
    expect(s2.collisions).toEqual([]);
  });

  it('does not mutate its input', () => {
    const s0 = st(
      mk(1, [[GRID_COLUMNS - 1, 5], [GRID_COLUMNS - 2, 5], [GRID_COLUMNS - 3, 5]], 'right'),
      far(),
    );
    const copy = JSON.parse(JSON.stringify(s0));
    runStep(s0);
    expect(s0).toEqual(copy);
  });
});
