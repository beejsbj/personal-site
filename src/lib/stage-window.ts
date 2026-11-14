/** The window a piece held small is shown in (src/lib/block-stage.ts asks
 * for it on a press, so the page does not carry it before then). */

const clamp = (value: number, least: number, most: number) =>
  Math.max(least, Math.min(value, most));

/** The window a piece held small is shown in, over the page: in the top
 * layer, so nothing it stands in clips it, tilts it or makes room for it.
 * The lens gives it its look and its size (src/styles/stage-window.css);
 * it is laid over its stage, as near its middle as the screen allows, or
 * for `data-stage-window="ask"` unfolded from what asked for it (Back
 * Page's sticky note), just above it, or under it, which it leaves to be
 * pressed again; and it keeps to it as the page scrolls. It is open at
 * its full size from the press: until the piece has loaded it shows the
 * poster and the words saying it is loading, then the piece, the same
 * size. Its bar names the piece and has the words that put it away. */
export function openWindow(
  stage: HTMLElement,
  { away, ask }: { away: () => void; ask: () => HTMLElement | null },
) {
  const title = stage.dataset.title ?? stage.dataset.artifactTitle ?? "";
  const anchor =
    (stage.dataset.stageWindow === "ask" && ask()) || stage;
  const close = ask()?.dataset.close ?? stage.dataset.close;
  const win = document.createElement("div");
  win.className = "stage-window";
  win.popover = "manual";
  win.setAttribute("role", "group");
  win.setAttribute("aria-label", title);
  const bar = document.createElement("p");
  bar.className = "stage-window__bar";
  const name = document.createElement("span");
  name.className = "stage-window__name";
  name.textContent = title;
  bar.append(name);
  if (close) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-window__close";
    button.textContent = close;
    button.setAttribute("aria-label", `${close}: ${title}`);
    button.addEventListener("click", () => {
      away();
      ask()?.focus();
    });
    bar.append(button);
  }
  const glass = document.createElement("div");
  glass.className = "stage-window__glass";
  const poster = stage.querySelector("img");
  if (poster) {
    const still = document.createElement("img");
    still.className = "stage-window__still";
    still.src = poster.currentSrc || poster.src;
    still.alt = "";
    glass.append(still);
  }
  if (stage.dataset.loading) {
    const says = document.createElement("span");
    says.className = "stage-window__says";
    says.textContent = stage.dataset.loading;
    glass.append(says);
  }
  win.append(bar, glass);
  // A press in it is its own: the card or line round its stage, a link
  // in some lenses, is not pressed with it.
  for (const type of ["click", "pointerdown"])
    win.addEventListener(type, (event) => event.stopPropagation());
  stage.append(win);
  win.showPopover();

  // Laid where it was asked for, then kept as far from the stage as that.
  const gap = () =>
    parseFloat(getComputedStyle(win).scrollMarginTop) || 0;
  let from = { x: 0, y: 0 };
  const lay = () => {
    const at = anchor.isConnected ? anchor : stage;
    const a = at.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const g = gap();
    const width = document.documentElement.clientWidth;
    const x = clamp(
      a.left + a.width / 2 - win.offsetWidth / 2,
      g,
      width - g - win.offsetWidth,
    );
    // Over its stage; or unfolded from what asked for it, above it (or
    // under it, with more room there) so that it is still there to press,
    // its glass giving up height to fit the room it has.
    const unfolds = at === anchor && anchor !== stage;
    const above = a.top - 2 * g;
    const under = innerHeight - a.bottom - 2 * g;
    win.style.maxHeight = unfolds ? `${Math.max(above, under)}px` : "";
    const h = win.offsetHeight;
    const y = clamp(
      !unfolds
        ? a.top + a.height / 2 - h / 2
        : h <= above || above >= under
          ? a.top - g - h
          : a.bottom + g,
      g,
      innerHeight - g - h,
    );
    from = { x: x - s.left, y: y - s.top };
    win.style.setProperty(
      "--stage-window-scale",
      String(clamp(a.width / win.offsetWidth, 0.2, 1)),
    );
    win.style.setProperty(
      "--stage-window-origin",
      `${a.left + a.width / 2 - x}px ${a.top + a.height / 2 - y}px`,
    );
    keep();
  };
  const keep = () => {
    const s = stage.getBoundingClientRect();
    win.style.left = `${s.left + from.x}px`;
    win.style.top = `${s.top + from.y}px`;
  };
  let frame = 0;
  const soon = (then: () => void) => () => {
    if (!win.isConnected) return shut();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(then);
  };
  const onScroll = soon(keep);
  const onResize = soon(lay);
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  addEventListener("resize", onResize);
  lay();
  function shut() {
    cancelAnimationFrame(frame);
    document.removeEventListener("scroll", onScroll, { capture: true });
    removeEventListener("resize", onResize);
    win.remove();
  }
  return { glass, shut };
}
