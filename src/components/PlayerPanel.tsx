import type { PlayerId } from "@/lib/game/types";

/** A player's live statistics: name, question, score, streak, lives and status, shown above the playing area. */
export function PlayerPanel({
  player,
  name,
  question,
  score,
  streak,
  lives,
  unlimitedLives,
  eliminated,
  feedback,
}: {
  player: PlayerId;
  name: string;
  question: string;
  score: number;
  streak: number;
  lives: number;
  unlimitedLives?: boolean;
  eliminated: boolean;
  feedback: string;
}) {
  return (
    <div className={"question-panel name-p" + player} role="group" aria-label={`Player ${player}: ${name}`}>
      <span className="player-name">{name}</span>
      <span className="question-text">
        <span className="stat-label">Question: </span>
        {question}
      </span>
      <span className="player-score">Score: {score}</span>
      <span className="player-streak">Streak: {streak}</span>
      <span className="player-lives">Lives: {unlimitedLives ? "Unlimited" : lives}</span>
      {/* Text, not only colour, so the status is clear to everyone. */}
      <span className="player-status">Status: {eliminated ? "Eliminated" : "Playing"}</span>
      <span className="player-feedback" aria-live="polite">{feedback}</span>
    </div>
  );
}
