import { withDistractors } from "./distractors";
import { pick } from "./random";
import { mixedQuestion } from "./topics/mixed";
import { percentageQuestion } from "./topics/percentages";
import type { MathsDifficulty, MathsTopic, Question, QuestionStem, Rng } from "./types";

const TOPICS: Record<MathsTopic, (d: MathsDifficulty, rng: Rng) => QuestionStem> = {
  percentages: percentageQuestion,
  "mixed-operations": mixedQuestion,
};

/** Picks one of the selected topics at random and builds a question with two distractors. */
export function generateQuestion(
  topics: readonly MathsTopic[],
  difficulty: MathsDifficulty,
  rng: Rng = Math.random,
): Question {
  const stem = TOPICS[pick(rng, topics)](difficulty, rng);
  return { ...stem, options: withDistractors(stem.answer, rng) };
}
