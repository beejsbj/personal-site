/** What makes a page's blocks live, in Daylight (src/components/Blocks.astro),
 * and a card on the Lab's list that plays its experiment in place
 * (src/components/LabCard.astro, which marks its room `data-stage-room`).
 *
 * An embed or a model stands as its poster until its button is pressed.
 * Then, and not before, an embed's frame is made in the stage's own room,
 * or the viewer is fetched (./model-viewer, a chunk of its own) and shows
 * the model there. The poster stays, keeping the stage's size, until the
 * frame has loaded (`data-live` is "loading", then "on"). A second press,
 * or Escape from anywhere in the block, puts it away and brings the poster
 * back. Only one stage is showing on a page at a time: showing another puts
 * the first away, so a page never runs several heavy pieces at once.
 *
 * The Labbook's Pens and demos (src/design/compounds/Artifact.astro) stand
 * on this same stage, so they are one of the same: pressing one puts away
 * whichever other is showing, a card's or a block's included. Their ask
 * (`data-stage-ask`) is a link, so a modified click is left to open it, and
 * it is taken off while the frame shows, which takes the focus, as it
 * always did, and comes back with the poster.
 *
 * A Pen is shown through its result alone (`PEN_CHROME`). A piece held
 * small, a card's or a Labbook entry's, is shown in a window of its own
 * over the page (`data-stage-window` on its stage, `openWindow`): as big
 * as the lens makes it from the press, so it does not grow as it loads,
 * and nothing round its stage moves.
 *
 * A film that loops plays by itself, silently, while it is in view, unless
 * the visitor asked for less motion; its controls are always there.
 *
 * One listener for every stage on every page, so a page the router swaps
 * in needs nothing set up. */

import "../styles/stage-window.css";

/** What a stage is showing, and how to put it away. */
const showing = new Map<HTMLElement, () => void>();

const stageOf = (button: Element) =>
  document.getElementById(button.getAttribute("aria-controls") ?? "");
const buttonOf = (stage: HTMLElement) =>
  stage.id
    ? document.querySelector<HTMLElement>(
        `[data-block-toggle][aria-controls="${CSS.escape(stage.id)}"]`,
      )
    : null;
/** What asks for a stage once it is put away: its button, or, for a
 * Labbook piece, the link standing in its poster. */
const askOf = (stage: HTMLElement) =>
  buttonOf(stage) ?? stage.querySelector<HTMLElement>("[data-artifact-load]");
const statusOf = (stage: HTMLElement) =>
  stage.parentElement?.querySelector<HTMLElement>(".block-stage__status");

function setPressed(stage: HTMLElement, pressed: boolean) {
  const button = buttonOf(stage);
  if (!button) return;
  button.setAttribute("aria-pressed", String(pressed));
  const words = (pressed ? button.dataset.close : button.dataset.load) ?? "";
  button.textContent = words;
  // Said of what it is for, when the page has several of them.
  if (button.dataset.subject)
    button.setAttribute("aria-label", `${words}: ${button.dataset.subject}`);
}

/** How a frame is made. A piece of someone else's page is given as little
 * as it can run on: scripts, and its own origin so it can keep its own
 * state (it is not ours, so this lends it nothing of this site's); popups,
 * so that a link in it can open, and open free of the sandbox. Not forms,
 * dialogs, downloads, pointer lock or leading this page away. Only
 * fullscreen is lent, and the referrer is this site's name alone. It is
 * made on a press, so it loads at once. */
function makeFrame(src: string, title: string) {
  const element = document.createElement("iframe");
  element.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
  );
  element.referrerPolicy = "strict-origin";
  element.loading = "eager";
  element.allow = "fullscreen";
  element.title = title;
  element.src = src;
  if (PEN.test(src)) {
    // Larger than its room by the embed's bars, which the room hides. Said
    // on the frame itself, so no lens's own rule for its frames undoes it.
    const { top, right, bottom, left } = PEN_CHROME;
    element.dataset.pen = "";
    Object.assign(element.style, {
      position: "absolute",
      // Placed against its room's own edges, not a grid's cell in it.
      gridArea: "auto",
      inset: `${-top}px auto auto ${-left}px`,
      width: `calc(100% + ${left + right}px)`,
      height: `calc(100% + ${top + bottom}px)`,
      maxWidth: "none",
      maxHeight: "none",
      margin: "0",
    });
  }
  return element;
}

/** CodePen's embed draws a bar of tabs over a Pen's result and a toolbar
 * under it, whatever its address asks: `default-tab=result` chooses the
 * tab that is open, and nothing an account like this site's can ask for
 * leaves the bars out. So a Pen's frame is made larger than the room it
 * is shown through by exactly those bars, and the room, which clips, shows
 * the result alone. Measured on the embed, the same at every size: a 1px
 * border round a 50px bar of tabs and a 30px toolbar. The link out to the
 * Pen's own page is always beside it. */
