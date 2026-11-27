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
  /** Set once the snake has collided; it no longer moves. */
  stopped?: boolean;
  /** True when the tail stays put this cycle, so its cell is not vacated. */
  growing?: boolean;
}

export interface GameState {
  snakes: Snake[];
  /** Blocked cells; none are placed yet. */
  obstacles?: Position[];
  /** Players that collided in the last step. */
  collisions?: PlayerId[];
}
