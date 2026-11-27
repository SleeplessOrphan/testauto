import { ScreenHeading } from "./ScreenHeading";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <main>
      <ScreenHeading level={2}>Settings</ScreenHeading>
      <button type="button" onClick={onBack}>Back</button>
    </main>
  );
}
