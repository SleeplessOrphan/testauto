// Expects: src/lib/maths/generate.ts exporting generateQuestion(topic, difficulty) with topics
// "percentages" and "mixed", difficulties "easy" | "medium" | "hard" (see .pipeline/questions.md).
import { describe, expect, it } from "vitest";
import { generateQuestion } from "@/lib/maths/generate";

type Loose = Record<string, unknown>;
const RUNS = 300;
const DIFFS = ["easy", "medium", "hard"] as const;

function gen(topic: string, difficulty: string): Loose {
  return (generateQuestion as unknown as (t: string, d: string) => Loose)(topic, difficulty);
}
function textOf(q: Loose): string {
  const t = q.text ?? q.prompt ?? q.question;
  expect(typeof t).toBe("string");
  return t as string;
}
function correctOf(q: Loose): number {
  const c = q.correctAnswer ?? q.answer ?? q.correct;
  expect(typeof c).toBe("number");
  return c as number;
}
function incorrectOf(q: Loose): number[] {
  const w = q.incorrectAnswers ?? q.distractors ?? q.wrongAnswers;
  expect(Array.isArray(w)).toBe(true);
  return w as number[];
}

function normalise(expr: string): string {
  return expr.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
}

/** Small independent BIDMAS evaluator (recursive descent). */
function evaluate(expr: string): number {
  const s = normalise(expr);
  let i = 0;
  const factor = (): number => {
    if (s[i] === "(") {
      i++;
      const v = add();
      expect(s[i]).toBe(")");
      i++;
      return v;
    }
    const m = /^\d+/.exec(s.slice(i));
    expect(m, `number expected in "${expr}" at ${i}`).not.toBeNull();
    i += m![0].length;
    return Number(m![0]);
  };
  const mul = (): number => {
    let v = factor();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const r = factor();
      if (op === "*") v *= r;
      else {
        expect(r).not.toBe(0);
        v /= r;
      }
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = mul();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const v = add();
  expect(i).toBe(s.length);
  return v;
}

function expressionOf(q: Loose): string {
  const matches = textOf(q).match(/[\d(][\d+\-−–×÷*/() ]*[\d)]/g) ?? [];
  expect(matches.length).toBeGreaterThan(0);
  return matches.sort((a, b) => b.length - a.length)[0];
}
function operatorCount(expr: string): number {
  return (normalise(expr).match(/[+\-*/]/g) ?? []).length;
}

describe.each(["percentages", "mixed"])("%s: question shape", (topic) => {
  for (const d of DIFFS) {
    it(`${d}: one correct answer and two distinct incorrect answers`, () => {
      for (let n = 0; n < RUNS; n++) {
        const q = gen(topic, d);
        const correct = correctOf(q);
        const wrong = incorrectOf(q);
        expect(Number.isInteger(correct)).toBe(true);
        expect(wrong).toHaveLength(2);
        expect(wrong[0]).not.toBe(wrong[1]);
        expect(wrong).not.toContain(correct);
        for (const w of wrong) expect(Number.isInteger(w)).toBe(true);
        expect(textOf(q).trim().length).toBeGreaterThan(0);
      }
    });
  }
  it("varies between calls", () => {
    const seen = new Set<string>();
    for (let n = 0; n < RUNS; n++) seen.add(textOf(gen(topic, "hard")));
    expect(seen.size).toBeGreaterThan(10);
  });
  it("uses British English", () => {
    for (let n = 0; n < 50; n++) {
      expect(textOf(gen(topic, "easy"))).not.toMatch(/\bpercent\b|\bmath\b/i);
    }
  });
});

describe("percentages", () => {
  const parse = (q: Loose) => {
    const m = /(\d+)\s*%\s*of\s*(\d+)/i.exec(textOf(q));
    expect(m, `"${textOf(q)}" should read like "N% of M"`).not.toBeNull();
    return { pct: Number(m![1]), base: Number(m![2]) };
  };

  for (const d of DIFFS) {
    it(`${d}: answer equals pct% of base and is a whole number`, () => {
      for (let n = 0; n < RUNS; n++) {
        const q = gen("percentages", d);
        const { pct, base } = parse(q);
        expect(base).toBeGreaterThan(0);
        expect((pct * base) % 100).toBe(0);
        expect(correctOf(q)).toBe((pct * base) / 100);
      }
    });
  }

  it("easy uses only 10% and 50%, and both appear", () => {
    const seen = new Set<number>();
    for (let n = 0; n < RUNS; n++) seen.add(parse(gen("percentages", "easy")).pct);
    expect([...seen].sort((a, b) => a - b)).toEqual([10, 50]);
  });

  it("medium uses only multiples of 5% between 5 and 100, with a good spread", () => {
    const seen = new Set<number>();
    for (let n = 0; n < RUNS * 2; n++) {
      const { pct } = parse(gen("percentages", "medium"));
      expect(pct % 5).toBe(0);
      expect(pct).toBeGreaterThanOrEqual(5);
      expect(pct).toBeLessThanOrEqual(100);
      seen.add(pct);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
    expect([...seen].some((p) => p !== 10 && p !== 50)).toBe(true);
  });

  it("hard uses whole-number percentages, including ones that are not multiples of 5", () => {
    const seen = new Set<number>();
    for (let n = 0; n < RUNS * 3; n++) {
      const { pct } = parse(gen("percentages", "hard"));
      expect(Number.isInteger(pct)).toBe(true);
      expect(pct).toBeGreaterThanOrEqual(1);
      expect(pct).toBeLessThanOrEqual(100);
      seen.add(pct);
    }
    expect([...seen].some((p) => p % 5 !== 0)).toBe(true);
    expect(seen.size).toBeGreaterThan(15);
  });

  it("bases get larger with difficulty (max easy < max hard)", () => {
    const max = (d: string) =>
      Math.max(...Array.from({ length: RUNS }, () => parse(gen("percentages", d)).base));
    expect(max("hard")).toBeGreaterThan(max("easy"));
  });
});

describe("mixed operations", () => {
  for (const d of DIFFS) {
    it(`${d}: stated answer matches BIDMAS evaluation and is a whole number`, () => {
      for (let n = 0; n < RUNS; n++) {
        const q = gen("mixed", d);
        const expr = expressionOf(q);
        const value = evaluate(expr);
        expect(Number.isInteger(value), `${expr} = ${value}`).toBe(true);
        expect(correctOf(q)).toBe(value);
      }
    });
  }

  it("easy uses exactly two operations and no brackets", () => {
    for (let n = 0; n < RUNS; n++) {
      const expr = expressionOf(gen("mixed", "easy"));
      expect(operatorCount(expr)).toBe(2);
      expect(expr).not.toMatch(/[()]/);
    }
  });

  it("medium uses exactly three operations", () => {
    for (let n = 0; n < RUNS; n++) {
      expect(operatorCount(expressionOf(gen("mixed", "medium")))).toBe(3);
    }
  });

  it("hard uses three or four operations, always with brackets", () => {
    const counts = new Set<number>();
    for (let n = 0; n < RUNS; n++) {
      const expr = expressionOf(gen("mixed", "hard"));
      const ops = operatorCount(expr);
      expect([3, 4]).toContain(ops);
      expect(expr).toMatch(/\(/);
      expect(expr).toMatch(/\)/);
      counts.add(ops);
    }
    expect([...counts].sort()).toEqual([3, 4]);
  });

  it("precedence matters: left-to-right evaluation would differ for some questions", () => {
    let differs = 0;
    for (let n = 0; n < RUNS; n++) {
      const q = gen("mixed", "medium");
      const tokens = normalise(expressionOf(q)).match(/\d+|[-+*/]/g)!;
      let acc = Number(tokens[0]);
      for (let k = 1; k < tokens.length; k += 2) {
        const r = Number(tokens[k + 1]);
        acc =
          tokens[k] === "+" ? acc + r : tokens[k] === "-" ? acc - r : tokens[k] === "*" ? acc * r : acc / r;
      }
      if (acc !== correctOf(q)) differs++;
    }
    expect(differs).toBeGreaterThan(0);
  });

  it("numbers do not shrink with difficulty", () => {
    const maxNum = (d: string) =>
      Math.max(
        ...Array.from({ length: RUNS }, () =>
          Math.max(...(expressionOf(gen("mixed", d)).match(/\d+/g) ?? []).map(Number)),
        ),
      );
    expect(maxNum("hard")).toBeGreaterThanOrEqual(maxNum("easy"));
  });
});
