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
| G1 Site nav | Header link row: Home, Projects, Lab, About, Writing↗, Say hello↗; `SiteNav.astro` | Home: seven tilted "commands" (Projects, Lab, About, Status, Phone, Writing, Calling Card), hard-coded, `CC/home.ts:commandsFor`. Inner screens: L1/R1 tab strip Projects/Lab/About/Status, `CC/chrome.ts:tabs`. Writing absent from tabs; Resume renamed Status | Keyboard of seven solfege keys: Home, Projects, Lab, About, Resume, Writing, Hello, hard-coded, `CP/notes.ts:keysFor` | Five exercise-book tabs Hello/About/Resume/Lab/Projects, hard-coded, `BP/index.ts:renderTabs` (`TABS`); Writing only in home contents slip. No Home/Say hello tab | Charms hung from the cord: home charm (`site.name`) plus each `site.nav` item (Resume included), `HI/nav.ts:createNav`; hard-coded "Menu" pull. The only lens that reads `site.nav` |
| G2 Footer | Name, email, Resume, Style guide, "Thanks for stopping by." | — MISSING (no footer; email only inside the calling-card panel, `CC/panels.ts:cardPanel`) | — MISSING (email is only the href of the "Hello" key; no visible footer) | — MISSING (email only on the home cover/inside cover, `ch:returnTo`) | Partial: "Send a line my way" + email link + social drops + Writing, `HI/screens.ts:footer`. No name, Resume, Style guide or "Thanks for stopping by." |
| G3 Social links | GitHub/LinkedIn/Email + Resume on home hero | In the Calling Card panel only (mailto filtered, plus a hard-coded Writing row), `CC/panels.ts:cardPanel` | Home chips: all `site.social` incl. CodePen + hard-coded Resume, `CP/screens.ts:home` | Home cover/inside cover joined with " · ", mailto filtered, `ch:returnTo` | Home hero tag drops (minus CodePen, plus hard-coded Resume) and footer drops, `HI/screens.ts:home`, `footer` |
| G4 Writing link | Nav item + home "Writing" blurb | Command + panel row (`site.writingUrl`) | "Writing" key | Contents slip entry "Writing (Substack)" | Footer drop + home fork + nav charm |
| G5 Updates feed | Home stream only | Phone panel (full list), home phone chip + calendar widget (latest), `CC/panels.ts:phonePanel`, `CC/home.ts:home` | Global "Log" drawer + scrolling "Updates" score strip on every route, `CP/frame.ts:buildFrame` | Home diary only | Home stream only |

