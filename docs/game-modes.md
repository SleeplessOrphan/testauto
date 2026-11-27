# Game modes

`src/lib/game/modes.ts` holds the rules for when a game ends. `checkGameEnd(state, mode)` returns
`{ ended, outcome, winner }`; outcome is `win` (with `winner` 1 or 2), `draw` or `none`.

- **Timed** (1, 3, 5 min): ends when `state.timeRemaining` hits 0 or both players are eliminated. Highest score wins, equal is a draw. One eliminated player does not end it.
- **Survival**: ends when a player is eliminated; the survivor wins. If both are out, highest score wins (equal is a draw).
- **Target Score** (100, 200, 500): the player reaching the target wins; if both do, or both are eliminated, highest score wins (equal is a draw).
- **Practice**: never ends by itself. `finishGame` gives `outcome: 'none'`. `loseLife(..., mode)` always respawns in Practice; scores and accuracy are still recorded.

The UI for choosing a mode comes in a later task.
