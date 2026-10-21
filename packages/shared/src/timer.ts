export type TimerPhase = "focus" | "short" | "long";
export const phaseDurations: Record<TimerPhase, number> = {
  focus: 25 * 60_000,
  short: 5 * 60_000,
  long: 15 * 60_000,
};
export type TimerState = {
  phase: TimerPhase;
  remainingMs: number;
  deadline: number | null;
  running: boolean;
  completed: number;
  completions: number;
  sessionId: number;
  started: boolean;
};
export const createTimer = (): TimerState => ({
  phase: "focus",
  remainingMs: phaseDurations.focus,
  deadline: null,
  running: false,
  completed: 0,
  completions: 0,
  sessionId: 0,
  started: false,
});
export const tickTimer = (state: TimerState, now: number): TimerState => {
  if (!state.running || state.deadline === null) return state;
  const remainingMs = Math.max(0, state.deadline - now);
  if (remainingMs > 0) return { ...state, remainingMs };
  const completed = state.completed + (state.phase === "focus" ? 1 : 0);
  const phase: TimerPhase =
    state.phase === "focus"
      ? completed % 4 === 0
        ? "long"
        : "short"
      : "focus";
  return {
    ...state,
    phase,
    remainingMs: phaseDurations[phase],
    running: true,
    deadline: now + phaseDurations[phase],
    started: true,
    sessionId: state.sessionId + 1,
    completed,
    completions: state.completions + 1,
  };
};
export const toggleTimer = (state: TimerState, now: number): TimerState => {
  const current = tickTimer(state, now);
  if (current.running) return { ...current, running: false, deadline: null };
  const remainingMs = current.remainingMs || phaseDurations[current.phase];
  return {
    ...current,
    remainingMs,
    running: true,
    deadline: now + remainingMs,
    started: true,
    sessionId:
      current.remainingMs === 0 ? current.sessionId + 1 : current.sessionId,
  };
};
export const resetTimer = (
  state: TimerState,
  phase = state.phase,
): TimerState => ({
  ...state,
  phase,
  sessionId: state.sessionId + 1,
  started: false,
  remainingMs: phaseDurations[phase],
  deadline: null,
  running: false,
});
export const formatTime = (remainingMs: number) => {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export const timerFractionFromPoint = (
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const angle =
    (Math.atan2(y - height / 2, x - width / 2) + Math.PI / 2 + Math.PI * 2) %
    (Math.PI * 2);
  return angle < 0.001 ? 1 : angle / (Math.PI * 2);
};
export const setTimerRemaining = (
  state: TimerState,
  ms: number,
  now: number,
): TimerState => {
  const remainingMs = Math.min(
    phaseDurations[state.phase],
    Math.max(1000, Math.round((Number.isFinite(ms) ? ms : 1000) / 1000) * 1000),
  );
  return {
    ...state,
    remainingMs,
    deadline: state.running ? now + remainingMs : null,
    ...(state.remainingMs === 0
      ? { started: false, sessionId: state.sessionId + 1 }
      : {}),
  };
};
