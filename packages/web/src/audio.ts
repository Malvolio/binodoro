export { defaults } from "../../shared/src/model";
import {
  clamp,
  defaultMasterVolume,
  frequencies,
  normalize,
  routing,
  sweepValue,
  type Settings,
} from "../../shared/src/model";
// Persistent graph: oscillator -> phase delay -> AM -> pulse -> ear gain -> routing matrix -> stereo merger.
export class AudioEngine {
  context: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private earGains: GainNode[] = [];
  private delays: DelayNode[] = [];
  private amGains: GainNode[] = [];
  private lfos: OscillatorNode[] = [];
  private lfoDepths: GainNode[] = [];
  private pulses: GainNode[] = [];
  private pulseOscillators: OscillatorNode[] = [];
  private pulseDepths: GainNode[] = [];
  private waveformTimers: ReturnType<typeof setTimeout>[] = [];
  private matrix: GainNode[] = [];
  private master: GainNode | null = null;
  private masterVolume = defaultMasterVolume;
  setVolume = (volume: number) => {
    this.masterVolume = clamp(volume, 0, 100);
    if (this.master)
      this.ramp(
        this.master.gain,
        this.playing ? (this.masterVolume / 100) * 0.25 : 0,
      );
  };
  private noiseGain: GainNode | null = null;
  private noiseSources: AudioBufferSourceNode[] = [];
  private noiseMix: GainNode[] = [];
  analysers: AnalyserNode[] = [];
  private settings: Settings | null = null;
  private sweepEpoch = 0;
  private scheduledUntil = 0;
  private pausedAt: number | null = null;
  private resetOnPlay = false;
  private elapsedBeforePause = 0;
  private lastStartedAt = 0;
  elapsed = () =>
    this.elapsedBeforePause +
    (this.playing && this.context
      ? this.context.currentTime - this.lastStartedAt
      : 0);
  private onVisibility = () => {
    if (document.hidden && this.playing) {
      this.pause();
      this.onState?.(false);
    }
  };
  private timer: ReturnType<typeof setInterval> | undefined;
  playing = false;
  onState: ((playing: boolean) => void) | null = null;
  private ramp = (param: AudioParam, value: number, seconds = 0.025) => {
    const c = this.context!;
    param.cancelAndHoldAtTime(c.currentTime);
    param.setTargetAtTime(value, c.currentTime, seconds);
  };
  initialize = () => {
    if (this.context) return;
    const c = new AudioContext({ latencyHint: "interactive" });
    this.context = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const merger = c.createChannelMerger(2);
    merger.channelInterpretation = "discrete";
    merger.connect(this.master);
    this.master.connect(c.destination);
    const outputs = [c.createGain(), c.createGain()];
    outputs.forEach((bus, i) => {
      const analyser = c.createAnalyser();
      analyser.fftSize = 16384;
      bus.connect(analyser);
      analyser.connect(merger, 0, i);
      this.analysers.push(analyser);
    });
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator(),
        d = c.createDelay(0.1),
        am = c.createGain(),
        pulse = c.createGain(),
        g = c.createGain(),
        lfo = c.createOscillator(),
        depth = c.createGain(),
        pulseOsc = c.createOscillator(),
        pulseDepth = c.createGain();
      o.frequency.value = 220;
      g.gain.value = 0.5;
      lfo.connect(depth);
      depth.connect(am.gain);
      depth.gain.value = 0;
      am.gain.value = 1;
      o.connect(d);
      d.connect(am);
      am.connect(pulse);
      pulse.connect(g);
      pulseOsc.connect(pulseDepth);
      pulseDepth.connect(pulse.gain);
      pulseDepth.gain.value = 0;
      pulseOsc.start();
      this.pulseOscillators.push(pulseOsc);
      this.pulseDepths.push(pulseDepth);
      for (let out = 0; out < 2; out++) {
        const r = c.createGain();
        r.gain.value = i === out ? 1 : 0;
        g.connect(r);
        r.connect(outputs[out]);
        this.matrix.push(r);
      }
      o.start();
      lfo.start();
      this.oscillators.push(o);
      this.delays.push(d);
      this.amGains.push(am);
      this.pulses.push(pulse);
      this.earGains.push(g);
      this.lfos.push(lfo);
      this.lfoDepths.push(depth);
    }
    this.noiseGain = c.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.master);
    for (const kind of ["white", "pink", "brown"]) {
      const buffer = c.createBuffer(2, c.sampleRate * 4, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let brown = 0,
          b0 = 0,
          b1 = 0,
          b2 = 0;
        for (let j = 0; j < data.length; j++) {
          const w = Math.random() * 2 - 1;
          brown = (brown + 0.02 * w) / 1.02;
          b0 = 0.99765 * b0 + w * 0.099046;
          b1 = 0.963 * b1 + w * 0.2965164;
          b2 = 0.57 * b2 + w * 1.0526913;
          data[j] =
            kind === "white"
              ? w
              : kind === "brown"
                ? brown * 3.5
                : (b0 + b1 + b2 + w * 0.1848) * 0.15;
        }
        let peak = 1;
        for (const value of data) peak = Math.max(peak, Math.abs(value));
        for (let j = 0; j < data.length; j++) data[j] /= peak;
      }
      const source = c.createBufferSource(),
        mix = c.createGain();
      source.buffer = buffer;
      source.loop = true;
      mix.gain.value = 0;
      source.connect(mix);
      mix.connect(this.noiseGain);
      source.start();
      this.noiseSources.push(source);
      this.noiseMix.push(mix);
    }
    c.onstatechange = () => {
      if (c.state !== "running" && this.playing) {
        this.pause();
        this.onState?.(false);
      }
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    this.timer = setInterval(this.schedule, 80);
  };
  private playGeneration = 0;
  play = async (s: Settings) => {
    const generation = ++this.playGeneration;
    this.initialize();
    await this.context!.resume();
    if (generation !== this.playGeneration) return;
    if (this.resetOnPlay) {
      this.sweepEpoch = this.context!.currentTime;
      this.resetOnPlay = false;
    } else if (this.pausedAt !== null) {
      this.sweepEpoch += this.context!.currentTime - this.pausedAt;
    }
    this.pausedAt = null;
    this.scheduledUntil = this.context!.currentTime;
    if (!this.playing) this.lastStartedAt = this.context!.currentTime;
    this.playing = true;
    this.oscillators.forEach((o) =>
      o.frequency.cancelAndHoldAtTime(this.context!.currentTime),
    );
    this.pulseOscillators.forEach((o) =>
      o.frequency.cancelAndHoldAtTime(this.context!.currentTime),
    );
    this.update(s);
    this.schedule();
    this.ramp(this.master!.gain, (this.masterVolume / 100) * 0.25, 0.018);
  };
  pause = () => {
    this.playGeneration++;
    if (!this.context) return;
    this.elapsedBeforePause = this.elapsed();
    this.playing = false;
    this.pausedAt = this.context.currentTime;
    this.ramp(this.master!.gain, 0, 0.012);
  };
  stop = () => {
    this.pause();
    this.sweepEpoch = this.context?.currentTime ?? 0;
    this.resetOnPlay = true;
    this.elapsedBeforePause = 0;
  };
  update = (s: Settings) => {
    const previous = this.settings;
    this.settings = s;
    if (!this.context) return;
    const sweepChanged =
      !previous ||
      JSON.stringify([
        previous.beatSweep,
        previous.carrierSweep,
        previous.mode,
        previous.duty,
        previous.pulseDepth,
        previous.carrier,
        previous.beat,
        previous.direction,
      ]) !==
        JSON.stringify([
          s.beatSweep,
          s.carrierSweep,
          s.mode,
          s.duty,
          s.pulseDepth,
          s.carrier,
          s.beat,
          s.direction,
        ]);
    if (sweepChanged) {
      this.sweepEpoch = this.context.currentTime;
      if (!this.playing) this.pausedAt = this.context.currentTime;
      this.pulseOscillators.forEach((o) =>
        o.frequency.cancelAndHoldAtTime(this.context!.currentTime),
      );
      this.scheduledUntil = this.context.currentTime;
      this.oscillators.forEach((o) =>
        o.frequency.cancelAndHoldAtTime(this.context!.currentTime),
      );
      this.pulses.forEach((p) =>
        p.gain.cancelAndHoldAtTime(this.context!.currentTime),
      );
    }
    const matrix = routing(s.mode, s.swap);
    const pulseDuty = s.duty / 100,
      pulseAmount =
        s.mode === "isochronic" && s.beat > 0 ? s.pulseDepth / 100 : 0;
    if (!previous || previous.duty !== s.duty) {
      const real = new Float32Array(65),
        imag = new Float32Array(65);
      for (let n = 1; n < 65; n++)
        real[n] =
          ((2 * Math.sin(Math.PI * n * pulseDuty)) / (Math.PI * n)) *
          Math.pow(Math.sin((Math.PI * n) / 65) / ((Math.PI * n) / 65), 2);
      const wave = this.context.createPeriodicWave(real, imag, {
        disableNormalization: true,
      });
      this.pulseOscillators.forEach((o) => o.setPeriodicWave(wave));
    }
    this.pulses.forEach((p, i) => {
      this.ramp(p.gain, 1 - pulseAmount * (1 - pulseDuty));
      this.ramp(this.pulseDepths[i].gain, pulseAmount);
    });
    this.oscillators.forEach((o, i) => {
      const gain =
        0.65 *
        (i === 0
          ? 1 - Math.max(0, s.balance) / 100
          : 1 + Math.min(0, s.balance) / 100);
      clearTimeout(this.waveformTimers[i]);
      if (o.type !== s.wave) {
        this.ramp(this.earGains[i].gain, 0, 0.004);
        this.waveformTimers[i] = setTimeout(() => {
          o.type = s.wave;
          this.ramp(this.earGains[i].gain, gain, 0.01);
        }, 45);
      } else this.ramp(this.earGains[i].gain, gain);
      this.ramp(
        this.delays[i].delayTime,
        i === 1 ? s.phase / 360 / Math.max(1, frequencies(s)[1]) : 0,
      );
      this.ramp(this.amGains[i].gain, s.am ? 1 - s.amDepth / 200 : 1);
      this.ramp(this.lfoDepths[i].gain, s.am ? s.amDepth / 200 : 0);
      this.ramp(this.lfos[i].frequency, s.amFrequency);
      matrix[i].forEach((value, j) =>
        this.ramp(this.matrix[i * 2 + j].gain, value),
      );
    });
    this.noiseMix.forEach((g, i) =>
      this.ramp(g.gain, ["white", "pink", "brown"][i] === s.noise ? 1 : 0),
    );
    this.ramp(this.noiseGain!.gain, (s.noiseVolume / 100) * 0.3);
    this.ramp(
      this.master!.gain,
      this.playing ? (this.masterVolume / 100) * 0.25 : 0,
    );
    if (sweepChanged) this.schedule();
  };
  current = () => {
    const s = this.settings;
    if (!s) return null;
    const elapsed = Math.max(
      0,
      (this.pausedAt ?? this.context?.currentTime ?? 0) - this.sweepEpoch,
    );
    return normalize({
      ...s,
      carrier: s.carrierSweep.enabled
        ? sweepValue(s.carrierSweep, elapsed)
        : s.carrier,
      beat: s.beatSweep.enabled ? sweepValue(s.beatSweep, elapsed) : s.beat,
    });
  };
  private schedule = () => {
    const c = this.context,
      s = this.settings;
    if (!c || !s || !this.playing) return;
    const now = c.currentTime;
    let t = Math.max(now + 0.005, this.scheduledUntil);
    const end = now + 0.4;
    for (; t <= end; t += 0.005) {
      const elapsed = t - this.sweepEpoch,
        carrier = s.carrierSweep.enabled
          ? sweepValue(s.carrierSweep, elapsed)
          : s.carrier,
        beat = s.beatSweep.enabled ? sweepValue(s.beatSweep, elapsed) : s.beat;
      const f = frequencies(normalize({ ...s, carrier, beat }));
      this.oscillators.forEach((o, i) =>
        o.frequency.linearRampToValueAtTime(
          Math.max(1, s.mode === "isochronic" ? carrier : f[i]),
          t,
        ),
      );
      this.pulseOscillators.forEach((o) =>
        o.frequency.linearRampToValueAtTime(beat, t),
      );
    }
    this.scheduledUntil = t;
  };
  dispose = async () => {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.onState = null;
    this.waveformTimers.forEach(clearTimeout);
    this.pulseOscillators.forEach((o) => o.stop());
    this.oscillators.forEach((o) => o.stop());
    this.lfos.forEach((o) => o.stop());
    this.noiseSources.forEach((o) => o.stop());
    await this.context?.close();
  };
}
