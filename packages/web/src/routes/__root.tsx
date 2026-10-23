import { NotFound } from "../NotFound";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SessionProvider } from "../Session";
import { RuntimeContext, type AppRuntime } from "../runtime";
import styleUrl from "../style.css?url";

export const Route = createRootRouteWithContext<{ runtime: AppRuntime }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1.0" },
      { name: "theme-color", content: "oklch(0.14 0.021 255)" },
    ],
    links: [
      { rel: "stylesheet", href: styleUrl },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  component: Root,
  shellComponent: Document,
  notFoundComponent: NotFound,
});

function Root() {
  const { runtime } = Route.useRouteContext();
  return (
    <RuntimeContext.Provider value={runtime}>
      <SessionProvider>
        <Outlet />
      </SessionProvider>
    </RuntimeContext.Provider>
  );
}

function Document({ children }: { children: ReactNode }) {
  const errorDocument = useRouterState({
    select: (state) => state.location.pathname === "/404",
  });
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {/* Cloudflare serves this same error HTML at arbitrary unknown URLs. */}
        {!errorDocument && <Scripts />}
      </body>
    </html>
  );
}
