import type { PlayerId } from "@/lib/game/types";

/** A player's name, score, current question and feedback, shown above the playing area. */
export function QuestionPanel({
  player,
  name,
  question,
  score,
  feedback,
}: {
  player: PlayerId;
  name: string;
  question: string;
  score: number;
  feedback: string;
}) {
  return (
    <div className={"question-panel name-p" + player}>
      <span className="player-name">{name}</span>
      <span className="question-text">{question}</span>
      <span className="player-score">Score: {score}</span>
      <span className="player-feedback" aria-live="polite">{feedback}</span>
    </div>
  );
}
