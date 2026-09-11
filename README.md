# Personal site

Astro source lives in `src/`. The approved warm-welcome design is shared by the
homepage and inner pages; content lives in `src/content/`.

## Develop

```sh
corepack pnpm@10.6.5 install --frozen-lockfile
corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321
```

Open `http://localhost:4321/`. The living style guide is
`http://localhost:4321/design-system`.

## Design source

- `src/design/tokens.css`: visual values and responsive contracts.
- `src/design/primitives/`: links, headings, media frames, notes, metadata lists.
- `src/design/unique/`: the portrait and hand-drawn curve.
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
`corepack pnpm@10.6.5 format` formats active source with Prettier and its Astro plugin.

## Historical material

The root PHP site, `templates/`, `data/`, `styles/`, `images/`, `projects/`, and
older scripts are preserved historical material, not the current Astro source.
The existing Docker configuration still serves that PHP archive. Do not rerun
`scripts/migrate-to-astro-content.mjs` casually: it is a one-shot importer that
can overwrite authored content.

`public/images/` and compatibility routes remain active. The old `/style-guide`
URL continues to point at its historical Lab entry; the current system has its
own `/design-system` route. Deployment is a separate action.


