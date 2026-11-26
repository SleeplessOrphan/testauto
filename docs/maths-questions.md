# Maths question generation

`src/lib/maths/` is pure TypeScript (no React or DOM). `generateQuestion(topics, difficulty, rng)` picks one topic at random and returns a `Question`: `text`, `answer` and exactly three `options` (the answer and two distinct near-miss wrong answers, never negative, in random order).

Topics: addition, subtraction (never negative), multiplication, division (always exact, divisor never zero), squares, square roots (perfect squares only).

| Topic | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Addition / subtraction | up to 20 | up to 100 | up to 1,000 |
| Multiplication | factors up to 5 | up to 12 | up to 20 |
| Division | divisor and quotient up to 5 | 12 | 20 |
| Squares | bases up to 5 | 12 | 25 |
| Square roots | squares up to 25 | 144 | 625 |

The `rng` argument (`() => number` in [0, 1)) is injectable so tests are deterministic; it defaults to `Math.random`. Percentages and mixed operations are a later task.
