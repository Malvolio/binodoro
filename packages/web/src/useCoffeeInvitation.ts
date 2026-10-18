import { useEffect, useState } from "react";
import { Effect, Fiber } from "effect";
import type { TimerState } from "../../shared/src/timer";
import { CoffeeInvitation } from "./coffee";
import { useRuntime } from "./runtime";
export const useCoffeeInvitation = (timer: TimerState) => {
  const runtime = useRuntime();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    if (timer.phase === "focus" || !timer.started || timer.remainingMs === 0)
      return;
    const fiber = runtime.runFork(
      Effect.gen(function* () {
        const invitation = yield* CoffeeInvitation;
        if (!(yield* invitation.offer)) return;
        yield* Effect.sleep("5 seconds");
        yield* Effect.sync(() => setOpen(true));
        yield* Effect.sleep("30 seconds");
        yield* Effect.sync(() => setOpen(false));
      }),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [
    runtime,
    timer.phase,
    timer.sessionId,
    timer.started,
    timer.remainingMs === 0,
  ]);
  return { coffeeOpen: open, dismissCoffee: () => setOpen(false) };
};
