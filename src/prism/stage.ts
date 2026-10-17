/** The prism itself: a pentagonal prism whose five faces are the same live
 * portfolio page, each refracted through one lens. Opening pulls the camera
 * back out of the current face (Prism Exit); arrows turn the prism one face
 * at a time (Face Travel); stepping in pushes the camera through the front
 * face and adopts its lens. The face you came from is the live page itself,
 * held in place (live-page.ts): pulling out shrinks it onto the prism in the
 * middle of whatever it was doing, and stepping back in hands it back
 * untouched. The other faces are same-origin iframes of the current page,
 * opened already settled, so what you see from outside is what you walk
 * into. */
import { LENSES, type Lens } from "./lenses";
import { FACE_PARAM, currentLens, setLens } from "./lens-state";
import { holdPage, type LivePage } from "./live-page";
import { prewarmShell } from "./shell-runtime";
import {
  BODY_Y,
  EYE_Y,
  SIDES,
  TURN,
  bodyPose,
  facing,
  facingTrack,
  geometry,
  pagePose,
  type Geometry,
  type Pose,
} from "./camera";

const JOURNEY_KEY = "prism:journey";
const EXITS_KEY = "prism:exits";
const OUT_MS = 1500;
const TRAVEL_MS = 950;
/** A face turned away: drawn (so it stays rasterised) but not seen. */
const AWAY = 0;
const IN_MS = 1100;

const measure = () => geometry(innerWidth, innerHeight);

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Same-origin faces share this page's main thread, so a face that isn't
 * being looked at, or any face while the camera moves, must hold still. The
 * live page's face is this document. */
