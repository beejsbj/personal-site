/** Small DOM helpers for the Calling Card shell: element building, the
 * ransom-note lettering every Persona 5 title is cut from, and the stars. */

type Attrs = Record<string, string | number | boolean | undefined | null>;
type Child = Node | string | null | undefined | false;

/** Build an element. `class` and `style` are plain attributes; boolean
 * `true` sets an empty attribute, `false`/null/undefined skips it. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    el.setAttribute(key, value === true ? "" : String(value));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: (Child | Child[])[]) {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child);
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";
export function svg(markup: string, attrs: Attrs = {}): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, "svg");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("focusable", "false");
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    el.setAttribute(key, String(value));
  }
  el.innerHTML = markup;
  return el;
}

/** Deterministic randomness, so a word is always cut the same way. */
export function rng(seedText: string, salt = 0) {
  let seed = salt ^ 0x9e3779b9;
  for (let i = 0; i < seedText.length; i++)
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 0x5bd1e995);
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RansomOptions {
  /** Probability a letter is cut out as an inverted box. */
  boxes?: number;
  /** Rotation range in degrees. */
  tilt?: number;
  /** Let some letters drop to lowercase didone, like "CoMMaND". */
  mixCase?: boolean;
  salt?: number;
}

/** Ransom-note lettering: every letter cut from a different magazine.
 * Screen readers get the plain text; the letters are decoration. */
export function ransom(text: string, options: RansomOptions = {}) {
  const { boxes = 0.14, tilt = 7, mixCase = true, salt = 0 } = options;
  const random = rng(text, salt);
  const wrap = h("span", { class: "cc-ransom" });
  wrap.append(h("span", { class: "cc-sr" }, text));
  const ink = h("span", { class: "cc-ransom__ink", "aria-hidden": "true" });
  const words = text.split(/(\s+)/);
  let index = 0;
  for (const word of words) {
    if (!word) continue;
    if (/^\s+$/.test(word)) {
      ink.append(" ");
      continue;
    }
    const w = h("span", { class: "cc-w" });
    for (const char of word) {
      const first = index === 0;
      const r = random();
      const font = first ? 1 : r < 0.5 ? 0 : r < 0.82 ? 1 : 2;
      const lower =
        mixCase && !first && font > 0 && /[a-z]/i.test(char) && random() < 0.35;
      const letter = h(
        "span",
        {
          class: "cc-l",
          "data-f": font,
          "data-box":
            !first && /[a-z0-9]/i.test(char) && random() < boxes ? "1" : null,
          style: [
            `--n:${index}`,
            `--r:${((random() * 2 - 1) * tilt).toFixed(1)}deg`,
            `--s:${first ? 1.28 : (0.84 + random() * 0.3).toFixed(2)}`,
            `--y:${((random() * 2 - 1) * 0.06).toFixed(3)}em`,
          ].join(";"),
        },
        lower ? char.toLowerCase() : char.toUpperCase(),
      );
      w.append(letter);
      index++;
    }
    ink.append(w);
  }
  wrap.append(ink);
  return wrap;
}

/** A five-point star polygon, centred in a 100×100 box. */
export function starPoints(outer = 48, inner = 20, cx = 50, cy = 50) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? inner : outer;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return points.join(" ");
}

/** The concentric Roll to Win star. */
export function concentricStar(colors: string[]) {
  const rings = colors
    .map((fill, i) => {
      const k = 1 - i / colors.length;
      return `<polygon fill="${fill}" points="${starPoints(48 * k, 20 * k)}"/>`;
    })
    .join("");
  return svg(rings, { viewBox: "0 0 100 100", class: "cc-star" });
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Parse a YYYY-MM-DD date without timezone drift. */
export function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Pull the body element with the Daylight classes out of a route's main. */
export function pick(main: HTMLElement, selector: string) {
  return main.querySelector<HTMLElement>(selector);
}

/** Clone a prose article, dropping Astro's scoping so it only wears ours. */
export function cleanProse(node: Element | null) {
  const article = h("div", { class: "cc-prose" });
  if (!node) return article;
  for (const child of Array.from(node.childNodes))
    article.append(child.cloneNode(true));
  return article;
}
