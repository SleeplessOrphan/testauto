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
}
