import { shuffle } from "./random";
import type { Rng } from "./types";

/** Two distinct, plausible wrong answers close to `correct`, never equal to it. */
export function makeDistractors(correct: number, rng: Rng): [number, number] {
  const spread = Math.max(3, Math.ceil(Math.abs(correct) * 0.2));
  const pool: number[] = [];
  for (let k = 1; k <= spread; k++) {
    // Avoid negative options unless the correct answer itself is negative.
    if (correct - k >= 0 || correct < 0) pool.push(correct - k);
    pool.push(correct + k);
  }
  const [a, b] = shuffle(rng, pool);
  return [a!, b!];
}
