import { placeAnswerTiles } from './answers';
import type { GameState, PlayerId, PlayerStats } from './types';

export const CORRECT_POINTS = 10;
export const INCORRECT_PENALTY = 5;
export const MIN_SNAKE_LENGTH = 3;

export const EMPTY_STATS: PlayerStats = { score: 0, correct: 0, incorrect: 0 };

export function nextScore(score: number, correct: boolean): number {
  return correct ? score + CORRECT_POINTS : Math.max(0, score - INCORRECT_PENALTY);
}

export function nextSnakeLength(length: number, correct: boolean): number {
  return correct ? length + 1 : Math.max(MIN_SNAKE_LENGTH, length - 1);
}

export function nextStats(stats: PlayerStats, correct: boolean): PlayerStats {
  return {
    score: nextScore(stats.score, correct),
    correct: stats.correct + (correct ? 1 : 0),
    incorrect: stats.incorrect + (correct ? 0 : 1),
  };
}

export interface NewQuestion {
  text: string;
  answer: number;
  options: readonly number[];
}

/**
 * Gives every player flagged by `step()` a new question and three fresh tiles. Called at the start
 * of the next movement cycle; other players' questions and tiles are left alone.
 */
export function applyRefresh(
  state: GameState,
  make: (player: PlayerId) => NewQuestion,
  rng: () => number = Math.random,
): GameState {
  const pending = state.refresh ?? [];
  if (pending.length === 0) return state;
  let next: GameState = { ...state, refresh: undefined };
  for (const player of pending) {
    const q = make(player);
    const placed = placeAnswerTiles(next, player, q.options, rng);
    if (!placed.ok) return { ...next, status: 'ended' };
    next = {
      ...next,
      tiles: [...(next.tiles ?? []), ...placed.tiles],
      questions: { ...next.questions, [player]: { text: q.text, answer: q.answer } },
    };
  }
  return next;
}
