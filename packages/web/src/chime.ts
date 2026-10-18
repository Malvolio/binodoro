import { Context, Effect, Layer } from "effect";
export class ChimeEngine {
  private context: AudioContext | null = null;
  private nodes = new Set<OscillatorNode>();
  prepare = async () => {
    this.context ??= new AudioContext();
    if (this.context.state !== "running") await this.context.resume();
  };
  play = async (volume: number) => {
    await this.prepare();
    const context = this.context!;
    const start = context.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const oscillator = context.createOscillator(),
        gain = context.createGain(),
        at = start + i * 0.18;
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(
        (Math.min(100, Math.max(0, volume)) / 100) * 0.15,
        at + 0.008,
      );
      gain.gain.setValueAtTime(
        (Math.min(100, Math.max(0, volume)) / 100) * 0.15,
        at + 0.08,
      );
      gain.gain.linearRampToValueAtTime(0, at + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.13);
      this.nodes.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.nodes.delete(oscillator);
      };
    }
  };
  dispose = async () => {
    for (const oscillator of this.nodes) {
      oscillator.onended = null;
      oscillator.stop();
      oscillator.disconnect();
    }
    this.nodes.clear();
    await this.context?.close();
  };
}
export class CompletionChime extends Context.Tag("CompletionChime")<
  CompletionChime,
  {
    prepare: Effect.Effect<void>;
    play: (volume: number) => Effect.Effect<void>;
  }
>() {}
export const CompletionChimeLive = Layer.scoped(
  CompletionChime,
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => new ChimeEngine()),
      (engine) => Effect.promise(engine.dispose),
    ),
    (engine) => ({
      prepare: Effect.tryPromise({
        try: engine.prepare,
        catch: () => undefined,
      }).pipe(Effect.catchAll(() => Effect.void)),
      play: (volume: number) =>
        Effect.tryPromise({
          try: () => engine.play(volume),
          catch: () => undefined,
        }).pipe(Effect.catchAll(() => Effect.void)),
    }),
  ),
);
