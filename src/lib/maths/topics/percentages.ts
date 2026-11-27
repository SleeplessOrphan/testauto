import { buildQuestion } from "../distractors";
import { pick, randomInt, type Difficulty, type Question, type Rng } from "../types";

const MEDIUM_PERCENTAGES = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);
const HARD_PERCENTAGES = Array.from({ length: 100 }, (_, i) => i + 1);
const MAX_BASE: Record<Difficulty, number> = { easy: 100, medium: 500, hard: 1000 };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function percentageQuestion(difficulty: Difficulty, rng: Rng): Question {
  const pct =
    difficulty === "easy"
      ? pick(rng, [10, 50])
      : pick(rng, difficulty === "medium" ? MEDIUM_PERCENTAGES : HARD_PERCENTAGES);
  // Bases must be multiples of this step so pct% of base is a whole number.
  const step = 100 / gcd(pct, 100);
  const base = step * randomInt(rng, 1, Math.floor(MAX_BASE[difficulty] / step));
  return buildQuestion(`What is ${pct}% of ${base}?`, (pct * base) / 100, rng);
}
