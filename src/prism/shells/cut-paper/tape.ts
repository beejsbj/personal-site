/** The arrangement for phones: time runs down the page, oldest at the top,
 * like the DAW turned a quarter turn. Years are bar lines, each clip is a
 * card at its month, updates are marker rows and roles are bars in the
 * gutter that stretch from start to end. A playhead line is fixed across
 * the view: scrolling moves time under it (the transport follows), and
 * playing scrolls the page so the career runs under the line. Touching the
 * page while it plays hands control back.
 *
 * The tape is elastic: a year with nothing in it is short, a busy one is
 * tall, so the mapping from time to height is drawn between the rows
 * themselves (every row knows its date). */
import { part } from "../../parts";
import { h, link } from "./dom";
import { auditionClip, hearButton, noteVar, roll, type Env } from "./bits";
import { monthLabel, MONTH_ABBR } from "./transport";
import type { Clip } from "./score";

interface Anchor {
  y: number;
  t: number;
}

const LINE = 0.4;

export function tape(env: Env, full: boolean) {
  const { content, session, transport, signal, copy, scroller, overlay, reducedMotion, face } = env;
  type Row = { t: number; order: number; el: HTMLElement };
  const rows: Row[] = [];

  // a bar line per year, starting with the (partial) year the session opens in
  for (let y = Math.floor(session.from); y <= Math.floor(session.end - 1e-6); y += 1) {
    const t = Math.max(y, session.from);
    rows.push({ t, order: 0, el: h("li", { class: "cp-tape__year", "data-t": t }, h("span", null, String(y))) });
  }

  content.projects.forEach((project, index) => {
    const clip = session.clips.find((c) => c.id === `project:${project.slug}`);
    if (!clip) return;
    const card = h(
      "article",
      { class: "cp-tcard", style: `--note:${noteVar(index)}`, "data-clip": clip.id },
      project.cover ? h("img", { class: "cp-tcard__art", src: project.cover, alt: "", loading: "lazy", decoding: "async", width: 56, height: 56 }) : h("span", { class: "cp-tcard__art", "aria-hidden": "true" }),
      h(
        "div",
        { class: "cp-tcard__copy" },
        h("h3", { class: "cp-tcard__title" }, link(project.href, part("project.title", project.slug), project.title)),
        h("p", { class: "cp-tcard__meta", ...part("project.meta", project.slug) }, `${project.dateLabel} · ${project.kind}`),
        full ? h("p", { class: "cp-tcard__sum", ...part("project.summary", project.slug) }, project.summary) : null,
        full && project.tools.length ? h("p", { class: "cp-tcard__tools", ...part("project.tools", project.slug) }, project.tools.slice(0, 3).join(" · ")) : null,
      ),
      h("div", { class: "cp-tcard__roll" }, roll(clip.notes), h("span", { class: "cp-clip__run", "aria-hidden": "true" })),
    );
    card.append(hearButton(env, clip, project.title, card));
    transport.watch(card, clip.start, clip.end, signal, clip.track);
    rows.push({
      t: clip.start,
      order: 1,
      el: h("li", { class: "cp-tape__item", "data-t": clip.start }, h("span", { class: "cp-tape__when" }, MONTH_ABBR[Math.round((clip.start % 1) * 12) % 12]), card),
    });
  });

  for (const clip of session.clips.filter((c) => c.kind === "update")) {
    const update = content.updates.find((u) => u.id === clip.ref);
    if (!update) continue;
    const mark = h(
      "p",
      { class: "cp-tmark", ...part("update.item", update.id) },
      link(update.href, { class: "cp-tmark__title" }, update.title),
      h("small", null, `${update.kindLabel} · ${update.dateLabel}`),
    );
    transport.watch(mark, clip.start, clip.start + 1 / 12, signal, "markers");
    rows.push({
      t: clip.start,
      order: 2,
      el: h("li", { class: "cp-tape__item cp-tape__item--marker", "data-t": clip.start }, h("span", { class: "cp-tape__when", "aria-hidden": "true" }, h("i", { class: "cp-tape__bell" })), mark),
    });
  }

  rows.push({ t: session.now, order: 3, el: h("li", { class: "cp-tape__today", "data-t": session.now }, h("span", null, copy.tracks.today)) });
  rows.push({ t: session.end, order: 4, el: h("li", { class: "cp-tape__end", "data-t": session.end, "aria-hidden": "true" }, h("span", null, session.chordAt(session.from).name)) });
  rows.sort((a, b) => a.t - b.t || a.order - b.order);

  const list = h("ol", { class: "cp-tape__list" }, rows.map((r) => r.el));
  const gutter = h("div", { class: "cp-tape__roles", "aria-hidden": "true" });
  const roleClips = session.clips.filter((c) => c.kind === "role");
  const entries = [...content.resume.experience.roles, ...content.resume.education.entries];
  const bars = roleClips.map((clip: Clip, i) => {
    const entry = entries.find((e) => e.id === clip.ref);
    const el = h("span", { class: "cp-tape__role", style: `--row:${i % 2}` }, h("b", null, entry?.org ?? entry?.title ?? ""));
    transport.watch(el, clip.start, clip.end, signal, "roles");
    gutter.append(el);
    return { clip, el };
  });

  const section = h("section", { class: `cp-tape ${full ? "cp-tape--full" : ""}`.trim() }, h("p", { class: "cp-tape__hint" }, copy.tape.hint), h("div", { class: "cp-tape__body" }, gutter, list));
  if (face) return section;

  /* ── the fixed playhead line ───────────────────────────── */
  const lineLabel = h("span", { class: "cp-tline__label" });
  const line = h("div", { class: "cp-tline", hidden: true }, lineLabel);
  overlay.append(line);
  signal.addEventListener("abort", () => line.remove());

  let anchors: Anchor[] = [];
  const measure = () => {
    anchors = [];
    for (const li of list.children as HTMLCollectionOf<HTMLElement>) {
      const t = Number(li.dataset.t);
      const y = li.offsetTop;
      if (anchors.length && t <= anchors[anchors.length - 1].t + 1e-9) continue;
      anchors.push({ y, t });
    }
    for (const { clip, el } of bars) {
      const top = yOf(clip.start);
      el.style.top = `${top}px`;
      el.style.height = `${Math.max(yOf(Math.min(clip.end, session.end)) - top, 6)}px`;
    }
  };
  const yOf = (t: number) => {
    if (!anchors.length) return 0;
    if (t <= anchors[0].t) return anchors[0].y;
    for (let i = 1; i < anchors.length; i += 1) {
      const a = anchors[i - 1];
      const b = anchors[i];
      if (t <= b.t) return a.y + ((t - a.t) / (b.t - a.t)) * (b.y - a.y);
    }
    return anchors[anchors.length - 1].y;
  };
  const tOf = (y: number) => {
    for (let i = 1; i < anchors.length; i += 1) {
      const a = anchors[i - 1];
      const b = anchors[i];
      if (y <= b.y) return a.t + ((y - a.y) / Math.max(b.y - a.y, 1)) * (b.t - a.t);
    }
    return anchors[anchors.length - 1]?.t ?? session.now;
  };
  const visible = () => section.checkVisibility?.() ?? section.offsetParent !== null;
  /** The list's top in the scroller's content coordinates. */
  const listTop = () => list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  const lineOffset = () => scroller.clientHeight * LINE;

  let expected = -1;
  let ownSeek = false;
  const showLine = (t: number | null) => {
    line.hidden = t === null;
    if (t !== null) lineLabel.textContent = `${monthLabel(t)} · ${session.chordAt(Math.min(t, session.end - 1e-6)).name}`;
  };

  const onScroll = () => {
    if (!visible() || !anchors.length) return showLine(null);
    const y = scroller.scrollTop + lineOffset() - listTop();
    const inside = y >= anchors[0].y - 4 && y <= anchors[anchors.length - 1].y + 4;
    if (!inside) return showLine(null);
    const t = Math.min(Math.max(tOf(y), session.from), session.end);
    showLine(t);
    // our own follow-scroll, or the page moving under a playing transport
    if (transport.playing || Math.abs(scroller.scrollTop - expected) < 2) return;
    ownSeek = true;
    transport.seek(t);
    ownSeek = false;
  };
  let frame = 0;
  scroller.addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(onScroll);
  }, { signal, passive: true });

  let lastMonth = -1;
  let first = true;
  transport.onTick((t, playing) => {
    if (first || ownSeek || !visible() || !anchors.length) {
      first = false;
      return;
    }
    const month = Math.floor(t * 12);
    if (reducedMotion && playing && month === lastMonth) return;
    lastMonth = month;
    const top = listTop() + yOf(t) - lineOffset();
    expected = Math.round(Math.max(0, Math.min(top, scroller.scrollHeight - scroller.clientHeight)));
    scroller.scrollTop = expected;
    showLine(t);
  }, signal);

  // a finger on the page takes over from the transport
  for (const type of ["touchstart", "wheel"])
    scroller.addEventListener(type, () => transport.playing && transport.pause(), { signal, passive: true });

  // tapping a card's notes auditions it too
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>(".cp-tcard");
    if (!card || target.closest("a, button")) return;
    const clip = session.clips.find((c) => c.id === card.dataset.clip);
    if (clip) auditionClip(env, clip, card);
  }, { signal });

  const observer = new ResizeObserver(() => {
    if (!visible()) return showLine(null);
    measure();
    onScroll();
  });
  observer.observe(list);
  signal.addEventListener("abort", () => observer.disconnect());
  return section;
}
