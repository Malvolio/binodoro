// Build tooling: verify the actual Start output, never maintain a second HTML template.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve(import.meta.dirname, "../packages/web/dist/client");
const pages = [
  ["index.html", "/", "Pomodoro", "binaural beats"],
  ["controls.html", "/controls", "Sound controls", "carrier"],
  ["about.html", "/about", "About Binodoro", "mixed and limited"],
] as const;
for (const [file, path, ...content] of pages) {
  const html = readFileSync(resolve(directory, file), "utf8");
  for (const text of [
    ...content,
    'name="description"',
    'property="og:image"',
    'name="twitter:card"',
    `href="https://binodoro.online${path}"`,
  ]) {
    if (!html.includes(text)) throw new Error(`${file} is missing ${text}`);
  }
  if (!/<h1[\s>]/.test(html))
    throw new Error(`${file} has no prerendered heading`);
}
const sitemap = readFileSync(resolve(directory, "sitemap.xml"), "utf8");
for (const [, path] of pages) {
  if (!sitemap.includes(`<loc>https://binodoro.online${path}</loc>`))
    throw new Error(`Sitemap missing ${path}`);
}
if (sitemap.includes("/404"))
  throw new Error("404 page must not appear in sitemap");
for (const file of ["404.html", "robots.txt", "images/binodoro-social.png"]) {
  if (!existsSync(resolve(directory, file)))
    throw new Error(`Missing static asset: ${file}`);
}
if (
  !readFileSync(resolve(directory, "404.html"), "utf8").includes(
    'content="noindex"',
  )
)
  throw new Error("404 page must be noindex");
console.log(
  "Verified prerendered pages, SEO metadata, sitemap, share image, and 404 page.",
);
