export type MathsDifficulty = "easy" | "medium" | "hard";

export type MathsTopic =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "squares"
  | "square-roots";

export interface Question {
  text: string;
  answer: number;
  /** Exactly three options: the answer and two distinct incorrect values. */
  options: number[];
}

/** Returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

export type QuestionGenerator = (difficulty: MathsDifficulty, rng: Rng) => Question;
