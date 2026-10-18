import { Link } from "@tanstack/react-router";
import { useSession } from "./Session";
import { Panel } from "./Panel";
import { Effect } from "effect";
import {
  Activity,
  AudioLines,
  Headphones,
  Info,
  Pause,
  Play,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import {
  builtins,
  defaults,
  directFrequency,
  frequencies,
  type Settings,
} from "../../shared/src/model";
import { PresetLibrary } from "./PresetLibrary";
import { Audio } from "./runtime";
import { Button } from "./components/ui/button";
import { Control, Section, Select, Toggle } from "./Controls";
import { Scope, SignalFlow } from "./Visuals";
import { BlindTest } from "./BlindTest";
import { SweepControls } from "./Sweeps";
const bands = [
  { name: "Delta", range: "0.5–4", min: 0.5, max: 4, value: 2 },
  { name: "Theta", range: "4–8", min: 4, max: 8, value: 6 },
  { name: "Alpha", range: "8–13", min: 8, max: 13, value: 10 },
  { name: "Beta", range: "13–30", min: 13, max: 30, value: 20 },
  { name: "Gamma", range: "30–80", min: 30, max: 80, value: 40 },
];
export const App = () => {
  const {
    settings,
    setSettings,
    masterVolume,
    setMasterVolume,
    engine,
    playing,
    setPlaying,
    blindActive,
    setBlindActive,
    custom,
    preset,
    setPreset,
    windowMs,
    setWindowMs,
    error,
    setError,
    elapsed,
    setElapsed,
    live,
    settingsRef,
    auditionRef,
    run,
    patch,
    play,
    pauseSound,
    changeVolume,
    apply,
    persist,
  } = useSession();
  const f = frequencies(settings),
    band = bands.find((b) => settings.beat >= b.min && settings.beat < b.max);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <AudioLines size={25} />
          </span>
          <div>Binodoro</div>
        </Link>
        <div className="header-right">
          <Link to="/" className="back-to-timer">
            ← Back to timer
          </Link>
        </div>
      </header>
      <main>
        <div className="page-intro">
          <h1>Sound controls</h1>
        </div>
        <div className="headphone-notice">
          <Headphones size={19} />
          <span>
            Use headphones for binaural listening. Start at low volume.
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <Button variant="ghost" onClick={() => setError("")}>
              Dismiss
            </Button>
          </div>
        )}
        <Panel
          className="panel transport-panel"
          label="Playback"
          heading={
            <h2>
              <AudioLines size={16} /> Playback
            </h2>
          }
        >
          <div className="transport">
            <div className="transport-controls">
              <Button
                className="play-button"
                onClick={() =>
                  playing
                    ? pauseSound()
                    : play(
                        blindActive ? auditionRef.current : settingsRef.current,
                      )
                }
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
                {playing ? "Pause" : "Play audio"}
              </Button>
              <div className="transport-status">
                <span className={playing ? "status-dot on" : "status-dot"} />
                <div>
                  {blindActive
                    ? "BLIND STIMULUS"
                    : playing
                      ? "SIGNAL ACTIVE"
                      : "READY TO LISTEN"}
                  <span className="clock">
                    {Math.floor(elapsed / 60)
                      .toString()
                      .padStart(2, "0")}
                    :
                    {Math.floor(elapsed % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
            <div className="transport-volume">
              <Control
                label="Master volume"
                value={masterVolume}
                min={0}
                max={100}
                unit="%"
                onChange={changeVolume}
              />
            </div>
            <div className="preset-select">
              <label htmlFor="preset">SOUND PRESET</label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => {
                  setBlindActive(false);
                  const p = [...builtins, ...custom].find(
                    (p) => p.id === e.target.value,
                  );
                  if (p) {
                    apply(p.settings);
                    setPreset(p.id);
                  }
                }}
              >
                <option value="">Custom settings</option>
                <optgroup label="Built-in sounds">
                  {builtins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Your presets">
                  {custom.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </Panel>
        <div className={`dashboard-grid ${blindActive ? "blind-session" : ""}`}>
          <div className="main-column">
            <Panel
              className="panel frequency-panel"
              inert={blindActive}
              aria-hidden={blindActive}
              label="Frequency generator"
              heading={
                <h2>
                  <Waves size={17} /> Frequency generator
                </h2>
              }
              accessory={
                <>
                  <span className="tag">{settings.mode.toUpperCase()}</span>
                </>
              }
            >
              <div className="primary-controls">
                <div className="primary-control">
                  <div className="eyebrow">CARRIER FREQUENCY</div>
                  <div className="hero-number">
                    {settings.carrier.toFixed(1)}
                    <span>Hz</span>
                  </div>
                  <Control
                    label="Carrier frequency"
                    value={settings.carrier}
                    min={40}
                    max={1500}
                    log
                    step={0.1}
                    unit="Hz"
                    onChange={(carrier) => patch({ carrier })}
                  />
                  <p className="fine">
                    The center frequency shared by both ears.
                  </p>
                </div>
                <div className="primary-control beat-control">
                  <div className="eyebrow">BEAT FREQUENCY</div>
                  <div className="hero-number">
                    {settings.beat.toFixed(1)}
                    <span>Hz</span>
                    <span className="band-tag">
                      {band?.name ??
                        (settings.beat === 0 ? "Control" : "Unclassified")}
                    </span>
                  </div>
                  <Control
                    label="Beat frequency"
                    value={settings.beat}
                    min={0}
                    max={100}
                    step={0.1}
                    unit="Hz"
                    onChange={(beat) => patch({ beat })}
                  />
                  <p className="fine">
                    The frequency difference between the ears.
                  </p>
                </div>
              </div>
              <div className="bands">
                {bands.map((b) => (
                  <button
                    key={b.name}
                    className={band?.name === b.name ? "active" : ""}
                    onClick={() => patch({ beat: b.value })}
                  >
                    <span>{b.name}</span>
                    <small>{b.range} Hz</small>
                  </button>
                ))}
              </div>
              <p className="band-note">
                Conventional EEG bands · not established effects of listening
              </p>
              <div className="ear-readouts">
                <div>
                  <span className="ear-icon left">L</span>
                  <div>
                    <span>LEFT CHANNEL</span>
                    <strong>
                      {f[0].toFixed(1)} <small>Hz</small>
                    </strong>
                  </div>
                </div>
                <div className="separation">
                  <span>Δ</span> {settings.beat.toFixed(1)} Hz
                </div>
                <div>
                  <span className="ear-icon right">R</span>
                  <div>
                    <span>RIGHT CHANNEL</span>
                    <strong>
                      {f[1].toFixed(1)} <small>Hz</small>
                    </strong>
                  </div>
                </div>
              </div>
              <Section title="Independent ear frequencies">
                <div className="two-col">
                  <Control
                    label="Left frequency"
                    min={1}
                    max={1550}
                    value={f[0]}
                    step={0.1}
                    unit="Hz"
                    onChange={(v) => {
                      setSettings((s) => directFrequency(s, 0, v));
                      setPreset("");
                    }}
                  />
                  <Control
                    label="Right frequency"
                    min={1}
                    max={1550}
                    value={f[1]}
                    step={0.1}
                    unit="Hz"
                    onChange={(v) => {
                      setSettings((s) => directFrequency(s, 1, v));
                      setPreset("");
                    }}
                  />
                </div>
                <p className="fine">
                  Carrier is their midpoint; beat is their absolute difference.
                  Adjustments preserve the supported carrier and beat ranges. At
                  low carriers, beat frequency is limited to keep both ear
                  frequencies positive.
                </p>
              </Section>
            </Panel>
            <Panel
              className="panel waveform-panel"
              inert={blindActive}
              aria-hidden={blindActive}
              label="Stereo waveform"
              heading={
                <h2>
                  <Activity size={16} /> Stereo waveform
                </h2>
              }
              accessory={
                <>
                  <span className="tag">
                    <i className={playing ? "status-dot on" : "status-dot"} />{" "}
                    LIVE SIGNAL
                  </span>
                </>
              }
            >
              <Scope
                kind="wave"
                engine={engine}
                settings={settings}
                windowMs={windowMs}
              />
              <div className="wave-footer">
                <div className="legend">
                  <span>
                    <i className="left-dot" />
                    Left
                  </span>
                  <span>
                    <i className="right-dot" />
                    Right
                  </span>
                </div>
                <span>TIME DOMAIN · {windowMs} ms</span>
              </div>
              <Section title="Display time window">
                <Control
                  label="Waveform time window"
                  value={windowMs}
                  min={5}
                  max={250}
                  unit="ms"
                  onChange={setWindowMs}
                />
              </Section>
            </Panel>
            <div
              className="visual-grid"
              inert={blindActive}
              aria-hidden={blindActive}
            >
              <Panel
                className="panel"
                label="Frequency relationship"
                heading={<h2>Frequency relationship</h2>}
                accessory={
                  <>
                    <span className="tag">Δ {settings.beat.toFixed(1)} Hz</span>
                  </>
                }
              >
                <Scope
                  kind="spectrum"
                  engine={engine}
                  settings={settings}
                  windowMs={windowMs}
                />
                <p className="fine">
                  Schematic fundamental peaks · harmonics and noise omitted.
                </p>
              </Panel>
              <Panel
                className="panel"
                label="Beat relationship"
                heading={<h2>Beat relationship</h2>}
                accessory={
                  <>
                    <span className="tag">
                      {playing
                        ? live.beat.toFixed(1)
                        : settings.beat.toFixed(1)}{" "}
                      Hz
                    </span>
                  </>
                }
              >
                <Scope
                  kind="beat"
                  engine={engine}
                  settings={settings}
                  windowMs={windowMs}
                />
                <p className="fine">
                  Mathematical difference signal · not neural activity.
                </p>
              </Panel>
            </div>
            <BlindTest
              settings={settings}
              onPlay={(s) => {
                setBlindActive(true);
                auditionRef.current = s;
                play(s);
              }}
              onEnd={() => {
                setBlindActive(false);
                run(
                  Effect.flatMap(Audio, (a) => a.update(settingsRef.current)),
                );
              }}
            />
          </div>
          <aside className="side-column">
            <Panel
              className="panel sound-panel"
              inert={blindActive}
              aria-hidden={blindActive}
              label="Sound & routing"
              heading={
                <h2>
                  <SlidersHorizontal size={16} /> Sound & routing
                </h2>
              }
              accessory={
                <>
                  <span className="tag">ENGINE</span>
                </>
              }
            >
              <Select
                label="Oscillator waveform"
                value={settings.wave}
                options={["sine", "triangle", "square", "sawtooth"]}
                onChange={(v) => patch({ wave: v as OscillatorType })}
              />
              <p className="fine">
                Sine gives the cleanest binaural stimulus. Other waveforms
                introduce harmonics.
              </p>
              <Control
                label="Stereo balance"
                value={settings.balance}
                min={-100}
                max={100}
                unit="%"
                onChange={(balance) => patch({ balance })}
              />
              <div className="balance-labels">
                <span>L</span>
                <span>CENTER</span>
                <span>R</span>
              </div>
              <div className="subdivider" />
              <label className="select-label">
                Playback mode
                <select
                  value={settings.mode}
                  onChange={(e) =>
                    patch({ mode: e.target.value as Settings["mode"] })
                  }
                >
                  <option value="binaural">Binaural · separate ears</option>
                  <option value="mono">Monaural · mixed tones</option>
                  <option value="isochronic">
                    Isochronic · pulsed carrier
                  </option>
                </select>
              </label>
              <p className="fine">
                {settings.mode === "binaural"
                  ? "Two independent tones, delivered separately to each ear."
                  : settings.mode === "mono"
                    ? "Both tones in both ears: physical interference and amplitude beating."
                    : "A single carrier with periodic amplitude pulses. This is not binaural beating."}
              </p>
              <Toggle
                label="Swap left / right"
                checked={settings.swap}
                onChange={(swap) => patch({ swap })}
              />
              <Section title="Background noise">
                <Select
                  label="Noise color"
                  value={settings.noise}
                  options={["off", "white", "pink", "brown"]}
                  onChange={(v) => patch({ noise: v as Settings["noise"] })}
                />
                <Control
                  label="Noise volume"
                  value={settings.noiseVolume}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(noiseVolume) => patch({ noiseVolume })}
                />
                <p className="fine">
                  Generated stereo noise is added after tone routing.
                </p>
              </Section>
              <Section title="Modulation & phase">
                <Toggle
                  label="Amplitude modulation"
                  checked={settings.am}
                  onChange={(am) => patch({ am })}
                />
                <Control
                  label="AM frequency"
                  value={settings.amFrequency}
                  min={0.1}
                  max={100}
                  step={0.1}
                  unit="Hz"
                  onChange={(amFrequency) => patch({ amFrequency })}
                />
                <Control
                  label="AM depth"
                  value={settings.amDepth}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(amDepth) => patch({ amDepth })}
                />
                <p className="fine">
                  Separate modulation nodes change each channel's amplitude. AM
                  is a physical envelope, distinct from binaural perception.
                </p>
                <Control
                  label="Stereo phase offset"
                  value={settings.phase}
                  min={0}
                  max={360}
                  unit="°"
                  onChange={(phase) => patch({ phase })}
                />
                <p className="fine">
                  Delays the right signal by a fraction of its cycle. Changes
                  relative phase, not beat frequency.
                </p>
              </Section>
              <Section title="Isochronic pulse settings">
                <Control
                  label="Pulse duty cycle"
                  value={settings.duty}
                  min={1}
                  max={99}
                  unit="%"
                  onChange={(duty) => patch({ duty })}
                />
                <Control
                  label="Pulse modulation depth"
                  value={settings.pulseDepth}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(pulseDepth) => patch({ pulseDepth })}
                />
                <p className="fine">
                  Pulse rate follows beat frequency. At 0 Hz, the carrier is
                  continuous.
                </p>
              </Section>
              <Section title="Frequency sweeps">
                <SweepControls
                  label="Beat"
                  sweep={settings.beatSweep}
                  min={0}
                  max={100}
                  beat
                  onChange={(beatSweep) => patch({ beatSweep })}
                />
                <div className="subdivider" />
                <SweepControls
                  label="Carrier"
                  sweep={settings.carrierSweep}
                  min={40}
                  max={1500}
                  onChange={(carrierSweep) => patch({ carrierSweep })}
                />
                <p className="fine">
                  Audio-clock automation. Editing sweep settings restarts the
                  sweep; Stop resets it.
                </p>
                {playing &&
                  (settings.beatSweep.enabled ||
                    settings.carrierSweep.enabled) && (
                    <p className="result">
                      Now: {live.carrier.toFixed(1)} Hz carrier ·{" "}
                      {live.beat.toFixed(1)} Hz beat
                    </p>
                  )}
              </Section>
            </Panel>
            <Panel
              className="panel"
              label="Signal path"
              heading={<h2>Signal path</h2>}
              accessory={
                <>
                  <span className="tag">STEREO</span>
                </>
              }
            >
              <SignalFlow settings={settings} />
            </Panel>
            <PresetLibrary
              settings={settings}
              custom={custom}
              preset={preset}
              persist={persist}
              select={setPreset}
              apply={apply}
              randomize={() =>
                patch({
                  carrier: Math.round(100 + Math.random() * 500),
                  beat: Math.round(Math.random() * 400) / 10,
                  mode: "binaural",
                  wave: "sine",
                  noise: "off",
                  am: false,
                  phase: 0,
                  balance: 0,
                  swap: false,
                  beatSweep: { ...defaults.beatSweep },
                  carrierSweep: { ...defaults.carrierSweep },
                })
              }
            />
          </aside>
        </div>
        <Panel
          className="panel education"
          label="A note on perception"
          heading={
            <h2>
              <Info size={16} /> A note on perception
            </h2>
          }
          accessory={
            <>
              <span className="tag">KNOW YOUR STIMULUS</span>
            </>
          }
        >
          <div className="education-grid">
            <div>
              <h3>Two tones. One perceived rhythm.</h3>
              <p>
                When slightly different tones reach separate ears, the auditory
                system may perceive a rhythm at their frequency difference.
                Headphones preserve the separation. At low differences, it can
                feel like fluctuation or motion rather than a separate tone.
              </p>
            </div>
            <div>
              <h3>Find the sound you prefer.</h3>
              <p>
                Monaural mode mixes the tones, producing physical acoustic
                beats. Isochronic mode pulses one tone. Binaural perception
                becomes less reliable at high carrier frequencies or large
                differences. Individual listeners vary.
              </p>
            </div>
            <div>
              <h3>Frequency bands aren't promises.</h3>
              <p>
                Delta through gamma are EEG classifications. A matching audio
                difference does not establish brain entrainment. Evidence for
                sleep, attention, anxiety, and cognition benefits is mixed and
                generally limited.
              </p>
            </div>
          </div>
          <div className="safety-note">
            <Headphones size={15} />
            <span>
              Protect your hearing. Begin quietly, keep sessions comfortable,
              and take breaks. Stop if you experience discomfort.
            </span>
          </div>
        </Panel>
        <footer>
          <span>
            <AudioLines size={14} /> BINAURAL POMODORO
          </span>
          <span>Generated in your browser. Nothing uploaded.</span>
          <span>A LITTLE SPACE TO FOCUS</span>
        </footer>
      </main>
    </div>
  );
};
