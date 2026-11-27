import type { PlayerId } from "@/lib/game/types";

/** A player's name, score, current question and feedback, shown above the playing area. */
export function QuestionPanel({
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
    <div className={"question-panel name-p" + player}>
      <span className="player-name">{name}</span>
      <span className="question-text">{question}</span>
      <span className="player-score">Score: {score}</span>
      <span className="player-streak">Streak: {streak}</span>
      <span className="player-lives">Lives: {unlimitedLives ? "Unlimited" : lives}</span>
      {eliminated && <span className="player-status">Eliminated</span>}
      <span className="player-feedback" aria-live="polite">{feedback}</span>
    </div>
  );
}
