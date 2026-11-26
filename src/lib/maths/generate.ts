import { pick } from "./random";
import { generateArithmetic } from "./topics/arithmetic";
import type { MathsDifficulty, MathsTopic, Question, Rng } from "./types";

export function generateQuestion(
  topics: readonly MathsTopic[],
  difficulty: MathsDifficulty,
  rng: Rng = Math.random,
): Question {
  if (topics.length === 0) throw new Error("At least one topic is required");
  return generateArithmetic(pick(rng, topics), difficulty, rng);
}
