# Base homepage: warm welcome

Burooj selected iteration A on 2026-09-11: “A is good implement it as base.”

The homepage adopts the v1/v2 warm paper, burgundy, peach circular navigation,
Newsreader/Lato pairing, large greeting, portrait, and curved line. Featured
projects remain distinct from dated updates. Content collections and existing
inner-page routes remain intact. Following Burooj's request for a ground-up
design system, the same foundations, header, footer, and content components now
serve the inner pages too. This does not resume prism work.

The comparison is preserved on `prototype/bjs-427-base-iterations` at `af96d8f`.
That branch holds A, B, C, and the development switcher. The implementation branch
is `codex/bjs-427-warm-welcome-base`; it contains only the selected direction,
without query-param switching or prototype files.

Run `corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321` and open `/`.
Verify with `corepack pnpm@10.6.5 check`, `corepack pnpm@10.6.5 build`, then
`corepack pnpm@10.6.5 test`. The tests check generated production HTML, metadata,
landmarks, links/assets on all pages, comparison removal, component consumers,
and token cohesion. The live style guide is `/design-system`; it imports the
production components and is noindexed. `/style-guide` retains its historical
redirect to `/lab/style-guide`.

## Design review

- **Direction realized:** A's welcome-first layout. The activity-first desk and
  navigation-first circular index remain source material on the prototype branch,
  not alternate runtime themes.
- **Hero moment:** the large personal greeting, off-axis portrait, and hand-drawn
  turn into the project list. These stay intact rather than becoming generic cards.
- **Creative calls:** shared circular navigation and concise footer on inner
  pages; shared project rows with row/stack layouts; a subtle press state on
  navigation and action links, disabled for reduced motion. The edge-circle
  position now respects the content gutter so it cannot obscure desktop text.
- **Needs your eye:** the extension of A into About, project details, and Lab.
- **System:** 19 renderable components/compositions, one token authority,
  zero orphan tokens/components in the cohesion audit. The guide shows real
  imports, variants, anatomy, and interaction contracts.

## Cleanup boundary

Removed the superseded token/theme files, duplicated ProjectCard implementation,
dead homepage/header/footer/button rules, and unused Vue, MDX, GSAP, and Space
Grotesk packages. Prettier and its Astro plugin are development-only formatting
tools; no new runtime UI framework was added.

The root PHP/templates/data/styles/projects tree remains a coupled historical
site, runnable through its existing Docker setup. Public images, legacy URL
redirects, source content, and archival imports remain intact. Do not treat them
as dead files just because Astro does not import them. Deleted implementation
files remain recoverable in Git.

Tracking: [BJS-427](https://linear.app/bjs-projects/issue/BJS-427/refine-personal-site-base-design-from-original-styling).
Deployment and broader legacy cleanup (BJS-423) are separate work.
