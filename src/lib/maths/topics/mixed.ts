import { pick, randInt } from "../random";
import type { MathsDifficulty, QuestionStem, Rng } from "../types";

type Op = "+" | "−" | "×" | "÷";
type Token = number | Op | "(" | ")";

const OPS: Op[] = ["+", "−", "×", "÷"];
const MAX_OPERAND: Record<MathsDifficulty, number> = { easy: 20, medium: 100, hard: 1000 };
const MAX_RESULT = 100000;

/** Evaluates with BIDMAS; returns null for inexact or zero division. */
function evaluate(tokens: Token[]): number | null {
  let i = 0;
  let valid = true;
  const primary = (): number => {
    const t = tokens[i++];
    if (t === "(") {
      const v = sum();
      i++; // skip ")"
      return v;
    }
    return t as number;
  };
  const product = (): number => {
    let v = primary();
    while (tokens[i] === "×" || tokens[i] === "÷") {
      const op = tokens[i++];
      const r = primary();
      if (op === "×") v *= r;
      else {
        if (r === 0 || v % r !== 0) valid = false;
        v = r === 0 ? 0 : v / r;
      }
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (tokens[i] === "+" || tokens[i] === "−") {
      const op = tokens[i++];
      const r = product();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const value = sum();
  return valid ? value : null;
}

function attempt(difficulty: MathsDifficulty, rng: Rng): Token[] {
  const max = MAX_OPERAND[difficulty];
  const opCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : randInt(rng, 3, 4);
  const ops = Array.from({ length: opCount }, () => pick(rng, OPS));
  // Operands beside × and ÷ stay small so products are sensible and divisions often work out.
  const small = Math.min(max, 12);
  const nums = Array.from({ length: opCount + 1 }, (_, i) => {
    const tight = ops[i - 1] === "×" || ops[i - 1] === "÷" || ops[i] === "×";
    return tight ? randInt(rng, 2, small) : randInt(rng, 1, max);
  });
  const tokens: Token[] = [];
  nums.forEach((n, i) => {
    tokens.push(n);
    if (i < ops.length) tokens.push(ops[i]);
  });
  if (difficulty === "hard") {
    // Bracket a run of at least two operands, but never the whole expression.
    const a = randInt(rng, 0, opCount - 1);
    const maxB = a === 0 ? opCount - 1 : opCount;
    const b = randInt(rng, a + 1, maxB);
    tokens.splice(b * 2 + 1, 0, ")");
    tokens.splice(a * 2, 0, "(");
  }
  return tokens;
}

// Used if no random attempt is valid (e.g. a degenerate rng); each has the right operation count.
const FALLBACK: Record<MathsDifficulty, Token[]> = {
  easy: [2, "+", 3, "×", 4],
  medium: [20, "−", 3, "×", 4, "+", 5],
  hard: ["(", 20, "−", 8, ")", "÷", 4, "+", 3, "×", 5],
};

export function mixedQuestion(difficulty: MathsDifficulty, rng: Rng): QuestionStem {
  let tokens = FALLBACK[difficulty];
  let answer = evaluate(tokens) as number;
  for (let i = 0; i < 200; i++) {
    const t = attempt(difficulty, rng);
    const v = evaluate(t);
    if (v !== null && v >= 0 && v <= MAX_RESULT) {
      tokens = t;
      answer = v;
      break;
    }
  }
  const expression = tokens.join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
  return { text: `Work out ${expression}`, answer };
}
