import { buildQuestion } from "../distractors";
import { pick, randomInt, type Difficulty, type Question, type Rng } from "../types";

type Op = "+" | "−" | "×" | "÷";
type Token = number | Op | "(" | ")";

const OPS: readonly Op[] = ["+", "−", "×", "÷"];
const MAX_OPERAND: Record<Difficulty, number> = { easy: 10, medium: 12, hard: 20 };

/**
 * Evaluates with standard BIDMAS precedence. Returns null for inexact or zero division,
 * so the generator can reject expressions that would not have a whole-number answer.
 */
function evaluate(tokens: readonly Token[]): number | null {
  let pos = 0;
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (tokens[pos] === "+" || tokens[pos] === "−")) {
      const op = tokens[pos++];
      const r = term();
      v = r === null ? null : op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = (): number | null => {
    let v = factor();
    while (v !== null && (tokens[pos] === "×" || tokens[pos] === "÷")) {
      const op = tokens[pos++];
      const r = factor();
      if (r === null) return null;
      if (op === "×") v *= r;
      else if (r === 0 || v % r !== 0) return null;
      else v /= r;
    }
    return v;
  };
  const factor = (): number | null => {
    const t = tokens[pos++];
    if (typeof t === "number") return t;
    const v = expr();
    pos++; // closing bracket
    return v;
  };
  return expr();
}

function build(difficulty: Difficulty, rng: Rng): Token[] {
  const opCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : randomInt(rng, 3, 4);
  const max = MAX_OPERAND[difficulty];
  const tokens: Token[] = [randomInt(rng, 1, max)];
  for (let i = 0; i < opCount; i++) tokens.push(pick(rng, OPS), randomInt(rng, 1, max));
  if (difficulty !== "hard") return tokens;
  // Bracket a run of at least two operands, but never the whole expression.
  const operands = opCount + 1;
  const len = randomInt(rng, 2, operands - 1);
  const first = randomInt(rng, 0, operands - len);
  tokens.splice((first + len) * 2 - 1, 0, ")");
  tokens.splice(first * 2, 0, "(");
  return tokens;
}

export function mixedQuestion(difficulty: Difficulty, rng: Rng): Question {
  // Rejection sampling: a good share of random expressions are valid, so this ends quickly.
  for (;;) {
    const tokens = build(difficulty, rng);
    const answer = evaluate(tokens);
    if (answer !== null && answer >= 0) {
      const text = tokens.join(" ").replace("( ", "(").replace(" )", ")");
      return buildQuestion(`What is ${text}?`, answer, rng);
    }
  }
}
