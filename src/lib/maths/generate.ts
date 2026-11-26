import { pick } from "./random";
import * as arithmetic from "./topics/arithmetic";
import type { MathsDifficulty, MathsTopic, Question, QuestionGenerator, Rng } from "./types";

const GENERATORS: Record<MathsTopic, QuestionGenerator> = {
  addition: arithmetic.addition,
  subtraction: arithmetic.subtraction,
  multiplication: arithmetic.multiplication,
  division: arithmetic.division,
  squares: arithmetic.squares,
  "square-roots": arithmetic.squareRoots,
};

export function generateQuestion(
  topics: readonly MathsTopic[],
  difficulty: MathsDifficulty,
  rng: Rng = Math.random,
): Question {
  if (topics.length === 0) throw new Error("At least one topic is required");
  return GENERATORS[pick(rng, topics)](difficulty, rng);
}
