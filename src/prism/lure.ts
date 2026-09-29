/** The Prism Lure: a small refracting shard that tempts the visitor out of the
 * Normal Portfolio. It flinches from grabbing hands but never from a slow,
 * careful approach, and it tires after a few escapes, so it is always
 * catchable before it becomes frustrating. Keyboard activation always
 * catches it; touch gets one playful hop. */

const DODGE_RADIUS = 120;
const GRAB_SPEED = 0.45; // px per ms; slower approaches never startle it
const MAX_DODGES = 3;
const EDGE = 56;

export interface LureOptions {
  /** Already found on an earlier visit: sits still in its corner. */
  tamed: boolean;
  onCatch: (from: DOMRect) => void;
}

export function mountLure({ tamed, onCatch }: LureOptions) {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lure = document.createElement("button");
  lure.type = "button";
  lure.id = "prism-lure";
  lure.className = "prism-lure";
  lure.dataset.state = tamed ? "tamed" : "wild";
  lure.setAttribute(
    "aria-label",
    tamed ? "Step out into the prism" : "Something is refracting here. Catch it",
  );
  lure.innerHTML =
    '<span class="prism-lure__tail" aria-hidden="true"></span>' +
    '<svg class="prism-lure__glass" viewBox="0 0 40 36" aria-hidden="true">' +
    '<path d="M20 2 38 34H2Z"/><path class="prism-lure__facet" d="M20 2 26 34H2Z"/></svg>';
  document.body.append(lure);

  let x = 0;
  let y = 0;
  let dodges = 0;
  let hopped = false;
  let lastMove = { x: 0, y: 0, t: 0 };
  const controller = new AbortController();
  const { signal } = controller;

  const place = (nextX: number, nextY: number) => {
    x = Math.min(Math.max(nextX, EDGE), innerWidth - EDGE);
    y = Math.min(Math.max(nextY, EDGE), innerHeight - EDGE);
    lure.style.setProperty("--lure-x", `${x}px`);
    lure.style.setProperty("--lure-y", `${y}px`);
  };

  if (tamed) {
    lure.classList.add("is-docked");
  } else {
    // Peek in from the right edge, a little below the fold line.
    place(innerWidth - EDGE, innerHeight * 0.62);
    requestAnimationFrame(() => lure.classList.add("is-arriving"));
  }

  const dodge = (fromX: number, fromY: number) => {
    dodges += 1;
    const away = Math.atan2(y - fromY, x - fromX);
    const swerve = (Math.random() - 0.5) * (Math.PI / 1.5);
    const reach = (300 - dodges * 70) * (0.8 + Math.random() * 0.4);
    let nextX = x + Math.cos(away + swerve) * reach;
    let nextY = y + Math.sin(away + swerve) * reach;
    // Cornered? Slip past the hand instead of pinning itself to the wall.
    if (nextX < EDGE || nextX > innerWidth - EDGE) nextX = innerWidth - nextX;
    if (nextY < EDGE || nextY > innerHeight - EDGE) nextY = innerHeight - nextY;
    lure.classList.remove("is-dodging");
    void lure.offsetWidth;
    lure.classList.add("is-dodging");
    place(nextX, nextY);
    if (dodges >= MAX_DODGES) lure.classList.add("is-tired");
  };

  if (!tamed && !calm) {
    addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse") return;
        const now = performance.now();
        const dt = Math.max(now - lastMove.t, 1);
        const speed =
          Math.hypot(event.clientX - lastMove.x, event.clientY - lastMove.y) /
          dt;
        lastMove = { x: event.clientX, y: event.clientY, t: now };
        if (dodges >= MAX_DODGES || lure.classList.contains("is-caught"))
          return;
        const near =
          Math.hypot(event.clientX - x, event.clientY - y) < DODGE_RADIUS;
        if (near && speed > GRAB_SPEED) dodge(event.clientX, event.clientY);
      },
      { signal, passive: true },
    );
    addEventListener("resize", () => place(x, y), { signal });
  }

  lure.addEventListener(
    "pointerdown",
    (event) => {
      // One hop for a jabbing finger; the second touch always lands.
      if (event.pointerType === "touch" && !tamed && !calm && dodges < 1) {
        hopped = true;
        dodge(event.clientX, event.clientY);
        dodges = MAX_DODGES;
        lure.classList.add("is-tired");
      }
    },
    { signal },
  );

  lure.addEventListener(
    "click",
    () => {
      if (hopped) {
        hopped = false;
        return;
      }
      if (lure.classList.contains("is-caught")) return;
      lure.classList.add("is-caught");
      onCatch(lure.getBoundingClientRect());
    },
    { signal },
  );

  return {
    element: lure,
    release() {
      lure.classList.remove("is-caught");
    },
    tame() {
      lure.dataset.state = "tamed";
      lure.setAttribute("aria-label", "Step out into the prism");
      lure.classList.remove("is-arriving", "is-dodging", "is-tired");
      lure.classList.add("is-docked");
    },
    destroy() {
      controller.abort();
      lure.remove();
    },
  };
}
