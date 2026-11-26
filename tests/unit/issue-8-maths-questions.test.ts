// Expects: src/lib/maths/generate.ts exporting `generateQuestion(topics, difficulty, rng)`
// and src/lib/maths/types.ts exporting `Question`, `MathsDifficulty`, `MathsTopic`.
// Assumed shapes (see .pipeline/questions.md):
//   Question = { text: string; answer: number; options: number[] }   (options has 3 entries incl. answer)
//   topics: "addition" | "subtraction" | "multiplication" | "division" | "squares" | "square-roots"
//   difficulty: "easy" | "medium" | "hard"; rng: () => number in [0, 1)
import { describe, expect, it } from "vitest";
import { generateQuestion } from "@/lib/maths/generate";
import type { Question } from "@/lib/maths/types";

type Topic = "addition" | "subtraction" | "multiplication" | "division" | "squares" | "square-roots";
type Diff = "easy" | "medium" | "hard";
const TOPICS: Topic[] = ["addition", "subtraction", "multiplication", "division", "squares", "square-roots"];
const DIFFS: Diff[] = ["easy", "medium", "hard"];

// Limits from the Story 7 table.
const LIMIT: Record<Topic, Record<Diff, number>> = {
  addition: { easy: 20, medium: 100, hard: 1000 },
  subtraction: { easy: 20, medium: 100, hard: 1000 },
  multiplication: { easy: 5, medium: 12, hard: 20 },
  division: { easy: 5, medium: 12, hard: 20 },
  squares: { easy: 5, medium: 12, hard: 25 },
  "square-roots": { easy: 25, medium: 144, hard: 625 },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nums = (text: string): number[] => (text.match(/\d+/g) ?? []).map(Number);

function sample(topic: Topic | Topic[], diff: Diff, n = 400, seed = 1): Question[] {
  const rng = mulberry32(seed);
  const topics = Array.isArray(topic) ? topic : [topic];
  return Array.from({ length: n }, () => generateQuestion(topics, diff, rng));
}

/** Does the question satisfy the structural maths of the topic (ignoring the difficulty limit)? */
function validFor(topic: Topic, q: Question): boolean {
  const n = nums(q.text);
  switch (topic) {
    case "addition":
      return n.length === 2 && n[0] + n[1] === q.answer;
    case "subtraction":
      return n.length === 2 && n[0] - n[1] === q.answer;
    case "multiplication":
      return n.length === 2 && n[0] * n[1] === q.answer;
    case "division":
      return n.length === 2 && n[1] !== 0 && n[0] / n[1] === q.answer;
    case "squares":
      return n.length >= 1 && n[0] * n[0] === q.answer;
    case "square-roots":
      return n.length === 1 && q.answer * q.answer === n[0];
  }
}

function expectWellFormed(q: Question) {
  expect(typeof q.text).toBe("string");
  expect(q.text.trim().length).toBeGreaterThan(0);
  expect(Number.isInteger(q.answer)).toBe(true);
  expect(q.options).toHaveLength(3);
  for (const o of q.options) {
    expect(Number.isInteger(o)).toBe(true);
    expect(o).toBeGreaterThanOrEqual(0);
  }
  expect(new Set(q.options).size).toBe(3);
  expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
}

describe("question structure (all topics, all difficulties)", () => {
  for (const topic of TOPICS) {
    for (const diff of DIFFS) {
      it(`${topic}/${diff}: exactly one correct and two distinct incorrect options`, () => {
        for (const q of sample(topic, diff)) expectWellFormed(q);
      });
    }
  }
});

describe("mathematical accuracy and difficulty ranges", () => {
  for (const topic of TOPICS) {
    for (const diff of DIFFS) {
      const max = LIMIT[topic][diff];
      it(`${topic}/${diff}: correct answer is right and operands stay within ${max}`, () => {
        const qs = sample(topic, diff);
        for (const q of qs) {
          expect(validFor(topic, q), q.text + " = " + q.answer).toBe(true);
          const n = nums(q.text);
          switch (topic) {
            case "addition":
            case "multiplication":
              n.forEach((x) => expect(x).toBeLessThanOrEqual(max));
              break;
            case "subtraction":
              n.forEach((x) => expect(x).toBeLessThanOrEqual(max));
              expect(q.answer).toBeGreaterThanOrEqual(0);
              break;
            case "division":
              // divisor and quotient <= max; dividend = divisor * quotient
              expect(n[1]).toBeGreaterThanOrEqual(1);
              expect(n[1]).toBeLessThanOrEqual(max);
              expect(q.answer).toBeLessThanOrEqual(max);
              expect(q.answer).toBeGreaterThanOrEqual(0);
              expect(Number.isInteger(n[0] / n[1])).toBe(true);
              break;
            case "squares":
              expect(n[0]).toBeLessThanOrEqual(max);
              break;
            case "square-roots":
              expect(n[0]).toBeLessThanOrEqual(max);
              expect(Number.isInteger(Math.sqrt(n[0]))).toBe(true);
              break;
          }
        }
      });
    }
  }

  it("difficulty scales: the largest numbers grow from easy to medium to hard, and use most of the range", () => {
    for (const topic of TOPICS) {
      const biggest = (d: Diff) =>
        Math.max(...sample(topic, d, 600, 7).flatMap((q) => [...nums(q.text), q.answer]));
      const [e, m, h] = DIFFS.map(biggest);
      expect(m, topic).toBeGreaterThan(e);
      expect(h, topic).toBeGreaterThan(m);
      // The top difficulty must actually reach well into its stated range.
      expect(h, topic).toBeGreaterThanOrEqual(LIMIT[topic].hard * 0.6);
    }
  });

  it("easy questions never use medium-sized numbers", () => {
    for (const topic of ["addition", "subtraction"] as Topic[]) {
      for (const q of sample(topic, "easy", 500, 3)) {
        nums(q.text).forEach((x) => expect(x).toBeLessThanOrEqual(20));
      }
    }
  });
});

describe("division and square roots are whole numbers", () => {
  it("division: whole-number answer, non-zero divisor, across many seeds", () => {
    for (const diff of DIFFS) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const q of sample("division", diff, 50, seed)) {
          const n = nums(q.text);
          expect(n[1]).not.toBe(0);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(n[0] % n[1]).toBe(0);
        }
      }
    }
  });

  it("square roots: whole-number answer for perfect squares", () => {
    for (const diff of DIFFS) {
      for (const q of sample("square-roots", diff, 300, 5)) {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer * q.answer).toBe(nums(q.text)[0]);
      }
    }
  });
});

