import { randInt } from "../random";
import type { MathsDifficulty, RawQuestion, Rng } from "../types";

type Limits = Record<MathsDifficulty, number>;

const ADD_SUB: Limits = { easy: 20, medium: 100, hard: 1000 };
const TIMES_DIV: Limits = { easy: 5, medium: 12, hard: 20 };
const SQUARE_BASE: Limits = { easy: 5, medium: 12, hard: 25 };

export function addition(d: MathsDifficulty, rng: Rng): RawQuestion {
  const a = randInt(rng, 1, ADD_SUB[d]);
  const b = randInt(rng, 1, ADD_SUB[d]);
  return { text: `What is ${a} + ${b}?`, answer: a + b };
}

// The larger number comes first so answers are never negative.
export function subtraction(d: MathsDifficulty, rng: Rng): RawQuestion {
  const x = randInt(rng, 1, ADD_SUB[d]);
  const y = randInt(rng, 1, ADD_SUB[d]);
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  return { text: `What is ${a} − ${b}?`, answer: a - b };
}

export function multiplication(d: MathsDifficulty, rng: Rng): RawQuestion {
  const a = randInt(rng, 1, TIMES_DIV[d]);
  const b = randInt(rng, 1, TIMES_DIV[d]);
  return { text: `What is ${a} × ${b}?`, answer: a * b };
}

// Built from divisor and quotient so the division is always exact.
export function division(d: MathsDifficulty, rng: Rng): RawQuestion {
  const divisor = randInt(rng, 1, TIMES_DIV[d]);
  const quotient = randInt(rng, 1, TIMES_DIV[d]);
  return { text: `What is ${divisor * quotient} ÷ ${divisor}?`, answer: quotient };
}

export function squares(d: MathsDifficulty, rng: Rng): RawQuestion {
  const base = randInt(rng, 1, SQUARE_BASE[d]);
  return { text: `What is ${base} squared?`, answer: base * base };
}

export function squareRoots(d: MathsDifficulty, rng: Rng): RawQuestion {
  const root = randInt(rng, 1, SQUARE_BASE[d]);
  return { text: `What is the square root of ${root * root}?`, answer: root };
}
