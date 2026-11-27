import { ScreenHeading } from "./ScreenHeading";

export function Instructions({ onBack }: { onBack: () => void }) {
  return (
    <main>
      <ScreenHeading level={2}>Instructions</ScreenHeading>
      <section aria-labelledby="rules-heading">
        <h3 id="rules-heading">Rules</h3>
        <ul>
          <li>Each question appears with several possible answers on the board. Collect your own correct answer.</li>
          <li>Scoring: a correct answer earns 10 points. A wrong answer costs 5 points, and your score never drops below 0.</li>
          <li>Lives: each player starts with three lives and loses one for each collision.</li>
          <li>
            Game modes, chosen on the game setup screen:
            <ul>
              <li>Timed: score the most points before the countdown ends.</li>
              <li>Survival: play until one player loses all their lives. There is no timer.</li>
              <li>Target Score: be the first to reach the target score.</li>
              <li>Practice: no timer and unlimited lives, so you can build your skills.</li>
            </ul>
          </li>
        </ul>
      </section>
      <section aria-labelledby="controls-heading">
        <h3 id="controls-heading">Keyboard controls</h3>
        <ul>
          <li>Player 1: W, A, S, D</li>
          <li>Player 2: arrow keys</li>
          <li>Escape: pause</li>
        </ul>
      </section>
      <button type="button" onClick={onBack}>Back</button>
    </main>
  );
}
