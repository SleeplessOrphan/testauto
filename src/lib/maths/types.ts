export type MathsDifficulty = "easy" | "medium" | "hard";

export type MathsTopic =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "squares"
  | "square-roots";

/** A function returning a number in [0, 1), like Math.random. Injectable for tests. */
export type Rng = () => number;

export interface Question {
  text: string;
  answer: number;
  /** Exactly three options: the answer and two distinct wrong ones, in shuffled order. */
  options: [number, number, number];
}

/** What a topic generator produces before distractors are added. */
export interface RawQuestion {
  text: string;
  answer: number;
}
