// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "static",
  // "file" emits dist/alarm.html instead of dist/alarm/index.html: Workbox cleanURLs maps /alarm to alarm.html,
  // while alarm/index.html would miss the precache and fall back to the home page offline.
  build: { format: "file" },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
