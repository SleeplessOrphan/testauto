// Expected modules: src/lib/game/{constants,state,movement,input,types}.ts
// Assumed API (see .pipeline/questions.md):
//  constants: GRID_COLUMNS=40, GRID_ROWS=25
//  state: createInitialState(): GameState { snakes: Snake[] }
//  Snake: { player: 1|2, segments: Position[] (head first), direction, pendingDirection }
//  Direction: 'up'|'down'|'left'|'right'; Position: { x: column, y: row }, y grows downward
//  movement: queueDirection(state, player, direction) => GameState (pure), step(state) => GameState (pure)
//  input: directionForKey(key: string) => { player: 1|2; direction: Direction } | null
import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, GRID_ROWS } from '@/lib/game/constants';
import { createInitialState } from '@/lib/game/state';
import { queueDirection, step } from '@/lib/game/movement';
import { directionForKey } from '@/lib/game/input';
import type { Direction, GameState, Snake } from '@/lib/game/types';

const snake = (s: GameState, p: 1 | 2): Snake => s.snakes.find((x) => x.player === p)!;
const head = (s: GameState, p: 1 | 2) => snake(s, p).segments[0];

describe('constants', () => {
  it('uses a 40 x 25 grid', () => {
    expect(GRID_COLUMNS).toBe(40);
    expect(GRID_ROWS).toBe(25);
  });
});

