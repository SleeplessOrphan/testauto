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
import { mixedQuestion } from "./topics/mixed";
import { percentageQuestion } from "./topics/percentages";
import type { MathsDifficulty, Question, RawQuestion, Rng, Topic } from "./types";

export type { Difficulty, MathsDifficulty, MathsTopic, Question, Topic } from "./types";

type Generator = (d: MathsDifficulty, rng: Rng) => Question;

/** Arithmetic topics produce just text and answer; the wrong options are added here. */
function withDistractors(raw: (d: MathsDifficulty, rng: Rng) => RawQuestion): Generator {
  return (d, rng) => {
    const { text, answer } = raw(d, rng);
    const [w1, w2] = makeDistractors(answer, rng);
    const options = shuffle(rng, [answer, w1, w2]) as Question["options"];
    return { text, answer, options };
  };
}

const GENERATORS: Record<Topic, Generator> = {
  addition: withDistractors(addition),
  subtraction: withDistractors(subtraction),
  multiplication: withDistractors(multiplication),
  division: withDistractors(division),
  squares: withDistractors(squares),
  "square-roots": withDistractors(squareRoots),
  percentages: percentageQuestion,
  mixed: mixedQuestion,
};

export function generateQuestion(
  topics: readonly Topic[],
  difficulty: MathsDifficulty,
  rng: Rng = Math.random,
): Question {
  if (topics.length === 0) throw new Error("At least one topic is required");
  return GENERATORS[pick(rng, topics)](difficulty, rng);
}
