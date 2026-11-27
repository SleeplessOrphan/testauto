# Game modes

`src/lib/game/modes.ts` holds the rules for when a game ends. `checkGameEnd(state, mode)` returns
`{ ended, outcome, winner }`; outcome is `win` (with `winner` 1 or 2), `draw` or `none`.

- **Timed** (1, 3, 5 min): ends when `state.timeRemaining` hits 0 or both players are eliminated. Highest score wins, equal is a draw. One eliminated player does not end it.
- **Survival**: ends when a player is eliminated; the survivor wins. If both are out, highest score wins (equal is a draw).
- **Target Score** (100, 200, 500): the player reaching the target wins; if both do, or both are eliminated, highest score wins (equal is a draw).
- **Practice**: never ends by itself. `finishGame` gives `outcome: 'none'`. `loseLife(..., mode)` always respawns in Practice; scores and accuracy are still recorded.

## In the game

The setup screen has a "Game mode" group (default Timed). Timed shows a "Duration" group (1, 3 or 5 minutes, default 3); Target Score shows a "Target score" group (100, 200 or 500, default 200); the other modes show neither. On the game screen Timed shows an mm:ss countdown (`data-testid="timer"`) that only runs after the 3-2-1 countdown, Target Score shows "Target: N", and Practice shows lives as "Unlimited". `checkGameEnd` runs every frame and movement cycle; when it reports an end, gameplay stops, `data-phase` becomes `ended` and a placeholder shows the winner or draw (the full results screen comes later).

Test-only: `?timeScale=N` makes the timer run N times faster.
