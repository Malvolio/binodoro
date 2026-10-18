import { Either, Schema } from "effect";
import { PresetId, PresetsSchema } from "./schema";
export type Sweep = {
  enabled: boolean;
  start: number;
  end: number;
  duration: number;
  log: boolean;
  repeat: boolean;
  pingpong: boolean;
};
export type Settings = {
  carrier: number;
  beat: number;
  direction: 1 | -1;
  balance: number;
  wave: OscillatorType;
  noise: "off" | "white" | "pink" | "brown";
  noiseVolume: number;
  phase: number;
  swap: boolean;
  mode: "binaural" | "mono" | "isochronic";
  am: boolean;
  amFrequency: number;
  amDepth: number;
  duty: number;
  pulseDepth: number;
  beatSweep: Sweep;
  carrierSweep: Sweep;
};
export const defaultMasterVolume = 15;
export const defaults: Settings = {
  carrier: 220,
  beat: 10,
  direction: 1,
  balance: 0,
  wave: "sine",
  noise: "off",
  noiseVolume: 10,
  phase: 0,
  swap: false,
  mode: "binaural",
  am: false,
  amFrequency: 4,
  amDepth: 30,
  duty: 50,
  pulseDepth: 100,
  beatSweep: {
    enabled: false,
    start: 2,
    end: 20,
    duration: 60,
    log: false,
    repeat: false,
    pingpong: false,
  },
  carrierSweep: {
    enabled: false,
    start: 220,
    end: 440,
    duration: 60,
    log: false,
    repeat: false,
    pingpong: false,
  },
};
export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
export const frequencies = (s: Settings) =>
  [
    s.carrier - (s.direction * s.beat) / 2,
    s.carrier + (s.direction * s.beat) / 2,
  ] as const;
export const directFrequency = (
  s: Settings,
  ear: 0 | 1,
  value: number,
): Settings => {
  s = normalize(s);
  const f = [...frequencies(s)];
  f[ear] = clamp(value, 1, 1550);
  const other = f[1 - ear];
  f[ear] = clamp(
    f[ear],
    Math.max(1, other - 100, 80 - other),
    Math.min(1550, other + 100, 3000 - other),
  );
  return {
    ...s,
    carrier: (f[0] + f[1]) / 2,
    beat: Math.abs(f[1] - f[0]),
    direction: f[1] >= f[0] ? 1 : -1,
  };
};
export const sweepValue = (s: Sweep, elapsed: number) => {
  let p = Math.max(0, elapsed) / s.duration;
  if (s.repeat) {
    const cycle = Math.floor(p);
    p %= 1;
    if (s.pingpong && cycle % 2) p = 1 - p;
  } else p = Math.min(1, p);
  return s.log && s.start > 0 && s.end > 0
    ? s.start * Math.pow(s.end / s.start, p)
    : s.start + (s.end - s.start) * p;
};
export const routing = (mode: Settings["mode"], swap: boolean) =>
  mode === "mono"
    ? [
        [0.5, 0.5],
        [0.5, 0.5],
      ]
    : swap
      ? [
          [0, 1],
          [1, 0],
        ]
      : [
          [1, 0],
          [0, 1],
        ];
export type Preset = {
  id: typeof PresetId.Type;
  name: string;
  settings: Settings;
};
export const builtins: Preset[] = [
  ["Slow delta", 200, 2],
  ["Theta", 220, 6],
  ["Alpha", 220, 10],
  ["Beta", 250, 20],
  ["Gamma", 300, 40],
  ["Very slow beat", 200, 0.5],
  ["High carrier", 800, 10],
  ["Zero beat · control", 220, 0],
].map(([name, carrier, beat], i) => ({
  id: PresetId.make(`default-${i}`),
  name: String(name),
  settings: { ...defaults, carrier: Number(carrier), beat: Number(beat) },
}));
export const serialize = (p: Preset[]) => JSON.stringify(p);
export const restore = (raw: string | null): Preset[] => {
  const result = Schema.decodeUnknownEither(Schema.parseJson(PresetsSchema))(
    raw ?? "[]",
  );
  return Either.isRight(result)
    ? result.right.map((p) => ({
        ...p,
        settings: {
          ...p.settings,
          beatSweep: { ...p.settings.beatSweep },
          carrierSweep: { ...p.settings.carrierSweep },
        },
      }))
    : [];
};
export const normalize = (raw: Partial<Settings> | null): Settings => {
  const s = { ...defaults, ...raw };
  return {
    ...s,
    carrier: clamp(s.carrier, 40, 1500),
    beat: clamp(s.beat, 0, Math.min(100, 2 * (clamp(s.carrier, 40, 1500) - 1))),
    balance: clamp(s.balance, -100, 100),
    phase: clamp(s.phase, 0, 360),
    noiseVolume: clamp(s.noiseVolume, 0, 100),
    amFrequency: clamp(s.amFrequency, 0.1, 100),
    amDepth: clamp(s.amDepth, 0, 100),
    duty: clamp(s.duty, 1, 99),
    pulseDepth: clamp(s.pulseDepth, 0, 100),
    wave: ["sine", "triangle", "square", "sawtooth"].includes(s.wave)
      ? s.wave
      : "sine",
    mode: ["binaural", "mono", "isochronic"].includes(s.mode)
      ? s.mode
      : "binaural",
    noise: ["off", "white", "pink", "brown"].includes(s.noise)
      ? s.noise
      : "off",
    beatSweep: cleanSweep(s.beatSweep, 0, 100),
    carrierSweep: cleanSweep(s.carrierSweep, 40, 1500),
  };
};
const cleanSweep = (s: Sweep, min: number, max: number): Sweep => ({
  ...s,
  start: clamp(s.start, min, max),
  end: clamp(s.end, min, max),
  duration: clamp(s.duration, 1, 600),
});
export const assignment = (random = Math.random) =>
  random() < 0.5
    ? { X: "A" as const, Y: "B" as const }
    : { X: "B" as const, Y: "A" as const };
export const score = (trials: { guess: string; actual: string }[]) => ({
  count: trials.length,
  correct: trials.filter((t) => t.guess === t.actual).length,
  accuracy: trials.length
    ? (100 * trials.filter((t) => t.guess === t.actual).length) / trials.length
    : 0,
});
