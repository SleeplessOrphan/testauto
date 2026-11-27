"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createInitialState } from "@/lib/game/state";
import { accumulate, advance } from "@/lib/game/loop";
import { queueDirection } from "@/lib/game/movement";
import { parseSeed } from "@/lib/game/seed";
import type { Direction, GameState, PlayerId } from "@/lib/game/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawGame } from "@/lib/render/canvas";
import type { GameSettings } from "@/lib/settings/types";
import { generateQuestion } from "@/lib/maths/generate";
import { placeAnswerTiles } from "@/lib/game/answers";
import { generateObstacles } from "@/lib/game/obstacles";
import { GAMEPLAY_LEVELS } from "@/lib/settings/gameplay";
import { CORRECT_POINTS, EMPTY_STATS, applyRefresh } from "@/lib/game/scoring";
import { checkGameEnd } from "@/lib/game/modes";
import { Countdown } from "./Countdown";
import { GameTimer } from "./GameTimer";
import { PauseMenu } from "./PauseMenu";
import { PlayerPanel } from "./PlayerPanel";

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
  // Obstacles go down first so answer tiles are placed around them.
  state = { ...state, obstacles: generateObstacles(state, GAMEPLAY_LEVELS[settings.gameplay].obstacles, rng) };
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

type FeedbackKind = "correct" | "incorrect" | "collision";

const pt =(p: { x: number; y: number }) => p.x + "," + p.y;

