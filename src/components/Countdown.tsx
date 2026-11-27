// The live region stays mounted so screen readers hear each number as it changes.
export function Countdown({ value }: { value: number | null }) {
  return (
    <div className="countdown" aria-live="polite">
      {value === null ? "" : value}
    </div>
  );
}