### 2.2 Home

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| H1 Greeting | `.greeting` paragraph, `WelcomeHero.astro` | — MISSING (home never reads `route.main`) | Kicker; read from `.greeting`, fallback string, `CP/screens.ts:home` | Hand-lettered page head; from `.greeting`, fallback, `ch:home` | Hard-coded "Hey there!" reveal line, `HI/screens.ts:home` |
| H2 Headline | h1 "Burooj here!" | Giant ransom-lettered h1 from `pages.home.headline`, `CC/home.ts:home` | h1 text from `route.main` h1, `CP/screens.ts:home` | h1 from `pages.home.headline`, first word blue and rest red, `ch:home` | `pages.home.headline` split into word signs on the threads, orbited by one thread, `HI/screens.ts:home` |
| H3 Occupation | "Frontend developer & designer" | `pages.home.eyebrow` ("Frontend Developer") as a plate: different string, `CC/home.ts:home` | `.occupation` line, `CP/screens.ts:home` | Typed line from `.occupation`, `ch:home` | Hard-coded copy of Daylight's string, `HI/screens.ts:home` |
| H4 Welcome line | "I make places on the web. Feel free to look around!" | `pages.home.intro` plate: a different sentence | `.welcome` text, `CP/screens.ts:home` | `pages.home.intro` lead paragraph: a different sentence, `ch:home` | Hard-coded copy of Daylight's string |
| H5 Home body copy (Daylight does not show) | — n/a | (+) Speech bubble "Burooj": first paragraph of `pages.home.body`, markdown stripped, second paragraph dropped, `CC/home.ts:home` | — | (+) Full `pages.home.body` rendered under the lead, `ch:home` | — |
| H6 Portrait | Peach circle photo + "That's me" -> /about | Posterised red/black cut-out, hard-coded path, `CC/portrait.ts`, `CC/home.ts:home` | Cut-paper figure; `src`/`alt` read from `.hello img`, `CP/screens.ts:home` | Taped photo, from `.hello img`, caption "that's me →", `ch:home` | Photo hung on two threads, hard-coded path/alt, caption "That's me", `HI/screens.ts:home` |
| H7 Hero socials | 3 links + Resume | — MISSING on home (see G3) | Chips (all of `site.social` + Resume) | — MISSING near the hero (cover/inside cover instead) | Tag drops minus CodePen + Resume |
| H8 Featured projects | "Some things I've built": feature + 2 rows, cover/meta/title/summary/3 tools; "All projects" link | — MISSING. Only a "★ NN Works + NN Lab" odometer from array lengths; projects live behind the Projects command, `CC/home.ts:home` | "Now spinning" turntable + "In the crate" sleeves of `featured` (else first 4), "Full setlist" link with count, `CP/screens.ts:home` | "Some things I've built" taped cover snaps (cover, title, `dateLabel`; no summary or tools) + "all of them, on the back page →", `ch:home` | `featured.slice(0,4)` as hanging charms: cover, `dateLabel · kind`, title, full summary, all tools; pull-cord "Follow the line to every project", `HI/screens.ts:workCharm` |
| H9 Updates stream | Heading, intro, up to 8 entries (kind/source labels, title link, `dateLabel`), caption, empty state | Phone chip (latest title, count) + calendar from latest date + full chat-bubble list in panel; no intro/caption/empty copy; invented "New message"/"Daytime", `CC/home.ts:home`, `CC/panels.ts:phonePanel` | Not a home section; global log drawer + score strip (title, date, kind, source, summary), `CP/frame.ts` | Diary list: date, linked title, summary, "source · kind", tally marks; all updates; hard-coded heading + subtitle, `ch:home` | Tie rows, `slice(0,6)`: raw `source · kind · dateLabel` + title link; heading + intro hard-coded; no summary/caption/empty, `HI/screens.ts:home` |
| H10 Currently note | bjslab paragraph + "More about me" | — MISSING | Taped aside cloned from `.current-copy`, cached in `Memory`; omitted if the visitor never saw home, `CP/screens.ts:home` | Aside "Currently: " + the `<p>`'s children; "More about me" link dropped, `ch:home` | Heading + first `<p>` of `.current-copy` (fallback `pages.home.intro`), hard-coded "More about me" pull-cord, `HI/screens.ts:home` |
| H11 Elsewhere blurbs | "In the lab" / "Writing" with one-line blurbs | — MISSING (command help lines paraphrase them) | — MISSING | — MISSING | Two hanging forks, copy hard-coded, `HI/screens.ts:home` |

### 2.3 Projects index

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| PI1 Header | Eyebrow "Projects", h1 "Things I've made, along the way.", intro | Constant title "Projects", invented eyebrow "Equip", Daylight h1 as subtitle, intro from `.page-header__intro`, `CC/projects.ts:projects` | `pageHead`: eyebrow/h1/intro from `route.main`, `CP/screens.ts:projects` | h1 + intro from `route.main`; eyebrow replaced by invented "Projects · the back page", `ch:projects` | `pageHead` from `route.main` (fallbacks hard-coded), `HI/screens.ts:projects` |
| PI2 Year headings | h2 per year | — MISSING (per-slot year only) | — MISSING (year ruler 2021 to 2027 plus "now" playhead instead) | Year mark in margin of war map and roll call; no headings | Year loops with h2 year, circled in turn, `HI/screens.ts:projects` |
| PI3 Project entry | Row: meta `dateLabel / kind`, title link, summary, 3 tools, cover | Equipment slot: year, ★, kindLabel ("Selected/Project/Arcade"), title; summary and cover only in the selected-slot detail panel (all tools, Role, Where), `CC/projects.ts:slots`, `detailPanel` | Sequencer track row: number, cover, title, `dateLabel · kind`, summary, tools, clip with piano roll positioned by `yearPosition`, `CP/screens.ts:projects` | "Roll call" row (year, title, `dateLabel`, "· arcade") + war map camp of dots per project; no summary/cover/tools, `ch:projects`, `ch:warMap` | `workCharm` per project: cover, `dateLabel · kind` (Daylight: role), title, full summary, all tools, `HI/screens.ts:workCharm` |

