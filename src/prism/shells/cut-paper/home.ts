/** Home: the set info, a turntable and the crate beside it. The record on
 * the platter is a project's clip: press it and it plays that clip's motif
 * over the chords at its date, the record turning while it sounds. Picking
 * a record from the crate swaps it onto the platter and plays it. Press
 * Play and the turntable follows the playhead through the career, putting
 * each project's record on as the playhead reaches its clip. The locators
 * (recent updates) sit underneath; each date moves the playhead there. */
import { part } from "../../parts";
import { featured, fill } from "../rich";
import type { Project } from "../types";
import { auditionClip, bar, heading, inlineCopy, noteVar, playButton, roll, scrap, screen, spell, type Env, type Screen } from "./bits";
import { h, link, markup } from "./dom";
import { MONTH, type Clip } from "./score";

/** How long a clip sounds when auditioned, in ms (a year is three seconds). */
const heard = (clip: Clip) => (clip.end - clip.start) * 3000;
/** A mouse resting on a crate record this long picks it. */
const DWELL = 110;

function hero(env: Env) {
  const { content, copy } = env;
  const { hero } = content.pages.home;
  const h1 = heading(hero.headline, "cp-home__title", "page.title", "home");
  const links = [
    ...content.site.social.map((item) => ({ label: item.label, url: item.href })),
    ...hero.links.filter((item) => !content.site.social.some((s) => s.href === item.href)).map((item) => ({ label: item.label, url: item.href })),
  ];
  const section = h(
    "section",
    { class: "cp-home__hero", "aria-label": copy.home.info },
    scrap("tomato", "torn", "cp-home__scrap-a"),
    scrap("plum", "stairs", "cp-home__scrap-b"),
    scrap("mustard", "tri", "cp-home__scrap-c"),
    h(
      "figure",
      { class: "cp-polaroid", ...part("home.portrait") },
      h("img", { src: hero.portrait.src, alt: hero.portrait.alt, width: 1080, height: 1920, decoding: "async" }),
      h("figcaption", null, link(hero.portrait.href, {}, hero.portrait.caption)),
    ),
    h("p", { class: "cp-home__greeting", ...part("home.greeting") }, hero.greeting),
    h1,
    h("p", { class: "cp-home__role", ...part("home.occupation") }, hero.occupation),
    h("p", { class: "cp-home__welcome", ...part("home.welcome") }, hero.welcome),
    h("ul", { class: "cp-chips", ...part("home.links") }, links.map((item) => h("li", null, link(item.url, { class: "cp-chip" }, item.label)))),
  );
  return { section, h1 };
}

