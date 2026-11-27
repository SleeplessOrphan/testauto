export function Instructions({ onBack }: { onBack: () => void }) {
  return (
    <main>
      <h2>Instructions</h2>
      <section aria-labelledby="rules-heading">
        <h3 id="rules-heading">Rules</h3>
        <ul>
          <li>Each question appears with several possible answers on the board. Collect your own correct answer.</li>
          <li>Scoring: a correct answer earns points and your snake grows. A wrong answer costs a life.</li>
          <li>Lives: you start with a set number of lives and lose one for a wrong answer or a crash.</li>
          <li>Game modes: choose the mode you want to play on the game setup screen.</li>
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
