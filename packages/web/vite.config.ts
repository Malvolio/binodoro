import { readdirSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BREAK_PLAYLIST__: JSON.stringify(
      readdirSync(new URL("./public/music/", import.meta.url))
        .filter((name) => /\.(opus|ogg|mp3|m4a|aac|wav|flac|webm)$/i.test(name))
        .sort()
        .map((name) => `/music/${encodeURIComponent(name)}`),
    ),
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { effect: ["effect"], react: ["react", "react-dom"] },
      },
    },
  },
});
