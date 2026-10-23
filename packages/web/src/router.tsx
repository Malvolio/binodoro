import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { makeRuntime } from "./runtime";

export function getRouter() {
  // Start owns one client router. Prerender requests get isolated, lazy runtimes;
  // browser-only services are acquired in effects after hydration.
  const runtime = makeRuntime();
  if (typeof window !== "undefined") {
    const teardown = () => {
      void runtime.dispose();
    };
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) teardown();
    });
    if (import.meta.hot) import.meta.hot.dispose(teardown);
  }
  return createRouter({
    routeTree,
    context: { runtime },
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