### 2.4 Project detail

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| PD1 Eyebrow/title/summary | Eyebrow `kind`, h1, intro | Category line "kindLabel ★ dateLabel", ransom h1, summary, `CC/projects.ts:projectEntry` | Eyebrow "Setlist · track NN / MM · kind", h1, lede, `CP/screens.ts:project` | Eyebrow "`kind` · from the archive / selected work" (invented), h1, lead, `ch:project` | Eyebrow `kind · year`; title/intro from main h1, `HI/screens.ts:project` |
| PD2 Role/Where/When | Three labelled blocks | "Item file" stat rows, hard-coded labels | "Credits" rows (labels hard-coded) | `<dl>` fields, labels hard-coded | Meta tags read generically from `.entry-page__meta`, `HI/screens.ts:tagsRow` |
| PD3 Links | Action buttons (new tab) | "Shop cards" with invented verbs "Open"/"Get" | Buttons; first highlighted | Arrow list | Pull-cords |
| PD4 Tools | Passive tag list | Chips (all) | Credits row "Tools" (comma list) | Circled list | Beads, aria-label "Tools" (not "<title> tools") |
| PD5 Media | Rail of figures (img/video, captions) | Lead = `media[0]` (or `cover` if none), rest in a rail; captions kept, video ok | "Inserts" figures; first media dropped if equal to cover; captions kept | Taped figures; caption = `caption ?? alt` (alt leaks as caption); video ok | Hung pictures with captions, **videos break** (reads `figure img` only: empty-src image), cover fallback, `HI/screens.ts:gallery` |
| PD6 Prose body | `.prose` | `.prose` cloned as notes | "Liner notes" (moved, not cloned) | Moved into paginated blocks, classes stripped | Story loop; h2 wefts, external links re-targeted |
| PD7 Back link | "Back to all projects" | "Back" (sr-only " to Projects") | "Back to the setlist" | "← back to the war (all projects)" | "Back to / Every project" end tassel (+ Newer/Older) |
| PD8 Cover, status, tags, year | Not shown on the page | Cover as media fallback; status/tags — n/a | Cover as record sleeve (+); tags as "Filed" (+); status — n/a | Kind/year/status drive eyebrow and camp colour; year not printed | Year in eyebrow (+); cover as gallery fallback |
| Invented | — | Prev/Next pager | Prev/Next transport | Own camp corner SVG | Newer/Older along the line |

### 2.5 Lab index

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| LI1 Header | Eyebrow "Lab", h1, intro | Constant "Lab", eyebrow "Requests", subtitle = Daylight h1, intro in a "The Lab" dialogue box, `CC/lab.ts:lab` | `pageHead` from main | h1/intro from main; eyebrow replaced by "Lab · in the margins" | `pageHead` from main |
| LI2 Entry | Card: cover, `type · sourceEra`, title link, summary | Request card: No.NN, constant "Open" stamp, "Client" (=`sourceEra`) and "Type", title, summary, "Accept" prompt; cover — MISSING, `CC/lab.ts:lab` | "Presets" drawer item: `type · sourceEra`, title link, summary, generated art instead of cover (cover — MISSING), `CP/screens.ts:lab`, `labVisual` | Article with doodle, h2, summary, `type · sourceEra`; cover — MISSING, `ch:lab`, `ch:labCard` | Hanging charm: `type · sourceEra`, title, summary; cover — MISSING, `HI/screens.ts:lab` |
| LI3 "More sketches on CodePen" | Link | — MISSING | Moved in from `.lab-more` | — MISSING | Hard-coded pull-cord + URL |
| LI4 Aside | Paragraph with Projects + Style Guide links | — MISSING | Moved in from `.lab-aside` | — MISSING | Cloned from `.lab-aside`, links kept |

