import { describe, it, expect } from "vitest";
import {
  createTimer,
  timerFractionFromPoint,
  setTimerRemaining,
  formatTime,
  phaseDurations,
  resetTimer,
  tickTimer,
  toggleTimer,
} from "../packages/shared/src/timer";
describe("Pomodoro timing", () => {
  it("starts with conventional focus and break durations", () => {
    expect(createTimer().remainingMs).toBe(25 * 60_000);
    expect(resetTimer(createTimer(), "short").remainingMs).toBe(5 * 60_000);
    expect(resetTimer(createTimer(), "long").remainingMs).toBe(15 * 60_000);
  });
  it("uses a deadline rather than counting timer callbacks", () => {
    const started = toggleTimer(createTimer(), 1000);
    expect(tickTimer(started, 31_000).remainingMs).toBe(
      phaseDurations.focus - 30_000,
    );
  });
  it("pauses precisely and resumes without counting paused time", () => {
    const paused = toggleTimer(toggleTimer(createTimer(), 1000), 11_000);
    expect(paused.remainingMs).toBe(phaseDurations.focus - 10_000);
    expect(tickTimer(paused, 99_000)).toBe(paused);
    const resumed = toggleTimer(paused, 101_000);
    expect(tickTimer(resumed, 106_000).remainingMs).toBe(
      phaseDurations.focus - 15_000,
    );
  });
  it("finishes only once, including after tab suspension", () => {
    const completed = tickTimer(
      toggleTimer(createTimer(), 0),
      phaseDurations.focus + 60_000,
    );
    expect(completed).toMatchObject({
      phase: "short",
      remainingMs: phaseDurations.short,
      running: true,
      completed: 1,
      deadline: phaseDurations.focus + 60_000 + phaseDurations.short,
    });
    expect(tickTimer(completed, phaseDurations.focus + 61_000).completed).toBe(
      1,
    );
    expect(completed.remainingMs).toBe(phaseDurations.short);
  });
  it("does not count a completed break as a focus session", () => {
    const completed = tickTimer(
      toggleTimer(resetTimer(createTimer(), "short"), 0),
      phaseDurations.short,
    );
    expect(completed.completed).toBe(0);
    expect(resetTimer(completed, "focus").running).toBe(false);
  });
  it("formats time without negative seconds or rounding down prematurely", () => {
    expect(formatTime(1500)).toBe("00:02");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(-100)).toBe("00:00");
    expect(formatTime(25 * 60_000)).toBe("25:00");
  });
});

it("identifies new break starts without treating resume as a new session", () => {
  const selected = resetTimer(createTimer(), "short");
  expect(selected.started).toBe(false);
  const started = toggleTimer(selected, 0);
  expect(started.started).toBe(true);
  const paused = toggleTimer(started, 1000);
  const resumed = toggleTimer(paused, 2000);
  expect(resumed.sessionId).toBe(started.sessionId);
  const reset = resetTimer(resumed);
  expect(reset.started).toBe(false);
  expect(reset.sessionId).toBeGreaterThan(started.sessionId);
  const ended = tickTimer(
    toggleTimer(reset, 3000),
    3000 + phaseDurations.short,
  );
  expect(ended.phase).toBe("focus");
  expect(ended.sessionId).toBeGreaterThan(reset.sessionId);
  expect(toggleTimer(ended, 1_000_000).sessionId).toBe(ended.sessionId);
});

it("maps circular positions clockwise from twelve o’clock", () => {
  expect(timerFractionFromPoint(50, 0, 100, 100)).toBe(1);
  expect(timerFractionFromPoint(100, 50, 100, 100)).toBeCloseTo(0.25);
  expect(timerFractionFromPoint(50, 100, 100, 100)).toBeCloseTo(0.5);
  expect(timerFractionFromPoint(0, 50, 100, 100)).toBeCloseTo(0.75);
});
it("adjusts remaining time and a live deadline without restarting the session", () => {
  const running = toggleTimer(createTimer(), 1000);
  const adjusted = setTimerRemaining(running, 90_000, 5000);
  expect(adjusted).toMatchObject({
    running: true,
    remainingMs: 90_000,
    deadline: 95_000,
    sessionId: running.sessionId,
  });
  expect(setTimerRemaining(createTimer(), -100, 0).remainingMs).toBe(1000);
  expect(setTimerRemaining(createTimer(), Infinity, 0).remainingMs).toBe(1000);
  expect(setTimerRemaining(createTimer(), 9_000_000, 0).remainingMs).toBe(
    phaseDurations.focus,
  );
  expect(setTimerRemaining(createTimer(), 40_000, 0).running).toBe(false);
});

it("cycles through four focus sessions with short breaks and a long fourth break", () => {
  let state = createTimer();
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let focus = 1; focus <= 4; focus++) {
      const started = state.running ? state : toggleTimer(state, 0);
      state = tickTimer(started, started.deadline!);
      const breakPhase = focus === 4 ? "long" : "short";
      expect(state).toMatchObject({
        phase: breakPhase,
        remainingMs: phaseDurations[breakPhase],
        completed: cycle * 4 + focus,
        running: true,
        started: true,
      });
      expect(tickTimer(state, state.deadline! - 1000).phase).toBe(breakPhase);
      state = tickTimer(state, state.deadline!);
      expect(state).toMatchObject({
        phase: "focus",
        remainingMs: phaseDurations.focus,
        running: true,
        completed: cycle * 4 + focus,
      });
    }
  }
  expect(state.completions).toBe(16);
});
