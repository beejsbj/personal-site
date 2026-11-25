/** Every journey picture opens full size over the page, in every lens.
 *
 * One listener on the document, in the capture phase, so a lens's own router
 * (or Astro's) never sees the click. The dialog is made on first use and again
 * after a page swap removes it. Within a chapter (the picture's group of
 * media) the arrows and the arrow keys step through its pictures, with a
 * count. The page underneath doesn't scroll while it is open. Its words
 * (close, previous, next) come from the page's `data-*-label` attributes, so
 * no copy lives here; without them, or without script, the link simply opens
 * the file. A modifier key or a middle click still opens it in a new tab. */

const DIALOG = "site-lightbox";
const LOCK = "has-lightbox";

type Words = { close: string; previous?: string; next?: string };
type State = { links: HTMLAnchorElement[]; index: number };
const state: State = { links: [], index: 0 };

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function lightbox(): HTMLDialogElement {
  const existing = document.querySelector<HTMLDialogElement>(`dialog.${DIALOG}`);
  if (existing) return existing;
  const dialog = element("dialog", DIALOG);
  const bar = element("div", `${DIALOG}__bar`);
  const count = element("span", `${DIALOG}__count`);
  count.setAttribute("aria-live", "polite");
  const form = element("form");
  form.method = "dialog";
  form.append(element("button", `${DIALOG}__close`));
  bar.append(count, form);
  const stage = element("div", `${DIALOG}__stage`);
  const previous = element("button", `${DIALOG}__step ${DIALOG}__step--previous`);
  const next = element("button", `${DIALOG}__step ${DIALOG}__step--next`);
  for (const [button, glyph, step] of [[previous, "‹", -1], [next, "›", 1]] as const) {
    button.type = "button";
    const g = element("span");
    g.setAttribute("aria-hidden", "true");
    g.textContent = glyph;
    button.append(g);
    button.addEventListener("click", () => go(step));
  }
  const figure = element("figure");
  figure.append(element("img"), element("figcaption"));
  stage.append(previous, figure, next);
  dialog.append(bar, stage);
  // a click on the backdrop (the dialog itself) closes it
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    // keys pressed in the dialog are the dialog's: a lens listening on the
    // document must not also go back on Esc or turn a page on an arrow
    event.stopPropagation();
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else return;
    event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    dialog.querySelector("img")?.removeAttribute("src");
    document.documentElement.classList.remove(LOCK);
    state.links[state.index]?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  return dialog;
}

function show(dialog: HTMLDialogElement) {
  const link = state.links[state.index];
  const picture = dialog.querySelector("img");
  const caption = dialog.querySelector("figcaption");
  const count = dialog.querySelector(`.${DIALOG}__count`);
  if (!link || !picture || !caption || !count) return;
  picture.src = link.href;
  picture.alt = link.querySelector("img")?.alt.trim() ?? "";
  caption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent?.trim() ?? "";
  count.textContent = state.links.length > 1 ? `${state.index + 1} / ${state.links.length}` : "";
  // named by what it shows: the caption, else the picture
  dialog.setAttribute("aria-label", caption.textContent || picture.alt);
}

function go(step: number) {
  const dialog = document.querySelector<HTMLDialogElement>(`dialog.${DIALOG}`);
  if (!dialog || state.links.length < 2) return;
  state.index = (state.index + step + state.links.length) % state.links.length;
  show(dialog);
}

function open(link: HTMLAnchorElement, words: Words) {
  const dialog = lightbox();
  const group = link.closest(".journey__media, .entry-hero");
  state.links = group ? [...group.querySelectorAll<HTMLAnchorElement>("a.journey__zoom")] : [link];
  state.index = Math.max(0, state.links.indexOf(link));
  const stepping = state.links.length > 1 && !!words.previous && !!words.next;
  dialog.toggleAttribute("data-single", !stepping);
  const set = (selector: string, label: string | undefined) => {
    const button = dialog.querySelector(selector);
    if (!button) return;
    if (label) button.setAttribute("aria-label", label);
  };
  const close = dialog.querySelector(`.${DIALOG}__close`);
  if (close) close.textContent = words.close;
  set(`.${DIALOG}__step--previous`, words.previous);
  set(`.${DIALOG}__step--next`, words.next);
  show(dialog);
  document.documentElement.classList.add(LOCK);
  dialog.showModal();
}

document.addEventListener(
  "click",
  (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>("a.journey__zoom");
    if (!link) return;
    const host = link.closest<HTMLElement>("[data-close-label]");
    if (!host?.dataset.closeLabel || typeof HTMLDialogElement !== "function") return;
    event.preventDefault();
    event.stopPropagation();
    // a swipe through a pile of slides is not a click on the slide
    if (link.closest("[data-swiping]")) return;
    open(link, {
      close: host.dataset.closeLabel,
      previous: host.dataset.previousLabel,
      next: host.dataset.nextLabel,
    });
  },
  true,
);
