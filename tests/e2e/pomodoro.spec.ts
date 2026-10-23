import { test, expect } from "@playwright/test";
test("home shows the Pomodoro timer and supports focus, breaks, pause, and reset", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await expect(
    page.getByRole("heading", { name: "Time to find your focus" }),
  ).toBeVisible();
  const time = page.getByRole("timer", { name: "Time remaining" });
  await expect(time).toHaveText("25:00");
  await expect(
    page.getByRole("button", { name: "Reset timer", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".timer-mode-label")).toHaveText("FOCUS");
  await expect(
    page
      .getByRole("combobox", { name: "Sound preset", exact: true })
      .locator("option:checked"),
  ).toHaveText("Alpha");

  await expect(page.locator(".session-progress")).toHaveCount(0);
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset timer", exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(2500);
  await expect(time).toHaveText("24:58");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset timer", exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(5000);
  await expect(time).toHaveText("24:58");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(1500);
  await expect(time).toHaveText("24:56");
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await expect(time).toHaveText("25:00");
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await expect(time).toHaveText("05:00");
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  await expect(time).toHaveText("15:00");
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.clock.fastForward(25 * 60_000);
  await expect(time).toHaveText("05:00");
  await expect(
    page.getByRole("tab", { name: "Short break", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("sound, saved presets, and a running timer are shared with the secondary controls page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("Sound preset", { exact: true })
    .selectOption({ label: "Gamma" });
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
  await expect(page).toHaveURL(/\/controls$/);
  await expect(
    page.getByRole("spinbutton", { name: "Beat frequency", exact: true }),
  ).toHaveValue("40");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Beat frequency", exact: true })
    .fill("12");
  await page.getByLabel("Preset name", { exact: true }).fill("My work sound");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.getByRole("link", { name: "Back to timer", exact: false }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("timer", { name: "Time remaining" }),
  ).not.toHaveText("25:00");
  await expect(
    page.getByLabel("Sound preset", { exact: true }).locator("option:checked"),
  ).toHaveText("My work sound");
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Beat frequency", exact: true }),
  ).toHaveValue("12");
  expect(errors).toEqual([]);
});
test("timer page fits mobile and mode tabs support keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("tab", { name: "Focus", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Short break", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.screenshot({
    path: "test-results/pomodoro-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("minimal headers and always-visible Volume follow the selected timer mode", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".pomodoro-header")).toHaveCount(0);
  await expect(page.locator(".pomodoro-intro h1")).toHaveText(
    "Time to find your focus",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Volume", exact: true }),
  ).toBeVisible();
  await expect(page.locator("details.focus-volume")).toHaveCount(0);
  const volumeCard = page.getByRole("region", {
    name: "Sound volume controls",
  });
  await expect(
    volumeCard.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await expect(
    volumeCard.getByRole("slider", { name: "Volume slider", exact: true }),
  ).toBeVisible();
  const volumeBounds = (await volumeCard.boundingBox())!;
  const binauralBounds = (await page
    .getByRole("region", { name: "Binaural sound controls" })
    .boundingBox())!;
  expect(binauralBounds.y).toBeGreaterThanOrEqual(
    volumeBounds.y + volumeBounds.height,
  );

  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Time to take a breath", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Sound preset", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Break music controls" })
      .getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Time to take a walk", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Volume", exact: true }),
  ).toBeVisible();
});

test("playback switches between tones and the local looping music playlist; mute stops both", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Math.random = () => 0.5;
  });
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Volume", exact: true }).fill("8");
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  const music = page.locator("audio[data-break-music]");
  await expect(music).toHaveCount(1);
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(false);
  expect(await music.evaluate((el: HTMLAudioElement) => el.volume)).toBeCloseTo(
    0.08 * 0.25,
  );
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.readyState))
    .toBeGreaterThanOrEqual(3);
  const first = await music.evaluate((el: HTMLAudioElement) => el.src);
  expect(first).toContain("/music/Take%20Off%20Your%20Headset.opus");
  for (const name of [
    "Youve%20Earned%20Your%20Ease",
    "Find%20Your%20Track",
    "Neons%20Fading",
    "Take%20Off%20Your%20Headset",
  ]) {
    await music.evaluate((el) => el.dispatchEvent(new Event("ended")));
    await expect
      .poll(() => music.evaluate((el: HTMLAudioElement) => el.src))
      .toContain(name);
    await expect
      .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
      .toBe(false);
    await expect
      .poll(() => music.evaluate((el: HTMLAudioElement) => el.readyState))
      .toBeGreaterThanOrEqual(3);
  }
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play sound", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Play sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(false);
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
});

