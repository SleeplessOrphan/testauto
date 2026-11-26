import { randomInt } from "./random";
import type { Rng } from "./types";

/**
 * Two distinct, non-negative wrong answers near the correct one. Never equal
 * to the answer or to each other.
 */
export function makeDistractors(answer: number, rng: Rng): number[] {
  const spread = Math.max(3, Math.round(Math.abs(answer) * 0.2));
  const out: number[] = [];
  const ok = (v: number) => v >= 0 && v !== answer && !out.includes(v);

  for (let i = 0; i < 50 && out.length < 2; i++) {
    const offset = randomInt(rng, 1, spread) * (rng() < 0.5 ? -1 : 1);
    if (ok(answer + offset)) out.push(answer + offset);
  }
  // Deterministic fallback so we always terminate with two values.
  for (let k = 1; out.length < 2; k++) {
    if (ok(answer + k)) out.push(answer + k);
  }
  return out;
}

/** Builds the three options with the answer at a random position. */
export function buildOptions(answer: number, rng: Rng): number[] {
  const options = makeDistractors(answer, rng);
  options.splice(randomInt(rng, 0, 2), 0, answer);
  return options;
}
