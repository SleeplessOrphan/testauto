export type MathsDifficulty = "easy" | "medium" | "hard";

/** Kebab-case topic ids, one per row of the difficulty table in the spec. */
export type MathsTopic = "percentages" | "mixed-operations";

export type Rng = () => number;

/** What a topic produces; `generateQuestion` adds the distractors. */
export interface QuestionStem {
  text: string;
  answer: number;
}

export interface Question {
  text: string;
  answer: number;
  /** Three distinct options in random order; exactly one equals `answer`. */
  options: number[];
}