export function GameScreen({ settings, onBack, onFinish, onRestart }: { settings: GameSettings; onBack: () => void; onFinish: (state: GameState) => void; onRestart: () => void }) {
  const [seed] = useState(() => parseSeed(window.location.search));
  const [round] = useState(() => startRound(settings, seed));
  const mode = settings.mode;
  const [state, setState] = useState<GameState>(() =>
    mode.kind === "timed" ? { ...round.state, timeRemaining: mode.minutes * 60 } : round.state,
  );
  // Test-only: `?timeScale=N` runs the timer N times faster.
  const [timeScale] = useState(() => {
    const n = Number(new URLSearchParams(window.location.search).get("timeScale"));
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [ended, setEnded] = useState(false);
  const [count, setCount] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const tickRate = GAMEPLAY_LEVELS[settings.gameplay].cellsPerSecond;
  const [ticks, setTicks] = useState(0);
  const stateRef = useRef(state);
  const runningRef = useRef(false);
  const rngRef = useRef(seed === null ? Math.random : mulberry32(seed + 1));
  const [feedback, setFeedback] = useState({ 1: "", 2: "" });
  const [kinds, setKinds] = useState<Record<PlayerId, FeedbackKind | "">>({ 1: "", 2: "" });
  const reducedMotion = useReducedMotion();
  const seenRef = useRef({ 1: 0, 2: 0 });
  const seenCollisions = useRef({ 1: 0, 2: 0 });
  const timersRef = useRef<Partial<Record<PlayerId, ReturnType<typeof setTimeout>>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The setup form is taller than the window, so the page may arrive scrolled.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (count === null) {
      runningRef.current = !paused;
      return;
    }
    const id = setTimeout(() => setCount(count === 1 ? null : count - 1), 1000);
    return () => clearTimeout(id);
  }, [count, paused]);

  useEffect(() => {
    if (count !== null || paused || state.status === "ended" || ended) return;
    let raf = 0;
    let last = performance.now();
    let rest = 0;
    const frame = (now: number) => {
      const a = accumulate(rest, now - last, 1000 / tickRate);
      // Same cap as accumulate, so a background tab does not drain the clock.
      const frameMs = Math.min(Math.max(now - last, 0), 250);
      last = now;
      rest = a.remainderMs;
      if (stateRef.current.timeRemaining !== undefined) {
        const t = Math.max(0, stateRef.current.timeRemaining - (frameMs * timeScale) / 1000);
        stateRef.current = { ...stateRef.current, timeRemaining: t };
        setState(stateRef.current);
      }
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
          next = advance(next, mode);
          if (checkGameEnd(next, mode).ended) break;
        }
        stateRef.current = next;
        setState(next);
        setTicks((t) => t + a.ticks);
      }
      if (checkGameEnd(stateRef.current, mode).ended) {
        runningRef.current = false;
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count, paused, state.status, ended, settings.players, tickRate, mode, timeScale]);

  const onDirection = useCallback((player: PlayerId, direction: Direction) => {
    if (!runningRef.current) return;
    stateRef.current = queueDirection(stateRef.current, player, direction);
  }, []);
  useKeyboard(onDirection);

  // Only a running game pauses. Blur and hidden tabs pause too so nobody loses time.
  useEffect(() => {
    const pause = () => {
      if (!runningRef.current) return;
      runningRef.current = false;
      setPaused(true);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && pause();
    const onVisibility = () => document.visibilityState === "hidden" && pause();
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawGame(ctx, state, { hit: { 1: kinds[1] === "collision", 2: kinds[2] === "collision" } });
  }, [state, kinds]);

  // Text plus a data marker, so the cue is never colour alone.
  const show = useCallback((p: PlayerId, text: string, kind: FeedbackKind) => {
    setFeedback((f) => ({ ...f, [p]: text }));
    setKinds((k) => ({ ...k, [p]: kind }));
    clearTimeout(timersRef.current[p]);
    timersRef.current[p] = setTimeout(() => {
      setFeedback((f) => ({ ...f, [p]: "" }));
      setKinds((k) => ({ ...k, [p]: "" }));
    }, FEEDBACK_MS);
  }, []);

  useEffect(() => {
    for (const p of [1, 2] as const) {
      const r = state.results?.[p];
      if (!r || r.seq === seenRef.current[p]) continue;
      seenRef.current[p] = r.seq;
      const text = r.correct
        ? `Correct! +${CORRECT_POINTS}` + (r.bonus ? ` Streak bonus! +${r.bonus}` : "")
        :`Incorrect. The answer was ${r.answer}`;
      show(p, text, r.correct ? "correct" : "incorrect");
    }
  }, [state.results, show]);
  useEffect(() => {
    for (const p of [1, 2] as const) {
      const c = state.stats?.[p].collisions ?? 0;
      if (c === seenCollisions.current[p]) continue;
      seenCollisions.current[p] = c;
      const text = state.stats![p].lives > 0 ? "Crash! -1 life" : "Crash! Eliminated";
      show(p, text, "collision");
    }
  }, [state.stats, show]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  // Hand the final state to the parent, which swaps this screen for the results.
  const finished = ended || state.status === "ended";
  useEffect(() => {
    if (finished) onFinish(stateRef.current);
  }, [finished, onFinish]);

  // An eliminated player's snake is gone, so look snakes up by player.
  const s1 = state.snakes.find((s) => s.player === 1);
  const s2 = state.snakes.find((s) => s.player === 2);
  // The head and length hooks report where an eliminated snake was last seen, so tools can tell it stopped there.
  const lastSeen = useRef<Partial<Record<PlayerId, NonNullable<typeof s1>>>>({});
  if (s1) lastSeen.current[1] = s1;
  if (s2) lastSeen.current[2] = s2;
  const h1 = s1 ?? lastSeen.current[1];
  const h2 = s2 ?? lastSeen.current[2];
  const seg = (s?:{ segments: { x: number; y: number }[] }) => (s ? s.segments.map(pt).join(";") : "");
  return (
    <main className="game-screen">
      <div
        data-testid="game"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-phase={ended ? "ended" : paused ? "paused" : count === null ? "running" : "countdown"}
        data-tick={ticks}
        data-seed={seed ?? undefined}
        data-tick-rate={tickRate}
        data-obstacles={JSON.stringify(state.obstacles ?? [])}
        data-tiles={JSON.stringify(state.tiles ?? [])}
        data-status={state.status ?? "playing"}
        data-p1-score={state.stats?.[1].score ?? 0}
        data-p2-score={state.stats?.[2].score ?? 0}
        data-p1-correct={state.stats?.[1].correct ?? 0}
        data-p2-correct={state.stats?.[2].correct ?? 0}
        data-p1-incorrect={state.stats?.[1].incorrect ?? 0}
        data-p2-incorrect={state.stats?.[2].incorrect ?? 0}
        data-p1-head={h1 ? pt(h1.segments[0]) : ""}
        data-p2-head={h2 ? pt(h2.segments[0]) : ""}
        data-p1-length={h1?.segments.length ?? 0}
        data-p2-length={h2?.segments.length ?? 0}
        data-p1-direction={s1?.direction}
        data-p2-direction={s2?.direction}
        data-p1-segments={seg(s1)}
        data-p2-segments={seg(s2)}
      >
        <div className="game-names">
          <PlayerPanel player={1} name={settings.players[0].name} question={state.questions?.[1]?.text ?? ""}
            score={state.stats?.[1].score ?? 0}
            streak={state.stats?.[1].streak ?? 0}
            lives={state.stats?.[1].lives ?? 3}
            unlimitedLives={mode.kind === "practice"}
            eliminated={state.eliminated?.includes(1) ?? false}
            feedback={feedback[1]}
            feedbackKind={kinds[1]}
          />
          <PlayerPanel player={2} name={settings.players[1].name} question={state.questions?.[2]?.text ?? ""}
            score={state.stats?.[2].score ?? 0}
            streak={state.stats?.[2].streak ?? 0}
            lives={state.stats?.[2].lives ?? 3}
            unlimitedLives={mode.kind === "practice"}
            eliminated={state.eliminated?.includes(2) ?? false}
            feedback={feedback[2]}
            feedbackKind={kinds[2]}
          />
        </div>
        {state.timeRemaining !== undefined && <GameTimer seconds={state.timeRemaining} />}
        {mode.kind === "target" && <p className="game-info">Target: {mode.target}</p>}
        <div className="game-board">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            role="img"
            aria-label="Game board"
          />
          <Countdown value={count} />
        </div>
        {paused && !ended && (
          <PauseMenu
            practice={mode.kind === "practice"}
            onResume={() => {
              setPaused(false);
              setCount(3);
            }}
            onRestart={onRestart}
            onExit={onBack}
            onEndGame={() => setEnded(true)}
          />
        )}
      </div>
      <button type="button" onClick={onBack}>Back to menu</button>
    </main>
  );
}
