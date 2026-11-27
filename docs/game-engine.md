# Game engine

Pure TypeScript in `src/lib/game/` (no React, no canvas).

## Scoring (#16)

`scoring.ts` holds the pure rules: a correct answer is +10 points and +1 segment; an incorrect one is -5 points (never below 0) and -1 segment (never below 3).

`step()` collects a tile when a moving snake's head lands on one of its own tiles and `questions[player]` exists in the state. It updates `stats` (score, correct, incorrect), removes that player's three tiles, records `results[player]` for feedback and adds the player to `refresh`. `applyRefresh()` runs at the start of the next cycle and gives each flagged player a new question and three new tiles; the other player is untouched.

Streaks: `stats[player]` also holds `streak` (consecutive correct answers, reset to 0 by an incorrect one) and `longestStreak`. Reaching a streak of 5 and of 10 adds `STREAK_BONUS` (20) on top of the usual +10; `results[player].bonus` carries it so feedback reads "Correct! +10 Streak bonus! +20". The panel shows "Streak: N" next to the score.

The game screen shows each player's score and an `aria-live="polite"` feedback line ("Correct! +10", or the right answer after a wrong one) for about 2 seconds. The game keeps running meanwhile.

- `constants.ts`: the 40 x 25 grid.
- `types.ts`: `Position`, `Direction`, `Snake`, `GameState`.
- `state.ts`: `createInitialState()` spawns two 3-segment snakes (Player 1 left moving right, Player 2 right moving left).
- `movement.ts`: `queueDirection()` stores a turn for the next cycle and ignores a reversal of the direction travelled in the last cycle; `step()` moves both snakes one cell together. Both are pure.
- `input.ts`: `directionForKey()` maps W/A/S/D to Player 1 and arrow keys to Player 2.

- `collision.ts`: `resolveCollisions(state, proposedHeads, obstacles?)` returns the players that collide this cycle, judged before anything moves: walls, obstacles, either snake's body, two heads in one cell, and heads swapping. A tail cell is free in the same cycle unless that snake is `growing` or is itself blocked this cycle (a blocked snake does not move, so the check repeats until no new collision appears). A head proposed onto the snake's own neck is a reversal, which `queueDirection()` never allows, so it is not judged as a self-collision.
- Lives (`lives.ts`): every player starts with `STARTING_LIVES` (3); `stats[player]` also holds `lives`, `collisions` and `longestLength` (never falls, even after an incorrect answer or a respawn). `loseLife(state, player, rng?)` costs one life and counts the collision. With lives left the snake respawns with three segments at a random spot (chosen among spots with at least two free cells ahead, so it does not crash again at once; the `data-pN-head` and `data-pN-length` test hooks keep an eliminated snake's last values) where every segment is more than one cell from the other snake, obstacles and all tiles, with two free cells ahead of the head (if no such spot exists the margin is relaxed, then the player is eliminated). Score, question and tiles are kept. On the last life the player is added to `eliminated` and their snake and tiles are removed, so their keys do nothing (`queueDirection()` finds no snake) while the other player carries on. The panel shows "Lives: N", "Eliminated" once out, and "Crash! -1 life" feedback.
- `step()` sets `collisions` on the returned state; a colliding snake does not move. `advance()` (loop.ts) then calls `loseLife()` for each of them.
