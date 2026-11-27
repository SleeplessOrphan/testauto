# Main menu

`/` shows the Maths Snake main menu (`src/components/MainMenu.tsx`): the level-1 heading
"Maths Snake" and three buttons, Play, Instructions and Settings. Screens switch with client-side
state, and every screen has a Back button.

- Play: placeholder "Game setup" screen (filled in by a later task).
- Instructions: rules (own answer, scoring, lives, game modes) and keyboard controls
  (Player 1: W, A, S, D; Player 2: arrow keys; Escape: pause).
- Settings: placeholder screen (sound and Reset Settings come later).

The rules state the scoring (+10 for a correct answer, -5 for a wrong one, never below 0), three lives per
player, and describe the Timed, Survival, Target Score and Practice modes. When a screen opens,
focus moves to its heading (`ScreenHeading`) so keyboard users do not lose their place after the clicked
button disappears. Focus is not moved on first load.
