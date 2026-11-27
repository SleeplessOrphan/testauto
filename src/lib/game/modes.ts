import { EMPTY_STATS } from './scoring';
import type { GameState, PlayerId } from './types';

export type GameMode =
  | { kind: 'timed'; minutes: 1 | 3 | 5 }
  | { kind: 'survival' }
  | { kind: 'target'; target: 100 | 200 | 500 }
  | { kind: 'practice' };

export interface GameEnd {
  ended: boolean;
  /** Absent while the game is still running. 'none' is a Practice game ended by the players. */
  outcome?: 'win' | 'draw' | 'none';
  /** Only set when the outcome is 'win'. */
  winner?: PlayerId;
}

const RUNNING: GameEnd = { ended: false };
const score = (state: GameState, p: PlayerId) => state.stats?.[p]?.score ?? EMPTY_STATS.score;
const out = (state: GameState, p: PlayerId) => state.eliminated?.includes(p) ?? false;

function byScore(state: GameState): GameEnd {
  const a = score(state, 1);
  const b = score(state, 2);
  if (a === b) return { ended: true, outcome: 'draw' };
  return { ended: true, outcome: 'win', winner: a > b ? 1 : 2 };
}

/** Decides whether the game is over and who won. Pure: never changes the state. */
export function checkGameEnd(state: GameState, mode: GameMode): GameEnd {
  const bothOut = out(state, 1) && out(state, 2);
  switch (mode.kind) {
    case 'practice':
      return RUNNING;
    case 'timed':
      return bothOut || (state.timeRemaining !== undefined && state.timeRemaining <= 0) ? byScore(state) : RUNNING;
    case 'survival': {
      if (bothOut) return byScore(state);
      if (out(state, 1)) return { ended: true, outcome: 'win', winner: 2 };
      if (out(state, 2)) return { ended: true, outcome: 'win', winner: 1 };
      return RUNNING;
    }
    case 'target': {
      const reached = ([1, 2] as PlayerId[]).filter((p) => score(state, p) >= mode.target);
      if (reached.length === 1) return { ended: true, outcome: 'win', winner: reached[0] };
      return reached.length === 2 || bothOut ? byScore(state) : RUNNING;
    }
  }
}

/** Ends the game now (Practice, from the pause menu); other modes just report their normal result. */
export function finishGame(state: GameState, mode: GameMode): GameEnd {
  if (mode.kind === 'practice') return { ended: true, outcome: 'none' };
  return byScore(state);
}
