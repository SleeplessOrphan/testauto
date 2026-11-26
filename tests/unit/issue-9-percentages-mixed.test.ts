// Expects: src/lib/maths/generate.ts registering topics "percentages" and "mixed-operations"
// (MathsTopic ids, kebab-case like "square-roots"). Question text uses the symbols − × ÷ as in task 8.
import { describe, expect, it } from "vitest";
import { generateQuestion } from "@/lib/maths/generate";
import type { MathsDifficulty, MathsTopic, Question } from "@/lib/maths/types";

const DIFFICULTIES: MathsDifficulty[] = ["easy", "medium", "hard"];
const PCT = "percentages" as MathsTopic;
const MIXED = "mixed-operations" as MathsTopic;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(topic: MathsTopic, d: MathsDifficulty, n = 400): Question[] {
  const rng = mulberry32(12345);
  return Array.from({ length: n }, () => generateQuestion([topic], d, rng));
}

function expectShape(q: Question) {
  expect(q.options).toHaveLength(3);
  expect(new Set(q.options).size).toBe(3);
  expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
  for (const o of q.options) expect(Number.isFinite(o)).toBe(true);
  expect(Number.isInteger(q.answer)).toBe(true);
  expect(q.text.length).toBeGreaterThan(0);
}

// ---- BIDMAS evaluator (independent of the implementation) ----
function tokenise(expr: string): string[] {
  return expr.match(/\d+|[+−\-×÷*/()]/g) ?? [];
}
function evaluate(expr: string): { value: number; exactDivisions: boolean; ops: number } {
  const toks = tokenise(expr);
  let i = 0;
  let exact = true;
  let ops = 0;
  const peek = () => toks[i];
  function primary(): number {
    const tk = toks[i++];
    if (tk === "(") {
      const v = add();
      expect(toks[i++]).toBe(")");
      return v;
    }
    expect(tk).toMatch(/^\d+$/);
    return Number(tk);
  }
  function mul(): number {
    let v = primary();
    while (peek() === "×" || peek() === "÷" || peek() === "*" || peek() === "/") {
      const op = toks[i++];
      ops++;
      const r = primary();
      if (op === "×" || op === "*") v *= r;
      else {
        if (r === 0 || v % r !== 0) exact = false;
        v = v / r;
      }
    }
    return v;
  }
  function add(): number {
    let v = mul();
    while (peek() === "+" || peek() === "−" || peek() === "-") {
      const op = toks[i++];
      ops++;
      const r = mul();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const value = add();
  expect(i).toBe(toks.length);
  return { value, exactDivisions: exact, ops };
}
/** Pulls the arithmetic expression out of the question text (ignores any prose or trailing "= ?"). */
function expressionOf(text: string): string {
  const m = text.match(/[\d(][\d\s+−\-×÷*/()]*[\d)]/);
  expect(m, `no expression in "${text}"`).not.toBeNull();
  return m![0];
}
function numbersIn(text: string): number[] {
  return (expressionOf(text).match(/\d+/g) ?? []).map(Number);
}

describe("registration", () => {
  it("generates percentages and mixed-operations questions via generateQuestion", () => {
    for (const d of DIFFICULTIES) {
      expectShape(generateQuestion([PCT], d, mulberry32(1)));
      expectShape(generateQuestion([MIXED], d, mulberry32(1)));
    }
  });

  it("draws from both topics when both are selected", () => {
    const rng = mulberry32(7);
    const texts = Array.from({ length: 200 }, () => generateQuestion([PCT, MIXED], "medium", rng).text);
    expect(texts.some((t) => t.includes("%"))).toBe(true);
    expect(texts.some((t) => !t.includes("%"))).toBe(true);
  });

  it("only produces percentage questions when only percentages is selected", () => {
    for (const q of sample(PCT, "hard", 100)) expect(q.text).toContain("%");
  });
});

describe.each(DIFFICULTIES)("percentages (%s)", (d) => {
  const parse = (q: Question) => {
    const m = q.text.match(/(\d+)\s*%\s*of\s*(\d+)/i);
    expect(m, `unparseable: "${q.text}"`).not.toBeNull();
    return { pct: Number(m![1]), base: Number(m![2]) };
  };

  it("has a correct, whole-number answer and valid options", () => {
    for (const q of sample(PCT, d)) {
      expectShape(q);
      const { pct, base } = parse(q);
      expect(base).toBeGreaterThan(0);
      expect((pct * base) % 100).toBe(0);
      expect(q.answer).toBe((pct * base) / 100);
    }
  });

  it("uses the percentages the spec allows", () => {
    const pcts = new Set(sample(PCT, d, 600).map((q) => parse(q).pct));
    for (const p of pcts) {
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThanOrEqual(100);
      if (d === "easy") expect([10, 50]).toContain(p);
      if (d === "medium") expect(p % 5).toBe(0);
    }
    if (d === "easy") expect(pcts).toEqual(new Set([10, 50]));
    if (d === "medium") {
      expect(pcts.size).toBeGreaterThan(4);
      expect([...pcts].some((p) => p !== 10 && p !== 50)).toBe(true);
    }
    if (d === "hard") expect([...pcts].some((p) => p % 5 !== 0)).toBe(true);
  });

  it("survives extreme rng values", () => {
    for (const v of [0, 0.999999999]) {
      expectShape(generateQuestion([PCT], d, () => v));
    }
  });
});

describe.each(DIFFICULTIES)("mixed operations (%s)", (d) => {
  it("has an answer matching BIDMAS evaluation with exact divisions", () => {
    for (const q of sample(MIXED, d)) {
      expectShape(q);
      const r = evaluate(expressionOf(q.text));
      expect(r.exactDivisions, q.text).toBe(true);
      expect(Number.isInteger(r.value), q.text).toBe(true);
      expect(q.answer, q.text).toBe(r.value);
    }
  });

  it("uses the right number of operations", () => {
    const counts = new Set<number>();
    for (const q of sample(MIXED, d)) {
      const { ops } = evaluate(expressionOf(q.text));
      counts.add(ops);
      if (d === "easy") expect(ops, q.text).toBe(2);
      if (d === "medium") expect(ops, q.text).toBe(3);
      if (d === "hard") expect([3, 4], q.text).toContain(ops);
    }
    if (d === "hard") expect(counts).toEqual(new Set([3, 4]));
  });

  it("survives extreme rng values", () => {
    for (const v of [0, 0.999999999]) {
      const q = generateQuestion([MIXED], d, () => v);
      expectShape(q);
      expect(evaluate(expressionOf(q.text)).value).toBe(q.answer);
    }
  });
});

describe("mixed operations specifics", () => {
  it("hard questions always contain brackets", () => {
    for (const q of sample(MIXED, "hard")) {
      expect(q.text, q.text).toContain("(");
      expect(q.text, q.text).toContain(")");
    }
  });

  it("order of operations matters: some questions differ from left-to-right evaluation", () => {
    const leftToRight = (expr: string) => {
      const t = tokenise(expr);
      let v = Number(t[0]);
      for (let i = 1; i < t.length; i += 2) {
        const r = Number(t[i + 1]);
        v = t[i] === "+" ? v + r : t[i] === "×" ? v * r : t[i] === "÷" ? v / r : v - r;
      }
      return v;
    };
    const qs = sample(MIXED, "medium");
    const differing = qs.filter((q) => leftToRight(expressionOf(q.text)) !== q.answer);
    expect(differing.length).toBeGreaterThan(20);
  });

  it("contains a variety of operators across questions", () => {
    const text = sample(MIXED, "medium")
      .map((q) => q.text)
      .join(" ");
    for (const op of ["+", "−", "×", "÷"]) expect(text).toContain(op);
  });

  it("scales operand size with difficulty and keeps easy small", () => {
    const max = (d: MathsDifficulty) => Math.max(...sample(MIXED, d).flatMap((q) => numbersIn(q.text)));
    expect(max("easy")).toBeLessThanOrEqual(20);
    expect(max("medium")).toBeLessThanOrEqual(100);
    expect(max("hard")).toBeLessThanOrEqual(1000);
  });

  it("uses British English (no 'percent' spelling) in question text", () => {
    for (const d of DIFFICULTIES) {
      for (const q of [...sample(PCT, d, 50), ...sample(MIXED, d, 50)]) {
        expect(q.text).not.toMatch(/\bpercent\b/i);
      }
    }
  });

  it("produces varied questions", () => {
    for (const topic of [PCT, MIXED]) {
      expect(new Set(sample(topic, "hard", 100).map((q) => q.text)).size).toBeGreaterThan(30);
    }
  });
});