describe('createInitialState', () => {
  const s = createInitialState();
  it('has two snakes with ids 1 and 2', () => {
    expect(s.snakes).toHaveLength(2);
    expect(s.snakes.map((x) => x.player).sort()).toEqual([1, 2]);
  });
  it('gives each snake three contiguous segments inside the grid', () => {
    for (const sn of s.snakes) {
      expect(sn.segments).toHaveLength(3);
      for (const p of sn.segments) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(GRID_COLUMNS);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(GRID_ROWS);
      }
      for (let i = 1; i < 3; i++) {
        const d =
          Math.abs(sn.segments[i].x - sn.segments[i - 1].x) +
          Math.abs(sn.segments[i].y - sn.segments[i - 1].y);
        expect(d).toBe(1);
      }
    }
  });
  it('starts at separate, non-overlapping positions', () => {
    const keys = s.snakes.flatMap((x) => x.segments.map((p) => p.x + ',' + p.y));
    expect(new Set(keys).size).toBe(6);
  });
  it('P1 starts left moving right, P2 right moving left', () => {
    expect(snake(s, 1).direction).toBe('right');
    expect(snake(s, 2).direction).toBe('left');
    expect(head(s, 1).x).toBeLessThan(GRID_COLUMNS / 2);
    expect(head(s, 2).x).toBeGreaterThanOrEqual(GRID_COLUMNS / 2);
  });
  it('trails the tail behind the head', () => {
    const a = snake(s, 1).segments;
    expect(a[0].x).toBeGreaterThan(a[2].x);
    const b = snake(s, 2).segments;
    expect(b[0].x).toBeLessThan(b[2].x);
  });
  it('returns independent objects each call', () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('step', () => {
  it('moves both snakes one cell in their current direction, keeping length 3', () => {
    const s0 = createInitialState();
    const s1 = step(s0);
    expect(head(s1, 1)).toEqual({ x: head(s0, 1).x + 1, y: head(s0, 1).y });
    expect(head(s1, 2)).toEqual({ x: head(s0, 2).x - 1, y: head(s0, 2).y });
    expect(snake(s1, 1).segments).toHaveLength(3);
    expect(snake(s1, 2).segments).toHaveLength(3);
    expect(snake(s1, 1).segments[1]).toEqual(head(s0, 1));
    expect(snake(s1, 1).segments[2]).toEqual(snake(s0, 1).segments[1]);
  });
  it('does not mutate its input', () => {
    const s0 = createInitialState();
    const copy = structuredClone(s0);
    queueDirection(s0, 1, 'up');
    step(s0);
    expect(s0).toEqual(copy);
  });
  it('keeps moving in the same direction with no input', () => {
    let s = createInitialState();
    const h = head(s, 1);
    for (let i = 0; i < 5; i++) s = step(s);
    expect(head(s, 1)).toEqual({ x: h.x + 5, y: h.y });
    expect(snake(s, 1).direction).toBe('right');
    expect(snake(s, 2).direction).toBe('left');
  });
  it.each([
    ['up', 0, -1],
    ['down', 0, 1],
    ['right', 1, 0],
  ] as [Direction, number, number][])('P1 turning %s moves accordingly', (dir, dx, dy) => {
    const s0 = createInitialState();
    const s1 = step(queueDirection(s0, 1, dir));
    expect(head(s1, 1)).toEqual({ x: head(s0, 1).x + dx, y: head(s0, 1).y + dy });
    expect(snake(s1, 1).direction).toBe(dir);
  });
  it.each([
    ['up', 0, -1],
    ['down', 0, 1],
    ['left', -1, 0],
  ] as [Direction, number, number][])('P2 turning %s moves accordingly', (dir, dx, dy) => {
    const s0 = createInitialState();
    const s1 = step(queueDirection(s0, 2, dir));
    expect(head(s1, 2)).toEqual({ x: head(s0, 2).x + dx, y: head(s0, 2).y + dy });
    expect(snake(s1, 2).direction).toBe(dir);
  });
  it('both snakes respond independently in the same cycle', () => {
    const s0 = createInitialState();
    let s = queueDirection(s0, 1, 'down');
    s = queueDirection(s, 2, 'up');
    s = step(s);
    expect(head(s, 1)).toEqual({ x: head(s0, 1).x, y: head(s0, 1).y + 1 });
    expect(head(s, 2)).toEqual({ x: head(s0, 2).x, y: head(s0, 2).y - 1 });
  });
  it("one player's input does not affect the other snake", () => {
    const s0 = createInitialState();
    const s = step(queueDirection(s0, 1, 'down'));
    expect(head(s, 2)).toEqual({ x: head(s0, 2).x - 1, y: head(s0, 2).y });
  });
  it('applies a turn once, then continues straight', () => {
    const s0 = createInitialState();
    let s = step(queueDirection(s0, 1, 'down'));
    s = step(s);
    expect(head(s, 1)).toEqual({ x: head(s0, 1).x, y: head(s0, 1).y + 2 });
  });
});

describe('queueDirection reversal handling', () => {
  it('ignores an immediate reversal', () => {
    const s0 = createInitialState();
    const s = step(queueDirection(s0, 1, 'left'));
    expect(head(s, 1)).toEqual({ x: head(s0, 1).x + 1, y: head(s0, 1).y });
    expect(snake(s, 1).direction).toBe('right');
    const t = step(queueDirection(s0, 2, 'right'));
    expect(head(t, 2)).toEqual({ x: head(s0, 2).x - 1, y: head(s0, 2).y });
  });
  it('same-direction input is harmless', () => {
    const s0 = createInitialState();
    const s = step(queueDirection(s0, 1, 'right'));
    expect(head(s, 1).x).toBe(head(s0, 1).x + 1);
  });
  it('up then left within one cycle cannot reverse the snake', () => {
    const s0 = createInitialState();
    let s = queueDirection(s0, 1, 'up');
    s = queueDirection(s, 1, 'left');
    s = step(s);
    expect(head(s, 1)).toEqual({ x: head(s0, 1).x, y: head(s0, 1).y - 1 });
    expect(snake(s, 1).direction).toBe('up');
  });
  it('judges a reversal against the direction travelled in the previous cycle', () => {
    const s0 = createInitialState();
    let s = step(queueDirection(s0, 1, 'up'));
    s = step(queueDirection(s, 1, 'down'));
    expect(snake(s, 1).direction).toBe('up');
    expect(head(s, 1).y).toBe(head(s0, 1).y - 2);
    s = step(queueDirection(s, 1, 'left'));
    expect(snake(s, 1).direction).toBe('left');
  });
  it('the last valid input in a cycle wins', () => {
    const s0 = createInitialState();
    let s = queueDirection(s0, 1, 'up');
    s = queueDirection(s, 1, 'down');
    s = step(s);
    expect(snake(s, 1).direction).toBe('down');
  });
});

describe('directionForKey', () => {
  it.each([
    ['w', 1, 'up'],
    ['a', 1, 'left'],
    ['s', 1, 'down'],
    ['d', 1, 'right'],
    ['W', 1, 'up'],
    ['A', 1, 'left'],
    ['S', 1, 'down'],
    ['D', 1, 'right'],
    ['ArrowUp', 2, 'up'],
    ['ArrowLeft', 2, 'left'],
    ['ArrowDown', 2, 'down'],
    ['ArrowRight', 2, 'right'],
  ])('maps %s to player %i %s', (key, player, direction) => {
    expect(directionForKey(key)).toEqual({ player, direction });
  });
  it.each(['q', 'Enter', ' ', '', 'Escape', 'ww', 'Up', 'arrowup', 'Shift'])(
    'returns null for %j',
    (key) => {
      expect(directionForKey(key)).toBeNull();
    },
  );
});
