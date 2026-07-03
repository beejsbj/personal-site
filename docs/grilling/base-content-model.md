# Base Content Model

Status: draft for `BJS-39`.

`BJS-39` defines the base personal-site content model and launch finish line before the prism/theming work resumes.

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

## Questions For Burooj

1. Is the base site primarily for "hire/work with me", "understand my work", or "enter my world"?
2. Which surfaces are mandatory for first base launch?
3. Should labs, one-offs, current thinking, or self-hosted work be public in the base site?
4. Should case studies be a separate type, or just deeper project pages?
5. Should Resume be public navigation, supporting link, or omitted?
6. Should Contact be a page, footer/menu surface, or both?
7. Should the base site visibly expose themes, or only preserve a future lens hook?
