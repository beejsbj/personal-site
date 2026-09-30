/** The resume as the STATUS screen: a party roster. Each role is a member
 * row with a tag, a name plate and its record; education follows, tools are
 * the skill list, and the closing note is a dialogue box. */
import type { Route } from "../types";
import { type Env, type Screen, backLink, frame, prompts, scrollKeys, tabs, text } from "./chrome";
import { h, ransom } from "./dom";

interface Entry {
  heading: string;
  nodes: Element[];
}
interface Section {
  title: string;
  lead: Element[];
  entries: Entry[];
}

function sections(prose: Element | null): Section[] {
  const out: Section[] = [];
  let section: Section | undefined;
  let entry: Entry | undefined;
  for (const node of Array.from(prose?.children ?? [])) {
    if (node.tagName === "H2") {
      section = { title: text(node), lead: [], entries: [] };
      entry = undefined;
      out.push(section);
    } else if (node.tagName === "H3") {
      section ??= (out.push({ title: "", lead: [], entries: [] }), out[out.length - 1]);
      entry = { heading: text(node), nodes: [] };
      section.entries.push(entry);
    } else {
      section ??= (out.push({ title: "", lead: [], entries: [] }), out[out.length - 1]);
      (entry ? entry.nodes : section.lead).push(node.cloneNode(true) as Element);
    }
  }
  return out;
}

const TAGS = ["Leader", "Party", "Party", "Party", "Party", "Party"];

function row(entry: Entry, i: number, kind: string) {
  const [role, org] = entry.heading.split(" · ");
  // A leading italic line is the date, the "level" of the row.
  const first = entry.nodes[0];
  const hasDate = first?.tagName === "P" && first.children.length === 1 && first.firstElementChild?.tagName === "EM";
  const date = hasDate ? text(first) : "";
  const body = hasDate ? entry.nodes.slice(1) : entry.nodes;
  return h(
    "li",
    { class: "cc-member", style: `--i:${i}`, "data-kind": kind },
    h("span", { class: "cc-member__tag", "aria-hidden": "true" }, kind === "experience" ? TAGS[i] ?? "Party" : "Study"),
    h(
      "h3",
      { class: "cc-member__head" },
      h("span", { class: "cc-member__role" }, role),
      org ? h("span", { class: "cc-member__org" }, h("span", { class: "cc-sr" }, " · "), org) : null,
    ),
    date ? h("p", { class: "cc-member__date" }, date) : null,
    body.length ? h("div", { class: "cc-member__body" }, body) : null,
  );
}

export function resume(route: Route, env: Env): Screen {
  void env;
  const { el, main } = frame(route.kind, "cc-status");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-status__red" }),
    h("span", { class: "cc-status__rays" }),
  );
  const name = text(route.main.querySelector("h1")) || "Resume";
  const intro = text(route.main.querySelector(".page-header__intro"));
  const contacts = Array.from(route.main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a"));
  const heading = h("h1", { class: "cc-status__name", tabindex: "-1" }, ransom(name, { boxes: 0.16, salt: 8 }));
  const back = backLink("/", "Command");

  const panels = sections(route.main.querySelector(".prose")).map((section, s) => {
    const key = section.title.toLowerCase();
    const kind = key.includes("experience") ? "experience" : key.includes("education") ? "education" : key.includes("tool") ? "tools" : "note";
    const content: (Node | null)[] = [];
    if (kind === "tools") {
      const list = section.lead.map((n) => text(n)).join(" ").replace(/\.$/, "");
      const skills = list.split(/,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
      content.push(
        h("ul", { class: "cc-skills" }, skills.map((skill, i) => h("li", { style: `--i:${i}` }, h("span", { "aria-hidden": "true" }, "★ "), skill))),
      );
    } else if (section.lead.length) {
      content.push(h("div", { class: kind === "note" ? "cc-say" : "cc-status__lead" },
        kind === "note" ? h("span", { class: "cc-say__name", "aria-hidden": "true" }, "Burooj") : null,
        ...section.lead));
    }
    if (section.entries.length)
      content.push(h("ol", { class: "cc-roster" }, section.entries.map((entry, i) => row(entry, i, kind))));
    return h(
      "section",
      { class: `cc-status__panel cc-status__panel--${kind}`, style: `--i:${s}`, "aria-labelledby": `cc-status-${s}` },
      h("h2", { class: "cc-status__section", id: `cc-status-${s}` }, section.title),
      ...content,
    );
  });

  const body = h("div", { class: "cc-status__body" }, panels);
  main.append(
    h(
      "header",
      { class: "cc-status__head" },
      back,
      h("p", { class: "cc-status__logo", "aria-hidden": "true" }, ransom("Status", { boxes: 0.3, salt: 1 })),
      h(
        "div",
        { class: "cc-status__card" },
        h("p", { class: "cc-status__lv", "aria-hidden": "true" }, "Leader"),
        heading,
        intro ? h("p", { class: "cc-status__intro" }, intro) : null,
        contacts.length
          ? h(
              "ul",
              { class: "cc-status__contacts", "aria-label": "Contact" },
              contacts.map((a) =>
                h("li", {}, h("a", { href: a.getAttribute("href") ?? "#", rel: "noreferrer" }, text(a))),
              ),
            )
          : null,
      ),
    ),
    body,
    prompts([["Q/E", "Section"], ["Esc", "Back"]]),
  );
  el.prepend(tabs(route.kind));
  return { el, heading, back, onKey: scrollKeys(body) };
}
