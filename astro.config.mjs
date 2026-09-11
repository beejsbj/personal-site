import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

const excludedPaths = new Set([
  "/e4p/",
  "/garden/",
  "/style-guide/",
  "/design-system/",
]);

export default defineConfig({
  site: "https://burooj.dev",
  integrations: [
    sitemap({
      filter: (page) => !excludedPaths.has(new URL(page).pathname),
    }),
  ],
  adapter: vercel(),
});
