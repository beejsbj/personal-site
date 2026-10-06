import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

const excludedPaths = new Set([
  "/e4p/",
  "/garden/",
  "/style-guide/",
  "/design-system/",
  "/lab/e4p/",
  "/lab/garden/",
  "/lab/flashcards/",
  "/lab/style-guide/",
  "/prism/harness/",
  "/prism/atlas/",
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
      customSitemaps: ["https://burooj.dev/writing/sitemap.xml"],
      filter: (page) => !excludedPaths.has(new URL(page).pathname),
    }),
  ],
  // Runtime writing must not change the authored update snapshot that the
  // static Daylight homepage and every lens share within this deployment.
  vite: {
    define: {
      __PORTFOLIO_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  },
  adapter: vercel(),
});
