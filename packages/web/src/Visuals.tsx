import { useEffect, useRef } from "react";
import type { AudioEngine } from "./audio";
import { frequencies, type Settings } from "../../shared/src/model";
export const Scope = ({
  engine,
  settings,
  windowMs,
  kind,
}: {
  engine: AudioEngine | null;
  settings: Settings;
  windowMs: number;
  kind: "wave" | "beat" | "spectrum";
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ engine, settings, windowMs });
  latest.current = { engine, settings, windowMs };
  useEffect(() => {
    let frame = 0;
    const samples = new Float32Array(16384);
    const draw = () => {
      const el = canvas.current;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      const rect = el.getBoundingClientRect(),
        dpr = window.devicePixelRatio || 1;
      if (
        el.width !== Math.round(rect.width * dpr) ||
        el.height !== Math.round(rect.height * dpr)
      ) {
        el.width = Math.round(rect.width * dpr);
        el.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width,
        h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "oklch(0.25 0.025 255)";
      ctx.lineWidth = 0.6;
      for (let x = 0; x < w; x += w / 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += h / 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const { engine, settings, windowMs } = latest.current;
      const current = engine?.current() ?? settings;
      const f = frequencies(current),
        time = engine?.context?.currentTime ?? 0;
      const active = engine?.playing ?? false;
      if (kind === "wave") {
        for (let ch = 0; ch < 2; ch++) {
          const center = h * (ch === 0 ? 0.26 : 0.74);
          ctx.strokeStyle =
            ch === 0 ? "oklch(0.78 0.15 170)" : "oklch(0.73 0.14 270)";
          ctx.lineWidth = 1.6;
          const an = engine?.analysers[ch];
          if (an) an.getFloatTimeDomainData(samples);
          ctx.beginPath();
          for (let x = 0; x < w; x++) {
            const index = Math.min(
              samples.length - 1,
              Math.floor(
                (((x / w) * windowMs) / 1000) *
                  (engine?.context?.sampleRate ?? 48000),
              ),
            );
            const v = active && an ? samples[index] : 0;
            const y = center - v * h * 0.29;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle =
            ch === 0 ? "oklch(0.78 0.15 170)" : "oklch(0.73 0.14 270)";
          ctx.font = "10px monospace";
          ctx.fillText(ch === 0 ? "L" : "R", 8, center - 22);
        }
      }
      if (kind === "beat") {
        ctx.strokeStyle = "oklch(0.78 0.15 170)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y =
            h * 0.5 -
            Math.sin(
              2 * Math.PI * current.beat * (x / w - (active ? time : 0)),
            ) *
              h *
              0.3;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "oklch(0.60 0.02 255)";
        ctx.font = "10px monospace";
        ctx.fillText("0 s", 8, h - 8);
        ctx.fillText("1 s", w - 30, h - 8);
      }
      if (kind === "spectrum") {
        const center = current.carrier,
          span = Math.max(60, current.beat * 4),
          low = Math.max(0, center - span / 2),
          high = center + span / 2;
        [0, 1].forEach((ch) => {
          const freq = current.mode === "isochronic" ? center : f[ch],
            x = ((freq - low) / (high - low)) * w;
          ctx.strokeStyle =
            ch === 0 ? "oklch(0.78 0.15 170)" : "oklch(0.73 0.14 270)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 16, h - 24);
          ctx.lineTo(x - 3, h * 0.2);
          ctx.quadraticCurveTo(x, h * 0.1, x + 3, h * 0.2);
          ctx.lineTo(x + 16, h - 24);
          ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = "11px monospace";
          ctx.fillText(
            `${freq.toFixed(1)} Hz`,
            Math.min(w - 70, Math.max(3, x - 30)),
            h * 0.12,
          );
        });
        ctx.fillStyle = "oklch(0.60 0.02 255)";
        ctx.font = "10px monospace";
        ctx.fillText(`${low.toFixed(0)} Hz`, 8, h - 6);
        ctx.fillText(`${high.toFixed(0)} Hz`, w - 50, h - 6);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kind]);
  return (
    <canvas
      ref={canvas}
      className={`scope scope-${kind}`}
      aria-label={
        kind === "wave"
          ? "Live left and right waveform analyser"
          : kind === "beat"
            ? "Mathematical beat relationship over a one second window"
            : "Schematic fundamental frequencies, not measured FFT"
      }
    />
  );
};
export const SignalFlow = ({ settings: s }: { settings: Settings }) => (
  <div className="signal-flow">
    {[0, 1].map((i) => (
      <div className={`signal-row signal-${i}`} key={i}>
        <span className="signal-node">
          {s.mode === "isochronic"
            ? "Carrier"
            : `${i === 0 ? "Left" : "Right"} oscillator`}
        </span>
        <span>→</span>
        <span className="signal-node">
          {s.mode === "isochronic" ? "Pulse" : s.am ? "AM" : "Tone"}
        </span>
        <span>→</span>
        <span className="signal-node">Gain</span>
        <span>→</span>
        <span className="signal-output">
          {s.mode === "mono"
            ? "L + R"
            : s.swap
              ? i === 0
                ? "R"
                : "L"
              : i === 0
                ? "L"
                : "R"}{" "}
          ◉
        </span>
      </div>
    ))}
    <p>
      {s.mode === "binaural"
        ? "Isolated channels"
        : s.mode === "mono"
          ? "Both tones mixed into each ear"
          : "Single carrier · amplitude pulses"}
      {s.swap ? " · channels swapped" : ""}
    </p>
  </div>
);
