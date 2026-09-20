/**
 * The homepage balls are intentionally a small, local interaction surface.
 * They never create a page-sized overlay: each visible circle owns its own
 * native button, while this controller only moves it with transforms.
 */

export interface BlobPhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  tossing: boolean;
}

export interface BlobBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const MOTION_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const EPSILON = 0.08;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** A deterministic, bounded step that keeps thrown balls inside the viewport. */
export function advancePlayfulBlob(
  state: BlobPhysicsState,
  deltaSeconds: number,
  bounds: BlobBounds,
): BlobPhysicsState {
  const next = { ...state };
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.032);

  if (next.tossing) {
    next.vy += 720 * dt;
    next.x += next.vx * dt;
    next.y += next.vy * dt;
    const drag = Math.exp(-2.2 * dt);
    next.vx *= drag;
    next.vy *= drag;
  } else {
    // A damped spring makes proximity motion responsive without an idle loop.
    next.vx += ((next.targetX - next.x) * 190 - next.vx * 23) * dt;
    next.vy += ((next.targetY - next.y) * 190 - next.vy * 23) * dt;
    next.x += next.vx * dt;
    next.y += next.vy * dt;
  }

  let bounced = false;
  if (next.x < bounds.minX) {
    next.x = bounds.minX;
    next.vx = Math.abs(next.vx) * 0.62;
    bounced = true;
  } else if (next.x > bounds.maxX) {
    next.x = bounds.maxX;
    next.vx = -Math.abs(next.vx) * 0.62;
    bounced = true;
  }
  if (next.y < bounds.minY) {
    next.y = bounds.minY;
    next.vy = Math.abs(next.vy) * 0.62;
    bounced = true;
  } else if (next.y > bounds.maxY) {
    next.y = bounds.maxY;
    next.vy = -Math.abs(next.vy) * 0.62;
    bounced = true;
  }

  if (next.tossing && bounced && Math.abs(next.vx) + Math.abs(next.vy) < 24) {
    next.tossing = false;
    next.targetX = next.x;
    next.targetY = next.y;
    next.vx = 0;
    next.vy = 0;
  }
  return next;
}

function isSettled(state: BlobPhysicsState) {
  return (
    !state.tossing &&
    Math.abs(state.targetX - state.x) +
      Math.abs(state.targetY - state.y) +
      Math.abs(state.vx) +
      Math.abs(state.vy) <
      EPSILON
  );
}

type BlobRecord = {
  element: HTMLButtonElement;
  physics: BlobPhysicsState;
  anchorX: number;
  anchorY: number;
  dragging: boolean;
  pointerId?: number;
  grabX: number;
  grabY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
};

