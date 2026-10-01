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

`/writing` and `/writing/<slug>` publish Burooj's Substack posts in full, from
markdown in `src/content/writing/`. Each page's `<link rel="canonical">` points
at the Substack original, and links back to it.

Those files are generated, and committed. The sync is **never run at build
time**: builds stay deterministic and offline-safe, and a change to the writing
shows up as a reviewable diff. To pull new or edited posts:

```sh
corepack pnpm@10.6.5 sync:writing              # add new, update changed
corepack pnpm@10.6.5 sync:writing -- --dry-run # preview, write nothing
corepack pnpm@10.6.5 sync:writing -- --prune   # also delete posts Substack dropped
```

then review the diff and commit. It reads Substack's public archive API for the
full list (the RSS feed is capped), each post's body from the posts API, and
uses the feed as a cross-check and fallback. Only free, published posts are
synced. Bodies pass an allowlist sanitiser (`scripts/lib/substack-html.mjs`):
subscribe and share widgets, scripts, iframes, forms, icons and tracking images
are removed; images stay hotlinked to Substack's CDN. Re-running is idempotent.
Fix a post on Substack and re-sync rather than editing the generated file.

## Verify

```sh
corepack pnpm@10.6.5 check
corepack pnpm@10.6.5 build
corepack pnpm@10.6.5 test
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
The existing Docker configuration still serves that PHP archive. Do not rerun
`scripts/migrate-to-astro-content.mjs` casually: it is a one-shot importer that
can overwrite authored content.

`public/images/` and compatibility routes remain active. `/style-guide` is the
dedicated current guide; `/design-system` and `/lab/style-guide` redirect there.
Production is hosted by Vercel at `https://burooj.dev`. GitHub branches receive
preview deployments; successful builds from `main` update production. See
[production operations](docs/production.md) for the build gate, DNS boundary,
verification, and rollback.
