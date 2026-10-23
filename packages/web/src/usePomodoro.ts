import { useRouterState } from "@tanstack/react-router";
import { homeTitle } from "./seo";
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
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
    if (pathname === "/") {
      document.title =
        timer.running || timer.started
          ? `${formatTime(timer.remainingMs)} · ${homeTitle}`
          : homeTitle;
    }
  }, [timer.remainingMs, timer.running, timer.started, pathname]);
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
