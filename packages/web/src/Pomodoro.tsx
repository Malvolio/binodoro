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
      <noscript>
        <p>
          Start and customize your timer by enabling JavaScript.{" "}
          <a href="/about">Learn about Pomodoro and binaural beats</a>.
        </p>
      </noscript>
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
              {!timer.running && (
                <button
                  className="timer-start timer-overlay-start"
                  onClick={toggleTimer}
                >
                  <Play size={21} fill="currentColor" />
                  {timer.remainingMs < phaseDurations[timer.phase]
                    ? "Resume"
                    : timer.phase === "focus"
                      ? "Start focus"
                      : "Start break"}
                </button>
              )}
              <span className="timer-mode-label">
                {active.label.toUpperCase()}
              </span>
            </div>
          </div>
        </section>
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
        <div className="timer-actions">
          <button
            className="timer-reset timer-pause"
            onClick={toggleTimer}
            disabled={!timer.running}
          >
            <Pause size={20} />
            <span>Pause</span>
          </button>
          <button
            className="timer-reset"
            onClick={resetTimer}
            disabled={
              !timer.running &&
              timer.remainingMs === phaseDurations[timer.phase]
            }
            aria-label="Reset timer"
            title="Reset timer"
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>
        <section
          className="audio-volume-card"
          aria-label={
            timer.phase === "focus"
              ? "Sound volume controls"
              : "Break music controls"
          }
        >
          <button
            className={`sound-toggle ${!muted ? "is-playing" : ""}`}
            aria-label={!muted ? "Mute sound" : "Play sound"}
            aria-pressed={!muted}
            onClick={toggleMute}
          >
            {!muted ? <Volume2 size={21} /> : <VolumeX size={21} />}
          </button>
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
        </section>
        {timer.phase === "focus" && (
          <section
            className="pomodoro-sound"
            aria-label="Binaural sound controls"
          >
            <div className="sound-panel-top">
              <div className="sound-picker">
                <label htmlFor="focus-sound">
                  YOUR BINAURAL SOUND
                  <span>{muted ? "MUTED" : playing ? "PLAYING" : "READY"}</span>
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
            </div>
            <div className="sound-panel-bottom">
              <span>
                <Headphones size={13} /> Headphones on. Start quietly.
              </span>
              <span>
                {settings.carrier.toFixed(0)} Hz carrier <b>·</b>{" "}
                {settings.beat.toFixed(1)} Hz beat
              </span>
            </div>
          </section>
        )}
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
      <footer className="pomodoro-footer">
        <span>Made for a more intentional day.</span>
        <span>
          <Headphones size={12} /> Binaural tones and break music, played
          locally.
        </span>
        <Link to="/about">About Binodoro · Pomodoro &amp; binaural beats</Link>
      </footer>
    </div>
  );
};
