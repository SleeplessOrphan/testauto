import { pick, randInt } from "../random";
import type { MathsDifficulty, QuestionStem, Rng } from "../types";

const MAX_BASE: Record<MathsDifficulty, number> = { easy: 100, medium: 500, hard: 1000 };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function pickPercentage(difficulty: MathsDifficulty, rng: Rng): number {
  if (difficulty === "easy") return pick(rng, [10, 50]);
  if (difficulty === "medium") return randInt(rng, 1, 20) * 5;
  return randInt(rng, 1, 100);
}

export function percentageQuestion(difficulty: MathsDifficulty, rng: Rng): QuestionStem {
  const pct = pickPercentage(difficulty, rng);
  // Base must be a multiple of 100/gcd(pct, 100) for the answer to be whole.
  const step = 100 / gcd(pct, 100);
  const base = step * randInt(rng, 1, Math.max(1, Math.floor(MAX_BASE[difficulty] / step)));
  return { text: `What is ${pct}% of ${base}?`, answer: (pct * base) / 100 };
}