### 2.6 Lab entry (dormant route)

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| LE1 Eyebrow/title/summary | "Lab", h1, intro | "Request No.NN" + "Open" stamp, title, summary, `CC/lab.ts:labEntry` | Eyebrow "Lab · preset NN", h1, lede, `CP/screens.ts:labEntry` | Hard-coded "Lab", title/summary from main, `ch:labEntry` | Hard-coded "Lab", title/intro from main, `HI/screens.ts:labEntry` |
| LE2 Type/Era | Labelled blocks | "Type" and "Client" (renamed) | "Type", "Era" credits | `<dl>` Type/Era | Tags Type/Era |
| LE3 Links | Action buttons | Shop cards "Accept"/"Get" (+ dead "Open the experiment") | Buttons (+ dead "Open the sketch") | Arrow list (+ synthesised "Try it on {sourceEra}") | Pull-cords (+ dead "Open the live experiment") |
| LE4 Media | Rail | — MISSING | — MISSING | — MISSING | Gallery from `.media-rail figure` (shown) |
| LE5 Prose | `.prose` | Cloned | Moved | Moved | Story loop |
| LE6 Cover | Not shown | (+) Shown (`entry.cover`, empty alt) | (+) Generated preset plate | — n/a | — n/a |
| Back link | none | "Back" | "Back to the presets" (+) | via book nav | "Back to / The whole lab" (+) |

### 2.7 About

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| AB1 Header | Eyebrow "About", h1 "Burooj, again!", intro, action "Experience & resume" | h1 + intro from main; eyebrow replaced by invented "Confidant · The Fool · Arcana 0"; action as "Next" card, `CC/about.ts:about` | Eyebrow, h1, intro from main; action buttons, `CP/screens.ts:about` | h1 + intro from main, no eyebrow; first action becomes P.S. link (lowercased), `ch:about` | `pageHead` from main; first action as pull-cord, `HI/screens.ts:about` |
| AB2 Prose | Sections | Each block cloned into a "Burooj" dialogue; h2-h6 flattened into "Rank N" plates | `.prose` as-is | `.prose` moved into letter pages | `.prose` clone |
| Invented | none | Arcana card, "Confidant rank MAX" pips, "Social stats" pentagon, bust portrait | Torn-poster portrait with "Play. Build. Repeat." tag | "Dear reader," / "Yours, Burooj" letter frame | Portrait (hard-coded) |

### 2.8 Resume

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| RS1 Header | Eyebrow "Resume", h1 "Burooj Rashid", intro | "Status" screen: h1 + intro from main; eyebrow dropped, `CC/resume.ts:resume` | `pageHead` from main, `CP/screens.ts:resume` | Typed contact line: title + intro, `ch:resume` | `pageHead` from main |
| RS2 Contact actions | Email, LinkedIn, GitHub | All, as a "Contact" list | All, as chips | All, joined with " · " | **Only the first (email)**, as a pull-cord; LinkedIn and GitHub — MISSING |
| RS3 Experience | h2 + h3 role entries, dates, bullets | "Party member" rows (role/org split on " · ", `<em>` date, "Leader" tag on the first), `CC/resume.ts:row` | "Side A" with numbered "cuts" (h3 split on " · "), `CP/screens.ts:resume` | Prose moved onto typed paper | Prose; h2 strung, h3 knotted |
| RS3 Education | h2 + entries | Same rows, tag "Study" | "Side B" | same | same |
| RS3 Tools | Paragraph | ★ chips (flattened, split on commas / "and") | "Side C" prose | same | same |
| RS3 See the work | Paragraph + links | Dialogue box "Burooj" | "Side D" prose | same | same |

### 2.9 Other (404, style guide)

| Part | Daylight | Calling Card | Cut Paper | Back Page | Hion (provisional) |
|---|---|---|---|---|---|
| OT1 404 text | "404 / That page wandered off. / ... / Return home" | Whole `route.main` moved onto a "Mementos / Document" sheet, `CC/other.ts:other` (full fidelity) | Moved onto a "sheet clipped to the stand", `CP/screens.ts:sheet` (full fidelity) | "Loose sheet" tucked into the book, `ch:loose` (full fidelity) | **Rewritten**: eyebrow "A loose end", new intro, "Follow the threads home" replacing "Return home", `HI/screens.ts:other` |
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

**content.json reads**

