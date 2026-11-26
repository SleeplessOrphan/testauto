// Expects: src/lib/maths/generate.ts exporting generateQuestion(topics, difficulty, rng)
// and types Question, MathsDifficulty, MathsTopic (src/lib/maths/types.ts).
// Question = { text: string; answer: number; options: number[] } (3 options, one equals answer).
// Topic ids: "addition" | "subtraction" | "multiplication" | "division" | "squares" | "square-roots".
// rng: () => number in [0, 1), like Math.random.
import { describe, it, expect } from "vitest";
import { generateQuestion } from "@/lib/maths/generate";
import type { MathsDifficulty, MathsTopic, Question } from "@/lib/maths/types";

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

const DIFFS: MathsDifficulty[] = ["easy", "medium", "hard"];
const TOPICS: MathsTopic[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "squares",
  "square-roots",
];
const LIMITS: Record<MathsTopic, Record<MathsDifficulty, number>> = {
  addition: { easy: 20, medium: 100, hard: 1000 },
  subtraction: { easy: 20, medium: 100, hard: 1000 },
  multiplication: { easy: 5, medium: 12, hard: 20 },
  division: { easy: 5, medium: 12, hard: 20 },
  squares: { easy: 5, medium: 12, hard: 25 },
  "square-roots": { easy: 25, medium: 144, hard: 625 },
};
const N = 400;

function many(topic: MathsTopic, d: MathsDifficulty, seed = 1): Question[] {
  const rng = seeded(seed);
  return Array.from({ length: N }, () => generateQuestion([topic], d, rng));
}
// Integers in the text.
const nums = (q: Question) => (q.text.match(/\d+/g) ?? []).map(Number);

describe("question shape (all topics, all difficulties)", () => {
  for (const t of TOPICS)
    for (const d of DIFFS)
      it(`${t}/${d}: three distinct integer options, exactly one correct`, () => {
        for (const q of many(t, d)) {
          expect(q.text.trim().length).toBeGreaterThan(0);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.options).toHaveLength(3);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
          for (const o of q.options) expect(Number.isInteger(o)).toBe(true);
        }
      });
});

describe("determinism and randomness", () => {
  it("same seed gives same questions", () => {
    const a = seeded(42);
    const b = seeded(42);
    for (let i = 0; i < 50; i++)
      expect(generateQuestion(TOPICS, "medium", a)).toEqual(generateQuestion(TOPICS, "medium", b));
  });
  it("different seeds give varied questions", () => {
    const texts = new Set(many("addition", "hard", 7).map((q) => q.text));
    expect(texts.size).toBeGreaterThan(50);
  });
  it("correct answer is not always in the same position", () => {
    const pos = new Set(many("addition", "medium").map((q) => q.options.indexOf(q.answer)));
    expect(pos.size).toBeGreaterThan(1);
  });
  it("works with extreme rng values 0 and just below 1", () => {
    for (const v of [0, 0.999999999]) {
      for (const t of TOPICS)
        for (const d of DIFFS) {
          const q = generateQuestion([t], d, () => v);
          expect(q.options).toHaveLength(3);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options).toContain(q.answer);
        }
    }
  });
});

describe("addition", () => {
  for (const d of DIFFS)
    it(`${d}: operands within limit and answer correct`, () => {
      const max = LIMITS.addition[d];
      for (const q of many("addition", d)) {
        const n = nums(q);
        expect(n).toHaveLength(2);
        expect(Math.max(...n)).toBeLessThanOrEqual(max);
        expect(n[0] + n[1]).toBe(q.answer);
      }
    });
  it("hard uses numbers beyond medium range", () => {
    expect(many("addition", "hard").some((q) => Math.max(...nums(q)) > 100)).toBe(true);
  });
});

describe("subtraction", () => {
  for (const d of DIFFS)
    it(`${d}: operands within limit, answer correct and never negative`, () => {
      const max = LIMITS.subtraction[d];
      for (const q of many("subtraction", d)) {
        const n = nums(q);
        expect(n).toHaveLength(2);
        expect(Math.max(...n)).toBeLessThanOrEqual(max);
        expect(n[0] - n[1]).toBe(q.answer);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        for (const o of q.options) expect(o).toBeGreaterThanOrEqual(0);
      }
    });
});

