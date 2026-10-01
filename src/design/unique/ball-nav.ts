/** Ball navigation physics: v1's floating menu balls, now a toy you can play
 * with on the way to clicking. A fast pointer knocks balls into each other,
 * a ball can be picked up and thrown, and every ball is sprung to its home.
 * A drag never navigates (its click is swallowed); a clean click always does,
 * and the ball then becomes the page transition's ball.
 *
 * Simulation runs in CSS pixels relative to the cluster and writes each
 * link's individual `translate` and `scale`, so it composes with the CSS
 * arrival. Frames run only while something moves, then the loop parks.
 * Touch, reduced motion and hidden tabs leave plain, still links.
 */
const MOTION =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const HOME_SPRING = 55; // pull back to the home position, per second²
const DAMPING = 5.5; // underdamped: a ball overshoots home and wobbles once
const BUMP_SPRING = 900; // how hard balls refuse to overlap
const BUMP_DAMPING = 8; // soaks up some of a collision, so knocks feel padded
const POINTER_RADIUS = 8; // the pointer is a small ball too
const POINTER_CARRY = 0.4; // share of a passing pointer's speed handed on
const MAX_SPEED = 1800;
const MAX_REACH = 150; // a thrown ball never wanders further than this
const SQUASH = 0.0007; // stretch along the direction of travel
const SQUASH_LIMIT = 0.14;
const CLICK_SLOP = 6; // px of travel that turns a press into a drag
const FOCUS_HOP = 140; // a keyboard-focused ball gives a little hop
const STILL = 3; // summed speed (px/s) under which the loop may park
const SNAP = 0.4; // offsets this small snap home

