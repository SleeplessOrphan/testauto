import type { Direction, PlayerId } from './types';

const KEYS: Record<string, { player: PlayerId; direction: Direction }> = {
  w: { player: 1, direction: 'up' },
  a: { player: 1, direction: 'left' },
  s: { player: 1, direction: 'down' },
  d: { player: 1, direction: 'right' },
  ArrowUp: { player: 2, direction: 'up' },
  ArrowLeft: { player: 2, direction: 'left' },
  ArrowDown: { player: 2, direction: 'down' },
  ArrowRight: { player: 2, direction: 'right' },
};

export function directionForKey(key: string): { player: PlayerId; direction: Direction } | null {
  const hit = Object.hasOwn(KEYS, key.length === 1 ? key.toLowerCase() : key)
    ? KEYS[key.length === 1 ? key.toLowerCase() : key]
    : undefined;
  return hit ? { ...hit } : null;
}
