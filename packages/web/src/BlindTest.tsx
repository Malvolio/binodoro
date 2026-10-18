import { Panel } from "./Panel";
import { useState } from "react";
import { Eye, FlaskConical, RotateCcw, Shuffle } from "lucide-react";
import {
  assignment,
  defaults,
  score,
  type Settings,
} from "../../shared/src/model";
import { Button } from "./components/ui/button";
import { Control, Section } from "./Controls";
export const BlindTest = ({
  settings,
  onPlay,
  onEnd,
}: {
  settings: Settings;
  onPlay: (s: Settings) => void;
  onEnd: () => void;
}) => {
  const [a, setA] = useState(settings),
    [b, setB] = useState({ ...defaults, beat: 6 }),
    [map, setMap] = useState(assignment),
    [active, setActive] = useState<"X" | "Y" | null>(null),
    [trial, setTrial] = useState<"A" | "B" | null>(null),
    [revealed, setRevealed] = useState(false),
    [lastResult, setLastResult] = useState<boolean | null>(null),
    [trials, setTrials] = useState<{ guess: string; actual: string }[]>([]);
  const result = score(trials);
  const audition = (key: "X" | "Y") => {
    setActive(key);
    onPlay(map[key] === "A" ? a : b);
  };
  const next = () => {
    onEnd();
    setMap(assignment());
    setTrial(null);
    setActive(null);
    setRevealed(false);
    setLastResult(null);
  };
  return (
    <Panel
      className="panel blind-panel"
      label="Blind comparison"
      heading={
        <h2>
          <FlaskConical size={16} /> Blind comparison
        </h2>
      }
      accessory={
        <>
          <span className="tag">A / B EXPERIMENT</span>
        </>
      }
    >
      <p className="muted">
        Listen first. Make a prediction. Reveal the result.
      </p>
      <Section title="Configure stimuli A and B">
        <div className="two-col">
          {(["A", "B"] as const).map((key) => {
            const s = key === "A" ? a : b,
              set = key === "A" ? setA : setB;
            return (
              <div key={key}>
                <h3>Stimulus {key}</h3>
                <Control
                  label={`${key} carrier`}
                  value={s.carrier}
                  min={40}
                  max={1500}
                  unit="Hz"
                  log
                  onChange={(v) => set({ ...s, carrier: v })}
                />
                <Control
                  label={`${key} beat`}
                  value={s.beat}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="Hz"
                  onChange={(v) => set({ ...s, beat: v })}
                />
                <Button variant="outline" onClick={() => set({ ...settings })}>
                  Capture current settings as {key}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="fine">
          Each capture stores all sound and modulation settings. Capture B after
          editing the main panel to compare any parameter.
        </p>
      </Section>
      <div className="blind-buttons">
        <Button
          variant="outline"
          className={active === "X" ? "selected" : ""}
          onClick={() => audition("X")}
        >
          <span className="key">X</span> Listen X
        </Button>
        <Button
          variant="outline"
          className={active === "Y" ? "selected" : ""}
          onClick={() => audition("Y")}
        >
          <span className="key">Y</span> Listen Y
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const actual = Math.random() < 0.5 ? "A" : "B";
            setTrial(actual);
            setRevealed(false);
            setActive(null);
            onPlay(actual === "A" ? a : b);
          }}
        >
          ?
        </Button>
      </div>
      <p className="fine">
        {trial
          ? "Hidden randomized trial playing. Identify the stimulus."
          : active
            ? `Identify stimulus ${active}.`
            : "Choose X, Y, or ? for a hidden randomized trial."}
      </p>
      <div className="guess-row">
        <span>I heard</span>
        {(["A", "B"] as const).map((guess) => (
          <Button
            key={guess}
            variant="outline"
            disabled={revealed || (!trial && !active)}
            onClick={() => {
              const actual = trial ?? map[active!];
              setTrials((t) => [...t, { guess, actual }]);
              setLastResult(guess === actual);
              setRevealed(true);
              onEnd();
            }}
          >
            Stimulus {guess}
          </Button>
        ))}
      </div>
      {revealed && (
        <p className="result" role="status">
          X = {map.X} · Y = {map.Y}
          {trial ? ` · Hidden trial = ${trial}` : ""} ·{" "}
          {lastResult === null
            ? ""
            : lastResult
              ? "Correct identification"
              : "Different stimulus"}
        </p>
      )}
      <div className="trial-footer">
        <span>
          <strong>{result.count}</strong> trials <i />{" "}
          <strong>{result.accuracy.toFixed(0)}%</strong> accuracy
        </span>
        <div>
          <Button
            title="New randomized assignment"
            variant="ghost"
            onClick={next}
          >
            <Shuffle size={14} /> New trial
          </Button>
          <Button
            title="Reset comparison results"
            aria-label="Reset comparison results"
            variant="ghost"
            onClick={() => {
              setTrials([]);
              next();
            }}
          >
            <RotateCcw size={14} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRevealed(true);
              onEnd();
            }}
          >
            <Eye size={14} /> Reveal
          </Button>
        </div>
      </div>
      <p className="fine">
        Informal listening experiment. Not a clinical or validated
        psychophysical test.
      </p>
    </Panel>
  );
};
