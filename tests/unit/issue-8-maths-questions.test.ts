// Expected modules (see task #8):
//   src/lib/maths/types.ts       -> Question (text, answer, options), MathsDifficulty, MathsTopic
//   src/lib/maths/generate.ts    -> generateQuestion(topics, difficulty, rng)
//   src/lib/maths/distractors.ts -> makeDistractors(correct, rng): two numbers
// Topic ids: "addition" | "subtraction" | "multiplication" | "division" | "squares" | "square-roots".
// rng is a function returning a number in [0, 1).
import { describe, expect, it } from "vitest";
import { generateQuestion } from "@/lib/maths/generate";
import { makeDistractors } from "@/lib/maths/distractors";
import type { MathsDifficulty, MathsTopic } from "@/lib/maths/types";

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
const N = 400;

function nums(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map(Number);
}

function many(topic: MathsTopic, d: MathsDifficulty, seed = 1) {
  const rng = seeded(seed);
  return Array.from({ length: N }, () => generateQuestion([topic], d, rng));
}

const MAX: Record<MathsTopic, Record<MathsDifficulty, number>> = {
  addition: { easy: 20, medium: 100, hard: 1000 },
  subtraction: { easy: 20, medium: 100, hard: 1000 },
  multiplication: { easy: 5, medium: 12, hard: 20 },
  division: { easy: 5, medium: 12, hard: 20 },
  squares: { easy: 5, medium: 12, hard: 25 },
  "square-roots": { easy: 25, medium: 144, hard: 625 },
};

const TOPICS = Object.keys(MAX) as MathsTopic[];

describe("every topic and difficulty", () => {
  for (const topic of TOPICS) {
    for (const d of DIFFS) {
      it(`${topic}/${d}: three integer options, one correct, two distinct wrong`, () => {
        for (const q of many(topic, d)) {
          expect(q.text.length).toBeGreaterThan(0);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.options).toHaveLength(3);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options.filter((o: number) => o === q.answer)).toHaveLength(1);
          for (const o of q.options) {
            expect(Number.isInteger(o)).toBe(true);
          }
        }
      });

      it(`${topic}/${d}: survives extreme rng values`, () => {
        for (const v of [0, 0.5, 0.999999999]) {
          const q = generateQuestion([topic], d, () => v);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options).toContain(q.answer);
        }
      });

      it(`${topic}/${d}: is deterministic for the same seed and varies across seeds`, () => {
        const a = many(topic, d, 7).map((q) => q.text);
        const b = many(topic, d, 7).map((q) => q.text);
        expect(a).toEqual(b);
        const c = many(topic, d, 8).map((q) => q.text);
        expect(c).not.toEqual(a);
        expect(new Set(a).size).toBeGreaterThan(1);
      });

      it(`${topic}/${d}: correct answer is not always in the same position`, () => {
        const positions = new Set(many(topic, d).map((q) => q.options.indexOf(q.answer)));
        expect(positions.size).toBeGreaterThan(1);
      });
    }
  }
});

describe("addition", () => {
  for (const d of DIFFS) {
    it(`${d}: operands within limit and answer is their sum`, () => {
      for (const q of many("addition", d)) {
        const n = nums(q.text);
        expect(n).toHaveLength(2);
        for (const x of n) {
          expect(x).toBeGreaterThanOrEqual(1);
          expect(x).toBeLessThanOrEqual(MAX.addition[d]);
        }
        expect(q.answer).toBe(n[0]! + n[1]!);
      }
    });
  }
  it("hard uses operands above the medium limit; easy never exceeds 20", () => {
    expect(Math.max(...many("addition", "hard").flatMap((q) => nums(q.text)))).toBeGreaterThan(100);
    expect(Math.max(...many("addition", "easy").flatMap((q) => nums(q.text)))).toBeLessThanOrEqual(20);
  });
});