| Field | Where |
|---|---|
| `site.name` | `frame.ts:77`, `screens.ts:720` |
| `site.email` | `notes.ts:68` (mailto only) |
| `site.writingUrl` | `notes.ts:61` |
| `site.social[]` | `screens.ts:132` |
| `pages.home.headline/eyebrow/intro` | `screens.ts:123-125` (fallbacks only) |
| `pages.about.title/description` | `screens.ts:659,688` (fallbacks only) |
| `projects[]`: slug, href, title, summary, kind, year, dateLabel, role, location, tools, featured, cover, links, media, tags | `screens.ts` (`home`, `projects`, `project`) |
| `projects.length`, `lab.length` | `notes.ts:47,54`, `screens.ts:286,600` |
| `lab[]`: slug, detail, href, title, summary, type, sourceEra, links | `screens.ts` (`lab`, `labEntry`) |
| `updates[]`: kind, source, title, date, dateLabel, summary, href; `.length` | `frame.ts:129-148,178-191` |

Never read: `site.nav`, any `pages.*.body`, `pages.resume.*`, `pages.*.availability`, `projects[].status/order`, `lab[].cover/media/order`, `updates[].linkLabel/relatedProject`.

**route.main selectors**

| Selector | Where | Depends on |
|---|---|---|
| `.greeting`, `.occupation`, `.welcome`, `.hello img` | `screens.ts:122-126` | `WelcomeHero.astro`, `Portrait.astro` (fallback strings if absent) |
| `h1` | `screens.ts:123,321,659,805` | page headings |
| `.current-copy` | `screens.ts:127` | `CurrentNote.astro` |
| `.page-header__intro`, `.page-header__eyebrow` | `screens.ts:322,329,688,686` | `PageHeader.astro` |
| `.timeline` + `.previousElementSibling` | `screens.ts:419` | **dead**: `.timeline` is first child in Daylight, so the trail never renders |
| `.prose` | `screens.ts:507,646,705,733` | `<article class="prose">`; resume split walks direct children `H2`, `H3`, `P`, `P > EM` (`:740-777`) |
| `.lab-more`, `.lab-aside` | `screens.ts:582-583` | `lab/index.astro` |
| `.entry-page` | `screens.ts:622` | existence check |
| `.page-header__actions a` | `screens.ts:662,721` | `PageHeader` actions slot |
| `[aria-labelledby]`, `[id]` | `screens.ts:67-68` | adoption of moved fragments |
| whole `route.main` (moved, not cloned) | `screens.ts:802` | fallback sheet |

`take()` moves nodes out of `route.main`, so re-rendering the same `route` finds `.prose`, `.lab-more`, `.lab-aside` empty.

**Hard-coded strings**

| file:line | String | Kind |
|---|---|---|
| `CP/frame.ts:78` | "Burooj." | duplicates name |
| `CP/frame.ts:84` | "burooj" | chip |
| `CP/frame.ts:86` | "frontend developer" | paraphrases occupation |
| `CP/frame.ts:95` | "c major" | invented |
| `CP/frame.ts:97` | "120 bpm" | invented |
| `CP/frame.ts:67` | "Log" | flavour for updates |
| `CP/frame.ts:226` | "Updates" | score strip |
| `CP/notes.ts:41` | "Home", "/" (nav labels `:41-67`) | duplicates nav |
| `CP/notes.ts:47` | `${n} tracks` (`:54` `${n} presets`) | derived hint |
| `CP/notes.ts:56` | hint "poster" (`:57` "credits", `:63` "substack", `:70` "email") | invented |
| `CP/notes.ts:67` | "Hello" | invented nav label (Daylight: "Say hello") |
| `CP/screens.ts:122` | "Hey there!" | duplicates `WelcomeHero.astro:17` |
| `CP/screens.ts:123` | "Burooj here!" | duplicates |
| `CP/screens.ts:124` | "Frontend developer" | fallback |
| `CP/screens.ts:133` | "Resume" | duplicates hero link |
| `CP/screens.ts:235` | "Now spinning" | flavour |
| `CP/screens.ts:280` | "In the crate" | flavour |
| `CP/screens.ts:285` | "Full setlist" | replaces "All projects" |
| `CP/screens.ts:173` | "Liner notes" | flavour |
| `CP/screens.ts:429` | "Setlist, newest first" | replaces "Project history, newest first" |
| `CP/screens.ts:494` | "Setlist" | flavour eyebrow |
| `CP/screens.ts:497` | "Credits" | flavour |
| `CP/screens.ts:503` | "Filed" | flavour label for tags |
| `CP/screens.ts:524` | "Back to the setlist" | replaces "Back to all projects" |
| `CP/screens.ts:593` | "Presets" | replaces "Selected experiments" |
| `CP/screens.ts:597` | "anim", "freq", "color", "popup", "scope" | fake drawer tabs |
| `CP/screens.ts:623` | "Open the sketch" | dead path |
| `CP/screens.ts:647` | "Back to the presets" | invented |
| `CP/screens.ts:669` | "Play." / "Build." / "Repeat." | invented poster tag |
| `CP/screens.ts:684` | "Burooj Rashid wearing round sunglasses" | duplicates Portrait alt (about hard-codes it) |
| `CP/screens.ts:751` | `Side ${A..D}` | flavour section labels |
| `CP/screens.ts:821` | "clipped to the stand" | flavour |

