/** In-shell panels that are not pages: the phone (updates as text messages)
 * and the calling card itself (contact). Both are modal dialogs over the
 * current screen; Esc or Back closes them and returns focus. */
import type { SiteContent } from "../types";
import { fill } from "../rich";
import { copyOf } from "./chrome";
import { concentricStar, h, parseDay, ransom } from "./dom";

export interface Panel {
  el: HTMLElement;
  focus: HTMLElement;
  /** Runs once the panel is in the document (it can measure itself). */
  opened?(): void;
}

function closeButton(label: string) {
  return h(
    "button",
    { class: "cc-panel__close", type: "button", "data-cc-close": "" },
    h("kbd", { "aria-hidden": "true" }, "Esc"),
    h("span", {}, label),
  );
}

const isExternal = (href: string) => /^(https?:)?\/\//.test(href) && !href.startsWith(location.origin);

export function phonePanel(content: SiteContent): Panel {
  const copy = copyOf(content);
  const close = closeButton(copy.chrome.back);
  const avatar = content.site.name.charAt(0);
  const thread = h("ol", { class: "cc-phone__thread" });
  // A real chat: oldest at the top, the newest at the bottom by the typing
  // dots. Content arrives newest first; reverse, then sort by day (stable,
  // so same-day messages keep their order).
  const updates = [...content.updates].reverse().sort((a, b) => a.date.localeCompare(b.date));
  const last = updates.length - 1;
  let lastDay = "";
  updates.forEach((update, i) => {
    if (update.date !== lastDay) {
      lastDay = update.date;
      const day = parseDay(update.date);
      thread.append(
        h(
          "li",
          { class: "cc-phone__day" },
          h("time", { datetime: update.date }, `${day.getUTCMonth() + 1}/${day.getUTCDate()} ${copy.weekdays[day.getUTCDay()]}`),
        ),
      );
    }
    const external = isExternal(update.href);
    thread.append(
      h(
        "li",
        // The stagger runs bottom-up: the newest message pops in first.
        { class: "cc-msg", style: `--i:${last - i}`, "data-kind": update.kind, "data-latest": i === last ? "" : null },
        h("span", { class: "cc-msg__avatar", "aria-hidden": "true" }, avatar),
        h(
          "div",
          { class: "cc-msg__bubble" },
          h("p", { class: "cc-msg__title" }, update.title),
          h("p", { class: "cc-msg__body" }, update.summary),
          h(
            "a",
            {
              class: "cc-msg__link",
              href: update.href,
              "data-cc-title": update.title,
              ...(external ? { rel: "noreferrer" } : {}),
            },
            update.linkLabel,
            external ? h("span", { "aria-hidden": "true" }, " ↗") : null,
          ),
          h("p", { class: "cc-msg__meta" }, `${update.sourceLabel} · ${update.kindLabel}`),
        ),
      ),
    );
  });
  // Someone is typing the next update, under the newest message.
  thread.append(
    h(
      "li",
      { class: "cc-msg cc-msg--typing", style: "--i:1", "aria-hidden": "true" },
      h("span", { class: "cc-msg__avatar" }, avatar),
      h("span", { class: "cc-msg__bubble cc-msg__dots" }, h("i", {}), h("i", {}), h("i", {})),
    ),
  );

  const title = h("h2", { class: "cc-phone__title", id: "cc-phone-title", tabindex: "-1" }, copy.phone.title);
  const el = h(
    "section",
    { class: "cc-panel cc-phone", role: "dialog", "aria-modal": "true", "aria-labelledby": "cc-phone-title" },
    h("div", { class: "cc-panel__scrim", "data-cc-close": "", "aria-hidden": "true" }),
    h(
      "div",
      { class: "cc-phone__device" },
      h(
        "header",
        { class: "cc-phone__head" },
        h("span", { class: "cc-phone__app", "aria-hidden": "true" }, concentricStar(["#fff", "#e5191c", "#0a0a0a"])),
        h("div", {}, title, h("p", { class: "cc-phone__with" }, fill(copy.phone.with, { name: content.site.name, n: content.derived.counts.updates }))),
        close,
      ),
      thread,
    ),
  );
  // Open on the latest message, like any phone.
  const toLatest = () => {
    thread.scrollTop = thread.scrollHeight;
  };
  return {
    el,
    focus: title,
    opened() {
      toLatest();
      requestAnimationFrame(toLatest);
    },
  };
}

export function cardPanel(content: SiteContent): Panel {
  const { site } = content;
  const copy = copyOf(content);
  const close = closeButton(copy.chrome.back);
  const title = h(
    "h2",
    { class: "cc-card__headline", id: "cc-card-title", tabindex: "-1" },
    ransom(copy.card.headline, { boxes: 0.3, salt: 5 }),
  );
  const socials = site.social.filter((s) => !s.href.startsWith("mailto:"));
  const el = h(
    "section",
    { class: "cc-panel cc-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "cc-card-title" },
    h("div", { class: "cc-panel__scrim", "data-cc-close": "", "aria-hidden": "true" }),
    h(
      "div",
      { class: "cc-card__paper" },
      // The star is clipped by its own frame so it never adds scroll room.
      h(
        "span",
        { class: "cc-card__starframe", "aria-hidden": "true" },
        h("span", { class: "cc-card__star" }, concentricStar(["#0a0a0a", "#fff", "#0a0a0a", "#e5191c"])),
      ),
      h("p", { class: "cc-card__to" }, copy.card.to),
      title,
      h("p", { class: "cc-card__body" }, copy.card.body),
      h("p", { class: "cc-card__ask" }, copy.card.ask),
      h(
        "a",
        { class: "cc-card__email", href: `mailto:${site.email}` },
        ransom(site.email, { boxes: 0.18, tilt: 5, mixCase: false, salt: 9 }),
      ),
      h(
        "ul",
        { class: "cc-card__links", "aria-label": copy.card.elsewhere },
        socials.map((s) => h("li", {}, h("a", { href: s.href, rel: "noreferrer" }, s.label, h("span", { "aria-hidden": "true" }, " ↗")))),
        h("li", {}, h("a", { href: "/writing", "data-cc-title": copy.sections.writing }, copy.card.writing)),
      ),
      h("p", { class: "cc-card__sign" }, "— ", site.name, h("span", {}, content.pages.home.hero.occupation)),
      close,
    ),
  );
  return { el, focus: title };
}
