/** A paragraph cut into sentences, for the study notes (studynotes.ts):
 * where each sentence starts and ends, and any quotation worth lifting out
 * into a box. Plain text in, offsets out; no DOM, so Node can test it. */

export interface Span {
  start: number;
  end: number;
}

/** Words a sentence can't end on: "e.g. this", "Dr. Who", "J. Smith". */
const NOT_AN_END = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|cf|approx|Mr|Mrs|Ms|Dr|St|Jr|Sr|No|[A-Z])\.$/;
/** A sentence ends at . ! ? or … (and any closing quote or bracket after it),
 * then space, then something that starts a sentence. */
const END = /[.!?…]+[”’"')\]]*(?=\s+[“‘"'(\[]?[A-Z0-9])/g;
/** A quotation worth a box: in curly double quotes, at least a few words. */
const QUOTE = /“[^”]{20,}”/g;

export type Piece = { kind: "point" | "more" | "quote"; start: number; end: number };

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

