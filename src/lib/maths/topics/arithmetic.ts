import { buildQuestion } from "../distractors";
import { randomInt } from "../random";
import type { MathsDifficulty, QuestionGenerator } from "../types";

// Limits from the difficulty table in the spec (Story 7).
const ADD_SUB_MAX: Record<MathsDifficulty, number> = { easy: 20, medium: 100, hard: 1000 };
const FACTOR_MAX: Record<MathsDifficulty, number> = { easy: 5, medium: 12, hard: 20 };
const BASE_MAX: Record<MathsDifficulty, number> = { easy: 5, medium: 12, hard: 25 };

export const addition: QuestionGenerator = (d, rng) => {
  const a = randomInt(rng, 1, ADD_SUB_MAX[d]);
  const b = randomInt(rng, 1, ADD_SUB_MAX[d]);
  return buildQuestion(`${a} + ${b}`, a + b, rng);
};

export const subtraction: QuestionGenerator = (d, rng) => {
  const x = randomInt(rng, 1, ADD_SUB_MAX[d]);
  const y = randomInt(rng, 1, ADD_SUB_MAX[d]);
  // Larger first so the answer is never negative.
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  return buildQuestion(`${a} − ${b}`, a - b, rng);
};

export const multiplication: QuestionGenerator = (d, rng) => {
  const a = randomInt(rng, 1, FACTOR_MAX[d]);
  const b = randomInt(rng, 1, FACTOR_MAX[d]);
  return buildQuestion(`${a} × ${b}`, a * b, rng);
};

export const division: QuestionGenerator = (d, rng) => {
  // Build from divisor and quotient so the division is always exact.
  const divisor = randomInt(rng, 1, FACTOR_MAX[d]);
  const quotient = randomInt(rng, 1, FACTOR_MAX[d]);
  return buildQuestion(`${divisor * quotient} ÷ ${divisor}`, quotient, rng);
};

export const squares: QuestionGenerator = (d, rng) => {
  const base = randomInt(rng, 1, BASE_MAX[d]);
  return buildQuestion(`${base}²`, base * base, rng);
};

export const squareRoots: QuestionGenerator = (d, rng) => {
  const root = randomInt(rng, 1, BASE_MAX[d]);
  return buildQuestion(`√${root * root}`, root, rng);
};
