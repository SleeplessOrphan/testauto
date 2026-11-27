import { describe, expect, it } from "vitest";
// Expected module: src/lib/maths/generate.ts, with topics registered as "percentages" and "mixed"
// (implemented in src/lib/maths/topics/percentages.ts and src/lib/maths/topics/mixed.ts).
import { generateQuestion } from "@/lib/maths/generate";

type Topic = Parameters<typeof generateQuestion>[0][number];
type Difficulty = Parameters<typeof generateQuestion>[1];

const PERCENTAGES = "percentages" as unknown as Topic;
const MIXED = "mixed" as unknown as Topic;
const EASY = "easy" as Difficulty;
const MEDIUM = "medium" as Difficulty;
const HARD = "hard" as Difficulty;

const RUNS = 400;

/** Small deterministic generator (mulberry32) so failures are reproducible. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function many(topic: Topic, difficulty: Difficulty, seed = 1) {
  const rng = seeded(seed);
  return Array.from({ length: RUNS }, () => generateQuestion([topic], difficulty, rng));
}

function expectValidShape(q: { answer: number; options: readonly number[] }) {
  expect(q.options).toHaveLength(3);
  expect(new Set(q.options).size).toBe(3);
  expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
  for (const o of q.options) expect(Number.isFinite(o)).toBe(true);
  expect(Number.isInteger(q.answer)).toBe(true);
}

// ---------- Percentages ----------

function parsePercentage(text: string): { pct: number; base: number } {
  const m = /(\d+)\s*%\s*of\s*(\d+)/i.exec(text);
  expect(m, `unparseable percentage question: ${text}`).not.toBeNull();
  return { pct: Number(m![1]), base: Number(m![2]) };
}

describe("percentage questions", () => {
  for (const difficulty of [EASY, MEDIUM, HARD]) {
    it(`${difficulty}: has valid shape and a correct whole-number answer`, () => {
      for (const q of many(PERCENTAGES, difficulty)) {
        expectValidShape(q);
        expect(q.text).toContain("%");
        const { pct, base } = parsePercentage(q.text);
        expect(base).toBeGreaterThan(0);
        expect(pct).toBeGreaterThan(0);
        // Compare using integer arithmetic: the product must divide exactly by 100.
        expect((pct * base) % 100).toBe(0);
        expect(q.answer).toBe((pct * base) / 100);
      }
    });
  }

  it("easy: only ever uses 10% and 50%, and uses both", () => {
    const seen = new Set(many(PERCENTAGES, EASY).map((q) => parsePercentage(q.text).pct));
    expect([...seen].sort((a, b) => a - b)).toEqual([10, 50]);
  });

  it("medium: only multiples of 5% up to 100%, with a good variety beyond 10% and 50%", () => {
    const seen = new Set(many(PERCENTAGES, MEDIUM).map((q) => parsePercentage(q.text).pct));
    for (const p of seen) {
      expect(p % 5).toBe(0);
      expect(p).toBeGreaterThanOrEqual(5);
      expect(p).toBeLessThanOrEqual(100);
    }
    const others = [...seen].filter((p) => p !== 10 && p !== 50);
    expect(others.length).toBeGreaterThanOrEqual(4);
  });

  it("hard: any whole-number percentage, including ones that are not multiples of 5", () => {
    const seen = new Set(many(PERCENTAGES, HARD).map((q) => parsePercentage(q.text).pct));
    for (const p of seen) {
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(100);
    }
    expect([...seen].filter((p) => p % 5 !== 0).length).toBeGreaterThanOrEqual(5);
  });

  it("hard questions use larger numbers than easy ones", () => {
    const biggest = (d: Difficulty) =>
      Math.max(...many(PERCENTAGES, d).map((q) => parsePercentage(q.text).base));
    expect(biggest(HARD)).toBeGreaterThan(biggest(EASY));
  });

  it("is deterministic for a given random source", () => {
    const a = many(PERCENTAGES, HARD, 42);
    const b = many(PERCENTAGES, HARD, 42);
    expect(a).toEqual(b);
  });
});

// ---------- Mixed operations ----------

type Token = { kind: "num"; value: number } | { kind: "op"; op: string } | { kind: "(" } | { kind: ")" };

function extractExpression(text: string): string {
  const m = /[(\d][\d\s+\-−–×x*÷/()]*[\d)]/.exec(text);
  expect(m, `no expression found in: ${text}`).not.toBeNull();
  return m![0];
}

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < expr.length && /\d/.test(expr[j]!)) j++;
      tokens.push({ kind: "num", value: Number(expr.slice(i, j)) });
      i = j;
    } else if (c === "(" || c === ")") {
      tokens.push({ kind: c });
      i++;
    } else if ("+-−–".includes(c)) {
      tokens.push({ kind: "op", op: "-+".includes(c) && c === "+" ? "+" : "-" });
      i++;
    } else if ("×x*".includes(c)) {
      tokens.push({ kind: "op", op: "*" });
      i++;
    } else if ("÷/".includes(c)) {
      tokens.push({ kind: "op", op: "/" });
      i++;
    } else {
      throw new Error(`unexpected character ${c} in ${expr}`);
    }
  }
  return tokens;
}

/** Standard BIDMAS evaluator. Throws if any division is not exact (no remainders allowed). */
function evaluate(tokens: Token[]): number {
  let pos = 0;
  const parseExpr = (): number => {
    let v = parseTerm();
    while (pos < tokens.length) {
      const t = tokens[pos]!;
      if (t.kind === "op" && (t.op === "+" || t.op === "-")) {
        pos++;
        const r = parseTerm();
        v = t.op === "+" ? v + r : v - r;
      } else break;
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (pos < tokens.length) {
      const t = tokens[pos]!;
      if (t.kind === "op" && (t.op === "*" || t.op === "/")) {
        pos++;
        const r = parseFactor();
        if (t.op === "*") v = v * r;
        else {
          if (r === 0 || v % r !== 0) throw new Error("inexact or zero division");
          v = v / r;
        }
      } else break;
    }
    return v;
  };
  const parseFactor = (): number => {
    const t = tokens[pos++]!;
    if (t.kind === "num") return t.value;
    if (t.kind === "(") {
      const v = parseExpr();
      expect(tokens[pos++]?.kind).toBe(")");
      return v;
    }
    throw new Error("unexpected token");
  };
  const result = parseExpr();
  expect(pos).toBe(tokens.length);
  return result;
}

/** Wrong evaluation: strictly left to right, ignoring precedence (brackets still respected). */
function evaluateLeftToRight(tokens: Token[]): number {
  let pos = 0;
  const parseSeq = (): number => {
    let v = parseAtom();
    while (pos < tokens.length) {
      const t = tokens[pos]!;
      if (t.kind !== "op") break;
      pos++;
      const r = parseAtom();
      v = t.op === "+" ? v + r : t.op === "-" ? v - r : t.op === "*" ? v * r : v / r;
    }
    return v;
  };
  const parseAtom = (): number => {
    const t = tokens[pos++]!;
    if (t.kind === "num") return t.value;
    if (t.kind === "(") {
      const v = parseSeq();
      pos++;
      return v;
    }
    throw new Error("unexpected token");
  };
  return parseSeq();
}

function analyse(text: string) {
  const expr = extractExpression(text);
  const tokens = tokenise(expr);
  return {
    tokens,
    operators: tokens.filter((t) => t.kind === "op").length,
    brackets: tokens.some((t) => t.kind === "("),
    value: evaluate(tokens),
  };
}

describe("mixed-operation questions", () => {
  for (const difficulty of [EASY, MEDIUM, HARD]) {
    it(`${difficulty}: answer follows BIDMAS, is whole, and has valid shape`, () => {
      for (const q of many(MIXED, difficulty)) {
        expectValidShape(q);
        const { value } = analyse(q.text); // throws on inexact division
        expect(Number.isInteger(value)).toBe(true);
        expect(q.answer).toBe(value);
      }
    });
  }

  it("easy: exactly two operations", () => {
    for (const q of many(MIXED, EASY)) expect(analyse(q.text).operators).toBe(2);
  });

  it("medium: exactly three operations", () => {
    for (const q of many(MIXED, MEDIUM)) expect(analyse(q.text).operators).toBe(3);
  });

  it("hard: three or four operations, always with brackets, and both counts occur", () => {
    const counts = new Set<number>();
    for (const q of many(MIXED, HARD)) {
      const a = analyse(q.text);
      expect([3, 4]).toContain(a.operators);
      expect(a.brackets).toBe(true);
      counts.add(a.operators);
    }
    expect([...counts].sort()).toEqual([3, 4]);
  });

  it("does not evaluate left to right: precedence matters in generated questions", () => {
    for (const difficulty of [EASY, MEDIUM, HARD]) {
      const differs = many(MIXED, difficulty).filter((q) => {
        const { tokens } = analyse(q.text);
        return evaluateLeftToRight(tokens) !== q.answer;
      });
      expect(differs.length, `${difficulty} never exercises precedence`).toBeGreaterThan(0);
    }
  });

  it("uses a variety of operators", () => {
    const ops = new Set<string>();
    for (const q of many(MIXED, MEDIUM)) {
      for (const t of analyse(q.text).tokens) if (t.kind === "op") ops.add(t.op);
    }
    expect(ops.size).toBeGreaterThanOrEqual(3);
  });

  it("is deterministic for a given random source", () => {
    expect(many(MIXED, HARD, 7)).toEqual(many(MIXED, HARD, 7));
  });

  it("produces a variety of questions", () => {
    const texts = new Set(many(MIXED, MEDIUM).map((q) => q.text));
    expect(texts.size).toBeGreaterThan(50);
  });
});

// ---------- Registration with generateQuestion ----------

describe("generateQuestion registration", () => {
  it("accepts both new topics together and yields each of them", () => {
    const rng = seeded(99);
    const kinds = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const q = generateQuestion([PERCENTAGES, MIXED], MEDIUM, rng);
      expectValidShape(q);
      kinds.add(q.text.includes("%") ? "percentage" : "mixed");
    }
    expect([...kinds].sort()).toEqual(["mixed", "percentage"]);
  });

  it("still throws when no topic is given", () => {
    expect(() => generateQuestion([], MEDIUM)).toThrow();
  });

  it("uses British English in question text (no American spellings)", () => {
    for (const q of [...many(PERCENTAGES, HARD), ...many(MIXED, HARD)]) {
      expect(q.text).not.toMatch(/percent(?!age)\b|color|math\b/i);
    }
  });
});
