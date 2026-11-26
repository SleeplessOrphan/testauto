import { makeDistractors } from "../distractors";
import { randomInt, type Difficulty, type Question, type Rng } from "../types";

const MAX_BASE: Record<Difficulty, number> = { easy: 100, medium: 500, hard: 1000 };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function pickPercentage(difficulty: Difficulty, rng: Rng): number {
  if (difficulty === "easy") return rng() < 0.5 ? 10 : 50;
  if (difficulty === "medium") return 5 * randomInt(rng, 1, 20);
  return randomInt(rng, 1, 100);
}

export function generatePercentage(difficulty: Difficulty, rng: Rng): Question {
  const pct = pickPercentage(difficulty, rng);
  // Smallest base for which pct% is whole; the base is a multiple of it, so the answer is always whole.
  const step = 100 / gcd(pct, 100);
  const base = step * randomInt(rng, 1, Math.floor(MAX_BASE[difficulty] / step));
  const correctAnswer = (pct * base) / 100;
  return {
    text: `What is ${pct}% of ${base}?`,
    correctAnswer,
    incorrectAnswers: makeDistractors(correctAnswer, rng),
  };
}
