# Maths question generation

`generateQuestion(topics, difficulty, rng?)` in `src/lib/maths/generate.ts` picks one of the selected
topics and returns a `Question`: `text`, `answer` and `options` (the answer plus two distinct wrong
answers, shuffled). Pass a seeded `rng` for reproducible output.

Topics live in `src/lib/maths/topics/`. Wrong answers come from `distractors.ts`.

| Topic | Easy | Medium | Hard |
| --- | --- | --- | --- |
| `percentages` | 10% and 50% | multiples of 5% | any whole-number percentage |
| `mixed` | two operations | three operations | three or four operations, with brackets |

- Percentage bases are always chosen so the answer is a whole number.
- Mixed expressions are evaluated with BIDMAS. Candidates with remainders, zero divisors or negative
  results are discarded and regenerated.
# Maths questions

`src/lib/maths/` generates multiple-choice arithmetic questions. It is plain TypeScript with no React.

- `generateQuestion(topics, difficulty, rng)` picks one topic at random and returns `{ text, answer, options }`.
- Topics: addition, subtraction, multiplication, division, squares, square-roots.
- Difficulty (`easy | medium | hard`) sets the limits: addition and subtraction operands up to 20/100/1,000; multiplication factors up to 5/12/20; division divisors and quotients up to 5/12/20; square bases up to 5/12/25; square roots of perfect squares up to 25/144/625.
- Subtraction never gives a negative answer; division is always exact with a non-zero divisor.
- `options` holds three numbers: the answer and two distinct near-miss wrong answers (`makeDistractors`), shuffled.
- `rng` is any function returning a number in [0, 1); pass a seeded one in tests. It defaults to `Math.random`.
