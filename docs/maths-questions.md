# Maths question generation

`src/lib/maths/` is pure TypeScript (no React). `generateQuestion(topics, difficulty, rng)` picks one of the
given topics at random and returns a `Question`: `text`, `answer` and exactly three `options` (the answer plus
two distinct near-miss wrong answers, shuffled). `rng` defaults to `Math.random`; pass a seeded function in tests.

Topics: addition, subtraction, multiplication, division, squares, square-roots. Limits per difficulty are
in `topics/arithmetic.ts`. Subtraction never gives a negative answer; division is always whole with a non-zero
divisor; square roots are of perfect squares. Wrong answers are never negative.
Percentages and mixed operations come later.
