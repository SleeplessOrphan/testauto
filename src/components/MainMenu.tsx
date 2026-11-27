"use client";

import { useRef, useState } from "react";
import type { GameSettings } from "@/lib/settings/types";
import { GameScreen } from "./GameScreen";
import { GameSetup } from "./GameSetup";
import { Instructions } from "./Instructions";
import { ScreenHeading } from "./ScreenHeading";
import { SettingsScreen } from "./SettingsScreen";

type Screen = "menu" | "setup" | "game" | "instructions" | "settings";

export function MainMenu() {
  const [screen, setScreen] = useState<Screen>("menu");
  const navigated = useRef(false);
  const go = (next: Screen) => {
    navigated.current = true;
    setScreen(next);
  };
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const back = () => go("menu");

  if (screen === "setup") {
    return (
      <GameSetup
        onBack={back}
        onStart={(s) => {
          setSettings(s);
          go("game");
        }}
      />
    );
  }
  if (screen === "game" && settings) return <GameScreen settings={settings} onBack={back} />;
  if (screen === "instructions") return <Instructions onBack={back} />;
  if (screen === "settings") return <SettingsScreen onBack={back} />;

  return (
    <main>
      <ScreenHeading level={1} focus={navigated.current}>Maths Snake</ScreenHeading>
      <nav aria-label="Main menu" className="menu">
        <button type="button" onClick={() => go("setup")}>Play</button>
        <button type="button" onClick={() => go("instructions")}>Instructions</button>
        <button type="button" onClick={() => go("settings")}>Settings</button>
      </nav>
    </main>
  );
}
