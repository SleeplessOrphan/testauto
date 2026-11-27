# Game engine

Pure TypeScript in `src/lib/game/` (no React, no canvas).

- `constants.ts`: the 40 x 25 grid.
- `types.ts`: `Position`, `Direction`, `Snake`, `GameState`.
- `state.ts`: `createInitialState()` spawns two 3-segment snakes (Player 1 left moving right, Player 2 right moving left).
- `movement.ts`: `queueDirection()` stores a turn for the next cycle and ignores a reversal of the direction travelled in the last cycle; `step()` moves both snakes one cell together. Both are pure.
- `input.ts`: `directionForKey()` maps W/A/S/D to Player 1 and arrow keys to Player 2.

Collisions are not handled yet.
