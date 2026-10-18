import { Schema } from "effect";
const range = (min: number, max: number) =>
  Schema.Number.pipe(Schema.finite(), Schema.between(min, max));
export const PresetId = Schema.String.pipe(Schema.brand("PresetId"));
const sweep = (min: number, max: number) =>
  Schema.Struct({
    enabled: Schema.Boolean,
    start: range(min, max),
    end: range(min, max),
    duration: range(1, 600),
    log: Schema.Boolean,
    repeat: Schema.Boolean,
    pingpong: Schema.Boolean,
  });
export const SettingsSchema = Schema.Struct({
  carrier: range(40, 1500),
  beat: range(0, 100),
  direction: Schema.Literal(1, -1),
  balance: range(-100, 100),
  wave: Schema.Literal("sine", "triangle", "square", "sawtooth"),
  noise: Schema.Literal("off", "white", "pink", "brown"),
  noiseVolume: range(0, 100),
  phase: range(0, 360),
  swap: Schema.Boolean,
  mode: Schema.Literal("binaural", "mono", "isochronic"),
  am: Schema.Boolean,
  amFrequency: range(0.1, 100),
  amDepth: range(0, 100),
  duty: range(1, 99),
  pulseDepth: range(0, 100),
  beatSweep: sweep(0, 100),
  carrierSweep: sweep(40, 1500),
}).pipe(
  Schema.filter((s) => s.carrier - s.beat / 2 >= 1, {
    message: () => "Both ear frequencies must be positive",
  }),
);
export const PresetName = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(80),
);
export const PresetsSchema = Schema.Array(
  Schema.Struct({ id: PresetId, name: PresetName, settings: SettingsSchema }),
);
