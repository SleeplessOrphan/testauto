# Game screen

`GameScreen` shows both player names (HTML) above a 40 x 25 `<canvas>`. Drawing lives in `src/lib/render/canvas.ts`
at a fixed 1280 x 800 resolution; CSS scales the canvas to the window at 40:25, so resizing never changes game state.
Player 1 is blue with a "1" on the head, Player 2 is orange with a "2".

Start Game shows a polite live-region countdown (3, 2, 1). Keys are ignored until it ends. Then a
`requestAnimationFrame` loop with an accumulator ticks at 5 per second (`src/lib/game/loop.ts`).
W/A/S/D steer Player 1, arrow keys Player 2 (arrow keys call `preventDefault`). A snake that hits a wall or a snake stops. If both heads enter the same cell on one tick, both snakes stop. A stopped snake keeps blocking all its cells, including its tail.

## Questions and answer tiles

When gameplay begins, one question per player is generated from that player's topics and difficulty and shown
under their name above the canvas (`PlayerPanel`: an accessible group with name, question, score, streak, lives and a text status, "Status: Playing" or "Status: Eliminated"). `placeAnswerTiles` (`src/lib/game/answers.ts`) puts the three
options on random free cells reachable from the owner's head (flood fill; never on snakes, obstacles or other
tiles). Tiles show the number, the owner's colour and "P1"/"P2". Driving over the other player's tile does nothing.
If placement fails, `state.status` becomes `ended` and "Round over" is shown. Collecting your own tiles comes next.
With `?seed=N`, questions and positions are repeatable. The test hook also carries `data-tiles`
(JSON `{player,x,y,value}[]`) and `data-status` (`playing` or `ended`).

## Testing hook

The element `data-testid="game"` carries read-only state: `data-phase` (`countdown` or `running`), `data-tick`,
`data-p1-head` and `data-p2-head` (`x,y`), `data-p1-length` and `data-p2-length`,
`data-p1-direction` and `data-p2-direction`, `data-p1-segments` and `data-p2-segments`
(`x,y;x,y;...`, head first) and `data-seed`.
A `?seed=N` query parameter fixes the random seed (parsed by `src/lib/game/seed.ts`; nothing random is used yet).
