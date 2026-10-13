# Runtime and archive boundary

The repository carries two deliberate, recoverable systems. Astro is the active
portfolio runtime. The original PHP/JSON site is a source archive that can still
be run locally with Docker. They share history and selected still images, but
only the Astro system is a Vercel deployment input.

## Inventory and decision

| Area                                                                                                        | Role                                                                 | Decision                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/`, `astro.config.mjs`, `vercel.json`, `tsconfig.json`                                                  | Active Astro runtime and route policy                                | Keep as the Vercel build inputs.                                                                                                   |
| `public/images/`                                                                                            | Active static assets                                                 | Keep its existing current delivery assets; remove only the 16 verified unreferenced MP4 duplicates listed below.                   |
| `src/content/`                                                                                              | Current authored content                                             | Keep as the source of the published portfolio.                                                                                     |
| `src/lib/legacyRedirects.ts`, `src/middleware.ts`, `vercel.json`                                            | Compatibility behavior                                               | Keep; `redirect-parity.test.mjs` checks the app and Vercel query policies produce the same destinations.                           |
| `index.php`, `functions.php`, `about/`, `data/`, `templates/`, `styles/`, `images/`, `assets/`, `projects/` | Original PHP/JSON site, project source, media, and design references | Keep in place as the runnable archive; exclude from Vercel uploads with `.vercelignore`. Docker keeps its full root-context mount. |
| `scripts/migrate-to-astro-content.mjs`                                                                      | One-shot historical importer                                         | Keep, but do not run during ordinary development. It writes into authored Astro content.                                           |
| `docker-compose.yaml`                                                                                       | Local PHP archive runtime                                            | Keep for recovery and inspection; it is not part of the Vercel runtime.                                                            |

`ProjectCard`/`ProjectRow` and the Vue, MDX, and GSAP dependency cleanup belong
to BJS-427 and are already settled. This boundary does not reopen the deferred
prism work or redesign the active portfolio.

## Media strategy

The archival `images/projects/` directory retains the original project videos.
It contains the authoritative byte-for-byte copies used by the PHP archive.
The 16 duplicate MP4s formerly under `public/images/projects/` had no reference
from `src/`, generated Astro HTML, or public HTML/JavaScript/demo assets, so they
were delivery artifacts rather than active portfolio media. Their direct Vercel
URLs are intentionally retired. The PHP archive still serves the preserved
`images/projects/` originals. Removing those public copies reduces the Astro
static payload by 282.26 MiB while keeping every original video recoverable in
the archive.

The largest file, `images/projects/roulette-laptop-connect.mp4`, is 74.15 MiB
(77.75 MB).
It stays in the repository archive unchanged. There is no Git LFS migration,
history rewrite, external upload, transcoding, or deletion of original media in
this boundary. If a video becomes current portfolio media, add a deliberately
chosen derivative to `public/images/projects/`, reference it from content, and
check its loading behavior before delivery.

## Guardrails

- `scripts/tests/archive-boundary.test.mjs` proves a full checkout retains the
  PHP archive inputs and Docker wiring, the Vercel ignore boundary is explicit,
  and no archived MP4 has slipped back into the Astro public payload.
- `scripts/tests/redirect-parity.test.mjs` exercises representative legacy query
  requests against the app-side redirect table and the Vercel rules, then checks
  the duplicated path aliases on both sides. An empty `project=` now resolves to
  `/projects` in the app, matching Vercel; an absent project parameter still
  leaves the request alone. The home query is served directly on Vercel to avoid
  a redirect loop.
- Run `corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test` after changing
  archive media or compatibility routes. The focused tests inspect `dist/client`
  so a successful source-only edit cannot hide a delivered asset regression.
