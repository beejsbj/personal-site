/** Flows blocks onto real pages: a block that doesn't fit goes overleaf, a
 * heading never sits alone at the foot of a page, and a list too long for
 * what's left is carried on to the next page. Pages are measured in the
 * staging area, at the size they'll be shown. */

export interface Blank {
  page: HTMLElement;
  /** The part of the page the words go in. */
  flow: HTMLElement;
}

export interface FlowOpts {
  /** Two pages face each other: a "right" break must land on a right page. */
  spread: boolean;
  /** Pages of the chapter that come before these. */
  offset?: number;
}

const isHeading = (el: Element) =>
  /^H[1-6]$/.test(el.tagName) || el.hasAttribute("data-bp-keep");
const isList = (el: Element) =>
  (el.tagName === "UL" || el.tagName === "OL") && el.children.length > 1;

export function paginate(
  blocks: HTMLElement[],
  blank: () => Blank,
  stage: HTMLElement,
  { spread, offset = 0 }: FlowOpts,
): HTMLElement[] {
  const pages: HTMLElement[] = [];
  const open = () => {
    const next = blank();
    stage.append(next.page);
    pages.push(next.page);
    return next;
  };
  let cur = open();
  const fits = () => cur.flow.scrollHeight <= cur.flow.clientHeight + 2;
  const queue = [...blocks];

  while (queue.length) {
    const block = queue.shift()!;
    const brk = block.dataset.bpBreak;
    if (brk && cur.flow.children.length) cur = open();
    if (brk === "right" && spread && (pages.length + offset) % 2 === 1) {
      // we're on a left page: leave it for a quick war, start on the right
      cur.page.dataset.spare = "";
      cur = open();
    }
    cur.flow.append(block);
    if (fits()) continue;

    if (isList(block)) {
      const rest = block.cloneNode(false) as HTMLElement;
      rest.removeAttribute("id");
      rest.dataset.bpCont = "";
      while (!fits() && block.children.length > 1)
        rest.prepend(block.lastElementChild!);
      if (fits()) {
        if (block.tagName === "OL") {
          const start = Number(block.getAttribute("start") ?? 1);
          rest.setAttribute("start", String(start + block.children.length));
        }
        if (cur.flow.children.length === 1 || block.children.length > 0) {
          cur = open();
          queue.unshift(rest);
          continue;
        }
      }
      // not even one item fits here: put them back and move the whole list
      while (rest.firstElementChild) block.append(rest.firstElementChild);
    }

    if (block.tagName === "P") {
      const rest = splitParagraph(block, fits);
      if (rest) {
        cur = open();
        queue.unshift(rest);
        continue;
      }
    }

    if (cur.flow.children.length === 1) {
      // too tall for any page: let this page scroll rather than lose words
      cur.page.dataset.oversize = "";
      if (queue.length) cur = open();
      continue;
    }
    block.remove();
    // headings that would be left alone at the foot of the page come along
    const kids = [...cur.flow.children];
    let cut = kids.length;
    while (cut > 0 && isHeading(kids[cut - 1])) cut--;
    const carry = cut > 0 ? kids.slice(cut) : [];
    cur = open();
    carry.forEach((el) => cur.flow.append(el));
    queue.unshift(block);
  }

  for (const page of pages) page.remove();
  return pages;
}

/** Break a paragraph at the last word that fits, the way a hand runs on
 * overleaf. Returns the rest, or null if not even a few words fit. */
function splitParagraph(p: HTMLElement, fits: () => boolean): HTMLElement | null {
  const src = p.cloneNode(true) as HTMLElement;
  const cuts: [Text, number][] = [];
  const walker = document.createTreeWalker(src, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text;
    for (const m of text.data.matchAll(/\s+/g))
      cuts.push([text, (m.index ?? 0) + m[0].length]);
  }
  const MIN = 4;
  if (cuts.length < MIN * 2) return null;
  const upTo = (k: number) => {
    const range = document.createRange();
    range.setStart(src, 0);
    range.setEnd(cuts[k][0], cuts[k][1]);
    return range.cloneContents();
  };
  let lo = MIN - 1;
  let hi = cuts.length - MIN;
  p.replaceChildren(upTo(lo));
  if (!fits()) {
    p.replaceChildren(...src.cloneNode(true).childNodes);
    return null;
  }
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    p.replaceChildren(upTo(mid));
    if (fits()) lo = mid;
    else hi = mid - 1;
  }
  p.replaceChildren(upTo(lo));
  // never leave a single line alone at the foot of the page
  const line = parseFloat(getComputedStyle(p).lineHeight) || 24;
  if (p.offsetHeight < line * 1.9) {
    p.replaceChildren(...src.cloneNode(true).childNodes);
    return null;
  }
  const range = document.createRange();
  range.setStart(cuts[lo][0], cuts[lo][1]);
  range.setEnd(src, src.childNodes.length);
  const rest = p.cloneNode(false) as HTMLElement;
  rest.removeAttribute("id");
  rest.dataset.bpCont = "";
  rest.append(range.cloneContents());
  return rest;
}
