/** Ball life: the flavour of v1's balls, without drag and without ever
 * moving a click target. Only the painted layers move: each ball link's
 * face (::before) and label, through --face-x/-y/-sx/-sy. Both ignore the
 * pointer (pointer-events: none), so the hit area is always the link's own
 * still circle and every press lands.
 *
 * - Hover: the face leans toward the cursor and swells with a jelly wobble.
 * - Neighbours: the balls beside a hovered one jostle aside a little.
 * - Poke: a pointer swiping fast past a ball knocks its face, which springs
 *   back.
 * - Press: the face squashes; on release it bounces. Touch gets this too.
 * - Keyboard: a focused ball gives a small hop.
 * The homepage cluster gets the most of all of this; the header row less.
 * Frames run only while something moves, then the loop parks. Reduced
 * motion: nothing runs (still balls). No JS: the CSS hover lift remains.
 */
const MOTION = "(prefers-reduced-motion: no-preference)";
const FINE = "(hover: hover) and (pointer: fine)";
const CLUSTER = "(min-width: 62.501rem)";

export const LIFE = {
  cluster: { lean: 5, jostle: 6, poke: 0.06, hover: 1.08, reach: 18 },
  row: { lean: 3, jostle: 2.5, poke: 0.035, hover: 1.06, reach: 10 },
  press: 0.88, // face scale while pressed
  bounce: 3.2, // scale velocity kicked in on release
  hop: 140, // px/s upward kick for a keyboard-focused ball
  pokeSpeed: 700, // px/s a pointer must move to poke
  maxKick: 260, // px/s cap on a poke
  spring: 300, // pull of the face back to its target
  damping: 15, // under-damped: a wobble, not a slide
  scaleSpring: 520,
  scaleDamping: 17,
  squash: 0.0008, // stretch along the direction of travel
  squashLimit: 0.1,
  still: 0.02, // offsets and speeds below this park the loop
} as const;

type Face = {
  el: HTMLElement;
  cx: number;
  cy: number;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  vs: number;
  tx: number;
  ty: number;
  ts: number;
};

