import { useEffect } from "react";
import { directionForKey } from "@/lib/game/input";
import type { Direction, PlayerId } from "@/lib/game/types";

/** Routes W/A/S/D and arrow keys to players; arrow keys never scroll the page. */
export function useKeyboard(onDirection: (player: PlayerId, direction: Direction) => void) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow")) e.preventDefault();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const hit = directionForKey(e.key);
      if (hit) onDirection(hit.player, hit.direction);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onDirection]);
}
