"use client";

import { checkGameEnd, finishGame } from "@/lib/game/modes";
import { computeResults, type PlayerResults } from "@/lib/game/results";
import type { GameState } from "@/lib/game/types";
import type { GameSettings } from "@/lib/settings/types";
import { ScreenHeading } from "./ScreenHeading";

const ROWS: [string, (r: PlayerResults) => string][] = [
  ["Final score", (r) => String(r.score)],
  ["Correct answers", (r) => String(r.correct)],
  ["Incorrect answers", (r) => String(r.incorrect)],
  ["Total questions answered", (r) => String(r.total)],
  ["Percentage accuracy", (r) => (r.accuracy === null ? "Not Available" : `${r.accuracy}%`)],
  ["Longest correct answer streak", (r) => String(r.longestStreak)],
  ["Longest snake length", (r) => String(r.longestLength)],
  ["Number of collisions", (r) => String(r.collisions)],
];

interface Props {
  state: GameState;
  settings: GameSettings;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
  onMainMenu: () => void;
}

export function ResultsScreen({ state, settings, onPlayAgain, onChangeSettings, onMainMenu }: Props) {
  // A round can end for lack of tile space before the mode rules say so; fall back to the final scores.
  const mode = settings.mode;
  const check = checkGameEnd(state, mode);
  const end = check.ended ? check : finishGame(state, mode);
  const results = computeResults(state);
  const heading =
    end.outcome === "win" && end.winner
      ? `${settings.players[end.winner - 1].name} wins!`
      : end.outcome === "draw"
        ? "It's a draw"
        : "Game over";
  return (
    <main>
      <ScreenHeading level={2} focus>{heading}</ScreenHeading>
      <table>
        <thead>
          <tr>
            <td />
            {settings.players.map((p, i) => (
              <th key={i} scope="col">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, fmt]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{fmt(results[1])}</td>
              <td>{fmt(results[2])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="menu">
        <button type="button" onClick={onPlayAgain}>Play Again</button>
        <button type="button" onClick={onChangeSettings}>Change Settings</button>
        <button type="button" onClick={onMainMenu}>Main Menu</button>
      </div>
    </main>
  );
}
