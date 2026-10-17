/** Tree: a screen's own structure, read off its markup, as the shape the
 * hions' branches grow in (skein.ts).
 *
 * Every word the threads write and every picture they ring is a leaf. Its
 * branches are what it sits in: the section of the screen it belongs to
 * (a loop, a strand of knots, the opening, the foot), and inside that each
 * thing that groups it (a list, an entry, a card, a figure, a row of
 * tags), outermost first. A group with one thing in it is no fork (an
 * entry wrapped in an article, a tag on its own drop): its one thing hangs
 * where it would have. So a section is a limb off a hion, each entry in it
 * a branch off the limb, each word in the entry a twig off the branch,
 * however deep the screen nests them. Pure reading: no drawing here. */
import type { Hue } from "./pastel";
import type { Measure } from "./spun";

/** What groups the things in a section (a fork in the tree). */
const GROUP =
  "section, header, article, li, ul, ol, figure, footer, [data-spine='loop'], .hion-tied, .hion-head__sign, .hion-head__more";

/** What a section is: the outermost group inside the screen. */
const SECTION = "section, header, article, aside, footer, [data-spine='loop']";

/** Said rather than titled: written by both trees at once, twisted. */
export const SAID = ".hion-hello, .hion-role, .hion-portrait__link, .hion-foot__call";

export interface Leaf {
  el: HTMLElement;
  hue: Hue;
  ring: boolean;
  measure: Measure | null;
}

export interface Fork {
  el: HTMLElement;
  /** Its forks and leaves, in the order they come on the screen. */
  kids: Fork[];
  leaf: Leaf | null;
}

/** The screen's sections, each a tree whose leaves are `list` (in
 * document order). */
export function structure(list: Leaf[], page: HTMLElement): Fork[] {
  const top: Fork[] = [];
  const forks = new Map<HTMLElement, Fork>();
  const fork = (el: HTMLElement, into: Fork[]) => {
    let f = forks.get(el);
    if (!f) {
      f = { el, kids: [], leaf: null };
      forks.set(el, f);
      into.push(f);
    }
    return f;
  };
  for (const leaf of list) {
    // What it sits in, outermost first, up to the screen.
    const chain: HTMLElement[] = [];
    for (let el = leaf.el.parentElement; el && el !== page; el = el.parentElement) {
      if (el.matches("main")) break;
      if (el.matches(GROUP)) chain.unshift(el);
    }
    // Its section: the outermost group, or what holds it in the screen.
    if (!chain.length || !chain[0].matches(SECTION)) {
      let el: HTMLElement = leaf.el;
      while (el.parentElement && !el.parentElement.matches("main, .hion-page")) el = el.parentElement;
      if (el !== leaf.el && !chain.includes(el)) chain.unshift(el);
    }
    let into = top;
    for (const el of chain) into = fork(el, into).kids;
    into.push({ el: leaf.el, kids: [], leaf });
  }
  return top.map(fold).filter((f): f is Fork => !!f);
}

/** A group with one thing in it is that thing; a group with nothing left
 * is nothing. */
function fold(f: Fork): Fork | null {
  if (f.leaf) return f;
  f.kids = f.kids.map(fold).filter((k): k is Fork => !!k);
  if (!f.kids.length) return null;
  if (f.kids.length === 1) return f.kids[0];
  return f;
}
