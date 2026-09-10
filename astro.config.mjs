import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

const redirectOnlyPaths = new Set(["/e4p/", "/garden/", "/style-guide/"]);

export default defineConfig({
  site: "https://burooj.dev",
  integrations: [
    vue(),
    mdx(),
    sitemap({
      filter: (page) => !redirectOnlyPaths.has(new URL(page).pathname),
    }),
  ],
  adapter: vercel(),
});
