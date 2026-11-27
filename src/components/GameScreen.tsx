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
import { Countdown } from "./Countdown";

const pt = (p: { x: number; y: number }) => p.x + "," + p.y;

export function GameScreen({ settings, onBack }: { settings: GameSettings; onBack: () => void }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [count, setCount] = useState<number | null>(3);
  const [ticks, setTicks] = useState(0);
  const [seed] = useState(() => parseSeed(window.location.search));
  const stateRef = useRef(state);
  const runningRef = useRef(false);
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
    if (count !== null) return;
    let raf = 0;
    let last = performance.now();
    let rest = 0;
    const frame = (now: number) => {
      const a = accumulate(rest, now - last);
      last = now;
      rest = a.remainderMs;
      if (a.ticks > 0) {
        let next = stateRef.current;
        for (let i = 0; i < a.ticks; i++) next = advance(next);
        stateRef.current = next;
        setState(next);
        setTicks((t) => t + a.ticks);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  const onDirection = useCallback((player: PlayerId, direction: Direction) => {
    if (!runningRef.current) return;
    stateRef.current = queueDirection(stateRef.current, player, direction);
  }, []);
  useKeyboard(onDirection);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawGame(ctx, state);
  }, [state]);

  const [s1, s2] = state.snakes;
  return (
    <main className="game-screen">
      <div
        data-testid="game"
        data-phase={count === null ? "running" : "countdown"}
        data-tick={ticks}
        data-seed={seed ?? undefined}
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
          <span className="name-p1">{settings.players[0].name}</span>
          <span className="name-p2">{settings.players[1].name}</span>
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
        </div>
      </div>
      <button type="button" onClick={onBack}>Back to menu</button>
    </main>
  );
}
