import { makeDistractors } from "../distractors";
import { randomInt, type Difficulty, type Question, type Rng } from "../types";

type Op = "+" | "−" | "×" | "÷";
type Node = { value: number } | { op: Op; left: Node; right: Node };

const OPERAND_MAX: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 30 };
const PRECEDENCE: Record<Op, number> = { "+": 1, "−": 1, "×": 2, "÷": 2 };
const OPS: Op[] = ["+", "−", "×", "÷"];

function operationCount(difficulty: Difficulty, rng: Rng): number {
  if (difficulty === "easy") return 2;
  if (difficulty === "medium") return 3;
  return randomInt(rng, 3, 4);
}

function build(ops: number, max: number, rng: Rng): Node {
  if (ops === 0) return { value: randomInt(rng, 2, max) };
  const leftOps = randomInt(rng, 0, ops - 1);
  return {
    op: OPS[randomInt(rng, 0, 3)],
    left: build(leftOps, max, rng),
    right: build(ops - 1 - leftOps, max, rng),
  };
}

/** Exact evaluation of the tree; null if any step is negative or a division is inexact. */
function evaluate(node: Node): number | null {
  if ("value" in node) return node.value;
  const l = evaluate(node.left);
  const r = evaluate(node.right);
  if (l === null || r === null) return null;
  switch (node.op) {
    case "+":
      return l + r;
    case "−":
      return l - r >= 0 ? l - r : null;
    case "×":
      return l * r;
    case "÷":
      return r !== 0 && l % r === 0 ? l / r : null;
  }
}

/** Brackets appear only where BIDMAS needs them, so the text and the tree always agree. */
function render(node: Node): string {
  if ("value" in node) return String(node.value);
  const wrap = (child: Node, isRight: boolean): string => {
    const text = render(child);
    if ("value" in child) return text;
    const p = PRECEDENCE[child.op];
    const q = PRECEDENCE[node.op];
    const needs = p < q || (isRight && p === q && (node.op === "−" || node.op === "÷"));
    return needs ? `(${text})` : text;
  };
  return `${wrap(node.left, false)} ${node.op} ${wrap(node.right, true)}`;
}

export function generateMixed(difficulty: Difficulty, rng: Rng): Question {
  const wantBrackets = difficulty === "hard";
  for (;;) {
    const tree = build(operationCount(difficulty, rng), OPERAND_MAX[difficulty], rng);
    const text = render(tree);
    if (text.includes("(") !== wantBrackets) continue;
    const correctAnswer = evaluate(tree);
    if (correctAnswer === null) continue;
    return {
      text: `Work out ${text}`,
      correctAnswer,
      incorrectAnswers: makeDistractors(correctAnswer, rng),
    };
  }
}