describe("multiplication", () => {
  for (const d of DIFFS)
    it(`${d}: factors within limit and answer correct`, () => {
      const max = LIMITS.multiplication[d];
      for (const q of many("multiplication", d)) {
        const n = nums(q);
        expect(n).toHaveLength(2);
        expect(Math.max(...n)).toBeLessThanOrEqual(max);
        expect(n[0] * n[1]).toBe(q.answer);
      }
    });
});

describe("division", () => {
  for (const d of DIFFS)
    it(`${d}: whole-number answer, non-zero divisor, within limits`, () => {
      const max = LIMITS.division[d];
      for (const q of many("division", d)) {
        const n = nums(q);
        expect(n).toHaveLength(2);
        const [dividend, divisor] = n;
        expect(divisor).toBeGreaterThan(0);
        expect(divisor).toBeLessThanOrEqual(max);
        expect(dividend % divisor).toBe(0);
        expect(dividend / divisor).toBe(q.answer);
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThanOrEqual(max);
      }
    });
});

describe("squares", () => {
  for (const d of DIFFS)
    it(`${d}: answer is a square of a base within limit`, () => {
      const max = LIMITS.squares[d];
      for (const q of many("squares", d)) {
        const base = Math.sqrt(q.answer);
        expect(Number.isInteger(base)).toBe(true);
        expect(base).toBeGreaterThanOrEqual(1);
        expect(base).toBeLessThanOrEqual(max);
        expect(nums(q)).toContain(base);
      }
    });
});

describe("square roots", () => {
  for (const d of DIFFS)
    it(`${d}: radicand is a perfect square within limit, answer whole`, () => {
      const max = LIMITS["square-roots"][d];
      for (const q of many("square-roots", d)) {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        const radicand = q.answer * q.answer;
        expect(radicand).toBeLessThanOrEqual(max);
        expect(nums(q)).toContain(radicand);
      }
    });
});

describe("difficulty scaling", () => {
  it("maximum values grow from easy to hard for each topic", () => {
    for (const t of TOPICS) {
      const maxAns = (d: MathsDifficulty) => Math.max(...many(t, d).map((q) => q.answer));
      expect(maxAns("medium")).toBeGreaterThan(maxAns("easy"));
      expect(maxAns("hard")).toBeGreaterThan(maxAns("medium"));
    }
  });
});

describe("generateQuestion topic selection", () => {
  it("draws only from the given topics, and uses all of them", () => {
    const rng = seeded(5);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion(["multiplication", "square-roots"], "easy", rng);
      const n = nums(q);
      seen.add(n.length === 2 ? "mul" : "root");
      if (n.length === 2) expect(n[0] * n[1]).toBe(q.answer);
      else expect(q.answer * q.answer).toBe(n[0]);
    }
    expect(seen).toEqual(new Set(["mul", "root"]));
  });
  it("a single topic always gives that topic", () => {
    for (const q of many("addition", "easy")) expect(q.text).toMatch(/\+/);
  });
  it("uses every one of the six topics when all are given", () => {
    const rng = seeded(9);
    const texts = Array.from({ length: 600 }, () => generateQuestion(TOPICS, "medium", rng).text);
    expect(new Set(texts.map((t) => t.replace(/\d+/g, "#"))).size).toBeGreaterThanOrEqual(6);
  });
  it("does not mutate the topics array", () => {
    const topics = [...TOPICS];
    generateQuestion(topics, "easy", seeded(1));
    expect(topics).toEqual(TOPICS);
  });
  it("throws on an empty topic list", () => {
    expect(() => generateQuestion([], "easy", seeded(1))).toThrow();
  });
});

describe("distractor helper", () => {
  it("src/lib/maths/distractors.ts: makeDistractors gives two distinct values differing from the answer", async () => {
    const mod = await import("@/lib/maths/distractors");
    const fn = (mod as Record<string, unknown>).makeDistractors as (
      answer: number,
      rng: () => number,
    ) => number[];
    expect(typeof fn).toBe("function");
    for (const answer of [0, 1, 2, 4, 25, 144, 625, 1999]) {
      const rng = seeded(answer + 3);
      for (let i = 0; i < 100; i++) {
        const out = fn(answer, rng);
        expect(out).toHaveLength(2);
        expect(out[0]).not.toBe(out[1]);
        expect(out).not.toContain(answer);
        for (const o of out) expect(Number.isInteger(o)).toBe(true);
      }
    }
  });
});
