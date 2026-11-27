export type Difficulty = "easy" | "medium" | "hard";
export type Topic = "percentages" | "mixed";
/** Returns a number in [0, 1), like Math.random. Injectable so tests are reproducible. */
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
}
