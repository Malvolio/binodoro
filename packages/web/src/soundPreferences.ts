import { Context, Data, Effect, Layer, Schema } from "effect";
import { defaults, type Settings } from "../../shared/src/model";
import { SettingsSchema } from "../../shared/src/schema";

const SoundPreferencesSchema = Schema.Struct({
  muted: Schema.Boolean,
  preset: Schema.String,
  settings: SettingsSchema,
});
type Preferences = { muted: boolean; preset: string; settings: Settings };
const jsonSchema = Schema.parseJson(SoundPreferencesSchema);
const storageKey = "binaural-lab-sound-v1";
class SoundPreferencesError extends Data.TaggedError("SoundPreferencesError")<{
  message: string;
}> {}
export class SoundPreferences extends Context.Tag("SoundPreferences")<
  SoundPreferences,
  {
    load: Effect.Effect<Preferences>;
    save: (
      preferences: Preferences,
    ) => Effect.Effect<void, SoundPreferencesError>;
  }
>() {}
export const SoundPreferencesLive = Layer.succeed(SoundPreferences, {
  load: Effect.try(() => localStorage.getItem(storageKey)).pipe(
    Effect.flatMap(Schema.decodeUnknown(jsonSchema)),
    Effect.catchAll(() =>
      Effect.succeed({ muted: false, preset: "default-2", settings: defaults }),
    ),
  ),
  save: (preferences) =>
    Schema.decodeUnknown(SoundPreferencesSchema)(preferences).pipe(
      Effect.flatMap(Schema.encode(jsonSchema)),
      Effect.flatMap((json) =>
        Effect.try(() => localStorage.setItem(storageKey, json)),
      ),
      Effect.mapError(
        () =>
          new SoundPreferencesError({
            message:
              "Could not save sound preferences. Browser storage may be full or blocked.",
          }),
      ),
    ),
});
