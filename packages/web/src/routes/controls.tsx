import { createFileRoute } from "@tanstack/react-router";
import { App } from "../App";
import { pageSeo } from "../seo";
export const Route = createFileRoute("/controls")({
  head: () =>
    pageSeo(
      "/controls",
      "Binaural Beats Generator & Sound Controls — Binodoro",
      "Create binaural beats in your browser. Adjust carrier and beat frequencies, blend background noise, and save custom sounds for your Pomodoro focus sessions.",
    ),
  component: App,
});
