import { randomInt, type Question, type Rng } from "./types";

/** Builds a Question with the answer plus two distinct, non-negative wrong options, shuffled. */
export function buildQuestion(text: string, answer: number, rng: Rng): Question {
  const spread = Math.max(3, Math.round(Math.abs(answer) * 0.2));
  const options = new Set<number>([answer]);
  while (options.size < 3) {
    const delta = randomInt(rng, 1, spread);
    const candidate = rng() < 0.5 ? answer - delta : answer + delta;
    if (candidate >= 0) options.add(candidate);
  }
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return { text, answer, options: shuffled };
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
