# Game engine

Pure TypeScript in `src/lib/game/` (no React, no canvas).

- `constants.ts`: the 40 x 25 grid.
- `types.ts`: `Position`, `Direction`, `Snake`, `GameState`.
- `state.ts`: `createInitialState()` spawns two 3-segment snakes (Player 1 left moving right, Player 2 right moving left).
- `movement.ts`: `queueDirection()` stores a turn for the next cycle and ignores a reversal of the direction travelled in the last cycle; `step()` moves both snakes one cell together. Both are pure.
- `input.ts`: `directionForKey()` maps W/A/S/D to Player 1 and arrow keys to Player 2.

- `collision.ts`: `resolveCollisions(state, proposedHeads, obstacles?)` returns the players that collide this cycle, judged before anything moves: walls, obstacles, either snake's body, two heads in one cell, and heads swapping. A tail cell is free in the same cycle unless that snake is `growing` or is itself blocked this cycle (a blocked snake does not move, so the check repeats until no new collision appears). A head proposed onto the snake's own neck is a reversal, which `queueDirection()` never allows, so it is not judged as a self-collision.
- `step()` sets `collisions` on the returned state; a colliding snake does not move. Lives and respawning come later.
