/** Home is the pause menu: the COMMAND screen. Huge tilted commands on a
 * blood-red field, the cut-out portrait across the split, a calendar in the
 * corner, and a phone that has a new message waiting. */
import type { Route } from "../types";
import {
  type Env,
  type Screen,
  frame,
  prompts,
  roving,
} from "./chrome";
import { WEEKDAYS, concentricStar, h, parseDay, ransom, starPoints, svg } from "./dom";
import { portrait } from "./portrait";
import { flashPortrait, slideHelp, tickUp, tickWords } from "./micro";

interface Command {
  id: string;
  label: string;
  help: string;
  href?: string;
  external?: boolean;
  panel?: "phone" | "card";
}

let remembered = 0;

export function commandsFor(env: Env): Command[] {
  const { site, updates } = env.content;
  return [
    { id: "projects", label: "Projects", href: "/projects", help: "Equip · things I've made, along the way" },
    { id: "lab", label: "Lab", href: "/lab", help: "Requests · small experiments, room to play" },
    { id: "about", label: "About", href: "/about", help: "Confidant · who's behind the mask" },
    { id: "status", label: "Status", href: "/resume", help: "Resume · experience, education, tools" },
    {
      id: "phone",
      label: "Phone",
      panel: "phone",
      help: `Updates · ${updates.length} new message${updates.length === 1 ? "" : "s"}`,
    },
    { id: "writing", label: "Writing", href: site.writingUrl, external: true, help: "Substack · essays, off-site ↗" },
    { id: "card", label: "Calling Card", panel: "card", help: "Contact · send a calling card" },
  ];
}

/** Wrap a command id to its route, so returning home keeps the cursor. */
export function rememberCommand(kind: Route["kind"]) {
  const map: Partial<Record<Route["kind"], number>> = {
    projects: 0, project: 0, lab: 1, "lab-entry": 1, about: 2, resume: 3,
  };
  if (map[kind] !== undefined) remembered = map[kind]!;
}

function sun() {
  return svg(
    `<circle cx="32" cy="32" r="13" fill="#fff" stroke="#0a0a0a" stroke-width="4"/>
     <polygon points="${starPoints(31, 19, 32, 32)}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="miter"/>
     <polygon points="${starPoints(31, 19, 32, 32)}" fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linejoin="miter"/>`,
    { viewBox: "0 0 64 64", class: "cc-date__weather" },
  );
}

function dateWidget(env: Env) {
  const latest = env.content.updates[0];
  if (!latest) return null;
  const day = parseDay(latest.date);
  const month = h("span", { class: "cc-date__m" }, String(day.getUTCMonth() + 1));
  const date = h("span", { class: "cc-date__d" }, String(day.getUTCDate()));
  const weekday = h("span", { class: "cc-date__wd" }, WEEKDAYS[day.getUTCDay()]);
  // The calendar flips forward to today once the screen lands.
  if (!env.face) {
    tickUp(month, day.getUTCMonth() + 1, { delay: 420, duration: 360 });
    tickUp(date, day.getUTCDate(), { delay: 480, duration: 520 });
    tickWords(weekday, [...WEEKDAYS, ...WEEKDAYS].slice(day.getUTCDay() + 1, day.getUTCDay() + 8), WEEKDAYS[day.getUTCDay()], { delay: 480, duration: 520 });
  }
  return h(
    "aside",
    { class: "cc-date", "aria-label": `Last updated ${latest.dateLabel}` },
    h(
      "p",
      { class: "cc-date__day", "aria-hidden": "true" },
      h("span", { class: "cc-date__md" }, month, h("span", { class: "cc-date__slash" }, "/"), date),
      weekday,
      sun(),
    ),
    h("p", { class: "cc-date__time", "aria-hidden": "true" }, "Daytime"),
    h("p", { class: "cc-date__note" }, h("span", {}, "Last update"), " ", latest.title),
  );
}

/** Rolling odometer digits, like the yen counter. Pure CSS. */
function odometer(value: number, width = 2) {
  const digits = String(value).padStart(width, "0").split("");
  return h(
    "span",
    { class: "cc-odo", "aria-hidden": "true" },
    digits.map((digit, i) =>
      h(
        "span",
        { class: "cc-odo__col", style: `--d:${digit};--i:${i}` },
        h("span", { class: "cc-odo__strip" }, "0123456789".split("").map((n) => h("span", {}, n))),
      ),
    ),
  );
}

function stripped(markdown: string) {
  return markdown.replace(/\*\*|__|\*|_/g, "").split(/\n\s*\n/)[0]?.trim() ?? "";
}

