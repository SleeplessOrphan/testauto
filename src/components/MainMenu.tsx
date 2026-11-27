"use client";

import { useRef, useState } from "react";
import { Instructions } from "./Instructions";
import { ScreenHeading } from "./ScreenHeading";
import { SettingsScreen } from "./SettingsScreen";

type Screen = "menu" | "setup" | "instructions" | "settings";

export function MainMenu() {
  const [screen, setScreen] = useState<Screen>("menu");
  const navigated = useRef(false);
  const go = (next: Screen) => {
    navigated.current = true;
    setScreen(next);
  };
  const back = () => go("menu");

  if (screen === "setup") {
    return (
      <main>
        <ScreenHeading level={2}>Game setup</ScreenHeading>
        <button type="button" onClick={back}>Back</button>
      </main>
    );
  }
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
