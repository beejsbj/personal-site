/** The sky over Kilahito: stars that never fade, and two great hion ribbons,
 * one cyan, one magenta, that drift across it. Each screen has its own pose
 * for the ribbons; changing screens re-weaves the sky toward the new pose.
 *
 * Cheap on purpose: the ribbons render at half resolution (their softness is
 * the upscale), at most 30fps, and the loop stops whenever the page is idle,
 * hidden, or asks for reduced motion. */

export interface SkyPose {
  /** Ribbon heights at the left and right edges, as a fraction of height. */
  cyan: [number, number];
  magenta: [number, number];
  /** How much the ribbons wave, as a fraction of height. */
  swell: number;
}

export const POSES: Record<string, SkyPose> = {
  home: { cyan: [0.02, 0.34], magenta: [-0.04, 0.5], swell: 0.1 },
  projects: { cyan: [0.3, 0.02], magenta: [0.18, -0.06], swell: 0.07 },
  project: { cyan: [0.12, 0.08], magenta: [0.04, 0.2], swell: 0.05 },
  lab: { cyan: [0.4, 0.1], magenta: [0.06, 0.42], swell: 0.12 },
  "lab-entry": { cyan: [0.1, 0.22], magenta: [0.22, 0.05], swell: 0.06 },
  about: { cyan: [-0.02, 0.26], magenta: [0.3, 0.0], swell: 0.08 },
  resume: { cyan: [0.08, 0.06], magenta: [0.16, 0.14], swell: 0.04 },
  other: { cyan: [0.2, 0.3], magenta: [0.0, 0.1], swell: 0.06 },
};

interface SkyOptions {
  host: HTMLElement;
  signal: AbortSignal;
  reducedMotion: boolean;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

const CYAN = [53, 242, 255];
const MAGENTA = [255, 60, 207];

export function createSky(options: SkyOptions) {
  const { host, signal } = options;
  const stars = document.createElement("canvas");
  const ribbons = document.createElement("canvas");
  stars.className = "hion-sky__stars";
  ribbons.className = "hion-sky__ribbons";
  host.append(stars, ribbons);
  const starCtx = stars.getContext("2d");
  const ctx = ribbons.getContext("2d");

  let width = 0;
  let height = 0;
  let pose: SkyPose = { ...POSES.home };
  let from: SkyPose = pose;
  let to: SkyPose = pose;
  let blendStart = 0;
  const BLEND = 1600;
  let time = Math.random() * 100;
  let last = 0;
  let frame = 0;
  let running = false;
  const dust = Array.from({ length: 90 }, () => ({
    t: Math.random(),
    off: (Math.random() - 0.5) * 2,
    speed: 0.00002 + Math.random() * 0.00006,
    size: Math.random() < 0.15 ? 1.6 : 0.8,
    ribbon: Math.random() < 0.5 ? 0 : 1,
  }));

  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    stars.width = Math.round(width * dpr);
    stars.height = Math.round(height * dpr);
    // Ribbons are soft light: half resolution is the look, not a compromise.
    ribbons.width = Math.round(width / 2);
    ribbons.height = Math.round(height / 2);
    drawStars(dpr);
    draw();
  }

  function drawStars(dpr: number) {
    if (!starCtx) return;
    starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    starCtx.clearRect(0, 0, width, height);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const count = Math.round((width * height) / 2600);
    for (let i = 0; i < count; i++) {
      const x = rand() * width;
      const y = Math.pow(rand(), 1.4) * height;
      const r = rand() < 0.06 ? 1.3 : rand() * 0.8 + 0.2;
      const tint = rand();
      const a = 0.25 + rand() * 0.6;
      starCtx.fillStyle =
        tint < 0.12
          ? `rgba(255,170,236,${a})`
          : tint < 0.24
            ? `rgba(160,248,255,${a})`
            : `rgba(236,240,255,${a})`;
      starCtx.beginPath();
      starCtx.arc(x, y, r, 0, Math.PI * 2);
      starCtx.fill();
    }
  }

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  function currentPose(now: number): SkyPose {
    const t = Math.min(1, (now - blendStart) / BLEND);
    const k = ease(t);
    return {
      cyan: [
        lerp(from.cyan[0], to.cyan[0], k),
        lerp(from.cyan[1], to.cyan[1], k),
      ],
      magenta: [
        lerp(from.magenta[0], to.magenta[0], k),
        lerp(from.magenta[1], to.magenta[1], k),
      ],
      swell: lerp(from.swell, to.swell, k),
    };
  }

