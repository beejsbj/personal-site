/** The ribbon: the ticker, as a ribbon of bone paper fed across the top of
 * the view, on the home page and in the Lab. The headlines are printed
 * along it, a scrap of cut paper and a day before each; each is a link to
 * the first update it is about, in the Labbook. With no headlines there is
 * no ribbon.
 *
 * It runs left at ten pixels an eighth note and has no end: the run of
 * headlines is laid twice, the second time for the eye only, and a run is
 * never shorter than the strip, so one headline crosses the whole of it
 * alone. The lap is set from how long the run is, so more to read is not a
 * faster ribbon. A pointer over it holds it where it is. Keyboard focus on
 * a headline rests it at its start; the strip may then scroll, so the
 * headline in focus is brought into view wherever on the ribbon it lies,
 * and when focus leaves the strip goes back to its start before the ribbon
 * runs on. Where nothing moves (reduced motion, a prism face) the ribbon
 * is a slip: the headlines stand in rows, told once. */
import { part } from "../../parts";
import { labbookHref, updateDateLabel } from "../../../lib/labbook";
import { noteVar, type Env } from "./bits";
import { h, link } from "./dom";
import { EIGHTH_SECONDS } from "./music";

/** Pixels a second. */
const PACE = 10 / EIGHTH_SECONDS;
const CUTS = ["tri", "dot", "bar", "tab"];
/** The paper left before a headline the ribbon has rested at. */
const LEAD = 8;

export function ribbon(env: Env): HTMLElement | null {
  const { content, signal, face, reducedMotion } = env;
  const { headlines } = content;
  if (!headlines.length) return null;
  // "26 Sep": the year is the Labbook's to say
  const day = (date: string) => updateDateLabel(date).slice(0, 6);
  const cut = (i: number) => h("i", { class: `cp-ribbon__cut cp-ribbon__cut--${CUTS[i % CUTS.length]}`, style: `--paper:${noteVar(i)}`, "aria-hidden": "true" });
  const run = h(
    "ul",
    { class: "cp-ribbon__run", "data-tape-run": "" },
    headlines.map((headline, i) =>
      h("li", { class: "cp-ribbon__item", ...part("ticker.headline", headline.id) }, cut(i), h("time", { datetime: headline.date }, day(headline.date)), link(labbookHref(headline.updates[0]), {}, headline.text)),
    ),
  );
  const again = h(
    "div",
    { class: "cp-ribbon__run cp-ribbon__run--again", "data-tape-run": "", "aria-hidden": "true" },
    headlines.map((headline, i) =>
      h("span", { class: "cp-ribbon__item" }, cut(i), h("span", { class: "cp-ribbon__day" }, day(headline.date)), link(labbookHref(headline.updates[0]), { tabindex: "-1" }, headline.text)),
    ),
  );
  const strip = h("div", { class: "cp-ribbon__strip", "data-tape-strip": "" }, run, again);
  const letters = headlines.reduce((sum, { text }) => sum + text.length, 0);
  const root = h(
    "aside",
    { class: "cp-ribbon", "data-tape": "", "aria-labelledby": "cp-ribbon-label", style: `--letters:${letters}; --items:${headlines.length}` },
    h("p", { class: "cp-tag cp-ribbon__label", id: "cp-ribbon-label" }, content.site.ticker.label),
    strip,
  );
  if (face) return root;

  // the lap, from the run as it is printed: the count of letters in the
  // stylesheet is the estimate until this has measured it
  if (!reducedMotion) {
    const observer = new ResizeObserver(() => {
      const { width } = run.getBoundingClientRect();
      if (width) root.style.setProperty("--lap", `${(width / PACE).toFixed(2)}s`);
    });
    observer.observe(run);
    signal.addEventListener("abort", () => observer.disconnect());
  }

  strip.addEventListener(
    "focusin",
    (event) => {
      const a = event.target as HTMLElement;
      if (!a.matches("a:focus-visible")) return;
      strip.dataset.tapeRest = "";
      const edge = strip.getBoundingClientRect();
      // the whole headline, its day included, from its beginning
      strip.scrollLeft += (a.parentElement ?? a).getBoundingClientRect().left - edge.left - LEAD;
      // where that is longer than the strip and the words alone are not,
      // the words are shown whole and the day gives way
      const words = a.getBoundingClientRect();
      if (words.width <= strip.clientWidth && words.right > edge.right) strip.scrollLeft += words.right - edge.right;
    },
    { signal },
  );
  strip.addEventListener(
    "focusout",
    (event) => {
      if (!("tapeRest" in strip.dataset) || strip.contains(event.relatedTarget as Node | null)) return;
      strip.scrollLeft = 0;
      delete strip.dataset.tapeRest;
    },
    { signal },
  );
  return root;
}
