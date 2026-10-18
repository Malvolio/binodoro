import { useState } from "react";
import { AboutDialog } from "./AboutDialog";
import { TimerRing } from "./TimerRing";
import { Link } from "@tanstack/react-router";
import {
  Coffee,
  Headphones,
  Footprints,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import { builtins } from "../../shared/src/model";
import { formatTime, phaseDurations } from "../../shared/src/timer";
import { useSession } from "./Session";
import { Control } from "./Controls";
const phases = [
  { id: "focus", label: "Focus", icon: Timer },
  { id: "short", label: "Short break", icon: Coffee },
  { id: "long", label: "Long break", icon: Footprints },
] as const;
export const Pomodoro = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const {
    timer,
    setRemaining,
    toggleTimer,
    resetTimer,
    selectPhase,
    playing,
    muted,
    toggleMute,
    changeVolume,
    settings,
    preset,
    setPreset,
    custom,
    apply,
    error,
    setError,
    masterVolume,
  } = useSession();
  const active = phases.find((phase) => phase.id === timer.phase)!;
  const allPresets = [...builtins, ...custom];
  const completedDots = timer.completed === 0 ? 0 : timer.completed % 4 || 4;
  const changeSound = (id: string) => {
    const sound = allPresets.find((p) => p.id === id);
    if (sound) {
      apply(sound.settings);
      setPreset(sound.id);
    }
  };
  return (
    <div className="pomodoro-page" data-phase={timer.phase}>
      <AboutDialog open={aboutOpen} onDismiss={() => setAboutOpen(false)} />
      <main className="pomodoro-main">
        <div className="pomodoro-intro">
          <h1>
            {timer.phase === "focus"
              ? "Time to find your focus"
              : timer.phase === "short"
                ? "Time to take a breath"
                : "Time to take a walk"}
          </h1>
          <p className="pomodoro-subtitle">
            Binodoro combines Pomodoro time-management with binaural beats for
            concentration{" "}
            <button className="about-link" onClick={() => setAboutOpen(true)}>
              Learn more
            </button>
          </p>
        </div>
        <div className="phase-tabs" role="tablist" aria-label="Timer mode">
          {phases.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={timer.phase === id}
              aria-controls="timer-display"
              tabIndex={timer.phase === id ? 0 : -1}
              className={timer.phase === id ? "active" : ""}
              onClick={() => selectPhase(id)}
              onKeyDown={(event) => {
                const i = phases.findIndex((p) => p.id === id);
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : (i + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                  selectPhase(phases[next].id);
                  document.getElementById(`tab-${phases[next].id}`)?.focus();
                }
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
        <section className="timer-stage" aria-label={`${active.label} timer`}>
          <div className="tomato-disc">
            <TimerRing timer={timer} onChange={setRemaining} />
            <div
              className="timer-face"
              id="timer-display"
              role="tabpanel"
              aria-labelledby={`tab-${timer.phase}`}
            >
              <div
                className="timer-digits"
                role="timer"
                aria-label="Time remaining"
                aria-live="off"
              >
                {formatTime(timer.remainingMs)}
              </div>
              <span className="timer-mode-label">
                {active.label.toUpperCase()} TIME
              </span>
            </div>
          </div>
        </section>
        <div className="timer-actions">
          <button className="timer-start" onClick={toggleTimer}>
            {timer.running ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
            {timer.running
              ? "Pause"
              : timer.remainingMs < phaseDurations[timer.phase]
                ? "Resume"
                : "Start focus".replace(
                    "focus",
                    timer.phase === "focus" ? "focus" : "break",
                  )}
          </button>
          <button
            className="timer-reset"
            onClick={resetTimer}
            aria-label="Reset timer"
            title="Reset timer"
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>
        <div className="session-progress">
          <div
            className="session-dots"
            aria-label={`${timer.completed} focus sessions complete`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < completedDots ? "complete" : ""} />
            ))}
          </div>
          <span>
            {timer.completed === 0
              ? "YOUR NEXT SMALL STEP"
              : `${timer.completed} FOCUS ${timer.completed === 1 ? "SESSION" : "SESSIONS"} COMPLETE`}
          </span>
        </div>
        <section
          className="pomodoro-sound"
          aria-label={
            timer.phase === "focus"
              ? "Binaural sound controls"
              : "Break music controls"
          }
        >
          <div className="sound-panel-top">
            <button
              className={`sound-toggle ${!muted ? "is-playing" : ""}`}
              aria-label={!muted ? "Mute sound" : "Play sound"}
              aria-pressed={!muted}
              onClick={toggleMute}
            >
              {!muted ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>
            {timer.phase === "focus" && (
              <>
                <div className="sound-picker">
                  <label htmlFor="focus-sound">
                    YOUR BINAURAL SOUND
                    <span>
                      {muted ? "MUTED" : playing ? "PLAYING" : "READY"}
                    </span>
                  </label>
                  <select
                    id="focus-sound"
                    aria-label="Sound preset"
                    value={preset}
                    onChange={(e) => changeSound(e.target.value)}
                  >
                    <option value="">Custom sound</option>
                    <optgroup label="Focus sounds">
                      {builtins.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {custom.length > 0 && (
                      <optgroup label="Your saved sounds">
                        {custom.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <Link to="/controls" className="edit-presets-button">
                  edit presets
                </Link>
              </>
            )}
          </div>
          {timer.phase === "focus" && (
            <>
              {" "}
              <div className="sound-panel-bottom">
                <span>
                  <Headphones size={13} /> Headphones on. Start quietly.
                </span>
                <span>
                  {settings.carrier.toFixed(0)} Hz carrier <b>·</b>{" "}
                  {settings.beat.toFixed(1)} Hz beat
                </span>
              </div>
            </>
          )}
        </section>
        <div className="pomodoro-volume">
          <Control
            label="Volume"
            value={masterVolume}
            min={0}
            max={100}
            unit="%"
            onChange={changeVolume}
          />
        </div>
        {error && (
          <div className="pomodoro-error" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        <p className="pomodoro-footnote">
          Your timer. Your sound. Your pace.
          <span>
            Focus with binaural tones. Unwind with music on your breaks.
          </span>
        </p>
      </main>
      <div className="pomodoro-footer">
        <span>Made for a more intentional day.</span>
        <span>
          <Headphones size={12} /> Binaural tones and break music, played
          locally.
        </span>
      </div>
    </div>
  );
};
