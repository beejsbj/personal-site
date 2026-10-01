/** Optional pointer attraction for the cropped corner artwork only.
 * Stable hit geometry, interruptible spring, no dependencies or idle loop.
 * While it moves, the surface squashes and stretches along its travel.
 */
export function installEdgeMagnet() {
  const motion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const resetters: (() => void)[] = [];
    const refreshers: (() => void)[] = [];

    for (const root of document.querySelectorAll<HTMLElement>(
      "[data-magnetic-edge]",
    )) {
      const hit = root.querySelector<HTMLElement>(".edge-blob__hit");
      const surface = root.querySelector<HTMLElement>(".edge-blob__surface");
      if (!hit || !surface) continue;
      let frame = 0;
      let lastTime = 0;
      let x = 0,
        y = 0,
        vx = 0,
        vy = 0,
        targetX = 0,
        targetY = 0;

      const reset = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        x = y = vx = vy = targetX = targetY = 0;
        surface.style.removeProperty("transform");
        delete root.dataset.aim;
      };
      resetters.push(reset);
      const refresh = () => {
        const running = motion.matches && !document.hidden;
        root.dataset.motion = running ? "running" : "paused";
        if (!running) reset();
      };
      refreshers.push(refresh);

      const tick = (time: number) => {
        // Bound dt after a delayed frame; semi-implicit spring stays stable.
        const dt = Math.min((time - (lastTime || time - 16.67)) / 1000, 0.032);
        lastTime = time;
        vx += ((targetX - x) * 210 - vx * 22) * dt;
        vy += ((targetY - y) * 210 - vy * 22) * dt;
        x += vx * dt;
        y += vy * dt;
        // Jelly: the big ball stretches along its travel, as the small ones do.
        const speed = Math.hypot(vx, vy);
        const s = Math.min(0.06, speed * 0.0004);
        const ux = speed ? vx / speed : 0;
        const uy = speed ? vy / speed : 0;
        const sx = 1 + s * (ux * ux - uy * uy * 0.5);
        const sy = 1 + s * (uy * uy - ux * ux * 0.5);
        surface.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        if (
          Math.abs(targetX - x) +
            Math.abs(targetY - y) +
            Math.abs(vx) +
            Math.abs(vy) >
          0.025
        ) {
          frame = requestAnimationFrame(tick);
        } else {
          frame = 0;
          lastTime = 0;
          if (targetX === 0 && targetY === 0) reset();
        }
      };
      const start = () => {
        if (!frame) frame = requestAnimationFrame(tick);
      };
      const leave = () => {
        targetX = targetY = 0;
        if (frame || x || y) start();
      };
      document.addEventListener(
        "pointermove",
        (event) => {
          if (
            !motion.matches ||
            document.hidden ||
            event.pointerType === "touch"
          ) {
            reset();
            return;
          }
          const rect = hit.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx =
            (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
          const ny =
            (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
          // Over the visible circle, on bare page: it can be clicked.
          const aim = nx * nx + ny * ny <= 1 && !interactive(event.target);
          if (aim) root.dataset.aim = "";
          else delete root.dataset.aim;
          if (nx * nx + ny * ny > 1.2) {
            leave();
            return;
          }
          // Only the artwork moves. Its passive hit surface never steals clicks.
          targetX = Math.max(-1, Math.min(1, nx)) * 16;
          targetY = Math.max(-1, Math.min(1, ny)) * 16;
          start();
        },
        { signal, passive: true },
      );
      document.addEventListener("pointerleave", leave, { signal });
      // v1/v2's Easter egg: clicking the big circle rolls you to the bottom
      // of the page, or back to the top once you are past halfway. The
      // artwork sits under the page, so the click is read from the document:
      // only a click on bare page inside the visible circle counts.
      document.addEventListener(
        "click",
        (event) => {
          if (!motion.matches || event.defaultPrevented || event.button) return;
          if (interactive(event.target)) return;
          if (window.getSelection?.()?.toString()) return;
          const rect = hit.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx =
            (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
          const ny =
            (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
          if (nx * nx + ny * ny > 1) return;
          const end =
            document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({
            top: window.scrollY > end / 2 ? 0 : end,
            behavior: "smooth",
          });
        },
        { signal },
      );
      refresh();
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

/** Content under the pointer that should keep its own click. */
function interactive(target: EventTarget | null) {
  const element = target as Element | null;
  return Boolean(
    element?.closest?.("a, button, input, select, textarea, label, summary"),
  );
}
