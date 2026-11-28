import { describe, expect, it } from "vitest";
import { loseLife } from "@/lib/game/lives";
import { EMPTY_STATS } from "@/lib/game/scoring";
import type { GameState, PlayerStats } from "@/lib/game/types";

// Regression: when both players crash in the same cycle, the second respawn must not land in the
// path of the snake that respawned first (CI failure on PR #71, about 1 run in 800).
describe("respawn keeps clear of the other snake's path", () => {
  it("never puts the respawned snake in the two cells ahead of the other snake's head", () => {
    const state: GameState = {
      snakes: [
        { player: 1, direction: "up", pendingDirection: "up", segments: [{ x: 31, y: 12 }, { x: 31, y: 13 }, { x: 31, y: 14 }] },
        { player: 2, direction: "left", pendingDirection: "left", segments: [{ x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }] },
      ],
      stats: {
        1: { ...EMPTY_STATS, lives: 3 } as PlayerStats,
        2: { ...EMPTY_STATS, lives: 3 } as PlayerStats,
      },
    };
    const path = new Set(["31,11", "31,10"]);
    for (let i = 0; i < 1000; i++) {
      const next = loseLife(state, 2, () => i / 1000);
      const p2 = next.snakes.find((s) => s.player === 2)!;
      for (const c of p2.segments) expect(path.has(`${c.x},${c.y}`)).toBe(false);
    }
  }, 60_000);
});