const PEN_CHROME = { top: 51, right: 1, bottom: 31, left: 1 };
const PEN = /^https:\/\/codepen\.io\/[\w-]+\/embed\//;

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
function openWindow(stage: HTMLElement) {
  const title = stage.dataset.title ?? stage.dataset.artifactTitle ?? "";
  const anchor =
    (stage.dataset.stageWindow === "ask" && askOf(stage)) || stage;
  const close = buttonOf(stage)?.dataset.close ?? stage.dataset.close;
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
      putAway(stage);
      askOf(stage)?.focus();
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
    parseFloat(getComputedStyle(win).getPropertyValue("--stage-window-gap")) ||
    12;
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

function putAway(stage: HTMLElement) {
  showing.get(stage)?.();
  showing.delete(stage);
  setPressed(stage, false);
}

function show(stage: HTMLElement, { focus = false } = {}) {
  // Whatever else is showing is put away, a stage whose page has been taken
  // off the screen too (a book's page that is turned away keeps its stage,
  // and would be playing still when turned back to).
  for (const other of [...showing.keys()]) if (other !== stage) putAway(other);
  const poster = [...stage.childNodes];
  const status = statusOf(stage);
  const say = (words = "") => status && (status.textContent = words);
  // Whatever was put in the stage leaves, and what stood there returns.
  let leave = () => {};
  showing.set(stage, () => {
    leave();
    stage.removeAttribute("aria-busy");
    delete stage.dataset.live;
    stage.replaceChildren(...poster);
    say();
  });
  setPressed(stage, true);
  say();

  const { model } = stage.dataset;
  const frame = stage.dataset.frame ?? stage.dataset.artifactFrame;
  const title = stage.dataset.title ?? stage.dataset.artifactTitle ?? "";
  if (frame) {
    // The poster stays, under the frame, until the frame has loaded; then
    // it is hidden, still holding the room, and shows again when put away.
    const element = makeFrame(frame, title);
    // Held small, it opens in its window; where it is, a Pen's stage
    // clips its frame to its result while it shows.
    const opened =
      stage.hasAttribute("data-stage-window") && "showPopover" in stage
        ? openWindow(stage)
        : null;
    if (opened) leave = opened.shut;
    else if (element.dataset.pen !== undefined) {
      const was = stage.style.overflow;
      stage.style.overflow = "clip";
      leave = () => (stage.style.overflow = was);
    }
    stage.dataset.live = "loading";
    stage.setAttribute("aria-busy", "true");
    say(stage.dataset.loading);
    element.addEventListener("load", () => {
      if (!showing.has(stage) || !element.isConnected) return;
      stage.dataset.live = "on";
      stage.removeAttribute("aria-busy");
      say();
    });
    stage.querySelector("[data-stage-ask]")?.remove();
    (opened?.glass ?? stage).append(element);
    if (focus) element.focus();
    return;
  }
  if (!model) return;

  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", title);
  stage.setAttribute("aria-busy", "true");
  stage.replaceChildren(canvas);
  const still = () => showing.has(stage) && canvas.isConnected;
  import("./model-viewer")
    .then(({ showModel }) =>
      showModel(canvas, {
        src: model,
        format: stage.dataset.format ?? "",
        rotation: stage.dataset.rotation?.split(",").map(Number),
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    )
    .then((dispose) => {
      // Put away while it was loading: nothing is left running.
      if (!still()) return dispose();
      leave = dispose;
      stage.removeAttribute("aria-busy");
      say(stage.dataset.hint);
    })
    .catch((error) => {
      console.warn(error);
      if (!still()) return;
      putAway(stage);
      say(stage.dataset.failed);
    });
}

document.addEventListener("click", (event) => {
  const button = (event.target as Element | null)?.closest?.(
    "[data-block-toggle]",
  );
  const stage = button && stageOf(button);
  if (!stage) return;
  if (showing.has(stage)) putAway(stage);
  else show(stage);
});

// A Labbook piece's ask is a link: settled while capturing, before the
// router looks, and a modified click is left to open the link as links do.
document.addEventListener(
  "click",
  (event) => {
    const stage = (event.target as Element | null)
      ?.closest?.("[data-artifact-load]")
      ?.closest<HTMLElement>("[data-block-stage][data-artifact-frame]");
    if (!stage) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (!showing.has(stage)) show(stage, { focus: true });
  },
  { capture: true },
);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const stage = (event.target as Element | null)
    ?.closest?.(".block, [data-stage-room]")
    ?.querySelector<HTMLElement>("[data-block-stage]");
  if (!stage || !showing.has(stage)) return;
  putAway(stage);
  askOf(stage)?.focus();
});

const calm = matchMedia("(prefers-reduced-motion: reduce)");
const inView = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    const film = target as HTMLVideoElement;
    if (isIntersecting && !calm.matches) film.play().catch(() => {});
    else film.pause();
  }
});
/** Watch the looping films on the page. Asked again for each page the
 * router brings in; watching a film twice is watching it once. */
function watchFilms() {
  for (const film of document.querySelectorAll("video[data-block-loop]"))
    inView.observe(film);
}
document.addEventListener("astro:page-load", watchFilms);
watchFilms();
