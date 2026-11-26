import { generateMixed } from "./topics/mixed";
import { generatePercentage } from "./topics/percentages";
import type { Difficulty, Question, Rng } from "./types";

export type { Difficulty, Question } from "./types";
export type Topic = "percentages" | "mixed";

const GENERATORS: Record<Topic, (difficulty: Difficulty, rng: Rng) => Question> = {
  percentages: generatePercentage,
  mixed: generateMixed,
};

export function generateQuestion(topic: Topic, difficulty: Difficulty, rng: Rng = Math.random): Question {
  return GENERATORS[topic](difficulty, rng);
}
