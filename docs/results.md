# Results screen

When a game ends (mode rules, no room for answer tiles, or End Game in Practice) `GameScreen` passes its
final state to `MainMenu` through `onFinish`, and `ResultsScreen` replaces the game.

- Heading: "<name> wins!", "It's a draw", or "Game over" (Practice, no winner).
- Table: a column per player, rows for score, correct, incorrect, total, accuracy, longest streak,
  longest snake length and collisions. Accuracy is "Not Available" when nothing was answered.
- `computeResults(state)` in `src/lib/game/results.ts` builds the numbers (pure, unit-tested).
- Play Again remounts the game with the same settings; Change Settings opens setup pre-filled; Main Menu returns home.
