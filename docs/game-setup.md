# Game setup screen

Play on the main menu opens the setup screen (`src/components/GameSetup.tsx`).
Each player has a name field (blank means "Player 1" / "Player 2"), a difficulty (Easy, Medium, Hard; default Medium)
and topic checkboxes (default Addition). Start Game builds a `GameSettings` object with `buildSettings`
(`src/lib/settings/validate.ts`) and opens a placeholder game screen showing both names.
A player with no topics gets an alert ("Player 1 must select at least one topic.") linked to their topics fieldset
and checkboxes with `aria-describedby`, and the game does not start.
