export function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <main>
      <h2>Settings</h2>
      <button type="button" onClick={onBack}>Back</button>
    </main>
  );
}
