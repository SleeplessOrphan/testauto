import type { GameMode } from "@/lib/game/modes";
import type { MathsDifficulty, Topic } from "@/lib/maths/types";
import { DIFFICULTY_OPTIONS, TOPIC_OPTIONS, defaultName } from "./defaults";
import { GAMEPLAY_LEVELS, type GameplayDifficulty } from "./gameplay";
import type { GameSettings, PlayerSettings } from "./types";

// Bump the version when the stored shape changes; old data is then ignored.
export const STORAGE_KEY = "maths-snake:preferences:v1";

export interface Preferences {
  setup?: GameSettings;
  soundEnabled?: boolean;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function readPlayer(v: unknown, i: 0 | 1): PlayerSettings | undefined {
  if (!isObject(v) || typeof v.name !== "string" || !Array.isArray(v.topics)) return undefined;
  const difficulty = DIFFICULTY_OPTIONS.find((d) => d.value === v.difficulty)?.value as MathsDifficulty | undefined;
  const topics = TOPIC_OPTIONS.map((t) => t.value).filter((t) => (v.topics as unknown[]).includes(t)) as Topic[];
  if (!difficulty || topics.length === 0) return undefined;
  // The default name is applied when empty on save, so show it as an empty field again.
  return { name: v.name === defaultName(i) ? "" : v.name.slice(0, 100), difficulty, topics };
}

function readMode(v: unknown): GameMode | undefined {
  if (!isObject(v)) return undefined;
  if (v.kind === "timed" && (v.minutes === 1 || v.minutes === 3 || v.minutes === 5)) return { kind: "timed", minutes: v.minutes };
  if (v.kind === "target" && (v.target === 100 || v.target === 200 || v.target === 500)) return { kind: "target", target: v.target };
  if (v.kind === "survival" || v.kind === "practice") return { kind: v.kind };
  return undefined;
}

function read(): Record<string, unknown> | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    const data: unknown = JSON.parse(raw);
    return isObject(data) && data.version === 1 ? data : undefined;
  } catch {
    return undefined;
  }
}

/** Loads saved preferences; anything missing or invalid is left out so callers use defaults. */
export function loadPreferences(): Preferences {
  const data = read();
  if (!data) return {};
  const prefs: Preferences = {};
  if (typeof data.soundEnabled === "boolean") prefs.soundEnabled = data.soundEnabled;
  const players = Array.isArray(data.players) ? data.players : [];
  const p0 = readPlayer(players[0], 0);
  const p1 = readPlayer(players[1], 1);
  const mode = readMode(data.mode);
  const gameplay = Object.keys(GAMEPLAY_LEVELS).includes(data.gameplay as string) ? (data.gameplay as GameplayDifficulty) : undefined;
  if (p0 && p1 && mode && gameplay) prefs.setup = { players: [p0, p1], gameplay, mode };
  return prefs;
}

function write(update: (data: Record<string, unknown>) => void) {
  try {
    const data: Record<string, unknown> = { ...(read() ?? {}), version: 1 };
    update(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be disabled or full; the app simply keeps using in-memory values.
  }
}

export function saveSetup(s: GameSettings) {
  write((d) => {
    d.players = s.players;
    d.gameplay = s.gameplay;
    d.mode = s.mode;
  });
}

export function saveSound(soundEnabled: boolean) {
  write((d) => {
    d.soundEnabled = soundEnabled;
  });
}

export function clearPreferences() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
