import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function PauseMenu({ practice, onResume, onRestart, onExit, onEndGame }: {
  practice: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onEndGame: () => void;
}) {
  const [confirm, setConfirm] = useState<"restart" | "exit" | null>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  // Focus goes to Resume on open and again after a cancelled confirmation.
  useEffect(() => {
    if (confirm === null) resumeRef.current?.focus();
  }, [confirm]);
  return (
    <div className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <h2 id="pause-title">Paused</h2>
      {confirm === null ? (
        <>
          <button type="button" ref={resumeRef} onClick={onResume}>Resume</button>
          <button type="button" onClick={() => setConfirm("restart")}>Restart</button>
          <button type="button" onClick={() => setConfirm("exit")}>Exit</button>
          {practice && <button type="button" onClick={onEndGame}>End Game</button>}
        </>
      ) : (
        <ConfirmDialog
          message={confirm === "restart" ? "Restart the game? Scores, lives and questions will reset." : "Exit to the main menu? The game will be lost."}
          onConfirm={confirm === "restart" ? onRestart : onExit}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
