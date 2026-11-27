# Maths questions

`src/lib/maths/` generates multiple-choice arithmetic questions. It is plain TypeScript with no React.

- `generateQuestion(topics, difficulty, rng)` picks one topic at random and returns `{ text, answer, options }`.
- Topics: addition, subtraction, multiplication, division, squares, square-roots.
- Difficulty (`easy | medium | hard`) sets the limits: addition and subtraction operands up to 20/100/1,000; multiplication factors up to 5/12/20; division divisors and quotients up to 5/12/20; square bases up to 5/12/25; square roots of perfect squares up to 25/144/625.
- Subtraction never gives a negative answer; division is always exact with a non-zero divisor.
- `options` holds three numbers: the answer and two distinct near-miss wrong answers (`makeDistractors`), shuffled.
- `rng` is any function returning a number in [0, 1); pass a seeded one in tests. It defaults to `Math.random`.
