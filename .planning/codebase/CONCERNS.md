# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**Active Astro site and archive code share one repo:**
- Issue: The supported Astro app in `src/` lives beside 21 top-level legacy project directories in `projects/`, plus older `templates/` and `styles/` trees. Repo-wide searches and refactors mix active code with dormant experiments.
- Files: `src/`, `projects/`, `templates/`, `styles/`, `README.md`
- Impact: Review noise stays high, unsupported patterns look live, and it is easy to patch the wrong layer.
- Fix approach: Treat `src/` as the supported app boundary, move dormant projects behind an explicit archive boundary or separate repo, and remove unused template/style trees once the Astro site no longer depends on them.

**Redirect behavior has two sources of truth:**
- Issue: Legacy `?page=` redirects are implemented both in `src/middleware.ts` and in `src/pages/index.astro`.
- Files: `src/middleware.ts`, `src/pages/index.astro`
- Impact: Redirect additions can drift between request-time and page-time handling, which makes future fixes harder to reason about.
- Fix approach: Keep the redirect map in one shared module or handle the legacy redirect behavior entirely in middleware.

**Large legacy scripts combine state, DOM, and business logic:**
- Issue: Archived interactive projects keep storage logic, calculation logic, templating, and DOM mutation in the same files.
- Files: `projects/e4p/e4p.js`, `projects/flashcards/scripts/flashcards.js`, `projects/todo-app/scripts/classes/List.js`, `projects/todo-app/scripts/classes/TodoApp.js`
- Impact: Even narrow fixes have high regression risk, and there are no clean seams for testing or selective reuse.
- Fix approach: If these apps stay in-repo, split pure logic from rendering and treat each archived app as its own bounded module before further feature work.

## Known Bugs

**Hidden lab entries are still generated as public pages:**
- Symptoms: `hidden: true` removes entries from list pages but not from static route generation. A `pnpm build` run on 2026-03-27 still generated `/lab/quantumon` and `/lab/roulette`, and `src/content/lab/roulette.md` still contains placeholder copy.
- Files: `src/pages/lab/[slug].astro`, `src/pages/projects/[slug].astro`, `src/content/lab/quantumon.md`, `src/content/lab/roulette.md`
- Trigger: Any direct request to a hidden entry slug.
- Workaround: None in the current app. Direct URLs stay reachable until `getStaticPaths()` filters `entry.data.hidden`.

**The Flash Cards lab entry links to a route the site does not build:**
- Symptoms: `src/content/lab/flashcards.md` uses `url: "/projects/flashcards"`, but the Astro project detail routes only cover collection-backed slugs from `src/content/projects/`.
- Files: `src/content/lab/flashcards.md`, `src/pages/projects/[slug].astro`, `src/content/projects/api3-ecosystem.md`, `src/content/projects/desci-bengaluru.md`, `src/content/projects/pizza-nano.md`, `src/content/projects/qrng.md`
- Trigger: Clicking `Live Link` on `/lab/flashcards`.
- Workaround: Use the GitHub link until a real internal route or external URL exists.

**Two featured project entries reference missing cover assets:**
- Symptoms: `/images/projects/desci-bengaluru.png` and `/images/projects/pizza-nano.png` do not exist in `images/projects/`, so cards and detail media render broken images even though `pnpm build` succeeds.
- Files: `src/content/projects/desci-bengaluru.md`, `src/content/projects/pizza-nano.md`, `images/projects/`, `src/components/ProjectCard.astro`, `src/components/ProjectRow.astro`, `src/components/MediaRail.astro`
- Trigger: Visiting `/`, `/projects`, `/projects/desci-bengaluru`, or `/projects/pizza-nano`.
- Workaround: Replace those frontmatter paths with existing assets or add the missing files.

**The paint calculator exercise reads the wrong variables:**
- Symptoms: `paintCalculator()` uses `length.value` and `width.value` instead of `$length.value` and `$width.value`, which can resolve to the window `length` property and produce invalid output.
- Files: `projects/e4p/e4p.js`
- Trigger: Running the paint calculator in the JavaScript version of the Exercises for Programmers app.
- Workaround: Use the PHP version or patch the JavaScript function before exposing it again.

