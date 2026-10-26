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
| AB1 | Header: eyebrow "About", title "Burooj, again!", intro "Frontend developer. Curious about people, stories, and the places we make on the web.", action "Experience & resume" -> /about/resume | Daylight-only | no |
| AB2 | Prose (sections "People, stories, interfaces", "Still exploring", contact links) | `pages/about.md` body | `pages.about.body` (raw markdown) |

### Resume (`pages/about/resume.astro`, served at `/about/resume`)

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
| G1 Site nav | Header link row: Home, Projects, Lab, About, Writing↗, Say hello↗; `SiteNav.astro` | Home: seven tilted "commands" (Projects, Lab, About, Status, Phone, Writing, Calling Card), hard-coded, `CC/home.ts:commandsFor`. Inner screens: L1/R1 tab strip Projects/Lab/About/Status, `CC/chrome.ts:tabs`. Writing absent from tabs; Resume renamed Status | Seven keys of F major in the browser (desktop: a column; phones: a bottom row): Home, Projects, Lab, About, Resume, Writing, Hello. Labels and view names are lens copy (`keys`); Writing is the on-site `/writing` (lit on writing and writing entries), Hello `mailto:site.email`. Each key plays its scale degree on hover when sound is on, `CP/frame.ts:keysFor` | A pile of five closed exercise books, Hello/About me/The lab/Projects/Writings, each with its own cover label (names from lens copy `books`), `BP/index.ts:renderShelf`. The resume is stapled into About me; Writings is the marbled composition book, `/writing` and every `/writing/<slug>` (see G4). No contents slip, no Say hello | Charms hung from the cord: home charm (`site.name`) plus each `site.nav` item (the resume is not one: it lives under About), `HI/nav.ts:createNav`; hard-coded "Menu" pull. The only lens that reads `site.nav` |
| G2 Footer | Name, email, Resume, Style guide, "Thanks for stopping by." | — MISSING (no footer; email only inside the calling-card panel, `CC/panels.ts:cardPanel`) | — MISSING (no footer; email is the Hello key's href) | — MISSING (email only on the home cover/inside cover, `ch:returnTo`) | Partial: "Send a line my way" + email link + social drops + Writing, `HI/screens.ts:footer`. No name, Resume, Style guide or "Thanks for stopping by." |
| G3 Social links | GitHub/LinkedIn/Email + Resume on home hero | In the Calling Card panel only (mailto filtered, plus a hard-coded Writing row), `CC/panels.ts:cardPanel` | Home set-info chips: all `site.social` plus hero links not among them (Resume), `CP/home.ts` | Home cover/inside cover joined with " · ", mailto filtered, `ch:returnTo` | Home hero tag drops (minus CodePen, plus hard-coded Resume) and footer drops, `HI/screens.ts:home`, `footer` |
| G4 Writing link | Nav item + home "Writing" blurb | Command + panel row (`site.writingUrl`) | "Writing · Send" key to `/writing`; Substack is where each post's send goes (`CP/writing.ts`) | Writings, the fifth book, a marbled composition book: `/writing` opens it on its contents (`ch:writing`, one entry per `writing.posts` item: margin date, title with the page it starts on, opening lines, "on Substack ↗" to `canonical`); `/writing/<slug>` turns to the essay written out (`ch:essay`, `writing.entry.html`, P.S. from `pages.writing.copy`). The only home for writing in this lens | Footer drop + home fork + nav charm |
| G5 Updates feed | Home stream only | Phone panel (full list), home phone chip + calendar widget (latest), `CC/panels.ts:phonePanel`, `CC/home.ts:home` | Markers track on every arrangement (a flag and a bell per update), the overview strip, the home locators, the phone tape's marker rows | Home diary only | Home stream only |

### 2.2 Home

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| H1 Greeting | `.greeting` paragraph, `WelcomeHero.astro` | — MISSING (home never reads `route.main`) | Cut tag above the headline, `pages.home.hero.greeting`, `CP/home.ts` | Hand-lettered page head; from `.greeting`, fallback, `ch:home` | Hard-coded "Hey there!" reveal line, `HI/screens.ts:home` |
| H2 Headline | h1 "Burooj here!" | Giant ransom-lettered h1 from `pages.home.headline`, `CC/home.ts:home` | Set-info h1, `hero.headline` | h1 from `pages.home.headline`, first word blue and rest red, `ch:home` | `pages.home.headline` split into word signs on the threads, orbited by one thread, `HI/screens.ts:home` |
| H3 Occupation | "Frontend developer & designer" | `pages.home.eyebrow` ("Frontend Developer") as a plate: different string, `CC/home.ts:home` | `hero.occupation` under the headline | Typed line from `.occupation`, `ch:home` | Hard-coded copy of Daylight's string, `HI/screens.ts:home` |
| H4 Welcome line | "I make places on the web. Feel free to look around!" | `pages.home.intro` plate: a different sentence | `hero.welcome` | `pages.home.intro` lead paragraph: a different sentence, `ch:home` | Hard-coded copy of Daylight's string |
| H5 Home body copy (Daylight does not show) | — n/a | (+) Speech bubble "Burooj": first paragraph of `pages.home.body`, markdown stripped, second paragraph dropped, `CC/home.ts:home` | — | (+) Full `pages.home.body` rendered under the lead, `ch:home` | — |
| H6 Portrait | Peach circle photo + "That's me" -> /about | Posterised red/black cut-out, hard-coded path, `CC/portrait.ts`, `CC/home.ts:home` | Polaroid `hero.portrait` (src, alt, caption linking to `href`), floated beside the headline | Taped photo, from `.hello img`, caption "that's me →", `ch:home` | Photo hung on two threads, hard-coded path/alt, caption "That's me", `HI/screens.ts:home` |
| H7 Hero socials | 3 links + Resume | — MISSING on home (see G3) | Chips (all of `site.social` + Resume) | — MISSING near the hero (cover/inside cover instead) | Tag drops minus CodePen + Resume |
| H8 Featured projects | "Some things I've built": feature + 2 rows, cover/meta/title/summary/3 tools; "All projects" link | — MISSING. Only a "★ NN Works + NN Lab" odometer from array lengths; projects live behind the Projects command, `CC/home.ts:home` | "In the crate": every `featured` project as a record (cover, title, `dateLabel · kind`, side A1…); picking one puts it on the turntable, which shows `dateLabel · role`, title link, summary, the clip's notes, voice and chords, and "Open the clip". "Full arrangement" links to `work.link.href` with `derived.counts.projects` | "Some things I've built" taped cover snaps (cover, title, `dateLabel`; no summary or tools) + "all of them, on the back page →", `ch:home` | `featured.slice(0,4)` as hanging charms: cover, `dateLabel · kind`, title, full summary, all tools; pull-cord "Follow the line to every project", `HI/screens.ts:workCharm` |
| H9 Updates stream | Heading, intro, up to 8 entries (kind/source labels, title link, `dateLabel`), caption, empty state | Phone chip (latest title, count) + calendar from latest date + full chat-bubble list in panel; no intro/caption/empty copy; invented "New message"/"Daytime", `CC/home.ts:home`, `CC/panels.ts:phonePanel` | Locators: `updates.title`, `intro`, up to `limit` rows (date button that moves the playhead and rings the bell, title link, `kindLabel · sourceLabel`), `caption`, `empty` when none; on phones too | Diary list: date, linked title, summary, "source · kind", tally marks; all updates; hard-coded heading + subtitle, `ch:home` | Tie rows, `slice(0,6)`: raw `source · kind · dateLabel` + title link; heading + intro hard-coded; no summary/caption/empty, `HI/screens.ts:home` |
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
| LI2 Entry | Card: cover, `type · sourceEra`, title link, summary | Request card: No.NN, constant "Open" stamp, "Client" (=`sourceEra`) and "Type", title, summary, "Accept" prompt; cover — MISSING, `CC/lab.ts:lab` | Rack slot: a pad (button) that plays the sketch's motif, `type · sourceEra`, title link to `detail`, summary; `cover` fills the top of the pad above the motif, `CP/views.ts:lab` | Article with doodle, h2, summary, `type · sourceEra`; cover — MISSING, `ch:lab`, `ch:labCard` | Hanging charm: `type · sourceEra`, title, summary; cover — MISSING, `HI/screens.ts:lab` |
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
| AB1 Header | Eyebrow "About", h1 "Burooj, again!", intro, action "Experience & resume" | h1 + intro from main; eyebrow replaced by invented "Confidant · The Fool · Arcana 0"; action as "Next" card, `CC/about.ts:about` | A torn jazz poster: kicker "Set notes" + eyebrow, cut-out h1, intro boxed in ink, "Play. Build. Repeat." tag (lens copy); actions as buttons under the prose, `CP/views.ts:about` | Study notes: eyebrow as a printed subject tab, h1 in brush pen over a highlighter, intro boxed "in short", home portrait washi-taped; first action as a sticky note naming the page the resume starts on, `ch:aboutPages` | `pageHead` from main; first action as pull-cord, `HI/screens.ts:about` |
| AB2 Prose | Sections | Each block cloned into a "Burooj" dialogue; h2-h6 flattened into "Rank N" plates | Rendered `pages.about.html` | Cut into notes, never reworded (`BP/studynotes.ts`, `BP/sentences.ts`): h2 → numbered brush heading, h3-h6 → sub-heading, each paragraph → one bullet per sentence (first a point, the rest arrows), quotations in curly quotes and blockquotes → boxed callouts, links and emphasis → highlighter; lists, tables, code and pictures kept | `.prose` clone |
| Invented | none | Arcana card, "Confidant rank MAX" pips, "Social stats" pentagon, bust portrait | Taped portrait from `hero.portrait`, torn tomato/plum/mustard/pine scraps | Subject tab, "in short" box tag, sticky note with page number, washi tape, margin doodle (lens copy `about`) | Portrait (hard-coded) |

### 2.8 Resume

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| RS1 Header | Eyebrow "Resume", h1 "Burooj Rashid", intro | "Status" screen: h1 + intro from main; eyebrow dropped, `CC/resume.ts:resume` | `pageHead` from `pages.resume.header`, `CP/views.ts:resume` | Stapled into the About book after the notes (`/about/resume` opens it there): a typed letterhead slip with title, intro and contacts, `ch:resume` | `pageHead` from main |
| RS2 Contact actions | Email, LinkedIn, GitHub | All, as a "Contact" list | All, as chips | All, joined with " · " | **Only the first (email)**, as a pull-cord; LinkedIn and GitHub — MISSING |
| RS3 Experience | h2 + h3 role entries, dates, bullets | "Party member" rows (role/org split on " · ", `<em>` date, "Leader" tag on the first), `CC/resume.ts:row` | The Roles track drawn out: one row per `experience.roles` entry (title · org, `dateLine`, summary, bullets) with its clip spanning `start`–`end` on the ruler; undated entries say so | One slip per role, stapled on: index card, typed half-sheet, till receipt in turn; heading, date line, summary, bullets from `resume.experience.roles`, `ch:entrySlip` | The timeline: h2 strung, each role its own loop with its years circled by a hion; across on a window 280px tall or more, down on a shorter one (see "The resume as a timeline"), `S:resume`, `HI/track.ts` |
| RS3 Education | h2 + entries | Same rows, tag "Study" | Same rows for `education.entries` (they are on the Roles track too) | One manila library-card slip per course | same |
| RS3 Tools | Paragraph | ★ chips (flattened, split on commas / "and") | Chips of `tools.items` | `tools.items` circled on a graph-paper scrap slip | same |
| RS3 See the work | Paragraph + links | Dialogue box "Burooj" | Rendered `pages.resume.html` | Written into the notebook as study notes, after the slips | same |

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

**Rework (`prism/daw-timeline`).** Cut Paper is a DAW session whose heart is the arrangement. It reads only `content.json`: flavour copy comes from `src/content/lenses/cut-paper.json`, and `route.main` is read only through `fallbackBody` for `other` routes. From #17 (the instrument shell) it keeps the home turntable and crate, now playing real clips, and the torn-poster About; its presets drawer, fake tabs and key hints are gone. So are the knobs, faders, meters, device chain, channel strip and sentence-as-note piano roll of #12.

**Modules.** `music.ts` and `score.ts` are pure (Node-tested in `scripts/tests/cut-paper-music.test.mjs`). `audio.ts` holds the instruments, `transport.ts` the playhead and scheduler, and `frame.ts` the window. `arrangement.ts` is the horizontal timeline, `tape.ts` the phone timeline, `home.ts` is the home view (set info, turntable, crate, locators), `writing.ts` the Send (writing and its posts) and `views.ts` has the other routes. `bits.ts` holds the shared pieces.

**content.json reads**

| Field | Where |
|---|---|
| `site.name`, `site.email`, `site.writingUrl`, `site.social` | `frame.ts` (logo label, keys), `home.ts`, `writing.ts` (source and subscribe links) |
| `pages.writing` (header, copy: labels and state messages) | `writing.ts:writing`, `writingEntry` |
| `writing`: status, posts (slug, href, title, subtitle, description, date, dateLabel, canonical), entry (+ html), entryStatus | `writing.ts`; a post's date places its flag and picks its chord, its slug seeds its motif |
| `pages.home` (hero, work.link, currently, updates copy and `limit`) | `home.ts` |
| `pages.projects` (header, listLabel, detail.back, detail.labels) | `views.ts:projects`, `project` |
| `pages.lab` (header, listLabel, more, aside, detail) | `views.ts:lab`, `labEntry` |
| `pages.about` (header, html), `pages.resume` (header, html) | `views.ts:about`, `resume` |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, role, location, tools, cover, links, media, html | `score.ts` (date, kind to voice), `arrangement.ts`, `tape.ts`, `views.ts:project`, `home.ts` (records) |
| `lab[]`: slug, detail, href, hasPage, title, summary, type, sourceEra, cover, links, html | `views.ts:lab`, `labEntry`; slug seeds the sketch's motif; `cover` is the pad's picture |
| `updates[]`: id, kind, kindLabel, sourceLabel, title, date, dateLabel, href | `score.ts` (date and kind to a bell), `arrangement.ts:markersLane`, `tape.ts`, `home.ts` |
| `resume.experience`, `resume.education` (id, title, org, start, end, current, dateLine, summary, bullets), `resume.tools` | `score.ts` (start/end become the Roles track), `views.ts:resume` |
| `featured`, `derived.counts.projects` | `home.ts` (the crate, and the count on its link) |
| `lenses["cut-paper"]` | everywhere: DAW words, track legends, voice names |

Never read: `site.nav`, `pages.home.elsewhere` (declared gap), `projects[].status/tags/order`, `lab[].media`, `updates[].summary/linkLabel/relatedProject`.

**The music (derived, deterministic).**

- **Key and changes.** F major, 12/8. One month is an eighth note (250ms), so a year is a bar and the career plays in about 21 seconds. The changes are I–vi–ii–V with sevenths (Fmaj7 Dm7 Gm7 C7), one chord per half bar. The last half bar is always V, so every play-through lands on a held I.
- **Projects.** Each sings a six-eighth motif seeded by its slug: a 12/8 rhythm cell and a contour. Realised over the chords at its date, strong beats take chord tones, the notes between step through the scale, and the last note settles on a chord tone. Arcade projects play an 8-bit voice; the rest a felt piano. The clip draws exactly the notes it plays.
- **Roles.** Every dated role or course is a clip on one Roles track. The bass walks (root, fifth, approach) only while one runs. Undated entries stay off the timeline.
- **Markers.** Each update rings a bell on a tone of the chord it lands on (by kind); same-day updates strum.
- **Lab sketches.** They carry no date, so they sit in a rack, not on the timeline; each has a motif over the home chord.
- **Home turntable.** The record on the platter is a project's clip: pressing it auditions the clip in place, and the record turns (arm down, lamp lit) only while it sounds. A crate record (click, or a mouse resting 110ms) lifts the arm, swaps onto the platter and plays. While the transport plays, the turntable follows the playhead and puts on each project's record as its clip comes round. Reduced motion keeps the record still; the arm and lamp still show it playing.
- **Range.** The session runs from the half bar before the first dated clip to the later of today and the last clip's end, so a new year (fixture `new-year`) always fits.

**Behaviour contracts.**

- **Sound is opt-in.** No AudioContext exists until the Sound switch is pressed, or, after a reload with sound on, until the first tap or key. Never in a face.
- **Hover auditions.** A mouse resting 110ms on a clip, or focus on it, plays that clip in place; the next audition replaces it. Fingers use the ▶ buttons.
- **Mute and solo** change what is scheduled (verified by instrumenting Web Audio).
- **Idle and face.** `data-prism-idle` pauses playback and remembers it; it plays on (same region) when the page is looked at again. A face shows the resting state, with the playhead at today and no sound switch.
- **In the prism, unheard.** From Prism Exit until stepping back in (`ShellContext.inPrism`), the live page's session plays on its face (the playhead keeps moving while that face is looked at) but is hushed: a gain between the master and the speakers closes (`audio.ts: hush`). Notes keep being scheduled on time and play silently, so stepping back in re-strikes nothing and can't drift: whatever is sounding at that moment is heard again, from wherever the playhead is.

**Hard-coded strings.** None of content. Chord and note names (`Fmaj7`, `B♭`) come from `music.ts`; month initials on the zoomed ruler and month abbreviations on the tape are in `arrangement.ts` and `transport.ts`.

**Writing: the Send.** Writing is what leaves the session. `/writing` is the send lane (the session's ruler, a paper-dart flag per post at its date, the playhead; play lights each flag and its sheet as it passes) over a wall of bounces: one torn bone sheet per post, numbered B01 oldest, with its date, the chord under that date, a motif strip, title and summary. The motif is seeded by the slug and sung over the post's chord; the strip is a button that plays it on bells over that chord (sound on) and runs its own playhead either way. A post (`/writing/<slug>`) is that bounce blown up into liner notes: the big strip, title, subtitle and props (bounced, over, motif) beside a torn bone sheet carrying the body, ending in the Return, an ink slip with the subscribe and origin links. Quiet states are bone slips tagged "No signal" (unavailable) or "Silence" (empty, missing) with the page's own messages and a Substack link. Posts are not in `score.ts`: they light with the playhead but add no notes to the play-through. When live writing changes on the same URL (`route.refresh`), the view rebuilds in place without the sweep, keeping its scroll.

**Phones (≤760px).** Time runs down the page, oldest first (the tape). A fixed playhead line scrubs as you scroll; play scrolls the career under it, and a touch hands control back. Mute and solo are desktop-only.

### 3.3 Back Page (`BP`)

> **Round 3 (PR #11).** Superseded in part, like the rest of this section: the contents slip is gone (books are the navigation, and no label names its paper; `cover.series` prints "Book N"), the letter frame ("Dear reader,", "P.S.", "Yours,") became study notes cut from `pages.about.html`, the resume is slips stapled into the About book from `content.resume`, and the fifth book is Writings, a marbled composition book (`composition.css`): its contents at `/writing` (`ch:writing`) and each essay written out at `/writing/<slug>` (`ch:essay`), from #13's runtime `content.writing`. The legal pad paper is retired; `cover.series` is overridden by `books.writing.series` ("Composition Book"). Lens copy: `src/content/lenses/back-page.json`; gaps: `GAPS["back-page"]` in `src/prism/parity.ts`.

> **Round 4 (a lived-in times table).** The composition book's inside cover (`ch:compositionInsideCover`, desktop spread only; phones never show it) is now used: `USED` in `chapters.ts` says what a bored hand did to the printed table (the 7× row half shaded in pencil, "≈ hard" with an arrow, 7×8 ringed in red and "~~54~~ 56" in the margin, 9×9 ringed, ticks by the 1, 2, 5 and 10 rows, a face round 100 whose noughts are its eyes, a crossed-out man by 144, "Dawood was here" under the conversions); the strokes are `ink.ts` (`shading`, `ring`, `tick`, `strike`, `arrow`, `face`, `fallen`), each an SVG stretched over its cell, styled in `composition.css`. The words are `writing.insideCover.hard` and `.was`. The page carries `data-life="times"`, so `soldiers.ts` camps on it (other covers stay empty): Blue dug in by the last row, Red behind the 144 corner (`data-dug-in` points), a third camp wherever the paper is clearest. `space.ts` treats a `table[data-rules]` as solid to camp or write on but open along its cell borders, so shots rule along the table's lines; old scribbles (`.bp-scrawl`) are room, not lanes. On that page the war mostly stays home (a lane bonus) and the men mostly talk about the table (`soldiers.page.times`). Static ink stays in face mode and reduced motion; the men are still there and the wars are not, as on every page.

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

**Two threads (`hion/two-threads`, experiment on `hion/thread-titles`).** There are only two threads, the cyan and the magenta hion, and they make everything on a screen: every other visible line is a branch grown from one of them, and stays connected to it. The skein keeps a tree (`HI/skein.ts`): every strand but the two hions has a parent, the arc length on the parent where it leaves (its root), and its parent's hue, so everything cyan belongs to the cyan tree.

| What | How it is a branch | Where |
|---|---|---|
| The line at the top | The two hions themselves, slung across; on a screen they come down from the current destination's knot | `HI/nav.ts` |
| The ground | Buds along the hions' ways, a slant off them into open paper (`fate.ts` `buds`, `leave`), each born when its hion's head passes where it leaves; a ground branch forks once more into a shorter one (not on a screen seen close); trickles leave a hion or a branch lying near the reader. Leaves fade before the thread they grew from | `fate.ts`, `skein.ts` `sprout`, `stepGround`, `trickle`, `fade` |
| Wefts, cords, ties, the knots where the two are tied | Limbs (`HI/loom.ts` `Limb`): `weave.ts` composes, on a page, the way each should go; the skein grows it off the hion it is thrown from (forking a little before where it is tied and bending into its line) or off the nearest thread, as the drawing reaches it, tied off in a small knot of itself. The loose fibres beside loops are gone (a line of their own). A track keeps its marks | `weave.ts` `weftLimbs`, `tie`; `skein.ts` `bear` |
| Things hung on drops | A drop hangs from its cord (the cord's hue: `weave.ts` sets `data-hue`), grows down from it once the cord's head has reached it (`data-tied`, a clip-path in `shell.css`), and the thing is shown then | `skein.ts` `readHangers`, `tieHangers`; `ink.ts` |
| Headings and labels | Written by a thread that comes off the tree (below) | `spun.ts`, `skein.ts` `rootFor`, `title` |
| Hover | A branch grows from the nearest grown thread (the other hion's tree for a written heading, so cyan weaves magenta words and the other way about), weaves through the words or loops round the thing, and withdraws into its root when you leave | `skein.ts` `encircle` |
| The hions' own knots (left alone) | A loop off the hion and back through itself | `skein.ts` `knot` |

How a branch leaves: only from a point its parent has already grown; forward along the parent, at a slant (about 20 to 50 degrees), never back and never square; turned down the page rather than up; its first stretch keeps clear of its parent so the join reads as a fork; it lies at full strength where it leaves (no fade-in there), so the join never reads as a gap. How it ends: a twig simply ends in open paper (no taper); a branch with a purpose ends where its work is (past a written word, in a knot by a strung heading, at its end in a knot); a hover branch withdraws into its root. One rule for every branch's way to a thing (`rootFor`): the best grown point within reach that it can leave forward from, along a curve that leaves along the parent and arrives going the way the thing is written, weighed by length, by how much of it would cross words (all but forbidden, sampled every 8px), by its hue (a heading prefers its own), and by how deep in the tree it is. With nothing grown in reach yet, it leaves the nearest point of a hion's way (the hion is never far behind).

One brightness and one material, flat: every kind lies at body 1, one line of its hue at one width, with no glow and no taper anywhere (Burooj, after the tuning pass: drop both). A growing tip is the line itself, as it will lie (no ripening gradient, no hot head, no halo); a heading being written is the same line, written; a plucked thread's light is a short pale run of the thread's own width; the menu's tails have no shadow; the loom draws no bloom canvas. Measured against the tuned branch (software-rendered, two runs each): home at 1280 arriving about 26% cheaper, at rest about 33%, after a scroll about 19%; a phone and /about about 25 to 30% arriving and after a scroll; scrolling and brushing within noise. Shallow crossings (under about 24 degrees) no longer break the thread that goes under, so bundles at full brightness do not read dashed. At full brightness the ground is sparser than the dim one was: buds every ~220px of a hion's way (260 on a phone, 1.6x seen close); home is busier by growing longer after input and trickling sooner, not by more buds.

A tap sends out a pair: a branch off each tree grows out through where you tapped and carries on, the way it was going, into the nearest other branch ahead (of the other tree by preference; never the thread it grew from or any it came from, nor anything within 140px of where it left), weaving over and under along it, onward, for 160 to 300px; it never goes back, but lies as the ground does and fades as it does, leaves first (`skein.ts` `sendOut`; eight lying at most, the oldest fading first). A tap on a thread (within 24px) also plucks it: it rings where it was struck, and light runs from there both ways along it and on through the tree, into every branch whose root it passes and back into the parent when it reaches a branch's root (`skein.ts` `light`, `stepLights`). Brushing a thread slowly with a fine pointer sends gentler light the same way (a thread answers once a second). `life.ts` no longer has plucks, runners or dust; its chase sends light down both hions (`skein.chase`).

Only body text is type (paragraphs, intros, summaries, bullets, captions, links inside prose). Body text is Literata (`lenses/hion.css`, `--hion-serif`): low in contrast and naturally bold, so it holds its own on black beside the threads where Spectral's hairlines shimmered and read as a footnote. Reading 600 at 1.3rem (1.35rem for intros, the welcome and long reading; 1.15 and 1.2rem on a phone; summaries 0.92 of that), small titles 700, strong words 800, what is said in type in its 500 italic; leading 1.6. The things said (the greeting, the role line, the portrait's "that's me", the foot's call) are written by both trees at once, in the label face: a branch off each, the other's twisted round the first along the run under the letters' feet, each going under the other by turns, and the cyan and the magenta on top letter by letter up through the letters, so each letter stays one clean stroke (`skein.ts` `SAID`, `twisted`, `twins`). A label whose only text is hidden from a screen reader (a date said elsewhere) is drawn from that text. The menu's names on a phone, folded away when the screen is built, are written when the menu is first let down. Every heading and every label is written by thread (`spun.ts` `WRITTEN`, `LABELS`, kept in step with `shell.css`): eyebrows, dates, years, meta lines, tags, pull-cords and links on, table heads, the foot's links and address, the names on the line and the word under the menu's tassel (`spinNav`). A label that hangs on a drop or pull-cord of its own is written on a canvas inside it (it swings) on from the knot its drop ends in: `ink.ts` hangs such a drop by the label's corner, just before its first letter, with no knot at its end, and notes the point (`data-knot`); the thread goes straight down into the line under the letters and turns into it at a tight corner where the first letter rises (`spun.ts` `onFrom`, `bend`); a knot over the word goes round above the first letter instead, never through it. A label on the resume's track comes in off the track's own threads (the circle round its year, the strand down its role's side). Any other label is a branch grown to it, like a heading. A 3px thread writes Aboreto's capitals legibly from about 24px, so no label is set smaller (`--hion-label-least`; at 20 to 22px a U read as a Y and a D as a P); below 1240px the name in the middle of the line hangs under the row so the names do not run together; long link labels may break anywhere on a phone. Labels are written at a quicker hand than headings (0.6 to 1.6s). The tracer leaves a bowl's foot from its middle, not from the corners under its stems (`trace.ts`: a flat foot's node is the middle of where it lies lowest; a bowl's bottom run between two corners gets a node in its middle; a drop from a corner under a stem, or from a terminal high in a letter that has a foot, costs more than going back to the foot).

Costs (dev servers side by side, software-rendered, single machine; relative only): main-thread busy while arriving and just after scrolling is about 1.5 to 1.9x `hion/thread-titles`, scrolling and brushing about 1.1 to 1.25x; 10s after the last input a screen is as idle as before. Pictures keep their drops and wraps (now grown) and the hions' circles; no permanent ring branch was added round them (it would add a lot of line at full brightness).

**Tuning pass (`hion/two-threads-tune`).** Nothing visible changed; what the screen does for it did. Profiled (CDP sampling and tracing) rather than guessed, the cost was mostly not the threads' arithmetic but the page around them:

- *Canvases sent for nothing.* A 2D canvas on the page is sent to the compositor every frame, drawn on or not. On a page the loom lays no marks (the hions and their limbs are the skein's), yet every loom tile was two empty 2D canvases, 2.6MB each, three to five of them in sight: `loom.ts` makes a tile's canvases when the first mark is laid on it, so a page has none and the resume's track keeps its drawing. (The live band itself, 1.6 screens of 2D canvas, is the one that must be sent each frame while anything moves, about 1.5ms a frame software-rendered; cutting it into strips was tried and dropped: with six heads growing across it, most strips change most frames.)
- *The whole page restyled for every word.* Measuring a heading or label put `.hion-measuring` on the page and took it off, and that rule matches every element: two restyles of the whole page and a layout at the next read, per word, three layouts for a hung label, 10 to 20ms each on a long screen. `dom.ts` `measured` takes the class off in a microtask, before anything paints, so every read in one task shares a pass; `spun.ts` reads a word's page (boxes, runs, face, knot: `read`, `Read`) apart from tracing it (`measure` reads nothing), the queue takes the next few words' reads in one pass, a row of labels tied at once is read in the pass its tying fires in, and `writeLocal` reads everything before it writes anything.
- *Layout read every frame.* The skein read `scrollY` (anchor, seen, trickle), the loom `innerHeight` and life the page's box each frame, and the first such read in a frame lays the page out again for every change the frame has made (a reveal lit, a glint's step, a word spun): 150 to 230ms of forced style work in home's first five seconds. The viewport is read on a scroll or a resize and kept (`skein.ts` `look`, `viewTop`, `viewH`; `loom.ts` `viewSize`); a frame reads no layout.
- *Bitmaps.* What cools behind a head is baked on one shared beat (`BEAT`, 320ms) for every strand, so a pane several heads cross is re-stilled (a new bitmap) about three times a second however many cross it, not once a frame; a pane broken by a thread going under is stilled on the beat too, the thread over lying live on top until then.
- *Tracing.* Thinning a line of letters and reading its skeleton is 5 to 20ms a line (70 to 90ms for a three-line post title), the dearest thing a screen does on arrival; the same words in the same face trace the same way, so traces are kept in `localStorage` (`hion:traced:1`, packed as deltas in tenths of a bitmap px, about 1.5KB a line, 400 lines at most) and a second visit traces nothing it has seen. The seven names on the line, traced in one task when the face arrived (a 130 to 150ms hitch), are written one a task (`spread`), as good as together.
- *Where a branch leaves.* `rootFor` drew the curve to a thing from every grown point in reach that might beat the best so far; with a heading hemmed in by words every way crosses some, so nothing was ever ruled out and a hover on a busy screen drew ten thousand curves (a 100 to 400ms hitch). Every point is weighed cheaply first (distance, how far off forward, hue, depth) and the curves drawn in that order until none left could win, at most 400. Every strand keeps the extent of its body (`ext`), so `rootFor`, `touch` and a tap's search skip strands nowhere near.
- *The resume's roles.* `track.ts` `fit` widened each role in turn, reading its height after every step (two layouts of the page a role, 200 to 300ms whenever the track was laid again); all the roles step together and are read once between steps, to the same widths.

Measured in a software-rendered headless Chromium (CDP `TaskDuration`, main-thread busy ms per second; the prism's preloaded faces kept out of the measurement, the dev toolbar off; two runs each, base then tuned, the base being `hion/two-threads` at the branch point; a third tuned run after a first visit, so the traces are kept). Long tasks over 50ms are in brackets where any remain.

Home at 1280×800 (main-thread busy ms a second; canvases on the page 72 at 30MB → 62 at 16.7MB):

| window | base | tuned | tuned, traces kept |
|---|---|---|---|
| arriving (0–5s) | 593 · 655 [156, 187] | 512 · 545 [101, 114] | 588 |
| at rest (5–10s) | 257 · 279 | 173 · 189 | 209 |
| scrolling (25 wheel steps) | 670 · 679 [53] | 590 · 608 | 569 |
| after scrolling (4s) | 444 · 481 [58] | 377 · 345 | 346 |
| brushing (60 slow moves) | 459 · 483 | 385 · 362 | 379 |
| a burst of taps (5) | 653 · 768 | 585 · 680 | 450 |
| 10s after the last input | 169 · 131 | 51 · 56 | 63 |

Home at 390×844 (56 canvases at 13.8MB → 46 at 9.7MB): arriving 443 · 426 [122, 104] → 387 · 466 [87, 134]; at rest 96 · 102 → 68 · 71; scrolling 537 · 556 → 430 · 425; after scrolling 252 · 269 [85] → 224 · 218; taps 673 · 771 → 632 · 595; idle 1 → 1.

The other screens (base → tuned, the two runs each): `/projects` arriving 447 · 484 → 409 · 439, rest 116 · 134 → 77 · 88, scrolling 606 · 643 → 464 · 495, after 332 · 395 → 247 · 236, brushing 374 · 391 → 249 · 268, taps 477 · 546 → 361 · 379. `/about` arriving 498 · 492 [141, 113] → 410 · 386 [63, 57], rest 112 · 120 → 96 · 80, scrolling 556 · 603 → 450 · 525, after 327 · 353 → 259 · 277, brushing 290 · 313 → 185 · 225, taps 337 · 353 → 261 · 270. `/resume` arriving 827 · 829 [213, 178] → 664 · 688 [119, 118], rest 156 · 166 → 93 · 95, scrolling 549 · 627 → 461 · 460, after 334 · 371 → 235 · 254, brushing 118 · 123 → 79 · 90, taps 597 · 676 → 481 · 461. `/writing` arriving 456 · 519 [113, 152] → 433 · 461 [106], rest 92 · 115 → 69 · 72, scrolling 747 · 711 [118, 98] → 712 · 701 [105, 100], after 534 · 533 → 333 · 348, brushing 356 · 336 → 246 · 292, taps 271 · 312 → 189 · 195. Frame pacing while things grow is at 16.7ms (p95) in every window but scrolling on the wide screens, where it is 33ms before and after; the long tasks left are the shell's mount and first screen (about 100ms each) and, on a cold cache, the trace of a long heading as it scrolls into view (70 to 100ms).

Not changed, and why: the band's own per-frame cost (above); the glints' infinite animations (composited: at idle the main thread is quiet, about 2ms a second); the sway's per-element restyle on a scroll (by design); tracing itself (pure functions over a bitmap, a worker's job: an open decision). On the first visit to a cold cache the arrival of home is within noise of before: its first five seconds are mostly tracing the display words. Twelve seconds after the last input a screen is idle (the pulse sleeps; one rAF in three seconds); the harness's "idle" window on home begins before its 12s of attention are up.

The paragraphs below describe the base this branch is on; where they say otherwise (kinds, brightness by kind, pointer threads, the ground's fan and edge threads, a heading's approach from the page's edge, labels as type), the section above holds.

**One weave (`hion/one-weave`, on `prism/hion-living-weave`).** Every thread on a screen is one kind of thing, a strand in one engine (`HI/skein.ts`): a body grown from its head, a goal that steers the head, a hue, slack, glow, body strength and lifetime (one width for all since round 3, below). The kinds differ only in those numbers and in what steers them:

| Kind | Born | Steered by | Body when finished |
|---|---|---|---|
| hion | the composition (`HI/weave.ts` `tips`) | how far the loom has drawn along its way (scroll) | baked onto the ground panes; permanent |
| ground | where the hions come down, the page edges | `HI/fate.ts` (below) | baked; lies ~40s, fades |
| limb (`hion/two-threads`; was pointer) | a weft, cord, tie or knot the composition asks for, as the drawing reaches it; nothing from the pointer | its composed way, off the hion it is thrown from or the nearest thread | baked; permanent |
| loop | hovering something hung, strung or linked (on `hion/two-threads`, a branch off the nearest grown thread) | weaves through its words, or ties round it; holds; unties from its end back | never baked |

**One material (tuning, Fable; round 2: light only).** Every strand is drawn the one way, `strokeRun` in `HI/skein.ts`: one smooth line of its hue, and a little light added under it (`lighter`, about 2.4 widths wide, slight). No grain: the earlier pigment fibres, paper tooth and dust were dropped on Burooj's note that the threads should "just be the colour", ethereal. A fainter thread is the hue dimmed, not made see-through, so pieces of one thread meet without a seam. **One width (round 3):** every thread on the screen is 3px (`THREAD` in `HI/pastel.ts`): the hions, the ground, threads from a click or a touched thread, hover loops, wefts, knots, ties, cords, the line at the top and the resume track; no scaling for a close screen or a phone (was 1.5 to 4.1 by kind). What differs is how strongly the body lies (a hion 1, ground 0.5, click 0.62, loop 0.95). `paint` no longer thins marks by 0.85; the woven cloth (`HI/stitch.ts`) scales its own weights by 0.85 to look as it did. The warm run behind a head (its rope) is the same line drawn hot: over the last stretch it brightens to full and widens by a tenth, a pale core comes up inside it, the light under it grows a little, and the very tip has a small halo no bigger than the thread. The rope is taut (slack 1.012 to 1.025 over the path, was up to 1.12; a third of the sway and sag), so the tail reads as thread drawn out, not a tail. The hions' pastel bodies (`HI/pastel.ts` `thread` marks, their blooms and the loom's CSS beads) are gone from pages: the hion kind has a body, laid on the skein's ground panes as its head passes, a batch at a time, exactly as every other strand; `HI/weave.ts` with `heads` composes only the hions' ways (`tips`) and what hangs from them (wefts, knots, ties, cords and loose fibres stay marks on the loom, above the ground, now the same flat line: `HI/pastel.ts` `paint`). A hion head chases the loom's reach on a rope too, and dims to half when it has caught up and waits. A hion lies over every thread: a thread crossing one always goes under (`HI/fate.ts` `cross`). The resume track still lays its hions as pastel marks (its own loom, its own beads), in the same flat line.

**A screen travelled to grows from the line (round 2).** On a screen you pull from the menu (not the one arrived on) nothing is ready-made: the skein starts the moment the loom does (`HI/index.ts`), the hions set out from where they come down (the charm's drop) at `SETOUT` 1800px/s along their way, and the loom's brisk intro is paced to them (0.9 + gap/900 px/ms, was 1.4 + gap/220) so wefts, knots and cords appear as the hions pass rather than before them; the ground is born live from the drop as the drawing reaches each seed, nothing pre-grown, and the skein's layers do not fade in. The screen arrived on keeps its part-grown ground and fade-in. Measured on bjslab (dev server), the hions run the first screen in about 0.4s after the new screen is there.

Every strand is in fate's one index: the hions are fixed company (ground threads fall in alongside them), a pointer thread that lets go is company too, and crossings go over and under. Heads move every frame while active (ground ~150px/s, pointer ~360px/s, loops 1100px/s, each pulled, eased and pulled again rather than at one rate), drawn between fate's points so they never step; behind each a short rope (12 nodes, a little longer than the path) sags, lags and sways while the head moves and settles onto the path as it cools, so what is baked is what was seen. Fate's turns ease in and out (curvature changes a little each step, never jumps) and its runs meander slowly, so they aren't straight lines joined by arcs. Everything that moves (hion heads, ground heads, pointer threads, loops, dust, plucks, runners) is on one live canvas, a page-space band 1.6 screens tall over the ground and under the words, repainted only in the boxes that changed and moved only when you scroll near its edge; one frame loop per screen (`HI/pulse.ts`) runs the loom, the skein and life. Every canvas drawn only now and then (hung-thing inks, the line, loom tiles, ground panes, woven covers) is shown as a still in a `bitmaprenderer` twin (`HI/dom.ts` `still`), because each 2D canvas on the page costs every commit whether it changed or not; the live band is the one 2D canvas that changes every frame. What stays its own: woven covers (`HI/woven.ts`, a cellular cloth), the menu cord and the loose ends under its names (`HI/nav.ts`), and the resume track's loom.

**Type: Stele (`hion/type-fate`).** Fate, not warmth: one inscribed voice in two faces, set by the variables at the top of `HI/shell.css` and imported (Latin only) in `lenses/hion.css`. Aboreto (thin, wide capitals cut like a stele, one weight) is the face of every heading, since every heading is written by thread (below): the home words, page and project titles, strung section headings, role, course, update and post titles, the "In the lab" / "Writing" forks, prose h2 to h6, the 404. A thread has one weight, and so has Aboreto: its thin monoline capitals are what lets one thread along a letter's centre line read as the letter (a serif at 600 traced at 22px came out a blur of serifs and counters). The small headings are a little larger than the reading face had them (update and course titles and prose h3 1.5rem, h4 to h6 1.4rem) and tracked 0.06em, so a 3px thread has room inside a capital and between two. Aboreto also writes the labels (charms, dates, tags, the menu), tracked open, at least ~13.5px. `--hion-head` (Literata 700) is left for what is not a heading: the footer address and the links on to the next and previous entry. Reading is Literata 600; the spoken lines (Hey there!, the role line, captions) are Literata 500 italic. Only the shipped weights are ever asked for (`font-synthesis: none`). The DOM text keeps its own case (Aboreto draws lowercase as capitals), so screen readers and copy are unaffected. Spun titles sit about a fifth smaller than the Alegreya ones did, as the capitals are wide.

**One light, growing (round 4).** Burooj: the threads still looked *drawn* rather than *growing*, and the ground being dimmer than the hions (with clicks never touching it) made it read as drawn behind them. So: every strand lies at one strength (body 1 for hion, ground, pointer and loop; glow 0.14 for all), and the hot head is gone (no brightening run, pale core or tip halo: a bright point moving at a pen's pace is a pen). A growing end is instead *finer*, like a tendril: over its last 34px (`TIP`) the line narrows to about a quarter of its width (`strokeTip`), with no light of its own there, and the tip nods a little either side as it goes (the rope's head node, `swing`); as it stops, the tip fills out to full width. Finished ends and starts come to a point the same way (finer, not fainter, no glow: `lay`). The loom's marks (`HI/pastel.ts` `thread`: wefts, cords, ties, the menu line, the resume track) are taut and of one strength: no hand wobble, no per-mark strength between 0.75 and 1, no trimmed mark ends, so they read as one line, not strokes. A thread from a click now also goes to a thread lying on the ground near by (taken over a heading or picture when it is nearer, and about a third of the time when it is not): it comes in beside it, crosses it once, runs on beside it on the other side for 140 to 260px (`HI/wind.ts` `alongside`), and three times in four then lets go into fate with it. Clicks still stitch across a hion as before. *Cost:* the ground is as bright as the hions, so home is louder; text is still held clear by the ground's margins.

**Threads of intent (the ground kind).** Under the two dancing hions every screen has a ground of long threads (steering in `HI/fate.ts`). It replaced the Immigration cloth, whose grid read as a warping net however it was mapped. Each thread grows only from its head: a hot tip of the same thread with a slack bright run behind it that cools into a quiet ground (body 0.5, the fibres' tooth taking its share). A head holds a heading with a slight bow and turns only at a decision (run spent, words ahead, a goal reached, another thread met at a slant), choosing from a fan of headings at most 48 degrees off its own (more only to get round content), and draws the turn as a curve eased in and out; between turns it meanders a little. Its turning over the last ~550px is capped, so it never loops. Where two cross, one goes under. It reads no content of its own; it reads the screen's layout:

| What the screen has | What the threads do with it | Read from |
|---|---|---|
| Any text, `img`, `video`, `svg`, `a`, `button` in `main`/`footer` | Held clear (with a margin): heads turn at it and never cross it, and prefer headings that keep some paper between them and the words | text-node line boxes and element boxes, measured with transforms off (`.hion-measuring`) |
| The most open place in each ~820px stretch of the page (leaning to the middle) | A gather: most threads below a stretch's top pass through its lanes, so they converge into a bundle and part again; a few are lone and run off into the distance | the held map |
| Where the hions come down from the line | A fan of threads, born first, spreading either side of the hions' own way down | `nav.origin()` |
| The page edges | Threads in from the left (mostly cyan) and right (mostly magenta) down the page, each born when the hions' drawing reaches it | `loom.reach()` |
| Project, lab-entry and post routes | Fewer threads (the same width as everywhere), at most two heads; the screen arrives still and its threads wait for the reader | `route.kind` |
| Home | Busiest: a wider fan, edge threads every ~230px instead of ~380, six heads at work at once instead of three, trickles twice as often, and the ground keeps growing for 12s after arriving or any input instead of 6s | `route.kind` (`lively`) |

The same page grows the same way (seeded by its path). The first screen arrives part grown (its ground already there, a few heads still at work). Heads near the reader grow at about 150px a second, every frame, at most three at once (six on home); heads out of sight hurry, unpainted, on a 200ms beat. They grow while someone is there: for 6s (home 12s) after arriving and after any scroll, pointer move, tap or key; left alone, they hold where they are (tips dimmed) and the loop sleeps. A finished thread lies for about 55s and then fades; new ones come in from the edges near the reader (sooner when none near is growing), so the page never fills. Ground is painted onto 320x512px page-space panes near the viewport, a batch of segments at a time and not more than about three times a second per strand (every bake re-stills a pane: a new bitmap, and a dirtied style if the still's attributes were re-set, which `HI/dom.ts` now avoids). Fades were the costly thing (a step that repaints whole panes re-lays every strand on them with the fibre renderer and makes a new bitmap each): so a fade is 4 steps over 3s on one shared beat; the first three take the fading thread off the paper in place, along its own fibre paths (`destination-out`, nothing else repainted; a thread crossing it loses a little at the crossing for a moment), and only the last repaints the panes it lay on, which puts the crossings back. Threads finishing within the same 16s fade together, in waves with rest between. Reduced motion and face mode grow everything out of sight and show it settled, with no heads and no fading.

**Clicks and touched threads (the pointer kind, `HI/skein.ts`, ways round in `HI/wind.ts`).** Nothing issues from the pointer merely moving. A click or tap on the paper sends a pair out from there (one of each hue), and a branch off any thread under it. Brushing a thread with a fine pointer (a hion as far as it is drawn, or any thread lying on the ground; not racing across it) sends a branch off it from where it was touched: the thread's own hue, leaving at a slant from the way the thread runs, keeping clear of its parent for its first stretch. Each thread creeps in a drawn curve to the nearest thing nobody else is going to (a heading, a `[data-weft]`, a picture, a tag, pull-cord or charm; for a click with nothing near, the hions' own way) and winds round it: through a heading's words (over a word, upright down through the gap, under the next), a smooth loose band round a picture, or taut stitches across a hion. Half of those that wound round something then let go into fate and run on to join the ground's flow; the rest end there. With nothing near, a branch runs off with fate. At most three at once (five from a click); a thread sends no second branch for 2.6s and no two branches leave within 0.7s. None of it runs in reduced motion, face mode or while the prism holds the page idle.

**Hover (the loop kind).** Hovering a title or a link weaves a cyan thread (the same light, the one 3px width) through its words, both lines and back; a picture or a card gets a loop round it. Quick, held while you stay, untied from its end back when you leave. Pointer threads still on their way somewhere near turn to it too. Left alone, the hions now and then tie a small loop of their own (`HI/life.ts`). The glints round the hions' circles ride a CSS `offset-path` (no script per frame).

**Headings spun from thread (`hion/thread-titles`, the title kind).** Every heading on a screen is written by one thread of its hue, after Okushita's one-line films (a single line runs along and rises into each figure, then runs on); only body text is type. What is written is `WRITTEN` in `HI/spun.ts` (h1 to h6 in `main`, and the update titles, which are paragraphs), kept in step with `HI/shell.css`: page and project titles, the home words (one thread each), strung section headings, role and course titles, update and post titles, the forks, prose h2 to h6, the 404. `HI/spun.ts` reads a heading's letters off the page as a bitmap, a line at a time, in the real face; `HI/trace.ts` thins them to their centre lines, reads those as a graph (ends, junctions, sharp corners and the foot of a round letter, joined by runs) and draws each letter as one stroke through its runs; between letters the thread runs along a line under the feet (2.2 stroke widths, at least 2.6 thread widths), straight down to it and straight up from it. Its one rule: no thread stands where a letter has no ink. A connector that would (the drop from the top of an S that read as an I beside it, the rise into the end of a C that made it a Q, the foot of an L bent down to the line) costs four times its length against going back along what is drawn to leave from a lower node, so the thread nearly always doubles back instead; short out-and-back spurs are taken off, and ends are only extended at terminals (the stubs on B and R). Punctuation is beads and loops, never a letter's stroke: a full stop is a knot, the dot of a "!" a ring with the bar as a narrow loop above it, a colon two rings, an apostrophe or hyphen tied to the nearest letter and drawn out from it and back. A heading of several lines is one thread as a weft goes (`joinLines`): every other line is traced mirrored and written back right to left, and each line turns down into the next at the side, beyond both, so no run goes back along a line already written; multi-line headings have a little more leading (1.18 to 1.32) so each run lies under its own line. A heading strung on a weft is written by the weft: `HI/weave.ts` stops the weft (and its glow) short of the words either side in a knot, and the thread sets out from the knot before and ends in the knot after, in the weft's hue (`data-weft-hue`), written on a canvas of its own inside the heading, over the heading's black box (which keeps the hions and the weft behind the words). Otherwise the thread comes off the nearest drawn hion of its hue when one runs near on the heading's own side (never across its words), otherwise in from the page's left edge when the heading is near it, otherwise from a little before the word; it runs a little past the last letter and ends. Any other heading is a strand like every other (hot head, rope, one material, laid on the ground as it cools, never fades) of the one 3px width (`THREAD`), so a hover loop weaves over and under thread letters and a thread from a click winds through them. It is written at a hand's pace for its size (a few capitals a second, one to three seconds a heading), slowing into a letter's turns and running on along the line, eased at both ends (`paceOf`), its rope held close (0.3 of the sway and sag) over about a capital. The skein keeps each heading (`inscribe`) and measures it again whenever the page is laid out anew; each line's trace is kept by what makes its bitmap, so that costs a lookup. Measuring a heading the first time costs a median of about 20ms (`/projects`) to 40 to 50ms (`/writing`'s long post titles) in Chromium on the dev box (software-rendered: compare, do not quote), rarely past 200ms; a page's headings are measured as the drawing reaches them, never all at once except on a still screen. A heading is begun when the drawing reaches it, one per idle slot. A heading written on its own canvas (strung, or on the resume's sliding track, which it slides with) has the same material and a head of its own on the screen's one frame loop, and is written again, settled, when it is laid out anew (one observer an element, after the window has been still for 220ms). **Nothing shows before its thread:** the text of every written heading is transparent from the moment the screen is built, in CSS, before any script runs; it stays in the DOM and the accessibility tree, selects and is found. A heading gets its chalk back (`data-spun-state="chalk"`) if it cannot be traced, if writing it throws, if the face is not loaded within 2.5s (then every heading on the screen does), or if it sits in sight unwritten (begun anyway after 2.5s, chalk 2.5s later). Reduced motion and a still face get every heading written at once, those near the viewport first; a face the prism holds idle settles once all the same (a one-off settle, not an animation), so its headings are never left blank. Covers stay woven: a photograph has no centre line a single thread could follow legibly, and the picture itself returns on hover.

**Labels by thread too (round 4).** Burooj: the years on the resume and the project list, and the small headings across the site, were still type. Now every label is written by thread like a heading (`LABELS` in `HI/spun.ts`, added to `WRITTEN`, kept in step with the shell.css transparency rule): eyebrows, `.hion-meta` (a project's "date · kind", an update's date, a role's dates), the resume's years (`.hion-resume__when`, written though they are `aria-hidden`: the dates are read elsewhere), tags and link charms (`.hion-tag`), a project's meta terms (`.hion-tag--meta dt`; their values stay type) and its tools (`.hion-beads > li`). Each is written on a canvas of its own inside it (`writeLocal`), since most hang and sway; the canvas's holder is given `position: relative` only if it is not already placed. For a 3px thread to run up and down inside the letters, labels are set in capitals (the face's small capitals are too small inside), at 20px (was 13.8 to 18.4px; the resume's years keep their 24px), tracked 0.14em; the tilted "date · kind" on the home and project lists is set level; a meta term has room under it for its run. The lead-in before a word is shorter for a small word (`0.8 × size`, at most 36px) so it does not read as an underline. Headings and labels take the growing end of round 4 (the material lent to `writeLocal` has `tip` in place of the hot run and head). *Cost:* labels are larger and louder than they were, the tools on a project wrap sooner, and at 20px the writing is dense. Still type: the menu's names, the contact links and spoken lines in Spectral italic, and body text.

**Moving between screens (round 3: no ribbon).** Clicking a destination answers in the frame you clicked (`astro:before-preparation`): the old screen starts reeling up and the destination's charm drops while the router fetches the page. When the new screen comes it replaces the old one whole (no clip, no lingering copy, no woven hem band: Burooj did not like the weave pattern expanding at the foot of the screen), and the transition is its threads growing from the line: the hions set out from the charm's drop, the loom paced to them, the ground born behind them (above). The spun words (measured one at a time, written as the drawing reaches them) and the woven covers (a few rows a slice) are laid in idle time 270ms after the screen comes. The cloth swatches that hung under the names on the line (one per page's fabric, `HI/stitch.ts` sprites) were the last use of the cloth there; with light-only threads a grainy woven patch no longer belonged, so each name has a loose end of thread instead (`HI/nav.ts` `tail`, CSS `.hion-tail`): 3px of its hue with its light and a knot at the end, let down 10px, 22px when reached for, 46px for the page you are on (22px for the name on a phone's line, where the page's head hangs just under it). While Hion is mounted the router's native view transition is skipped: its snapshot froze the page for hundreds of milliseconds, for a crossfade `prism.css` already turns off.

**Text on the thread (`hion/text-on-thread`).** Where the words sit changed; what they read did not (the same parts, the same fields).

| Part | Where it hangs now | Built by |
|---|---|---|
| Page opening (eyebrow, h1, intro, actions; project/lab/post meta, links, tools) | Across the hions' way down from the current destination (drawn in toward the middle): the title hangs from a branch on the side with room, the intro is tied on at a `knot` station on the other side, pull-cords and tags hang under the title. Phones: one column, stepped a little | `S:opening`, `S:pageTitle` |
| About opening | Title and action-cord on the far side of the portrait, intro tied on at a knot on the near side; cyan circles the portrait | `S:about` |
| H9 updates, writing list, H11 Elsewhere | Strands, not loops: the hions run down together, knotted at each entry; the entry is tied on beside its knot by turns either side, date level with the knot, title beneath. Wide screens: each rides up beside the one before. Phones: one column, knots on the right | `S:knotted`, `S:home`, `S:writing` |
| Long reading (About, project, lab and post bodies, the resume's own body) | A ~60ch column held right of centre; h2s hang out past the cyan strand | `S:story`, `shell.css` |

**The resume as a timeline (`hion/resume-timeline`).** The resume is built from `content.resume`, no longer from `resume.html`; the hions are its time axis.

| Part | How it is drawn | Built by |
|---|---|---|
| Experience / Education headings | Strung on a weft thrown out from a knot (`data-spine="knot"`) on the hions' way down; on phones the knot sits at the right | `S:groupHead`, `.hion-resume__group` |
| Each role (`resume.role`) | Its own loop (by turns left and right on wide screens): the years it spans (`start`/`end`, or `start`–`ongoing` when current) written on the thread where the two part and circled by one hion (`data-orbit`, aria-hidden: the date line carries the same fact); the title strung on the loop's weft (`h3`), organisation (and `location`, linked by `url` when given) in hand beneath, then `dateLine`, then summary and bullets | `S:resume`, `S:record`, `S:span` |
| Each course (`resume.education`) | Knotted on the strand like updates: years level with the knot, name, organisation, date line, summary | `S:resume`, `S:knotted` |
| Tools (`resume.tools`) | Charms (`.hion-tag` drops) hung on cords woven across a loop under the strung heading; rows close together share one cord, so the lower row hangs on longer threads | `S:resume`, `.hion-row--charms` |
| Page body (`page.body`, "See the work") | The story loop | `S:story` |

No new weave kind: role loops are ordinary `loop` stations, years are `data-orbit` (as `/projects` years). `tools.sentence` is not shown: it is the same items written as a sentence. No new lens copy; no parity gaps.

The new marks are layout only: `data-spine="knot"` (the two meet and are tied there), `data-tie` outside a loop (a short thread to the hions at the element's first line) and wefts thrown from the hions to a heading beside them (`weave.ts`).

**The timeline across (`hion/resume-horizontal`, `hion/resume-phone`).** On any window tall enough to hold a role (`ACROSS` in `HI/track.ts`: at least 280px tall), phones included, the roles run across instead of down. Same parts, same fields, same order; only a window shorter than that keeps the vertical timeline above.

| What | How | Where |
|---|---|---|
| Scrolling | The section is as tall as the track is long (less a screen's width, plus a screen's height); its pin is sticky and clipped, and the track slides left by exactly how far you have scrolled into it. Wheel, trackpad, scrollbar, Page Down, Space and find-in-page all scroll the page as usual. Additions: a sideways swipe over the pin (passive listener) scrolls the page; on a touch screen the pin keeps the page's upright panning (`touch-action: pan-y pinch-zoom`) and a finger that sets off sideways (decided after 10px) is handed on as scrolling, with a short glide on a fling (none when still); 20px strips at the screen's edges (`::before`, clipped to its sides, coarse pointers only) are left to the browser's back and forward swipe; Left/Right step 45% of a screen while pinned, stopping at the ends; focus landing on something off to the side scrolls the page until all of it (a wrapped link's whole box) is in sight | `HI/track.ts` |
| Direction of time | Newest first, the content's own order: time runs right to left, from now back. Reading order, focus order and the vertical layout all agree | `S:resume` |
| Roles | Each loop turned on its side: the hions part at its left (years written just before, circled), run along its top (cyan) and foot (magenta), and meet at its right. Each role is widened until it stands within 80% of the pin's height and the room the track's padding leaves; widened, its record runs on in columns (`columns: 17rem`). Then each role drifts off the middle, by turns above and below (`top`, 7.5% of the pin's height at most, never past the room the track leaves it, so a fuller role drifts less): the thread rises or falls from one role to the next, leaving and arriving square to each (the loom's `hang` between stations). A wide, tall window keeps one drift's room when fitting; a phone gives up no width for it (upright it drifts about 40 to 60px; on its side about 15 to 25px). The track still slides only sideways: every role is whole in the window, so a vertical follow would add movement without showing anything more. On a phone held upright a role is about a screen wide (`100vw - 48px`); on a short window (under 600px tall: a phone on its side) the padding, title and record are smaller, and the menu's name hides once stowed so the track's top is clear | `.hion-timeline[data-timeline="across"]`, `track.ts:fit` |
| Threads | The track has its own loom reading across (`createLoom({ axis: "x", view })`: column tiles, reach along x, keyed to how far along the track is). `compose(track, ..., { axis: "x" })` reads the stations turned (x and y swapped), so the dance, loops and orbits are the vertical ones, then turns the marks back (`pastel.ts:turned`); headings across are strung on wefts level with their words (`acrossX`). Cords and ties are not read across | `HI/loom.ts`, `HI/weave.ts` |
| Joining the page | The section is a `data-spine="gap"` station on the page: the page's hions go in at its top over the track's knot and come out at its foot under where the track's turn down (`data-entry`/`data-exit`, set by `track.ts`), so they read as one pair turning to run along time and back down. Each loom keeps to its own: the nearest `[data-loom]` round a thing is the drawing it belongs to | `weave.ts`, `loom.ts` |
| Ground | The pin is black paper: the living cloth holds the whole section empty (`data-cloth-hold`), and life (tendrils, plucks) answers only the page's threads; hovering a strung title still ties a loop round it | `cloth.ts`, `life.ts` |
| Still (reduced motion, face) | The track still slides with your scrolling (that is your movement), the drawing is settled, and stepping and focus jumps are instant | `track.ts`, `loom.ts` |
| Window height | The pin is `100svh` (fallback `100vh`): the window with the browser's bars showing, so a URL bar sliding away leaves black paper under the pin rather than resizing the track | `.hion-timeline__pin` |
| Crossing the breakpoint | The screen is laid again when the window crosses `ACROSS` | `HI/index.ts:show` |

Courses and tools stay below the track, down the page: courses are not all dated, and tools are not time-tied.

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
| `resume.experience/education` (title; entries' id, title, org, start, end, current, dateLine, location, url, summary, bullets), `resume.tools` (title, items), `resume.ongoing`, `pages.resume.header/html` | `S:resume` |

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
8. **Nav**: no lens reads `site.nav` except HI. CC omits Writing from tabs; BP has no Say hello; CP's "Hello" and CC/BP's tab names ("Status") differ from Daylight's "Resume"/"Say hello".
9. **Project order**: Daylight Home sorts featured by `order` (3 items); JSON sorts by year; CP, CC, HI use the JSON order, so the featured set can differ from Daylight.

**Invented by a lens (not in `src/content/`)**

- CC: arcana card, "Confidant rank MAX", "Social stats", resume "Leader/Party/Study", "Work/Lab" odometer, "New message", calendar widget, calling-card letter copy ("To whoever has a project in mind...", paraphrasing `about.md`), request status "Open", Prev/Next pager, "Take your heart".
- CP (DAW rework): the whole music layer (key, changes, motifs, bass, bells), all derived from content and declared in 3.2; track numbers; the clip editor; view names on the keys ("session", "arrangement", "rack"…); "Clip notes", "Set notes", "Text view".
- BP: study-notes furniture ("in short" tag, sticky note, numbered headings), slip stocks and staples, page numbers, camp dot counts and hits (mean nothing), "(a quick war, during maths)", "Roll call", legend, the scribbles on the composition book's times table (`USED`: mean nothing).
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

**The resume is a page of About's (issue #25).** It is served at `/about/resume`; `/resume` (and `?page=resume`) redirect there permanently, query string kept (`vercel.json`, `src/lib/legacyRedirects.ts`, and `src/pages/resume.astro` for the app; `scripts/tests/redirect-parity.test.mjs` holds them together). `src/prism/routes.ts` classifies `/about/resume` as the `resume` kind and any other `/about/*` as `other`. `site.nav` no longer lists Resume, so no lens offers it as a top-level destination. Each lens's nav treats it as part of About:

- **Daylight:** the six balls are unchanged (Resume was never a ball); the About ball reads as current on `/about/resume`. About's "Experience & resume" pill, the home hero and the footer link to it.
- **Calling Card:** the Status tab is gone from the L1/R1 strip (Projects, Lab, About, Writing), About stays lit on the Status screen, and its Back prompt returns to About. The pause menu keeps its Status command, as a game's pause menu does.
- **Cut Paper:** the C · Resume key stays, so the keyboard is still the whole F major scale and each route keeps its degree; it is drawn as About's sub-view (indented and tied to B♭ · About, which stays half-lit while the resume is open).
- **Back Page:** unchanged in shape: the resume is stapled into the About book, and `/about/resume` opens the book at the first slip.
- **Hion:** with Resume off the line, About's charm hangs lowest on `/about/resume` (the current knot) and the resume ends with a thread back up to About, as a lab entry's leads back to the lab.

## 7. One window: the prism and the page (issue #28)

**The problem.** The prism showed the page you came from as a fresh copy in an iframe. That copy booted while the prism sat dormant, and the prism paused it the moment it loaded, so every face held its entrance at frame zero: the face you pulled out of was blank during the pull, then played its arrival (Daylight's sunrise and wave, Calling Card's letter hops, Hion's underlines) once the camera stopped. Stepping back in, the camera pushed into that copy and then swapped it for the real page, which was in a different state (no soldiers, since faces never run them; the playhead at today). Stepping into another lens mounted it cold, with its whole entrance (Calling Card's slide-ins, Cut Paper's views entering on sixteenths, Back Page's book coming onto the desk, Hion's slow first drawing, Daylight's arrival as its frame came back). The inside pose also hung the front face 8% of the viewport too high, so the swap jumped.

**Per lens, before.** Daylight: the face was a reload, its CSS arrival replayed; stepping in from another lens replayed it on the real page. Calling Card: `data-enter="in"` and the home fly-ins on the face and on every cold mount. Cut Paper: the face rested at today with no sound, while the page had been playing; a cold mount entered on sixteenths. Back Page: the face had no soldiers (faces never run them), so the war vanished on the way out and restarted on the way in; a cold mount opened the book. Hion: the face drew instantly but played its underlines; a cold mount drew slowly from the top.

**What we chose: keep the page alive and make it the face (`src/prism/live-page.ts`), plus a settled flag for everything that must still mount.**

- **The face you came from is the page itself.** On Prism Exit, `holdPage()` turns `<body>` into a viewport-sized sheet (fixed, scrolled inside to where the window was, the window's scroll range held so nothing on the page sees a scroll; fixed elements pinned where they were) and the camera carries it in 3D with the transform `pagePose()` folds from the stage's CSS (`src/prism/camera.ts`). Its face in the stage is clear glass (`.prism-face--live`, no iframe), so the sheen and dimming still fall on it. The room (`#prism-backdrop`: the dark and the whisper) sits under the page and the prism (`#prism-stage`) over it, both outside `<body>`; a face turned away from the eye is shaded all but transparent (not culled: see "Turning without pop-in" below), so no two visible faces overlap and no depth sorting against the page is needed. The page holds still while the camera moves or looks at another face, and runs while it is the face being looked at: soldiers keep fighting, the DAW keeps playing (silently: Burooj's call), Hion keeps weaving, on the prism. Stepping back in (Esc, or into that face) just lets go: same DOM, same scroll, same state, nothing remounts.
- **Everything else arrives settled.** A prism face and a lens stepped into from the prism are already on screen, so `<html data-prism-settled>` marks them (LensBoot for faces; the stage before `setLens`) and `ShellContext.settled` tells shells. Daylight's arrival CSS is gated on `:root:not([data-prism-settled])`; the runtime finishes any finite animation a settled mount started before it paints (`settle()` in `shell-runtime.ts`); and each shell skips the entrances it drives from script (Calling Card lands `calm` without the calendar flip, Cut Paper prints its view `live`, Back Page lays the book open, Hion draws what is in view at once). The mark is not carried across a navigation, so the next page's arrival plays.
- **The prism owns the keyboard while open** (a capture listener), so arrows and Esc no longer also turn Back Page's pages or press Calling Card's Back on the page underneath. B/J peeks and Daylight's page cover check `prism-is-open` as well as `data-prism-idle`, since the page can now be live under an open prism. Navigation is impossible while it is open (the page is inert); a browser back tears the prism down and lets go of the page first.

**Tradeoffs.**

- *Rejected: a "returning" flag alone.* It stops replays but cannot keep running state: faces never run soldiers or sound, so the war and the music would still reset on the way out and in. It was not the one window the issue asks for.
- *Rejected: keeping every lens's DOM alive behind the prism.* Shells are module singletons in one document, and five live lenses on one main thread would cost a phone dearly. Only the lens you were in is kept.
- *Crossing to another lens is a fresh, settled mount.* You land at rest on the face you walked through (same window scroll), but that lens's life starts from its beginning (a new war, the playhead at today), and the lens you left is unmounted. If you go back to it, it is fresh too.
- *Holding the body is invasive.* It rewrites `body`/`html` inline styles while open and pins fixed elements with `translate`; everything is restored on release, but a page that restyles `body` while the prism is open, or an element that turns fixed mid-prism, would be off until release. Classic scrollbars still vanish while open (pre-existing).
- *Cut Paper plays on, unheard.* Idling now pauses and remembers, so a session that was playing plays on (same region) when the page is looked at again, including on its face in the prism, where it is hushed; stepping back in, it is heard again. Turning to another face pauses it.

**What a lens must do (and Hion's rework, #20/#32/#35, in particular).** Read `context.settled` on mount and, when set, put the first screen up at rest: no arrival state, no slow first drawing, no script-driven entrance; keep running life (loops, idle handling, route changes) as usual. Pause loops on `onIdleChange(true)` and resume on `false`: the live page goes idle and wakes several times while the prism is open (every camera move, every turn away and back), and must pick up where it was, not restart. Anything `position: fixed` should stay fixed for the whole time the prism is open (it is pinned once, on Prism Exit). The Hion screen today: `show()` lands `data-state="here"` and passes `settled` to the loom (`loom.ts`), which draws to the view at once and then keeps pace with the reader.

**Guards.** `scripts/tests/prism-camera.test.mjs` (the live page's pose equals the stage's face in every pose, and inside it is exactly the viewport), `scripts/tests/prism-settled.test.mjs` (faces settled, the mark not carried across swaps, Daylight's arrival gated), `scripts/tests/initial-peeks.test.mjs` (no peek while the prism is open), and `scripts/tests/prism-window.browser.mjs` in `test:prism`: for every lens at desktop and phone, a round trip keeps the same nodes, the scroll (window or the lens's own scroller) and plays no entrance, the face you came from is the page not a frame, no face ever plays an entrance, and crossing into the next lens arrives settled.

### Turning without pop-in

**What Burooj saw.** Turning the prism, a face coming round showed up blank (or partly blank) and then filled in, like texture pop-in in a game. Faces used `backface-visibility: hidden`, so a face turned away from the eye was culled; Chrome's compositor doesn't keep a culled layer's tiles painted, so a face coming back round had to be painted at the moment it reappeared, partway through the turn. Until those tiles were painted, the compositor drew the face with holes in it (`PictureLayerImpl::AppendQuads checkerboard` in a trace, around 650ms into a 950ms turn, when the next face crosses the edge of the prism). It was worst on a hi-DPI desktop and on the busiest faces (Back Page, Hion).

**The fix.** No face is culled any more. Faces (and the live page) draw their backs (`backface-visibility: visible`), and the prism shades a face to `opacity: 0` while it faces away and back to 1 as it turns toward the eye, with step keyframes timed to the camera (`stage.ts: shade`, `camera.ts: facingTrack`). The switch lands while the face is edge-on, so it can't be seen, and always on the side where the face is away, so a back is never shown. A face at opacity 0 with a running opacity animation is kept painted by the compositor but costs nothing to draw, so the next face is painted before it comes round. At rest, a face turned away also keeps an opacity animation holding it at 0, so it stays painted between turns (see "Turning steadily" below).

**Tradeoffs.** Memory: the faces that come round during a turn stay painted. Frame cost: measured equal to before in headless Chromium (an earlier try at opacity 0.004, which draws the faces, cost frames). A first version left faces turned away between turns at plain `opacity: 0`, so they lost their tiles and were painted at the start of the next turn; holding them at 0 with a long opacity animation at rest, which keeps the compositor ticking while the prism is still, came later in "Turning steadily" below.

**Guard.** `scripts/tests/prism-window.browser.mjs`, "turning the prism paints no face late": a full turn of the prism in every lens (desktop, phone, and a 1440×900 desktop at 2× density) traced for late-tile draws. Culled faces gave 18 to 154; shaded, 0 to 12; the bar is 16. `scripts/tests/prism-camera.test.mjs` checks `facing` against how the browser would wind each face, and that the shading never shows a face from behind.

### Turning steadily (what was measured, what was changed)

Burooj still saw jitter while the prism turned, on every face, on a desktop GPU. Headless Chromium has no GPU here, so what can be measured is the work around a turn, not how smooth it looks. Per suspect:

- **The live page drifting from the prism: ruled out.** Sampled every frame of a turn, the corners of the live page and of its face as the stage draws it agree to 0.03px (desktop) and 0.26px (phone), and the two animations share one start time. Guarded by "the live page turns in lockstep with the prism" in `prism-window.browser.mjs`.
- **Animations on the main thread: ruled out.** Every animation in a turn reports `compositeFailed: 0`.
- **Main-thread work during a turn: small, unchanged.** Style, layout and paint happen at the turn's first frame and its last, not per frame; 0.6 to 1.8 long (>16ms) tasks a turn, before and after these changes.
- **Painting at the start of a turn: found, and moved.** Each turn opened with a burst of painting, a median of 118 tiles (81 to 206) in its first 150ms, competing with the turn's first frames (on a GPU, painting and drawing share the GPU). Three sources: the face coming round being painted only once the turn began, the glass overlays on each face being promoted to their own layers only while they faded (repainting the face under them), and the room's glow, a full-viewport gradient repainted in the new lens's colour. Now a face turned away at rest keeps an opacity animation that holds it at 0, so it is painted while the prism is still; the overlays stay on their own layers; and the glow is one layer per lens, crossfaded. The burst is now a median of 36 tiles (28 to 66); the painting happens at rest instead (21 to 37 tiles after each turn).
- **Raster scale changes mid-turn, sub-pixel snapping: not measurable here.** Painting during the rest of a turn is small (a median of 35 tiles before, 38 after, mostly at its end), so in Chromium's software path faces are not repainted at new scales while they turn. Whether a GPU shimmers as faces shrink to a third of their size (text minified without mipmaps) can't be seen without one.

The cost: while the prism is still, the faces that could come round next hold a running animation, so the compositor keeps ticking (the main thread's frame rate at rest was unchanged: 9 to 11 frames a second in headless).
