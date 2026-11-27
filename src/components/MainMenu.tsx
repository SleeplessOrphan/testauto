"use client";

import { useState } from "react";
import { Instructions } from "./Instructions";
import { SettingsScreen } from "./SettingsScreen";

type Screen = "menu" | "setup" | "instructions" | "settings";

export function MainMenu() {
  const [screen, setScreen] = useState<Screen>("menu");
  const back = () => setScreen("menu");

  if (screen === "setup") {
    return (
      <main>
        <h2>Game setup</h2>
        <button type="button" onClick={back}>Back</button>
      </main>
    );
  }
  if (screen === "instructions") return <Instructions onBack={back} />;
  if (screen === "settings") return <SettingsScreen onBack={back} />;

  return (
    <main>
      <h1>Maths Snake</h1>
      <nav aria-label="Main menu" className="menu">
        <button type="button" onClick={() => setScreen("setup")}>Play</button>
        <button type="button" onClick={() => setScreen("instructions")}>Instructions</button>
        <button type="button" onClick={() => setScreen("settings")}>Settings</button>
      </nav>
    </main>
  );
}