## Security Considerations

**Legacy apps render unsanitized HTML from user input, local storage, and remote data:**
- Risk: Archived pages can execute or persist injected markup because strings are interpolated into `innerHTML` from form input, `localStorage`, and remote API data.
- Files: `projects/todo-app/scripts/classes/Todo.js`, `projects/todo-app/scripts/classes/List.js`, `projects/todo-app/scripts/classes/TodoApp.js`, `projects/e4p/e4p.js`, `projects/flashcards/scripts/flashcards.js`
- Current mitigation: None beyond these apps being archived rather than first-class Astro routes.
- Recommendations: Replace string-based HTML rendering with DOM APIs or sanitize content before rendering, and never hydrate `localStorage` straight into markup.

**Some legacy pages open external sites with `_blank` and no `rel` protection:**
- Risk: Missing `rel="noopener noreferrer"` leaves `window.opener` available and weakens outbound link isolation.
- Files: `projects/web-portal/index.html`, `projects/quantumon/index.html`, `projects/_archive/four-page/welcome.html`, `templates/modules/article-grid/article-grid.php`
- Current mitigation: Current Astro components in `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/pages/lab/[slug].astro`, and `src/pages/projects/[slug].astro` already set `rel="noreferrer"` for external links.
- Recommendations: Normalize every remaining legacy template and page to `rel="noopener noreferrer"` before reusing it.

**Legacy todo app loads runtime dependencies directly from CDNs:**
- Risk: Supply-chain and availability exposure remains because core behavior depends on `dragula` and `rough-notation` fetched at runtime.
- Files: `projects/todo-app/index.php`, `projects/todo-app/scripts/script.js`, `projects/todo-app/scripts/classes/List.js`
- Current mitigation: None.
- Recommendations: Move those dependencies into a package-managed build or vendor them locally before shipping the app again.

## Performance Bottlenecks

**Content media bypasses Astro's asset pipeline:**
- Problem: Covers and media are raw string paths rendered with plain `<img>` and `<video>` tags, so oversized assets, missing files, and missing dimensions are not caught at build time.
- Files: `src/content.config.ts`, `src/components/ProjectCard.astro`, `src/components/ProjectRow.astro`, `src/components/LabCard.astro`, `src/components/MediaRail.astro`, `src/content/projects/`, `src/content/lab/`
- Cause: `cover` and `media.src` are unvalidated strings, and the components do not use `astro:assets`.
- Improvement path: Move managed media into an asset pipeline with validation, width/height metadata, and stricter content schemas.

**Flash Cards blocks on a remote API and only logs failures:**
- Problem: The app cannot start until a WordPress API call returns, and a failed request leaves the start button hidden with no user-facing error state.
- Files: `projects/flashcards/scripts/flashcards.js`
- Cause: `getData()` fetches on load, gates `beginButton()` on success, and `catch()` only logs `"oops"`.
- Improvement path: Add a visible error or empty state, versioned caching, and an offline fallback dataset.

**Archived monolith files are expensive to audit and revive:**
- Problem: Several archived experiences use very large standalone CSS or JS files, which will be slow to safely modernize if they are brought back into the portfolio.
- Files: `projects/quantumon/css/style.css`, `projects/old-garden/css/style.css`, `projects/e4p/in-vue/script.js`, `projects/e4p/e4p.js`
- Cause: Features accumulated inside single files rather than bounded modules.
- Improvement path: Freeze them as archival artifacts or split them before any feature work resumes.

## Fragile Areas

**Content-driven routing and visibility rules:**
- Files: `src/pages/lab/[slug].astro`, `src/pages/projects/[slug].astro`, `src/content.config.ts`, `src/content/lab/quantumon.md`, `src/content/lab/roulette.md`, `src/content/lab/flashcards.md`
- Why fragile: `hidden` is only enforced in list pages, not route generation. Link and media fields accept arbitrary strings, so bad URLs and missing assets ship silently.
- Safe modification: Filter `getStaticPaths()` by `!entry.data.hidden`, change link and media schemas to stricter validation, and add a prebuild content validator that checks referenced local assets and internal routes.
- Test coverage: No automated content or routing tests were detected. `pnpm check` and `pnpm build` both pass without catching these issues.