export function installBallLife() {
  const motion = window.matchMedia(MOTION);
  const fine = window.matchMedia(FINE);
  const wide = window.matchMedia(CLUSTER);
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const resetters: (() => void)[] = [];
    for (const nav of document.querySelectorAll<HTMLElement>(
      "[data-ball-nav]",
    )) {
      resetters.push(installNav(nav, motion, fine, wide, signal));
    }
    cleanup = () => {
      controller.abort();
      resetters.forEach((reset) => reset());
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}

function installNav(
  nav: HTMLElement,
  motion: MediaQueryList,
  fine: MediaQueryList,
  wide: MediaQueryList,
  signal: AbortSignal,
) {
  const faces: Face[] = [
    ...nav.querySelectorAll<HTMLElement>("[data-ball]"),
  ].map((el) => ({
    el,
    cx: 0,
    cy: 0,
    r: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    s: 1,
    vs: 0,
    tx: 0,
    ty: 0,
    ts: 1,
  }));
  let frame = 0;
  let last = 0;
  let hovered: Face | undefined;
  let pressed: Face | undefined;
  let pointer: { x: number; y: number; t: number } | undefined;

  const tuning = () =>
    nav.dataset.form === "cluster" && wide.matches ? LIFE.cluster : LIFE.row;
  const alive = () => motion.matches && !document.hidden;

  const write = (face: Face) => {
    const speed = Math.hypot(face.vx, face.vy);
    const q = Math.min(LIFE.squashLimit, speed * LIFE.squash);
    const ux = speed ? face.vx / speed : 0;
    const uy = speed ? face.vy / speed : 0;
    const sx = face.s * (1 + q * (ux * ux - uy * uy * 0.5));
    const sy = face.s * (1 + q * (uy * uy - ux * ux * 0.5));
    const style = face.el.style;
    style.setProperty("--face-x", `${face.x.toFixed(2)}px`);
    style.setProperty("--face-y", `${face.y.toFixed(2)}px`);
    style.setProperty("--face-sx", sx.toFixed(4));
    style.setProperty("--face-sy", sy.toFixed(4));
  };
  const wake = (face: Face) => {
    if (face.el.dataset.alive !== undefined) return;
    write(face);
    face.el.dataset.alive = "";
  };
  const rest = (face: Face) => {
    Object.assign(face, { x: 0, y: 0, vx: 0, vy: 0, s: 1, vs: 0 });
    Object.assign(face, { tx: 0, ty: 0, ts: 1 });
    delete face.el.dataset.alive;
    for (const name of ["--face-x", "--face-y", "--face-sx", "--face-sy"])
      face.el.style.removeProperty(name);
  };
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    hovered = pressed = pointer = undefined;
    faces.forEach(rest);
  };

  // Centres in the nav's own coordinates, read from the still hit areas.
  const measure = () => {
    const box = nav.getBoundingClientRect();
    for (const face of faces) {
      const rect = face.el.getBoundingClientRect();
      face.r = rect.width / 2;
      face.cx = rect.left - box.left + face.r;
      face.cy = rect.top - box.top + face.r;
    }
    return box;
  };

  const aim = () => {
    const { lean, jostle, hover } = tuning();
    for (const face of faces) {
      face.tx = face.ty = 0;
      face.ts = face === pressed ? LIFE.press : face === hovered ? hover : 1;
    }
    if (!hovered || !pointer) return;
    const box = nav.getBoundingClientRect();
    const px = pointer.x - box.left;
    const py = pointer.y - box.top;
    const h = hovered;
    const nx = Math.max(-1, Math.min(1, (px - h.cx) / (h.r || 1)));
    const ny = Math.max(-1, Math.min(1, (py - h.cy) / (h.r || 1)));
    h.tx = nx * lean;
    h.ty = ny * lean;
    for (const face of faces) {
      if (face === h) continue;
      const dx = face.cx - h.cx;
      const dy = face.cy - h.cy;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > face.r + h.r + tuning().reach * 2) continue;
      face.tx = (dx / distance) * jostle;
      face.ty = (dy / distance) * jostle;
    }
  };

  const tick = (time: number) => {
    const dt = Math.min((time - (last || time - 16.67)) / 1000, 0.032);
    last = time;
    let moving = false;
    for (const face of faces) {
      face.vx +=
        ((face.tx - face.x) * LIFE.spring - face.vx * LIFE.damping) * dt;
      face.vy +=
        ((face.ty - face.y) * LIFE.spring - face.vy * LIFE.damping) * dt;
      face.x += face.vx * dt;
      face.y += face.vy * dt;
      face.vs +=
        ((face.ts - face.s) * LIFE.scaleSpring - face.vs * LIFE.scaleDamping) *
        dt;
      face.s += face.vs * dt;
      const settled =
        Math.abs(face.x - face.tx) < LIFE.still &&
        Math.abs(face.y - face.ty) < LIFE.still &&
        Math.abs(face.vx) + Math.abs(face.vy) < LIFE.still * 10 &&
        Math.abs(face.s - face.ts) < LIFE.still / 10 &&
        Math.abs(face.vs) < LIFE.still;
      if (settled) {
        Object.assign(face, {
          x: face.tx,
          y: face.ty,
          s: face.ts,
          vx: 0,
          vy: 0,
          vs: 0,
        });
      } else moving = true;
      write(face);
    }
    if (moving) {
      frame = requestAnimationFrame(tick);
      return;
    }
    frame = 0;
    last = 0;
    // Fully home: hand the faces back to CSS.
    for (const face of faces)
      if (!face.x && !face.y && face.s === 1 && face.ts === 1) rest(face);
  };
  const start = () => {
    faces.forEach(wake);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const faceOf = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.("[data-ball]");
    return faces.find((face) => face.el === el);
  };

  nav.addEventListener(
    "pointerenter",
    (event) => {
      if (event.pointerType === "touch") return;
      measure();
    },
    { signal },
  );
  nav.addEventListener(
    "pointermove",
    (event) => {
      if (!alive() || !fine.matches || event.pointerType === "touch") return;
      const now = event.timeStamp || performance.now();
      const point = { x: event.clientX, y: event.clientY, t: now };
      if (!faces[0]?.r) measure();
      // A fast swipe pokes whichever faces it brushes past.
      if (pointer && now > pointer.t) {
        const dt = (now - pointer.t) / 1000;
        const vx = (point.x - pointer.x) / dt;
        const vy = (point.y - pointer.y) / dt;
        if (dt < 0.1 && Math.hypot(vx, vy) > LIFE.pokeSpeed) {
          const box = nav.getBoundingClientRect();
          const { poke } = tuning();
          for (const face of faces) {
            const d = Math.hypot(
              point.x - box.left - face.cx,
              point.y - box.top - face.cy,
            );
            if (d > face.r + 6) continue;
            const kick = Math.min(LIFE.maxKick, Math.hypot(vx, vy) * poke);
            const speed = Math.hypot(vx, vy);
            face.vx += (vx / speed) * kick;
            face.vy += (vy / speed) * kick;
          }
        }
      }
      pointer = point;
      hovered = faceOf(event.target);
      aim();
      start();
    },
    { signal, passive: true },
  );
  nav.addEventListener(
    "pointerleave",
    () => {
      hovered = pointer = undefined;
      if (!alive()) return;
      aim();
      start();
    },
    { signal },
  );
  nav.addEventListener(
    "pointerdown",
    (event) => {
      if (!alive() || event.button) return;
      pressed = faceOf(event.target);
      if (!pressed) return;
      if (!pressed.r) measure();
      aim();
      start();
    },
    { signal },
  );
  const release = () => {
    if (!pressed) return;
    const face = pressed;
    pressed = undefined;
    aim();
    face.vs += LIFE.bounce;
    start();
  };
  document.addEventListener("pointerup", release, { signal });
  document.addEventListener("pointercancel", release, { signal });
  nav.addEventListener(
    "focusin",
    (event) => {
      if (!alive()) return;
      const face = faceOf(event.target);
      if (!face || !face.el.matches(":focus-visible")) return;
      face.vy -= LIFE.hop;
      start();
    },
    { signal },
  );
  const refresh = () => {
    if (!alive()) reset();
  };
  motion.addEventListener("change", refresh, { signal });
  document.addEventListener("visibilitychange", refresh, { signal });
  window.addEventListener(
    "resize",
    () => faces.forEach((face) => (face.r = 0)),
    { signal, passive: true },
  );
  return reset;
}
