/** Microanimations that need a script: the one-shot punches, flashes and
 * bursts a Persona 5 menu answers with. Everything ambient lives in CSS
 * (micro.css); this file is only for moments the DOM cannot express as a
 * state. Every helper is a no-op under reduced motion. */
import { h } from "./dom";

const SNAP = "cubic-bezier(0.2, 1.8, 0.4, 1)";

export interface Motion {
  reduced: boolean;
  isIdle(): boolean;
  signal: AbortSignal;
}

let motion: Motion = { reduced: true, isIdle: () => true, signal: new AbortController().signal };

export function setMotion(next: Motion) {
  motion = next;
}

const run = (
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) => {
  if (!el || motion.reduced) return;
  el.animate(keyframes, options);
};

/** A hard two-frame screen shake: the whole stage jolts on confirm. */
export function shake(el: Element | null | undefined, strength = 1) {
  run(
    el,
    [
      { translate: "0 0" },
      { translate: `${-5 * strength}px ${2 * strength}px` },
      { translate: `${4 * strength}px ${-3 * strength}px` },
      { translate: `${-2 * strength}px ${1 * strength}px` },
      { translate: "0 0" },
    ],
    { duration: 180, easing: "linear" },
  );
}

/** Squash-and-stretch punch, added on top of whatever transform the element
 * already carries. */
export function punch(el: Element | null | undefined, amount = 0.06) {
  run(
    el,
    [
      { transform: "scale(1)" },
      { transform: `scale(${1 + amount}, ${1 - amount * 0.6})`, offset: 0.35 },
      { transform: `scale(${1 - amount * 0.4}, ${1 + amount * 0.4})`, offset: 0.7 },
      { transform: "scale(1)" },
    ],
    { duration: 220, easing: "ease-out", composite: "add" },
  );
}

/** The portrait flashes its halftone and swells for a frame when the cursor
 * moves, like the character reacting to the menu. */
export function flashPortrait(figure: Element | null | undefined) {
  if (!figure) return;
  run(
    figure.querySelector(".cc-portrait__dots"),
    [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }],
    { duration: 260, easing: "steps(3, end)" },
  );
  punch(figure, 0.018);
}

/** Slide the help line in from the left with a two-step flicker. */
export function slideHelp(el: Element | null | undefined) {
  run(
    el,
    [
      { transform: "translateX(-14px)", opacity: 0.4 },
      { transform: "translateX(3px)", opacity: 1, offset: 0.6 },
      { transform: "translateX(0)", opacity: 1 },
    ],
    { duration: 200, easing: "ease-out", composite: "add" },
  );
}

const PROMPT_KEYS: Record<string, string> = {
  ArrowUp: "↑↓",
  ArrowDown: "↑↓",
  ArrowLeft: "←→",
  ArrowRight: "←→",
  Enter: "⏎",
  " ": "⏎",
  Escape: "Esc",
  Backspace: "Esc",
  q: "Q/E",
  e: "Q/E",
};

/** Press the matching controller-prompt key on screen. */
export function pressPrompt(screen: Element | null | undefined, key: string) {
  if (!screen) return;
  const label = PROMPT_KEYS[key] ?? PROMPT_KEYS[key.toLowerCase()];
  if (!label) return;
  for (const kbd of screen.querySelectorAll(".cc-prompts kbd")) {
    if (kbd.textContent?.trim() !== label) continue;
    run(
      kbd,
      [{ transform: "scale(1)" }, { transform: "scale(0.78)", offset: 0.3 }, { transform: "scale(1.12)", offset: 0.7 }, { transform: "scale(1)" }],
      { duration: 240, easing: SNAP },
    );
    run(
      kbd.parentElement,
      [{ background: "var(--cc-black)" }, { background: "var(--cc-red)", offset: 0.2 }, { background: "var(--cc-black)" }],
      { duration: 300, easing: "steps(2, end)" },
    );
  }
}

/** Confirm burst: little stars and shards scatter from a point. */
export function burst(host: HTMLElement, x: number, y: number, count = 6) {
  if (motion.reduced || motion.isIdle()) return;
  const layer = h("span", { class: "cc-burst", "aria-hidden": "true", style: `left:${x}px;top:${y}px` });
  for (let i = 0; i < count; i++) {
    const shard = h("span", { class: `cc-burst__bit cc-burst__bit--${i % 3}` });
    layer.append(shard);
    const angle = (Math.PI * 2 * i) / count + (i % 2 ? 0.4 : -0.2);
    const distance = 46 + (i % 3) * 22;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    shard.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.2) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(1.1) rotate(${120 + i * 40}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 12}px)) scale(0.4) rotate(${240 + i * 60}deg)`, opacity: 0 },
      ],
      { duration: 420 + i * 30, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)", fill: "forwards" },
    );
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 700);
}

/** Count a plain number up to its value with stepped ticks, like a
 * calendar day flipping to today. */
export function tickUp(
  el: HTMLElement,
  target: number,
  options: { from?: number; duration?: number; delay?: number; format?: (n: number) => string } = {},
) {
  const { from = 1, duration = 520, delay = 0, format = String } = options;
  if (motion.reduced || target <= from) {
    el.textContent = format(target);
    return;
  }
  const steps = Math.min(target - from, 18);
  const stepMs = duration / steps;
  let step = 0;
  el.textContent = format(from);
  const start = performance.now() + delay;
  const frame = (now: number) => {
    if (motion.signal.aborted) return;
    if (now < start) return void requestAnimationFrame(frame);
    if (motion.isIdle()) {
      el.textContent = format(target);
      return;
    }
    const next = Math.min(steps, Math.floor((now - start) / stepMs) + 1);
    if (next !== step) {
      step = next;
      const value = step >= steps ? target : Math.round(from + ((target - from) * step) / steps);
      el.textContent = format(value);
      run(el, [{ transform: "translateY(-0.12em)" }, { transform: "translateY(0)" }], { duration: 80, easing: "ease-out", composite: "add" });
    }
    if (step < steps) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Cycle a label through a list of words before landing on the last one. */
export function tickWords(el: HTMLElement, words: string[], target: string, options: { delay?: number; duration?: number } = {}) {
  const { delay = 0, duration = 520 } = options;
  const end = words.indexOf(target);
  if (motion.reduced || end < 0) {
    el.textContent = target;
    return;
  }
  const sequence = [...words.slice(0, end + 1)];
  const stepMs = duration / Math.max(sequence.length, 1);
  let i = 0;
  el.textContent = sequence[0];
  const start = performance.now() + delay;
  const frame = (now: number) => {
    if (motion.signal.aborted) return;
    if (now < start) return void requestAnimationFrame(frame);
    if (motion.isIdle()) {
      el.textContent = target;
      return;
    }
    const next = Math.min(sequence.length - 1, Math.floor((now - start) / stepMs));
    if (next !== i || i === 0) {
      i = next;
      el.textContent = sequence[i];
    }
    if (i < sequence.length - 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** A click anywhere on an interactive element: burst + punch. */
export function wireClicks(root: HTMLElement, signal: AbortSignal) {
  root.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>("a[href], button");
      if (!target || !root.contains(target)) return;
      const rect = root.getBoundingClientRect();
      burst(root, event.clientX - rect.left, event.clientY - rect.top);
    },
    { signal },
  );
}
