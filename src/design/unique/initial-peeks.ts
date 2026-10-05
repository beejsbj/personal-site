/** Peeking initials: v0's giant B and J, no longer parked at the foot of
 * the homepage. Now and then, on any page, one of them peeks in from a
 * screen edge or up from behind a section rule, then ducks away.
 *
 * Rules that keep it from ever fighting reading:
 * - rare: the first peek waits a while, then a long cooldown follows each
 *   one; the cooldown is kept for the session (sessionStorage), so moving
 *   between pages never makes them more frequent;
 * - one at a time, never in a page's first moments, never while the page
 *   is scrolling, hidden or mid-transition;
 * - never over text: a placement whose visible part would touch text,
 *   media or a control is rejected, and if none fits the peek waits;
 * - brief: in, a short hold, out, well under five seconds (WCAG 2.2.2);
 * - shy: it ducks the moment it is noticed (pointer approaching or over
 *   it, a tap, a scroll) or after its hold.
 * Reduced motion: no peeks at all. No JS: nothing exists.
 * The runtime cleans up on Astro navigation and remounts on page-load.
 */
const MOTION = "(prefers-reduced-motion: no-preference)";
const STORE_KEY = "daylight:initials-next-peek";

export const PEEK = {
  firstDelay: [14_000, 32_000], // ms before the first peek of a session
  cooldown: [90_000, 180_000], // ms between peeks
  retry: [9_000, 18_000], // ms to wait when nothing could peek just now
  settle: 4_000, // ms of a fresh page that are always left alone
  hold: 2_400, // ms a peek holds before it ducks by itself
  scrollCalm: 1_200, // ms since the last scroll before a peek may start
  exitFallback: 900, // ms to wait for the exit transition before removal
  notice: 96, // px: a pointer this close to the letter is noticed
  show: 0.42, // share of the letter's box that peeks into view
  clearance: 24, // px kept between the peek and any text or control
} as const;

const OBSTACLES = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "a",
  "button",
  "figcaption",
  "dt",
  "dd",
  "blockquote",
  "pre",
  "img",
  "video",
  "label",
  "input",
  "textarea",
  "select",
  "time",
].join(",");
const HORIZONS = "[data-peek-horizon], .site-footer";

type Rect = { left: number; top: number; right: number; bottom: number };
type Placement = {
  edge: "left" | "right" | "bottom" | "horizon";
  from: [number, number];
  to: [number, number];
  visible: Rect;
  floor?: number;
};

const between = ([min, max]: readonly [number, number]) =>
  min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const shuffle = <T>(items: T[]) =>
  items
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.left < b.right + pad &&
  a.right > b.left - pad &&
  a.top < b.bottom + pad &&
  a.bottom > b.top - pad;

