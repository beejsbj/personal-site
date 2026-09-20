import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

const excludedPaths = new Set([
  "/house/",
  "/e4p/",
  "/garden/",
  "/style-guide/",
  "/design-system/",
  "/lab/e4p/",
  "/lab/garden/",
  "/lab/flashcards/",
  "/lab/style-guide/",
]);

export default defineConfig({
  site: "https://burooj.dev",
  redirects: {
    "/lab/e4p": "/projects/e4p",
    "/lab/garden": "/projects/garden",
    "/lab/flashcards": "/projects/flashcards",
    "/lab/style-guide": "/style-guide",
  },
  integrations: [
    sitemap({
      filter: (page) => !excludedPaths.has(new URL(page).pathname),
    }),
  ],
  adapter: vercel(),
});
