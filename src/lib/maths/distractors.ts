import { randomInt } from "./random";
import type { Question, Rng } from "./types";

/** Builds a question with two unique near-miss wrong answers and a random position for the right one. */
export function buildQuestion(text: string, answer: number, rng: Rng): Question {
  const spread = Math.max(3, Math.min(10, Math.round(answer * 0.1)));
  const pool: number[] = [];
  for (let k = 1; k <= spread; k++) {
    pool.push(answer + k);
    if (answer - k >= 0) pool.push(answer - k);
  }
  const wrong: number[] = [];
  for (let i = 0; i < 2; i++) {
    wrong.push(pool.splice(randomInt(rng, 0, pool.length - 1), 1)[0]);
  }
  const options = [...wrong];
  options.splice(randomInt(rng, 0, 2), 0, answer);
  return { text, answer, options };
}
