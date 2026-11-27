"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboard } from "@/hooks/useKeyboard";
import { createInitialState } from "@/lib/game/state";
import { accumulate, advance } from "@/lib/game/loop";
import { queueDirection } from "@/lib/game/movement";
import { parseSeed } from "@/lib/game/seed";
import type { Direction, GameState, PlayerId } from "@/lib/game/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawGame } from "@/lib/render/canvas";
import type { GameSettings } from "@/lib/settings/types";
import { generateQuestion } from "@/lib/maths/generate";
import { placeAnswerTiles } from "@/lib/game/answers";
import { CORRECT_POINTS, EMPTY_STATS, applyRefresh } from "@/lib/game/scoring";
import { Countdown } from "./Countdown";
import { QuestionPanel } from "./QuestionPanel";

/** Small seeded generator so `?seed=N` makes questions and tile positions repeatable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One question per player, with their three answer tiles placed. Ends the round if placement fails. */
function startRound(settings: GameSettings, seed: number | null) {
  const rng = seed === null ? Math.random : mulberry32(seed);
  let state = createInitialState();
  const questions = settings.players.map((p) => generateQuestion(p.topics, p.difficulty, rng));
  for (const player of [1, 2] as const) {
    const placed = placeAnswerTiles(state, player, questions[player - 1].options, rng);
    if (!placed.ok) return { state: { ...state, status: "ended" as const }, questions };
    state = { ...state, tiles: [...(state.tiles ?? []), ...placed.tiles] };
  }
  state = {
    ...state,
    stats: { 1: EMPTY_STATS, 2: EMPTY_STATS },
    questions: {
      1: { text: questions[0].text, answer: questions[0].answer },
      2: { text: questions[1].text, answer: questions[1].answer },
    },
  };
  return { state, questions };
}

/** How long the correct answer / praise stays in a player's feedback area. */
const FEEDBACK_MS = 2000;

const pt = (p: { x: number; y: number }) => p.x + "," + p.y;

export function GameScreen({ settings, onBack }: { settings: GameSettings; onBack: () => void }) {
  const [seed] = useState(() => parseSeed(window.location.search));
  const [round] = useState(() => startRound(settings, seed));
  const [state, setState] = useState<GameState>(round.state);
  const [count, setCount] = useState<number | null>(3);
  const [ticks, setTicks] = useState(0);
  const stateRef = useRef(round.state);
  const runningRef = useRef(false);
  const rngRef = useRef(seed === null ? Math.random : mulberry32(seed + 1));
  const [feedback, setFeedback] = useState({ 1: "", 2: "" });
  const seenRef = useRef({ 1: 0, 2: 0 });
  const timersRef = useRef<Partial<Record<PlayerId, ReturnType<typeof setTimeout>>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (count === null) {
      runningRef.current = true;
      return;
    }
    const id = setTimeout(() => setCount(count === 1 ? null : count - 1), 1000);
    return () => clearTimeout(id);
  }, [count]);

  useEffect(() => {
    if (count !== null || state.status === "ended") return;
    let raf = 0;
    let last = performance.now();
    let rest = 0;
    const frame = (now: number) => {
      const a = accumulate(rest, now - last);
      last = now;
      rest = a.remainderMs;
      if (a.ticks > 0) {
        let next = stateRef.current;
        for (let i = 0; i < a.ticks; i++) {
          // A collected question is replaced at the start of the following cycle.
          next = applyRefresh(
            next,
            (p) => {
              const pl = settings.players[p - 1];
              const q = generateQuestion(pl.topics, pl.difficulty, rngRef.current);
              return { text: q.text, answer: q.answer, options: q.options };
            },
            rngRef.current,
          );
          next = advance(next);
        }
        stateRef.current = next;
        setState(next);
        setTicks((t) => t + a.ticks);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count, state.status, settings.players]);

  const onDirection = useCallback((player: PlayerId, direction: Direction) => {
    if (!runningRef.current) return;
    stateRef.current = queueDirection(stateRef.current, player, direction);
  }, []);
  useKeyboard(onDirection);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawGame(ctx, state);
  }, [state]);

  useEffect(() => {
    for (const p of [1, 2] as const) {
      const r = state.results?.[p];
      if (!r || r.seq === seenRef.current[p]) continue;
      seenRef.current[p] = r.seq;
      const text = r.correct
        ? `Correct! +${CORRECT_POINTS}` + (r.bonus ? ` Streak bonus! +${r.bonus}` : "")
        :`Incorrect. The answer was ${r.answer}`;
      setFeedback((f) => ({ ...f, [p]: text }));
      clearTimeout(timersRef.current[p]);
      timersRef.current[p] = setTimeout(() => setFeedback((f) => ({ ...f, [p]: "" })), FEEDBACK_MS);
    }
  }, [state.results]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const [s1, s2] = state.snakes;
  return (
    <main className="game-screen">
      <div
        data-testid="game"
        data-phase={count === null ? "running" : "countdown"}
        data-tick={ticks}
        data-seed={seed ?? undefined}
        data-tiles={JSON.stringify(state.tiles ?? [])}
        data-status={state.status ?? "playing"}
        data-p1-score={state.stats?.[1].score ?? 0}
        data-p2-score={state.stats?.[2].score ?? 0}
        data-p1-correct={state.stats?.[1].correct ?? 0}
        data-p2-correct={state.stats?.[2].correct ?? 0}
        data-p1-incorrect={state.stats?.[1].incorrect ?? 0}
        data-p2-incorrect={state.stats?.[2].incorrect ?? 0}
        data-p1-head={pt(s1.segments[0])}
        data-p2-head={pt(s2.segments[0])}
        data-p1-length={s1.segments.length}
        data-p2-length={s2.segments.length}
        data-p1-direction={s1.direction}
        data-p2-direction={s2.direction}
        data-p1-segments={s1.segments.map(pt).join(";")}
        data-p2-segments={s2.segments.map(pt).join(";")}
      >
        <div className="game-names">
          <QuestionPanel player={1} name={settings.players[0].name} question={state.questions?.[1]?.text ?? ""}
            score={state.stats?.[1].score ?? 0}
            streak={state.stats?.[1].streak ?? 0}
            feedback={feedback[1]}
          />
          <QuestionPanel player={2} name={settings.players[1].name} question={state.questions?.[2]?.text ?? ""}
            score={state.stats?.[2].score ?? 0}
            streak={state.stats?.[2].streak ?? 0}
            feedback={feedback[2]}
          />
        </div>
        <div className="game-board">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            role="img"
            aria-label="Game board"
          />
          <Countdown value={count} />
          {state.status === "ended" && <p role="status" className="round-over">Round over</p>}
        </div>
      </div>
      <button type="button" onClick={onBack}>Back to menu</button>
    </main>
  );
}
