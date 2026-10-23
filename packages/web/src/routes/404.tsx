import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "../NotFound";
export const Route = createFileRoute("/404")({
  head: () => ({
    meta: [
      { title: "Page not found — Binodoro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFound,
});
