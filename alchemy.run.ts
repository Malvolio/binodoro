import alchemy from "alchemy";
import { Website } from "alchemy/cloudflare";

const app = await alchemy("binodoro");

export const website = await Website("website", {
  name: `binodoro-${app.stage}`,
  // Build and verify TanStack Start prerendered pages before uploading assets.
  build: "bun run build",
  // Alchemy's default Worker returns plain text for non-navigation misses.
  // Delegate to the binding so Cloudflare applies the configured 404-page rule.
  script: `export default {
    fetch(request, env) { return env.ASSETS.fetch(request); }
  };`,
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
