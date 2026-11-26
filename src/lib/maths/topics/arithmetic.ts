import { buildOptions } from "../distractors";
import { randomInt } from "../random";
import type { MathsDifficulty, MathsTopic, Question, Rng } from "../types";

export type ArithmeticTopic = Extract<
  MathsTopic,
  "addition" | "subtraction" | "multiplication" | "division" | "squares" | "square-roots"
>;

// Limits from the spec's difficulty table. For square roots the limit is the
// largest root (the table gives the largest perfect square: 25, 144, 625).
const LIMITS: Record<ArithmeticTopic, Record<MathsDifficulty, number>> = {
  addition: { easy: 20, medium: 100, hard: 1000 },
  subtraction: { easy: 20, medium: 100, hard: 1000 },
  multiplication: { easy: 5, medium: 12, hard: 20 },
  division: { easy: 5, medium: 12, hard: 20 },
  squares: { easy: 5, medium: 12, hard: 25 },
  "square-roots": { easy: 5, medium: 12, hard: 25 },
};

function make(text: string, answer: number, rng: Rng): Question {
  return { text, answer, options: buildOptions(answer, rng) };
}

const generators: Record<ArithmeticTopic, (max: number, rng: Rng) => Question> = {
  addition: (max, rng) => {
    const a = randomInt(rng, 1, max);
    const b = randomInt(rng, 1, max);
    return make(`${a} + ${b} = ?`, a + b, rng);
  },
  subtraction: (max, rng) => {
    // Larger operand first so the answer is never negative.
    const a = randomInt(rng, 1, max);
    const b = randomInt(rng, 1, max);
    const [hi, lo] = a >= b ? [a, b] : [b, a];
    return make(`${hi} - ${lo} = ?`, hi - lo, rng);
  },
  multiplication: (max, rng) => {
    const a = randomInt(rng, 1, max);
    const b = randomInt(rng, 1, max);
    return make(`${a} × ${b} = ?`, a * b, rng);
  },
  division: (max, rng) => {
    // Build from divisor and quotient so the result is always whole.
    const divisor = randomInt(rng, 1, max);
    const quotient = randomInt(rng, 1, max);
    return make(`${divisor * quotient} ÷ ${divisor} = ?`, quotient, rng);
  },
  squares: (max, rng) => {
    const base = randomInt(rng, 1, max);
    return make(`What is ${base} squared?`, base * base, rng);
  },
  "square-roots": (max, rng) => {
    const root = randomInt(rng, 1, max);
    return make(`What is the square root of ${root * root}?`, root, rng);
  },
};

export function generateArithmetic(
  topic: ArithmeticTopic,
  difficulty: MathsDifficulty,
  rng: Rng,
): Question {
  return generators[topic](LIMITS[topic][difficulty], rng);
}
