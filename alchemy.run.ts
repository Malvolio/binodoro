import alchemy from "alchemy";
import { Website } from "alchemy/cloudflare";

const app = await alchemy("binodoro");

export const website = await Website("website", {
  name: `binodoro-${app.stage}`,
  // Build and verify TanStack Start prerendered pages before uploading assets.
  build: "bun run build",
  assets: {
    directory: "./packages/web/dist/client",
    _headers:
      app.stage === "production"
        ? "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n"
        : "/*\n  X-Robots-Tag: noindex\n",
    html_handling: "drop-trailing-slash",
    not_found_handling: "404-page",
  },
  // Keep preview stages from claiming the production hostname.
  domains: app.stage === "production" ? ["binodoro.online"] : [],
  url: true,
});

console.log(
  app.stage === "production" ? "https://binodoro.online" : website.url,
);

await app.finalize();
