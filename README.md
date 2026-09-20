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
  independently enhanced corner blob, plus the recovered page transition.
- `src/design/compounds/`, `src/components/`: shared assemblies.
- `src/design/compositions/`: the welcome region used by the homepage and guide.

The guide imports production components, not copies. [Design review](docs/base-design.md)
records the selected direction and the archived alternatives.

## Verify

```sh
corepack pnpm@10.6.5 check
corepack pnpm@10.6.5 build
corepack pnpm@10.6.5 test
```

Tests inspect the generated output and enforce token/component cohesion.
Text navigation and its current-page state work without JavaScript. The default
theme restores the PHP site's rainbow strip transition. Its four circles react
to the pointer and support drag/throw, keyboard movement, and a Return balls
control. Reduced motion disables physics and the page sweep; without JavaScript
the circles remain inert artwork. The corner blob retains its local pointer
enhancement. The guide imports these production specimens. See the
[transition notes](docs/page-transition.md) and
[theme architecture assessment](docs/theme-architecture.md) for their boundaries.
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