function turntable(env: Env) {
  const { content, copy, session, transport, signal, face, reducedMotion } = env;
  const words = copy.home;
  const records = featured(content);
  const clipOf = (p: Project) => session.clips.find((c) => c.id === `project:${p.slug}`);
  const bySlug = new Map(content.projects.map((p) => [p.slug, p]));

  /* the deck */
  const label = h("span", { class: "cp-tt__label" });
  const record = h("span", { class: "cp-tt__record" }, label, h("span", { class: "cp-tt__sheen" }), h("span", { class: "cp-tt__spindle" }));
  const platter = h("button", { type: "button", class: "cp-tt__platter", disabled: face }, record);
  const deck = h(
    "div",
    { class: "cp-tt__deck" },
    h("span", { class: "cp-tt__mat", "aria-hidden": "true" }),
    platter,
    markup(
      '<svg class="cp-tt__arm" viewBox="0 0 100 100" aria-hidden="true"><circle class="cp-tt__pivot" cx="86" cy="14" r="6"/><path class="cp-tt__rod" d="M86 14 L84 58 L66 76"/><path class="cp-tt__head" d="M62 72 l8 8 l-5 5 l-8 -8z"/></svg>',
    ),
    h("span", { class: "cp-tt__speed", "aria-hidden": "true" }, words.speed),
  );
  const title = h("h2", { class: "cp-label cp-tt__state", id: "cp-tt-title" });
  const when = h("p", { class: "cp-tt__when" });
  const name = link("/", { class: "cp-tt__link" });
  const sum = h("p", { class: "cp-tt__sum" });
  const strip = h("div", { class: "cp-tt__roll" });
  const voice = h("p", { class: "cp-tt__voice" });
  const open = link("/", { class: "cp-btn cp-btn--lit" }, words.open);
  const section = h(
    "section",
    { class: "cp-tt", "aria-labelledby": "cp-tt-title" },
    title,
    deck,
    h("div", { class: "cp-tt__meta" }, when, h("h3", { class: "cp-tt__title" }, name), sum, strip, voice, open),
    h("div", { class: "cp-tt__follow" }, playButton(env, words.play), h("p", null, words.follow)),
  );

  /* the crate */
  const sleeves = new Map<string, HTMLButtonElement>();
  const crate = h(
    "ul",
    { class: "cp-crate__list" },
    records.map((project, index) => {
      const sleeve = h(
        "button",
        {
          type: "button",
          class: "cp-crate__rec",
          "aria-label": fill(words.cue, { title: project.title }),
          "aria-pressed": "false",
          disabled: face,
          style: `--note:${noteVar(content.projects.indexOf(project))}`,
        },
        project.cover
          ? h("img", { class: "cp-crate__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" })
          : h("span", { class: "cp-crate__art", "aria-hidden": "true" }),
        h(
          "span",
          { class: "cp-crate__copy" },
          h("span", { class: "cp-crate__title", ...part("project.title", project.slug) }, project.title),
          h("span", { class: "cp-crate__meta" }, `${project.dateLabel} · ${project.kind}`),
        ),
        h("span", { class: "cp-crate__side", "aria-hidden": "true" }, fill(words.side, { n: index + 1 })),
      );
      sleeves.set(project.slug, sleeve);
      return h("li", null, sleeve);
    }),
  );
  const crateSection = h(
    "section",
    { class: "cp-crate", "aria-labelledby": "cp-crate-title" },
    h("h2", { class: "cp-label", id: "cp-crate-title" }, words.crate),
    crate,
    link(
      content.pages.home.work.link.href,
      { class: "cp-crate__all" },
      words.setlist,
      h("span", { class: "cp-crate__count" }, String(content.derived.counts.projects)),
    ),
  );

  /* state: what is on the platter, and whether it turns */
  let current: Project | undefined;
  let hearing = 0;
  let following = false;
  const paint = () => {
    const spinning = hearing > 0 || following;
    deck.toggleAttribute("data-spin", spinning);
    title.textContent = spinning ? words.spinning : words.platter;
  };
  const put = (project: Project) => {
    current = project;
    const clip = clipOf(project);
    const index = content.projects.indexOf(project);
    deck.style.setProperty("--note", noteVar(index));
    section.style.setProperty("--note", noteVar(index));
    label.style.setProperty("--cover", project.cover ? `url("${project.cover}")` : "none");
    platter.setAttribute("aria-label", fill(words.spin, { title: project.title }));
    platter.title = fill(words.spin, { title: project.title });
    when.textContent = `${project.dateLabel} · ${project.role}`;
    name.textContent = project.title;
    name.href = project.href;
    sum.textContent = project.summary;
    open.href = project.href;
    open.setAttribute("aria-label", fill(words.openFor, { title: project.title }));
    strip.replaceChildren();
    voice.textContent = "";
    if (clip) {
      const chords = [...new Set(session.changes.filter((c) => c.t < clip.end && c.t + 0.5 > clip.start).map((c) => c.chord.name))];
      strip.append(roll(clip.notes) ?? "", h("span", { class: "cp-clip__run", "aria-hidden": "true" }));
      strip.setAttribute("aria-label", spell(clip.notes));
      strip.setAttribute("role", "img");
      voice.textContent = `${copy.tracks.voices[clip.voice as "lead" | "chip"] ?? ""} · ${chords.join(" → ")}`;
    }
    for (const [slug, sleeve] of sleeves) {
      const on = slug === project.slug;
      sleeve.setAttribute("aria-pressed", String(on));
      sleeve.toggleAttribute("data-on", on);
    }
  };
  /** Sound the record on the platter: its clip, in place. */
  const play = () => {
    const clip = current && clipOf(current);
    if (!clip || face || signal.aborted) return;
    auditionClip(env, clip, strip);
    window.clearTimeout(hearing);
    hearing = window.setTimeout(() => {
      hearing = 0;
      paint();
    }, heard(clip));
    paint();
  };
  let swapping = 0;
  /** Swap a record onto the platter: the arm lifts, the record changes
   * under it, the arm drops back. Then, if asked, it plays. */
  const cue = (project: Project, andPlay: boolean) => {
    if (project === current) {
      if (andPlay) play();
      return;
    }
    if (reducedMotion || face) {
      put(project);
      if (andPlay) play();
      return;
    }
    window.clearTimeout(swapping);
    deck.setAttribute("data-swap", "");
    swapping = window.setTimeout(() => {
      put(project);
      deck.removeAttribute("data-swap");
      if (andPlay) play();
    }, 220);
  };
  signal.addEventListener("abort", () => {
    window.clearTimeout(hearing);
    window.clearTimeout(swapping);
  }, { once: true });

  if (!face) {
    platter.addEventListener("click", play, { signal });
    for (const project of records) {
      const sleeve = sleeves.get(project.slug)!;
      let timer = 0;
      sleeve.addEventListener("click", () => cue(project, true), { signal });
      sleeve.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => cue(project, true), DWELL);
      }, { signal });
      sleeve.addEventListener("pointerleave", () => window.clearTimeout(timer), { signal });
      signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
    }
    // the turntable follows the playhead: each project's record goes on as
    // the playhead reaches its clip, and turns while the clip sounds
    transport.onTick((t, playing) => {
      const clip = playing
        ? session.clips.filter((c) => c.kind === "project" && t >= c.start && t < c.end && transport.audible(c.track)).at(-1)
        : undefined;
      const project = clip ? bySlug.get(clip.ref) : undefined;
      if (project && project !== current) cue(project, false);
      if (following !== !!project) {
        following = !!project;
        paint();
      }
    }, signal);
  }

  const first = records[0] ?? content.projects[0];
  if (first) put(first);
  paint();
  return { section, crate: crateSection, crateList: crate };
}

