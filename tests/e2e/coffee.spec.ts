import { test, expect } from "@playwright/test";
test("chosen breaks invite after five seconds, show the official logo, and dismiss after thirty seconds", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page.evaluate(() => {
    Math.random = () => 0.1;
  });
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await page.clock.fastForward(6000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(4000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Buy Me a Coffee logo" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("img", { name: "Buy Me a Coffee logo" })
      .evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0);
  await page.clock.fastForward(29000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("skipped invitations do not reroll on resume, and reset or mode changes cancel pending invitations", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page.evaluate(() => {
    Math.random = () => 0.9;
  });
  await page.getByRole("tab", { name: "Short break", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(1000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.evaluate(() => {
    Math.random = () => 0.1;
  });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(6000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(2000);
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(1000);
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("accepting opens the requested support page in another browsing context; declining dismisses", async ({
  page,
  context,
}) => {
  await context.route("https://buymeacoffee.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Support Michael</title>",
    }),
  );
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page.evaluate(() => {
    Math.random = () => 0.1;
  });
  await page.getByRole("tab", { name: "Long break", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("dialog")).toBeVisible();
  const popup = context.waitForEvent("page");
  await page
    .getByRole("link", { name: "Buy me a coffee", exact: false })
    .click();
  const support = await popup;
  await expect(support).toHaveURL("https://buymeacoffee.com/michaellorton");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await support.close();
  await page.getByRole("button", { name: "Reset timer", exact: true }).click();
  await page.getByRole("button", { name: "Start break", exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