function readNext(): number | undefined {
  try {
    const value = Number(sessionStorage.getItem(STORE_KEY));
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
function writeNext(value: number) {
  try {
    sessionStorage.setItem(STORE_KEY, String(Math.round(value)));
  } catch {
    // Private modes may refuse storage; the in-memory cooldown still holds.
  }
}

export function installInitialPeeks() {
  const motion = window.matchMedia(MOTION);
  let nextAt = readNext() ?? Date.now() + between(PEEK.firstDelay);
  writeNext(nextAt);
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const mountedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastScroll = -Infinity;
    let active:
      | {
          stage: HTMLElement;
          letter: HTMLElement;
          visible: Rect;
          hold?: ReturnType<typeof setTimeout>;
          exit?: ReturnType<typeof setTimeout>;
          leaving: boolean;
        }
      | undefined;

    const clearTimer = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const removeNow = () => {
      if (!active) return;
      clearTimeout(active.hold);
      clearTimeout(active.exit);
      active.stage.remove();
      active = undefined;
    };
    const schedule = (at = nextAt) => {
      clearTimer();
      if (!motion.matches) return;
      const now = Date.now();
      const wait = Math.max(at - now, mountedAt + PEEK.settle - now, 0);
      timer = setTimeout(() => attempt(false), wait);
    };
    const retry = () => schedule(Date.now() + between(PEEK.retry));

    const obstacles = (): Rect[] => {
      const height = window.innerHeight;
      const rects: Rect[] = [];
      for (const element of document.querySelectorAll<HTMLElement>(OBSTACLES)) {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if (rect.bottom < 0 || rect.top > height) continue;
        rects.push(rect);
      }
      return rects;
    };

    const placements = (width: number, height: number): Placement[] => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const showX = width * PEEK.show;
      const showY = height * PEEK.show;
      const options: Placement[] = [];
      for (const share of [0.22, 0.42, 0.62]) {
        const y = Math.round(vh * share - height / 2);
        if (y < 0 || y + height > vh) continue;
        options.push({
          edge: "left",
          from: [-width, y],
          to: [Math.round(showX - width), y],
          visible: { left: 0, top: y, right: showX, bottom: y + height },
        });
        options.push({
          edge: "right",
          from: [vw, y],
          to: [Math.round(vw - showX), y],
          visible: { left: vw - showX, top: y, right: vw, bottom: y + height },
        });
      }
      const xs = [0.04, 0.3, 0.56]
        .map((share) => Math.round(vw * share))
        .filter((x) => x + width <= vw);
      for (const x of xs) {
        options.push({
          edge: "bottom",
          from: [x, vh],
          to: [x, Math.round(vh - showY)],
          visible: { left: x, top: vh - showY, right: x + width, bottom: vh },
        });
      }
      for (const rule of document.querySelectorAll<HTMLElement>(HORIZONS)) {
        const floor = Math.round(rule.getBoundingClientRect().top);
        if (floor < vh * 0.35 || floor > vh - PEEK.clearance) continue;
        for (const x of xs) {
          options.push({
            edge: "horizon",
            floor,
            from: [x, floor],
            to: [x, Math.round(floor - showY)],
            visible: {
              left: x,
              top: floor - showY,
              right: x + width,
              bottom: floor,
            },
          });
        }
      }
      return options;
    };

    const leave = (how: "out" | "duck") => {
      const current = active;
      if (!current || current.leaving) return;
      current.leaving = true;
      clearTimeout(current.hold);
      current.letter.dataset.peek = how;
      const done = () => {
        if (active !== current) return;
        removeNow();
        schedule();
      };
      current.letter.addEventListener("transitionend", done, { once: true });
      current.exit = setTimeout(done, PEEK.exitFallback);
    };

    const attempt = (forced: boolean) => {
      timer = undefined;
      if (!motion.matches || active) return;
      const now = Date.now();
      const busy =
        document.hidden ||
        now - lastScroll < PEEK.scrollCalm ||
        document.documentElement.hasAttribute("data-page-cover");
      if (busy && !forced) return retry();

      const stage = document.createElement("div");
      stage.className = "initial-peek";
      stage.setAttribute("aria-hidden", "true");
      const letter = document.createElement("span");
      letter.className = "initial-peek__letter";
      letter.textContent = pick(["B", "J"]);
      letter.dataset.peek = "measure";
      stage.append(letter);
      document.body.append(stage);
      const box = letter.getBoundingClientRect();
      const blocked = forced ? [] : obstacles();
      const placement = shuffle(placements(box.width, box.height)).find(
        (option) =>
          !blocked.some((rect) =>
            overlaps(option.visible, rect, PEEK.clearance),
          ),
      );
      if (!placement || !box.width) {
        stage.remove();
        return forced ? undefined : retry();
      }

      stage.dataset.edge = placement.edge;
      if (placement.floor !== undefined)
        stage.style.setProperty("--peek-floor", `${placement.floor}px`);
      letter.style.setProperty(
        "--peek-from",
        `${placement.from[0]}px ${placement.from[1]}px`,
      );
      letter.style.setProperty(
        "--peek-to",
        `${placement.to[0]}px ${placement.to[1]}px`,
      );
      letter.dataset.peek = "hidden";
      active = { stage, letter, visible: placement.visible, leaving: false };
      nextAt = now + between(PEEK.cooldown);
      writeNext(nextAt);
      // Commit the hidden position, then let the transition carry it in.
      void letter.getBoundingClientRect();
      letter.dataset.peek = "in";
      active.hold = setTimeout(() => leave("out"), PEEK.hold);
      letter.addEventListener("pointerenter", () => leave("duck"), {
        signal,
      });
    };

    // Noticed: an approaching pointer, a tap, a scroll.
    document.addEventListener(
      "pointermove",
      (event) => {
        if (!active || active.leaving) return;
        const { left, top, right, bottom } = active.visible;
        const dx = Math.max(left - event.clientX, 0, event.clientX - right);
        const dy = Math.max(top - event.clientY, 0, event.clientY - bottom);
        if (Math.hypot(dx, dy) < PEEK.notice) leave("duck");
      },
      { signal, passive: true },
    );
    document.addEventListener("pointerdown", () => leave("duck"), {
      signal,
      passive: true,
    });
    window.addEventListener(
      "scroll",
      () => {
        lastScroll = Date.now();
        leave("duck");
      },
      { signal, passive: true },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) return;
        removeNow();
        schedule();
      },
      { signal },
    );
    motion.addEventListener(
      "change",
      () => {
        if (motion.matches) return schedule();
        clearTimer();
        removeNow();
      },
      { signal },
    );
    // The style guide's "peek now" control, for anyone who wants to see one.
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "[data-peek-now]",
    )) {
      button.hidden = false;
      const sync = () => (button.disabled = !motion.matches);
      sync();
      motion.addEventListener("change", sync, { signal });
      button.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          if (active) return;
          clearTimer();
          attempt(true);
          if (!active) schedule();
        },
        { signal },
      );
    }

    schedule();
    cleanup = () => {
      controller.abort();
      clearTimer();
      removeNow();
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}
