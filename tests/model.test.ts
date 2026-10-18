import { describe, expect, it } from "vitest";
import {
  assignment,
  builtins,
  clamp,
  defaults,
  directFrequency,
  frequencies,
  normalize,
  restore,
  routing,
  score,
  serialize,
  sweepValue,
} from "../packages/shared/src/model";
describe("Frequency model", () => {
  it("computes independent 215 and 225 Hz tones", () =>
    expect(frequencies(defaults)).toEqual([215, 225]));
  it("synchronizes a directly edited ear with midpoint and absolute beat", () => {
    const s = directFrequency(defaults, 0, 230);
    expect(s.carrier).toBe(227.5);
    expect(s.beat).toBe(5);
    expect(s.direction).toBe(-1);
    expect(frequencies(s)).toEqual([230, 225]);
  });
  it("constrains direct edits without moving the other ear", () => {
    for (const carrier of [40, 220, 1500])
      for (const beat of [0, 10, 100])
        for (const ear of [0, 1] as const)
          for (const v of [-100, 1, 100, 1500, Infinity]) {
            const s = normalize({ ...defaults, carrier, beat }),
              next = directFrequency(s, ear, v);
            expect(next.carrier).toBeGreaterThanOrEqual(40);
            expect(next.carrier).toBeLessThanOrEqual(1500);
            expect(next.beat).toBeLessThanOrEqual(100);
            expect(Math.min(...frequencies(next))).toBeGreaterThanOrEqual(1);
            expect(frequencies(next)[1 - ear]).toBe(frequencies(s)[1 - ear]);
          }
  });
  it("handles invalid numbers and boundaries", () => {
    expect(clamp(NaN, 40, 1500)).toBe(40);
    expect(
      normalize({ ...defaults, beat: 101, noiseVolume: -1, carrier: 9999 })
        .beat,
    ).toBe(100);
    expect(normalize({ ...defaults, noiseVolume: -1 }).noiseVolume).toBe(0);
  });
});
describe("Audio-clock sweep interpolation", () => {
  const sweep = {
    ...defaults.beatSweep,
    enabled: true,
    start: 2,
    end: 20,
    duration: 10,
  };
  it("interpolates linearly and clamps endpoints", () => {
    expect(sweepValue(sweep, 5)).toBe(11);
    expect(sweepValue(sweep, 20)).toBe(20);
    expect(sweepValue(sweep, -1)).toBe(2);
  });
  it("uses logarithmic interpolation with linear fallback at zero", () => {
    expect(
      sweepValue({ ...sweep, start: 1, end: 100, log: true }, 5),
    ).toBeCloseTo(10);
    expect(sweepValue({ ...sweep, start: 0, log: true }, 5)).toBe(10);
  });
  it("repeats and reverses ping-pong sweeps", () => {
    expect(sweepValue({ ...sweep, repeat: true }, 12)).toBeCloseTo(5.6);
    expect(
      sweepValue({ ...sweep, repeat: true, pingpong: true }, 12),
    ).toBeCloseTo(16.4);
  });
});
describe("Validated preset persistence", () => {
  it("excludes master volume and restores legacy presets without their stored volume", () => {
    expect(serialize(builtins)).not.toContain('"volume"');
    const legacy = builtins.map((p) => ({
      ...p,
      settings: { ...p.settings, volume: 99 },
    }));
    expect(restore(JSON.stringify(legacy))).toEqual(builtins);
  });
  it("roundtrips all defaults without changing parameters", () =>
    expect(restore(serialize(builtins))).toEqual(builtins));
  it("rejects corrupt, partial, and out-of-range persisted data", () => {
    for (const raw of [
      "not json",
      "null",
      "{}",
      JSON.stringify([{ id: "x", name: "x", settings: {} }]),
      serialize([
        { ...builtins[0], settings: { ...defaults, carrier: 99999 } },
      ]),
    ])
      expect(restore(raw)).toEqual([]);
  });
});
describe("Stereo matrix", () => {
  it("isolates binaural channels", () =>
    expect(routing("binaural", false)).toEqual([
      [1, 0],
      [0, 1],
    ]));
  it("swaps channels", () =>
    expect(routing("binaural", true)).toEqual([
      [0, 1],
      [1, 0],
    ]));
  it("mixes equal half-amplitude signals for mono", () =>
    expect(routing("mono", false)).toEqual([
      [0.5, 0.5],
      [0.5, 0.5],
    ]));
});
describe("Blind trials", () => {
  it("randomizes a bijective assignment in both directions", () => {
    expect(assignment(() => 0.2)).toEqual({ X: "A", Y: "B" });
    expect(assignment(() => 0.9)).toEqual({ X: "B", Y: "A" });
  });
  it("scores repeated trials and empty sessions", () => {
    expect(score([]).accuracy).toBe(0);
    expect(
      score([
        { guess: "A", actual: "A" },
        { guess: "B", actual: "A" },
      ]),
    ).toEqual({ count: 2, correct: 1, accuracy: 50 });
  });
});
