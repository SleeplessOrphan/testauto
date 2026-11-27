export type Difficulty = "easy" | "medium" | "hard";
export type Topic = "percentages" | "mixed";
/** Returns a number in [0, 1), like Math.random. Injectable so tests are reproducible. */
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
  /** Three distinct options, exactly one of which equals `answer`. */
  options: readonly number[];
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
  /** Exactly three options: the answer and two distinct wrong ones, in shuffled order. */
  options: [number, number, number];
}

/** What a topic generator produces before distractors are added. */
export interface RawQuestion {
  text: string;
  answer: number;
}
