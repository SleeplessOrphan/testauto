import { describe, expect, it } from "vitest";
import { SOUND_NAMES, createSoundPlayer } from "@/lib/audio/sounds";

/*
 * Expected module: src/lib/audio/sounds.ts exporting
 *   SOUND_NAMES: readonly ["correct", "incorrect", "collision", "streak"] (any order)
 *   createSoundPlayer({ isEnabled: () => boolean, createContext?: () => AudioContext-like,
 *                       onRequest?: (name) => void }) => { play(name): void }
 * onRequest is called for each sound actually played (never when disabled).
 * The player must build sounds with the Web Audio API (oscillators) through createContext.
 */

function makeFake() {
  const calls: string[] = [];
  const param = (label: string) => ({
    value: 0,
    setValueAtTime: (...a: number[]) => void calls.push(`${label}.set:${a.join(",")}`),
    linearRampToValueAtTime: (...a: number[]) => void calls.push(`${label}.lin:${a.join(",")}`),
    exponentialRampToValueAtTime: (...a: number[]) => void calls.push(`${label}.exp:${a.join(",")}`),
    setTargetAtTime: (...a: number[]) => void calls.push(`${label}.tgt:${a.join(",")}`),
  });
  let oscillators = 0;
  const ctx = {
    currentTime: 0,
    state: "running",
    destination: {},
    resume: () => Promise.resolve(),
    createOscillator: () => {
      oscillators++;
      const o = {
        _type: "sine",
        get type() {
          return this._type;
        },
        set type(v: string) {
          this._type = v;
          calls.push(`type:${v}`);
        },
        frequency: param("freq"),
        connect: (n: unknown) => n,
        start: (...a: number[]) => void calls.push(`start:${a.join(",")}`),
        stop: (...a: number[]) => void calls.push(`stop:${a.join(",")}`),
        disconnect: () => {},
        addEventListener: () => {},
      };
      return o;
    },
    createGain: () => ({ gain: param("gain"), connect: (n: unknown) => n, disconnect: () => {} }),
  };
  return {
    createContext: () => ctx as unknown as AudioContext,
    calls,
    oscillators: () => oscillators,
  };
}

describe("sound names", () => {
  it("has exactly the four required sounds", () => {
    expect([...SOUND_NAMES].sort()).toEqual(["collision", "correct", "incorrect", "streak"]);
  });
});

describe("createSoundPlayer", () => {
  it("synthesises every sound with oscillators and reports the request", () => {
    for (const name of SOUND_NAMES) {
      const fake = makeFake();
      const requested: string[] = [];
      const p = createSoundPlayer({
        isEnabled: () => true,
        createContext: fake.createContext,
        onRequest: (n) => requested.push(n),
      });
      p.play(name);
      expect(requested).toEqual([name]);
      expect(fake.oscillators()).toBeGreaterThan(0);
      expect(fake.calls.some((c) => c.startsWith("start:"))).toBe(true);
      expect(fake.calls.some((c) => c.startsWith("stop:"))).toBe(true);
    }
  });

  it("makes the four sounds distinct from each other", () => {
    const sigs = SOUND_NAMES.map((name) => {
      const fake = makeFake();
      createSoundPlayer({ isEnabled: () => true, createContext: fake.createContext }).play(name);
      return fake.calls.join("|");
    });
    expect(new Set(sigs).size).toBe(SOUND_NAMES.length);
  });

  it("plays nothing and reports nothing when disabled", () => {
    const fake = makeFake();
    const requested: string[] = [];
    const p = createSoundPlayer({
      isEnabled: () => false,
      createContext: fake.createContext,
      onRequest: (n) => requested.push(n),
    });
    for (const name of SOUND_NAMES) p.play(name);
    expect(requested).toEqual([]);
    expect(fake.oscillators()).toBe(0);
    expect(fake.calls).toEqual([]);
  });

  it("reads the setting on every call so changes take effect immediately", () => {
    const fake = makeFake();
    const requested: string[] = [];
    let on = true;
    const p = createSoundPlayer({
      isEnabled: () => on,
      createContext: fake.createContext,
      onRequest: (n) => requested.push(n),
    });
    p.play("correct");
    on = false;
    p.play("incorrect");
    p.play("collision");
    on = true;
    p.play("streak");
    expect(requested).toEqual(["correct", "streak"]);
  });

  it("does not throw when Web Audio is unavailable", () => {
    const p = createSoundPlayer({
      isEnabled: () => true,
      createContext: () => {
        throw new Error("no audio");
      },
    });
    expect(() => p.play("correct")).not.toThrow();
  });
});
