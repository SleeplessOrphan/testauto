"use client";

import { useState } from "react";
import { DIFFICULTY_OPTIONS, TOPIC_OPTIONS, defaultName, defaultPlayerForm } from "@/lib/settings/defaults";
import type { GameSettings, PlayerForm } from "@/lib/settings/types";
import { DEFAULT_GAMEPLAY, GAMEPLAY_LEVELS, type GameplayDifficulty } from "@/lib/settings/gameplay";
import { buildSettings, type SetupErrors } from "@/lib/settings/validate";
import type { GameMode } from "@/lib/game/modes";
import { ScreenHeading } from "./ScreenHeading";

const MODES: [GameMode["kind"], string][] = [
  ["timed", "Timed"],
  ["survival", "Survival"],
  ["target", "Target Score"],
  ["practice", "Practice"],
];

type Forms = [PlayerForm, PlayerForm];

export function GameSetup({ onBack, onStart }: { onBack: () => void; onStart: (s: GameSettings) => void }) {
  const [forms, setForms] = useState<Forms>(() => [defaultPlayerForm(), defaultPlayerForm()]);
  const [gameplay, setGameplay] = useState<GameplayDifficulty>(DEFAULT_GAMEPLAY);
  const [kind, setKind] = useState<GameMode["kind"]>("timed");
  const [minutes, setMinutes] = useState<1 | 3 | 5>(3);
  const [target, setTarget] = useState<100 | 200 | 500>(200);
  const [errors, setErrors] = useState<SetupErrors>([null, null]);

  const update = (i: 0 | 1, patch: Partial<PlayerForm>) => {
    setForms((prev) => {
      const next: Forms = [prev[0], prev[1]];
      next[i] = { ...next[i], ...patch };
      return next;
    });
    if (patch.topics?.length) {
      setErrors((prev) => (i === 0 ? [null, prev[1]] : [prev[0], null]));
    }
  };

  const mode: GameMode =
    kind === "timed" ? { kind, minutes } : kind === "target" ? { kind, target } : { kind };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildSettings(forms, gameplay, mode);
    if (result.ok) onStart(result.settings);
    else setErrors(result.errors);
  };

  return (
    <main>
      <ScreenHeading level={2}>Game setup</ScreenHeading>
      <form onSubmit={submit} noValidate>
        {([0, 1] as const).map((i) => {
          const f = forms[i];
          const errorId = `p${i}-topics-error`;
          return (
            <fieldset key={i}>
              <legend>{defaultName(i)}</legend>
              <p>
                <label htmlFor={`p${i}-name`}>Name</label>{" "}
                <input
                  id={`p${i}-name`}
                  type="text"
                  value={f.name}
                  autoComplete="off"
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </p>
              <fieldset>
                <legend>Maths difficulty</legend>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <label key={d.value}>
                    <input
                      type="radio"
                      name={`p${i}-difficulty`}
                      checked={f.difficulty === d.value}
                      onChange={() => update(i, { difficulty: d.value })}
                    />{" "}
                    {d.label}
                  </label>
                ))}
              </fieldset>
              <fieldset aria-describedby={errors[i] ? errorId : undefined}>
                <legend>Topics</legend>
                {TOPIC_OPTIONS.map((t) => (
                  <label key={t.value}>
                    <input
                      type="checkbox"
                      checked={f.topics.includes(t.value)}
                      aria-invalid={errors[i] ? true : undefined}
                      aria-describedby={errors[i] ? errorId : undefined}
                      onChange={(e) =>
                        update(i, {
                          topics: e.target.checked ? [...f.topics, t.value] : f.topics.filter((x) => x !== t.value),
                        })
                      }
                    />{" "}
                    {t.label}
                  </label>
                ))}
                {errors[i] && (
                  <p id={errorId} role="alert">
                    {errors[i]}
                  </p>
                )}
              </fieldset>
            </fieldset>
          );
        })}
        <fieldset>
          <legend>Gameplay difficulty</legend>
          {(Object.keys(GAMEPLAY_LEVELS) as GameplayDifficulty[]).map((g) => (
            <label key={g}>
              <input type="radio" name="gameplay" checked={gameplay === g} onChange={() => setGameplay(g)} />{" "}
              {GAMEPLAY_LEVELS[g].label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Game mode</legend>
          {MODES.map(([k, label]) => (
            <label key={k}>
              <input type="radio" name="mode" checked={kind === k} onChange={() => setKind(k)} /> {label}
            </label>
          ))}
        </fieldset>
        {kind === "timed" && (
          <fieldset>
            <legend>Duration</legend>
            {([1, 3, 5] as const).map((m) => (
              <label key={m}>
                <input type="radio" name="duration" checked={minutes === m} onChange={() => setMinutes(m)} />
                <span>{`${m} ${m === 1 ? "minute" : "minutes"}`}</span>
              </label>
            ))}
          </fieldset>
        )}
        {kind === "target" && (
          <fieldset>
            <legend>Target score</legend>
            {([100, 200, 500] as const).map((t) => (
              <label key={t}>
                <input type="radio" name="target" checked={target === t} onChange={() => setTarget(t)} /> {t}
              </label>
            ))}
          </fieldset>
        )}
        <button type="submit">Start Game</button>
        <button type="button" onClick={onBack}>Back</button>
      </form>
    </main>
  );
}
