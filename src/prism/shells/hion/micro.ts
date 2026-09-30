/** Microanimations that need a script: tags that swing on their wires and
 * settle, a spark that runs along the cable to whichever tag you reach for,
 * beads of light orbiting the portrait moon (faster when touched), sparks
 * thrown when a line is touched, and a filament of hion drawn toward the
 * cursor in the hero. Everything here composes on top of the CSS motion in
 * micro.css, respects reduced motion, and pauses when the page is idle. */
import type { ShellContext } from "../types";
import { s } from "./dom";

interface MicroContext {
  reducedMotion: boolean;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
  signal: AbortSignal;
}

let micro: MicroContext;
const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Long-running script animations, paused with the page. */
const ambient = new Set<Animation>();

export function mountMicro(ctx: ShellContext, rail: HTMLElement) {
  micro = ctx;
  if (ctx.face || ctx.reducedMotion) return;
  ctx.onIdleChange((idle) => {
    for (const animation of ambient) idle ? animation.pause() : animation.play();
  });
  swingOnHover(rail, ".hion-line__link", 6, 1500, ctx.signal);
  cableSpark(rail, ctx.signal);
  sparksOnPress(
    ctx.root,
    ".hion-line__link, .hion-tag, .hion-action, .hion-lead, .hion-moon, .hion-script-link",
    ctx.signal,
  );
}

/** Per-screen touches; `signal` aborts when the screen leaves. */
export function screenMicro(screen: HTMLElement, signal: AbortSignal) {
  if (!micro || micro.reducedMotion) return;
  swingOnHover(screen, ".hion-clothesline li", 4, 1300, signal);
  swingOnHover(screen, ".hion-lantern-card", 1.6, 1800, signal);
  orbitBeads(screen, signal);
  const hero = screen.querySelector<HTMLElement>(".hion-hero");
  if (hero && fine()) filament(hero, signal);
}

/* ---------- Swing: a tag pushed on its wire, settling with damping ---------- */

function swingOnHover(
  root: HTMLElement,
  selector: string,
  degrees: number,
  duration: number,
  signal: AbortSignal,
) {
  if (!fine()) return;
  const busy = new WeakSet<Element>();
  root.addEventListener(
    "pointerover",
    (event) => {
      const el = (event.target as Element).closest<HTMLElement>(selector);
      if (!el || busy.has(el) || micro.isIdle()) return;
      const from = (event.relatedTarget as Element | null)?.closest(selector);
      if (from === el) return;
      const box = el.getBoundingClientRect();
      // Pushed from the side the pointer came in on.
      const side = event.clientX < box.left + box.width / 2 ? 1 : -1;
      const a = degrees * side;
      busy.add(el);
      const swing = el.animate(
        [0, 1, -0.68, 0.44, -0.27, 0.15, -0.07, 0].map((k) => ({
          transform: `rotate(${(a * k).toFixed(2)}deg)`,
          easing: "ease-in-out",
        })),
        { duration, composite: "add" },
      );
      swing.onfinish = swing.oncancel = () => busy.delete(el);
    },
    { signal },
  );
}

/* ---------- Cable spark: light runs along the rail to the hovered tag ---------- */

