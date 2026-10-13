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
import { pieces, type Span } from "./sentences";

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
