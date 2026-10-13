# Personal site

Astro source lives in `src/`. The approved warm-welcome design is shared by the
homepage and inner pages; content lives in `src/content/`.

## Develop

```sh
corepack pnpm@10.6.5 install --frozen-lockfile
corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321
```

Open `http://localhost:4321/`. The living style guide is
`http://localhost:4321/style-guide` (`/design-system` is a compatibility alias).

## Design source

- `src/design/tokens.css`: visual values and responsive contracts.
- `src/design/primitives/`: links, headings, media frames, notes, metadata lists.
- `src/design/unique/`: the portrait, hand-drawn curve, decorative circles and
  independently enhanced corner blob.
- `src/design/compounds/`, `src/components/`: shared assemblies.
- `src/design/compositions/`: the welcome region used by the homepage and guide.

The guide imports production components, not copies. [Design review](docs/base-design.md)
records the selected direction and the archived alternatives.

## Writing

`/writing` and `/writing/<slug>` render public Substack content on demand using
the shared `src/lib/portfolio.ts` boundary and `src/lib/writing.ts` adapter.
Daylight and all four Prism shells consume the same writing contract; lenses do
not fetch Substack themselves or scrape the Daylight article. The shared
`/prism/content.json` API carries metadata plus only the requested article body
(`?writing=<slug>`). Metadata is checked
against `src/lib/content/writing-schema.ts`, and bodies pass the allowlist
sanitiser in `src/lib/content/substack-html.mjs` before native HTML rendering.
Canonical links and attribution point to the Substack original. Authored writing
page copy lives in `src/content/pages/writing.md`, alongside the existing pages.

Substack is the source of truth. There are **no imported article files, scheduled
Git commits, or content-triggered site builds**. The writing index, article routes,
writing sitemap and shared Prism API are server-rendered; existing authored
collections and portfolio pages retain their static behavior. The API renders
the authored portfolio once per warm function and attaches current writing data
on each request. Authored update eligibility is pinned to one build timestamp,
so a function cold start cannot disagree with the static homepage. Astro 5 content collections update at build
time, so the live adapter uses the same content-shaped interface rather than
pretending `getCollection()` is live.

The adapter pages through the public archive API (50 posts per page) and fetches
an article body only when requested. These Substack JSON APIs are undocumented
and can change. The official RSS feed is a limited recent-post/body fallback;
it is not treated as a complete archive, and an RSS body can be a public preview.
Only posts confirmed public by the API are rendered in full. Images remain
hotlinked; forms, scripts, executable embeds and Substack chrome are removed.

On Vercel, `@vercel/functions` Runtime Cache persists source data across function
instances and deployments, without a database or new credentials. Cache keys
are namespaced for this site/source; preview and production are isolated by
Vercel. The source revalidates after five minutes, and HTML CDN caching is one
minute. During a transient source outage, a previously successful entry can be
used for up to one hour from its original fetch time, never indefinitely. Local
development uses an in-process cache. Cold-start failures without cached content
show a non-cacheable 503 and a link to Substack. Known deleted, unpublished or
paid posts return 404 and do not fall back to an old public body once observed.
Cache storage itself is best-effort; misses fetch the source again. Runtime
Cache is Vercel infrastructure usage and subject to the project's plan limits.

New and edited posts become visible on the next request after cache expiry, with
no site rebuild. Publication/access changes can remain visible within that cache
window; this public replica is not an immediate-revocation or paid-content system.
The runtime `/writing/sitemap.xml` is linked from the static sitemap index, so
new post URLs also reach crawlers without rebuilding the portfolio. The lens
loader refreshes on writing navigation, validates the requested body slug, and
updates the retained shared content object before each screen transition.
Article requests never populate every body or freeze a visit's content forever.

This writing branch is stacked on `prism/lenses-and-lure` (PR #9); it depends on
that shared content architecture landing first. Writing is an internal section
in Calling Card, Cut Paper, Back Page and Hion, with each lens's existing reading
styles and motion. Back Page builds its book stops from metadata, so opening a
chapter fetches its body only when requested.

## Verify

```sh
corepack pnpm@10.6.5 check
corepack pnpm@10.6.5 build
corepack pnpm@10.6.5 test
# Browser parity (set PRISM_CHROMIUM for local Chromium when needed):
corepack pnpm@10.6.5 test:prism
```

Tests inspect the generated output and enforce token/component cohesion.
Text navigation and its current-page state work without JavaScript. Decorative
circles are static, hidden from assistive technology and never act as controls.
Only the cropped corner blob has a local pointer-attraction enhancement, disabled
for touch and reduced motion. The guide imports these production specimens.
`corepack pnpm@10.6.5 format` formats active source with Prettier and its Astro plugin.

## Historical material

The root PHP site, `templates/`, `data/`, `styles/`, `images/`, `projects/`, and
older scripts are preserved historical material, not the current Astro source.
The existing Docker configuration still serves that PHP archive; Vercel excludes
it from deployment inputs. See the [runtime/archive boundary](docs/runtime-archive.md)
for the full inventory, media policy, and recovery guardrails. Do not rerun
`scripts/migrate-to-astro-content.mjs` casually: it is a one-shot importer that
can overwrite authored content.

`public/images/` and compatibility routes remain active. `/style-guide` is the
dedicated current guide; `/design-system` and `/lab/style-guide` redirect there.
Production is hosted by Vercel at `https://burooj.dev`. GitHub branches receive
preview deployments; successful builds from `main` update production. See
[production operations](docs/production.md) for the build gate, DNS boundary,
verification, and rollback.
