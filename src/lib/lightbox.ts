/** Every journey picture opens full size over the page, in every lens.
 *
 * One listener on the document, in the capture phase, so a lens's own router
 * (or Astro's) never sees the click. The dialog is made on first use and again
 * after a page swap removes it. Its close button's words come from the page
 * (`data-close-label` on the journey), so no copy lives here; without them,
 * or without script, the link simply opens the file. A modifier key or a
 * middle click still opens it in a new tab. */

const DIALOG = "site-lightbox";

function lightbox(closeLabel: string): HTMLDialogElement {
  let dialog = document.querySelector<HTMLDialogElement>(`dialog.${DIALOG}`);
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = DIALOG;
    const figure = document.createElement("figure");
    figure.append(document.createElement("img"), document.createElement("figcaption"));
    const form = document.createElement("form");
    form.method = "dialog";
    const close = document.createElement("button");
    close.className = `${DIALOG}__close`;
    form.append(close);
    dialog.append(figure, form);
    // a click on the backdrop (the dialog itself, outside its figure) closes it
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog?.close();
    });
    dialog.addEventListener("close", () => {
      dialog?.querySelector("img")?.removeAttribute("src");
    });
    document.body.append(dialog);
  }
  const close = dialog.querySelector("button");
  if (close) close.textContent = closeLabel;
  return dialog;
}

function open(link: HTMLAnchorElement, closeLabel: string) {
  const dialog = lightbox(closeLabel);
  const picture = dialog.querySelector("img");
  const caption = dialog.querySelector("figcaption");
  if (!picture || !caption) return;
  picture.src = link.href;
  picture.alt = link.querySelector("img")?.alt.trim() ?? "";
  caption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent?.trim() ?? "";
  // named by what it shows: the caption, else the picture
  dialog.setAttribute("aria-label", caption.textContent || picture.alt);
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
    // a swipe through a deck of slides is not a click on the slide
    if (link.closest("[data-swiping]")) return;
    open(link, host.dataset.closeLabel);
  },
  true,
);