export function home(route: Route, env: Env): Screen {
  const { content } = env;
  const page = content.pages.home;
  const { el, main } = frame(route.kind, "cc-home");
  const commands = commandsFor(env);

  const bg = el.querySelector(".cc-screen__bg")!;
  bg.append(
    h("span", { class: "cc-home__rays" }),
    h("span", { class: "cc-home__edge" }),
    h("span", { class: "cc-home__red" }),
    h("span", { class: "cc-home__bigstar" }, concentricStar(["#b3080d", "#d0121a", "#a3060b", "#c50e14"])),
    h("span", { class: "cc-home__corner-star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
    h("span", { class: "cc-home__dots" }),
  );

  const helpText = h("span", { class: "cc-command__helptext" });
  const indexNum = h("span", { class: "cc-home__num-value" });

  const items = commands.map((command, i) => {
    const inner = [
      h("span", { class: "cc-cmd__shard", "aria-hidden": "true" }),
      h("span", { class: "cc-cmd__plate", "aria-hidden": "true" }),
      ransom(command.label, { boxes: 0.12, salt: i + 3, tilt: 6 }),
      command.external ? h("span", { class: "cc-sr" }, " (opens Substack)") : null,
    ];
    const attrs = {
      class: "cc-cmd",
      style: `--i:${i}`,
      "data-cmd": command.id,
      "data-cc-title": command.label,
      "aria-describedby": "cc-command-help",
    };
    const item = command.href
      ? h("a", { ...attrs, href: command.href }, ...inner)
      : h("button", { ...attrs, type: "button", "aria-haspopup": "dialog" }, ...inner);
    if (command.panel) {
      const panel = command.panel;
      item.addEventListener("click", () => env.open(panel, item), { signal: env.signal });
    }
    return item;
  });

  const nav = h(
    "nav",
    { class: "cc-command", "aria-label": "Command menu" },
    h("ol", {}, items.map((item) => h("li", {}, item))),
  );

  const helper = h(
    "div",
    { class: "cc-command__help" },
    h("p", { class: "cc-command__logo", "aria-hidden": "true" }, ransom("Command", { boxes: 0.25, salt: 2 })),
    h("p", { class: "cc-command__helpline", id: "cc-command-help" }, helpText),
  );

  const heading = h(
    "h1",
    { class: "cc-home__name", tabindex: "-1" },
    ransom(page.headline ?? content.site.name, { boxes: 0.2, salt: 11 }),
  );

  const plates = h(
    "header",
    { class: "cc-home__plates" },
    h("p", { class: "cc-plate cc-plate--eyebrow" }, page.eyebrow ?? "Frontend Developer"),
    heading,
    h("p", { class: "cc-plate cc-plate--intro" }, page.intro ?? ""),
    h(
      "p",
      { class: "cc-plate cc-plate--select", "aria-hidden": "true" },
      h("span", { class: "cc-plate__big" }, content.site.name),
      h("span", { class: "cc-plate__small" }, "Command select"),
    ),
  );

  const num = h("p", { class: "cc-home__num", "aria-hidden": "true" }, indexNum);

  const latest = content.updates[0];
  const phoneChip = latest
    ? h(
        "button",
        { class: "cc-phonechip", type: "button", "aria-haspopup": "dialog" },
        h("span", { class: "cc-phonechip__icon", "aria-hidden": "true" },
          svg(`<rect x="7" y="2" width="18" height="28" rx="3" fill="#0a0a0a" stroke="#fff" stroke-width="2.5"/><rect x="10" y="6" width="12" height="17" fill="#e5191c"/><circle cx="16" cy="26.5" r="1.6" fill="#fff"/>`, { viewBox: "0 0 32 32" }),
          h("span", { class: "cc-phonechip__badge" }, String(content.updates.length)),
        ),
        h("span", { class: "cc-phonechip__label" }, "New message"),
        h("span", { class: "cc-phonechip__text" }, latest.title),
      )
    : null;
  phoneChip?.addEventListener("click", () => env.open("phone", phoneChip), { signal: env.signal });

  const bubble = h(
    "p",
    { class: "cc-home__bubble" },
    h("span", { class: "cc-home__bubble-name", "aria-hidden": "true" }, "Burooj"),
    stripped(page.body),
  );

  const money = h(
    "p",
    { class: "cc-money" },
    h("span", { class: "cc-sr" }, `${content.projects.length} projects and ${content.lab.length} experiments`),
    h("span", { class: "cc-money__sign", "aria-hidden": "true" }, "★"),
    odometer(content.projects.length),
    h("span", { class: "cc-money__unit", "aria-hidden": "true" }, "Works"),
    h("span", { class: "cc-money__sub", "aria-hidden": "true" }, "+", odometer(content.lab.length), " Lab"),
  );

  const figure = h(
    "div",
    { class: "cc-home__portrait" },
    portrait("Burooj Rashid wearing round sunglasses, as a red and black cut-out"),
  );

  main.append(
    figure,
    plates,
    num,
    dateWidget(env) ?? "",
    nav,
    helper,
    bubble,
    money,
    phoneChip ?? "",
    prompts([["↑↓", "Select"], ["⏎", "Confirm"], ["Esc", "Back"]]),
  );

  let first = true;
  const menu = roving(items, env.signal, (i) => {
    remembered = i;
    helpText.textContent = commands[i].help;
    // A fresh child restarts the slam every time the number changes.
    indexNum.replaceChildren(h("span", { class: "cc-home__num-digit" }, String(i + 1).padStart(2, "0")));
    el.style.setProperty("--sel", String(i));
    el.dataset.selected = commands[i].id;
    if (!first && !env.face) {
      flashPortrait(figure);
      slideHelp(helper.lastElementChild);
    }
    first = false;
  }, remembered);

  return {
    el,
    heading,
    onKey: (event) => menu.key(event),
  };
}
