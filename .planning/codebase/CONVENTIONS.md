# Coding Conventions

**Analysis Date:** 2026-03-27

## Naming Patterns

**Files:**
- Use `PascalCase.astro` for reusable UI in `src/components/` and `src/layouts/`, such as `src/components/PageHeader.astro`, `src/components/ProjectCard.astro`, and `src/layouts/BaseLayout.astro`.
- Use filesystem-route naming in `src/pages/`: lowercase static routes like `src/pages/about.astro`, collection indexes like `src/pages/projects/index.astro`, and dynamic route segments like `src/pages/lab/[slug].astro`.
- Use `camelCase` for TypeScript and middleware/config files such as `src/content.config.ts` and `src/middleware.ts`.
- Use `kebab-case` for content entry filenames and theme directories, such as `src/content/projects/api3-ecosystem.md`, `src/content/lab/style-guide.md`, and `src/styles/themes/pe-site/index.css`.
- Use BEM-like CSS selectors with modifier classes. Examples: `page-header__title`, `project-row__media`, `button--solid`, and `is-active` in `src/styles/core/utilities.css`.

**Functions:**
- Use lower camelCase for helpers and derived values, such as `parseYear`, `toYaml`, `cleanText`, `sectionToMarkdown`, and `collectLinks` in `scripts/migrate-to-astro-content.mjs`.
- Keep route logic declarative in `.astro` frontmatter. Most pages assign fetched data to `const` values instead of wrapping everything in custom functions, as seen in `src/pages/index.astro`, `src/pages/projects/index.astro`, and `src/pages/lab/[slug].astro`.
- Use verb-led names for behavior functions, such as `getStaticPaths` in `src/pages/lab/[slug].astro`, `redirectTo` in `src/middleware.ts`, `pageTransition` in `scripts/pe-site/pageTransition.js`, and `scrollToEnd` in `scripts/scrollToEnd.js`.

**Variables:**
- Use lower camelCase for constants and state derived from content or routing, such as `siteEntry`, `siteBaseUrl`, `pageTitle`, `featuredProjects`, `archiveProjects`, and `pageRedirects` in `src/layouts/BaseLayout.astro`, `src/pages/projects/index.astro`, and `src/middleware.ts`.
- Prefix DOM node variables with `$` only in legacy script files, for example `$pageLoader` in `scripts/pe-site/pageTransition.js` and `$circles` in `scripts/scrollToEnd.js`. Do not extend this style into `src/` unless matching the surrounding file.
- Use CSS custom properties in `--kebab-case`, grouped by purpose in `src/styles/core/tokens.css` and the theme files `src/styles/themes/default/index.css` and `src/styles/themes/pe-site/index.css`.

**Types:**
- Define a local `Props` interface at the top of `.astro` components and destructure `Astro.props` once, as in `src/components/LabCard.astro`, `src/components/PageHeader.astro`, `src/components/SiteFooter.astro`, and `src/layouts/BaseLayout.astro`.
- Use singular supporting interfaces for nested object shapes, such as `MediaItem` in `src/components/MediaRail.astro`, `NavItem` in `src/components/SiteHeader.astro`, and `SocialLink` in `src/components/SiteFooter.astro`.
- Use explicit Astro content typing with `CollectionEntry<"projects">` and `CollectionEntry<"lab">` in `src/pages/index.astro`, `src/pages/lab/index.astro`, and `src/pages/projects/[slug].astro`.
- Name Zod schema constants with a `Schema` suffix in `src/content.config.ts`, such as `pageSchema`, `projectSchema`, `labSchema`, and `siteSchema`.

## Code Style

**Formatting:**
- No dedicated Prettier, Biome, or EditorConfig file is detected at the repo root. Formatting is established by the committed files themselves plus TypeScript and Astro parsing.
- Active application code in `src/` consistently uses 2-space indentation, double quotes, and trailing semicolons in frontmatter and TypeScript files, as seen in `src/content.config.ts`, `src/middleware.ts`, `src/layouts/BaseLayout.astro`, and `src/pages/index.astro`.
- Long prop lists, chained array transforms, and conditional markup are wrapped across multiple lines instead of compressed, especially in `src/pages/index.astro`, `src/pages/projects/index.astro`, and `src/pages/lab/[slug].astro`.
- CSS also uses 2-space indentation, grouped selectors, and multi-line property values for complex backgrounds or transitions, especially in `src/styles/core/base.css`, `src/styles/core/layout.css`, and `src/styles/core/utilities.css`.
- Keep imports and frontmatter logic above the `---` fence in `.astro` files. Keep markup and CSS class wiring below it, matching every file in `src/components/`, `src/layouts/`, and `src/pages/`.

**Linting:**
- No `eslint`, `biome`, or `prettier` package/config is detected at the project root.
- The only repo-level automated quality gate is `astro check`, exposed as `pnpm check` in `package.json`.
- Type strictness comes from `astro/tsconfigs/strict` in `tsconfig.json`.
- Static checking scope is limited by `tsconfig.json`. It includes `src/**/*.ts`, `src/**/*.astro`, `src/**/*.vue`, `src/**/*.md`, `src/**/*.json`, and `astro.config.mjs`, while excluding `projects`, `templates`, `data`, `styles`, `images`, `assets`, `about`, `public/styles`, `.astro`, `dist`, and `.output`.

