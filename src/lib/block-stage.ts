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
 * A film that loops plays by itself, silently, while it is in view, unless
 * the visitor asked for less motion; its controls are always there.
 *
 * One listener for every stage on every page, so a page the router swaps
 * in needs nothing set up. */

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
  return element;
}

function putAway(stage: HTMLElement) {
  showing.get(stage)?.();
  showing.delete(stage);
  setPressed(stage, false);
}

function show(stage: HTMLElement, { focus = false } = {}) {
  for (const other of [...showing.keys()])
    if (other !== stage)
      other.isConnected ? putAway(other) : showing.delete(other);
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
    stage.append(element);
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
