import { SoundPreferences } from "./soundPreferences";
import { CompletionChime } from "./chime";
import { CoffeeDialog } from "./CoffeeDialog";
import { useCoffeeInvitation } from "./useCoffeeInvitation";
import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Atom } from "@effect-atom/atom";
import { useAtom } from "@effect-atom/atom-react";
import { Effect } from "effect";
import {
  defaults,
  defaultMasterVolume,
  normalize,
  type Settings,
  type Preset,
} from "../../shared/src/model";
import { Audio, Music, Presets, useRuntime } from "./runtime";
import type { AudioEngine } from "./audio";
import { usePomodoro } from "./usePomodoro";
const settingsAtom = Atom.make<Settings>(defaults);
const volumeAtom = Atom.make(defaultMasterVolume);
const playingAtom = Atom.make(false);
const mutedAtom = Atom.make(false);
const customAtom = Atom.make<Preset[]>([]);
const presetAtom = Atom.make("default-2");
const useSessionController = () => {
  const runtime = useRuntime(),
    [settings, setSettings] = useAtom(settingsAtom),
    [masterVolume, setMasterVolume] = useAtom(volumeAtom),
    [preferencesReady, setPreferencesReady] = useState(false),
    [engine, setEngine] = useState<AudioEngine | null>(null),
    [playing, setPlaying] = useAtom(playingAtom),
    [muted, setMuted] = useAtom(mutedAtom),
    [studioPreview, setStudioPreview] = useState(false),
    [blindActive, setBlindActive] = useState(false),
    [custom, setCustom] = useAtom(customAtom),
    [preset, setPreset] = useAtom(presetAtom),
    [windowMs, setWindowMs] = useState(25),
    [error, setError] = useState(""),
    [elapsed, setElapsed] = useState(0),
    [live, setLive] = useState({ carrier: 220, beat: 10 });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const pomodoro = usePomodoro();
  const coffee = useCoffeeInvitation(pomodoro.timer);
  const previousTimer = useRef(pomodoro.timer);
  useEffect(() => {
    const previous = previousTimer.current,
      current = pomodoro.timer;
    if (current.completions > previous.completions && !muted) {
      runtime.runFork(
        Effect.flatMap(CompletionChime, (chime) => chime.play(masterVolume)),
      );
    }
    previousTimer.current = current;
  }, [pomodoro.timer.completions]);

  const timerRef = useRef(pomodoro.timer);
  timerRef.current = pomodoro.timer;
  const phaseRef = useRef(pomodoro.timer.phase);
  phaseRef.current = pomodoro.timer.phase;
  const playbackRevision = useRef(0);
  const settingsRef = useRef(settings);
  const auditionRef = useRef<Settings>(settings);
  settingsRef.current = settings;
  const run = <A, E extends { message: string }>(
    program: Effect.Effect<A, E, Audio | Music | Presets>,
    success?: (a: A) => void,
  ) => {
    void runtime.runPromise(
      program.pipe(
        Effect.match({
          onFailure: (e) => setError(e.message),
          onSuccess: (a) => {
            success?.(a);
          },
        }),
      ),
    );
  };
  useEffect(() => {
    let mounted = true;
    void runtime.runPromise(
      Effect.gen(function* () {
        const audio = yield* Audio;
        const music = yield* Music;
        const presets = yield* Presets;
        yield* Effect.sync(() => {
          if (mounted) {
            setEngine(audio.engine);
            audio.engine.onState = setPlaying;
            music.engine.onState = setPlaying;
          }
        });
        const saved = yield* presets.load.pipe(
          Effect.catchAll((e) =>
            Effect.sync(() => {
              if (mounted) setError(e.message);
              return [] as Preset[];
            }),
          ),
        );
        const preferences = yield* (yield* SoundPreferences).load;
        if (mounted) {
          setCustom(saved);
          setMuted(preferences.muted);
          setSettings(normalize(preferences.settings));
          setPreset(preferences.preset);
          setPreferencesReady(true);
        }
      }),
    );
    return () => {
      mounted = false;
    };
  }, [runtime]);
  useEffect(() => {
    if (!preferencesReady) return;
    runtime.runFork(
      Effect.flatMap(SoundPreferences, (service) =>
        service.save({ muted, preset, settings }),
      ).pipe(
        Effect.catchAll((error) => Effect.sync(() => setError(error.message))),
      ),
    );
  }, [runtime, preferencesReady, muted, preset, settings]);
  useEffect(() => {
    run(Effect.flatMap(Audio, (a) => a.update(settings)));
  }, [settings]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (engine?.playing) {
        setElapsed(engine.elapsed());
        const s = engine.current();
        if (s) setLive({ carrier: s.carrier, beat: s.beat });
      }
    }, 100);
    return () => clearInterval(id);
  }, [engine]);
  const patch = (p: Partial<Settings>) => {
    setBlindActive(false);
    setSettings((s) => normalize({ ...s, ...p }));
    setPreset("");
  };
  const startPlayback = (s = settingsRef.current, preview = false) => {
    if (!preview && !timerRef.current.running) return;
    const revision = ++playbackRevision.current;
    runtime.runFork(
      Effect.gen(function* () {
        const audio = yield* Audio;
        const music = yield* Music;
        yield* audio.pause;
        yield* music.pause;
        if (preview || phaseRef.current === "focus") yield* audio.play(s);
        else yield* music.play;
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            if (revision === playbackRevision.current) {
              setPlaying(false);
              setError(error.message);
            }
          },
          onSuccess: () => {
            if (revision === playbackRevision.current) {
              setPlaying(true);
              setError("");
            }
          },
        }),
      ),
    );
  };

  const pausePlayback = () => {
    playbackRevision.current++;
    run(
      Effect.gen(function* () {
        yield* (yield* Audio).pause;
        yield* (yield* Music).pause;
      }),
      () => setPlaying(false),
    );
  };
  const play = (s = settingsRef.current) => {
    setMuted(false);
    setStudioPreview(true);
    startPlayback(s, true);
  };
  const pauseSound = () => {
    setMuted(true);
    pausePlayback();
  };
  const toggleMute = () => setMuted((value) => !value);
  const stopSound = () => {
    setMuted(true);
    playbackRevision.current++;
    run(
      Effect.gen(function* () {
        yield* (yield* Audio).stop;
        yield* (yield* Music).stop;
      }),
      () => {
        setPlaying(false);
        setElapsed(0);
        setBlindActive(false);
      },
    );
  };
  const changeVolume = (volume: number) => {
    setMasterVolume(volume);
    run(
      Effect.gen(function* () {
        yield* (yield* Audio).setVolume(volume);
        yield* (yield* Music).setVolume(volume);
      }),
    );
  };
  useEffect(() => {
    if (pathname === "/controls" && studioPreview && !muted) return;
    if (pomodoro.timer.running && !muted)
      startPlayback(settingsRef.current, pathname === "/controls");
    else pausePlayback();
  }, [
    pomodoro.timer.running,
    pomodoro.timer.phase,
    pomodoro.timer.sessionId,
    muted,
    pathname,
    studioPreview,
  ]);
  const apply = (s: Settings) => {
    setBlindActive(false);
    setSettings({ ...s });
  };
  const persist = (p: Preset[]) => {
    setCustom(p);
    run(Effect.flatMap(Presets, (service) => service.save(p)));
  };
  useEffect(() => {
    if (pathname === "/") setStudioPreview(false);
    if (pathname === "/" && blindActive) {
      setBlindActive(false);
      run(Effect.flatMap(Audio, (a) => a.update(settingsRef.current)));
    }
  }, [pathname, blindActive]);
  return {
    settings,
    setSettings,
    masterVolume,
    setMasterVolume,
    engine,
    playing,
    muted,
    toggleMute,
    setPlaying,
    blindActive,
    setBlindActive,
    custom,
    setCustom,
    preset,
    setPreset,
    windowMs,
    setWindowMs,
    error,
    setError,
    elapsed,
    setElapsed,
    live,
    settingsRef,
    auditionRef,
    run,
    patch,
    play,
    pauseSound,
    stopSound,
    changeVolume,
    ...coffee,
    apply,
    persist,
    ...pomodoro,
  };
};
const SessionContext = createContext<ReturnType<
  typeof useSessionController
> | null>(null);
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const session = useSessionController();
  return (
    <SessionContext.Provider value={session}>
      {children}
      <CoffeeDialog
        open={session.coffeeOpen}
        onDismiss={session.dismissCoffee}
      />
    </SessionContext.Provider>
  );
};
export const useSession = () => {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session provider is missing");
  return session;
};
