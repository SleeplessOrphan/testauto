import type { Rng } from "./types";

/** Integer in [min, max], inclusive. Clamped so an rng returning 1 cannot overshoot. */
export function randomInt(rng: Rng, min: number, max: number): number {
  const n = Math.floor(rng() * (max - min + 1)) + min;
  return Math.min(n, max);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randomInt(rng, 0, items.length - 1)];
}