describe("options", () => {
  it("the correct answer is not always in the same position", () => {
    for (const topic of TOPICS) {
      const positions = new Set(sample(topic, "medium", 200, 11).map((q) => q.options.indexOf(q.answer)));
      expect(positions.size, topic).toBeGreaterThanOrEqual(2);
    }
  });

  it("incorrect answers are near-misses, not wild values", () => {
    for (const q of sample("addition", "hard", 300, 2)) {
      for (const o of q.options) expect(Math.abs(o - q.answer)).toBeLessThanOrEqual(Math.max(20, q.answer));
    }
  });

  it("stays valid with degenerate random sources (constant 0 and almost 1)", () => {
    for (const value of [0, 0.5, 0.999999999]) {
      for (const topic of TOPICS) {
        for (const diff of DIFFS) {
          const q = generateQuestion([topic], diff, () => value);
          expectWellFormed(q);
          expect(validFor(topic, q)).toBe(true);
        }
      }
    }
  });

  it("stays valid for the smallest answers (many seeds, easy)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const topic of TOPICS) {
        const q = generateQuestion([topic], "easy", mulberry32(seed));
        expectWellFormed(q);
      }
    }
  });
});

describe("generateQuestion", () => {
  it("is deterministic for the same seed and varies between seeds", () => {
    const a = sample(TOPICS, "medium", 50, 42);
    const b = sample(TOPICS, "medium", 50, 42);
    expect(a).toEqual(b);
    const c = sample(TOPICS, "medium", 50, 43);
    expect(c).not.toEqual(a);
  });

  it("uses the injected random source (does not rely on Math.random)", () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error("Math.random must not be used when an rng is injected");
    };
    try {
      expect(() => generateQuestion(["addition", "squares"], "easy", mulberry32(9))).not.toThrow();
    } finally {
      Math.random = original;
    }
  });

  it("only draws from a single selected topic", () => {
    for (const topic of TOPICS) {
      for (const q of sample(topic, "hard", 100, 4)) expect(validFor(topic, q)).toBe(true);
    }
  });

  it("draws from every selected topic and only those topics", () => {
    const selections: Topic[][] = [
      ["addition", "squares"],
      ["multiplication", "square-roots"],
      ["division", "squares", "square-roots"],
    ];
    for (const selected of selections) {
      const qs = sample(selected, "medium", 400, 6);
      const unseen = new Set(selected);
      for (const q of qs) {
        const matching = selected.filter((t) => validFor(t, q));
        expect(matching.length, q.text).toBeGreaterThan(0);
        matching.forEach((t) => unseen.delete(t));
      }
      expect([...unseen]).toEqual([]);
    }
  });

  it("selects topics roughly evenly", () => {
    const qs = sample(["addition", "squares"], "easy", 600, 8);
    const oneNumber = qs.filter((q) => nums(q.text).length === 1).length;
    expect(oneNumber).toBeGreaterThan(150);
    expect(oneNumber).toBeLessThan(450);
  });

  it("works with all six topics together at every difficulty", () => {
    for (const diff of DIFFS) {
      for (const q of sample(TOPICS, diff, 300, 13)) {
        expectWellFormed(q);
        expect(TOPICS.some((t) => validFor(t, q))).toBe(true);
      }
    }
  });

  it("rejects an empty topic list", () => {
    expect(() => generateQuestion([], "easy", mulberry32(1))).toThrow();
  });

  it("does not mutate the topics array", () => {
    const topics: Topic[] = ["addition", "division"];
    generateQuestion(topics, "easy", mulberry32(1));
    expect(topics).toEqual(["addition", "division"]);
  });

  it("question text contains no placeholder values or American spellings", () => {
    for (const q of sample(TOPICS, "easy", 200, 21)) {
      expect(q.text).not.toMatch(/undefined|NaN|null|\bcolor\b|\bmath\b/i);
    }
  });
});
