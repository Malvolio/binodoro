import { defineConfig } from "@playwright/test";
const staticBuild = process.env.TEST_STATIC === "1";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: staticBuild ? "http://127.0.0.1:4173" : "http://127.0.0.1:5175",
    headless: true,
    launchOptions: { args: ["--mute-audio"] },
  },
  webServer: {
    command: staticBuild
      ? "bun run preview"
      : "bun run dev --port 5175 --strictPort",
    url: staticBuild ? "http://127.0.0.1:4173" : "http://127.0.0.1:5175",
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", channel: "chrome" } },
  ],
});
