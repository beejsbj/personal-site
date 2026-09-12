/** Optional pointer attraction for the cropped corner artwork only.
 * Stable hit geometry, interruptible spring, no dependencies or idle loop.
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
        surface.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
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
