export const SOUND_NAMES = ["correct", "incorrect", "collision", "streak"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

interface Note {
  freq: number;
  /** Optional glide target in Hz. */
  to?: number;
  at: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

// Each sound differs in pitch, shape and waveform so players can tell them apart without looking.
const NOTES: Record<SoundName, Note[]> = {
  correct: [
    { freq: 660, at: 0, dur: 0.1, type: "sine", gain: 0.2 },
    { freq: 880, at: 0.1, dur: 0.14, type: "sine", gain: 0.2 },
  ],
  incorrect: [{ freq: 220, to: 140, at: 0, dur: 0.3, type: "sawtooth", gain: 0.15 }],
  collision: [{ freq: 110, to: 40, at: 0, dur: 0.35, type: "square", gain: 0.2 }],
  streak: [
    { freq: 523, at: 0, dur: 0.08, type: "triangle", gain: 0.2 },
    { freq: 659, at: 0.08, dur: 0.08, type: "triangle", gain: 0.2 },
    { freq: 784, at: 0.16, dur: 0.08, type: "triangle", gain: 0.2 },
    { freq: 1047, at: 0.24, dur: 0.2, type: "triangle", gain: 0.2 },
  ],
};

export interface SoundPlayerOptions {
  /** Read on every call so a settings change applies immediately. */
  isEnabled: () => boolean;
  createContext?: () => AudioContext;
  /** Called for each sound actually played; lets tests observe requests without audio output. */
  onRequest?: (name: SoundName) => void;
}

const defaultContext = () => new AudioContext();

export function createSoundPlayer({ isEnabled, createContext = defaultContext, onRequest }: SoundPlayerOptions) {
  let ctx: AudioContext | null = null;
  return {
    play(name: SoundName): void {
      if (!isEnabled()) return;
      onRequest?.(name);
      try {
        ctx ??= createContext();
        if (ctx.state === "suspended") void ctx.resume();
        const t0 = ctx.currentTime;
        for (const n of NOTES[name]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = n.type;
          osc.frequency.setValueAtTime(n.freq, t0 + n.at);
          if (n.to) osc.frequency.linearRampToValueAtTime(n.to, t0 + n.at + n.dur);
          gain.gain.setValueAtTime(n.gain, t0 + n.at);
          gain.gain.linearRampToValueAtTime(0, t0 + n.at + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0 + n.at);
          osc.stop(t0 + n.at + n.dur);
        }
      } catch {
        // No Web Audio (or blocked): the visual feedback still covers every event.
        ctx = null;
      }
    },
  };
}
