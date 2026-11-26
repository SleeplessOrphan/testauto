import { randomInt, type Rng } from "./types";

/** Two distinct whole-number wrong answers near the correct one (never negative, never equal to it). */
export function makeDistractors(correct: number, rng: Rng): [number, number] {
  const spread = Math.max(3, Math.round(Math.abs(correct) * 0.25));
  const picked: number[] = [];
  for (let attempt = 0; attempt < 100 && picked.length < 2; attempt++) {
    const sign = rng() < 0.5 ? -1 : 1;
    const candidate = correct + sign * randomInt(rng, 1, spread);
    if (candidate >= 0 && candidate !== correct && !picked.includes(candidate)) picked.push(candidate);
  }
  // Deterministic fallback so the "two distinct wrong answers" guarantee always holds.
  for (let offset = 1; picked.length < 2; offset++) {
    const candidate = correct + offset;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return [picked[0], picked[1]];
}
