# Base homepage: warm welcome

## Current pass — 12 September: recover the interaction character

**Direction:** chosen under delegated authority following Burooj's request to
retain more v1 micro-details and make updates a broad notification stream.
A's welcome, portrait, colors and project stories stay; the exact new treatment
is not yet user-approved. No prism, telemetry service, deployment or archival
cleanup is included.

**Source evidence:** `versions/v1` (`1542b6f`) owns the irregular 2×2 menu,
unequal circles, floating phases, burgundy current state and offset shadows.
`e9a0aaf` enables the magnetic menu; the v1 tip leaves that call commented out.
Its text-link dot, expanding underline and lifting external arrow are also
references, not incidental decoration to erase during systematization.

**Unit map:** BlobNav is a unique specimen (its cluster geometry and spring
mechanics are local); SiteHeader and the guide import it. Shared shadows and
motion timing belong to tokens. Link owns the dot/underline/arrow feedback.
ActivityStream owns a dated mixed-event list; UpdateEntry owns event anatomy;
the content schema owns event kinds and provenance. Homepage and guide import
the same sources. Manual records are not live telemetry.

**Workbench:** this is a treatment inside accepted A. The existing localhost
preview is the integration review surface; the guide is updated only from the
authoritative components. No new alternative-theme/gallery route is needed.

**Delivered:** unequal clustered navigation with independent drift, magnetism
and label parallax; correct current/hover/pressed colors; Pause/Resume; native
keyboard navigation; static touch and Reduced Motion; forced-colors borders.
Text links regain the dot/underline/ink-spot signature and outbound-arrow lift.
MediaFrame regains off-axis peach corner brackets. No GSAP/framework was added.
The guide now includes the same progressive-enhancement script; its former
zero-JavaScript assertion was intentionally retired, not silently bypassed.

**Activity:** six curated notifications include verified personal-site and
EmotiTone pull requests, a site milestone and preserved project updates. The
schema also supports repositories, writing, lab events and ephemeral signals.
No agent-count/location/live-service claims are published. Expiry filtering is
build-time only: a future connected stream needs runtime freshness or scheduled
rebuilds before publishing ephemeral signals. Public source links and actual
observation timestamps accompany the new records.

**Verification (12 September):** browser inspection of Home, About, Projects
and guide at 320/390/650/768/1000/1280px found no horizontal overflow or clipped
content. Header link centers remained hittable; smallest target was 84px.
Inspected screenshots of desktop/tablet/mobile heroes, the 320px stream and guide.
Actual pointer hover moved the visual surface while the anchor transform stayed
`none`; Pause/Resume, Tab focus and live Reduced Motion/touch emulation behaved
as intended. Hover peach-on-burgundy contrast was corrected to 4.53:1 (current
5.19:1). Runtime tests cover spring settling and Astro listener cleanup.
`check` passed for 43 files with zero diagnostics; build and all 18 tests passed;
`git diff --check` was clean. Native navigation was exercised with scripts
disabled, and forced-colors rendering retained visible circles and selection.

**Frontier:** Burooj's taste review of the cluster scale/motion and mixed stream.
Live integrations are a separate follow-up. The remaining v1 photo constellation,
page transitions and click-to-scroll decorative circle are documented references,
not silently restored features. No temporary prototype artifacts remain.

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

## 11 September baseline review (before the interaction restoration above)

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
