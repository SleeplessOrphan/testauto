export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  text: string;
  correctAnswer: number;
  /** Exactly two, distinct from each other and from the correct answer. */
  incorrectAnswers: [number, number];
}

/** Returns a number in [0, 1), like Math.random. Injectable so tests can be deterministic. */
export type Rng = () => number;

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