function setIdle(face: HTMLIFrameElement | null, idle: boolean) {
  const doc = face ? face.contentDocument : document;
  doc?.documentElement.toggleAttribute("data-prism-idle", idle);
}

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
  let backdrop: HTMLElement | null = null;
  /** One per lens; null for the live page's own face. */
  let frames: (HTMLIFrameElement | null)[] = [];
  /** The lens whose face is the live page (the one the faces were built on). */
  let home = "";
  let loaded: Promise<unknown> = Promise.resolve();
  /** The page, while the prism holds it. */
  let held: LivePage | undefined;
  let closing: (() => void) | undefined;

  function build() {
    if (stage && home === currentLens()) return stage;
    teardown();
    home = currentLens();
    // The room: its dark, the light and the whisper. It sits under the page,
    // so the page can be a face of the prism without anything drawn over it.
    backdrop = document.createElement("div");
    backdrop.id = "prism-backdrop";
    backdrop.dataset.dormant = "";
    backdrop.setAttribute("aria-hidden", "true");
    // White light in from the left; the five lenses fan out to the right.
    const spectrum = LENSES.map((lens, i) => {
      const top = 52 + i * 8;
      return `<polygon class="prism-band" data-band="${lens.id}" style="--band:${lens.signal}" points="50,50 100,${top} 100,${top + 8}"/>`;
    }).join("");
    backdrop.innerHTML = `
      <svg class="prism-light" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="prism-beam" x1="0" y1="28" x2="50" y2="50" vector-effect="non-scaling-stroke"/>
        ${spectrum}
      </svg>
      <p class="prism-whisper">Same work. Different light.</p>`;
    stage = document.createElement("div");
    stage.id = "prism-stage";
    stage.className = "prism-stage";
    // Dormant, not display:none: the faces lay out at full viewport size
    // while the visitor is still deciding, so showing them costs no relayout.
    stage.dataset.dormant = "";
    stage.dataset.outside = backdrop.dataset.outside = "false";
    stage.inert = true;
    stage.setAttribute("aria-hidden", "true");
    stage.setAttribute("role", "dialog");
    stage.setAttribute("aria-modal", "true");
    stage.setAttribute("aria-label", "The prism: one portfolio, five lenses");
    stage.innerHTML = `
      <div class="prism-camera">
        <div class="prism-body">
          ${LENSES.map((lens, i) =>
            lens.id === home
              ? // The live page is this face: a clear pane of glass over it.
                // Front from the start, so its dimming never fades over the
                // page as the stage appears.
                `<div class="prism-face prism-face--live is-front" data-face="${lens.id}" style="--i:${i}"></div>`
              : `
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
    frames = [...stage.querySelectorAll(".prism-face")].map((face) =>
      face.querySelector("iframe"),
    );
    loaded = Promise.all(
      frames.flatMap((frame) =>
        frame
          ? new Promise((resolve) => {
              frame.addEventListener(
                "load",
                (event) => {
                  setIdle(frame, true);
                  resolve(event);
                },
                { once: true },
              );
              setTimeout(resolve, 4000);
            })
          : [],
      ),
    );
    // Faces must lay out at full viewport size while dormant; shells size
    // themselves on mount, and a 0x0 face never recovers.
    applyGeometry(stage, measure());
    // Both live outside <body>: while the prism is open the body is the live
    // face, carried by the camera, and the room sits under it, the prism
    // over it.
    document.documentElement.append(backdrop, stage);
    return stage;
  }

  function teardown() {
    closing?.();
    held?.release();
    held = undefined;
    stage?.remove();
    backdrop?.remove();
    stage = null;
    backdrop = null;
  }

  function preload() {
    build();
  }

  async function open({ onClose }: { onClose?: () => void } = {}) {
    const root = build();
    const room = backdrop!;
    const html = document.documentElement;
    const body = root.querySelector<HTMLElement>(".prism-body")!;
    const origin = Math.max(
      0,
      LENSES.findIndex((lens) => lens.id === home),
    );
    let index = origin;
    let turn = -origin * TURN;
    let at: Pose = { outside: false, turn };
    let busy = true;
    let geometry: Geometry = measure();
    const journey = new Set<string>(read(localStorage, JOURNEY_KEY, []));
    const exits = read(sessionStorage, EXITS_KEY, 0) + 1;
    write(sessionStorage, EXITS_KEY, exits);
    const hostScroll = scrollY;
    const hostRange = Math.max(html.scrollHeight - innerHeight, 1);

    await loaded;
    await shellsReady(frames);

    const layout = () => {
      geometry = measure();
      applyGeometry(root, geometry);
    };
    /** Only the face being looked at, with the camera still, may move. */
    /** What carries face i: its frame's face, or the live page's sheet. */
    const sheets = () =>
      [...root.querySelectorAll<HTMLElement>(".prism-face")].map((face, i) =>
        i === origin ? held?.sheet : face,
      );
    // A face turned away from the eye is still drawn, all but transparent,
    // rather than culled: a culled layer loses its tiles, so a face coming
    // round would be painted late (blank, then filled in, mid-turn). Each
    // face switches between the two while it is edge-on, in step with the
    // camera (same timing and easing; the camera's numbers move linearly in
    // its progress, so facingTrack's offsets land on the frame it turns).
    const shade = (from: Pose, to: Pose, timing: KeyframeAnimationOptions) =>
      sheets().flatMap((sheet, i) => {
        if (!sheet) return [];
        const track = facingTrack(geometry, from, to, i);
        if (track.length < 2) {
          sheet.style.opacity = String(track[0].toward ? 1 : AWAY);
          return [];
        }
        const keyframes: Keyframe[] = track.map(({ offset, toward }) => ({
          offset,
          opacity: toward ? 1 : AWAY,
          easing: "step-end",
        }));
        keyframes.push({ offset: 1, opacity: keyframes.at(-1)!.opacity });
        return [sheet.animate(keyframes, timing)];
      });
    const shadeStill = (pose: Pose) =>
      sheets().forEach((sheet, i) => {
        if (sheet)
          sheet.style.opacity = String(facing(geometry, pose, i) ? 1 : AWAY);
      });
    const rest = (front: number | null) =>
      frames.forEach((face, i) => setIdle(face, i !== front));
    // Web Animations keep the camera on the compositor and report the real
    // finish, even if a face is busy on the main thread. The live page moves
    // with the camera on the same timeline, in the same function list.
    const move = async (outside: boolean, ms: number, easing: string) => {
      rest(null);
      const to: Pose = { outside, turn };
      root.dataset.outside = room.dataset.outside = String(outside);
      const timing: KeyframeAnimationOptions = {
        duration: reduced() ? 0 : ms,
        easing,
        fill: "forwards",
      };
      const camera = body.animate(
        [
          { transform: bodyPose(geometry, at) },
          { transform: bodyPose(geometry, to) },
        ],
        timing,
      );
      const page = held?.animate(
        pagePose(geometry, at, origin),
        pagePose(geometry, to, origin),
        timing,
      );
      const shading = shade(at, to, timing);
      await Promise.all([camera.finished, page?.finished]).catch(() => {});
      at = to;
      body.style.transform = bodyPose(geometry, at);
      held?.set(pagePose(geometry, at, origin));
      shadeStill(at);
      camera.cancel();
      page?.cancel();
      shading.forEach((animation) => animation.cancel());
      if (outside) rest(index);
    };

    // Each face opens at the same place in the story as the page we left.
    const ratio = hostScroll / hostRange;
    frames.forEach((frame) => {
      const win = frame?.contentWindow;
      if (!win) return;
      const range = win.document.documentElement.scrollHeight - innerHeight;
      win.scrollTo(0, Math.max(0, ratio * range));
    });

    const render = () => {
      const lens = LENSES[index];
      journey.add(lens.id);
      write(localStorage, JOURNEY_KEY, [...journey]);
      const free = journey.size >= SIDES;
      root.dataset.journey = free ? "revisiting" : "first";
      root.style.setProperty("--signal", lens.signal);
      room.style.setProperty("--signal", lens.signal);
      root.querySelector(".prism-name")!.textContent = lens.name;
      root.querySelector(".prism-source")!.textContent = `from ${lens.source}`;
      root.querySelector(".prism-count")!.textContent = free
        ? `${lens.name}, lens ${index + 1} of ${SIDES}`
        : `${journey.size} of ${SIDES} lenses seen`;
      root.querySelectorAll<HTMLElement>(".prism-face").forEach((face, i) => {
        face.classList.toggle("is-front", i === index);
      });
      room.querySelectorAll<HTMLElement>(".prism-band").forEach((band) => {
        band.classList.toggle("is-lit", band.dataset.band === lens.id);
      });
      root.querySelectorAll<HTMLElement>(".prism-dot").forEach((dot, i) => {
        dot.setAttribute("aria-current", String(i === index));
      });
      // Stepping in should find this lens already parsed and ready.
      prewarmShell(lens.id);
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

    /** The prism lets go of the page: an ordinary page again. */
    const letGo = () => {
      held?.release();
      held = undefined;
      // the room was under the page; it must not show through it now
      room.remove();
      html.classList.remove("prism-is-open");
      html.removeAttribute("data-prism-idle");
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
      const faceScroll = frames[index]?.contentWindow?.scrollY ?? 0;
      root.dataset.entering = "";
      await move(false, IN_MS, "cubic-bezier(.7,0,.2,1)");
      if (index === origin) {
        // Back where you were: the face was the page all along. Let go of
        // it exactly as it is; nothing reloads, nothing replays.
        letGo();
        close();
        return;
      }
      // The camera now fills the screen with that face, a still frame over
      // the page. Change the page's lens behind it (settled: it is already
      // on screen, so no entrance), let it paint, then dissolve the prism.
      letGo();
      html.setAttribute("data-prism-settled", "");
      await setLens(lens.id);
      scrollTo({ top: faceScroll, behavior: "instant" });
      await frame();
      await frame();
      afterimage(previous, lens, exits);
      await root.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduced() ? 0 : 320,
        easing: "ease-out",
        fill: "forwards",
      }).finished;
      close();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") travel(1);
      else if (event.key === "ArrowLeft" && root.dataset.journey === "revisiting")
        travel(-1);
      else if (event.key === "Escape") stepIn(origin);
      else if (
        event.key === "Enter" &&
        (event.target === document.body || event.target === html)
      )
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
    // While the prism is open it owns the keyboard: the live page under it
    // must not also turn a page on → or go back on Esc. Keys still do what
    // they do on the prism's own buttons.
    addEventListener(
      "keydown",
      (event) => {
        event.stopPropagation();
        onKey(event);
      },
      { signal, capture: true },
    );
    root.addEventListener("pointerdown", onPointerDown, { signal });
    root.addEventListener("pointerup", onPointerUp, { signal });
    root.addEventListener("click", onClick, { signal });
    addEventListener(
      "resize",
      () => {
        layout();
        body.style.transition = "none";
        body.style.transform = bodyPose(geometry, at);
        held?.set(pagePose(geometry, at, origin));
        shadeStill(at);
      },
      { signal },
    );

    function close() {
      closing = undefined;
      controller.abort();
      // Faces are rebuilt next time so they follow the page the visitor is on.
      root.remove();
      room.remove();
      stage = null;
      backdrop = null;
      onClose?.();
    }
    // Torn down mid-flight (a navigation): leave a plain page behind.
    closing = () => {
      closing = undefined;
      controller.abort();
      letGo();
    };

    // Prism Exit: the page itself becomes its face, exactly where it is (the
    // stage is clear glass and the room is under it, so nothing changes on
    // screen), then the camera pulls back.
    html.classList.add("prism-is-open");
    layout();
    render();
    body.style.transition = "none";
    body.style.transform = bodyPose(geometry, at);
    root.dataset.outside = room.dataset.outside = "false";
    held = holdPage();
    held.set(pagePose(geometry, at, origin));
    shadeStill(at);
    // The page holds still while the camera moves; faces too.
    rest(null);
    delete root.dataset.dormant;
    delete room.dataset.dormant;
    root.inert = false;
    root.removeAttribute("aria-hidden");
    // Give the faces a moment to rasterise before the camera moves, so the
    // pull starts smooth.
    await frame();
    await frame();
    await new Promise((resolve) => setTimeout(resolve, 90));
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
    destroy: teardown,
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

function applyGeometry(root: HTMLElement, geometry: Geometry) {
  const { w, h, apothem, radius, perspective, pull } = geometry;
  root.style.setProperty("--face-w", `${w}px`);
  root.style.setProperty("--face-h", `${h}px`);
  root.style.setProperty("--apothem", `${apothem}px`);
  root.style.setProperty("--cap", `${radius * 2}px`);
  root.style.setProperty("--perspective", `${perspective}px`);
  root.style.setProperty("--pull", `${pull}px`);
  root.style.setProperty("--body-y", `${BODY_Y * 100}%`);
  root.style.setProperty("--eye-y", `${EYE_Y * 100}%`);
}

/** Lens faces mount their shells after the frame loads. On a cold first open,
 * wait briefly for them so the camera never moves over half-built faces. */
function shellsReady(faces: (HTMLIFrameElement | null)[], timeout = 1500) {
  const start = performance.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      const pending = faces.some((face) => {
        const root = face?.contentDocument?.documentElement;
        return (
          root?.hasAttribute("data-lens-shell") &&
          !root.hasAttribute("data-shell-ready")
        );
      });
      if (!pending || performance.now() - start > timeout) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
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