Derived "content": `yearPosition(dateLabel, year)` places clips on a fixed 2021 to 2027.5 range (`screens.ts:311-317`), so a 2028 project falls off the ruler; Update kind to note mapping (`notes.ts:80-85`); lab visual chosen by regex over slug/type (`screens.ts:540-558`); piano-roll art seeded from slug; track numbers by index.

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

How a branch leaves: only from a point its parent has already grown; forward along the parent, at a slant (about 20 to 50 degrees), never back and never square; turned down the page rather than up; its first stretch keeps clear of its parent so the join reads as a fork; it lies at full strength where it leaves (no fade-in there), so the join never reads as a gap. How it ends: a twig thins out in open paper; a branch with a purpose ends where its work is (past a written word, in a knot by a strung heading, at its end in a knot); a hover branch withdraws into its root. One rule for every branch's way to a thing (`rootFor`): the best grown point within reach that it can leave forward from, along a curve that leaves along the parent and arrives going the way the thing is written, weighed by length, by how much of it would cross words (all but forbidden, sampled every 8px), by its hue (a heading prefers its own), and by how deep in the tree it is. With nothing grown in reach yet, it leaves the nearest point of a hion's way (the hion is never far behind).

One brightness and one material: every kind lies at body 1 with the same glow; the split between bright hions and a dim ground is gone. A growing head is not a hot nib: the newest stretch is the youngest, so the faintest, ripening to full light behind the tip (`skein.ts` `ripen`); a heading being written keeps its warm hand. Shallow crossings (under about 24 degrees) no longer break the thread that goes under, so bundles at full brightness do not read dashed. At full brightness the ground is sparser than the dim one was: buds every ~220px of a hion's way (260 on a phone, 1.6x seen close); home is busier by growing longer after input and trickling sooner, not by more buds.

A tap sends out a pair: a branch off each tree grows out through where you tapped and carries on, the way it was going, into the nearest other branch ahead (of the other tree by preference; never the thread it grew from or any it came from, nor anything within 140px of where it left), weaving over and under along it, onward, for 160 to 300px; it never goes back, but lies as the ground does and fades as it does, leaves first (`skein.ts` `sendOut`; eight lying at most, the oldest fading first). A tap on a thread (within 24px) also plucks it: it rings where it was struck, and light runs from there both ways along it and on through the tree, into every branch whose root it passes and back into the parent when it reaches a branch's root (`skein.ts` `light`, `stepLights`). Brushing a thread slowly with a fine pointer sends gentler light the same way (a thread answers once a second). `life.ts` no longer has plucks, runners or dust; its chase sends light down both hions (`skein.chase`).

