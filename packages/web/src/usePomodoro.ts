import { CompletionChime } from "./chime";
import { useEffect } from "react";
import { Atom } from "@effect-atom/atom";
import { useAtom } from "@effect-atom/atom-react";
import { Clock, Effect } from "effect";
import {
  createTimer,
  formatTime,
  resetTimer,
  setTimerRemaining,
  tickTimer,
  toggleTimer,
  type TimerPhase,
} from "../../shared/src/timer";
import { useRuntime } from "./runtime";
const timerAtom = Atom.make(createTimer());
export const usePomodoro = () => {
  const runtime = useRuntime();
  const [timer, setTimer] = useAtom(timerAtom);
  useEffect(() => {
    const update = () =>
      runtime.runFork(
        Effect.flatMap(Clock.currentTimeMillis, (now) =>
          Effect.sync(() => setTimer((t) => tickTimer(t, now))),
        ),
      );
    const id = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, [runtime, setTimer]);
  useEffect(() => {
    document.title = `${formatTime(timer.remainingMs)} · Binaural Pomodoro`;
  }, [timer.remainingMs]);
  return {
    timer,
    toggleTimer: () => {
      runtime.runFork(
        Effect.flatMap(CompletionChime, (chime) => chime.prepare),
      );
      runtime.runFork(
        Effect.flatMap(Clock.currentTimeMillis, (now) =>
          Effect.sync(() => setTimer((t) => toggleTimer(t, now))),
        ),
      );
    },
    setRemaining: (ms: number) =>
      runtime.runFork(
        Effect.flatMap(Clock.currentTimeMillis, (now) =>
          Effect.sync(() => setTimer((t) => setTimerRemaining(t, ms, now))),
        ),
      ),
    resetTimer: () => setTimer((t) => resetTimer(t)),
    selectPhase: (phase: TimerPhase) => setTimer((t) => resetTimer(t, phase)),
  };
};
