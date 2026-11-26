import { pick, randInt } from "./random";
import type { Rng } from "./types";

/**
 * Returns the answer plus two distinct wrong answers, shuffled.
 * Wrong answers are near misses, kept non-negative when the answer is.
 */
export function withDistractors(answer: number, rng: Rng): number[] {
  const spread = Math.max(2, Math.round(Math.abs(answer) * 0.2));
  const wrong = new Set<number>();
  const ok = (v: number) => v !== answer && (answer < 0 || v >= 0);
  for (let i = 0; i < 20 && wrong.size < 2; i++) {
    const v = answer + pick(rng, [-1, 1]) * randInt(rng, 1, spread);
    if (ok(v)) wrong.add(v);
  }
  // Deterministic fallback so extreme rng values still give two distinct options.
  for (let d = 1; wrong.size < 2; d++) {
    for (const v of [answer + d, answer - d]) if (wrong.size < 2 && ok(v)) wrong.add(v);
  }
  const options = [answer, ...wrong];
  for (let i = options.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
