import { GRID_COLUMNS, GRID_ROWS } from './constants';
import type { GameState, Snake } from './types';

const START_ROW = Math.floor(GRID_ROWS / 2);
const START_COLUMN = 5;

export function createInitialState(): GameState {
  const p1: Snake = {
    player: 1,
    segments: [2, 1, 0].map((i) => ({ x: START_COLUMN + i, y: START_ROW })),
    direction: 'right',
    pendingDirection: 'right',
  };
  const p2: Snake = {
    player: 2,
    segments: [0, 1, 2].map((i) => ({ x: GRID_COLUMNS - START_COLUMN - 3 + i, y: START_ROW })),
    direction: 'left',
    pendingDirection: 'left',
  };
  return { snakes: [p1, p2] };
}
