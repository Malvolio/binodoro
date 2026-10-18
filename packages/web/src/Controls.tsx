import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { clamp } from "../../shared/src/model";
export const Control = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  log = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  log?: boolean;
  onChange: (v: number) => void;
}) => {
  const id = useId();
  const [draft, setDraft] = useState(String(Number(value.toFixed(2))));
  useEffect(() => setDraft(String(Number(value.toFixed(2)))), [value]);
  const pos = log ? (Math.log(value / min) / Math.log(max / min)) * 100 : value;
  return (
    <div className="control">
      <div className="control-label">
        <label htmlFor={id}>{label}</label>
        <div className="number-wrap">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const next = e.target.valueAsNumber;
              if (Number.isFinite(next) && next >= min && next <= max)
                onChange(next);
            }}
            onBlur={() => {
              const next =
                draft.trim() && Number.isFinite(Number(draft))
                  ? clamp(Number(draft), min, max)
                  : value;
              setDraft(String(Number(next.toFixed(2))));
              onChange(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span>{unit}</span>
        </div>
      </div>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={log ? 0 : min}
        max={log ? 100 : max}
        step={log ? 0.01 : step}
        value={pos}
        onChange={(e) =>
          onChange(
            log
              ? Number(
                  (
                    min * Math.pow(max / min, e.target.valueAsNumber / 100)
                  ).toFixed(1),
                )
              : e.target.valueAsNumber,
          )
        }
        style={
          {
            "--fill": `${log ? pos : ((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
      />
      <div className="range-labels">
        <span>
          {min} {unit}
        </span>
        <span>
          {max.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
};
export const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="toggle-row">
    <span>{label}</span>
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);
export const Section = ({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) => (
  <details className="advanced" open={open || undefined}>
    <summary>
      {title}
      <ChevronDown size={15} />
    </summary>
    <div className="advanced-content">{children}</div>
  </details>
);
export const Select = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) => (
  <label className="select-label">
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.charAt(0).toUpperCase() + o.slice(1)}
        </option>
      ))}
    </select>
  </label>
);
