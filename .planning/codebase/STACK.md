# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript 5.9.3 - Root application logic and schema definitions live in `package.json`, `tsconfig.json`, `src/content.config.ts`, and `src/middleware.ts`.
- Astro component syntax on Astro 5.18.1 - The active UI layer is implemented in `src/pages/**/*.astro`, `src/layouts/BaseLayout.astro`, and `src/components/**/*.astro`.

**Secondary:**
- Markdown - Page and portfolio content is authored in `src/content/pages/*.md`, `src/content/projects/*.md`, and `src/content/lab/*.md`.
- JSON - Site-level metadata is stored in `src/content/site/config.json`.
- CSS - Core styling and theme tokens live in `src/styles/**/*.css`.
- JavaScript (ES modules) - Legacy browser scripts remain in `scripts/pe-site/index.js`, `scripts/pe-site/pageTransition.js`, and `scripts/scrollToEnd.js`.
- PHP (version not pinned in repo) - Archived pre-Astro application code remains in `index.php`, `functions.php`, `templates/**/*.php`, and multiple `projects/**/*.php` subdirectories.

## Runtime

**Environment:**
- Node.js 18.20.8 or newer on the 18.x line, Node.js 20.3.0 or newer, or Node.js 22+ for the active Astro app. This is inferred from dependency engine ranges recorded in `pnpm-lock.yaml`.
- ESM is required for the root app because `package.json` sets `"type": "module"`.
- Browser runtime behavior exists for theme persistence and client-side page transitions in `src/layouts/BaseLayout.astro`.
- A legacy PHP runtime also exists in archival paths such as `index.php`, `functions.php`, and `templates/**/*.php`, but it is not part of the root Node build pipeline.

**Package Manager:**
- pnpm - Root dependency graph is locked in `pnpm-lock.yaml`.
- Lockfile format: v9 in `pnpm-lock.yaml`.
- Exact pnpm CLI version is not pinned. `package.json` has no `packageManager` field, and the repo does not contain `.nvmrc` or `.node-version`.
- Lockfile: present (`pnpm-lock.yaml`).

## Frameworks

**Core:**
- Astro 5.18.1 - Primary site framework for routing, rendering, and static generation. See `package.json` and `astro.config.mjs`.
- Astro Content Collections - Typed file-backed content system defined in `src/content.config.ts` and consumed in `src/pages/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/lab/[slug].astro`, `src/pages/about.astro`, `src/pages/resume.astro`, and `src/layouts/BaseLayout.astro`.
- Astro Middleware - Query-string compatibility redirects are implemented in `src/middleware.ts`.
- Astro Transitions / `ClientRouter` - Client-side page transitions are enabled in `src/layouts/BaseLayout.astro`.
- Vue 3.5.30 with `@astrojs/vue` 5.1.4 - Installed in `package.json` and enabled in `astro.config.mjs`, but no `.vue` files exist under `src/`, so this is reserved capability rather than an active rendering layer.
- MDX with `@astrojs/mdx` 4.3.14 - Enabled in `astro.config.mjs`, but no `.mdx` files are present under `src/`.

**Testing:**
- No dedicated unit, integration, or E2E test framework is detected in the root `package.json`.
- `@astrojs/check` 0.9.8 - Static validation for Astro and TypeScript via the `check` script in `package.json`.

**Build/Dev:**
- `@astrojs/vercel` 8.2.11 - Deployment adapter configured in `astro.config.mjs`.
- `@astrojs/sitemap` 3.7.1 - Sitemap generation configured in `astro.config.mjs`.
- TypeScript 5.9.3 - Type checking and strict project configuration via `tsconfig.json`.
- `astro/tsconfigs/strict` - Strict TypeScript baseline extended by `tsconfig.json`.
- `@fontsource-variable/newsreader` 5.2.10 and `@fontsource/space-grotesk` 5.2.10 - Self-hosted typography imported in `src/styles/global.css`.
- GSAP 3.14.2 - Installed in `package.json`; active code references are limited to legacy transition scripts in `scripts/pe-site/pageTransition.js`.

## Key Dependencies

**Critical:**
- `astro` 5.18.1 - Core application runtime and compiler for everything under `src/pages`, `src/layouts`, and `src/components`.
- `@astrojs/vercel` 8.2.11 - Required to build for the deployed Vercel target configured in `astro.config.mjs`.
- `@astrojs/sitemap` 3.7.1 - Required to generate sitemap output for the `site` URL configured in `astro.config.mjs`.
- `@astrojs/check` 0.9.8 - Primary validation command exposed by `package.json`.
- `typescript` 5.9.3 - Required for `src/content.config.ts`, `src/middleware.ts`, and strict project checking via `tsconfig.json`.
- `@fontsource-variable/newsreader` 5.2.10 and `@fontsource/space-grotesk` 5.2.10 - Required to render the intended brand typography imported by `src/styles/global.css`.

**Infrastructure:**
- `@astrojs/mdx` 4.3.14 - Content pipeline support enabled in `astro.config.mjs`, even though no `.mdx` files are currently present.
- `@astrojs/vue` 5.1.4 and `vue` 3.5.30 - Integration layer kept available in `astro.config.mjs` for future islands/components.
- `gsap` 3.14.2 - Motion library retained for legacy scripts in `scripts/pe-site/pageTransition.js`.
- No database, auth, analytics, payments, or observability SDKs are detected in the root `package.json`.

## Configuration

**Environment:**
- Configuration is file-based. The active app relies on `astro.config.mjs`, `vercel.json`, `tsconfig.json`, `src/content.config.ts`, and `src/content/site/config.json`.
- No `.env` files are present anywhere in the repo.
- No `import.meta.env` or `process.env` reads are present in `src/`, `astro.config.mjs`, `vercel.json`, or `package.json`.
- Site identity is hard-coded in `astro.config.mjs` (`site`) and reused in `src/layouts/BaseLayout.astro` for canonical and social metadata.

**Build:**
- Build commands are declared in `package.json`: `dev`, `start`, `build`, `preview`, and `check`.
- Build configuration lives in `astro.config.mjs`, `tsconfig.json`, `vercel.json`, and `pnpm-lock.yaml`.
- Static crawl directives are defined in `public/robots.txt`.
- The active TypeScript compile excludes legacy/archive directories including `projects`, `templates`, `data`, `styles`, `images`, `about`, and `public/styles` via `tsconfig.json`.

## Platform Requirements

**Development:**
- Use Node.js versions compatible with the Astro engine ranges recorded in `pnpm-lock.yaml`.
- Use pnpm with the existing root lockfile `pnpm-lock.yaml`.
- Run development and validation from the root `package.json`.
- Keep active site content in `src/content/**` and public assets in `public/**`; archived code under `projects/**`, `templates/**`, and root PHP files is not part of the Astro compile path.

**Production:**
- Deployment target: Vercel, via the adapter configured in `astro.config.mjs`.
- Canonical site URL: `https://burooj.dev`, declared in `astro.config.mjs`.
- Redirect behavior for legacy URL shapes is configured in `vercel.json` and mirrored in `src/middleware.ts`.
- Build artifacts for the current pipeline appear in `dist/`, `.output/`, and `.vercel/output/`.

---

*Stack analysis: 2026-03-27*
