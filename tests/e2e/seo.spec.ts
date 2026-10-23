import { test, expect } from "@playwright/test";

const pages = [
  {
    path: "/",
    title: "Binodoro — Pomodoro Timer with Binaural Beats",
    heading: "Time to find your focus",
  },
  {
    path: "/about",
    title: "About Binodoro — Pomodoro Technique & Binaural Beats",
    heading: "About Binodoro",
  },
  {
    path: "/controls",
    title: "Binaural Beats Generator & Sound Controls — Binodoro",
    heading: "Sound controls",
  },
];

for (const { path, title, heading } of pages) {
  test(`${path} is readable and has SEO metadata without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(
        page.getByRole("heading", { level: 1, name: heading, exact: true }),
      ).toBeVisible();
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /.+/,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://binodoro.online${path}`,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        `https://binodoro.online${path}`,
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        "https://binodoro.online/images/binodoro-social.png",
      );
      if (path === "/") {
        await expect(
          page.getByRole("button", { name: "Start focus", exact: true }),
        ).toBeDisabled();
      }
      if (path === "/about") {
        await expect(page.getByText(/Research into attention/)).toBeVisible();
        await page
          .getByRole("link", { name: "Back to timer", exact: false })
          .click();
        await expect(page).toHaveURL(`${baseURL}/`);
      }
    } finally {
      await context.close();
    }
  });
}

test("metadata follows navigation while timer state survives", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(page).toHaveTitle(
    /\d{2}:\d{2} · Binodoro — Pomodoro Timer with Binaural Beats/,
  );
  await page
    .getByRole("link", {
      name: "About Binodoro · Pomodoro & binaural beats",
      exact: true,
    })
    .click();
  await expect(page).toHaveTitle(pages[1].title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://binodoro.online/about",
  );
  await page
    .getByRole("link", { name: "Explore sound controls", exact: true })
    .click();
  await expect(page).toHaveTitle(pages[2].title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://binodoro.online/controls",
  );
  await page.getByRole("link", { name: "Back to timer", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeEnabled();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://binodoro.online/",
  );
  expect(errors).toEqual([]);
});

test("unknown URLs return a real 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  if (process.env.TEST_STATIC === "1") {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
    await expect(page.locator('script[type="module"]')).toHaveCount(0);
  }
  await page
    .getByRole("link", { name: "Return to your timer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Time to find your focus", exact: true }),
  ).toBeVisible();
});

test("crawler files and share image are served as assets", async ({
  request,
}) => {
  test.skip(
    process.env.TEST_STATIC !== "1",
    "Generated files exist in the production static build",
  );
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const text = await sitemap.text();
  for (const { path } of pages)
    expect(text).toContain(`<loc>https://binodoro.online${path}</loc>`);
  expect(text).not.toContain("/404");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(
    "Sitemap: https://binodoro.online/sitemap.xml",
  );
  const image = await request.get("/images/binodoro-social.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});
