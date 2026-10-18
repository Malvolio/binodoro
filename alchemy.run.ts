import alchemy from "alchemy";
import { Website } from "alchemy/cloudflare";

const app = await alchemy("binodoro");

export const website = await Website("website", {
  name: `binodoro-${app.stage}`,
  build: "bun run build",
  assets: {
    directory: "./packages/web/dist",
    not_found_handling: "single-page-application",
  },
  // Keep preview stages from claiming the production hostname.
  domains: app.stage === "production" ? ["binodoro.online"] : [],
  url: true,
});

console.log(
  app.stage === "production" ? "https://binodoro.online" : website.url,
);

await app.finalize();
