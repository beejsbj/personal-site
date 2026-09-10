# Base Content Model

Status: revised direction for `BJS-39`; first-version content proposal below remains subject to refinement.

`BJS-39` defines the base personal-site content model and launch finish line before the prism/theming work resumes.

## Current Direction — Resumption After History Review

This section supersedes conflicting recommendations in the historical draft below. Source: Burooj's clarification in the current personal-site session, following the repo, branch, and session-history audit.

### Confirmed Direction

- The base homepage should show who Burooj is, established work, and what he is doing now across the web.
- Projects and updates are distinct: projects are lasting work; updates describe activity and may link to projects. Burooj explicitly confirmed this distinction during the resumed grill-with-docs session.
- Projects belong in or below the homepage's main area, alongside the introduction rather than being represented only through the updates feed.
- Small GitHub projects, experiments, and bjslab belong in that public picture; they are not categorically deferred until after launch.
- The base page should remain largely simple. The later prism layer carries the more elaborate interactive experience.
- Ship a basic version soon. This branch defines the content for that first surface; it should not become an indefinite planning exercise.
- The Astro rebuild was not completely abandoned: new ideas led to a new branch. Its earlier approved plan is historical input and reusable work, not a binding specification for this version.

### Proposed First Version

### Accepted Scope and Live Board Reconciliation

Read the personal-site project's current and settled issues and their comments, plus referenced BJS-262, BJS-105, and BJS-106. Live board review found:

