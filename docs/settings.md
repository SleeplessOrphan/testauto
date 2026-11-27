# Settings

The Settings screen has a "Sound effects" checkbox (default on). The value lives in `MainMenu` state
(not saved between visits yet) and is passed to the game. It is read on every sound request, so changes apply immediately.

## Sounds

`src/lib/audio/sounds.ts` builds four short sounds with Web Audio oscillators (no audio files):
`correct`, `incorrect`, `collision` and `streak` (played instead of `correct` when a streak bonus is awarded).
Every sound has matching visible text in the player panel, so nothing relies on sound alone.
If Web Audio is unavailable the player silently does nothing.

## Testing

`data-testid="game"` carries `data-sound-log` (JSON array of sounds played so far) and `data-last-sound`
(latest name, empty before any). Sounds suppressed by the setting are not logged.
