import { defaultName } from "./defaults";
import { DEFAULT_GAMEPLAY, type GameplayDifficulty } from "./gameplay";
import type { GameMode } from "@/lib/game/modes";
import type { GameSettings, PlayerForm, PlayerSettings } from "./types";

export type SetupErrors = [string | null, string | null];

export type SetupResult = { ok: true; settings: GameSettings } | { ok: false; errors: SetupErrors };

export function buildSettings(forms: [PlayerForm, PlayerForm], gameplay: GameplayDifficulty = DEFAULT_GAMEPLAY, mode: GameMode = { kind: "timed", minutes: 3 }): SetupResult {
  const message = (f: PlayerForm, i: 0 | 1) =>
    f.topics.length === 0 ? `${defaultName(i)} must select at least one topic.` : null;
  const errors: SetupErrors = [message(forms[0], 0), message(forms[1], 1)];
  if (errors[0] || errors[1]) return { ok: false, errors };
  const player = (f: PlayerForm, i: 0 | 1): PlayerSettings => ({
    name: f.name.trim() || defaultName(i),
    difficulty: f.difficulty,
    topics: [...f.topics],
  });
  return { ok: true, settings: { players: [player(forms[0], 0), player(forms[1], 1)], gameplay, mode } };
}
