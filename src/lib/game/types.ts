export type Direction = 'up' | 'down' | 'left' | 'right';
export type PlayerId = 1 | 2;

/** x is the column, y is the row; y grows downward. */
export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  player: PlayerId;
  /** Head first. */
  segments: Position[];
  /** Direction travelled in the last cycle; reversals are judged against it. */
  direction: Direction;
  /** Direction that will be travelled in the next cycle. */
  pendingDirection: Direction;
}

export interface GameState {
  snakes: Snake[];
}