Only body text is type (paragraphs, intros, summaries, bullets, captions, links inside prose). Body text is Literata (`lenses/hion.css`, `--hion-serif`): low in contrast and naturally bold, so it holds its own on black beside the threads where Spectral's hairlines shimmered and read as a footnote. Reading 600 at 1.3rem (1.35rem for intros, the welcome and long reading; 1.15 and 1.2rem on a phone; summaries 0.92 of that), small titles 700, strong words 800, what is said in type in its 500 italic; leading 1.6. The things said (the greeting, the role line, the portrait's "that's me", the foot's call) are written by both trees at once, in the label face: a branch off each, the other's twisted round the first along the run under the letters' feet, each going under the other by turns, and the cyan and the magenta on top letter by letter up through the letters, so each letter stays one clean stroke (`skein.ts` `SAID`, `twisted`, `twins`). A label whose only text is hidden from a screen reader (a date said elsewhere) is drawn from that text. The menu's names on a phone, folded away when the screen is built, are written when the menu is first let down. Every heading and every label is written by thread (`spun.ts` `WRITTEN`, `LABELS`, kept in step with `shell.css`): eyebrows, dates, years, meta lines, tags, pull-cords and links on, table heads, the foot's links and address, the names on the line and the word under the menu's tassel (`spinNav`). A label that hangs on a drop or pull-cord of its own is written on a canvas inside it (it swings) on from the knot its drop ends in: `ink.ts` hangs such a drop by the label's corner, just before its first letter, with no knot at its end, and notes the point (`data-knot`); the thread goes straight down into the line under the letters and turns into it at a tight corner where the first letter rises (`spun.ts` `onFrom`, `bend`); a knot over the word goes round above the first letter instead, never through it. A label on the resume's track comes in off the track's own threads (the circle round its year, the strand down its role's side). Any other label is a branch grown to it, like a heading. A 3px thread writes Aboreto's capitals legibly from about 24px, so no label is set smaller (`--hion-label-least`; at 20 to 22px a U read as a Y and a D as a P); below 1240px the name in the middle of the line hangs under the row so the names do not run together; long link labels may break anywhere on a phone. Labels are written at a quicker hand than headings (0.6 to 1.6s). The tracer leaves a bowl's foot from its middle, not from the corners under its stems (`trace.ts`: a flat foot's node is the middle of where it lies lowest; a bowl's bottom run between two corners gets a node in its middle; a drop from a corner under a stem, or from a terminal high in a letter that has a foot, costs more than going back to the foot).

Costs (dev servers side by side, software-rendered, single machine; relative only): main-thread busy while arriving and just after scrolling is about 1.5 to 1.9x `hion/thread-titles`, scrolling and brushing about 1.1 to 1.25x; 10s after the last input a screen is as idle as before. Pictures keep their drops and wraps (now grown) and the hions' circles; no permanent ring branch was added round them (it would add a lot of line at full brightness).

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

**Type: Stele (`hion/type-fate`).** Fate, not warmth: one inscribed voice in two faces, set by the variables at the top of `HI/shell.css` and imported (Latin only) in `lenses/hion.css`. Aboreto (thin, wide capitals cut like a stele, one weight) is the face of every heading, since every heading is written by thread (below): the home words, page and project titles, strung section headings, role, course, update and post titles, the "In the lab" / "Writing" forks, prose h2 to h6, the 404. A thread has one weight, and so has Aboreto: its thin monoline capitals are what lets one thread along a letter's centre line read as the letter (Spectral 600 traced at 22px came out a blur of serifs and counters). The small headings are a little larger than the reading face had them (update and course titles and prose h3 1.5rem, h4 to h6 1.4rem) and tracked 0.06em, so a 3px thread has room inside a capital and between two. Aboreto also writes the labels (charms, dates, tags, the menu), tracked open, at least ~13.5px. `--hion-head` (Spectral 600) is left for what is not a heading: the footer address and the links on to the next and previous entry. Reading is Spectral 400; the spoken lines (Hey there!, the role line, captions) are Spectral light italic. Only the shipped weights are ever asked for (`font-synthesis: none`). The DOM text keeps its own case (Aboreto draws lowercase as capitals), so screen readers and copy are unaffected. Spun titles sit about a fifth smaller than the Alegreya ones did, as the capitals are wide.

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