**Legacy todo app event and dependency model:**
- Files: `projects/todo-app/scripts/classes/TodoApp.js`, `projects/todo-app/scripts/script.js`, `projects/todo-app/index.php`
- Why fragile: Core interactions rely on browser-global `event`, browser-global `dragula`, and CDN load order instead of explicit imports and typed boundaries.
- Safe modification: Pass `event` explicitly, own dependency loading inside the module graph, and keep a smoke test around add, remove, and reorder flows.
- Test coverage: None detected.

**Legacy exercise runner:**
- Files: `projects/e4p/e4p.js`
- Why fragile: One file owns toggle state, form submission, dozens of exercise handlers, and repeated `innerHTML` output. It also creates implicit globals like `template`, `amount`, `tax`, and `total`.
- Safe modification: Extract pure calculators per exercise, then bind them to DOM rendering one exercise at a time.
- Test coverage: None detected.

**Flash Cards remote-content renderer:**
- Files: `projects/flashcards/scripts/flashcards.js`, `src/content/lab/flashcards.md`
- Why fragile: Remote API shape, local storage format, and HTML templates are tightly coupled. Malformed stored data or API shape changes can break the UI before the user can recover.
- Safe modification: Validate API payloads, wrap `JSON.parse`, sanitize rendered fields, and add a reset path when stored data is invalid.
- Test coverage: None detected.

## Scaling Limits

**Archive growth inside the main repo:**
- Current capacity: The current Astro site renders 4 project entries and 6 lab entries, while the repo already carries 21 top-level directories under `projects/`.
- Limit: Repo-wide searches, audits, and future refactors will keep mixing active site code with historical artifacts, which raises maintenance cost faster than the live site itself grows.
- Scaling path: Split archived projects into a separate repo or put them behind a clearly excluded `archive/` boundary with its own tooling.

## Dependencies at Risk

**CDN-delivered `dragula` and `rough-notation`:**
- Files: `projects/todo-app/index.php`, `projects/todo-app/scripts/script.js`, `projects/todo-app/scripts/classes/List.js`
- Risk: The app depends on third-party CDN delivery for interaction and annotation behavior, and one import mixes an ESM URL directly into application code.
- Impact: The app can break due to CDN downtime, package removal, or CSP tightening even if the repo itself does not change.
- Migration plan: Install the dependencies through the root toolchain or vendor them locally before any reuse.

## Missing Critical Features

**Automated regression coverage for site behavior and archived apps:**
- Problem: No test runner, no test files, no lint configuration, and no prebuild validator are present. The root scripts in `package.json` stop at `astro check` and `astro build`.
- Blocks: Safe refactoring of `src/pages/`, reliable editing of `src/content/`, and any serious attempt to revive archived apps without manual browser testing.

## Test Coverage Gaps

**Astro routing, content wiring, and redirect behavior:**
- What's not tested: `hidden` handling, redirect mappings, existence of local asset references, and internal link integrity across `src/pages/` and `src/content/`.
- Files: `src/pages/index.astro`, `src/middleware.ts`, `src/pages/lab/[slug].astro`, `src/pages/projects/[slug].astro`, `src/content/`
- Risk: The site can build and deploy with broken links, broken images, or leaked hidden pages.
- Priority: High

**Legacy interactive archives:**
- What's not tested: Core state flows in `projects/flashcards/`, `projects/todo-app/`, and `projects/e4p/`.
- Files: `projects/flashcards/scripts/flashcards.js`, `projects/todo-app/scripts/classes/TodoApp.js`, `projects/todo-app/scripts/classes/List.js`, `projects/e4p/e4p.js`
- Risk: State corruption, XSS, browser-specific breaks, and broken calculations are discovered only through manual playtesting.
- Priority: Medium

---

*Concerns audit: 2026-03-27*
