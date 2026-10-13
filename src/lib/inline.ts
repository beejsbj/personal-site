/** Inline markdown for short copy fields: **strong**, _em_ or *em*, `code`
 * and [text](href). One parser for Daylight (build time) and every lens
 * (in the browser), so a sentence reads the same everywhere. No blocks: a
 * field that needs paragraphs or lists belongs in a markdown body. */

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineToken[] }
  | { type: "em"; children: InlineToken[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: InlineToken[] };

const PATTERN =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g;

export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of source.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) tokens.push({ type: "text", text: source.slice(last, at) });
    const [, strong, label, href, code, star, under] = match;
    if (strong !== undefined)
      tokens.push({ type: "strong", children: parseInline(strong) });
    else if (label !== undefined)
      tokens.push({ type: "link", href, children: parseInline(label) });
    else if (code !== undefined) tokens.push({ type: "code", text: code });
    else tokens.push({ type: "em", children: parseInline(star ?? under) });
    last = at + match[0].length;
  }
  if (last < source.length)
    tokens.push({ type: "text", text: source.slice(last) });
  return tokens;
}

/** The words alone, for attributes, comparisons and labels. */
export function plainInline(source: string): string {
  const walk = (tokens: InlineToken[]): string =>
    tokens
      .map((token) =>
        token.type === "text" || token.type === "code"
          ? token.text
          : walk(token.children),
      )
      .join("");
  return walk(parseInline(source));
}

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Plain HTML, as markdown itself would render it (for prose contexts). */
export function inlineHtml(source: string): string {
  const walk = (tokens: InlineToken[]): string =>
    tokens
      .map((token) => {
        switch (token.type) {
          case "text":
            return escape(token.text);
          case "code":
            return `<code>${escape(token.text)}</code>`;
          case "strong":
            return `<strong>${walk(token.children)}</strong>`;
          case "em":
            return `<em>${walk(token.children)}</em>`;
          case "link":
            return `<a href="${escape(token.href)}">${walk(token.children)}</a>`;
        }
      })
      .join("");
  return walk(parseInline(source));
}
