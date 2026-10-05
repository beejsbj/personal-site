# Lens map

> **Superseded wiring (drift-proofing pass).** Sections 0, 3 and 5 describe how lenses got content *before* the content API: scraping `route.main` and hard-coding copy. Today every lens reads only `/prism/content.json` (all copy, rendered bodies, the structured resume, shared order and featured set, derived values, and each lens's flavour copy from `src/content/lenses/<id>.json`); `route.main` is read only through `fallbackBody(route)` for `other` routes. Section 6 has the new contract and its guards. The per-part map (sections 1, 2, 4) still describes what each lens shows, and `src/prism/parity.ts` (`GAPS`) is now the live record of what a lens leaves out.

How each piece of portfolio content appears in each of the five lenses, where each lens gets it from, and where a lens has drifted from Daylight.

**Snapshot.** Read against branch `prism/lenses-and-lure`, HEAD `65c1c09`, with the Calling Card working tree dirty (uncommitted edits in `chrome.ts`, `home.ts`, `panels.ts` and CSS). Line numbers are anchors, not contracts: Calling Card and Hion are being edited as this is written, so grep the quoted string when a line has moved. The Hion column is **provisional (mid-redesign)**: Hion was redesigned to two independent dancing threads (`dance.ts`, `loom.ts`, `pastel.ts`, `weave.ts`, `screens.ts`) and a micro-animation pass is still editing it. Hion's content wiring (`screens.ts`, `nav.ts`) changed little in that redesign, but treat every Hion cell and line number as a snapshot.

**Path shorthand.** `CC` = `src/prism/shells/calling-card/`, `CP` = `src/prism/shells/cut-paper/`, `BP` = `src/prism/shells/back-page/`, `HI` = `src/prism/shells/hion/`. Daylight paths are given from `src/`. `ch` = `BP/chapters.ts`, `S` = `CP/screens.ts` or `HI/screens.ts` (stated where it is used).

**Conventions.** `— MISSING` means Daylight shows the part and this lens does not (drift). `— n/a` means Daylight does not show it either. `(+)` marks something the lens adds that Daylight does not have.

## 0. How content reaches a lens

There are three channels, and the third is the problem.

1. **`/prism/content.json`** (`pages/prism/content.json.ts`, typed in `prism/shells/types.ts`). A projection of the collections: `site` (whole `site/config.json`), `pages.{home,about,resume}` (frontmatter plus raw markdown `body`), `projects[]` (visible only, sorted year desc then `order`; gains `slug`, `href`), `lab[]` (visible only, sorted by `order`; gains `slug`, `detail`), `updates[]` (expiry-filtered, newest first, no cap).
2. **`route.main`.** A clone of Daylight's rendered `<main>`. It is the only way a lens receives Daylight's rendered markdown (project, lab-entry, about and resume prose) and Daylight's page-header copy.
3. **Copy that exists only in Daylight's `.astro` files.** Page-header eyebrows/titles/intros, the home hero lines, "Currently", the updates-stream intro/caption/empty text, the "Elsewhere" blurbs, the footer, the 404 text, and the update-kind and update-source label maps are **not** in `src/content/` and **not** in `content.json`. A lens gets them only if it queries them out of `route.main` (selectors in section 3), or copies the string into its own code (section 3, hard-coded strings). Footer markup lives outside `<main>`, so no lens can query it.

Two Daylight facts that make the rest harder to read:

- **Daylight does not render `pages.home`'s own copy.** `WelcomeHero.astro` hard-codes "Hey there!", "Burooj here!", "Frontend developer & designer" and "I make places on the web. Feel free to look around!". `home.md`'s `headline`, `eyebrow` ("Frontend Developer"), `intro` ("I'm a frontend developer, and I make places on the web.") and body ("Welcome to my home on the internet...") are used only for `<title>`/description. Lenses that read `pages.home.*` (Calling Card, Back Page, and as fallbacks Cut Paper) therefore show text Daylight never shows.
- **The Lab entry route is dormant.** `lab/[slug].astro` builds pages only for entries that are not hidden and have no `href`. Today both visible lab entries have an `href` (CodePen) and the other two are `hidden`, so zero `/lab/<slug>` pages exist. Every lab-entry code path in every lens is currently untestable against real content.

## 1. Content parts inventory

"In JSON" says whether `content.json` carries the part. "Daylight-only" means the string is hard-coded in a Daylight `.astro` file.

### Global parts

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| G1 | Site nav | `site/config.json` `nav[]`. `components/SiteNav.astro` keeps only Projects, Lab, About, Writing and adds hard-coded "Home" and "Say hello" (mailto of `site.email`); Resume is not in the nav. Home mark "burooj." is hard-coded in `SiteHeader.astro:13` | `site.nav` (unused by every lens) |
| G2 | Footer / contact | `components/SiteFooter.astro`: name "Burooj Rashid", `site.email`, "Resume", "Style guide", "Thanks for stopping by." (all but the email hard-coded). Outside `<main>`, so never in `route.main` | email only |
| G3 | Social links | `site/config.json` `social[]` (GitHub, LinkedIn, CodePen, Email). Daylight home shows GitHub, LinkedIn, Email plus a hard-coded Resume (`design/compositions/WelcomeHero.astro:26-35`). `pages/resume.astro:26-31` hard-codes the same email/LinkedIn/GitHub again | `site.social` |
| G4 | Writing URL | `site.writingUrl` | `site.writingUrl` |
| G5 | Updates (global feed) | `updates` collection; see H9 | `updates[]` |
| G6 | Document title/description | `site.siteTitle`, `siteDescription`, per-page frontmatter; `layouts/BaseLayout.astro` | `site` spread (types omit it); `pages.*.title/description` |

### Home (`pages/index.astro`, `components/Homepage.astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| H1 | Greeting "Hey there!" | Daylight-only, `WelcomeHero.astro:17` | no |
| H2 | Headline "Burooj here!" | Daylight-only, `WelcomeHero.astro:20`. Same words in `home.md` `headline` (not rendered) | `pages.home.headline` |
| H3 | Occupation "Frontend developer & designer" | Daylight-only, `WelcomeHero.astro:23`. `home.md` `eyebrow` says "Frontend Developer" (differs, not rendered) | `pages.home.eyebrow` (different string) |
| H4 | Welcome line | Daylight-only, `WelcomeHero.astro:24`. `home.md` `intro` is a different sentence | `pages.home.intro` (different string) |
| H5 | Home body copy | `home.md` markdown body. **Not rendered by Daylight** | `pages.home.body` |
| H6 | Portrait + "That's me" -> /about | Daylight-only, `design/unique/Portrait.astro` (`/images/burooj4.jpg`, alt "Burooj Rashid wearing round sunglasses") | no |
| H7 | Hero socials + Resume | `site.social` filtered to GitHub/LinkedIn/Email, plus hard-coded Resume | `site.social` |
| H8 | Featured projects | Heading "Some things I've built" and link "All projects" are Daylight-only (`Homepage.astro:28-33`). Entries: `projects` where `featured && !hidden`, sorted by `order` only, first 3. Row: `cover`, `dateLabel · role`, `title`, `summary`, first 3 `tools` (`ProjectRow.astro`) | `projects[]` (JSON sorts year desc, so a different set/order) |
| H9 | Updates stream | Heading "Recent updates", `.stream-intro` "Little signals from around my internet.", `.stream-caption`, `.stream-empty` are Daylight-only (`ActivityStream.astro`). Entries: `updates` (`kind`, `source`, `title`, `href`, `date`, `dateLabel`; `summary` is not shown on home). Kind label map ("Project", "Pull request", "Experiment", "Made", ...) and source map ("This site", "GitHub", "A note", ...) are Daylight-only (`UpdateEntry.astro:18-56`). Capped at 8 | `updates[]` (all fields, uncapped) |
| H10 | "Currently" note | Daylight-only, `design/compounds/CurrentNote.astro` ("I'm maintaining bjslab, my home-lab environment...", link "More about me") | no |
| H11 | "Elsewhere" blurbs | Daylight-only, `Homepage.astro:48-65` ("In the lab" / "Experiments, prototypes, and smaller things."; "Writing" / "My notes and writing on Substack.") | no |

### Projects index (`pages/projects/index.astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| PI1 | Page header: eyebrow "Projects", title "Things I've made, along the way.", intro | Daylight-only | no |
| PI2 | Year headings | derived from `projects[].year` (`ProjectTimeline.astro`) | `year` |
| PI3 | Project entry: `dateLabel / kind`, title link, `summary`, first 3 `tools`, `cover` | `projects` collection | `projects[]` |

### Project detail (`pages/projects/[slug].astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| PD1 | Eyebrow (`kind`), title, intro (`summary`) | `projects` frontmatter | `kind`, `title`, `summary` |
| PD2 | Role / Where / When (labels hard-coded) | `role`, `location`, `dateLabel` | yes |
| PD3 | Links | `links[]` (`label`, `url`) | `links` |
| PD4 | Tools | `tools[]`, label "<title> tools" | `tools` |
| PD5 | Media rail (image/video, alt, caption) | `media[]` | `media` (no width/height in types) |
| PD6 | Prose body | markdown body of the project file | **no** (route.main `.prose` only) |
| PD7 | "Back to all projects" | Daylight-only | no |
| PD8 | Not rendered by Daylight on the page | `cover` (og:image only), `status`, `tags`, `featured`, `year`, `order` | yes |

### Lab index (`pages/lab/index.astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| LI1 | Page header: eyebrow "Lab", title "Small things. Room to play.", intro | Daylight-only | no |
| LI2 | Lab card: `type · sourceEra`, title link (`href \|\| /lab/slug`), `summary`, `cover` | `lab` collection | `lab[]` (`detail` = link target) |
| LI3 | "More sketches on CodePen" | Daylight-only (`lab/index.astro:41-45`) | no |
| LI4 | Aside "Looking for the bigger pieces?..." with Projects + Style Guide links | Daylight-only (`:46-50`) | no |

### Lab entry (`pages/lab/[slug].astro`, dormant, see section 0)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| LE1 | Eyebrow "Lab" (hard-coded), title, `summary` | `lab` frontmatter | yes |
| LE2 | Type / Era | `type`, `sourceEra` | yes |
| LE3 | Links | `links[]` | yes |
| LE4 | Media rail | `media[]` | **no** (not in JSON at all; types omit it) |
| LE5 | Prose body | markdown body | no |
| LE6 | `cover` | not rendered on the entry page | `cover` |

### About (`pages/about.astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| AB1 | Header: eyebrow "About", title "Burooj, again!", intro "Frontend developer. Curious about people, stories, and the places we make on the web.", action "Experience & resume" -> /resume | Daylight-only | no |
| AB2 | Prose (sections "People, stories, interfaces", "Still exploring", contact links) | `pages/about.md` body | `pages.about.body` (raw markdown) |

### Resume (`pages/resume.astro`)

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| RS1 | Header: eyebrow "Resume", title "Burooj Rashid", intro "Frontend developer · web design & development" | Daylight-only | no |
| RS2 | Contact actions: email, LinkedIn, GitHub | Daylight-only, duplicating `site.email`/`site.social` | no (partly in `site`) |
| RS3 | Experience / Education / Tools / See the work (h2 > h3 entries, `<em>` dates, bullets) | `pages/resume.md` body | `pages.resume.body` (raw markdown) |

### Other

| ID | Part | Source of truth | In JSON |
|---|---|---|---|
| OT1 | 404: "404", "That page wandered off.", "Try the homepage, or follow one of the links above.", "Return home" | Daylight-only (`pages/404.astro`) | no |
| OT2 | `/style-guide` (design reference, not portfolio content) | `pages/style-guide.astro` | no |
| OT3 | `/e4p`, `/garden`, `/design-system` | redirects, no page | n/a |

## 2. The map

Each cell: how the lens presents the part, then `file:function`. Hion cells are provisional. A part Daylight does not render but a lens shows is marked `(+)`.

### 2.1 Global parts

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| G1 Site nav | Header link row: Home, Projects, Lab, About, Writing↗, Say hello↗; `SiteNav.astro` | Home: seven tilted "commands" (Projects, Lab, About, Status, Phone, Writing, Calling Card), hard-coded, `CC/home.ts:commandsFor`. Inner screens: L1/R1 tab strip Projects/Lab/About/Status, `CC/chrome.ts:tabs`. Writing absent from tabs; Resume renamed Status | Seven keys of F major in the browser (desktop: a column; phones: a bottom row): Home, Projects, Lab, About, Resume, Writing, Hello. Labels and view names are lens copy (`keys`); Writing is `site.writingUrl`, Hello `mailto:site.email`. Each key plays its scale degree on hover when sound is on, `CP/frame.ts:keysFor` | Five exercise-book tabs Hello/About/Resume/Lab/Projects, hard-coded, `BP/index.ts:renderTabs` (`TABS`); Writing only in home contents slip. No Home/Say hello tab | Charms hung from the cord: home charm (`site.name`) plus each `site.nav` item (Resume included), `HI/nav.ts:createNav`; hard-coded "Menu" pull. The only lens that reads `site.nav` |
| G2 Footer | Name, email, Resume, Style guide, "Thanks for stopping by." | — MISSING (no footer; email only inside the calling-card panel, `CC/panels.ts:cardPanel`) | — MISSING (no footer; email is the Hello key's href) | — MISSING (email only on the home cover/inside cover, `ch:returnTo`) | Partial: "Send a line my way" + email link + social drops + Writing, `HI/screens.ts:footer`. No name, Resume, Style guide or "Thanks for stopping by." |
| G3 Social links | GitHub/LinkedIn/Email + Resume on home hero | In the Calling Card panel only (mailto filtered, plus a hard-coded Writing row), `CC/panels.ts:cardPanel` | Home set-info chips: all `site.social` plus hero links not among them (Resume), `CP/views.ts:home` | Home cover/inside cover joined with " · ", mailto filtered, `ch:returnTo` | Home hero tag drops (minus CodePen, plus hard-coded Resume) and footer drops, `HI/screens.ts:home`, `footer` |
| G4 Writing link | Nav item + home "Writing" blurb | Command + panel row (`site.writingUrl`) | "Writing" key | Contents slip entry "Writing (Substack)" | Footer drop + home fork + nav charm |
| G5 Updates feed | Home stream only | Phone panel (full list), home phone chip + calendar widget (latest), `CC/panels.ts:phonePanel`, `CC/home.ts:home` | Markers track on every arrangement (a flag and a bell per update), the overview strip, the home locators, the phone tape's marker rows | Home diary only | Home stream only |

### 2.2 Home

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| H1 Greeting | `.greeting` paragraph, `WelcomeHero.astro` | — MISSING (home never reads `route.main`) | Torn tag above the headline, `pages.home.hero.greeting`, `CP/views.ts:home` | Hand-lettered page head; from `.greeting`, fallback, `ch:home` | Hard-coded "Hey there!" reveal line, `HI/screens.ts:home` |
| H2 Headline | h1 "Burooj here!" | Giant ransom-lettered h1 from `pages.home.headline`, `CC/home.ts:home` | Set-info h1, `hero.headline` | h1 from `pages.home.headline`, first word blue and rest red, `ch:home` | `pages.home.headline` split into word signs on the threads, orbited by one thread, `HI/screens.ts:home` |
| H3 Occupation | "Frontend developer & designer" | `pages.home.eyebrow` ("Frontend Developer") as a plate: different string, `CC/home.ts:home` | `hero.occupation` under the headline | Typed line from `.occupation`, `ch:home` | Hard-coded copy of Daylight's string, `HI/screens.ts:home` |
| H4 Welcome line | "I make places on the web. Feel free to look around!" | `pages.home.intro` plate: a different sentence | `hero.welcome` | `pages.home.intro` lead paragraph: a different sentence, `ch:home` | Hard-coded copy of Daylight's string |
| H5 Home body copy (Daylight does not show) | — n/a | (+) Speech bubble "Burooj": first paragraph of `pages.home.body`, markdown stripped, second paragraph dropped, `CC/home.ts:home` | — | (+) Full `pages.home.body` rendered under the lead, `ch:home` | — |
| H6 Portrait | Peach circle photo + "That's me" -> /about | Posterised red/black cut-out, hard-coded path, `CC/portrait.ts`, `CC/home.ts:home` | Polaroid `hero.portrait` (src, alt, caption linking to `href`) | Taped photo, from `.hello img`, caption "that's me →", `ch:home` | Photo hung on two threads, hard-coded path/alt, caption "That's me", `HI/screens.ts:home` |
| H7 Hero socials | 3 links + Resume | — MISSING on home (see G3) | Chips (all of `site.social` + Resume) | — MISSING near the hero (cover/inside cover instead) | Tag drops minus CodePen + Resume |
| H8 Featured projects | "Some things I've built": feature + 2 rows, cover/meta/title/summary/3 tools; "All projects" link | — MISSING. Only a "★ NN Works + NN Lab" odometer from array lengths; projects live behind the Projects command, `CC/home.ts:home` | Every project is a track on the session arrangement (desktop) or a card on the tape (phones), so the featured set is there among them; no separate shelf. `work.link` is the "All projects" button with `derived.counts.projects` | "Some things I've built" taped cover snaps (cover, title, `dateLabel`; no summary or tools) + "all of them, on the back page →", `ch:home` | `featured.slice(0,4)` as hanging charms: cover, `dateLabel · kind`, title, full summary, all tools; pull-cord "Follow the line to every project", `HI/screens.ts:workCharm` |
| H9 Updates stream | Heading, intro, up to 8 entries (kind/source labels, title link, `dateLabel`), caption, empty state | Phone chip (latest title, count) + calendar from latest date + full chat-bubble list in panel; no intro/caption/empty copy; invented "New message"/"Daytime", `CC/home.ts:home`, `CC/panels.ts:phonePanel` | Locators: `updates.title`, `intro`, up to `limit` rows (date button that moves the playhead and rings the bell, title link, `kindLabel · sourceLabel`), `caption`, `empty` when none. Phones show every update as a marker row on the tape instead | Diary list: date, linked title, summary, "source · kind", tally marks; all updates; hard-coded heading + subtitle, `ch:home` | Tie rows, `slice(0,6)`: raw `source · kind · dateLabel` + title link; heading + intro hard-coded; no summary/caption/empty, `HI/screens.ts:home` |
| H10 Currently note | bjslab paragraph + "More about me" | — MISSING | Taped bone note: `currently.title`, inline `body`, `link` | Aside "Currently: " + the `<p>`'s children; "More about me" link dropped, `ch:home` | Heading + first `<p>` of `.current-copy` (fallback `pages.home.intro`), hard-coded "More about me" pull-cord, `HI/screens.ts:home` |
| H11 Elsewhere blurbs | "In the lab" / "Writing" with one-line blurbs | — MISSING (command help lines paraphrase them) | — MISSING (Lab and Writing are keys; declared in `GAPS`) | — MISSING | Two hanging forks, copy hard-coded, `HI/screens.ts:home` |

### 2.3 Projects index

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| PI1 Header | Eyebrow "Projects", h1 "Things I've made, along the way.", intro | Constant title "Projects", invented eyebrow "Equip", Daylight h1 as subtitle, intro from `.page-header__intro`, `CC/projects.ts:projects` | `pageHead` from `pages.projects.header` (eyebrow, title, intro), `CP/bits.ts:pageHead` | h1 + intro from `route.main`; eyebrow replaced by invented "Projects · the back page", `ch:projects` | `pageHead` from `route.main` (fallbacks hard-coded), `HI/screens.ts:projects` |
| PI2 Year headings | h2 per year | — MISSING (per-slot year only) | Ruler: a bar per year with month ticks (desktop); a bar line per year on the tape (phones). Range from the first dated clip to the session's end, so a new year always fits | Year mark in margin of war map and roll call; no headings | Year loops with h2 year, circled in turn, `HI/screens.ts:projects` |
| PI3 Project entry | Row: meta `dateLabel / kind`, title link, summary, 3 tools, cover | Equipment slot: year, ★, kindLabel ("Selected/Project/Arcade"), title; summary and cover only in the selected-slot detail panel (all tools, Role, Where), `CC/projects.ts:slots`, `detailPanel` | Track: number, title link, `dateLabel · kind · voice`, summary, first 3 tools, hear / mute / solo; its clip sits at `dateLabel` and draws the motif it plays, `CP/arrangement.ts:arrangement`. Phones: a tape card (cover, title, meta, summary, tools, ▶), `CP/tape.ts`. Cover only on the tape | "Roll call" row (year, title, `dateLabel`, "· arcade") + war map camp of dots per project; no summary/cover/tools, `ch:projects`, `ch:warMap` | `workCharm` per project: cover, `dateLabel · kind` (Daylight: role), title, full summary, all tools, `HI/screens.ts:workCharm` |

### 2.4 Project detail

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| PD1 Eyebrow/title/summary | Eyebrow `kind`, h1, intro | Category line "kindLabel ★ dateLabel", ransom h1, summary, `CC/projects.ts:projectEntry` | Kicker "Clip · Track NN of NN · kind", h1, lede, `CP/views.ts:project` | Eyebrow "`kind` · from the archive / selected work" (invented), h1, lead, `ch:project` | Eyebrow `kind · year`; title/intro from main h1, `HI/screens.ts:project` |
| PD2 Role/Where/When | Three labelled blocks | "Item file" stat rows, hard-coded labels | Clip properties `<dl>`: content labels for Role/Where/When, plus lens rows Voice and Over (the chords under the clip) | `<dl>` fields, labels hard-coded | Meta tags read generically from `.entry-page__meta`, `HI/screens.ts:tagsRow` |
| PD3 Links | Action buttons (new tab) | "Shop cards" with invented verbs "Open"/"Get" | Buttons; first lit | Arrow list | Pull-cords |
| PD4 Tools | Passive tag list | Chips (all) | Chips (all) | Circled list | Beads, aria-label "Tools" (not "<title> tools") |
| PD5 Media | Rail of figures (img/video, captions) | Lead = `media[0]` (or `cover` if none), rest in a rail; captions kept, video ok | Inserts below the clip notes; `media[0]` dropped when it is the cover; captions kept, video ok | Taped figures; caption = `caption ?? alt` (alt leaks as caption); video ok | Hung pictures with captions, **videos break** (reads `figure img` only: empty-src image), cover fallback, `HI/screens.ts:gallery` |
| PD6 Prose body | `.prose` | `.prose` cloned as notes | "Clip notes" (rendered `html`) | Moved into paginated blocks, classes stripped | Story loop; h2 wefts, external links re-targeted |
| PD7 Back link | "Back to all projects" | "Back" (sr-only " to Projects") | `detail.back` ("Back to all projects") | "← back to the war (all projects)" | "Back to / Every project" end tassel (+ Newer/Older) |
| PD8 Cover, status, tags, year | Not shown on the page | Cover as media fallback; status/tags — n/a | Cover framed above the title (+); status and tags — n/a | Kind/year/status drive eyebrow and camp colour; year not printed | Year in eyebrow (+); cover as gallery fallback |
| Invented | — | Prev/Next pager | The clip editor: the arrangement zoomed to a year around the clip (chords, bass, the motif as a piano roll with pitch names, markers) and "Play the clip" (plays that region); prev/next track | Own camp corner SVG | Newer/Older along the line |

### 2.5 Lab index

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| LI1 Header | Eyebrow "Lab", h1, intro | Constant "Lab", eyebrow "Requests", subtitle = Daylight h1, intro in a "The Lab" dialogue box, `CC/lab.ts:lab` | `pageHead` from `pages.lab.header` | h1/intro from main; eyebrow replaced by "Lab · in the margins" | `pageHead` from main |
| LI2 Entry | Card: cover, `type · sourceEra`, title link, summary | Request card: No.NN, constant "Open" stamp, "Client" (=`sourceEra`) and "Type", title, summary, "Accept" prompt; cover — MISSING, `CC/lab.ts:lab` | Rack slot: a pad (button) that plays the sketch's motif, `type · sourceEra`, title link to `detail`, summary; cover — MISSING (none in content), `CP/views.ts:lab` | Article with doodle, h2, summary, `type · sourceEra`; cover — MISSING, `ch:lab`, `ch:labCard` | Hanging charm: `type · sourceEra`, title, summary; cover — MISSING, `HI/screens.ts:lab` |
| LI3 "More sketches on CodePen" | Link | — MISSING | `pages.lab.more` button | — MISSING | Hard-coded pull-cord + URL |
| LI4 Aside | Paragraph with Projects + Style Guide links | — MISSING | `pages.lab.aside` (inline markdown) | — MISSING | Cloned from `.lab-aside`, links kept |

### 2.6 Lab entry (dormant route)

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| LE1 Eyebrow/title/summary | "Lab", h1, intro | "Request No.NN" + "Open" stamp, title, summary, `CC/lab.ts:labEntry` | Kicker "Rack" + `detail.eyebrow` link, h1, lede, `CP/views.ts:labEntry` | Hard-coded "Lab", title/summary from main, `ch:labEntry` | Hard-coded "Lab", title/intro from main, `HI/screens.ts:labEntry` |
| LE2 Type/Era | Labelled blocks | "Type" and "Client" (renamed) | `<dl>` with `detail.labels` | `<dl>` Type/Era | Tags Type/Era |
| LE3 Links | Action buttons | Shop cards "Accept"/"Get" (+ dead "Open the experiment") | Buttons; `href` first as lens copy "Open the sketch" | Arrow list (+ synthesised "Try it on {sourceEra}") | Pull-cords (+ dead "Open the live experiment") |
| LE4 Media | Rail | — MISSING | — MISSING (not in content.json) | — MISSING | Gallery from `.media-rail figure` (shown) |
| LE5 Prose | `.prose` | Cloned | Rendered `html` | Moved | Story loop |
| LE6 Cover | Not shown | (+) Shown (`entry.cover`, empty alt) | — n/a (the big pad stands in) | — n/a | — n/a |
| Back link | none | "Back" | "Back to the rack" (+) | via book nav | "Back to / The whole lab" (+) |

### 2.7 About

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| AB1 Header | Eyebrow "About", h1 "Burooj, again!", intro, action "Experience & resume" | h1 + intro from main; eyebrow replaced by invented "Confidant · The Fool · Arcana 0"; action as "Next" card, `CC/about.ts:about` | Kicker "Set notes" + eyebrow, h1, intro, actions as buttons, `CP/views.ts:about` | h1 + intro from main, no eyebrow; first action becomes P.S. link (lowercased), `ch:about` | `pageHead` from main; first action as pull-cord, `HI/screens.ts:about` |
| AB2 Prose | Sections | Each block cloned into a "Burooj" dialogue; h2-h6 flattened into "Rank N" plates | Rendered `pages.about.html` | `.prose` moved into letter pages | `.prose` clone |
| Invented | none | Arcana card, "Confidant rank MAX" pips, "Social stats" pentagon, bust portrait | Portrait from `hero.portrait`, torn scraps | "Dear reader," / "Yours, Burooj" letter frame | Portrait (hard-coded) |

### 2.8 Resume

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| RS1 Header | Eyebrow "Resume", h1 "Burooj Rashid", intro | "Status" screen: h1 + intro from main; eyebrow dropped, `CC/resume.ts:resume` | `pageHead` from `pages.resume.header`, `CP/views.ts:resume` | Typed contact line: title + intro, `ch:resume` | `pageHead` from main |
| RS2 Contact actions | Email, LinkedIn, GitHub | All, as a "Contact" list | All, as chips | All, joined with " · " | **Only the first (email)**, as a pull-cord; LinkedIn and GitHub — MISSING |
| RS3 Experience | h2 + h3 role entries, dates, bullets | "Party member" rows (role/org split on " · ", `<em>` date, "Leader" tag on the first), `CC/resume.ts:row` | The Roles track drawn out: one row per `experience.roles` entry (title · org, `dateLine`, summary, bullets) with its clip spanning `start`–`end` on the ruler; undated entries say so | Prose moved onto typed paper | Prose; h2 strung, h3 knotted |
| RS3 Education | h2 + entries | Same rows, tag "Study" | Same rows for `education.entries` (they are on the Roles track too) | same | same |
| RS3 Tools | Paragraph | ★ chips (flattened, split on commas / "and") | Chips of `tools.items` | same | same |
| RS3 See the work | Paragraph + links | Dialogue box "Burooj" | Rendered `pages.resume.html` | same | same |

### 2.9 Other (404, style guide)

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| OT1 404 text | "404 / That page wandered off. / ... / Return home" | Whole `route.main` moved onto a "Mementos / Document" sheet, `CC/other.ts:other` (full fidelity) | `fallbackBody` on a bone sheet in a "Text view" (full fidelity) | "Loose sheet" tucked into the book, `ch:loose` (full fidelity) | **Rewritten**: eyebrow "A loose end", new intro, "Follow the threads home" replacing "Return home", `HI/screens.ts:other` |
| OT2 Style guide | Page | Same fallback | Same | Same | Same fallback (no 404 rewrite) |

## 3. Coupling inventory (for drift guards)

For each shell: content.json reads, `route.main` selectors, and hard-coded strings. Daylight classes referenced by no lens are listed at the end of 3.5.

### 3.1 Calling Card (`CC`)

**content.json reads**

| Field | Where |
|---|---|
| `site.name` | `home.ts:169,181`, `panels.ts:88,138` |
| `site.email` | `panels.ts` (`cardPanel`, rendered via `ransom`) |
| `site.writingUrl` | `home.ts` (`commandsFor`), `panels.ts` (`cardPanel`) |
| `site.social[].label/href` | `panels.ts` (`cardPanel`; mailto filtered by `startsWith("mailto:")`) |
| `pages.home.headline`, `.eyebrow`, `.intro`, `.body` | `home.ts` (`home`; body: first paragraph only via `stripped`) |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, role, location, tools, featured (only picks the "Selected" label), cover, links[], media[] (type/src/alt/caption) | `projects.ts` (`detailPanel`, `slots`, `projectEntry`) |
| `projects.length`, `lab.length` | `home.ts` (odometer) |
| `lab[]`: slug, detail, href, title, summary, type, sourceEra, cover (entry only), links[] | `lab.ts` |
| `updates[]`: date, dateLabel, title, summary, href, linkLabel, kind, source; `.length` | `home.ts` (`dateWidget`), `panels.ts` (`phonePanel`) |

Never read: `site.nav`, `site.siteTitle/siteDescription`, `pages.about.*`, `pages.resume.*`, `pages.*.title/description/availability`, `projects[].status/tags/order`, `lab[].media/order`, `updates[].relatedProject/evidence/expiresAt`.

**route.main selectors**

| Selector | Where | Daylight markup depended on |
|---|---|---|
| `.page-header__intro` | `projects.ts:69`, `lab.ts:34`, `about.ts:47`, `resume.ts:71` | `PageHeader.astro` |
| `h1` | `projects.ts:70`, `lab.ts:33`, `about.ts:46`, `resume.ts:70`, `other.ts` | page h1 |
| `.prose` (children cloned) | `projects.ts:177`, `lab.ts:115`, `about.ts:61`, `resume.ts:76` | `<article class="prose">`; tag walk `^H[2-6]$` (about), `H2`/`H3` then `P > EM` as date (resume) |
| `.page-header__actions a` | `about.ts:48`, `resume.ts:72` | `PageHeader` actions slot |
| `route.main.childNodes` | `other.ts:17` | whole main |

Home does not query `route.main`. Resume depends on the resume.md shape: H2 titles matched by keyword (`experience`, `education`, `tool`), H3 text split on " · ", a leading `<p><em>` date.

**Hard-coded strings** (file:line; needle checked against source)

| file:line | String | Kind |
|---|---|---|
| `CC/home.ts:30` | "Equip · things I've made, along the way" | copies Daylight projects h1 |
| `CC/home.ts:31` | "Requests · small experiments, room to play" | paraphrases lab h1 |
| `CC/home.ts:32` | "Confidant · who's behind the mask" | flavour |
| `CC/home.ts:33` | "Resume · experience, education, tools" | paraphrase |
| `CC/home.ts:40` | "Substack · essays, off-site" | flavour |
| `CC/home.ts:41` | "Contact · send a calling card" | flavour |
| `CC/home.ts:175` | "Frontend Developer" | fallback duplicating `home.md` eyebrow |
| `CC/home.ts:182` | "Command select" | flavour |
| `CC/home.ts:223` | "Burooj Rashid wearing round sunglasses" | duplicates `Portrait.astro` alt (adds "as a red and black cut-out") |
| `CC/home.ts:197` | "New message" | invented; all updates counted "new" |
| `CC/home.ts:85` | "Daytime" | invented |
| `CC/home.ts:86` | "Last update" | invented |
| `CC/home.ts:216` | "Works" | invented odometer label |
| `CC/chrome.ts:35` | "Status" (Resume renamed) | nav label drift |
| `CC/panels.ts:103` | "Take your heart" | flavour |
| `CC/panels.ts:119` | "To whoever has a project in mind," | flavour |
| `CC/panels.ts:124` | "You've been keeping a good idea to yourself..." | paraphrases `about.md` |
| `CC/panels.ts:126` | "Tell me about it." | copies `about.md` closing link |
| `CC/panels.ts:136` | "Writing" | hard-coded row label |
| `CC/panels.ts:138` | "Frontend Developer" | sign-off tagline |
| `CC/panels.ts:76` | "Messages" | invented |
| `CC/about.ts:39` | "The Fool" | invented arcana |
| `CC/about.ts:103` | "Confidant" / "The Fool · Arcana 0" | invented, replaces Daylight eyebrow "About" |
| `CC/about.ts:9` | "People", "Stories", "Interfaces", "Games", "Curiosity" | derived from `about.md` headings (drift risk) |
| `CC/about.ts:91` | "MAX" | invented stat |
| `CC/about.ts:110` | "Social stats" | invented |
| `CC/about.ts:70` | `Rank ${rank}` | derived: index of heading |
| `CC/resume.ts:39` | "Leader" / "Party" | invented tags (first Experience row is "Leader") |
| `CC/resume.ts:51` | "Study" | invented tag |
| `CC/resume.ts:107` | "Status" | invented logo |
| `CC/projects.ts:24` | "Selected" / "Arcade" | derived from `featured`, `kind` |
| `CC/projects.ts:56` | "Role", "Where" (`:205-207` + "When") | duplicates Daylight labels |
| `CC/projects.ts:62` | "Open file" | flavour |
| `CC/projects.ts:71` | "Equip" | invented eyebrow |
| `CC/projects.ts:118` | "Projects, newest first" | paraphrases Daylight aria-label |
| `CC/projects.ts:233` | "More projects" | invented |
| `CC/lab.ts:59` | "Client" (= `sourceEra`) | relabel of "Era" |
| `CC/lab.ts:67` | "Accept" / "read the brief" / "open experiment" | invented verbs |
| `CC/lab.ts:117` | "Open the experiment" | dead path (see section 0) |
| `CC/lab.ts:85` | "Experiments" | flavour |
| `CC/other.ts:29` | "Mementos" | flavour |
| `CC/index.ts:198` | "Skip to content" | duplicates Daylight skip link |

Derived "content": odometer counts (`home.ts` `projects.length`, `lab.length`; Arcade counted as "Works"); calendar widget is the latest update's date, not today (`home.ts:dateWidget`); phone day headers `M/D WKD` from `date` rather than `dateLabel`; `requestNo(i)` is the lab array index (`lab.ts:26`); `ransom()` randomises letter case (`dom.ts`); `stripped()` strips `_`/`*` (`home.ts:106`); wipe title truncated to 28 chars (`index.ts:116`).

### 3.2 Cut Paper (`CP`)

**Rework (`prism/daw-timeline`).** Cut Paper is a DAW session whose heart is the arrangement. It reads only `content.json`: flavour copy comes from `src/content/lenses/cut-paper.json`, and `route.main` is read only through `fallbackBody` for `other` routes. The instrument shell's turntable, crate, presets drawer, fake tabs, poster tag and key hints are gone. So are the knobs, faders, meters, device chain, channel strip and sentence-as-note piano roll of #12.

**Modules.** `music.ts` and `score.ts` are pure (Node-tested in `scripts/tests/cut-paper-music.test.mjs`). `audio.ts` holds the instruments, `transport.ts` the playhead and scheduler, and `frame.ts` the window. `arrangement.ts` is the horizontal timeline, `tape.ts` the phone timeline, and `views.ts` has one view per route. `bits.ts` holds the shared pieces.

**content.json reads**

| Field | Where |
|---|---|
| `site.name`, `site.email`, `site.writingUrl`, `site.social` | `frame.ts` (logo label, keys), `views.ts:home` |
| `pages.home` (hero, work.link, currently, updates copy and `limit`) | `views.ts:home` |
| `pages.projects` (header, listLabel, detail.back, detail.labels) | `views.ts:projects`, `project` |
| `pages.lab` (header, listLabel, more, aside, detail) | `views.ts:lab`, `labEntry` |
| `pages.about` (header, html), `pages.resume` (header, html) | `views.ts:about`, `resume` |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, role, location, tools, cover, links, media, html | `score.ts` (date, kind to voice), `arrangement.ts`, `tape.ts`, `views.ts:project` |
| `lab[]`: slug, detail, href, hasPage, title, summary, type, sourceEra, links, html | `views.ts:lab`, `labEntry`; slug seeds the sketch's motif |
| `updates[]`: id, kind, kindLabel, sourceLabel, title, date, dateLabel, href | `score.ts` (date and kind to a bell), `arrangement.ts:markersLane`, `tape.ts`, `views.ts:home` |
| `resume.experience`, `resume.education` (id, title, org, start, end, current, dateLine, summary, bullets), `resume.tools` | `score.ts` (start/end become the Roles track), `views.ts:resume` |
| `derived.counts.projects` | `views.ts:home` |
| `lenses["cut-paper"]` | everywhere: DAW words, track legends, voice names |

Never read: `site.nav`, `pages.home.elsewhere` (declared gap), `featured` (every project is a track), `projects[].status/tags/order`, `lab[].cover/media`, `updates[].summary/linkLabel/relatedProject`.

**The music (derived, deterministic).**

- **Key and changes.** F major, 12/8. One month is an eighth note (250ms), so a year is a bar and the career plays in about 21 seconds. The changes are I–vi–ii–V with sevenths (Fmaj7 Dm7 Gm7 C7), one chord per half bar. The last half bar is always V, so every play-through lands on a held I.
- **Projects.** Each sings a six-eighth motif seeded by its slug: a 12/8 rhythm cell and a contour. Realised over the chords at its date, strong beats take chord tones, the notes between step through the scale, and the last note settles on a chord tone. Arcade projects play an 8-bit voice; the rest a felt piano. The clip draws exactly the notes it plays.
- **Roles.** Every dated role or course is a clip on one Roles track. The bass walks (root, fifth, approach) only while one runs. Undated entries stay off the timeline.
- **Markers.** Each update rings a bell on a tone of the chord it lands on (by kind); same-day updates strum.
- **Lab sketches.** They carry no date, so they sit in a rack, not on the timeline; each has a motif over the home chord.
- **Range.** The session runs from the half bar before the first dated clip to the later of today and the last clip's end, so a new year (fixture `new-year`) always fits.

**Behaviour contracts.**

- **Sound is opt-in.** No AudioContext exists until the Sound switch is pressed, or, after a reload with sound on, until the first tap or key. Never in a face.
- **Hover auditions.** A mouse resting 110ms on a clip, or focus on it, plays that clip in place; the next audition replaces it. Fingers use the ▶ buttons.
- **Mute and solo** change what is scheduled (verified by instrumenting Web Audio).
- **Idle and face.** `data-prism-idle` pauses playback; a face shows the resting state, with the playhead at today and no sound switch.

**Hard-coded strings.** None of content. Chord and note names (`Fmaj7`, `B♭`) come from `music.ts`; month initials on the zoomed ruler and month abbreviations on the tape are in `arrangement.ts` and `transport.ts`.

**Room for writing.** When posts arrive in `content.json`, they become one more dated track: `score.ts` adds clips with a voice, and `arrangement.ts` and `tape.ts` lay out any dated track. A post could ring like a marker or sing like a project. Until then, the Writing key links out to Substack.

**Phones (≤760px).** Time runs down the page, oldest first (the tape). A fixed playhead line scrubs as you scroll; play scrolls the career under it, and a touch hands control back. Mute and solo are desktop-only.

### 3.3 Back Page (`BP`)

All content logic is in `chapters.ts` (`ch`) plus `index.ts` and `dom.ts`; the other `.ts` files carry no content.

**content.json reads**

| Field | Where |
|---|---|
| `site.name` | `ch:256,369,394` |
| `site.email` | `ch:332` |
| `site.writingUrl` | `ch:307` |
| `site.social[]` | `ch:324,337` |
| `pages.home.eyebrow`, `.headline`, `.intro`, `.body` | `ch:349,385,388,405,406` |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, role, location, tools, featured, status (ink colour), cover, links, media (src/alt/caption/type; width/height by cast) | `ch` (`bookOrder`, `home`, `warMap`, `project`) |
| `lab[]`: slug, detail, href, title, summary, type, sourceEra, links | `ch:51-56,542-601` |
| `updates[]`: kind, source, title, date, summary, href; `.length` | `ch:426-439` |

Never read: `site.nav`, `pages.about.*`, `pages.resume.*`, `pages.home.title/description/availability`, `projects[].tags/order`, `lab[].cover/media`, `updates[].dateLabel/linkLabel/relatedProject`.

**route.main selectors**

| Selector | Where | Depends on |
|---|---|---|
| `.prose` (children moved, `class` stripped) | `ch:231` | `<article class="prose">` |
| `.greeting`, `.occupation`, `.hello img` | `ch:383,385,386` | `WelcomeHero.astro`, `Portrait.astro` |
| `[aria-labelledby="home-currently"]` then `p` | `ch:387,409` | `CurrentNote.astro` default `id` |
| `h1`, `.page-header__intro` | `ch:487,488,518,519,557,558,816,817` | `PageHeader` |
| `.page-header__actions a` (first on about; all on resume) | `ch:489,520` | actions slot |
| `.entry-page`, `.entry-page h1`, `.entry-page .page-header__intro` | `ch:576,578,579,889` | existence checks / titles |
| `.entry-page__meta > div`, `.entry-page__label`, `p`, `.entry-page__links:first-of-type a`, `.ds-tags li`, `.media-rail img` | `ch:630-659` | fallback only when slug missing from JSON; `:first-of-type` likely never matches |
| whole `route.main.childNodes` | `ch:858` | loose-sheet fallback |

**Hard-coded strings**

| file:line | String | Kind |
|---|---|---|
| `BP/index.ts:24` | "Hello", "About", "Resume", "Lab", "Projects" (`:24-28`) | nav labels |
| `ch:45` | "Hello" (stop labels `:45-48,70-72`: "About me", "The lab", "The back page") | nav labels |
| `ch:276` | "Hello" (contents `:276-281`, asides "a letter", "stapled in", "doodles", "the war") | invented |
| `ch:308` | "Writing" / "(Substack)" | duplicates nav |
| `ch:349` | "Frontend development" | fallback differing from home.md eyebrow |
| `ch:383` | "Hey there!" | duplicates Daylight |
| `ch:388` | "Burooj here!" | duplicates |
| `ch:393` | "/images/burooj4.jpg" | duplicates Portrait |
| `ch:399` | "that's me →" | duplicates caption |
| `ch:331` | "If found, please return to " | flavour |
| `ch:368` | "This book belongs to " | flavour |
| `ch:414` | "Currently: " | duplicates heading |
| `ch:437` | "Recent updates" | duplicates heading |
| `ch:438` | "little signals from around my internet" | paraphrases stream intro |
| `ch:462` | "Some things I've built" | duplicates heading |
| `ch:467` | "all of them, on the back page →" | replaces "All projects" |
| `ch:497` | "Dear reader," | invented |
| `ch:499` | "Yours," + "Burooj" | name hard-coded, not `site.name` |
| `ch:506` | "P.S. " | invented |
| `ch:563` | "Lab · in the margins" | replaces eyebrow |
| `ch:582` | `Try it on ${sourceEra}` | synthesised link label |
| `ch:672` | "from the archive" / "selected work" | derived from `status` |
| `ch:695` | "← back to the war (all projects)" | replaces back link |
| `ch:821` | "Projects · the back page" | replaces eyebrow |
| `ch:837` | "Roll call" | flavour |
| `ch:806` | "● selected work" / "● the archive" | legend, derived from `status` |
| `BP/dom.ts:80` | custom month names (Jan, Feb, March, April, May, June, July, Aug, Sept, Oct, Nov, Dec) | formats dates differently from Daylight |

Derived "content": page numbers are hard-coded (`ch:45-48,276-281`, labs `15+i`, projects `19+i*3`) and do not match real pagination; camp dot count `min(11, 5 + links + media)` and crossed-out dots `2026 - year` (`ch:710-711`; year 2026 hard-coded); ink colour from `status === "archive"` (`ch:666,738`); headline split into blue/red words; `today()` printed as the page date; `"the whole war"` map date; diary kind `replace("-", " ")` and `"this site"` for `source === "site"` (`ch:430`).

### 3.4 Hion (`HI`, provisional)

Line numbers are from the current tree and are still moving. `S` = `HI/screens.ts`.

**content.json reads**

| Field | Where |
|---|---|
| `site.name`, `site.nav[]` (label, href, external) | `nav.ts` (`createNav`); the only lens that reads `nav` |
| `site.social[]`, `site.email`, `site.writingUrl` | `S:206` (home), `S:710-735` (`footer`), resume fallback |
| `pages.home.headline`, `.intro` (Currently fallback) | `S:203-215`, `S:288` |
| `pages.about.title/description`, `pages.resume.title/description` | fallbacks in `S:about`, `S:resume` |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, tools, featured, cover, links | `S:workCharm`, `S:projects`, `S:project`, `S:onward` |
| `lab[]`: slug, href, detail, title, summary, type, sourceEra, links | `S:lab`, `S:labEntry` |
| `updates[]`: source, kind, date, dateLabel, href, title (`slice(0,6)`) | `S:home` |

Never read: `pages.*.body`, `eyebrow`, `availability`; `projects[].role/location/status/tags/media` (media and meta come from `route.main` instead); `lab[].cover`, list-page `links`; `updates[].summary/linkLabel/relatedProject`.

**route.main selectors**

| Selector | Where | Depends on |
|---|---|---|
| `.page-header__eyebrow, .section-intro__eyebrow` | `S:130,658` | `PageHeader`, `SectionIntro` |
| `h1` | `S:132,481,519,656` | page h1 |
| `.page-header__intro, .section-intro__intro` | `S:134,482,520,659` | headers |
| `.current-copy p` (first `<p>`) | `S:210` | `CurrentNote.astro` |
| `h2`, `a[href^='http']`, `.children` of article | `S:380-386` | prose structure (`story`) |
| `.media-rail figure` + `figure img` + `figure figcaption` | `S:429-433` | `MediaRail.astro`; **img only, video breaks** |
| `.entry-page__meta > div`, `.entry-page__label`, `p` | `S:483-490` | project meta |
| `.entry-page__links a[target]` | `S:492` | fallback when slug missing |
| `.entry-page` | `S:518,694` | existence check |
| `article.prose` | `S:508,536,622,633` | `<article class="prose">` |
| `.lab-aside` | `S:559` | `lab/index.astro` |
| `.page-header__actions a` (first) | `S:604,632` | actions slot |
| `h3` | `S:634` | resume entries |
| `.page-header, header.page-header`, `.section-intro__*` removed; `:scope > * > *`; `/404/` regex on the eyebrow text | `S:652-684` | 404 detection depends on the "404" eyebrow |

**Hard-coded strings**

| file:line | String | Kind |
|---|---|---|
| `HI/screens.ts:212` | "Burooj here!" | headline fallback |
| `HI/screens.ts:220` | "Hey there!" | duplicates Daylight |
| `HI/screens.ts:239` | "Frontend developer & designer" | duplicates |
| `HI/screens.ts:243` | "I make places on the web. Feel free to look around!" | duplicates |
| `HI/screens.ts:263` | "/images/burooj4.jpg" | duplicates (also `:616` about) |
| `HI/screens.ts:267` | "That’s me" | duplicates (curly apostrophe) |
| `HI/screens.ts:274` | "Some things I’ve built" | duplicates (curly apostrophe) |
| `HI/screens.ts:280` | "Follow the line to every project" | replaces "All projects" |
| `HI/screens.ts:285` | "Currently" | duplicates |
| `HI/screens.ts:291` | "More about me" | duplicates (not taken from main) |
| `HI/screens.ts:296` | "Recent updates" | duplicates |
| `HI/screens.ts:297` | "Little signals from around my internet." | duplicates |
| `HI/screens.ts:300` | "Recent activity, newest first" | duplicates aria-label |
| `HI/screens.ts:321` | "In the lab" | duplicates |
| `HI/screens.ts:322` | "Experiments, prototypes, and smaller things." | duplicates |
| `HI/screens.ts:329` | "My notes and writing on Substack." | duplicates |
| `HI/screens.ts:206` | "CodePen" filter + hard-coded "Resume" | hero socials |
| `HI/screens.ts:342` | "Things I’ve made, along the way." | fallback (curly apostrophe) |
| `HI/screens.ts:374` | "Project history, newest first" | duplicates |
| `HI/screens.ts:471` | "Newer along the line" (`:473` "Older along the line") | invented |
| `HI/screens.ts:472` | "Back to" + "Every project" | replaces "Back to all projects" |
| `HI/screens.ts:522` | "Open the live experiment" | dead path |
| `HI/screens.ts:532` | "Type" / "Era" | duplicates labels |
| `HI/screens.ts:547` | "Back to" + "The whole lab" (`:548`) | invented |
| `HI/screens.ts:558` | "Small things. Room to play." | fallback |
| `HI/screens.ts:590` | "More sketches on CodePen" + hard-coded `https://codepen.io/beejsbj` | duplicates |
| `HI/screens.ts:622` | "About Burooj" | aria-label |
| `HI/screens.ts:675` | "A loose end" | invented 404 eyebrow |
| `HI/screens.ts:676` | "This thread doesn’t lead anywhere. Try the homepage, or follow one of the lines above." | paraphrases 404 |
| `HI/screens.ts:715` | "Send a line my way" | replaces "Thanks for stopping by." |
| `HI/screens.ts:726` | "Writing" | footer label |
| `HI/nav.ts:85` | "Menu" | nav |
| `HI/index.ts:117` | "Skip to content" | duplicates |

Derived "content": `dateLabel · kind` where Daylight shows `dateLabel · role`; update meta `source · kind.replace("-"," ") · dateLabel` with raw slugs (Daylight maps to "This site / Pull request / ..."); `featured.slice(0,4)` on the year-sorted JSON (Daylight: 3, `order`-sorted); `updates.slice(0,6)` (Daylight 8); newer/older neighbours from `content.projects` order; year grouping.

### 3.5 Daylight classes no lens depends on

Depended on by nobody: `.project-row`, `.timeline*`, `.lab-card`, `.ds-tags` (except BP's dead fallback), `.stream-intro`, `.stream-caption`, `.stream-empty`, `.update-entry`, `.elsewhere`, `.socials`. Because no lens queries them, a copy edit to these in Daylight cannot reach a lens: each lens must be updated by hand (or the string moved into content).

Selector load: `.page-header__intro` and `h1` are read by all four lenses; `.prose` by all four; `.page-header__actions a` by all four; `.page-header__eyebrow` by CP, BP (via other), HI; `.current-copy` / `home-currently` by CP, BP, HI.

## 4. Gaps

**Shown in Daylight, missing or degraded in a lens**

1. **Footer** ("Style guide", "Thanks for stopping by.", name, Resume): absent in CC, CP, BP; HI has a different footer. Footer is outside `<main>`, so no lens can query it.
2. **Home**:
   - Featured projects: CC drops them; BP drops summary and tools.
   - "Currently" (bjslab): CC drops it; BP drops the "More about me" link; HI takes only the first `<p>`.
   - "Elsewhere" blurbs: CC, CP, BP drop them.
   - Updates intro/caption/empty text: CC, BP drop them; HI drops caption/empty and shows 6 of 8. CP shows them on its locators (desktop); phones show every update on the tape without them.
   - Update kind/source labels: HI, CC and BP show raw slugs ("pull request", "github"); CP shows `kindLabel` and `sourceLabel`.
   - Hero greeting: CC drops it.
3. **Projects**:
   - Year headings are lost in CC and BP; CP shows years as bars on its ruler and tape.
   - Tags and `status` are shown nowhere (Daylight does not show them either).
   - Tools: CC caps nothing, HI shows all, Daylight shows 3 on lists.
   - HI replaces `role` with `kind`.
   - HI project video media render as a broken image.
4. **Lab list**: `cover` dropped in all four lenses. "More sketches on CodePen" and the aside are dropped in CC and BP. Lab-entry `media` dropped in CC, CP and BP (HI keeps it).
5. **Resume contact**: HI keeps only the first of three actions.
6. **Resume**: CC flattens Tools to chips by splitting on "and", which would break "HTML and CSS" style items; headings in CC About collapse to one level.
7. **404**: HI replaces Daylight's 404 copy and button.
8. **Nav**: no lens reads `site.nav` except HI. CC omits Writing from tabs; BP has no Writing or Home tab; CP's "Hello" and CC/BP's tab names ("Status") differ from Daylight's "Resume"/"Say hello".
9. **Project order**: Daylight Home sorts featured by `order` (3 items); JSON sorts by year; CP, CC, HI use the JSON order, so the featured set can differ from Daylight.

**Invented by a lens (not in `src/content/`)**

- CC: arcana card, "Confidant rank MAX", "Social stats", resume "Leader/Party/Study", "Work/Lab" odometer, "New message", calendar widget, calling-card letter copy ("To whoever has a project in mind...", paraphrasing `about.md`), request status "Open", Prev/Next pager, "Take your heart".
- CP (DAW rework): the whole music layer (key, changes, motifs, bass, bells), all derived from content and declared in 3.2; track numbers; the clip editor; view names on the keys ("session", "arrangement", "rack"…); "Clip notes", "Set notes", "Text view".
- BP: "Dear reader," letter frame, "P.S.", "Yours, Burooj", fake page numbers, camp dot counts and hits (mean nothing), "(a quick war, during maths)", "Roll call", legend.
- HI: portrait on About (Daylight has none), "Back to / The whole lab", Newer/Older nav, 404 rewrite, "Send a line my way".
- All lenses invent eyebrow/back-link labels that differ from Daylight.

**Content only some lenses surface (Daylight does not render it)**: `pages.home.body` (CC first paragraph, BP in full), `pages.home.intro` and `.eyebrow` as visible copy (CC, BP). Daylight's own home hero copy is therefore not the home content the shells see.

## 5. Biggest drift risks

1. **Copy that lives in `.astro`, not in content.** Page-header text, hero lines, "Currently", stream copy, Elsewhere blurbs and the footer are not in `content.json`, so each lens either queries a class name (fragile, with fallbacks that already diverge) or hard-codes a copy; HI duplicates about 15 Daylight strings.
2. **Two sources for the home page.** Daylight hard-codes the hero while `home.md` holds different text that only CC and BP show, so those lenses present words Daylight never says.
3. **Dormant lab-entry route and unused JSON fields.** No lab-entry page exists today, so all lab-entry code (and `lab[].media`, absent from JSON) is untested; `site.nav`, `status`, `tags`, `pages.*.body` for about/resume are read by no lens.
4. **Parsing Daylight's markdown structure.** CC, CP and HI split the resume prose on h2/h3, `" · "` and a leading `<em>`; CC splits Tools on "and". An edit to `resume.md` shape or wording silently breaks three lenses.
5. **Derived and invented values with no guard.** Update labels fall back to raw slugs, project order and featured set differ per lens, BP's hard-coded page numbers and `2026 - year`, CP's 2021 to 2027.5 ruler, HI video media breaking and `.timeline` selector in CP are dead or time-bound; Hion's whole column is provisional.

## 6. The content contract (after drift-proofing)

**Where words live.** `src/content/pages/*.md` (home hero, Currently, stream copy, Elsewhere, page headers for about, resume, projects, lab and the 404, the lab extras, project and lab entry labels), `src/content/pages/resume.md` (the resume as structure: `experience.roles`, `education.entries`, `tools.items`, `ongoing`, plus a free markdown body), `src/content/site/config.json` (wordmark, skip link, header nav choice, footer, update kind and source names), `src/content/lenses/<id>.json` (each lens's flavour copy). Link hrefs may say `social:GitHub`, `site:email` or `site:writing` instead of repeating an address. Short copy fields take inline markdown (`src/lib/inline.ts`).

**One set of rules.** `src/lib/rules.ts` decides project order (newest year, then `order`), the featured set (featured projects in that order; the newest `work.limit` when none are), lab order, resume date lines, link resolution and derived values (years, first and last year, latest update and project, counts). `src/lib/portfolio.ts` applies them for Daylight and for `content.json`.

**The API.** `/prism/content.json` (`src/pages/prism/content.json.ts`, typed as `SiteContent` in `src/prism/shells/types.ts`): every visible entry with its markdown rendered to `html` at build time (Astro container API), every page's copy, `resume` (structure plus `html`), `featured`, `derived`, `lenses`. Shell helpers in `src/prism/shells/rich.ts`: `rich`, `blocks`, `inline`, `fill`, `featured`, `fallbackBody`.

**Parts.** `src/prism/parts.ts` names each piece of content (`page.title`, `project.body`, `update.item`, `resume.role`…); Daylight and every shell mark the element with `data-part` and `data-ref`. `src/prism/parity.ts` lists the routes the content generates, the parts each must show (with their words), and `GAPS`, what a lens leaves out on purpose.

**Guards.** `scripts/tests/prism-drift.test.mjs` (in `test`): no 12+ character string from `src/content` in shell source, no `route.main` read outside `fallbackBody`, and `content.json` covers every entry. `scripts/tests/prism-parity.browser.mjs` (`test:prism`): every lens on every route and every fuzz fixture (`src/prism/fixtures.ts`, mounted by `/prism/harness`) shows every part, with no console errors and one visible h1. `/prism/atlas` shows every route in every lens, and in parts mode outlines a chosen part in all five.
