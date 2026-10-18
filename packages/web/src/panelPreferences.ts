import { Context, Effect, Layer, Schema } from "effect";

const PreferencesSchema = Schema.parseJson(
  Schema.Record({ key: Schema.String, value: Schema.Boolean }),
);
const storageKey = "binaural-lab-panels-v1";
export const initiallyCollapsed = new Set([
  "Stereo waveform",
  "Frequency relationship",
  "Beat relationship",
  "Blind comparison",
]);
export class PanelPreferences extends Context.Tag("PanelPreferences")<
  PanelPreferences,
  {
    get: (label: string) => Effect.Effect<boolean>;
    set: (label: string, collapsed: boolean) => Effect.Effect<void>;
  }
>() {}
export const PanelPreferencesLive = Layer.effect(
  PanelPreferences,
  Effect.gen(function* () {
    let preferences = yield* Effect.try(
      () => localStorage.getItem(storageKey) ?? "{}",
    ).pipe(
      Effect.flatMap(Schema.decodeUnknown(PreferencesSchema)),
      Effect.catchAll(() => Effect.succeed({} as Record<string, boolean>)),
    );
    return {
      get: (label: string) =>
        Effect.sync(
          () =>
            preferences[label] ??
            (label === "Saved sounds"
              ? preferences["Experiment library"]
              : undefined) ??
            initiallyCollapsed.has(label),
        ),
      set: (label: string, collapsed: boolean) =>
        Effect.gen(function* () {
          preferences = { ...preferences, [label]: collapsed };
          yield* Effect.try(() =>
            localStorage.setItem(storageKey, JSON.stringify(preferences)),
          ).pipe(Effect.catchAll(() => Effect.void));
        }),
    };
  }),
);