export function installPlayfulBlobs() {
  const motion = window.matchMedia(MOTION_QUERY);
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const root = document.querySelector<HTMLElement>("[data-playful-blobs]");
    if (!root) return;

    const controller = new AbortController();
    const { signal } = controller;
    const records: BlobRecord[] = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-playful-blob]"),
    ].map((element) => ({
      element,
      physics: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
        tossing: false,
      },
      anchorX: 0,
      anchorY: 0,
      dragging: false,
      grabX: 0,
      grabY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
    }));
    const resetButton = root.querySelector<HTMLButtonElement>(
      "[data-playful-blobs-reset]",
    );
    records.forEach((record) => record.element.removeAttribute("disabled"));
    let frame = 0;
    let lastFrameTime = 0;
    let pointer: { x: number; y: number } | undefined;

    const baseCenter = (record: BlobRecord) => {
      const rect = record.element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - record.physics.x,
        y: rect.top + rect.height / 2 - record.physics.y,
        radius: Math.max(rect.width, rect.height) / 2,
      };
    };
    const boundsFor = (record: BlobRecord): BlobBounds => {
      const base = baseCenter(record);
      return {
        minX: base.radius - base.x,
        maxX: window.innerWidth - base.radius - base.x,
        minY: base.radius - base.y,
        maxY: window.innerHeight - base.radius - base.y,
      };
    };
    const draw = (record: BlobRecord) => {
      const { x, y } = record.physics;
      if (x || y) {
        record.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      } else {
        record.element.style.removeProperty("transform");
      }
    };
    const syncResetControl = () => {
      root.dataset.displaced = records.some(
        (record) =>
          Math.abs(record.physics.x) +
            Math.abs(record.physics.y) +
            Math.abs(record.anchorX) +
            Math.abs(record.anchorY) >
          1,
      )
        ? "true"
        : "false";
    };
    const constrain = (record: BlobRecord) => {
      const bounds = boundsFor(record);
      record.physics.x = clamp(record.physics.x, bounds.minX, bounds.maxX);
      record.physics.y = clamp(record.physics.y, bounds.minY, bounds.maxY);
      record.physics.targetX = clamp(
        record.physics.targetX,
        bounds.minX,
        bounds.maxX,
      );
      record.physics.targetY = clamp(
        record.physics.targetY,
        bounds.minY,
        bounds.maxY,
      );
      record.anchorX = clamp(record.anchorX, bounds.minX, bounds.maxX);
      record.anchorY = clamp(record.anchorY, bounds.minY, bounds.maxY);
      draw(record);
      syncResetControl();
    };
    const refreshTargets = () => {
      for (const record of records) {
        if (record.dragging || record.physics.tossing) continue;
        record.physics.targetX = record.anchorX;
        record.physics.targetY = record.anchorY;
        if (pointer) {
          const base = baseCenter(record);
          const centerX = base.x + record.physics.x;
          const centerY = base.y + record.physics.y;
          const dx = centerX - pointer.x;
          const dy = centerY - pointer.y;
          const distance = Math.hypot(dx, dy);
          const reach = Math.max(120, base.radius * 2.25);
          if (distance < reach) {
            const force = (1 - distance / reach) * 16;
            record.physics.targetX += (dx / Math.max(distance, 1)) * force;
            record.physics.targetY += (dy / Math.max(distance, 1)) * force;
          }
        }
        constrain(record);
      }
    };
    const active = () =>
      records.some((record) => record.dragging || !isSettled(record.physics));
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrameTime = 0;
    };
    const start = () => {
      if (!frame && active()) frame = requestAnimationFrame(tick);
    };
    const tick = (time: number) => {
      const dt = Math.min(
        (time - (lastFrameTime || time - 16.67)) / 1000,
        0.032,
      );
      lastFrameTime = time;
      for (const record of records) {
        if (record.dragging) continue;
        const wasTossing = record.physics.tossing;
        record.physics = advancePlayfulBlob(
          record.physics,
          dt,
          boundsFor(record),
        );
        if (wasTossing && !record.physics.tossing) {
          record.anchorX = record.physics.targetX = record.physics.x;
          record.anchorY = record.physics.targetY = record.physics.y;
        }
        if (!record.physics.tossing && isSettled(record.physics)) {
          record.physics.x = record.physics.targetX;
          record.physics.y = record.physics.targetY;
          record.physics.vx = 0;
          record.physics.vy = 0;
        }
        draw(record);
      }
      syncResetControl();
      frame = 0;
      if (active()) start();
      else lastFrameTime = 0;
    };
    const reset = (animate = true) => {
      pointer = undefined;
      for (const record of records) {
        record.dragging = false;
        record.pointerId = undefined;
        record.element.dataset.dragging = "false";
        record.anchorX = record.anchorY = 0;
        record.physics.tossing = false;
        record.physics.targetX = record.physics.targetY = 0;
        record.physics.vx = record.physics.vy = 0;
        if (!animate) {
          record.physics.x = record.physics.y = 0;
          draw(record);
        }
      }
      syncResetControl();
      if (animate) start();
      else stop();
    };
    const enabled = () => motion.matches && !document.hidden;
    const refresh = () => {
      const running = enabled();
      root.dataset.motion = running ? "running" : "paused";
      if (!running) reset(false);
    };
    const updateDrag = (
      record: BlobRecord,
      x: number,
      y: number,
      time: number,
    ) => {
      const base = baseCenter(record);
      const bounds = boundsFor(record);
      record.physics.x = clamp(
        x - record.grabX - base.x,
        bounds.minX,
        bounds.maxX,
      );
      record.physics.y = clamp(
        y - record.grabY - base.y,
        bounds.minY,
        bounds.maxY,
      );
      const dt = Math.max((time - record.lastTime) / 1000, 1 / 240);
      record.physics.vx = clamp((x - record.lastX) / dt, -1800, 1800);
      record.physics.vy = clamp((y - record.lastY) / dt, -1800, 1800);
      record.lastX = x;
      record.lastY = y;
      record.lastTime = time;
      draw(record);
    };

    for (const record of records) {
      record.element.addEventListener(
        "pointerdown",
        (event) => {
          if (!enabled() || event.pointerType === "touch") return;
          event.preventDefault();
          stop();
          const center = baseCenter(record);
          record.dragging = true;
          record.pointerId = event.pointerId;
          record.grabX = event.clientX - (center.x + record.physics.x);
          record.grabY = event.clientY - (center.y + record.physics.y);
          record.lastX = event.clientX;
          record.lastY = event.clientY;
          record.lastTime = event.timeStamp;
          record.physics.tossing = false;
          record.element.dataset.dragging = "true";
          record.element.setPointerCapture?.(event.pointerId);
        },
        { signal },
      );
      record.element.addEventListener(
        "pointermove",
        (event) => {
          if (record.dragging && event.pointerId === record.pointerId) {
            updateDrag(record, event.clientX, event.clientY, event.timeStamp);
          }
        },
        { signal },
      );
      const release = (event: PointerEvent, shouldToss: boolean) => {
        if (!record.dragging || event.pointerId !== record.pointerId) return;
        if (event.clientX !== record.lastX || event.clientY !== record.lastY) {
          updateDrag(record, event.clientX, event.clientY, event.timeStamp);
        }
        const velocityIsFresh = event.timeStamp - record.lastTime < 100;
        record.dragging = false;
        record.pointerId = undefined;
        record.element.dataset.dragging = "false";
        record.element.releasePointerCapture?.(event.pointerId);
        record.physics.tossing =
          shouldToss &&
          velocityIsFresh &&
          Math.abs(record.physics.vx) + Math.abs(record.physics.vy) > 36;
        if (!record.physics.tossing) record.physics.vx = record.physics.vy = 0;
        record.anchorX = record.physics.targetX = record.physics.x;
        record.anchorY = record.physics.targetY = record.physics.y;
        syncResetControl();
        start();
      };
      record.element.addEventListener(
        "pointerup",
        (event) => release(event, true),
        {
          signal,
        },
      );
      record.element.addEventListener(
        "pointercancel",
        (event) => release(event, false),
        { signal },
      );
      record.element.addEventListener(
        "keydown",
        (event) => {
          const step = event.shiftKey ? 48 : 20;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          if (event.key === "Home" || event.key === "Escape") {
            event.preventDefault();
            reset(enabled());
            return;
          }
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            if (enabled()) {
              record.physics.vx = 360;
              record.physics.vy = -480;
              record.physics.tossing = true;
              start();
            }
            return;
          }
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          record.anchorX += move[0];
          record.anchorY += move[1];
          record.physics.targetX = record.anchorX;
          record.physics.targetY = record.anchorY;
          constrain(record);
          if (enabled()) start();
          else {
            record.physics.x = record.physics.targetX;
            record.physics.y = record.physics.targetY;
            record.physics.vx = record.physics.vy = 0;
            draw(record);
          }
        },
        { signal },
      );
    }

    resetButton?.addEventListener(
      "click",
      () => {
        reset(enabled());
        // The reset control hides after settling; keep keyboard focus usable.
        records[0]?.element.focus({ preventScroll: true });
      },
      { signal },
    );

    document.addEventListener(
      "pointermove",
      (event) => {
        if (!enabled() || event.pointerType === "touch") return;
        pointer = { x: event.clientX, y: event.clientY };
        refreshTargets();
        start();
      },
      { signal, passive: true },
    );
    document.addEventListener(
      "pointerleave",
      () => {
        pointer = undefined;
        refreshTargets();
        start();
      },
      { signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        refresh();
      },
      { signal },
    );
    window.addEventListener(
      "resize",
      () => {
        for (const record of records) constrain(record);
      },
      { signal, passive: true },
    );
    motion.addEventListener("change", refresh, { signal });
    refresh();
    cleanup = () => {
      controller.abort();
      stop();
      reset(false);
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}
