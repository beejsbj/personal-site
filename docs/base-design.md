# Base homepage: warm welcome

## Current pass — 12 September: tighten the standalone portfolio

The base must work as a portfolio on its own. This pass responds to Burooj's
latest review: retain v1's small interaction details, fix links and portrait,
strengthen inner pages, and separate projects, experiments, and activity.
The refinements still need his visual review; approval of A does not automatically
approve every new detail.

### Design and interaction

- Keep v1/v2's warm paper, burgundy, peach, Newsreader/Lato, greeting, curved line,
  uneven navigation cluster, and offset shadows.
- Preserve menu current, hover, pressed, keyboard-focus, and magnetic states.
  Resting movement is a finite opening drift, not endless animation. There is no
  Pause motion control. Touch and Reduced Motion stay static.
- The cropped top-left decorative blob also responds to nearby pointer movement;
  it does not become a hidden navigation control.
- Links use clear underlines and small inline arrows, without the rejected dots
  or oversized arrow blocks. Peach project-media brackets remain a separate detail.
- The portrait has a circular crop and peach border, not the elongated oval.
- Shared tokens, production components, and shared header/footer remain the
  authority. The dedicated, noindexed guide is `/style-guide`, not a Lab entry;
  `/design-system` is the compatibility alias.

### Page and content roles

- **Home:** authored introduction, selected project highlights, current note,
  mixed activity. Highlights are not the complete project inventory.
- **Projects:** six-entry timeline: Conduit Market (2025), API3 Ecosystem (2024),
  Flash Cards and QRNG Demo Apps (2022), Exercises for Programmers and Layout
  Garden (2021). The last two are Arcade projects; Flash Cards is a project.
  Detail pages explain contribution and preserve archive/demo boundaries.
- **Lab:** selected CodePen experiments, Motion Path Graph and Beating Shapes.
  Source attribution stays visible; browsing the base needs no live embeds.
- **About and Resume:** recovered public portfolio wording, specific work,
  Conduit 2025, and direct contact. No stale current-employment/enrolment claims.
  See [copy provenance](portfolio-copy-sources.md) for sources and historical
  facts still needing Burooj's confirmation.
- **Footer:** consistent contact, Resume, and Style guide access. Writing remains
  an external destination.

Pizza Nano and DeSci remain historical work, not newly published case studies
with missing media. The former Pizza Nano domain has been repurposed and is not
a safe portfolio destination.

### Activity is a snapshot, not a service

The six current records are curated content files. Some carry public GitHub
evidence and observation times; older records are preserved site updates.
There are no live agent counts, location, or service telemetry. Expiry filtering
occurs at build/render time only. The future hook- and agent-facing system needs
its own issue, captured in [the activity-system brief](activity-system-brief.md);
it is not implemented by this cleanup.

### Verification and scope

Integrated verification on 12 September: Astro check passed for 45 files with
zero diagnostics; build and all 22 tests passed; `git diff --check` was clean.
An incremental content sync emitted one duplicate-ID cache warning for
`component-guide`; the source inventory contains one such record and the following
production build emitted no duplicate warning.

The parent inspected desktop/mobile Home, Projects, Lab and Style Guide in the
browser, and checked main routes at 320/768/1000px for overflow and missing images.
The portrait measured 220×220px on desktop and 132×132px on mobile; link arrows
measured about 10px. Actual pointer movement pulled the corner surface about 13px.
Live Reduced Motion and touch emulation stopped drift and attraction. The independent
auditor checked 12 routes at 320/390/768px with no document overflow or broken
images, and exercised the skip link, focus rings and keyboard navigation.

Audit verdict: coherent as a standalone portfolio. Remaining editorial gaps are
Conduit's brief case study, branding/artwork covers rather than interface evidence,
and confirmation of historical resume dates. CodePen sources and showcase previews
were inspected, but their externally hosted demos were not fully runtime-verified.

No prism, automated publication service, deployment, or broad archive removal is
part of this pass.

## Historical interaction pass — earlier on 12 September

The following records the first restoration. Its continuous drift, Pause/Resume,
link dots, and guide routing are superseded by the current pass above. Its test
counts and browser results are historical receipts, not current verification.

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

## Historical selection and system baseline — 11 September

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
and token cohesion. At this baseline, the style guide lived at `/design-system`
and `/style-guide` redirected to `/lab/style-guide`. The current pass supersedes
that routing: `/style-guide` is the dedicated canonical guide.

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
