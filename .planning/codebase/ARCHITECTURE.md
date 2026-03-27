# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Content-driven Astro monolith with a shared page shell and a flat presentation layer.

**Key Characteristics:**
- Route files in `src/pages/` own data loading directly through `astro:content`; there is no separate service, repository, or API layer.
- `src/layouts/BaseLayout.astro` centralizes document metadata, global CSS, the site chrome, and the only persistent client-side state.
- The live application is contained in `src/` and `public/`; the root-level PHP/template tree (`index.php`, `functions.php`, `templates/`, `data/`, `styles/`, `images/`, `projects/`) remains in the repo as legacy material and is excluded from the TypeScript build by `tsconfig.json`.

## Layers

**Routing And Compatibility Layer:**
- Purpose: Define page URLs, generate dynamic entry pages, and preserve legacy URLs.
- Location: `src/pages/`, `src/middleware.ts`, `vercel.json`
- Contains: Static routes like `src/pages/about.astro`, collection indexes like `src/pages/projects/index.astro`, dynamic routes like `src/pages/projects/[slug].astro`, and redirect shims like `src/pages/e4p.astro`
- Depends on: `astro:content`, Astro request context, and shared layout/components
- Used by: Astro runtime and Vercel routing

**Content Schema And Content Layer:**
- Purpose: Define the shape of portfolio data and provide the site copy.
- Location: `src/content.config.ts`, `src/content/pages/*.md`, `src/content/projects/*.md`, `src/content/lab/*.md`, `src/content/site/config.json`
- Contains: Zod collection schemas, markdown case studies, markdown lab entries, and site-level navigation/footer data
- Depends on: `astro:content` and Zod via Astro collections
- Used by: `src/pages/index.astro`, `src/pages/about.astro`, `src/pages/resume.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/lab/index.astro`, `src/pages/lab/[slug].astro`, and `src/layouts/BaseLayout.astro`

**Layout And Presentation Layer:**
- Purpose: Compose content into consistent pages and reusable display primitives.
- Location: `src/layouts/BaseLayout.astro`, `src/components/*.astro`
- Contains: The global shell in `src/layouts/BaseLayout.astro`, navigation in `src/components/SiteHeader.astro`, footer in `src/components/SiteFooter.astro`, headings in `src/components/PageHeader.astro` and `src/components/SectionIntro.astro`, and collection cards/rails in `src/components/ProjectRow.astro`, `src/components/ProjectCard.astro`, `src/components/LabCard.astro`, `src/components/MediaRail.astro`
- Depends on: Page props, collection entry data, and global CSS classes
- Used by: Every live route in `src/pages/`

**Styling And Theme Layer:**
- Purpose: Provide tokens, layout primitives, component classes, and theme variables.
- Location: `src/styles/global.css`, `src/styles/core/*.css`, `src/styles/themes/default/index.css`, `src/styles/themes/pe-site/index.css`
- Contains: Font imports, reset rules, design tokens, layout utilities, and theme variable sets
- Depends on: CSS custom properties and the `data-theme` attribute set in `src/layouts/BaseLayout.astro`
- Used by: `src/layouts/BaseLayout.astro` and all rendered Astro markup

**Static Asset Layer:**
- Purpose: Serve images, video, icons, and robots metadata referenced by content entries and components.
- Location: `public/`
- Contains: `public/images/**`, `public/favicon.svg`, `public/robots.txt`
- Depends on: Public-path references embedded in markdown frontmatter and Astro templates
- Used by: `src/content/projects/*.md`, `src/content/lab/*.md`, `src/layouts/BaseLayout.astro`, `src/components/ProjectCard.astro`, `src/components/ProjectRow.astro`, `src/components/LabCard.astro`, `src/components/MediaRail.astro`

**Legacy Reference Layer:**
- Purpose: Preserve the previous PHP-driven site and archived subprojects without participating in the current Astro app.
- Location: `index.php`, `functions.php`, `templates/`, `data/`, `styles/`, `images/`, `scripts/`, `projects/`
- Contains: A PHP front controller, JSON-driven template rendering, legacy theme scripts, and archived student/client projects
- Depends on: PHP includes and root-level JSON/template directories
- Used by: Legacy workflows only; not imported by any file in `src/`

## Data Flow

**Content-Backed Page Render:**

1. `src/content.config.ts` defines four collections: `pages`, `projects`, `lab`, and `site`.
2. Content files in `src/content/pages/*.md`, `src/content/projects/*.md`, `src/content/lab/*.md`, and `src/content/site/config.json` supply typed data and long-form body content.
3. Route files such as `src/pages/index.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/lab/index.astro`, and `src/pages/lab/[slug].astro` call `getEntry()` or `getCollection()`, then filter and sort entries inline inside frontmatter.
4. Detail pages call `entry.render()` and pass the resulting `<Content />` fragment into the template body.
5. `src/layouts/BaseLayout.astro` reloads the site config entry, computes SEO metadata, imports `src/styles/global.css`, and wraps the page with `SiteHeader` and `SiteFooter`.
6. Presentational components render cards, headers, and media rails using fields already prepared by the route.

