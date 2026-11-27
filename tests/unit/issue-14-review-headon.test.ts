import { describe, expect, it } from 'vitest';
import { advance } from '@/lib/game/loop';
import type { GameState } from '@/lib/game/types';

describe('head-on collision into the same empty cell', () => {
  it('stops both snakes instead of overlapping', () => {
    const state: GameState = {
      snakes: [
        { player: 1, segments: [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }], direction: 'right', pendingDirection: 'right' },
        { player: 2, segments: [{ x: 12, y: 5 }, { x: 13, y: 5 }, { x: 14, y: 5 }], direction: 'left', pendingDirection: 'left' },
      ],
    };
    const next = advance(state);
    const h1 = next.snakes[0].segments[0];
    const h2 = next.snakes[1].segments[0];
    expect(h1.x === h2.x && h1.y === h2.y).toBe(false);
  });
});