function currentlyNote(env: Env) {
  const { currently } = env.content.pages.home;
  return h(
    "aside",
    { class: "cp-note", ...part("home.currently") },
    h("span", { class: "cp-note__tape", "aria-hidden": "true" }),
    h("h2", null, currently.title),
    h("p", null, inlineCopy(currently.body)),
    link(currently.link.href, { class: "cp-note__more" }, currently.link.label, h("span", { "aria-hidden": "true" }, " →")),
  );
}

/** Recent updates as locators: each date moves the playhead there and
 * rings its bell. */
function locators(env: Env) {
  const { content, copy, session, transport, signal } = env;
  const words = copy.home;
  const page = content.pages.home.updates;
  const shown = content.updates.slice(0, page.limit);
  return h(
    "section",
    { class: "cp-locators", "aria-labelledby": "cp-locators-title" },
    h("h2", { class: "cp-label", id: "cp-locators-title" }, words.locators, h("small", null, ` · ${page.title}`)),
    h("p", { class: "cp-locators__intro" }, page.intro),
    shown.length
      ? h(
          "ol",
          { class: "cp-locators__list", "aria-label": page.listLabel },
          shown.map((update) => {
            const clip = session.clips.find((c) => c.id === `update:${update.id}`);
            const when = h("button", { type: "button", class: "cp-loc__when", "aria-label": fill(words.jump, { when: update.dateLabel }), disabled: env.face }, update.dateLabel);
            const li = h(
              "li",
              { class: "cp-loc", ...part("update.item", update.id) },
              when,
              link(update.href, { class: "cp-loc__title" }, update.title),
              h("small", null, `${update.kindLabel} · ${update.sourceLabel}`),
            );
            if (clip) {
              when.addEventListener("click", () => {
                transport.seek(clip.start);
                auditionClip(env, clip, li);
              }, { signal });
              transport.watch(li, clip.start, clip.start + MONTH, signal, "markers");
            }
            return li;
          }),
        )
      : h("p", { class: "cp-locators__empty" }, page.empty),
    h("p", { class: "cp-locators__caption" }, page.caption),
  );
}

export function home(env: Env): Screen {
  const { section: info, h1 } = hero(env);
  const tt = turntable(env);
  tt.crate.append(currentlyNote(env));
  bar(info, 1);
  bar(tt.section, 2, 2);
  bar(tt.crateList, 1, 4);
  return {
    el: screen("home", h("div", { class: "cp-home" }, info, tt.section, tt.crate, locators(env))),
    heading: h1,
  };
}
