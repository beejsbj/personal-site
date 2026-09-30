/** The weave: a braid of two hion lines, one cyan and one magenta, that runs
 * down a screen and ties itself through every knot the layout places. The
 * layout decides where the knots sit (a `.hion-knot` in a gutter, beside a
 * heading, under a card); the weave only connects them, crossing the two
 * strands at every knot so they braid.
 *
 * The braid grows with the reader: it reaches a little past the bottom of
 * the viewport and follows you down as you scroll, lighting each knot (and
 * the item that owns it) as it arrives. Leaving a screen, it unravels. */
import { s } from "./dom";

interface WeaveOptions {
  screen: HTMLElement;
  signal: AbortSignal;
  /** Draw everything at once: reduced motion or a still face. */
  instant: boolean;
  /** Where the braid comes down from, in viewport coordinates: the wire of
   * the current destination in the sky rail. */
  origin?: () => { x: number; y: number } | null;
}

interface Sample {
  y: number;
  length: number;
}

let uid = 0;

export function createWeave({ screen, signal, instant, origin }: WeaveOptions) {
  let from: { x: number; y: number } | null = null;
  const id = `hion-weave-${++uid}`;
  const svg = s("svg", {
    class: "hion-weave",
    "aria-hidden": "true",
    focusable: "false",
  });
  const defs = s("defs");
  const mask = s("mask", { id: `${id}-mask`, maskUnits: "userSpaceOnUse" });
  const maskPath = s("path", { class: "hion-weave__reach", pathLength: "1" });
  mask.append(maskPath);
  defs.append(mask);

  const magenta = s("path", {
    class: "hion-weave__strand hion-weave__strand--magenta",
    pathLength: "1",
  });
  const cyan = s("path", {
    class: "hion-weave__strand hion-weave__strand--cyan",
    pathLength: "1",
  });
  const magentaPulse = s("path", {
    class: "hion-weave__pulse hion-weave__pulse--magenta",
    pathLength: "1",
  });
  const cyanPulse = s("path", {
    class: "hion-weave__pulse hion-weave__pulse--cyan",
    pathLength: "1",
  });
  const magentaHalo = s("path", {
    class: "hion-weave__halo hion-weave__halo--magenta",
    pathLength: "1",
  });
  const cyanHalo = s("path", {
    class: "hion-weave__halo hion-weave__halo--cyan",
    pathLength: "1",
  });
  const grown = [magentaHalo, cyanHalo, magenta, cyan, maskPath];
  const strands = s("g", {}, magentaHalo, cyanHalo, magenta, cyan);
  const pulses = s("g", { mask: `url(#${id}-mask)` }, magentaPulse, cyanPulse);
  svg.append(defs, strands, pulses);
  screen.prepend(svg);

  let samples: Sample[] = [];
  let total = 1;
  let reach = 0;
  let knots: { el: HTMLElement; length: number }[] = [];
  let frame = 0;

  function build() {
    const box = screen.getBoundingClientRect();
    const width = screen.clientWidth;
    if (!from && origin) {
      const o = origin();
      // Page coordinates within the screen, as if scrolled to the top.
      if (o) from = { x: o.x - box.left, y: o.y - (box.top + scrollY) };
    }
    const braid =
      parseFloat(getComputedStyle(screen).getPropertyValue("--hion-braid")) ||
      26;
    const height = screen.scrollHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    const found = [
      ...screen.querySelectorAll<HTMLElement>(".hion-knot"),
    ].filter((el) => el.offsetParent !== null);
    // Knots that sit almost on top of each other tie as one.
    const twins = new Map<HTMLElement, HTMLElement[]>();
    const points: { el: HTMLElement; x: number; y: number }[] = [];
    for (const el of found) {
      const r = el.getBoundingClientRect();
      const point = {
        el,
        x: r.left - box.left + r.width / 2,
        y: r.top - box.top + r.height / 2,
      };
      const prev = points[points.length - 1];
      if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) < 56) {
        twins.set(prev.el, [...(twins.get(prev.el) ?? []), el]);
        el.setAttribute("data-twin", "");
      } else {
        el.removeAttribute("data-twin");
        points.push(point);
      }
    }
    if (points.length === 0) {
      svg.style.display = "none";
      return;
    }
    svg.style.display = "";
    // Enter from the sky above the first knot; leave toward the bottom.
    const first = points[0];
    const last = points[points.length - 1];
    const route = [
      ...(from
        ? [
            { x: from.x, y: from.y, el: null },
            // Far from the first knot, string across the top first, like a
            // wire slung below the rail, rather than cutting through the page.
            ...(Math.abs(from.x - first.x) > 120 && first.y - from.y > 160
              ? [{ x: first.x, y: from.y + 64, el: null }]
              : []),
          ]
        : [
            { x: first.x + (first.x > width / 2 ? -60 : 60), y: -40, el: null },
          ]),
      ...points,
      {
        x: last.x + (last.x > width / 2 ? -80 : 80),
        y: Math.max(last.y + 160, height + 20),
        el: null,
      },
    ];

    const lines: [string, string, string] = ["", "", ""];
    samples = [];
    knots = [];
    let length = 0;
    let prev: [number, number] | null = null;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const dy = b.y - a.y;
      const pull = Math.max(40, Math.abs(dy) * 0.5);
      const c1 = [a.x, a.y + pull];
      const c2 = [b.x, b.y - pull];
      const span = Math.hypot(b.x - a.x, dy);
      const steps = Math.max(8, Math.round(span / 10));
      const amplitude = Math.min(braid, braid * 0.3 + span * 0.05);
      const side = i % 2 === 0 ? 1 : -1;
      for (let j = i === 0 ? 0 : 1; j <= steps; j++) {
        const t = j / steps;
        const mt = 1 - t;
        const x =
          mt * mt * mt * a.x +
          3 * mt * mt * t * c1[0] +
          3 * mt * t * t * c2[0] +
          t * t * t * b.x;
        const y =
          mt * mt * mt * a.y +
          3 * mt * mt * t * c1[1] +
          3 * mt * t * t * c2[1] +
          t * t * t * b.y;
        const dx =
          3 * mt * mt * (c1[0] - a.x) +
          6 * mt * t * (c2[0] - c1[0]) +
          3 * t * t * (b.x - c2[0]);
        const dyy =
          3 * mt * mt * (c1[1] - a.y) +
          6 * mt * t * (c2[1] - c1[1]) +
          3 * t * t * (b.y - c2[1]);
        const norm = Math.hypot(dx, dyy) || 1;
        const nx = -dyy / norm;
        const ny = dx / norm;
        const off = Math.sin(Math.PI * t) * amplitude * side;
        if (prev) length += Math.hypot(x - prev[0], y - prev[1]);
        prev = [x, y];
        samples.push({ y, length });
        const cmd = lines[0] ? "L" : "M";
        lines[0] += `${cmd}${x.toFixed(1)} ${y.toFixed(1)}`;
        lines[1] += `${cmd}${(x + nx * off).toFixed(1)} ${(y + ny * off).toFixed(1)}`;
        lines[2] += `${cmd}${(x - nx * off).toFixed(1)} ${(y - ny * off).toFixed(1)}`;
      }
      if (b.el) {
        for (const tied of [b.el, ...(twins.get(b.el) ?? [])]) {
          knots.push({ el: tied, length });
          const owner = tied.closest<HTMLElement>("[data-weave-item]");
          // Only what starts below the fold waits for the braid; the first
          // screenful is always there to read.
          if (
            owner &&
            !owner.hasAttribute("data-lit") &&
            owner.getBoundingClientRect().top - box.top > innerHeight * 0.6
          ) {
            owner.setAttribute("data-awaiting", "");
          }
        }
      }
    }
    total = length || 1;
    maskPath.setAttribute("d", lines[0]);
    cyan.setAttribute("d", lines[1]);
    cyanHalo.setAttribute("d", lines[1]);
    magentaHalo.setAttribute("d", lines[2]);
    cyanPulse.setAttribute("d", lines[1]);
    magenta.setAttribute("d", lines[2]);
    magentaPulse.setAttribute("d", lines[2]);
    apply(false);
  }

  /** Spine length reached by the time the braid gets to page y. */
  function lengthAt(y: number) {
    if (!samples.length) return 0;
    let best = 0;
    for (const sample of samples) {
      if (sample.y <= y) best = Math.max(best, sample.length);
    }
    return best;
  }

  function apply(animate: boolean) {
    const fraction = Math.min(1, reach / total);
    screen.classList.toggle("hion-weave-animate", animate);
    const offset = String(1 - fraction);
    for (const path of grown) {
      path.style.strokeDashoffset = offset;
    }
    for (const knot of knots) {
      const lit = knot.length <= reach + 1;
      if (lit && !knot.el.hasAttribute("data-lit")) {
        const delay = animate
          ? Math.max(
              0,
              ((knot.length - previousReach) /
                Math.max(1, reach - previousReach)) *
                900,
            )
          : 0;
        knot.el.style.setProperty("--hion-lit-delay", `${Math.round(delay)}ms`);
        knot.el.setAttribute("data-lit", "");
        knot.el
          .closest<HTMLElement>("[data-weave-item]")
          ?.setAttribute("data-lit", "");
      }
    }
  }

  let previousReach = 0;
  function extend(animate = !instant) {
    const box = screen.getBoundingClientRect();
    const target = instant ? total : lengthAt(innerHeight * 0.92 - box.top);
    if (target <= reach) return;
    previousReach = reach;
    reach = target;
    apply(animate);
  }

  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      extend();
    });
  }

  let resizeTimer = 0;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const fraction = reach / total;
      build();
      reach = Math.max(reach, fraction * total);
      apply(false);
      extend(false);
    }, 120);
  });

  return {
    /** Lay the braid and grow it into view. */
    start() {
      build();
      reach = 0;
      apply(false);
      // Let the zero state paint before growing.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => extend(!instant)),
      );
      addEventListener("scroll", onScroll, { passive: true, signal });
      observer.observe(screen);
      signal.addEventListener("abort", () => observer.disconnect());
    },
    /** Pull the braid back up into the sky. */
    unravel() {
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      screen.classList.add("hion-weave-unravel");
      reach = 0;
      for (const path of grown) {
        path.style.strokeDashoffset = "1";
      }
    },
  };
}