  /** Spine of a ribbon: y for a given x fraction, in canvas pixels. */
  function spine(
    ends: [number, number],
    swell: number,
    phase: number,
    u: number,
    h: number,
  ) {
    const base = lerp(ends[0], ends[1], u);
    const wave =
      Math.sin(u * 5.1 + time * 0.23 + phase) * 0.6 +
      Math.sin(u * 9.7 - time * 0.17 + phase * 2) * 0.25 +
      Math.sin(u * 2.3 + time * 0.11) * 0.4;
    return (base + wave * swell) * h;
  }

  function ribbon(
    c: CanvasRenderingContext2D,
    ends: [number, number],
    swell: number,
    phase: number,
    rgb: number[],
    w: number,
    h: number,
  ) {
    const steps = 48;
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      points.push([lerp(-0.1, 1.1, u) * w, spine(ends, swell, phase, u, h)]);
    }
    const path = new Path2D();
    path.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      path.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    const [r, g, b] = rgb;
    const scale = Math.max(0.6, Math.min(1.4, w / 640));
    // Aurora curtain: faint strokes stacked below the spine.
    for (let k = 1; k <= 5; k++) {
      c.save();
      c.translate(0, k * 5 * scale);
      c.strokeStyle = `rgba(${r},${g},${b},${0.05 - k * 0.007})`;
      c.lineWidth = 10 * scale;
      c.stroke(path);
      c.restore();
    }
    c.strokeStyle = `rgba(${r},${g},${b},0.07)`;
    c.lineWidth = 34 * scale;
    c.stroke(path);
    c.strokeStyle = `rgba(${r},${g},${b},0.18)`;
    c.lineWidth = 12 * scale;
    c.stroke(path);
    c.strokeStyle = `rgba(${r},${g},${b},0.75)`;
    c.lineWidth = 3.2 * scale;
    c.stroke(path);
    c.strokeStyle = `rgba(${Math.min(255, r + 150)},${Math.min(255, g + 150)},${Math.min(255, b + 150)},0.8)`;
    c.lineWidth = 1 * scale;
    c.stroke(path);
  }

  function draw(now = performance.now()) {
    if (!ctx) return;
    const w = ribbons.width;
    const h = ribbons.height;
    pose = currentPose(now);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ribbon(ctx, pose.magenta, pose.swell, 2.1, MAGENTA, w, h);
    ribbon(ctx, pose.cyan, pose.swell, 0, CYAN, w, h);
    // Hion dust riding the ribbons.
    for (const mote of dust) {
      mote.t = (mote.t + mote.speed * 16) % 1;
      const ends = mote.ribbon ? pose.magenta : pose.cyan;
      const phase = mote.ribbon ? 2.1 : 0;
      const x = lerp(-0.1, 1.1, mote.t) * w;
      const y =
        spine(ends, pose.swell, phase, mote.t, h) +
        mote.off * 14 * Math.max(0.6, w / 640);
      const rgb = mote.ribbon ? MAGENTA : CYAN;
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.8)`;
      ctx.fillRect(x, y, mote.size, mote.size);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function loop(now: number) {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    if (now - last < 33) return;
    const dt = Math.min(100, now - (last || now));
    last = now;
    time += dt / 1000;
    draw(now);
  }

  function shouldRun() {
    return !options.reducedMotion && !options.isIdle() && !document.hidden;
  }

  function sync() {
    if (shouldRun() && !running) {
      running = true;
      last = 0;
      frame = requestAnimationFrame(loop);
    } else if (!shouldRun() && running) {
      running = false;
      cancelAnimationFrame(frame);
    }
  }

  resize();
  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  options.onIdleChange(sync);
  document.addEventListener("visibilitychange", sync, { signal });
  signal.addEventListener("abort", () => {
    running = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
  });
  sync();

  return {
    /** Re-weave the sky toward the pose of a screen. */
    setPose(kind: string) {
      const target = POSES[kind] ?? POSES.other;
      const now = performance.now();
      from = currentPose(now);
      to = target;
      blendStart = options.reducedMotion ? now - BLEND : now;
      if (!running) {
        // Still frames jump straight to the new pose.
        from = to;
        draw(now);
      }
    },
  };
}
