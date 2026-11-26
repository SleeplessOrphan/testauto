# Maths questions

`generateQuestion(topic, difficulty)` in `src/lib/maths/generate.ts` returns a `Question`:
`text`, `correctAnswer` and two distinct `incorrectAnswers` (whole numbers, made by `makeDistractors`).

| Topic | Easy | Medium | Hard |
| --- | --- | --- | --- |
| `percentages` ("What is 20% of 150?") | 10% and 50% | multiples of 5% | any whole percentage 1–100 |
| `mixed` ("Work out 3 + 4 × 2") | two operations | three operations | three or four, with brackets |

- Percentage bases are chosen so the answer is always a whole number. Bases grow with difficulty (up to 100, 500, 1000).
- Mixed questions are built as an expression tree and evaluated by that tree, so the answer follows BIDMAS. Every
  division is exact and no step is negative.
- Each topic lives in `src/lib/maths/topics/`; register new ones in `generate.ts`.
