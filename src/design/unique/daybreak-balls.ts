/** Daybreak balls: the old menu's circles, back as a small physics toy.
 * v1/v2 floated these balls and let them chase the pointer; here they are
 * still artwork (aria-hidden, no links), but a fine pointer can poke them,
 * knock them into each other, or pick one up and throw it. Every ball is
 * sprung to its home, so the cluster always finds its way back.
 *
 * Simulation runs in SVG user units and writes the individual `translate`
 * and `scale` properties, so it composes with the CSS arrival and drift.
 * Frames run only while something moves; the loop parks once the balls are
 * still. Touch, reduced motion and hidden tabs keep the resting artwork.
 */
const MOTION =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const HOME_SPRING = 55; // pull back to the home position, per second²
const DAMPING = 5.5; // underdamped: a ball overshoots home and wobbles once
const BUMP_SPRING = 900; // how hard balls refuse to overlap
const BUMP_DAMPING = 8; // soaks up some of a collision, so knocks feel padded
const POINTER_RADIUS = 12; // the pointer is a small ball too
const POINTER_PUSH = 40; // a resting pointer only dents a ball
const POINTER_CARRY = 0.4; // share of a passing pointer's speed handed on
const BOOP = 260; // a click without a drag boops the ball away
const MAX_SPEED = 1800;
const MAX_REACH = 160; // a thrown ball never wanders further than this
const SQUASH = 0.0007; // stretch along the direction of travel
const SQUASH_LIMIT = 0.16;
const DRAG_THRESHOLD = 3;
const STILL = 3; // summed speed (units/s) under which the loop may park
const SNAP = 0.5; // offsets this small (well under a pixel) snap home

type Ball = {
  el: SVGCircleElement;
  hx: number;
  hy: number;
  r: number;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function installDaybreakBalls() {
  const motion = window.matchMedia(MOTION);
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const resetters: (() => void)[] = [];
    const refreshers: (() => void)[] = [];

    for (const svg of document.querySelectorAll<SVGSVGElement>(
      "svg[data-balls]",
    )) {
      installCluster(svg, motion, signal, resetters, refreshers);
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
  svg: SVGSVGElement,
  motion: MediaQueryList,
  signal: AbortSignal,
  resetters: (() => void)[],
  refreshers: (() => void)[],
) {
  const balls: Ball[] = [...svg.querySelectorAll("circle")].map((el) => {
    const r = el.r.baseVal.value;
    return {
      el,
      hx: el.cx.baseVal.value,
      hy: el.cy.baseVal.value,
      r,
      mass: r * r,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    };
  });
  if (!balls.length) return;
  // Some circles overlap in the artwork itself; only extra overlap bumps.
  const rest = balls.map((a) =>
    balls.map((b) =>
      Math.max(0, a.r + b.r - Math.hypot(b.hx - a.hx, b.hy - a.hy)),
    ),
  );

  let frame = 0;
  let lastTime = 0;
  let pointer: { x: number; y: number; vx: number; vy: number } | undefined;
  let pointerTime = 0;
  let held:
    | { ball: Ball; id: number; dx: number; dy: number; moved: boolean }
    | undefined;

  const toUser = (clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    if (!rect.width || !view?.width) return undefined;
    const k = view.width / rect.width;
    return {
      x: (clientX - rect.left) * k + view.x,
      y: (clientY - rect.top) * k + view.y,
    };
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
    if (held) {
      held.ball.el.releasePointerCapture?.(held.id);
      held = undefined;
    }
    delete svg.dataset.held;
    balls.forEach(settle);
  };
  resetters.push(reset);

  const refresh = () => {
    const running = motion.matches && !document.hidden;
    svg.dataset.balls = running ? "awake" : "still";
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
      // The pointer is a little ball: it shoves, and hands on some speed.
      const dx = ball.hx + ball.x - pointer.x;
      const dy = ball.hy + ball.y - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;
      const overlap = ball.r + POINTER_RADIUS - distance;
      if (overlap > 0) {
        const nx = dx / distance;
        const ny = dy / distance;
        ax[i] += nx * overlap * POINTER_PUSH;
        ay[i] += ny * overlap * POINTER_PUSH;
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
        const total = a.mass + b.mass;
        const shareA =
          held?.ball === a ? 0 : held?.ball === b ? 1 : b.mass / total;
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
    // Still: park the loop. A ball held off home by a resting pointer keeps
    // its place; anything back home drops its inline style entirely.
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
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const track = (event: PointerEvent) => {
    const point = toUser(event.clientX, event.clientY);
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
      const point = track(event);
      if (!point) return;
      if (held) {
        const ball = held.ball;
        const x = point.x - held.dx - ball.hx;
        const y = point.y - held.dy - ball.hy;
        if (Math.hypot(x - ball.x, y - ball.y) > DRAG_THRESHOLD)
          held.moved = true;
        ball.x = x;
        ball.y = y;
        ball.vx = point.vx;
        ball.vy = point.vy;
        start();
        return;
      }
      const near = balls.some(
        (ball) =>
          Math.hypot(ball.hx + ball.x - point.x, ball.hy + ball.y - point.y) <
          ball.r + POINTER_RADIUS * 2,
      );
      if (near || balls.some((ball) => ball.x || ball.y)) start();
    },
    { signal, passive: true },
  );

  svg.addEventListener(
    "pointerdown",
    (event) => {
      if (!motion.matches || event.pointerType === "touch" || event.button)
        return;
      const ball = balls.find((ball) => ball.el === event.target);
      const point = ball && track(event);
      if (!ball || !point) return;
      event.preventDefault();
      held = {
        ball,
        id: event.pointerId,
        dx: point.x - (ball.hx + ball.x),
        dy: point.y - (ball.hy + ball.y),
        moved: false,
      };
      ball.el.setPointerCapture?.(event.pointerId);
      svg.dataset.held = "";
      start();
    },
    { signal },
  );

  const release = (event: PointerEvent) => {
    if (!held || event.pointerId !== held.id) return;
    const { ball, moved, dx, dy } = held;
    ball.el.releasePointerCapture?.(held.id);
    held = undefined;
    delete svg.dataset.held;
    // A click is a boop, away from where it was pressed (up if dead centre);
    // a drag is a throw, keeping the hand's velocity.
    if (!moved) {
      const distance = Math.hypot(dx, dy);
      ball.vx -= distance > 1 ? (dx / distance) * BOOP : 0;
      ball.vy -= distance > 1 ? (dy / distance) * BOOP : BOOP;
    }
    pointer = undefined;
    start();
  };
  document.addEventListener("pointerup", release, { signal });
  document.addEventListener("pointercancel", release, { signal });
  document.addEventListener(
    "pointerleave",
    () => {
      pointer = undefined;
      if (balls.some((ball) => ball.x || ball.y)) start();
    },
    { signal },
  );
  refresh();
}
