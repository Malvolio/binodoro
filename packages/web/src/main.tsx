import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { makeRuntime, RuntimeContext } from "./runtime";
import "./style.css";
const runtime = makeRuntime();
const teardown = () => {
  void runtime.dispose();
};
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) teardown();
});
if (import.meta.hot) import.meta.hot.dispose(teardown);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeContext.Provider value={runtime}>
      <RouterProvider router={router} />
    </RuntimeContext.Provider>
  </StrictMode>,
);
