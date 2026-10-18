import { Effect } from "effect";
import { initiallyCollapsed, PanelPreferences } from "./panelPreferences";
import { useRuntime } from "./runtime";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Panel = ({
  label,
  heading,
  accessory,
  children,
  className = "panel",
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  label: string;
  heading: ReactNode;
  accessory?: ReactNode;
}) => {
  const runtime = useRuntime();
  const [collapsed, setCollapsed] = useState(() =>
    initiallyCollapsed.has(label),
  );
  const revision = useRef(0);
  useEffect(() => {
    let mounted = true;
    runtime.runFork(
      Effect.flatMap(PanelPreferences, (p) => p.get(label)).pipe(
        Effect.tap((value) =>
          Effect.sync(() => {
            if (mounted && revision.current === 0) setCollapsed(value);
          }),
        ),
      ),
    );
    return () => {
      mounted = false;
    };
  }, [runtime, label]);
  const toggle = () => {
    const next = !collapsed;
    revision.current++;
    setCollapsed(next);
    runtime.runFork(
      Effect.flatMap(PanelPreferences, (p) => p.set(label, next)),
    );
  };
  const bodyId = useId();
  return (
    <section
      {...props}
      className={`${className}${collapsed ? " is-collapsed" : ""}`}
    >
      <div className="panel-heading">
        {heading}
        <div className="panel-heading-actions">
          {accessory}
          <span className="panel-chevron" aria-hidden="true">
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </span>
        </div>
        <button
          type="button"
          className="panel-toggle"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={`${collapsed ? "Expand" : "Collapse"} ${label}`}
          onClick={toggle}
        />
      </div>
      <div
        id={bodyId}
        className="panel-body"
        inert={collapsed}
        aria-hidden={collapsed}
      >
        <div className="panel-body-inner">{children}</div>
      </div>
    </section>
  );
};