type Ball = {
  el: HTMLAnchorElement;
  hx: number;
  hy: number;
  r: number;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function installBallNav() {
  const motion = window.matchMedia(MOTION);
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const resetters: (() => void)[] = [];
    const refreshers: (() => void)[] = [];

    for (const nav of document.querySelectorAll<HTMLElement>(
      "[data-ball-nav]",
    )) {
      installCluster(nav, motion, signal, resetters, refreshers);
    }

    const refreshAll = () => refreshers.forEach((refresh) => refresh());
    motion.addEventListener("change", refreshAll, { signal });
    document.addEventListener("visibilitychange", refreshAll, { signal });
    cleanup = () => {
      controller.abort();
      resetters.forEach((reset) => reset());
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}

function installCluster(
  nav: HTMLElement,
  motion: MediaQueryList,
  signal: AbortSignal,
  resetters: (() => void)[],
  refreshers: (() => void)[],
) {
  const box = nav.querySelector<HTMLElement>("ul");
  const balls: Ball[] = [
    ...nav.querySelectorAll<HTMLAnchorElement>("a[data-ball]"),
  ].map((el) => ({
    el,
    hx: 0,
    hy: 0,
    r: 0,
    mass: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));
  if (!box || !balls.length) return;
  let rest: number[][] = [];
  let dirty = true;

  // Homes come from layout, so they follow the responsive cluster. They are
  // read lazily, again after a resize, and only while the balls are home.
  const measure = () => {
    if (!dirty) return;
    dirty = false;
    for (const ball of balls) {
      const slot = ball.el.parentElement ?? ball.el;
      ball.r = slot.offsetWidth / 2;
      ball.hx = slot.offsetLeft + ball.r;
      ball.hy = slot.offsetTop + ball.r;
      ball.mass = ball.r * ball.r || 1;
    }
    // Some circles overlap in the artwork itself; only extra overlap bumps.
    rest = balls.map((a) =>
      balls.map((b) =>
        Math.max(0, a.r + b.r - Math.hypot(b.hx - a.hx, b.hy - a.hy)),
      ),
    );
  };

  let frame = 0;
  let lastTime = 0;
  let pointer: { x: number; y: number; vx: number; vy: number } | undefined;
  let pointerTime = 0;
  let held:
    | {
        ball: Ball;
        id: number;
        dx: number;
        dy: number;
        sx: number;
        sy: number;
        moved: boolean;
      }
    | undefined;
  let swallowClick = false;

  const atRest = () => balls.every((ball) => !ball.x && !ball.y && !frame);

  const toBox = (clientX: number, clientY: number) => {
    const rect = box.getBoundingClientRect();
    if (!rect.width) return undefined;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const paint = (ball: Ball) => {
    const speed = Math.hypot(ball.vx, ball.vy);
    const s = Math.min(SQUASH_LIMIT, speed * SQUASH);
    const ux = speed ? ball.vx / speed : 0;
    const uy = speed ? ball.vy / speed : 0;
    const sx = 1 + s * (ux * ux - uy * uy * 0.5);
    const sy = 1 + s * (uy * uy - ux * ux * 0.5);
    ball.el.style.translate = `${ball.x.toFixed(2)}px ${ball.y.toFixed(2)}px`;
    ball.el.style.scale = `${sx.toFixed(3)} ${sy.toFixed(3)}`;
  };

  const settle = (ball: Ball) => {
    ball.x = ball.y = ball.vx = ball.vy = 0;
    ball.el.style.removeProperty("translate");
    ball.el.style.removeProperty("scale");
  };

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    pointer = undefined;
    swallowClick = false;
    if (held) {
      held.ball.el.releasePointerCapture?.(held.id);
      held = undefined;
    }
    delete nav.dataset.held;
    balls.forEach(settle);
  };
  resetters.push(reset);

  const refresh = () => {
    const running = motion.matches && !document.hidden;
    nav.dataset.balls = running ? "awake" : "still";
    if (!running) reset();
  };
  refreshers.push(refresh);

  const step = (dt: number) => {
    if (pointer) {
      // A resting pointer has no speed to hand on.
      const fade = Math.exp(-dt * 12);
      pointer.vx *= fade;
      pointer.vy *= fade;
    }
    const ax = balls.map(() => 0);
    const ay = balls.map(() => 0);

    balls.forEach((ball, i) => {
      if (held?.ball === ball) return;
      ax[i] += -HOME_SPRING * ball.x - DAMPING * ball.vx;
      ay[i] += -HOME_SPRING * ball.y - DAMPING * ball.vy;
      if (!pointer || held) return;
      // A moving pointer knocks a ball; a resting one leaves it be, so a
      // ball always stays where you are about to click it.
      const dx = ball.hx + ball.x - pointer.x;
      const dy = ball.hy + ball.y - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < ball.r + POINTER_RADIUS) {
        const nx = dx / distance;
        const ny = dy / distance;
        const toward = pointer.vx * nx + pointer.vy * ny;
        if (toward > 0) {
          ball.vx += nx * toward * POINTER_CARRY * dt * 60;
          ball.vy += ny * toward * POINTER_CARRY * dt * 60;
        }
      }
    });

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.hx + b.x - (a.hx + a.x);
        const dy = b.hy + b.y - (a.hy + a.y);
        const distance = Math.hypot(dx, dy) || 1;
        const overlap = a.r + b.r - distance - rest[i][j];
        if (overlap <= 0) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const force = overlap * BUMP_SPRING - closing * BUMP_DAMPING;
        // Heavier balls give way less; a held ball is an immovable hand.
        const shareA =
          held?.ball === a
            ? 0
            : held?.ball === b
              ? 1
              : b.mass / (a.mass + b.mass);
        const shareB = 1 - shareA;
        ax[i] -= nx * force * shareA * 2;
        ay[i] -= ny * force * shareA * 2;
        ax[j] += nx * force * shareB * 2;
        ay[j] += ny * force * shareB * 2;
      }
    }

    balls.forEach((ball, i) => {
      if (held?.ball === ball) return;
      ball.vx += ax[i] * dt;
      ball.vy += ay[i] * dt;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > MAX_SPEED) {
        ball.vx *= MAX_SPEED / speed;
        ball.vy *= MAX_SPEED / speed;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      const reach = Math.hypot(ball.x, ball.y);
      if (reach > MAX_REACH) {
        ball.x *= MAX_REACH / reach;
        ball.y *= MAX_REACH / reach;
      }
    });
    return { ax, ay };
  };

  const tick = (time: number) => {
    // Bound dt after a delayed frame; two substeps keep collisions stable.
    const dt = Math.min((time - (lastTime || time - 16.67)) / 1000, 0.032);
    lastTime = time;
    step(dt / 2);
    const { ax, ay } = step(dt / 2);
    balls.forEach(paint);

    const moving = balls.reduce(
      (sum, ball, i) =>
        sum +
        Math.abs(ball.vx) +
        Math.abs(ball.vy) +
        (Math.abs(ax[i]) + Math.abs(ay[i])) * dt,
      0,
    );
    if (held || moving > STILL) {
      frame = requestAnimationFrame(tick);
      return;
    }
    frame = 0;
    lastTime = 0;
    for (const ball of balls) {
      if (Math.abs(ball.x) + Math.abs(ball.y) < SNAP) settle(ball);
      else {
        ball.vx = ball.vy = 0;
        paint(ball);
      }
    }
  };

  const start = () => {
    if (frame) return;
    if (atRest()) measure();
    frame = requestAnimationFrame(tick);
  };

  const track = (event: PointerEvent) => {
    const point = toBox(event.clientX, event.clientY);
    if (!point) return undefined;
    const now = event.timeStamp || performance.now();
    const elapsed = Math.max(8, now - pointerTime) / 1000;
    if (pointer && elapsed < 0.1) {
      // Smooth the pointer's velocity a little; raw deltas are jittery.
      pointer.vx = pointer.vx * 0.4 + ((point.x - pointer.x) / elapsed) * 0.6;
      pointer.vy = pointer.vy * 0.4 + ((point.y - pointer.y) / elapsed) * 0.6;
      pointer.x = point.x;
      pointer.y = point.y;
    } else pointer = { ...point, vx: 0, vy: 0 };
    pointerTime = now;
    return pointer;
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      if (!motion.matches || document.hidden || event.pointerType === "touch")
        return;
      const wasResting = atRest();
      const point = track(event);
      if (!point) return;
      if (held) {
        const ball = held.ball;
        if (
          Math.hypot(event.clientX - held.sx, event.clientY - held.sy) >
          CLICK_SLOP
        )
          held.moved = true;
        if (!held.moved) return;
        ball.x = point.x - held.dx - ball.hx;
        ball.y = point.y - held.dy - ball.hy;
        ball.vx = point.vx;
        ball.vy = point.vy;
        start();
        return;
      }
      if (wasResting) measure();
      const fast = Math.hypot(point.vx, point.vy) > 60;
      const near = balls.some(
        (ball) =>
          Math.hypot(ball.hx + ball.x - point.x, ball.hy + ball.y - point.y) <
          ball.r + POINTER_RADIUS * 2,
      );
      if ((near && fast) || !wasResting) start();
    },
    { signal, passive: true },
  );

  nav.addEventListener(
    "pointerdown",
    (event) => {
      if (!motion.matches || event.pointerType === "touch" || event.button)
        return;
      const el = (event.target as Element | null)?.closest?.("a[data-ball]");
      const ball = balls.find((ball) => ball.el === el);
      if (!ball) return;
      if (atRest()) measure();
      const point = track(event);
      if (!point) return;
      held = {
        ball,
        id: event.pointerId,
        dx: point.x - (ball.hx + ball.x),
        dy: point.y - (ball.hy + ball.y),
        sx: event.clientX,
        sy: event.clientY,
        moved: false,
      };
      ball.vx = ball.vy = 0;
      ball.el.setPointerCapture?.(event.pointerId);
      nav.dataset.held = "";
    },
    { signal },
  );

  const release = (event: PointerEvent) => {
    if (!held || event.pointerId !== held.id) return;
    const { ball, moved } = held;
    ball.el.releasePointerCapture?.(held.id);
    held = undefined;
    delete nav.dataset.held;
    // A drag is a throw: keep the hand's velocity and swallow the click
    // that follows, so a throw never navigates.
    swallowClick = moved;
    pointer = undefined;
    if (moved) start();
  };
  document.addEventListener("pointerup", release, { signal });
  document.addEventListener("pointercancel", release, { signal });
  nav.addEventListener(
    "click",
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    { signal, capture: true },
  );
  // Keyboard visitors get a little life too: a focused ball hops.
  nav.addEventListener(
    "focusin",
    (event) => {
      if (!motion.matches || document.hidden) return;
      const ball = balls.find((ball) => ball.el === event.target);
      if (!ball || !ball.el.matches(":focus-visible")) return;
      if (atRest()) measure();
      ball.vy -= FOCUS_HOP;
      start();
    },
    { signal },
  );
  window.addEventListener("resize", () => (dirty = true), {
    signal,
    passive: true,
  });
  document.addEventListener(
    "pointerleave",
    () => {
      pointer = undefined;
      if (!atRest()) start();
    },
    { signal },
  );
  refresh();
}
