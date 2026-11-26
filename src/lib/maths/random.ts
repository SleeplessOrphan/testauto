import type { Rng } from "./types";

/** Integer in [min, max]. Clamped so an rng returning 1 can never overshoot. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.min(max, min + Math.floor(rng() * (max - min + 1)));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}