test("sound is enabled by default but only runs with the timer; music restarts randomly", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page.evaluate(() => {
    Math.random = () => 0.9;
  });
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("READY", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await expect(page.locator("audio[data-break-music]")).toHaveCount(0);
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  const music = page.locator("audio[data-break-music]");
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(false);
  expect(await music.evaluate((el: HTMLAudioElement) => el.src)).toContain(
    "Youve%20Earned%20Your%20Ease",
  );
  await page.clock.fastForward(1000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page.getByRole("button", { name: "Play sound", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await page.evaluate(() => {
    Math.random = () => 0.4;
  });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(false);
  expect(await music.evaluate((el: HTMLAudioElement) => el.src)).toContain(
    "Neons%20Fading",
  );
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(false);
  await page.clock.fastForward(5 * 60_000);
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await expect
    .poll(() => music.evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
});
test("focus, short break, and long break use red, yellow, and green themes", async ({
  page,
}) => {
  await page.goto("/");
  const accent = () =>
    page
      .locator(".pomodoro-page")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--focus-accent"),
      );
  expect(await accent()).toContain("28");
  await expect(
    page.getByRole("link", { name: "edit presets", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  expect(await accent()).toContain("90");
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  expect(await accent()).toContain("150");
});

test("timer ring supports drag and keyboard adjustment", async ({ page }) => {
  await page.goto("/");
  const ring = page.getByRole("slider", {
    name: "Remaining time",
    exact: true,
  });
  const rect = await ring.boundingBox();
  expect(rect).not.toBeNull();
  const r = rect!;
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.05);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.95, r.y + r.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByRole("timer")).toHaveText("06:15");
  await ring.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("timer")).toHaveText("06:30");
  await page.keyboard.press("End");
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await ring.focus();
  await page.keyboard.press("Home");

  await expect(page.getByRole("timer")).toHaveText("05:00");
});
test("completion emits three short native beeps once; reset and mute do not announce", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page
    .getByRole("slider", { name: "Remaining time", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => {
    const original = AudioContext.prototype.createOscillator;
    const frequencies: number[] = [];
    Object.defineProperty(window, "testBeepFrequencies", {
      value: frequencies,
    });
    AudioContext.prototype.createOscillator = function () {
      const oscillator = original.call(this);
      const start = oscillator.start.bind(oscillator);
      oscillator.start = (when?: number) => {
        frequencies.push(oscillator.frequency.value);
        start(when);
      };
      return oscillator;
    };
  });
  await page.clock.fastForward(1000);
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, "testBeepFrequencies").filter(
            (f: number) => f === 880,
          ).length,
      ),
    )
    .toBe(3);
  await page.clock.fastForward(2000);
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, "testBeepFrequencies").filter(
          (f: number) => f === 880,
        ).length,
    ),
  ).toBe(3);
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page
    .getByRole("slider", { name: "Remaining time", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("timer")).toHaveText("25:00");
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, "testBeepFrequencies").filter(
          (f: number) => f === 880,
        ).length,
    ),
  ).toBe(3);
});

