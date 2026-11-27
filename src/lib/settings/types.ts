import type { MathsDifficulty, Topic } from "@/lib/maths/types";

export interface PlayerSettings {
  name: string;
  difficulty: MathsDifficulty;
  topics: Topic[];
}

import type { GameplayDifficulty } from "./gameplay";
import type { GameMode } from "@/lib/game/modes";

export interface GameSettings {
  players: [PlayerSettings, PlayerSettings];
  /** Shared by both players; separate from each player's maths difficulty. */
  gameplay: GameplayDifficulty;
  mode: GameMode;
}

/** Raw form values for one player, before defaults are applied. */
export type PlayerForm = PlayerSettings;
