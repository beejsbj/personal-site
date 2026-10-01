/** The resume as the STATUS screen: a party roster. Each role is a member
 * row with a tag, a name plate and its record; education follows, tools are
 * the skill list, and the resume page's own note is a dialogue box. Built
 * from the structured resume (content.resume), never from its prose. */
import type { ResumeEntry, Route } from "../types";
import { type PartAttrs, part } from "../../parts";
import { blocks, inline } from "../rich";
import { type Copy, type Env, type Screen, backLink, copyOf, frame, prompts, scrollKeys, tabs } from "./chrome";
import { h, ransom } from "./dom";

type Kind = "experience" | "education" | "tools" | "note";

/** A row's tag, read from what the entry says, never from its position.
 * An open-ended role is current; otherwise the kind of work, when its title,
 * kind or date line names it; otherwise nothing. */
function tagFor(kind: Kind, entry: ResumeEntry, copy: Copy): { label: string; current?: boolean } | null {
  const { tags } = copy.resume;
  if (entry.current) return { label: tags.current, current: true };
  if (kind === "education") return { label: tags.education };
  if (kind !== "experience") return null;
  const said = [entry.title, entry.kind, entry.dateLine].filter(Boolean).join(" ");
  if (/\bintern(ship)?\b/i.test(said)) return { label: tags.internship };
  if (/\b(freelance|client work)\b/i.test(said)) return { label: tags.client };
  if (/\bcontract\b/i.test(said)) return { label: tags.contract };
  if (/\bproject work\b/i.test(said)) return { label: tags.projectWork };
  // A titled role at a named organisation over a span of time.
  if (entry.title && entry.org && entry.start && entry.end && entry.start !== entry.end)
    return { label: tags.employment };
  return null;
}

function row(entry: ResumeEntry, i: number, kind: Kind, copy: Copy) {
  // The name plate: the title, with the organisation beside it; an entry
  // with no title is named by its organisation alone.
  const role = entry.title ?? entry.org ?? entry.heading;
  const org = entry.title ? entry.org : undefined;
  const tag = tagFor(kind, entry, copy);
  const body: HTMLElement[] = [];
  if (entry.summary) body.push(h("p", {}, inline(entry.summary)));
  if (entry.bullets.length)
    body.push(h("ul", {}, entry.bullets.map((bullet) => h("li", {}, inline(bullet)))));
  return h(
    "li",
    {
      class: "cc-member",
      style: `--i:${i}`,
      "data-kind": kind,
      "data-current": tag?.current ? "" : null,
      ...part(kind === "education" ? "resume.education" : "resume.role", entry.id),
    },
    tag ? h("span", { class: "cc-member__tag", "aria-hidden": "true" }, tag.label) : null,
    h(
      "h3",
      { class: "cc-member__head" },
      h("span", { class: "cc-member__role" }, role),
      org ? h("span", { class: "cc-member__org" }, h("span", { class: "cc-sr" }, " · "), org) : null,
    ),
    entry.dateLine ? h("p", { class: "cc-member__date" }, entry.dateLine) : null,
    body.length ? h("div", { class: "cc-member__body" }, body) : null,
  );
}

/** The resume page's free body: each h2 opens its own section, and what
 * follows it is said in a dialogue box. */
function notes(html: string) {
  const out: { title: string; nodes: HTMLElement[] }[] = [];
  for (const node of blocks(html)) {
    if (node.tagName === "H2") out.push({ title: node.textContent ?? "", nodes: [] });
    else {
      if (!out.length) out.push({ title: "", nodes: [] });
      out[out.length - 1].nodes.push(node);
    }
  }
  return out;
}

export function resume(route: Route, env: Env): Screen {
  const { content } = env;
  const copy = copyOf(content);
  const { header, html } = content.pages.resume;
  const { experience, education, tools } = content.resume;
  const { el, main } = frame(route.kind, "cc-status");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-status__red" }),
    h("span", { class: "cc-status__rays" }),
  );
  const heading = h(
    "h1",
    { class: "cc-status__name", tabindex: "-1", ...part("page.title", "resume") },
    ransom(header.title, { boxes: 0.16, salt: 8 }),
  );
  const back = backLink(copy, "/", copy.sections.home);

  const sections: { kind: Kind; title: string; content: Node[]; attrs?: PartAttrs }[] = [];
  if (experience.roles.length)
    sections.push({
      kind: "experience",
      title: experience.title,
      content: [h("ol", { class: "cc-roster" }, experience.roles.map((entry, i) => row(entry, i, "experience", copy)))],
    });
  if (education.entries.length)
    sections.push({
      kind: "education",
      title: education.title,
      content: [h("ol", { class: "cc-roster" }, education.entries.map((entry, i) => row(entry, i, "education", copy)))],
    });
  if (tools.items.length)
    sections.push({
      kind: "tools",
      title: tools.title,
      content: [
        h(
          "ul",
          { class: "cc-skills", ...part("resume.tools") },
          tools.items.map((skill, i) => h("li", { style: `--i:${i}` }, h("span", { "aria-hidden": "true" }, "★ "), skill)),
        ),
      ],
    });
  for (const note of notes(html))
    sections.push({
      kind: "note",
      title: note.title,
      content: note.nodes.length
        ? [h("div", { class: "cc-say" }, h("span", { class: "cc-say__name", "aria-hidden": "true" }, copy.speaker), ...note.nodes)]
        : [],
      attrs: part("page.body", "resume"),
    });

  const panels = sections.map((section, s) =>
    h(
      "section",
      {
        class: `cc-status__panel cc-status__panel--${section.kind}`,
        style: `--i:${s}`,
        "aria-labelledby": section.title ? `cc-status-${s}` : null,
        ...section.attrs,
      },
      section.title ? h("h2", { class: "cc-status__section", id: `cc-status-${s}` }, section.title) : null,
      ...section.content,
    ),
  );

  const body = h("div", { class: "cc-status__body" }, panels);
  main.append(
    h(
      "header",
      { class: "cc-status__head" },
      back,
      h("p", { class: "cc-status__logo", "aria-hidden": "true" }, ransom(copy.sections.resume, { boxes: 0.3, salt: 1 })),
      h(
        "div",
        { class: "cc-status__card" },
        h("p", { class: "cc-status__lv", "aria-hidden": "true" }, copy.resume.leader),
        heading,
        header.intro ? h("p", { class: "cc-status__intro", ...part("page.intro", "resume") }, header.intro) : null,
        header.actions.length
          ? h(
              "ul",
              { class: "cc-status__contacts", "aria-label": copy.resume.contacts, ...part("page.actions", "resume") },
              header.actions.map((action) =>
                h("li", {}, h("a", { href: action.href, rel: "noreferrer" }, action.label)),
              ),
            )
          : null,
      ),
    ),
    body,
    prompts([["Q/E", copy.chrome.prompts.section], ["Esc", copy.chrome.prompts.back]]),
  );
  el.prepend(tabs(route.kind, copy));
  return { el, heading, back, onKey: scrollKeys(body) };
}