test("compact phones keep sound selection, edit presets, and Volume in view", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const picker = page.getByRole("combobox", {
      name: "Sound preset",
      exact: true,
    });
    const edit = page.getByRole("link", { name: "edit presets", exact: true });
    await expect(picker).toBeInViewport({ ratio: 1 });
    await expect(edit).toBeInViewport({ ratio: 1 });
    const pickerBox = (await picker.boundingBox())!;
    const labelBox = (await page
      .locator('label[for="focus-sound"]')
      .boundingBox())!;
    expect(pickerBox.y - (labelBox.y + labelBox.height)).toBeGreaterThanOrEqual(
      8,
    );

    const editBox = (await edit.boundingBox())!;
    expect(pickerBox.x + pickerBox.width).toBeLessThanOrEqual(editBox.x);
    for (const phase of ["Focus", "Short break", "Long break"]) {
      await page.getByRole("tab", { name: phase, exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Learn more", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("slider", { name: "Volume slider", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    }
  }
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
  await expect(page).toHaveURL(/\/controls$/);
});

test("mute, selected sounds, and custom presets survive reloads", async ({
  page,
}) => {
  await page.goto("/");
  const sound = page.getByRole("combobox", {
    name: "Sound preset",
    exact: true,
  });
  await sound.selectOption({ label: "Gamma" });
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page.reload();
  await expect(sound).toHaveValue("default-4");
  await expect(
    page.getByRole("button", { name: "Play sound", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play sound", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "edit presets", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Beat frequency", exact: true })
    .fill("7.5");
  await page
    .getByLabel("Preset name", { exact: true })
    .fill("My persistent sound");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.reload();
  await expect(
    page.getByLabel("SOUND PRESET").locator("option:checked"),
  ).toHaveText("My persistent sound");
  await expect(
    page.getByRole("spinbutton", { name: "Beat frequency", exact: true }),
  ).toHaveValue("7.5");
  await page.goto("/");
  await expect(sound.locator("option:checked")).toHaveText(
    "My persistent sound",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("binaural-lab-presets-v1")!),
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].name).toBe("My persistent sound");
});

test("invalid saved sound preferences fall back to safe defaults", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "binaural-lab-sound-v1",
      '{"muted":"yes","settings":{}}',
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Sound preset", exact: true }),
  ).toHaveValue("default-2");
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
});

test("completed sessions automatically start the standard Pomodoro sequence", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  for (let focus = 1; focus <= 4; focus++) {
    await page.clock.fastForward(25 * 60_000);
    const breakName = focus === 4 ? "Long break" : "Short break";
    await expect(
      page.getByRole("tab", { name: breakName, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".timer-overlay-start")).toHaveCount(0);
    await page.clock.fastForward(1000);
    await expect(page.getByRole("timer")).toHaveText(
      focus === 4 ? "14:59" : "04:59",
    );
    await page.clock.fastForward((focus === 4 ? 15 : 5) * 60_000 - 1000);
    await expect(
      page.getByRole("tab", { name: "Focus", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("timer")).toHaveText("25:00");
  }
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start break", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeDisabled();
});

test("mode steps follow the timer and Start floats over the time", async ({
  page,
}) => {
  await page.goto("/");
  const timer = (await page.getByRole("timer").boundingBox())!;
  const start = (await page
    .getByRole("button", { name: "Start focus", exact: true })
    .boundingBox())!;
  const steps = (await page
    .getByRole("tablist", { name: "Timer mode" })
    .boundingBox())!;
  expect(steps.y).toBeGreaterThan(timer.y + timer.height);
  expect(start.y).toBeLessThan(timer.y + timer.height);
  expect(start.y + start.height).toBeGreaterThan(timer.y);
});

test("hiding the document keeps focus sound playing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(page.getByText("PLAYING", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText("PLAYING", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeEnabled();
});

test("About explains the timer and sound studio and closes accessibly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.locator(".pomodoro-subtitle")).toContainText(
    "Binodoro combines Pomodoro time-management with binaural beats for concentration",
  );
  const about = page.getByRole("button", { name: "Learn more", exact: true });
  await about.click();
  const dialog = page.getByRole("dialog", { name: "About Binodoro" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("After four focus sessions");
  await expect(
    dialog.getByRole("link", { name: "info@binodoro.online" }),
  ).toHaveAttribute("href", "mailto:info@binodoro.online");
  await expect(dialog).toContainText("mixed and limited");
  await expect(dialog).toContainText(
    "preview tones without starting the timer",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(about).toBeFocused();
  await about.click();
  await page.getByRole("button", { name: "Close About", exact: true }).click();
  await expect(dialog).toBeHidden();
  await about.click();
  await page
    .getByRole("link", { name: "Explore sound controls", exact: true })
    .click();
  await expect(page).toHaveURL(/\/controls$/);
});
