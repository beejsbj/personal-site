/** The about page as a meticulous student's study notes. Nothing here writes
 * a word of its own: the notes are cut from the rendered about body, in its
 * order, so whatever Burooj writes there (longer, shorter, other headings)
 * comes out as notes the same way.
 *
 * - a heading becomes a numbered note heading (h2) or a sub-heading;
 * - a paragraph becomes bullets, one per sentence: the first a point, the
 *   rest arrows under it;
 * - a quotation inside a paragraph (in “curly quotes”), or a blockquote, is
 *   lifted out into a boxed callout, where it stood;
 * - links and emphasis keep their elements, which the CSS highlights;
 * - anything else markdown makes (lists, tables, code, pictures) is kept.
 *
 * Every piece is marked as part of the body, and the pieces' words run on in
 * the body's own order, so the parity test reads them as the body. */
import { markPart, type Part } from "../../parts";
import { blocks } from "../rich";
import { h, svg } from "./dom";
import { RED, seed, underline } from "./ink";

/** Words a sentence can't end on: "e.g. this", "Dr. Who", "J. Smith". */
const NOT_AN_END = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|cf|approx|Mr|Mrs|Ms|Dr|St|Jr|Sr|No|[A-Z])\.$/;
/** A sentence ends at . ! ? or … (and any closing quote or bracket after it),
 * then space, then something that starts a sentence. */
const END = /[.!?…]+[”’"')\]]*(?=\s+[“‘"'(\[]?[A-Z0-9])/g;
/** A quotation worth a box: in curly double quotes, at least a few words. */
const QUOTE = /“[^”]{20,}”/g;

interface Span {
  start: number;
  end: number;
}

/** Offsets in an element's text, as (text node, offset) for a Range. */
function locator(root: Node) {
  const nodes: { node: Text; start: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let at = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: at });
    at += (n as Text).data.length;
  }
  return (offset: number): [Node, number] => {
    for (let i = nodes.length - 1; i >= 0; i--)
      if (offset >= nodes[i].start) return [nodes[i].node, Math.min(offset - nodes[i].start, nodes[i].node.data.length)];
    return [root, 0];
  };
}

/** The pieces of a paragraph between offsets, inline elements and all. */
function cut(p: HTMLElement, spans: Span[]) {
  const at = locator(p);
  return spans.map(({ start, end }) => {
    const range = document.createRange();
    range.setStart(...at(start));
    range.setEnd(...at(end));
    return range.cloneContents();
  });
}

type Piece = { kind: "point" | "more" | "quote"; start: number; end: number };

/** A paragraph's sentences, and any quotation lifted out of one. */
export function pieces(text: string): Piece[] {
  const quotes: Span[] = [...text.matchAll(QUOTE)].map((m) => ({ start: m.index!, end: m.index! + m[0].length }));
  const inQuote = (i: number) => quotes.some((q) => i > q.start && i < q.end - 1);
  const ends: number[] = [];
  for (const m of text.matchAll(END)) {
    const end = m.index! + m[0].length;
    if (inQuote(end - 1)) continue;
    if (NOT_AN_END.test(text.slice(Math.max(0, m.index! - 8), m.index! + 1))) continue;
    ends.push(end);
  }
  const sentences: Span[] = [];
  let from = 0;
  for (const end of [...ends, text.length]) {
    const start = from + (text.slice(from).length - text.slice(from).trimStart().length);
    if (end > start) sentences.push({ start, end });
    from = end;
  }
  const out: Piece[] = [];
  sentences.forEach((s, i) => {
    const kind = i === 0 ? "point" : "more";
    let at = s.start;
    for (const q of quotes) {
      if (q.start < s.start || q.end > s.end) continue;
      const before = text.slice(at, q.start).trim();
      if (before) out.push({ kind: at === s.start ? kind : "more", start: at, end: q.start });
      out.push({ kind: "quote", start: q.start, end: q.end });
      at = q.end;
    }
    const rest = text.slice(at, s.end).trim();
    if (rest) out.push({ kind: at === s.start ? kind : "more", start: at, end: s.end });
  });
  return out;
}

const isPicture = (p: Element) =>
  !p.textContent?.trim() && !!p.querySelector("img, video, picture");

/** A paragraph as bullets, with any quotation boxed between them. */
function bulleted(p: HTMLElement, name: Part, ref: string): HTMLElement[] {
  const found = pieces(p.textContent ?? "");
  if (!found.length) return [markPart(p, name, ref)];
  const frags = cut(p, found);
  const out: HTMLElement[] = [];
  let list: HTMLElement | null = null;
  found.forEach((piece, i) => {
    if (piece.kind === "quote") {
      // the words leading into a quotation go overleaf with it, never alone
      if (list && out[out.length - 1] === list) list.dataset.bpKeep = "";
      list = null;
      out.push(markPart(h("blockquote", { class: "bp-callout" }, frags[i]), name, ref));
      return;
    }
    if (!list) {
      list = h("ul", { class: "bp-bullets" });
      out.push(list);
    }
    list.append(markPart(h("li", { class: piece.kind === "point" ? "bp-point" : "bp-more" }, frags[i]), name, ref));
  });
  return out;
}

/** The about body as study notes. */
export function studyNotes(html: string, name: Part, ref: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  let n = 0;
  for (const block of blocks(html)) {
    const tag = block.tagName;
    if (tag === "H2") {
      n += 1;
      block.className = "bp-nh";
      block.dataset.n = String(n);
      block.append(svg(underline(RED, seed(`nh-${n}`))));
      out.push(markPart(block, name, ref));
    } else if (/^H[3-6]$/.test(tag)) {
      block.className = "bp-nsub";
      out.push(markPart(block, name, ref));
    } else if (tag === "P" && !isPicture(block)) {
      out.push(...bulleted(block, name, ref));
    } else if (tag === "UL" || tag === "OL") {
      block.classList.add("bp-bullets", "bp-bullets--list");
      out.push(markPart(block, name, ref));
    } else if (tag === "BLOCKQUOTE") {
      block.classList.add("bp-callout");
      out.push(markPart(block, name, ref));
    } else out.push(markPart(block, name, ref));
  }
  return out;
}
