import { createFileRoute } from "@tanstack/react-router";
import { Pomodoro } from "../Pomodoro";
import { homeTitle, pageSeo } from "../seo";
export const Route = createFileRoute("/")({
  head: () =>
    pageSeo(
      "/",
      homeTitle,
      "A free Pomodoro timer with binaural beats, customizable focus sounds, and break music. Work in 25-minute sessions with regular breaks. No account needed.",
    ),
  component: Pomodoro,
});