- [BJS-39](https://linear.app/bjs-projects/issue/BJS-39) records Burooj's September 10 acceptance of Projects (optional case studies), Writing (notes/essays, allowed empty at launch), Lab (experiments/one-offs), and About/Now. The accepted minimum is About/Now plus at least three short project stories and one default lens.
- [BJS-42](https://linear.app/bjs-projects/issue/BJS-42) routes first-release shaping and implementation to this thread. Its earlier PHP-only constraint was explicitly withdrawn; existing Astro work remains an input to implementation judgment.
- Burooj subsequently accepted this thread's three recommendations: select representative projects mixing substantial and smaller distinctive work; focus updates on building, writing, experiments and occasional learning; launch with real content and manually seeded updates before automation.
- These content collections do not prescribe four top-level navigation items or four separate launch pages. The homepage composition remains the presentation question.
- [BJS-262](https://linear.app/bjs-projects/issue/BJS-262) adds job-readiness context, meaningful title/meta, and project candidates Conduit, Flo8 (when live), and chat-scrobbler. GitHub pinning is a later external action, not authorized by this read-only review.
- [BJS-300](https://linear.app/bjs-projects/issue/BJS-300) contains an unresolved historical public HTTP/3-access report. Reverify at release time; do not infer current failure from the old issue.

No board state or comments were changed during this review. The historical draft below is not the current approval record.

### Homepage Composition

A homepage with four content groups:

1. **Introduction:** portrait, short description of Burooj, and direct contact/profile links.
2. **Selected work:** a small selection of substantial projects, linking to existing detail or case-study material.
3. **Currently:** a short account of ongoing interests and work, including bjslab where relevant.
4. **Recent updates:** dated, linked notes about things made, published, or changed across GitHub and other public surfaces. Small work can appear here without requiring a full case study.

Writing and Resume/CV can be reachable through links for this slice; final navigation labels and separate-page placement remain proposals, not confirmed decisions.

Burooj suggested a dashboard-like composition with updates on the right and portrait/about material alongside it. Treat this as a visual direction to try, not an approved fixed layout. On narrow screens the same content should read in a simple sequence.

### Update Content and Automation

Recommended update fields: date, short factual text, source link, and optional related project. A project is the enduring subject; an update records something that happened to it. Several updates may refer to one project.

For the first version, recommend a few curated entries using the same content structure that agents can update later. This trades immediate automation for a faster useful launch. Agent-maintained updates are part of the desired direction, but source integration and publishing behavior have not yet been decided. Avoid making a raw commit log the default reading experience.

### Immediate Next Work

Select actual existing content for these groups and assemble a first homepage for review. Preserve older content while curating what is featured. Do not reopen the audience question as if unanswered: the earlier hiring-facing introduction remains relevant, broadened here by showing ongoing activity and small work.

### Grilling Exit and First Implementation Slice

Burooj confirmed that the current site's writing can supply rough source language for the introduction and About/Now content. Reuse its themes and phrases where they remain true; do not preserve stale time-relative or novice claims merely because they already exist.

The next phase is implementation under BJS-42. Build one runnable, content-complete homepage preview from the reusable Astro scaffold and migrated content, updating its old homepage framing to match the accepted direction here:

- introduction and direct contact/profile paths;
- at least three short, source-grounded project stories in the main area;
- About/Now content;
- a distinct area with a few manually curated, dated updates;
- access to Lab and Writing, with Writing allowed to be empty;
- one default visual treatment, with prism and update automation deferred.

Completion evidence for this slice is a running preview, fresh build/check results, and desktop/mobile review evidence. The precise layout, initial project selection, and labels are reversible implementation choices and do not require another shaping round before a first reviewable version exists.

## Historical Provisional Draft

The material below preserves the earlier BJS-39 proposal and its unanswered slots. It is not evidence that Burooj accepted those defaults. In particular, its blanket deferral of labs, one-offs, and self-hosted work is superseded above.

### Original Answer Card

Use this to settle the model quickly.

Recommended answer:

- Site job: understand my work.
- Launch nav: Home, Work, Writing, About, Contact.
- Resume/CV: supporting link, not primary nav.
- Public work: professional, freelance, and selected learning projects.
- Case studies: fuller project detail pages, not a separate type yet.
- Notes/current thinking: later.
- Labs/one-offs/self-hosted work: later unless a specific entry is promoted.
- Theme/lens UI: hidden for base launch; keep only a future hook.

Burooj can settle `BJS-39` by answering:

1. Accept the recommended answer, or name what changes.
2. Promote any of labs, one-offs, self-hosted work, or current thinking into base launch.
3. Choose `Work` vs `Projects` as the public nav label.
4. Choose whether Contact is a standalone page, footer/menu surface, or both.

## Boundary

- The base site is the normal portfolio surface.
- The prism is a later outer layer around this same portfolio structure.
- The prism should not add, remove, or rename base content types.
- The base model should be strong enough that `BJS-42` can build a first usable slice without waiting for lens, cube, or reveal decisions.
- The base model should preserve future lens/theming hooks only where they are cheap and natural.

## Existing Repo Shape

The current PHP site is already organized as page data plus ordered module sections.

- Pages use `id`, `title`, `image`, `description`, `heading`, and `sections`.
- Sections choose a module by `module`.
- Project detail pages use project objects from `data/projects-list.json` as first-class page data.
- Current public navigation exposes Home, About, Projects, Writing, and Style Guide.
- Resume content already exists, but is not currently in the public navigation.
- Writing currently comes from the Substack RSS-backed `article-grid` module unless inline articles are provided.
- A primitive `theme` mechanism already exists, but the base content model should not depend on it.

## Draft Base Surfaces

These are the default surfaces unless Burooj decides otherwise.

## Recommended Default

If Burooj wants the smallest coherent launch target, use this:

- Primary job: help a visitor understand Burooj's work and decide whether to keep reading or reach out.
- Launch navigation: Home, Work, Writing, About, Contact.
- Supporting link: Resume/CV.
- Work includes professional, freelance, and selected learning projects.
- Labs, one-offs, self-hosted work, and current thinking wait until they have a clearer public frame.
- Case studies are fuller project detail pages, not a separate type yet.
- Theme/lens support is invisible at base launch; preserve structure for later prism work.

This default keeps the base site normal enough to stand alone and flexible enough for the prism to wrap later.

### Home

Purpose: orient visitors quickly.

Required content:

- One concise positioning line.
- A small set of featured work links.
- A visible path into writing and contact.

Open decision:

- Should the home page read primarily as "hire/work with me", "understand my work", or "enter my world"?

### About

Purpose: explain Burooj as a person and practitioner without turning the site into a biography dump.

Required content:

- Short personal/practice statement.
- Current interests or working stance.
- A few human details that make the site feel inhabited.

Open decision:

- How much of the stranger/worldbuilding voice belongs in base About before prism exists?

### Projects

Purpose: show selected work as proof of taste, craft, and judgment.

Required content:

- Project cards with title, date, role, short description, tools, thumbnail, and links where available.
- Enough taxonomy to distinguish professional, freelance, learning, lab, and one-off work without overbuilding filters.

Open decision:

- Which categories are public at base launch: professional projects only, or also labs, student work, one-offs, and self-hosted work?

### Project Detail

Purpose: let a project carry more evidence than a card can.

Required content:

- Project metadata: role, date, context/client, tools, tags.
- Problem or prompt.
- What Burooj made.
- A small account of decisions/tradeoffs.
- Outcome, current status, or what the project taught.
- Links and media where available.

Open decision:

- Are deeper "case studies" a separate content type, or just fuller project detail pages?

### Writing

Purpose: expose public thinking without requiring the base site to become a full publication system.

Required content:

- External article entries or imported summaries.
- Title, date, link, description, and optional image.
- A way to distinguish polished writing from notes later, if notes become public.

Open decision:

- Should "current thinking" appear in base launch, or wait for a later undertext/wiki layer?

### Resume or CV

Purpose: give a straightforward professional read for visitors who need it.

Required content:

- Work history.
- Education.
- Skills/tools.
- Last-updated signal.

Open decision:

- Should Resume be a first-class public page, a downloadable/supporting link, or omitted from the first base launch?

### Contact

Purpose: give visitors a clear next step.

Required content:

- Preferred contact path.
- Relevant external profiles.
- Optional availability/status note.

Open decision:

- Should Contact be a standalone page or a persistent footer/menu surface?

## Candidate Surfaces Held For Later

These may matter, but they should not be mandatory for the first base launch unless Burooj explicitly promotes them.

- Labs
- One-offs
- Current thinking
- Self-hosted work
- Undertext/wiki
- Prism lenses and reveal mechanics

## Draft Content Objects

### Page

Fields:

- `id`
- `title`
- `description`
- `heading`
- `navLabel`
- `sections`
- `status`

### Section

Fields:

- `module`
- `heading`
- `body`
- `items`
- `media`
- `links`

### Project

Fields:

- `id`
- `title`
- `date`
- `status`
- `role`
- `context`
- `summary`
- `description`
- `tools`
- `tags`
- `links`
- `thumbnail`
- `media`
- `sections`

### Writing Entry

Fields:

- `id`
- `title`
- `date`
- `source`
- `url`
- `summary`
- `image`
- `tags`
- `status`

### Resume Entry

Fields:

- `role`
- `place`
- `dates`
- `summary`
- `duties`
- `skills`

## Draft Launch Definition

The base site is launchable when:

- The public navigation reflects the chosen base surfaces.
- Home gives a clear first read of who Burooj is and what to inspect next.
- Projects includes a curated set of visible projects, with hidden/archive items intentionally excluded.
- Each launch project has enough detail to justify its presence.
- Writing either shows live public writing or intentionally points out that writing is coming later.
- About is current enough to not read like an old student portfolio.
- Resume/CV and Contact decisions are made and represented consistently.
- Style Guide, Garden, E4P, Goals, and other dev/archive pages are either intentionally public or removed from primary navigation.
- Prism/lens work remains out of scope except for preserving the base structure it will later wrap.

## BJS-42 Handoff

If Burooj accepts the recommended default, `BJS-42` can build the first base slice with these assumptions:

- Use the normal portfolio as the first screen; do not include prism reveal, lure, face travel, or lens navigation.
- Treat `Work` as the public label for projects unless Burooj prefers `Projects`.
- Build around a small set of content types: Page, Project, Writing Entry, Resume Entry, and Contact Link.
- Keep project details flexible enough to become case studies without introducing a second case-study collection yet.
- Keep style-guide/dev/archive pages out of primary navigation unless Burooj explicitly wants one public.
- Preserve a future theme/lens boundary in naming and structure, but do not expose theme controls at launch.
- Treat any labs, one-offs, self-hosted work, and undertext/wiki material as later taxonomy unless Burooj promotes specific entries.

This handoff is provisional until the decision slots below are confirmed.

## Decision Slots

Fill these before treating `BJS-39` as settled.

### Site Job

Options:

- Understand my work.
- Hire/work with me.
- Enter my world.

Decision:

- TBD

Recommended provisional decision:

- Understand my work.

Confirmed by Burooj:

- TBD

### Launch Navigation

Recommended:

- Home
- Work
- Writing
- About
- Contact

Decision:

- TBD

Recommended provisional decision:

- Home
- Work
- Writing
- About
- Contact

Confirmed by Burooj:

- TBD

### Resume/CV

Options:

- First-class navigation page.
- Supporting link from About/Contact/footer.
- Omit from first launch.

Decision:

- TBD

Recommended provisional decision:

- Supporting link from About/Contact/footer.

Confirmed by Burooj:

- TBD

### Public Work Categories

Options:

- Professional and freelance only.
- Professional, freelance, and selected learning projects.
- Include labs, one-offs, and self-hosted work now.

Decision:

- TBD

Recommended provisional decision:

- Professional, freelance, and selected learning projects.

Confirmed by Burooj:

- TBD

### Case Studies

Options:

- Fuller project detail pages.
- Separate case-study type.
- Later.

Decision:

- TBD

Recommended provisional decision:

- Fuller project detail pages.

Confirmed by Burooj:

- TBD

### Writing And Notes

Options:

- Public writing only.
- Public writing plus current thinking.
- Writing later.

Decision:

- TBD

Recommended provisional decision:

- Public writing only.

Confirmed by Burooj:

- TBD

### Theme/Lens Visibility

Options:

- Invisible hook only.
- Simple visible theme switcher.
- No theme work in base launch.

Decision:

- TBD

Recommended provisional decision:

- Invisible hook only.

Confirmed by Burooj:

- TBD

## Questions For Burooj

1. Is the recommended default basically right, or is the base site's primary job different?
2. Which of labs, one-offs, current thinking, or self-hosted work feels public now rather than later?
3. Should Resume/CV be a nav item, a supporting link, or absent from first launch?
4. Should Contact be a standalone page, persistent footer/menu surface, or both?
5. Should the base site expose themes at all before prism work resumes?
