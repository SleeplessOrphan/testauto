import { makeDistractors } from "./distractors";
import { pick, shuffle } from "./random";
import {
  addition,
  division,
  multiplication,
  squareRoots,
  squares,
  subtraction,
} from "./topics/arithmetic";
import type { MathsDifficulty, MathsTopic, Question, RawQuestion, Rng } from "./types";

const GENERATORS: Record<MathsTopic, (d: MathsDifficulty, rng: Rng) => RawQuestion> = {
  addition,
  subtraction,
  multiplication,
  division,
  squares,
  "square-roots": squareRoots,
};

export function generateQuestion(
  topics: readonly MathsTopic[],
  difficulty: MathsDifficulty,
  rng: Rng = Math.random,
): Question {
  if (topics.length === 0) throw new Error("At least one topic is required");
  const { text, answer } = GENERATORS[pick(rng, topics)](difficulty, rng);
  const [w1, w2] = makeDistractors(answer, rng);
  const options = shuffle(rng, [answer, w1, w2]) as Question["options"];
  return { text, answer, options };
}
