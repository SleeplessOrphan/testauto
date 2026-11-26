import type { Rng } from "./types";

/** Whole number between min and max inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  const n = min + Math.floor(rng() * (max - min + 1));
  return Math.min(max, Math.max(min, n));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randomInt(rng, 0, items.length - 1)];
}
