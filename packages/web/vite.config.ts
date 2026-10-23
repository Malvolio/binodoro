import { readdirSync } from "node:fs";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  // Use an explicit loopback address for Start's temporary prerender server.
  preview: { host: "127.0.0.1" },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        autoSubfolderIndex: false,
      },
      pages: [{ path: "/404", sitemap: { exclude: true } }],
      sitemap: { enabled: true, host: "https://binodoro.online" },
    }),
    react(),
    tailwindcss(),
  ],
  define: {
    __BREAK_PLAYLIST__: JSON.stringify(
      readdirSync(new URL("./public/music/", import.meta.url))
        .filter((name) => /\.(opus|ogg|mp3|m4a|aac|wav|flac|webm)$/i.test(name))
        .sort()
        .map((name) => `/music/${encodeURIComponent(name)}`),
    ),
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
