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
}
