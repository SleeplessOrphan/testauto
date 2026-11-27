import { useEffect, useRef } from "react";

/** Inline yes/no question shown inside the pause menu. Focus starts on Cancel, the safe choice. */
export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div role="group" aria-label="Confirm">
      <p>{message}</p>
      <button type="button" onClick={onConfirm}>Confirm</button>
      <button type="button" ref={cancelRef} onClick={onCancel}>Cancel</button>
    </div>
  );
}
