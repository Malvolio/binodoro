import type { Sweep } from "../../shared/src/model";
import { Control, Toggle, Select } from "./Controls";
export const SweepControls = ({
  label,
  sweep,
  min,
  max,
  onChange,
  beat = false,
}: {
  label: string;
  sweep: Sweep;
  min: number;
  max: number;
  onChange: (s: Sweep) => void;
  beat?: boolean;
}) => {
  const patch = (p: Partial<Sweep>) => onChange({ ...sweep, ...p });
  return (
    <div className="sweep-controls">
      <Toggle
        label={`${label} sweep`}
        checked={sweep.enabled}
        onChange={(enabled) => patch({ enabled })}
      />
      <div className="two-col">
        <Control
          label={`${label} start`}
          value={sweep.start}
          min={min}
          max={max}
          unit="Hz"
          step={0.1}
          onChange={(start) => patch({ start })}
        />
        <Control
          label={`${label} end`}
          value={sweep.end}
          min={min}
          max={max}
          unit="Hz"
          step={0.1}
          onChange={(end) => patch({ end })}
        />
      </div>
      <Control
        label={`${label} duration`}
        value={sweep.duration}
        min={1}
        max={600}
        unit="s"
        onChange={(duration) => patch({ duration })}
      />
      <Select
        label="Interpolation"
        value={sweep.log ? "logarithmic" : "linear"}
        options={["linear", "logarithmic"]}
        onChange={(v) => patch({ log: v === "logarithmic" })}
      />
      {sweep.log && (sweep.start === 0 || sweep.end === 0) && (
        <p className="fine">Zero endpoints use linear interpolation.</p>
      )}
      <Toggle
        label={`Repeat ${label.toLowerCase()} sweep`}
        checked={sweep.repeat}
        onChange={(repeat) => patch({ repeat })}
      />
      {beat && (
        <Toggle
          label="Ping-pong on repeat"
          checked={sweep.pingpong}
          onChange={(pingpong) => patch({ pingpong })}
        />
      )}
    </div>
  );
};
