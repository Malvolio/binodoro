import { useRef, type PointerEvent } from "react";
import {
  formatTime,
  phaseDurations,
  timerFractionFromPoint,
  type TimerState,
} from "../../shared/src/timer";
export const TimerRing = ({
  timer,
  onChange,
}: {
  timer: TimerState;
  onChange: (ms: number) => void;
}) => {
  const dragging = useRef<number | null>(null);
  const maximum = phaseDurations[timer.phase],
    fraction = timer.remainingMs / maximum;
  const update = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onChange(
      timerFractionFromPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
      ) * maximum,
    );
  };
  return (
    <svg
      className="timer-ring"
      viewBox="0 0 360 360"
      role="slider"
      tabIndex={0}
      aria-label="Remaining time"
      aria-valuemin={0}
      aria-valuemax={maximum / 1000}
      aria-valuenow={Math.ceil(timer.remainingMs / 1000)}
      aria-valuetext={`${formatTime(timer.remainingMs)} remaining`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
        update(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (dragging.current !== event.pointerId) return;
        update(event);
        dragging.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
      onLostPointerCapture={() => {
        dragging.current = null;
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 60_000 : 15_000;
        if (
          [
            "ArrowUp",
            "ArrowRight",
            "ArrowDown",
            "ArrowLeft",
            "Home",
            "End",
            "PageUp",
            "PageDown",
          ].includes(event.key)
        ) {
          event.preventDefault();
          onChange(
            event.key === "Home"
              ? 1000
              : event.key === "End"
                ? maximum
                : timer.remainingMs +
                  (["ArrowUp", "ArrowRight", "PageUp"].includes(event.key)
                    ? 1
                    : -1) *
                    (event.key.startsWith("Page") ? 60_000 : step),
          );
        }
      }}
    >
      <title>
        Drag the ring to adjust time. Arrow keys adjust by 15 seconds; Shift
        adjusts by one minute.
      </title>
      <circle className="timer-ring-hit" cx="180" cy="180" r="163" />
      <circle className="timer-track" cx="180" cy="180" r="163" />
      <circle
        className="timer-progress"
        cx="180"
        cy="180"
        r="163"
        pathLength="100"
        strokeDasharray={`${fraction * 100} 100`}
        transform="rotate(-90 180 180)"
      />
      <circle
        className="timer-ring-dot"
        cx={180 + 163 * Math.cos(fraction * 2 * Math.PI - Math.PI / 2)}
        cy={180 + 163 * Math.sin(fraction * 2 * Math.PI - Math.PI / 2)}
        r="7"
      />
    </svg>
  );
};
