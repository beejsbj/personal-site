/** Progressive enhancement for the v1 constellation: stable hit geometry,
 * interruptible body/label attraction, no dependencies or idle animation loop.
 */
export function installBlobNavigation() {
  const motion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const disposers: (() => void)[] = [];
    const roots = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-blob-nav], [data-magnetic-edge]",
      ),
    ];
    const refreshers: (() => void)[] = [];

    for (const root of roots) {
      const resetters: (() => void)[] = [];
      const refresh = () => {
        const running = motion.matches;
        root.dataset.motion = running ? "running" : "paused";
        if (!running) resetters.forEach((reset) => reset());
      };
      refreshers.push(refresh);

      for (const slot of root.querySelectorAll<HTMLElement>(
        ".blob-nav__slot, .edge-blob__hit",
      )) {
        const link = slot.querySelector<HTMLAnchorElement>("a");
        const magnet = slot.querySelector<HTMLElement>(
          ".blob-nav__magnet, .edge-blob__surface",
        );
        const label = slot.querySelector<HTMLElement>(".blob-nav__label");
        if (!magnet) continue;
        const corner = !link;
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
          magnet.style.removeProperty("transform");
          label?.style.removeProperty("transform");
        };
        resetters.push(reset);
        disposers.push(reset);
        const tick = (time: number) => {
          // Bound dt after backgrounding; semi-implicit spring stays stable.
          const dt = Math.min(
            (time - (lastTime || time - 16.67)) / 1000,
            0.032,
          );
          lastTime = time;
          vx += ((targetX - x) * 210 - vx * 22) * dt;
          vy += ((targetY - y) * 210 - vy * 22) * dt;
          x += vx * dt;
          y += vy * dt;
          magnet.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
          if (label)
            label.style.transform = `translate3d(${(x * 0.42).toFixed(3)}px, ${(y * 0.42).toFixed(3)}px, 0)`;
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
        const listener = corner ? document : slot;
        const leave = () => {
          targetX = targetY = 0;
          if (frame || x || y) start();
        };
        listener.addEventListener(
          "pointermove",
          (rawEvent) => {
            const event = rawEvent as PointerEvent;
            if (
              !motion.matches ||
              event.pointerType === "touch" ||
              document.activeElement === link
            )
              return;
            const rect = slot.getBoundingClientRect();
            const nx =
              (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
            const ny =
              (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
            // Decoration follows nearby pointer movement without stealing clicks.
            if (corner && nx * nx + ny * ny > 1.2) {
              leave();
              return;
            }
            // Hit target stays still; only the visual body and label move.
            targetX =
              Math.max(
                -1,
                Math.min(
                  1,
                  (event.clientX - rect.left - rect.width / 2) /
                    (rect.width / 2),
                ),
              ) * (corner ? 16 : 10);
            targetY =
              Math.max(
                -1,
                Math.min(
                  1,
                  (event.clientY - rect.top - rect.height / 2) /
                    (rect.height / 2),
                ),
              ) * (corner ? 16 : 10);
            start();
          },
          { signal, passive: true },
        );
        listener.addEventListener("pointerleave", leave, { signal });
        link?.addEventListener("focus", reset, { signal });
      }
      refresh();
    }
    const refreshAll = () => refreshers.forEach((refresh) => refresh());
    motion.addEventListener("change", refreshAll, { signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) disposers.forEach((dispose) => dispose());
      },
      { signal },
    );
    cleanup = () => {
      controller.abort();
      disposers.forEach((dispose) => dispose());
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}
