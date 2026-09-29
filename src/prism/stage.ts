/** The prism itself: a pentagonal prism whose five faces are the same live
 * portfolio page, each refracted through one lens. Opening pulls the camera
 * back out of the current face (Prism Exit); arrows turn the prism one face
 * at a time (Face Travel); stepping in pushes the camera through the front
 * face and adopts its lens. Faces are real same-origin iframes of the current
 * page, so what you see from outside is exactly what you walk into. */
import { LENSES, type Lens } from "./lenses";
import { FACE_PARAM, currentLens, setLens } from "./lens-state";

const SIDES = LENSES.length;
const TURN = 360 / SIDES;
const JOURNEY_KEY = "prism:journey";
const EXITS_KEY = "prism:exits";
const OUT_MS = 1500;
const TRAVEL_MS = 950;
const IN_MS = 1100;

type Geometry = ReturnType<typeof measure>;

function measure() {
  const w = innerWidth;
  const h = innerHeight;
  const apothem = w / (2 * Math.tan(Math.PI / SIDES));
  const radius = w / (2 * Math.sin(Math.PI / SIDES));
  const perspective = Math.max(w, h) * 1.15;
  const outsideScale = w < 700 ? 0.5 : 0.34;
  const pull = perspective * (1 / outsideScale - 1);
  return { w, h, apothem, radius, perspective, pull };
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const read = <T>(storage: Storage, key: string, fallback: T): T => {
  try {
    return JSON.parse(storage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
};
const write = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
};

function faceUrl(lens: Lens) {
  const url = new URL(location.href);
  url.searchParams.delete("lens");
  url.searchParams.delete("prism");
  url.searchParams.set(FACE_PARAM, lens.id);
  url.hash = "";
  return url.toString();
}

const CAP_TOP =
  "polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)";

export interface Prism {
  /** Warm the faces while the visitor is still deciding to catch the lure. */
  preload(): void;
  open(options?: { onClose?: () => void }): Promise<void>;
  destroy(): void;
}

export function createPrism(): Prism {
  let stage: HTMLElement | null = null;
  let frames: HTMLIFrameElement[] = [];
  let loaded: Promise<unknown> = Promise.resolve();

  function build() {
    if (stage) return stage;
    stage = document.createElement("div");
    stage.id = "prism-stage";
    stage.className = "prism-stage";
    stage.hidden = true;
    stage.setAttribute("role", "dialog");
    stage.setAttribute("aria-modal", "true");
    stage.setAttribute("aria-label", "The prism: one portfolio, five lenses");
    // White light in from the left; the five lenses fan out to the right.
    const spectrum = LENSES.map((lens, i) => {
      const top = 52 + i * 8;
      return `<polygon class="prism-band" data-band="${lens.id}" style="--band:${lens.signal}" points="50,50 100,${top} 100,${top + 8}"/>`;
    }).join("");
    stage.innerHTML = `
      <svg class="prism-light" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="prism-beam" x1="0" y1="28" x2="50" y2="50" vector-effect="non-scaling-stroke"/>
        ${spectrum}
      </svg>
      <p class="prism-whisper" aria-hidden="true">Same work. Different light.</p>
      <div class="prism-camera">
        <div class="prism-body">
          ${LENSES.map(
            (lens, i) => `
            <div class="prism-face" data-face="${lens.id}" style="--i:${i}">
              <iframe title="${lens.name} lens" src="${faceUrl(lens)}" tabindex="-1" inert aria-hidden="true"></iframe>
            </div>`,
          ).join("")}
          <div class="prism-cap prism-cap--top" style="clip-path:${CAP_TOP}"></div>
          <div class="prism-cap prism-cap--bottom" style="clip-path:${CAP_TOP}"></div>
        </div>
      </div>
      <div class="prism-hud">
        <p class="prism-count" aria-live="polite"></p>
        <div class="prism-nav">
          <button type="button" class="prism-arrow" data-go="-1" aria-label="Previous lens">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
          </button>
          <div class="prism-caption">
            <p class="prism-name"></p>
            <p class="prism-source"></p>
          </div>
          <button type="button" class="prism-arrow" data-go="1" aria-label="Next lens">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>
          </button>
        </div>
        <div class="prism-dots" role="group" aria-label="Jump to a lens">
          ${LENSES.map((lens, i) => `<button type="button" class="prism-dot" data-to="${i}" style="--band:${lens.signal}" aria-label="${lens.name}"></button>`).join("")}
        </div>
        <button type="button" class="prism-enter">Step in</button>
        <p class="prism-keys" aria-hidden="true">← → to turn · Enter to step in · Esc to go back</p>
      </div>`;
    frames = [...stage.querySelectorAll("iframe")];
    loaded = Promise.all(
      frames.map(
        (frame) =>
          new Promise((resolve) => {
            frame.addEventListener("load", resolve, { once: true });
            setTimeout(resolve, 4000);
          }),
      ),
    );
    document.body.append(stage);
    return stage;
  }

  function preload() {
    build();
  }

  async function open({ onClose }: { onClose?: () => void } = {}) {
    const root = build();
    const body = root.querySelector<HTMLElement>(".prism-body")!;
    const origin = Math.max(
      0,
      LENSES.findIndex((lens) => lens.id === currentLens()),
    );
    let index = origin;
    let turn = -origin * TURN;
    let busy = true;
    let geometry: Geometry = measure();
    const journey = new Set<string>(read(localStorage, JOURNEY_KEY, []));
    const exits = read(sessionStorage, EXITS_KEY, 0) + 1;
    write(sessionStorage, EXITS_KEY, exits);
    const hostScroll = scrollY;
    const hostRange = Math.max(
      document.documentElement.scrollHeight - innerHeight,
      1,
    );

    await loaded;

    const layout = () => {
      geometry = measure();
      const { w, h, apothem, radius, perspective, pull } = geometry;
      root.style.setProperty("--face-w", `${w}px`);
      root.style.setProperty("--face-h", `${h}px`);
      root.style.setProperty("--apothem", `${apothem}px`);
      root.style.setProperty("--cap", `${radius * 2}px`);
      root.style.setProperty("--perspective", `${perspective}px`);
      root.style.setProperty("--pull", `${pull}px`);
    };
    const pose = (outside: boolean) =>
      `translateZ(${-geometry.apothem - (outside ? geometry.pull : 0)}px) ` +
      `rotateX(${outside ? -11 : 0}deg) rotateY(${turn}deg)`;
    const move = (outside: boolean, ms: number, easing: string) =>
      new Promise<void>((resolve) => {
        const duration = reduced() ? 1 : ms;
        body.style.transition = `transform ${duration}ms ${easing}`;
        body.style.transform = pose(outside);
        root.dataset.outside = String(outside);
        setTimeout(resolve, duration + 30);
      });

    // Each face opens at the same place in the story as the page we left.
    const ratio = hostScroll / hostRange;
    frames.forEach((frame, i) => {
      const win = frame.contentWindow;
      if (!win) return;
      if (i === origin) win.scrollTo(0, hostScroll);
      else {
        const range = win.document.documentElement.scrollHeight - innerHeight;
        win.scrollTo(0, Math.max(0, ratio * range));
      }
    });

    const render = () => {
      const lens = LENSES[index];
      journey.add(lens.id);
      write(localStorage, JOURNEY_KEY, [...journey]);
      const free = journey.size >= SIDES;
      root.dataset.journey = free ? "revisiting" : "first";
      root.style.setProperty("--signal", lens.signal);
      root.querySelector(".prism-name")!.textContent = lens.name;
      root.querySelector(".prism-source")!.textContent = `from ${lens.source}`;
      root.querySelector(".prism-count")!.textContent = free
        ? `${lens.name}, lens ${index + 1} of ${SIDES}`
        : `${journey.size} of ${SIDES} lenses seen`;
      root.querySelectorAll<HTMLElement>(".prism-face").forEach((face, i) => {
        face.classList.toggle("is-front", i === index);
      });
      root.querySelectorAll<HTMLElement>(".prism-band").forEach((band) => {
        band.classList.toggle("is-lit", band.dataset.band === lens.id);
      });
      root.querySelectorAll<HTMLElement>(".prism-dot").forEach((dot, i) => {
        dot.setAttribute("aria-current", String(i === index));
      });
    };

    const travel = async (step: number) => {
      if (busy || step === 0) return;
      busy = true;
      index = (((index + step) % SIDES) + SIDES) % SIDES;
      turn -= step * TURN;
      render();
      await move(true, TRAVEL_MS * Math.min(Math.abs(step), 2) ** 0.5, "cubic-bezier(.65,0,.25,1)");
      busy = false;
    };

    const jump = (to: number) => {
      let step = to - index;
      if (step > SIDES / 2) step -= SIDES;
      if (step < -SIDES / 2) step += SIDES;
      return travel(step);
    };

    const stepIn = async (to = index) => {
      if (busy) return;
      busy = true;
      if (to !== index) {
        let step = to - index;
        if (step > SIDES / 2) step -= SIDES;
        if (step < -SIDES / 2) step += SIDES;
        index = to;
        turn -= step * TURN;
        render();
      }
      const lens = LENSES[index];
      const previous = LENSES[origin];
      const faceScroll = frames[index].contentWindow?.scrollY ?? 0;
      root.dataset.entering = "";
      await move(false, IN_MS, "cubic-bezier(.7,0,.2,1)");
      setLens(lens.id);
      afterimage(previous, lens, exits);
      document.documentElement.classList.remove("prism-is-open");
      requestAnimationFrame(() => scrollTo(0, faceScroll));
      root.classList.add("is-leaving");
      setTimeout(close, reduced() ? 0 : 260);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") travel(1);
      else if (event.key === "ArrowLeft" && root.dataset.journey === "revisiting")
        travel(-1);
      else if (event.key === "Escape") stepIn(origin);
      else if (event.key === "Enter" && event.target === document.body)
        stepIn();
      else if (event.key === "Tab") trapFocus(event, root);
    };

    let swipeStart: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element).closest(".prism-hud")) return;
      swipeStart = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) travel(1);
        else if (root.dataset.journey === "revisiting") travel(-1);
        return;
      }
      // A tap on the front face walks into it; a tap on a neighbour turns to it.
      const face = (event.target as Element).closest<HTMLElement>(
        ".prism-face",
      );
      if (!face) return;
      const i = Number(face.style.getPropertyValue("--i"));
      if (i === index) stepIn();
      else jump(i);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      const go = target.closest<HTMLElement>("[data-go]");
      const to = target.closest<HTMLElement>("[data-to]");
      if (go) travel(Number(go.dataset.go));
      else if (to) jump(Number(to.dataset.to));
      else if (target.closest(".prism-enter")) stepIn();
    };

    const controller = new AbortController();
    const { signal } = controller;
    document.addEventListener("keydown", onKey, { signal });
    root.addEventListener("pointerdown", onPointerDown, { signal });
    root.addEventListener("pointerup", onPointerUp, { signal });
    root.addEventListener("click", onClick, { signal });
    addEventListener(
      "resize",
      () => {
        layout();
        body.style.transition = "none";
        body.style.transform = pose(root.dataset.outside === "true");
      },
      { signal },
    );

    function close() {
      controller.abort();
      root.hidden = true;
      root.classList.remove("is-leaving", "is-open");
      delete root.dataset.entering;
      // Faces are rebuilt next time so they follow the page the visitor is on.
      root.remove();
      stage = null;
      onClose?.();
    }

    // Prism Exit: appear exactly where the page is, then pull the camera back.
    layout();
    render();
    body.style.transition = "none";
    body.style.transform = pose(false);
    root.dataset.outside = "false";
    root.hidden = false;
    document.documentElement.classList.add("prism-is-open");
    void root.offsetWidth;
    root.classList.add("is-open");
    await move(true, OUT_MS, "cubic-bezier(.6,0,.15,1)");
    root.querySelector<HTMLElement>(".prism-enter")?.focus({
      preventScroll: true,
    });
    busy = false;
  }

  return {
    preload,
    open,
    destroy() {
      stage?.remove();
      stage = null;
    },
  };
}

/** The OLED burn-in from the original sketch: every exit leaves a slightly
 * stronger ghost of the lens you came from over the one you walked into. */
function afterimage(from: Lens, to: Lens, exits: number) {
  if (reduced() || from.id === to.id) return;
  const ghost = document.createElement("div");
  ghost.className = "prism-afterimage";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.setProperty("--from", from.signal);
  ghost.style.setProperty("--to", to.signal);
  ghost.style.setProperty("--burn", String(Math.min(0.18 + exits * 0.08, 0.5)));
  document.body.append(ghost);
  ghost.addEventListener("animationend", () => ghost.remove(), { once: true });
}

function trapFocus(event: KeyboardEvent, root: HTMLElement) {
  const focusable = [
    ...root.querySelectorAll<HTMLElement>(".prism-hud button"),
  ].filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!root.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}
