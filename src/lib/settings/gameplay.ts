export type GameplayDifficulty = 'easy' | 'medium' | 'hard';

export const GAMEPLAY_LEVELS: Record<GameplayDifficulty, { label: string; cellsPerSecond: number; obstacles: number }> = {
  easy: { label: 'Easy', cellsPerSecond: 3, obstacles: 0 },
  medium: { label: 'Medium', cellsPerSecond: 5, obstacles: 4 },
  hard: { label: 'Hard', cellsPerSecond: 8, obstacles: 8 },
};

export const DEFAULT_GAMEPLAY: GameplayDifficulty = 'easy';
