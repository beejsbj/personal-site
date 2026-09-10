# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```text
[project-root]/
├── src/                # Active Astro application source
├── public/             # Static assets served by the Astro app
├── scripts/            # Migration scripts and legacy theme JavaScript
├── templates/          # Legacy PHP templates, not used by the Astro build
├── data/               # Legacy JSON content for the PHP site
├── styles/             # Legacy root CSS/themes for the PHP site
├── images/             # Legacy asset mirror outside `public/`
├── projects/           # Archived/student project source folders
├── astro.config.mjs    # Astro runtime and adapter config
├── vercel.json         # Redirect rules for legacy URLs
├── tsconfig.json       # Strict TS config; excludes legacy root folders
├── index.php           # Legacy PHP front controller
└── functions.php       # Legacy PHP helpers and routing utilities
```

## Directory Purposes

**`src/`:**
- Purpose: Hold all code for the current portfolio application.
- Contains: Astro routes, layouts, components, typed content collections, styles, and middleware
- Key files: `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/content.config.ts`, `src/middleware.ts`

**`src/pages/`:**
- Purpose: Define file-based routes for the live site.
- Contains: Top-level pages like `src/pages/about.astro`, collection index routes like `src/pages/projects/index.astro`, detail routes like `src/pages/projects/[slug].astro`, and redirect shims like `src/pages/e4p.astro`
- Key files: `src/pages/index.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/lab/index.astro`, `src/pages/lab/[slug].astro`

**`src/components/`:**
- Purpose: Store reusable display primitives for headers, cards, and media blocks.
- Contains: Small Astro components with typed props and no direct content fetching
- Key files: `src/components/PageHeader.astro`, `src/components/ProjectRow.astro`, `src/components/ProjectCard.astro`, `src/components/LabCard.astro`, `src/components/MediaRail.astro`

**`src/layouts/`:**
- Purpose: Store page-level wrappers shared across routes.
- Contains: The only shared layout currently used by the app
- Key files: `src/layouts/BaseLayout.astro`

**`src/content/`:**
- Purpose: Store content files that back the current site.
- Contains: Page copy in `src/content/pages/*.md`, project entries in `src/content/projects/*.md`, lab entries in `src/content/lab/*.md`, and site metadata in `src/content/site/config.json`
- Key files: `src/content/pages/home.md`, `src/content/projects/api3-ecosystem.md`, `src/content/lab/style-guide.md`, `src/content/site/config.json`

**`src/styles/`:**
- Purpose: Store the active design system for the Astro site.
- Contains: `src/styles/global.css`, base CSS in `src/styles/core/*.css`, and theme variable sets in `src/styles/themes/*/index.css`
- Key files: `src/styles/global.css`, `src/styles/core/tokens.css`, `src/styles/core/utilities.css`, `src/styles/themes/default/index.css`, `src/styles/themes/pe-site/index.css`

**`public/`:**
- Purpose: Serve images, video, icons, and robots metadata to the live site.
- Contains: Portfolio images and media in `public/images/**`, plus files like `public/favicon.svg` and `public/robots.txt`
- Key files: `public/images/projects/api3-ecosystem.jpg`, `public/images/projects/flashcards.png`, `public/images/background/square.jpg`, `public/robots.txt`

**`projects/`:**
- Purpose: Preserve older standalone projects and experiments referenced by portfolio content.
- Contains: Archived project directories like `projects/flashcards`, `projects/e4p`, `projects/quantumon`, `projects/theme-challenge`, and `projects/_archive`
- Key files: `projects/flashcards/`, `projects/e4p/`, `projects/quantumon/`

**`templates/`, `data/`, `styles/`, `images/`, `scripts/`:**
- Purpose: Hold the previous PHP-based site implementation and migration helpers.
- Contains: PHP templates in `templates/`, JSON page/config data in `data/`, legacy styles in `styles/`, legacy image assets in `images/`, and scripts like `scripts/pe-site/index.js` and `scripts/migrate-to-astro-content.mjs`
- Key files: `templates/pages/home/home.php`, `data/pages/home.json`, `styles/site.css`, `scripts/migrate-to-astro-content.mjs`, `scripts/pe-site/pageTransition.js`

## Key File Locations

**Entry Points:**
- `src/pages/index.astro`: Main Astro homepage entry and an extra redirect guard for legacy query URLs
- `src/pages/projects/index.astro`: Project listing route
- `src/pages/projects/[slug].astro`: Project detail route factory
- `src/pages/lab/index.astro`: Lab listing route
- `src/pages/lab/[slug].astro`: Lab detail route factory
- `src/middleware.ts`: Request-time redirect layer for old `?page=` links
- `index.php`: Legacy PHP front controller

**Configuration:**
- `package.json`: Dev and build scripts for the Astro app
- `astro.config.mjs`: Astro site URL, integrations, and Vercel adapter
- `tsconfig.json`: Strict Astro TypeScript setup and exclusion of legacy root folders
- `src/content.config.ts`: Collection schemas for active content
- `vercel.json`: Hosting redirects that preserve legacy URLs

**Core Logic:**
- `src/layouts/BaseLayout.astro`: Global shell, metadata generation, theme persistence, and shared site chrome
- `src/pages/index.astro`: Inline content querying, sorting, and landing page composition
- `src/pages/projects/index.astro`: Inline project filtering and section splitting
- `src/pages/projects/[slug].astro`: Dynamic route generation and detail rendering
- `src/pages/lab/[slug].astro`: Dynamic route generation and detail rendering
- `functions.php`: Legacy routing/data helpers for the PHP site

**Testing:**
- Not detected. No `*.test.*`, `*.spec.*`, or test config files are present in the repository root or `src/`.

## Naming Conventions

**Files:**
- Reusable Astro components use `PascalCase.astro`: `src/components/SiteHeader.astro`, `src/components/ProjectCard.astro`
- Layouts use `PascalCase.astro`: `src/layouts/BaseLayout.astro`
- Route files use lowercase names, with folder-based grouping and bracket syntax for dynamic params: `src/pages/about.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`
- Content files use lowercase kebab-case slugs: `src/content/projects/api3-ecosystem.md`, `src/content/lab/style-guide.md`
- Theme folders use lowercase names and an `index.css` entry file: `src/styles/themes/default/index.css`, `src/styles/themes/pe-site/index.css`

**Directories:**
- Active app directories are grouped by concern under `src/`: `src/pages/`, `src/components/`, `src/layouts/`, `src/content/`, `src/styles/`
- Dynamic route directories use Astro bracket syntax: `src/pages/projects/[slug].astro`, `src/pages/lab/[slug].astro`
- Legacy project directories use descriptive lowercase names: `projects/flashcards`, `projects/node-practicee`, `projects/theme-challenge`

## Where to Add New Code

**New Feature:**
- Primary code: Add the route in `src/pages/`; if the feature is content-backed, add or extend the matching collection entry in `src/content/`
- Tests: Not applicable in current structure; no test harness or test directory exists

**New Component/Module:**
- Implementation: Put reusable display components in `src/components/<Name>.astro`
- Implementation: Put page-wide wrappers in `src/layouts/<Name>.astro`
- Implementation: Put route-specific composition directly in the relevant `src/pages/...` file when it is not reused elsewhere

**Utilities:**
- Shared helpers: Use `src/lib/` for new helper modules; the directory exists but is currently empty
- Shared config/data transforms: Keep collection schemas in `src/content.config.ts` and avoid moving schema logic into route files
- Styling helpers: Extend `src/styles/core/*.css` for shared primitives and `src/styles/themes/<theme>/index.css` for theme-only overrides

## Special Directories

**`.astro/`:**
- Purpose: Astro-generated development metadata and collection artifacts
- Generated: Yes
- Committed: No

**`dist/`:**
- Purpose: Astro static build output
- Generated: Yes
- Committed: No

**`.output/`:**
- Purpose: Server-oriented build output from Astro/Vercel
- Generated: Yes
- Committed: No

**`.vercel/output/`:**
- Purpose: Vercel deployment artifact output
- Generated: Yes
- Committed: No

**`.planning/codebase/`:**
- Purpose: Planning and mapping documents for the GSD workflow
- Generated: No
- Committed: No

**`projects/_archive/`:**
- Purpose: Archived project folders kept for reference only
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-27*
