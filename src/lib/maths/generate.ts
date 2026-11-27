import { mixedQuestion } from "./topics/mixed";
import { percentageQuestion } from "./topics/percentages";
import { pick, type Difficulty, type Question, type Rng, type Topic } from "./types";

export type { Difficulty, Question, Topic } from "./types";

const GENERATORS: Record<Topic, (difficulty: Difficulty, rng: Rng) => Question> = {
  percentages: percentageQuestion,
  mixed: mixedQuestion,
};

export function generateQuestion(
  topics: readonly Topic[],
  difficulty: Difficulty,
  rng: Rng = Math.random,
): Question {
  if (topics.length === 0) throw new Error("At least one topic is required");
  return GENERATORS[pick(rng, topics)](difficulty, rng);
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
