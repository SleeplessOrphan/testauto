# Maths question generation

Code lives in `src/lib/maths/` (pure TypeScript, no React).

- `generateQuestion(topics, difficulty, rng?)` picks one selected topic at random and returns a `Question`: `text`, `answer` and three distinct shuffled `options` (one correct, two near-miss distractors from `distractors.ts`). Pass a seeded `rng` for repeatable tests.
- Topics live in `topics/` and are registered in `generate.ts`.

## Topics

| Topic id | Easy | Medium | Hard |
| --- | --- | --- | --- |
| `percentages` | 10% and 50% | multiples of 5% | any whole-number percentage |
| `mixed-operations` | two operations | three operations | three or four operations, with brackets |

- Percentage bases are chosen so the answer is always a whole number.
- Mixed operations follow BIDMAS, every division is exact, and answers are never negative. Operands go up to 20, 100 and 1,000 for Easy, Medium and Hard.
- Question text uses the symbols `−`, `×` and `÷`.
