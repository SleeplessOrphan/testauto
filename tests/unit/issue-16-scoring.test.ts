import { describe, expect, it } from "vitest";
import {
  CORRECT_POINTS,
  INCORRECT_PENALTY,
  MIN_SNAKE_LENGTH,
  nextScore,
  nextSnakeLength,
} from "@/lib/game/scoring";

/*
 * Assumed API, module src/lib/game/scoring.ts (see .pipeline/questions.md):
 *   CORRECT_POINTS = 10, INCORRECT_PENALTY = 5, MIN_SNAKE_LENGTH = 3
 *   nextScore(score, correct)        => new score (never below 0)
 *   nextSnakeLength(length, correct) => new length (+1 on correct; -1 on incorrect, never below 3)
 */

describe("scoring constants", () => {
  it("uses 10 points, a 5 point penalty and a minimum length of 3", () => {
    expect(CORRECT_POINTS).toBe(10);
    expect(INCORRECT_PENALTY).toBe(5);
    expect(MIN_SNAKE_LENGTH).toBe(3);
  });
});

describe("nextScore", () => {
  it("adds 10 for a correct answer", () => {
    expect(nextScore(0, true)).toBe(10);
    expect(nextScore(35, true)).toBe(45);
  });
  it("subtracts 5 for an incorrect answer", () => {
    expect(nextScore(20, false)).toBe(15);
    expect(nextScore(5, false)).toBe(0);
  });
  it("never goes below zero", () => {
    expect(nextScore(0, false)).toBe(0);
    expect(nextScore(4, false)).toBe(0);
    expect(nextScore(1, false)).toBe(0);
  });
});

describe("nextSnakeLength", () => {
  it("grows by one on a correct answer", () => {
    expect(nextSnakeLength(3, true)).toBe(4);
    expect(nextSnakeLength(10, true)).toBe(11);
  });
  it("shrinks by one on an incorrect answer", () => {
    expect(nextSnakeLength(4, false)).toBe(3);
    expect(nextSnakeLength(9, false)).toBe(8);
  });
  it("does not shrink below three segments", () => {
    expect(nextSnakeLength(3, false)).toBe(3);
  });
});
