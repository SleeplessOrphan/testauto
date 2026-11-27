import type { GameSettings } from "@/lib/settings/types";
import { ScreenHeading } from "./ScreenHeading";

// Stands in for the real game screen until it is built.
export function GamePlaceholder({ settings, onBack }: { settings: GameSettings; onBack: () => void }) {
  return (
    <main>
      <ScreenHeading level={2}>Game</ScreenHeading>
      <ul>
        {settings.players.map((p, i) => (
          <li key={i}>{p.name}</li>
        ))}
      </ul>
      <button type="button" onClick={onBack}>Back to menu</button>
    </main>
  );
}
