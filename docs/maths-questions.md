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