**Legacy URL Preservation:**

1. `vercel.json` redirects old top-level paths like `/garden` and query-string URLs like `/?page=project&project=:slug` to the new Astro routes.
2. `src/middleware.ts` repeats the query-parameter mapping at request time, returning `Response.redirect(...)` for legacy `?page=` values.
3. `src/pages/index.astro` also guards the homepage against the same legacy query parameters with `Astro.redirect(...)`.
4. Stub routes in `src/pages/e4p.astro`, `src/pages/garden.astro`, `src/pages/style-guide.astro`, `src/pages/e4p/[slug].astro`, and `src/pages/garden/[slug].astro` normalize older URLs into `/lab/*`.

**State Management:**
- Build-time and request-time state lives in Astro frontmatter variables and `Astro.props`.
- The only persistent client-side state is the theme name stored in `localStorage` and applied to `document.documentElement.dataset.theme` in `src/layouts/BaseLayout.astro`.
- No global store, no client islands, and no `src/**/*.vue` runtime components are active in the current `src/` tree.

## Key Abstractions

**Content Collections:**
- Purpose: Treat portfolio sections as typed content instead of hard-coded arrays.
- Examples: `src/content.config.ts`, `src/content/projects/api3-ecosystem.md`, `src/content/lab/style-guide.md`, `src/content/site/config.json`
- Pattern: Schema-first content modeling with Zod-backed Astro collections

**Page Shell:**
- Purpose: Guarantee consistent metadata, navigation, footer, and theme setup across every route.
- Examples: `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`
- Pattern: Single shared layout wrapping slot content

**Collection Presentation Primitives:**
- Purpose: Reuse the same small card and row patterns across indexes and detail pages.
- Examples: `src/components/ProjectRow.astro`, `src/components/ProjectCard.astro`, `src/components/LabCard.astro`, `src/components/MediaRail.astro`
- Pattern: Typed Astro components with display-only props and no internal data fetching

**Compatibility Redirect Map:**
- Purpose: Keep older query-string and path-based URLs working while the site structure changes.
- Examples: `src/middleware.ts`, `src/pages/index.astro`, `vercel.json`
- Pattern: Declarative string-to-path mapping plus dedicated redirect-only routes

## Entry Points

**Astro Build Entry:**
- Location: `astro.config.mjs`
- Triggers: `npm run dev`, `npm run build`, `npm run preview`
- Responsibilities: Register Astro integrations, set the canonical site URL, and enable the Vercel adapter

**Primary Site Route:**
- Location: `src/pages/index.astro`
- Triggers: Requests to `/`
- Responsibilities: Redirect legacy query URLs, load the `pages/home` entry, select featured projects and lab entries, and compose the landing page

**Project Detail Route:**
- Location: `src/pages/projects/[slug].astro`
- Triggers: Requests to `/projects/:slug`
- Responsibilities: Generate static paths from the `projects` collection and render a content-backed case study

**Lab Detail Route:**
- Location: `src/pages/lab/[slug].astro`
- Triggers: Requests to `/lab/:slug`
- Responsibilities: Generate static paths from the `lab` collection and render an archive/detail page

**Request Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every Astro request
- Responsibilities: Intercept legacy `?page=` URLs and redirect them before page rendering

**Legacy PHP Front Controller:**
- Location: `index.php`
- Triggers: Legacy PHP hosting only
- Responsibilities: Read query-string page IDs, load JSON data through `functions.php`, and render template includes from `templates/`

## Error Handling

**Strategy:** Fail fast when required content is missing; redirect instead of branching when handling legacy routes.

**Patterns:**
- `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/about.astro`, and `src/pages/resume.astro` throw `Error` when a required content entry is absent.
- `src/content.config.ts` validates collection frontmatter and JSON shape before route code consumes it.
- `src/middleware.ts`, `src/pages/index.astro`, `src/pages/e4p.astro`, `src/pages/garden.astro`, `src/pages/style-guide.astro`, `src/pages/e4p/[slug].astro`, and `src/pages/garden/[slug].astro` return redirects rather than rendering fallback UI.
- `src/pages/404.astro` provides the explicit not-found page for unmatched routes.

## Cross-Cutting Concerns

**Logging:** Not detected in the active Astro application under `src/`.
**Validation:** Collection schemas are enforced in `src/content.config.ts`; TypeScript strictness is inherited from `astro/tsconfigs/strict` in `tsconfig.json`.
**Authentication:** Not applicable; no auth provider, protected routes, or user session logic exists in `src/`.

---

*Architecture analysis: 2026-03-27*
