import type { PlayerId } from "@/lib/game/types";

/** A player's name with their current question underneath, shown above the playing area. */
export function QuestionPanel({ player, name, question }: { player: PlayerId; name: string; question: string }) {
  return (
    <div className={"question-panel name-p" + player}>
      <span className="player-name">{name}</span>
      <span className="question-text">{question}</span>
    </div>
  );
}
