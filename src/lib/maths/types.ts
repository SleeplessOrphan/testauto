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
  /** Exactly three options: the answer and two distinct wrong answers, in display order. */
  options: number[];
}

/** Random source returning a number in [0, 1), like Math.random. Injectable for tests. */
export type Rng = () => number;
