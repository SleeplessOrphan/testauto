# Settings

The Settings screen has a "Sound effects" checkbox (default on). The value lives in `MainMenu` state, is saved locally (see below) and is passed to the game. It is read on every sound request, so changes apply immediately.

## Sounds

`src/lib/audio/sounds.ts` builds four short sounds with Web Audio oscillators (no audio files):
`correct`, `incorrect`, `collision` and `streak` (played instead of `correct` when a streak bonus is awarded).
Every sound has matching visible text in the player panel, so nothing relies on sound alone.
If Web Audio is unavailable the player silently does nothing.

## Saved preferences

`src/lib/settings/storage.ts` keeps preferences in `localStorage` under one versioned key
(`maths-snake:preferences:v1`). Setup (names, topics, maths and gameplay difficulty, mode with duration or
target) is saved on Start Game; the sound setting is saved when it changes. On load every part is validated
and anything invalid falls back to its default. "Reset Settings" removes the key and restores defaults.
If storage is unavailable or throws, reads and writes are ignored and the app uses defaults.
Nothing is sent anywhere. See `docs/decisions/0027-local-storage-preferences.md`.

## Testing

`data-testid="game"` carries `data-sound-log` (JSON array of sounds played so far) and `data-last-sound`
(latest name, empty before any). Sounds suppressed by the setting are not logged.
