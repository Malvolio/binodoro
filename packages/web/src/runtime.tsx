import { SoundPreferencesLive } from "./soundPreferences";
import { CompletionChimeLive } from "./chime";
import { CoffeeInvitationLive } from "./coffee";
import { MusicEngine } from "./music";
import { PanelPreferencesLive } from "./panelPreferences";
import { Context, Data, Effect, Layer, ManagedRuntime, Schema } from "effect";
import { createContext, useContext } from "react";
import { AudioEngine } from "./audio";
import {
  restore,
  serialize,
  type Preset,
  type Settings,
} from "../../shared/src/model";
import { PresetsSchema } from "../../shared/src/schema";
export class AudioError extends Data.TaggedError("AudioError")<{
  message: string;
}> {}
export class StorageError extends Data.TaggedError("StorageError")<{
  message: string;
}> {}
export class Audio extends Context.Tag("Audio")<
  Audio,
  {
    engine: AudioEngine;
    play: (s: Settings) => Effect.Effect<void, AudioError>;
    update: (s: Settings) => Effect.Effect<void>;
    setVolume: (volume: number) => Effect.Effect<void>;
    pause: Effect.Effect<void>;
    stop: Effect.Effect<void>;
  }
>() {}
export const AudioLive = Layer.scoped(
  Audio,
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => new AudioEngine()),
      (engine) => Effect.promise(() => engine.dispose()),
    ),
    (engine) => ({
      engine,
      play: (s: Settings) =>
        Effect.tryPromise({
          try: () => engine.play(s),
          catch: () =>
            new AudioError({
              message:
                "Audio could not start. Check your browser sound permissions and try Play again.",
            }),
        }),
      update: (s: Settings) => Effect.sync(() => engine.update(s)),
      setVolume: (volume: number) =>
        Effect.sync(() => engine.setVolume(volume)),
      pause: Effect.sync(engine.pause),
      stop: Effect.sync(engine.stop),
    }),
  ),
);
export class Music extends Context.Tag("Music")<
  Music,
  {
    engine: MusicEngine;
    play: Effect.Effect<void, AudioError>;
    pause: Effect.Effect<void>;
    stop: Effect.Effect<void>;
    setVolume: (volume: number) => Effect.Effect<void>;
  }
>() {}
export const MusicLive = Layer.scoped(
  Music,
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => new MusicEngine()),
      (engine) => Effect.sync(engine.dispose),
    ),
    (engine) => ({
      engine,
      play: Effect.tryPromise({
        try: engine.play,
        catch: () =>
          new AudioError({
            message:
              "Break music could not start. Check your browser sound permissions and music files, then press Play sound.",
          }),
      }),
      pause: Effect.sync(engine.pause),
      stop: Effect.sync(engine.stop),
      setVolume: (volume: number) =>
        Effect.sync(() => engine.setVolume(volume)),
    }),
  ),
);
export class Presets extends Context.Tag("Presets")<
  Presets,
  {
    load: Effect.Effect<Preset[], StorageError>;
    save: (p: Preset[]) => Effect.Effect<void, StorageError>;
  }
>() {}
export const PresetsLive = Layer.succeed(Presets, {
  load: Effect.try({
    try: () => restore(localStorage.getItem("binaural-lab-presets-v1")),
    catch: () =>
      new StorageError({
        message:
          "Browser storage is unavailable. Presets will last for this session.",
      }),
  }),
  save: (p) =>
    Schema.decodeUnknown(PresetsSchema)(p).pipe(
      Effect.mapError(
        () => new StorageError({ message: "Preset data is invalid." }),
      ),
      Effect.flatMap(() =>
        Effect.try({
          try: () =>
            localStorage.setItem("binaural-lab-presets-v1", serialize(p)),
          catch: () =>
            new StorageError({
              message:
                "Could not save presets. Browser storage may be full or blocked.",
            }),
        }),
      ),
    ),
});
export const AppLayer = Layer.mergeAll(
  AudioLive,
  CompletionChimeLive,
  MusicLive,
  CoffeeInvitationLive,
  PresetsLive,
  PanelPreferencesLive,
  SoundPreferencesLive,
);
export const makeRuntime = () => ManagedRuntime.make(AppLayer);
export type AppRuntime = ReturnType<typeof makeRuntime>;
export const RuntimeContext = createContext<AppRuntime | null>(null);
export const useRuntime = () => {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("Runtime provider is missing");
  return runtime;
};
