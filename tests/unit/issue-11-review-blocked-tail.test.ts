import { describe, expect, it } from 'vitest';
import { step } from '@/lib/game/movement';
import type { GameState, Snake } from '@/lib/game/types';

const mk = (player: 1 | 2, cells: [number, number][], dir: Snake['direction']): Snake => ({
  player,
  segments: cells.map(([x, y]) => ({ x, y })),
  direction: dir,
  pendingDirection: dir,
});

describe('review: a blocked snake does not vacate its tail', () => {
  it('a snake moving into the tail of a snake that is blocked this cycle collides', () => {
    // P1 runs into the wall and stays, so its tail (38,5) is NOT vacated.
    const a = mk(1, [[39, 5], [39, 6], [38, 6], [38, 5]], 'right');
    // P2 moves down from (38,4) into (38,5), P1's un-vacated tail.
    const b = mk(2, [[38, 4], [38, 3], [38, 2]], 'down');
    const s = step({ snakes: [a, b] } as GameState);
    expect(s.collisions).toContain(2);
    const cells = s.snakes.flatMap((x) => x.segments.map((c) => `${c.x},${c.y}`));
    expect(new Set(cells).size).toBe(cells.length);
  });
});
