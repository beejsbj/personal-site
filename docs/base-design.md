# Base homepage: warm welcome

Burooj selected iteration A on 2026-09-11: “A is good implement it as base.”

The homepage adopts the v1/v2 warm paper, burgundy, peach circular navigation,
Newsreader/Lato pairing, large greeting, portrait, and curved line. Featured
projects remain distinct from dated updates. Content collections and existing
inner-page routes remain intact; this selection does not redesign the inner pages
or resume prism work.

The comparison is preserved on `prototype/bjs-427-base-iterations` at `af96d8f`.
That branch holds A, B, C, and the development switcher. The implementation branch
is `codex/bjs-427-warm-welcome-base`; it contains only the selected homepage,
without query-param switching or prototype files.

Run `corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321` and open `/`.
Verify with `corepack pnpm@10.6.5 check`, `corepack pnpm@10.6.5 build`, then
`corepack pnpm@10.6.5 test:homepage`. The last command checks generated production
HTML, metadata, landmarks, content links, local assets, and comparison removal.

Tracking: [BJS-427](https://linear.app/bjs-projects/issue/BJS-427/refine-personal-site-base-design-from-original-styling).
Deployment and broader legacy cleanup (BJS-423) are separate work.
