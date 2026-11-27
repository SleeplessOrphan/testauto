"use client";

import { useCallback, useRef, useState } from "react";
import type { GameState } from "@/lib/game/types";
import type { GameSettings } from "@/lib/settings/types";
import { GameScreen } from "./GameScreen";
import { GameSetup } from "./GameSetup";
import { Instructions } from "./Instructions";
import { ResultsScreen } from "./ResultsScreen";
import { ScreenHeading } from "./ScreenHeading";
import { SettingsScreen } from "./SettingsScreen";

type Screen = "menu" | "setup" | "game" | "results" | "instructions" | "settings";

export function MainMenu() {
  const [screen, setScreen] = useState<Screen>("menu");
  const navigated = useRef(false);
  const go = (next: Screen) => {
    navigated.current = true;
    setScreen(next);
  };
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [final, setFinal] = useState<GameState | null>(null);
  // Changing the key remounts GameScreen, which is how Play Again starts a fresh game.
  const [gameKey, setGameKey] = useState(0);
  // Setup is pre-filled only when reached from the results screen.
  const [reuse, setReuse] = useState(false);
  const back = () => go("menu");
  const onFinish = useCallback((s: GameState) => {
    setFinal(s);
    setScreen("results");
  }, []);

  if (screen === "setup") {
    return (
      <GameSetup
        onBack={back}
        initial={reuse && settings ? settings : undefined}
        onStart={(s) => {
          setSettings(s);
          setGameKey((k) => k + 1);
          go("game");
        }}
      />
    );
  }
  if ((screen === "game" || screen === "results") && settings) {
    // The finished game stays mounted (hidden) under the results so its final data-* hooks remain readable.
    // Same tree shape in both screens so GameScreen is not remounted when the results appear.
    return (
      <>
        <div hidden={screen === "results"}>
          <GameScreen key={gameKey} settings={settings} onBack={back} onFinish={onFinish} />
        </div>
        {screen === "results" && final && (
          <ResultsScreen
            state={final}
            settings={settings}
            onPlayAgain={() => {
              setGameKey((k) => k + 1);
              go("game");
            }}
            onChangeSettings={() => {
              setReuse(true);
              go("setup");
            }}
            onMainMenu={() => {
              setReuse(false);
              back();
            }}
          />
        )}
      </>
    );
  }
  if (screen === "instructions") return <Instructions onBack={back} />;
  if (screen === "settings") return <SettingsScreen onBack={back} />;

  return (
    <main>
      <ScreenHeading level={1} focus={navigated.current}>Maths Snake</ScreenHeading>
      <nav aria-label="Main menu" className="menu">
        <button
          type="button"
          onClick={() => {
            setReuse(false);
            go("setup");
          }}
        >
          Play
        </button>
        <button type="button" onClick={() => go("instructions")}>Instructions</button>
        <button type="button" onClick={() => go("settings")}>Settings</button>
      </nav>
    </main>
  );
}