**Headings spun from thread (`hion/thread-titles`, the title kind).** Every heading on a screen is written by one thread of its hue, after Okushita's one-line films (a single line runs along and rises into each figure, then runs on); only body text is type. What is written is `WRITTEN` in `HI/spun.ts` (h1 to h6 in `main`, and the update titles, which are paragraphs), kept in step with `HI/shell.css`: page and project titles, the home words (one thread each), strung section headings, role and course titles, update and post titles, the forks, prose h2 to h6, the 404. `HI/spun.ts` reads a heading's letters off the page as a bitmap, a line at a time, in the real face; `HI/trace.ts` thins them to their centre lines, reads those as a graph (ends, junctions, sharp corners and the foot of a round letter, joined by runs) and draws each letter as one stroke through its runs; between letters the thread runs along a line under the feet (2.2 stroke widths, at least 2.6 thread widths), straight down to it and straight up from it. Its one rule: no thread stands where a letter has no ink. A connector that would (the drop from the top of an S that read as an I beside it, the rise into the end of a C that made it a Q, the foot of an L bent down to the line) costs four times its length against going back along what is drawn to leave from a lower node, so the thread nearly always doubles back instead; short out-and-back spurs are taken off, and ends are only extended at terminals (the stubs on B and R). Punctuation is beads and loops, never a letter's stroke: a full stop is a knot, the dot of a "!" a ring with the bar as a narrow loop above it, a colon two rings, an apostrophe or hyphen tied to the nearest letter and drawn out from it and back. A heading of several lines is one thread as a weft goes (`joinLines`): every other line is traced mirrored and written back right to left, and each line turns down into the next at the side, beyond both, so no run goes back along a line already written; multi-line headings have a little more leading (1.18 to 1.32) so each run lies under its own line. A heading strung on a weft is written by the weft: `HI/weave.ts` stops the weft (and its glow) short of the words either side in a knot, and the thread sets out from the knot before and ends in the knot after, in the weft's hue (`data-weft-hue`), written on a canvas of its own inside the heading, over the heading's black box (which keeps the hions and the weft behind the words). Otherwise the thread comes off the nearest drawn hion of its hue when one runs near on the heading's own side (never across its words), otherwise in from the page's left edge when the heading is near it, otherwise from a little before the word; it runs a little past the last letter and ends. Any other heading is a strand like every other (hot head, rope, one material, laid on the ground as it cools, never fades) of the one 3px width (`THREAD`), so a hover loop weaves over and under thread letters and a thread from a click winds through them. It is written at a hand's pace for its size (a few capitals a second, one to three seconds a heading), slowing into a letter's turns and running on along the line, eased at both ends (`paceOf`), its rope held close (0.3 of the sway and sag) over about a capital. The skein keeps each heading (`inscribe`) and measures it again whenever the page is laid out anew; each line's trace is kept by what makes its bitmap, so that costs a lookup. Measuring a heading the first time costs a median of about 20ms (`/projects`) to 40 to 50ms (`/writing`'s long post titles) in Chromium on the dev box (software-rendered: compare, do not quote), rarely past 200ms; a page's headings are measured as the drawing reaches them, never all at once except on a still screen. A heading is begun when the drawing reaches it, one per idle slot. A heading written on its own canvas (strung, or on the resume's sliding track, which it slides with) has the same material and a head of its own on the screen's one frame loop, and is written again, settled, when it is laid out anew. **Nothing shows before its thread:** the text of every written heading is transparent from the moment the screen is built, in CSS, before any script runs; it stays in the DOM and the accessibility tree, selects and is found. A heading gets its chalk back (`data-spun-state="chalk"`) if it cannot be traced, if writing it throws, if the face is not loaded within 2.5s (then every heading on the screen does), or if it sits in sight unwritten (begun anyway after 2.5s, chalk 2.5s later). Reduced motion and a still face get every heading written at once, those near the viewport first. Covers stay woven: a photograph has no centre line a single thread could follow legibly, and the picture itself returns on hover.

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
   - Updates intro/caption/empty text: CC, CP, BP drop them; HI drops caption/empty and shows 6 of 8.
   - Update kind/source labels: HI, CC and BP show raw slugs ("pull request", "github"); CP shows lowercased slugs.
   - Hero greeting: CC drops it.
3. **Projects**:
   - Year headings are lost in CC, CP, BP.
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
- CP: "c major / 120 bpm", note and Hz tables, "Side A to D", fake drawer tabs, "Play. Build. Repeat.", "Filed", track numbers, preset numbers, key hints ("N tracks").
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
