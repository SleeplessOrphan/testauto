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

/** An answer option sitting on the board; only its owner may collect it. */
export interface AnswerTile {
  player: PlayerId;
  x: number;
  y: number;
  value: number;
}

export interface PlayerStats {
  score: number;
  correct: number;
  incorrect: number;
  /** Current run of consecutive correct answers. */
  streak: number;
  /** Best run so far, for the results screen. */
  longestStreak: number;
  /** Lives left; the player is eliminated at 0. */
  lives: number;
  /** Collisions suffered so far, for the results screen. */
  collisions: number;
  /** Longest the snake has been, kept even after it shrinks or respawns. */
  longestLength: number;
}

/** Outcome of a player's latest collection; `seq` rises each time so the UI can tell events apart. */
export interface AnswerResult {
  seq: number;
  correct: boolean;
  /** The right answer to the question that was just answered. */
  answer: number;
  /** Streak bonus points earned by this collection (0 when none). */
  bonus?: number;
}

export interface GameState {
  snakes: Snake[];
  /** Blocked cells; none are placed yet. */
  obstacles?: Position[];
  /** Players that collided in the last step. */
  collisions?: PlayerId[];
  /** Answer tiles currently on the board. */
  tiles?: AnswerTile[];
  /** Current question text and answer per player; without an entry nothing is scored for that player. */
  questions?: Partial<Record<PlayerId, { text: string; answer: number }>>;
  stats?: Record<PlayerId, PlayerStats>;
  /** Latest collection result per player, for feedback. */
  results?: Partial<Record<PlayerId, AnswerResult>>;
  /** Players whose tiles were collected; they get a new question next cycle. */
  refresh?: PlayerId[];
  /** Players who lost their final life; their snakes and tiles are gone. */
  eliminated?: PlayerId[];
  /** Set to 'ended' when the round is over. */
  status?: 'ended';
}