## Import Organization

**Order:**
1. Import Astro framework modules first, such as `astro:content`, `astro:transitions`, `astro:middleware`, and `astro/config`, as shown in `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, and `src/middleware.ts`.
2. Keep `import type` statements adjacent to the package they describe, as in `src/pages/index.astro`, `src/pages/lab/index.astro`, and `src/pages/projects/[slug].astro`.
3. Import local layouts, components, and styles last with relative paths, such as `../layouts/BaseLayout.astro`, `../../components/MediaRail.astro`, and `../styles/global.css`.

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`.
- Use relative imports throughout `src/`, including parent traversal where needed. Examples: `../components/PageHeader.astro` in `src/pages/about.astro` and `../../layouts/BaseLayout.astro` in `src/pages/projects/index.astro`.

## Error Handling

**Patterns:**
- Fail fast when required content is missing. `src/layouts/BaseLayout.astro`, `src/pages/about.astro`, `src/pages/resume.astro`, and `src/pages/index.astro` all guard `getEntry(...)` results and throw a descriptive `Error` immediately.
- Prefer early-return redirects for route normalization and legacy URL support. This pattern appears in `src/pages/e4p.astro`, `src/pages/garden.astro`, `src/pages/style-guide.astro`, `src/pages/index.astro`, and `src/middleware.ts`.
- Keep redirect status codes explicit. Route and middleware redirects consistently use `301` in `src/pages/e4p/[slug].astro`, `src/pages/garden/[slug].astro`, and `src/middleware.ts`.
- Use data defaults at the schema or prop boundary instead of scattered null checks. Examples: `.default([])` and `.default(false)` in `src/content.config.ts`, plus `featured = false` and `media = []` defaults in `src/components/ProjectCard.astro` and `src/components/MediaRail.astro`.

## Logging

**Framework:** None in the active site code under `src/`.

**Patterns:**
- Avoid runtime logging in the active Astro application. No `console.*` usage is present in `src/components/`, `src/layouts/`, `src/pages/`, `src/content.config.ts`, or `src/middleware.ts`.
- Use logging only in Node-side scripts where failures need to abort the process. `scripts/migrate-to-astro-content.mjs` uses `console.error(error); process.exit(1);` in its top-level `main().catch(...)`.
- Treat user-facing failures as explicit errors or redirects rather than silent logs.

## Comments

**When to Comment:**
- Active `src/` code relies on descriptive names and layout structure instead of comments. This is the dominant convention in `src/components/`, `src/layouts/`, `src/pages/`, and `src/content.config.ts`.
- Legacy scripts contain commented-out experiments and brief inline notes, such as the disabled GSAP hooks in `scripts/pe-site/index.js` and the `//scroll to bottom` note in `scripts/scrollToEnd.js`.
- Follow the active-app pattern for new work in `src/`: add comments only for non-obvious behavior, not for straightforward rendering or data mapping.

**JSDoc/TSDoc:**
- Not used. Types and schemas carry intent instead, especially via `Props` interfaces in `.astro` files and Zod schemas in `src/content.config.ts`.

## Function Design

**Size:** Keep components and routes compact and single-purpose. Reusable UI is split into small `.astro` files like `src/components/PageHeader.astro`, `src/components/SectionIntro.astro`, `src/components/ProjectRow.astro`, and `src/components/LabCard.astro`, while pages mainly compose those pieces.

**Parameters:**
- Use typed `Props` and destructuring at the top of the file for Astro components, as in `src/components/ProjectRow.astro`, `src/components/MediaRail.astro`, and `src/components/SiteHeader.astro`.
- Keep helper signatures narrow and explicit in scripts, such as `pageTransition(swup)` in `scripts/pe-site/pageTransition.js`.
- Represent collections and content links with plain objects and arrays instead of classes, as seen in `src/content.config.ts` and `src/content/site/config.json`.

**Return Values:**
- Return Astro primitives directly from route files and middleware: `Astro.redirect(...)` in `src/pages/e4p.astro` and `src/pages/index.astro`, array payloads from `getStaticPaths()` in `src/pages/lab/[slug].astro` and `src/pages/projects/[slug].astro`, and `next()` or `Response.redirect(...)` in `src/middleware.ts`.
- In Node scripts, return plain strings, arrays, and objects from helpers like `toYaml`, `formatYamlValue`, `sectionToMarkdown`, `collectLinks`, and `collectMedia` in `scripts/migrate-to-astro-content.mjs`.

## Module Design

**Exports:**
- `.astro` components and layouts rely on Astro’s file-based component model rather than explicit export lists. Keep one component per file in `src/components/` and `src/layouts/`.
- TypeScript modules favor named exports for app entry points, such as `collections` in `src/content.config.ts` and `onRequest` in `src/middleware.ts`.
- Browser utility scripts in `scripts/pe-site/` and `scripts/scrollToEnd.js` use a single default export per file.

**Barrel Files:** None detected in `src/`, `scripts/`, or the repo root. Import directly from concrete file paths.

---

*Convention analysis: 2026-03-27*
