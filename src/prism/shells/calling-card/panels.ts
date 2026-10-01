/** In-shell panels that are not pages: the phone (updates as text messages)
 * and the calling card itself (contact). Both are modal dialogs over the
 * current screen; Esc or Back closes them and returns focus. */
import type { SiteContent } from "../types";
import { concentricStar, h, parseDay, ransom, WEEKDAYS } from "./dom";

export interface Panel {
  el: HTMLElement;
  focus: HTMLElement;
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
  const close = closeButton("Back");
  const thread = h("ol", { class: "cc-phone__thread" });
  // Someone is typing the next update: three dots above the newest message.
  thread.append(
    h(
      "li",
      { class: "cc-msg cc-msg--typing", style: `--i:${content.updates.length}`, "aria-hidden": "true" },
      h("span", { class: "cc-msg__avatar" }, "B"),
      h("span", { class: "cc-msg__bubble cc-msg__dots" }, h("i", {}), h("i", {}), h("i", {})),
    ),
  );
  let lastDay = "";
  content.updates.forEach((update, i) => {
    if (update.date !== lastDay) {
      lastDay = update.date;
      const day = parseDay(update.date);
      thread.append(
        h(
          "li",
          { class: "cc-phone__day" },
          h("time", { datetime: update.date }, `${day.getUTCMonth() + 1}/${day.getUTCDate()} ${WEEKDAYS[day.getUTCDay()]}`),
        ),
      );
    }
    const external = isExternal(update.href);
    thread.append(
      h(
        "li",
        { class: "cc-msg", style: `--i:${i}`, "data-kind": update.kind },
        h("span", { class: "cc-msg__avatar", "aria-hidden": "true" }, "B"),
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
          h("p", { class: "cc-msg__meta" }, `${update.source} · ${update.kind.replace(/-/g, " ")}`),
        ),
      ),
    );
  });

  const title = h("h2", { class: "cc-phone__title", id: "cc-phone-title", tabindex: "-1" }, "Messages");
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
        h("div", {}, title, h("p", { class: "cc-phone__with" }, `${content.site.name} · ${content.updates.length} updates`)),
        close,
      ),
      thread,
    ),
  );
  return { el, focus: title };
}

export function cardPanel(content: SiteContent): Panel {
  const { site } = content;
  const close = closeButton("Back");
  const title = h(
    "h2",
    { class: "cc-card__headline", id: "cc-card-title", tabindex: "-1" },
    ransom("Take your heart", { boxes: 0.3, salt: 5 }),
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
      h("p", { class: "cc-card__to" }, "To whoever has a project in mind,"),
      title,
      h(
        "p",
        { class: "cc-card__body" },
        "You've been keeping a good idea to yourself. I'm going to take it and make it a place on the web: one people can find their way around, with the small details that make it feel alive.",
      ),
      h("p", { class: "cc-card__ask" }, "Tell me about it."),
      h(
        "a",
        { class: "cc-card__email", href: `mailto:${site.email}` },
        ransom(site.email, { boxes: 0.18, tilt: 5, mixCase: false, salt: 9 }),
      ),
      h(
        "ul",
        { class: "cc-card__links", "aria-label": "Elsewhere" },
        socials.map((s) => h("li", {}, h("a", { href: s.href, rel: "noreferrer" }, s.label, h("span", { "aria-hidden": "true" }, " ↗")))),
        h("li", {}, h("a", { href: site.writingUrl, rel: "noreferrer" }, "Writing", h("span", { "aria-hidden": "true" }, " ↗"))),
      ),
      h("p", { class: "cc-card__sign" }, "— ", site.name, h("span", {}, "Frontend Developer")),
      close,
    ),
  );
  return { el, focus: title };
}