function cableSpark(rail: HTMLElement, signal: AbortSignal) {
  if (!fine()) return;
  const nav = rail.querySelector<HTMLElement>(".hion-rail__nav");
  const cable = rail.querySelector<HTMLElement>(".hion-rail__cable");
  if (!nav || !cable) return;
  const spark = document.createElement("span");
  spark.className = "hion-rail__spark";
  spark.setAttribute("aria-hidden", "true");
  nav.append(spark);
  let running: Animation | null = null;
  let last: Element | null = null;

  // The cable is M-2 2 Q50 22 102 2 in a 100x20 box stretched to the nav.
  const point = (u: number, w: number, top: number, h: number) => {
    const m = 1 - u;
    const bx = m * m * -2 + 2 * m * u * 50 + u * u * 102;
    const by = m * m * 2 + 2 * m * u * 22 + u * u * 2;
    return [(bx / 100) * w, top + (by / 20) * h] as const;
  };

  nav.addEventListener(
    "pointerover",
    (event) => {
      const link = (event.target as Element).closest<HTMLElement>(
        ".hion-line__link",
      );
      if (!link || link === last || micro.isIdle()) return;
      last = link;
      const line = link.closest<HTMLElement>(".hion-line");
      const wire = link.querySelector<HTMLElement>(".hion-line__wire");
      const navBox = nav.getBoundingClientRect();
      const cableBox = cable.getBoundingClientRect();
      const tagBox = link.getBoundingClientRect();
      const w = navBox.width;
      const top = cableBox.top - navBox.top;
      const h = cableBox.height;
      const target = Math.max(0, Math.min(1, (tagBox.left + tagBox.width / 2 - navBox.left) / w));
      const steps = 14;
      const along = Array.from({ length: steps + 1 }, (_, i) => {
        const [x, y] = point((target * i) / steps, w, top, h);
        return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` };
      });
      const [ex, ey] = point(target, w, top, h);
      const drop = wire ? wire.getBoundingClientRect().height : 0;
      running?.cancel();
      spark.style.setProperty(
        "--hion-hue",
        line?.dataset.hue === "cyan" ? "var(--hion-cyan)" : "var(--hion-magenta)",
      );
      const run = spark.animate(
        [
          { ...along[0], opacity: 0 },
          { ...along[1], opacity: 1, offset: 0.06 },
          ...along.slice(2, -1),
          { ...along[steps], opacity: 1, offset: 0.7 },
          // Down the wire to the tag, then out.
          {
            transform: `translate(${ex.toFixed(1)}px, ${(ey + drop).toFixed(1)}px)`,
            opacity: 1,
            offset: 0.92,
          },
          {
            transform: `translate(${ex.toFixed(1)}px, ${(ey + drop + 4).toFixed(1)}px)`,
            opacity: 0,
          },
        ],
        { duration: 520, easing: "cubic-bezier(0.3, 0.6, 0.2, 1)" },
      );
      running = run;
      line?.setAttribute("data-spark", "");
      run.finished
        .then(() => {
          if (running === run) running = null;
          setTimeout(() => line?.removeAttribute("data-spark"), 500);
        })
        .catch(() => line?.removeAttribute("data-spark"));
    },
    { signal },
  );
  nav.addEventListener(
    "pointerleave",
    () => {
      last = null;
    },
    { signal },
  );
}

/* ---------- Sparks: motes thrown when a line is touched ---------- */

function sparksOnPress(root: HTMLElement, selector: string, signal: AbortSignal) {
  root.addEventListener(
    "pointerdown",
    (event) => {
      const el = (event.target as Element).closest<HTMLElement>(selector);
      if (!el || micro.isIdle()) return;
      const hue = getComputedStyle(el).getPropertyValue("--hion-hue").trim();
      const count = 7;
      for (let i = 0; i < count; i++) {
        const mote = document.createElement("span");
        mote.className = "hion-spark";
        if (hue) mote.style.setProperty("--hion-hue", hue);
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8;
        const reach = 16 + Math.random() * 26;
        const dx = Math.cos(angle) * reach;
        const dy = Math.sin(angle) * reach - 6;
        document.body.append(mote);
        const fly = mote.animate(
          [
            {
              transform: `translate(${event.clientX}px, ${event.clientY}px) scale(1)`,
              opacity: 1,
            },
            {
              transform: `translate(${event.clientX + dx}px, ${event.clientY + dy + 8}px) scale(0.3)`,
              opacity: 0,
            },
          ],
          {
            duration: 380 + Math.random() * 220,
            easing: "cubic-bezier(0.1, 0.7, 0.3, 1)",
          },
        );
        fly.onfinish = () => mote.remove();
      }
    },
    { signal },
  );
}

/* ---------- Beads of light orbiting the portrait moon ---------- */

function orbitBeads(screen: HTMLElement, signal: AbortSignal) {
  const portraits = screen.querySelectorAll<HTMLElement>(".hion-portrait");
  for (const portrait of portraits) {
    const beads = portrait.querySelectorAll<SVGElement>(".hion-portrait__bead");
    if (!beads.length) continue;
    const runs: Animation[] = [];
    for (const bead of beads) {
      const magenta = bead.classList.contains("hion-portrait__bead--magenta");
      const run = bead.animate(
        [{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }],
        {
          duration: magenta ? 7600 : 5400,
          iterations: Infinity,
          easing: "linear",
        },
      );
      if (micro.isIdle()) run.pause();
      runs.push(run);
      ambient.add(run);
    }
    const speed = (rate: number) => {
      for (const run of runs) run.updatePlaybackRate(rate);
    };
    portrait.addEventListener("pointerenter", () => speed(3.4), { signal });
    portrait.addEventListener("pointerleave", () => speed(1), { signal });
    portrait.addEventListener("focusin", () => speed(3.4), { signal });
    portrait.addEventListener("focusout", () => speed(1), { signal });
    signal.addEventListener(
      "abort",
      () => {
        for (const run of runs) {
          run.cancel();
          ambient.delete(run);
        }
      },
      { once: true },
    );
  }
}

/* ---------- Filament: hion drawn toward the cursor ---------- */

function filament(hero: HTMLElement, signal: AbortSignal) {
  const anchor = hero.querySelector<HTMLElement>(".hion-hero__knot .hion-knot");
  if (!anchor) return;
  const svg = s("svg", { class: "hion-filament", "aria-hidden": "true" });
  const line = s("path", { class: "hion-filament__line" });
  const tip = s("circle", { class: "hion-filament__tip", r: 2 });
  svg.append(line, tip);
  svg.style.opacity = "0";
  hero.append(svg);

  const REACH = 440;
  let pointer: { x: number; y: number } | null = null;
  let tipAt: { x: number; y: number } | null = null;
  let frame = 0;
  let strength = 0;
  let t = 0;

  function step() {
    frame = 0;
    if (micro.isIdle()) return;
    const heroBox = hero.getBoundingClientRect();
    const knotBox = anchor!.getBoundingClientRect();
    const ax = knotBox.left + knotBox.width / 2 - heroBox.left;
    const ay = knotBox.top + knotBox.height / 2 - heroBox.top;
    let want = 0;
    if (pointer) {
      const px = pointer.x - heroBox.left;
      const py = pointer.y - heroBox.top;
      const d = Math.hypot(px - ax, py - ay);
      want = Math.max(0, 1 - d / REACH);
      // The filament reaches toward the pointer but never quite arrives.
      const goal = {
        x: ax + (px - ax) * (0.62 + want * 0.3),
        y: ay + (py - ay) * (0.62 + want * 0.3),
      };
      tipAt = tipAt
        ? { x: tipAt.x + (goal.x - tipAt.x) * 0.16, y: tipAt.y + (goal.y - tipAt.y) * 0.16 }
        : goal;
    }
    strength += (want - strength) * 0.12;
    t += 0.05;
    if (tipAt) {
      const dx = tipAt.x - ax;
      const dy = tipAt.y - ay;
      const len = Math.hypot(dx, dy) || 1;
      const curl = Math.sin(t) * Math.min(28, len * 0.18);
      const cx = ax + dx * 0.5 - (dy / len) * curl;
      const cy = ay + dy * 0.5 + (dx / len) * curl;
      line.setAttribute(
        "d",
        `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${tipAt.x.toFixed(1)} ${tipAt.y.toFixed(1)}`,
      );
      tip.setAttribute("cx", tipAt.x.toFixed(1));
      tip.setAttribute("cy", tipAt.y.toFixed(1));
    }
    svg.style.opacity = (strength * 0.9).toFixed(3);
    if (strength > 0.01 || pointer) frame = requestAnimationFrame(step);
    else tipAt = null;
  }

  const wake = () => {
    if (!frame && !micro.isIdle()) frame = requestAnimationFrame(step);
  };
  hero.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      wake();
    },
    { passive: true, signal },
  );
  hero.addEventListener(
    "pointerleave",
    () => {
      pointer = null;
      wake();
    },
    { signal },
  );
  micro.onIdleChange((idle) => {
    if (!idle && !signal.aborted && (pointer || strength > 0.01)) wake();
  });
  signal.addEventListener(
    "abort",
    () => {
      cancelAnimationFrame(frame);
      svg.remove();
    },
    { once: true },
  );
}
