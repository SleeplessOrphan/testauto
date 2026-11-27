import { ScreenHeading } from "./ScreenHeading";

export function SettingsScreen({
  onBack,
  soundEnabled,
  onSoundChange,
  onReset,
}: {
  onReset: () => void;
  onBack: () => void;
  soundEnabled: boolean;
  onSoundChange: (on: boolean) => void;
}) {
  return (
    <main>
      <ScreenHeading level={2}>Settings</ScreenHeading>
      <label>
        <input type="checkbox" checked={soundEnabled} onChange={(e) => onSoundChange(e.target.checked)} /> Sound effects
      </label>
      <div>
        <button type="button" onClick={onReset}>Reset Settings</button>
        <button type="button" onClick={onBack}>Back</button>
      </div>
    </main>
  );
}
