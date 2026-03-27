# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**Hosting & Platform:**
- Vercel - The active Astro site is built for Vercel deployment.
  - SDK/Client: `@astrojs/vercel` in `package.json`, configured in `astro.config.mjs`
  - Auth: Not configured in tracked files; any Vercel credentials live outside the repo
- Vercel redirect rules - Legacy query-string and old route compatibility is handled at the platform layer.
  - SDK/Client: `vercel.json`
  - Auth: None

**SEO & Discovery:**
- Astro Sitemap - Generates sitemap output for the canonical site URL.
  - SDK/Client: `@astrojs/sitemap` in `package.json`, configured in `astro.config.mjs`
  - Auth: None
- Search engine crawl directives - Static robot rules for crawlers.
  - SDK/Client: `public/robots.txt`
  - Auth: None

**Content-Driven Outbound Links:**
- Substack, GitHub, LinkedIn, CodePen, and email - External profile and contact destinations are configured in `src/content/site/config.json` and rendered in `src/components/SiteHeader.astro` and `src/components/SiteFooter.astro`.
  - SDK/Client: None
  - Auth: None
- Project demos and source links - External demo/source URLs are stored in `src/content/projects/*.md` and `src/content/lab/*.md`, then rendered in `src/pages/projects/[slug].astro` and `src/pages/lab/[slug].astro`.
  - SDK/Client: None
  - Auth: None

**Legacy / Archived Integrations:**
- UNPKG CDN + Swup plugins - Legacy browser transition code imports modules directly from UNPKG in `scripts/pe-site/index.js`. This script is not referenced by the active Astro routes.
  - SDK/Client: `https://unpkg.com/swup@4?module`, `https://unpkg.com/@swup/head-plugin@2?module`, `https://unpkg.com/@swup/body-class-plugin@3?module`
  - Auth: None
- Digi API - An archived Express/EJS demo fetches Digimon records from the public Digi API in `projects/monsters-ejs/get-digimon.js`.
  - SDK/Client: native `fetch` in `projects/monsters-ejs/get-digimon.js`, archival `axios` dependency in `projects/monsters-ejs/package.json`
  - Auth: None

## Data Storage

**Databases:**
- None detected for the active Astro site.
  - Connection: Not applicable
  - Client: Not applicable
- File-based content store - Content is loaded from the filesystem through Astro content collections.
  - Connection: `src/content/**`
  - Client: `getCollection` and `getEntry` in `src/pages/index.astro`, `src/pages/projects/[slug].astro`, `src/pages/lab/[slug].astro`, `src/pages/about.astro`, `src/pages/resume.astro`, and `src/layouts/BaseLayout.astro`

**File Storage:**
- Local filesystem only for the active site.
  - Current paths: `public/images/**`, `public/favicon.svg`, `src/content/**`
- Legacy local JSON persistence exists in the archived demo under `projects/monsters-ejs/app.js` and `projects/monsters-ejs/get-digimon.js`.

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None
  - Implementation: No auth SDKs, session middleware, identity provider config, or protected routes are present in `package.json`, `astro.config.mjs`, or `src/`

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Active Astro site relies on default platform/browser logs. Missing content currently throws runtime errors in `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/about.astro`, and `src/pages/resume.astro`.
- Explicit console logging is only visible in archived code such as `projects/monsters-ejs/get-digimon.js`.

## CI/CD & Deployment

**Hosting:**
- Vercel for the active site, configured by `astro.config.mjs` and `vercel.json`

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None detected for the active Astro site
- No `.env*` files are present in the repo
- No `import.meta.env` or `process.env` references were found in `src/`, `astro.config.mjs`, `vercel.json`, or `package.json`

**Secrets location:**
- Not applicable in tracked files for the active site
- If deployment secrets exist, they would be managed in Vercel project settings rather than in the repository

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None as programmatic webhooks or server-to-server callbacks
- Browser navigation to external destinations is content-driven through `src/content/site/config.json`, `src/content/projects/*.md`, and `src/content/lab/*.md`

---

*Integration audit: 2026-03-27*
