import type { MathsDifficulty, Topic } from "@/lib/maths/types";

export interface PlayerSettings {
  name: string;
  difficulty: MathsDifficulty;
  topics: Topic[];
}

export interface GameSettings {
  players: [PlayerSettings, PlayerSettings];
}

/** Raw form values for one player, before defaults are applied. */
export type PlayerForm = PlayerSettings;