describe("subtraction", () => {
  for (const d of DIFFS) {
    it(`${d}: operands within limit, answer correct and never negative`, () => {
      for (const q of many("subtraction", d)) {
        const n = nums(q.text);
        expect(n).toHaveLength(2);
        for (const x of n) expect(x).toBeLessThanOrEqual(MAX.subtraction[d]);
        expect(n[0]!).toBeGreaterThanOrEqual(n[1]!);
        expect(q.answer).toBe(n[0]! - n[1]!);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe("multiplication", () => {
  for (const d of DIFFS) {
    it(`${d}: factors within limit and answer is the product`, () => {
      for (const q of many("multiplication", d)) {
        const n = nums(q.text);
        expect(n).toHaveLength(2);
        for (const x of n) {
          expect(x).toBeGreaterThanOrEqual(1);
          expect(x).toBeLessThanOrEqual(MAX.multiplication[d]);
        }
        expect(q.answer).toBe(n[0]! * n[1]!);
      }
    });
  }
  it("easy reaches the limit of 5 and medium exceeds 5", () => {
    expect(Math.max(...many("multiplication", "easy").flatMap((q) => nums(q.text)))).toBe(5);
    expect(Math.max(...many("multiplication", "medium").flatMap((q) => nums(q.text)))).toBeGreaterThan(5);
  });
});

describe("division", () => {
  for (const d of DIFFS) {
    it(`${d}: whole-number answer, non-zero divisor, limits respected`, () => {
      for (const q of many("division", d)) {
        const n = nums(q.text);
        expect(n).toHaveLength(2);
        const dividend = n[0]!;
        const divisor = n[1]!;
        expect(divisor).toBeGreaterThanOrEqual(1);
        expect(divisor).toBeLessThanOrEqual(MAX.division[d]);
        expect(dividend % divisor).toBe(0);
        expect(q.answer).toBe(dividend / divisor);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        expect(q.answer).toBeLessThanOrEqual(MAX.division[d]);
      }
    });
  }
});

describe("squares", () => {
  for (const d of DIFFS) {
    it(`${d}: answer is a square of a base within limit, and the base is in the text`, () => {
      for (const q of many("squares", d)) {
        const base = Math.sqrt(q.answer);
        expect(Number.isInteger(base)).toBe(true);
        expect(base).toBeGreaterThanOrEqual(1);
        expect(base).toBeLessThanOrEqual(MAX.squares[d]);
        expect(nums(q.text)).toContain(base);
      }
    });
  }
  it("hard reaches bases above 12", () => {
    expect(Math.max(...many("squares", "hard").map((q) => q.answer))).toBeGreaterThan(144);
  });
});

describe("square roots", () => {
  for (const d of DIFFS) {
    it(`${d}: whole-number answer whose square (within limit) is in the text`, () => {
      for (const q of many("square-roots", d)) {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        const square = q.answer * q.answer;
        expect(square).toBeLessThanOrEqual(MAX["square-roots"][d]);
        expect(nums(q.text)).toContain(square);
      }
    });
  }
  it("hard reaches perfect squares above 144", () => {
    expect(Math.max(...many("square-roots", "hard").map((q) => q.answer ** 2))).toBeGreaterThan(144);
  });
});

describe("generateQuestion topic selection", () => {
  it("draws from every given topic and only those topics", () => {
    const rng = seeded(3);
    const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion(["addition", "multiplication"], "medium", rng);
      const n = nums(q.text);
      expect(n).toHaveLength(2);
      if (q.answer === n[0]! + n[1]!) kinds.add("add");
      if (q.answer === n[0]! * n[1]!) kinds.add("mul");
      expect([n[0]! + n[1]!, n[0]! * n[1]!]).toContain(q.answer);
    }
    expect(kinds.has("add")).toBe(true);
    expect(kinds.has("mul")).toBe(true);
  });

  it("with all six topics, produces a variety of questions", () => {
    const rng = seeded(11);
    const texts = new Set<string>();
    for (let i = 0; i < 300; i++) texts.add(generateQuestion(TOPICS, "easy", rng).text);
    expect(texts.size).toBeGreaterThan(10);
  });

  it("a single topic works", () => {
    const q = generateQuestion(["square-roots"], "easy", seeded(5));
    expect(q.answer * q.answer).toBeLessThanOrEqual(25);
  });

  it("rejects an empty topic list", () => {
    expect(() => generateQuestion([], "easy", seeded(1))).toThrow();
  });

  it("uses the injected rng (different rng sources give different questions)", () => {
    const a = Array.from({ length: 20 }, (_, i) => generateQuestion(TOPICS, "hard", seeded(i)).text);
    expect(new Set(a).size).toBeGreaterThan(5);
  });
});

describe("makeDistractors", () => {
  it("returns two distinct integers different from the correct answer", () => {
    const rng = seeded(21);
    for (const correct of [0, 1, 2, 3, 4, 5, 9, 25, 100, 399, 2000]) {
      for (let i = 0; i < 100; i++) {
        const [a, b] = makeDistractors(correct, rng);
        expect(Number.isInteger(a)).toBe(true);
        expect(Number.isInteger(b)).toBe(true);
        expect(a).not.toBe(correct);
        expect(b).not.toBe(correct);
        expect(a).not.toBe(b);
      }
    }
  });

  it("gives near-misses rather than arbitrary values", () => {
    const rng = seeded(22);
    for (let i = 0; i < 200; i++) {
      for (const x of makeDistractors(100, rng)) {
        expect(Math.abs(x - 100)).toBeLessThanOrEqual(50);
      }
    }
  });

  it("is robust to extreme rng values", () => {
    for (const v of [0, 0.999999999]) {
      const [a, b] = makeDistractors(1, () => v);
      expect(new Set([1, a, b]).size).toBe(3);
    }
  });
});
