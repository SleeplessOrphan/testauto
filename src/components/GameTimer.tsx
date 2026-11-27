/** Remaining time as mm:ss, rounded up so 00:00 only shows when time is truly out. */
export function GameTimer({ seconds }: { seconds: number }) {
  const s = Math.ceil(seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <p data-testid="timer">{mm}:{ss}</p>;
}
