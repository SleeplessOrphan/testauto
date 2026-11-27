# Maths questions

`src/lib/maths/` generates multiple-choice maths questions. It is plain TypeScript with no React.

- `generateQuestion(topics, difficulty, rng)` in `generate.ts` picks one of the given topics at random and returns `{ text, answer, options }`. It throws if `topics` is empty.
- `options` holds three numbers: the answer and two distinct wrong answers, shuffled.
- `rng` is any function returning a number in [0, 1); pass a seeded one in tests. It defaults to `Math.random`.
- Topics live in `topics/`, one file per kind. Wrong answers come from `distractors.ts`, and random helpers from `random.ts`.

## Arithmetic (`topics/arithmetic.ts`)

Topics: addition, subtraction, multiplication, division, squares, square-roots. These return just the text and answer; `generate.ts` adds the wrong options with `makeDistractors` (near misses, never negative unless the answer is).

- Difficulty (`easy | medium | hard`) sets the limits: addition and subtraction operands up to 20/100/1,000; multiplication factors up to 5/12/20; division divisors and quotients up to 5/12/20; square bases up to 5/12/25; square roots of perfect squares up to 25/144/625.
- Subtraction never gives a negative answer; division is always exact with a non-zero divisor.

## Percentages and mixed operations (`topics/percentages.ts`, `topics/mixed.ts`)

These build the whole question with `buildQuestion`, whose wrong options are never negative.

| Topic | Easy | Medium | Hard |
| --- | --- | --- | --- |
| `percentages` | 10% and 50% | multiples of 5% | any whole-number percentage |
| `mixed` | two operations | three operations | three or four operations, with brackets |

- Percentage bases are always chosen so the answer is a whole number.
- Mixed expressions are evaluated with BIDMAS. Candidates with remainders, zero divisors or negative results are discarded and regenerated.
