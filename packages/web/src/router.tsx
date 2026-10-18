import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { SessionProvider } from "./Session";
import { App } from "./App";
import { Pomodoro } from "./Pomodoro";
const rootRoute = createRootRoute({
  component: () => (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  ),
  notFoundComponent: () => (
    <div className="not-found">
      <h1>Let's get back to focus.</h1>
      <Link to="/">Return to your timer</Link>
    </div>
  ),
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Pomodoro,
});
const controlsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/controls",
  component: App,
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, controlsRoute]),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
