import { expect, test, type Page } from "@playwright/test";
const openRunningStudio = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
};
test("transport, precise controls, persisted presets, and blind scoring", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openRunningStudio(page);
  await expect(
    page.getByRole("heading", { name: "Frequency generator" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Beat frequency", exact: true })
    .fill("6.5");
  await expect(page.locator(".ear-readouts")).toContainText("216.8");
  await page.getByText("Independent ear frequencies", { exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Left frequency", exact: true })
    .fill("220");
  await expect(
    page.getByRole("spinbutton", { name: "Carrier frequency", exact: true }),
  ).toHaveValue("221.63");
  await page.getByLabel("Playback mode").selectOption("mono");
  await expect(page.locator(".signal-flow")).toContainText("Both tones mixed");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Preset name", { exact: true })
    .fill("Browser experiment");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.reload();
  await page
    .getByLabel("SOUND PRESET")
    .selectOption({ label: "Browser experiment" });
  await expect(page.getByLabel("Playback mode")).toHaveValue("mono");
  await page
    .getByRole("button", { name: "Expand Blind comparison", exact: true })
    .click();
  await page.getByRole("button", { name: "Listen X", exact: false }).click();
  await expect(page.locator(".frequency-panel")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Stimulus A", exact: true }).click();
  await expect(page.locator(".frequency-panel")).not.toHaveAttribute(
    "inert",
    "",
  );
  await expect(page.locator(".trial-footer")).toContainText("1 trials");
  await expect(page.locator(".blind-panel .result")).toContainText("X =");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(errors).toEqual([]);
});
test("mobile layout fits viewport and sliders remain keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRunningStudio(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const slider = page.getByRole("slider", {
    name: "Beat frequency slider",
    exact: true,
  });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("spinbutton", { name: "Beat frequency", exact: true }),
  ).toHaveValue("10.1");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("native audio graph isolates tones, swaps channels, and mixes mono", async ({
  page,
}) => {
  await openRunningStudio(page);

  const result = await page.evaluate(async () => {
    // Import the actual browser engine and inspect its native analyser output.
    const { AudioEngine, defaults } = await import("/src/audio.ts" as string);
    const engine = new AudioEngine();
    engine.setVolume(0);
    await engine.play({ ...defaults });
    const wait = () => new Promise((r) => setTimeout(r, 500));
    const amplitudes = () =>
      engine.analysers.map((an: AnalyserNode) => {
        const data = new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(data);
        return [215, 225].map((f) => {
          let re = 0,
            im = 0,
            windowSum = 0;
          data.forEach((v, i) => {
            const w =
              0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (data.length - 1));
            windowSum += w;
            re +=
              v *
              w *
              Math.cos((2 * Math.PI * f * i) / engine.context.sampleRate);
            im +=
              v *
              w *
              Math.sin((2 * Math.PI * f * i) / engine.context.sampleRate);
          });
          return (2 * Math.hypot(re, im)) / windowSum;
        });
      });
    await wait();
    const isolated = amplitudes();
    engine.update({ ...defaults, swap: true });
    await wait();
    const swapped = amplitudes();
    engine.update({ ...defaults, mode: "mono" });
    await wait();
    const mono = amplitudes();
    await engine.dispose();
    return { isolated, swapped, mono };
  });
  expect(result.isolated[0][0]).toBeGreaterThan(0.5);
  expect(result.isolated[0][1]).toBeLessThan(0.02);
  expect(result.isolated[1][1]).toBeGreaterThan(0.5);
  expect(result.isolated[1][0]).toBeLessThan(0.02);
  expect(result.swapped[0][1]).toBeGreaterThan(0.5);
  expect(result.swapped[0][0]).toBeLessThan(0.02);
  for (const ch of result.mono)
    for (const v of ch) expect(v).toBeGreaterThan(0.25);
});

test("sweeps follow the audio clock, pause retains position, and stop resets", async ({
  page,
}) => {
  await openRunningStudio(page);

  const result = await page.evaluate(async () => {
    const { AudioEngine, defaults } = await import("/src/audio.ts" as string);
    const engine = new AudioEngine();
    engine.setVolume(0);
    const settings = {
      ...defaults,
      beatSweep: {
        ...defaults.beatSweep,
        enabled: true,
        start: 2,
        end: 20,
        duration: 1,
      },
    };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await engine.play(settings);
    const nodes = [...engine.oscillators];
    await wait(550);
    const running = engine.current().beat;
    engine.pause();
    const paused = engine.current().beat;
    await wait(200);
    const held = engine.current().beat;
    await engine.play(settings);
    await wait(100);
    const resumed = engine.current().beat;
    engine.stop();
    await engine.play(settings);
    const restarted = engine.current().beat;
    const reused = nodes.every(
      (node, index) => node === engine.oscillators[index],
    );
    engine.update({
      ...defaults,
      mode: "isochronic",
      pulseDepth: 100,
      am: true,
      amDepth: 100,
    });
    await wait(100);
    const modes = engine.current();
    await engine.context.suspend();
    await wait(40);
    const interrupted = !engine.playing;
    await engine.dispose();
    return {
      running,
      paused,
      held,
      resumed,
      restarted,
      reused,
      interrupted,
      mode: modes.mode,
    };
  });
  expect(result.running).toBeGreaterThan(10);
  expect(result.running).toBeLessThan(16);
  expect(result.held).toBeCloseTo(result.paused, 5);
  expect(result.resumed).toBeGreaterThan(result.held);
  expect(result.restarted).toBeLessThan(3);
  expect(result.reused).toBe(true);
  expect(result.interrupted).toBe(true);
  expect(result.mode).toBe("isochronic");
});

test("every panel collapses to its header and restores its controls unchanged", async ({
  page,
}) => {
  await openRunningStudio(page);
  await page
    .getByRole("spinbutton", { name: "Beat frequency", exact: true })
    .fill("12.3");
  await page.getByLabel("Preset name", { exact: true }).fill("Keep this draft");
  const toggles = page.getByRole("button", { name: /^Collapse / });
  const count = await page.locator(".panel").count();
  expect(count).toBe(10);
  await expect(page.locator(".panel.is-collapsed")).toHaveCount(4);
  while (await toggles.count()) await toggles.first().click();
  await expect(page.locator(".panel.is-collapsed")).toHaveCount(count);
  await expect(page.getByRole("button", { name: /^Expand / })).toHaveCount(
    count,
  );
  for (const panel of await page.locator(".panel").all()) {
    await expect(panel.locator(":scope > .panel-heading")).toBeVisible();
    await expect(panel.locator(":scope > .panel-body")).toBeHidden();
  }
  const expand = page.getByRole("button", {
    name: "Expand Frequency generator",
    exact: true,
  });
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: "Beat frequency", exact: true }),
  ).toHaveValue("12.3");
  await page
    .getByRole("button", { name: "Expand Saved sounds", exact: true })
    .click();
  await expect(page.getByLabel("Preset name", { exact: true })).toHaveValue(
    "Keep this draft",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("panel defaults, saved overrides, and reduced-motion preference survive reloads", async ({
  page,
}) => {
  await openRunningStudio(page);
  const defaults = [
    "Stereo waveform",
    "Frequency relationship",
    "Beat relationship",
    "Blind comparison",
  ];
  for (const label of defaults)
    await expect(
      page.getByRole("button", { name: `Expand ${label}`, exact: true }),
    ).toBeVisible();
  const waveform = page.locator(".waveform-panel");
  await expect(waveform.locator(".panel-body")).toBeHidden();
  const closedHeight = await waveform.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  await page
    .getByRole("button", { name: "Expand Stereo waveform", exact: true })
    .click();
  await expect(waveform.locator(".panel-body")).toBeVisible();
  await expect
    .poll(() => waveform.evaluate((el) => el.getBoundingClientRect().height))
    .toBeGreaterThan(closedHeight + 100);
  expect(
    await waveform
      .locator(".panel-body")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toContain("0.24s");
  await page
    .getByRole("button", { name: "Collapse Sound & routing", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Collapse Stereo waveform", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand Sound & routing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand Beat relationship", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await waveform
      .locator(".panel-body")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page
    .getByRole("button", { name: "Collapse Stereo waveform", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand Stereo waveform", exact: true }),
  ).toBeVisible();
});

test("master volume is independent of presets, randomization, and blind stimuli", async ({
  page,
}) => {
  await openRunningStudio(page);
  const volume = page.getByRole("spinbutton", {
    name: "Master volume",
    exact: true,
  });
  const preset = page.getByLabel("SOUND PRESET");
  await volume.fill("7");
  await preset.selectOption({ label: "Gamma" });
  await expect(volume).toHaveValue("7");
  await volume.fill("9");
  await expect(preset).toHaveValue("default-4");
  await page
    .getByLabel("Preset name", { exact: true })
    .fill("Volume independent");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("binaural-lab-presets-v1")!),
  );
  expect(saved[0].settings).not.toHaveProperty("volume");
  await volume.fill("4");
  await preset.selectOption({ label: "Alpha" });
  await preset.selectOption({ label: "Volume independent" });
  await expect(volume).toHaveValue("4");
  await page.getByRole("button", { name: "Randomize", exact: true }).click();
  await expect(volume).toHaveValue("4");
  await page
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await expect(volume).toHaveValue("4");
  await page
    .getByRole("button", { name: "Expand Blind comparison", exact: true })
    .click();
  await page.getByRole("button", { name: "Listen X", exact: false }).click();
  await expect(volume).toHaveValue("4");
  await volume.fill("3");
  await expect(page.locator(".frequency-panel")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Listen Y", exact: false }).click();
  await expect(volume).toHaveValue("3");
  await page.getByRole("button", { name: "Reveal", exact: true }).click();
  await expect(volume).toHaveValue("3");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const gain = await page.evaluate(async () => {
    const { AudioEngine, defaults } = await import("/src/audio.ts" as string);
    const engine = new AudioEngine();
    engine.setVolume(7);
    await engine.play(defaults);
    engine.update({ ...defaults, beat: 6, volume: 99 });
    await engine.play({ ...defaults, carrier: 300 });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const value = engine.master.gain.value;
    await engine.dispose();
    return value;
  });
  expect(gain).toBeCloseTo(0.07 * 0.25, 4);
});

test("studio previews audio with a paused timer and stops on returning home", async ({
  page,
}) => {
  await page.goto("/controls");
  const play = page.getByRole("button", { name: "Play audio", exact: true });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".transport-status")).toContainText(
    "SIGNAL ACTIVE",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(play).toBeVisible();
  await play.click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(play).toBeVisible();
  await play.click();
  await page.getByRole("link", { name: "Back to timer", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sound-picker")).toContainText("READY");
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
  await play.click();
  await expect(page.locator(".transport-status")).toContainText(
    "SIGNAL ACTIVE",
  );
});

test("whole panel title rows toggle from titles, blank space, and chevrons", async ({
  page,
}) => {
  await page.goto("/controls");
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    for (const panel of await page.locator(".panel").all()) {
      const button = panel.locator(":scope > .panel-heading > .panel-toggle");
      const before = await button.getAttribute("aria-expanded");
      await panel
        .locator(":scope > .panel-heading")
        .click({ position: { x: 12, y: 12 } });
      await expect(button).toHaveAttribute(
        "aria-expanded",
        before === "true" ? "false" : "true",
      );
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", before!);
      await button.focus();
      await page.keyboard.press("Space");
      await expect(button).toHaveAttribute(
        "aria-expanded",
        before === "true" ? "false" : "true",
      );
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-expanded", before!);
    }
  }
});
