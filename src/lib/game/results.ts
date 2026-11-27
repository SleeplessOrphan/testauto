import { EMPTY_STATS } from './scoring';
import type { GameState, PlayerId } from './types';

export interface PlayerResults {
  score: number;
  correct: number;
  incorrect: number;
  total: number;
  /** Whole-number percentage, or null when no questions were answered. */
  accuracy: number | null;
  longestStreak: number;
  longestLength: number;
  collisions: number;
}

/** Final statistics per player for the results screen. Pure: never changes the state. */
export function computeResults(state: GameState): Record<PlayerId, PlayerResults> {
  const one = (p: PlayerId): PlayerResults => {
    const s = state.stats?.[p] ?? EMPTY_STATS;
    const total = s.correct + s.incorrect;
    return {
      score: s.score,
      correct: s.correct,
      incorrect: s.incorrect,
      total,
      accuracy: total === 0 ? null : Math.round((s.correct / total) * 100),
      longestStreak: s.longestStreak,
      longestLength: s.longestLength,
      collisions: s.collisions,
    };
  };
  return { 1: one(1), 2: one(2) };
}
