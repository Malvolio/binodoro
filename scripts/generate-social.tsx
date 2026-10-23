// Generate the checked-in share image from a React composition and existing artwork.
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
const image = readFileSync(
  new URL("../packages/web/public/images/tomato-red.webp", import.meta.url),
).toString("base64");
const card = (
  <div
    style={{
      width: 1200,
      height: 630,
      boxSizing: "border-box",
      background: "oklch(0.97 0.025 65)",
      display: "flex",
      alignItems: "center",
      padding: 80,
      gap: 60,
      fontFamily: "Georgia, serif",
      color: "oklch(0.27 0.05 35)",
    }}
  >
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 30,
          letterSpacing: 5,
          color: "oklch(0.48 0.15 30)",
          marginBottom: 28,
        }}
      >
        BINODORO
      </div>
      <div style={{ fontSize: 66, lineHeight: 1.08 }}>
        Find your
        <br />
        focus.
      </div>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 27,
          lineHeight: 1.5,
          marginTop: 28,
        }}
      >
        Pomodoro timer
        <br />
        with binaural beats
      </div>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 20,
          marginTop: 30,
          color: "oklch(0.48 0.05 35)",
        }}
      >
        binodoro.online
      </div>
    </div>
    <div style={{ width: 400, height: 400, position: "relative" }}>
      <img
        src={`data:image/webp;base64,${image}`}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 75,
          fontWeight: 700,
          color: "oklch(0.99 0.01 65)",
          textShadow: "0 2px 12px oklch(0.3 0.1 30 / 0.4)",
        }}
      >
        25:00
      </div>
    </div>
  </div>
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0">${renderToStaticMarkup(card)}</body></html>`,
  );
  await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({
    path: new URL(
      "../packages/web/public/images/binodoro-social.png",
      import.meta.url,
    ).pathname,
  });
} finally {
  await browser.close();
}
