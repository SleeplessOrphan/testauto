# Game setup screen

Play on the main menu opens the setup screen (`src/components/GameSetup.tsx`).
Each player has a name field (blank means "Player 1" / "Player 2"), a difficulty (Easy, Medium, Hard; default Medium)
and topic checkboxes (default Addition). Start Game builds a `GameSettings` object with `buildSettings`
(`src/lib/settings/validate.ts`) and opens a placeholder game screen showing both names.
A player with no topics gets an alert ("Player 1 must select at least one topic.") linked to their topics fieldset
and checkboxes with `aria-describedby`, and the game does not start.

## Gameplay difficulty

One "Gameplay difficulty" group (Easy, Medium, Hard; default Easy) is shared by both players and is separate from each
player's maths difficulty. Easy: 3 cells per second, no obstacles. Medium: 5 per second, 4 obstacles. Hard: 8 per second,
8 obstacles (`src/lib/settings/gameplay.ts`). Obstacles are drawn as brown cells with a white cross.
`generateObstacles` (`src/lib/game/obstacles.ts`) places them once at the start on free cells, away from snakes, a
3-cell margin ahead of each head and answer tiles. They are placed before the answer tiles, so tiles and respawns avoid
them, and hitting one costs a life like any other collision. The game element exposes `data-tick-rate` and
`data-obstacles`.
