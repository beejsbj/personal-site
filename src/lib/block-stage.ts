/** What makes a page's blocks live, in Daylight (src/components/Blocks.astro).
 *
 * An embed or a model stands as its poster until its button is pressed.
 * Then, and not before, an embed's frame is made in the stage's own room,
 * or the viewer is fetched (./model-viewer, a chunk of its own) and shows
 * the model there. A second press, or Escape from anywhere in the block,
 * puts it away and brings the poster back.
 *
 * A film that loops plays by itself, silently, while it is in view, unless
 * the visitor asked for less motion; its controls are always there.
 *
 * One listener for every stage on every page, so a page the router swaps
 * in needs nothing set up. */

/** What a stage is showing, and how to put it away. */
const showing = new WeakMap<HTMLElement, () => void>();

const stageOf = (button: Element) =>
  document.getElementById(button.getAttribute("aria-controls") ?? "");
const buttonOf = (stage: HTMLElement) =>
  document.querySelector<HTMLElement>(
    `[data-block-toggle][aria-controls="${CSS.escape(stage.id)}"]`,
  );
const statusOf = (stage: HTMLElement) =>
  stage.parentElement?.querySelector<HTMLElement>(".block-stage__status");

function setPressed(stage: HTMLElement, pressed: boolean) {
  const button = buttonOf(stage);
  if (!button) return;
  button.setAttribute("aria-pressed", String(pressed));
  button.textContent =
    (pressed ? button.dataset.close : button.dataset.load) ?? "";
}

function putAway(stage: HTMLElement) {
  showing.get(stage)?.();
  showing.delete(stage);
  setPressed(stage, false);
}

function show(stage: HTMLElement) {
  const poster = [...stage.childNodes];
  const status = statusOf(stage);
  const say = (words = "") => status && (status.textContent = words);
  // Whatever was put in the stage leaves, and what stood there returns.
  let leave = () => {};
  showing.set(stage, () => {
    leave();
    stage.removeAttribute("aria-busy");
    stage.replaceChildren(...poster);
    say();
  });
  setPressed(stage, true);
  say();

  const { frame, model, title = "" } = stage.dataset;
  if (frame) {
    const element = document.createElement("iframe");
    element.src = frame;
    element.title = title;
    element.allow = "fullscreen";
    stage.replaceChildren(element);
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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const stage = (event.target as Element | null)
    ?.closest?.(".block")
    ?.querySelector<HTMLElement>("[data-block-stage]");
  if (!stage || !showing.has(stage)) return;
  putAway(stage);
  buttonOf(stage)?.focus();
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
