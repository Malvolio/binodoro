import { it, expect } from "@effect/vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Audio, Presets } from "../packages/web/src/runtime";
import { AudioEngine } from "../packages/web/src/audio";
import { builtins } from "../packages/shared/src/model";
it.effect(
  "initializes a shared audio service once and releases it at runtime disposal",
  () =>
    Effect.gen(function* () {
      let acquired = 0,
        released = 0;
      const testAudio = Layer.scoped(
        Audio,
        Effect.map(
          Effect.acquireRelease(
            Effect.sync(() => {
              acquired++;
              return new AudioEngine();
            }),
            () =>
              Effect.sync(() => {
                released++;
              }),
          ),
          (engine) => ({
            engine,
            play: () => Effect.void,
            update: () => Effect.void,
            setVolume: () => Effect.void,
            pause: Effect.void,
            stop: Effect.void,
          }),
        ),
      );
      const testStorage = Layer.succeed(Presets, {
        load: Effect.succeed(builtins),
        save: () => Effect.void,
      });
      const runtime = ManagedRuntime.make(
        Layer.mergeAll(testAudio, testStorage),
      );
      const first = yield* Effect.promise(() => runtime.runPromise(Audio));
      const second = yield* Effect.promise(() => runtime.runPromise(Audio));
      expect(first.engine).toBe(second.engine);
      expect(acquired).toBe(1);
      const presets = yield* Effect.promise(() =>
        runtime.runPromise(Effect.flatMap(Presets, (p) => p.load)),
      );
      expect(presets).toEqual(builtins);
      yield* Effect.promise(() => runtime.dispose());
      expect(released).toBe(1);
    }),
);
