// Turns a Substack post body into small, static, self-contained HTML.
//
// An allowlist, not a blocklist: the tree is rebuilt from known-good elements
// and attributes, so anything Substack adds later is dropped by default rather
// than leaking into the site. Images stay hotlinked to Substack's CDN.
//
// The output is written into markdown files, so it is also shaped to survive
// CommonMark: top-level blocks are separated by one blank line, and nothing
// else inside a block contains a blank line (which would end the HTML block and
// let markdown mangle the rest). See `toMarkdownSafe` below.
import { parseFragment } from "parse5";

const VOID = new Set(["br", "hr", "img"]);
const INLINE = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "i",
  "img",
  "kbd",
  "mark",
  "s",
  "samp",
  "small",
  "strike",
  "strong",
  "sub",
  "sup",
  "time",
]);
const KEEP = new Set([
  ...INLINE,
  "blockquote",
  "details",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);
// Never rendered, content included. Forms, widgets and anything executable.
const DROP = new Set([
  "audio",
  "button",
  "canvas",
  "dialog",
  "embed",
  "form",
  "head",
  "iframe",
  "input",
  "link",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
  "video",
]);
// Substack chrome that is not the author's writing: subscribe and share
// widgets, paywall, app-install nags, and its internal UI primitives.
const CHROME_CLASS =
  /(^|\s)(subscription-widget[\w-]*|subscribe-widget|button-wrapper|share-dialog|share-button|paywall[\w-]*|install-substack-app[\w-]*|pencraft|post-ufi|footnote-hr)(\s|$)/;
const CHROME_COMPONENT =
  /^(SubscribeWidgetToDOM|ButtonCreateButton|CaptionedButton|PaywallToDOM|SubscribeEmbed|ShareButton|InstallSubstackApp|PostFooter)/i;
const TRACKING_PARAM =
  /^(utm_[\w]+|r|triedRedirect|showWelcomeOnShare|fbclid)$/;
const TRACKING_SRC =
  /(^|[./])(email|click|links?|track(ing)?|pixel|beacon|open)\.[\w.-]+\/|\/(pixel|beacon|track(ing)?|open)(\.\w+)?(\/|\?|$)|[?&]open=/i;

const attr = (el, name) =>
  el.attrs?.find((a) => a.name === name)?.value ?? undefined;
const isEl = (n) => typeof n.tagName === "string";
const isText = (n) => n.nodeName === "#text";

function safeUrl(value, { allowMailto = true } = {}) {
  if (!value) return undefined;
  const v = value.trim();
  if (v.startsWith("#") || (v.startsWith("/") && !v.startsWith("//"))) return v;
  try {
    const url = new URL(v);
    if (url.protocol === "https:" || url.protocol === "http:") return v;
    if (allowMailto && url.protocol === "mailto:") return v;
  } catch {
    /* not a URL */
  }
  return undefined;
}

function cleanHref(value, rewriteHref) {
  let href = safeUrl(value);
  if (!href) return undefined;
  if (/^https?:/.test(href)) {
    // Only touch the URL when there is tracking to remove; otherwise keep the
    // author's link byte for byte.
    const url = new URL(href);
    const tracked = [...url.searchParams.keys()].filter((k) =>
      TRACKING_PARAM.test(k),
    );
    if (tracked.length) {
      tracked.forEach((k) => url.searchParams.delete(k));
      href = url.toString();
    }
  }
  return rewriteHref ? rewriteHref(href) : href;
}

function cleanSrcset(value) {
  if (!value) return undefined;
  const candidates = value.split(/,\s+(?=https?:)/).map((c) => c.trim());
  const ok = candidates.every((c) =>
    /^https?:\/\/\S+(\s+\d+(\.\d+)?[wx])?$/.test(c),
  );
  return ok ? candidates.join(", ") : undefined;
}

const el = (tag, attrs = {}, children = []) => ({ tag, attrs, children });
const text = (value) => ({ text: value });

// Known embeds can't run here, but most have a page worth linking to.
function embedLink(url, label) {
  const href = safeUrl(url, { allowMailto: false });
  if (!href) return [];
  return [el("p", {}, [el("a", { href }, [text(label)])])];
}

function iframeFallback(src) {
  const url = safeUrl(src, { allowMailto: false });
  if (!url) return [];
  const u = new URL(url, "https://example.invalid");
  const host = u.hostname.replace(/^www\./, "");
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id
      ? embedLink(`https://www.youtube.com/watch?v=${id}`, "Watch on YouTube")
      : [];
  }
  if (host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id ? embedLink(`https://vimeo.com/${id}`, "Watch on Vimeo") : [];
  }
  if (host === "codepen.io") {
    return embedLink(url.replace("/embed/", "/pen/"), "Open on CodePen");
  }
  return [];
}

function dataAttrs(node) {
  try {
    return JSON.parse(attr(node, "data-attrs") ?? "{}");
  } catch {
    return {};
  }
}

// Substack-flavoured components, identified by their markers rather than
// generic markup. Returns an array of nodes, or undefined to keep walking.
function component(node, ctx) {
  const name = attr(node, "data-component-name") ?? "";
  const cls = attr(node, "class") ?? "";
  if (CHROME_COMPONENT.test(name) || CHROME_CLASS.test(cls)) return [];
  if (/^Youtube2ToDOM$/i.test(name) || /(^|\s)youtube-wrap(\s|$)/.test(cls)) {
    const { videoId } = dataAttrs(node);
    return videoId
      ? embedLink(
          `https://www.youtube.com/watch?v=${videoId}`,
          "Watch on YouTube",
        )
      : [];
  }
  if (
    /^(DigestPostToDOM|EmbeddedPostToDOM)$/i.test(name) ||
    /(^|\s)(digest-post-embed|embedded-post-wrap)(\s|$)/.test(cls)
  ) {
    const data = dataAttrs(node);
    const href = cleanHref(data.canonical_url ?? data.url, ctx.rewriteHref);
    if (!href || !data.title) return [];
    return [
      el("aside", { class: "embed-card" }, [
        el("p", { class: "embed-card__title" }, [
          el("a", { href }, [text(data.title)]),
        ]),
        ...(data.caption ? [el("p", {}, [text(data.caption)])] : []),
      ]),
    ];
  }
  if (
    /(^|\s)(native-video-embed|native-audio-embed|poll-embed|tweet|twitter-embed)(\s|$)/.test(
      cls,
    )
  ) {
    return [];
  }
  return undefined;
}

function isTrackingImage(node) {
  const src = attr(node, "src") ?? "";
  const w = Number.parseInt(attr(node, "width") ?? "", 10);
  const h = Number.parseInt(attr(node, "height") ?? "", 10);
  if ((Number.isFinite(w) && w <= 2) || (Number.isFinite(h) && h <= 2))
    return true;
  return TRACKING_SRC.test(src);
}

function walk(node, ctx) {
  if (isText(node)) return [text(node.value)];
  if (!isEl(node)) return []; // comments, doctype
  const tag = node.tagName;

  if (tag === "iframe") return iframeFallback(attr(node, "src"));
  if (DROP.has(tag)) return [];

  const special = component(node, ctx);
  if (special) return special;

  const children = () => node.childNodes.flatMap((child) => walk(child, ctx));

  if (tag === "img") {
    const src = safeUrl(attr(node, "src"), { allowMailto: false });
    if (!src || isTrackingImage(node)) return [];
    ctx.stats.images += 1;
    const attrs = { src };
    const srcset = cleanSrcset(attr(node, "srcset"));
    if (srcset) {
      attrs.srcset = srcset;
      attrs.sizes = ctx.imageSizes;
    }
    attrs.alt = attr(node, "alt") ?? "";
    for (const name of ["width", "height", "title"]) {
      const value = attr(node, name);
      if (!value) continue;
      // Substack emits fractional sizes (height="238.095"); attributes want integers.
      if (name === "title") attrs.title = value;
      else if (/^\d+(\.\d+)?$/.test(value))
        attrs[name] = String(Math.round(Number(value)));
    }
    attrs.loading = "lazy";
    attrs.decoding = "async";
    return [el("img", attrs)];
  }
  if (tag === "picture") {
    // Only the <img> inside: its srcset already carries the CDN variants.
    return node.childNodes.flatMap((c) =>
      isEl(c) && c.tagName === "img" ? walk(c, ctx) : [],
    );
  }
  if (tag === "a") {
    const cls = attr(node, "class") ?? "";
    const href = cleanHref(attr(node, "href"), ctx.rewriteHref);
    // Substack wraps every image in a "view full size" link; the image is enough.
    if (/(^|\s)image-link(\s|$)/.test(cls) || !href) return children();
    return [el("a", { href }, children())];
  }
  if (tag === "pre") {
    ctx.stats.code += 1;
    return [
      el("pre", {}, [el("code", codeClass(node), [text(rawText(node))])]),
    ];
  }
  if (tag === "code") {
    const cls = attr(node, "class") ?? "";
    return [
      el(
        "code",
        /(^|\s)language-[\w-]+/.test(cls) ? codeClass(node) : {},
        children(),
      ),
    ];
  }
  if (tag === "td" || tag === "th") {
    const attrs = {};
    for (const name of ["colspan", "rowspan"]) {
      const value = attr(node, name);
      if (value && /^\d{1,2}$/.test(value)) attrs[name] = value;
    }
    return [el(tag, attrs, children())];
  }
  if (tag === "ol") {
    const start = attr(node, "start");
    return [
      el("ol", start && /^\d{1,4}$/.test(start) ? { start } : {}, children()),
    ];
  }
  if (tag === "time") return children();
  if (KEEP.has(tag)) return [el(tag, {}, children())];
  return children(); // div, span, section, center, u, font ...: unwrap
}

function codeClass(node) {
  const code =
    node.childNodes?.find((c) => isEl(c) && c.tagName === "code") ?? node;
  const match = (attr(code, "class") ?? "").match(/(^|\s)(language-[\w-]+)/);
  return match ? { class: match[2] } : {};
}

function rawText(node) {
  if (isText(node)) return node.value;
  return (node.childNodes ?? []).map(rawText).join("");
}

// --- tidy -------------------------------------------------------------------

const BLOCK = new Set([
  "aside",
  "blockquote",
  "details",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

function textOf(node) {
  if (node.text !== undefined) return node.text;
  return (node.children ?? []).map(textOf).join("");
}

const hasMedia = (node) =>
  node.tag === "img" || (node.children ?? []).some(hasMedia);

function isEmpty(node) {
  if (node.text !== undefined) return node.text.trim() === "";
  if (VOID.has(node.tag)) return node.tag === "br";
  if (node.tag === "hr" || node.tag === "td" || node.tag === "th") return false;
  if (hasMedia(node)) return false;
  return node.children.every(isEmpty);
}

// Collapse whitespace outside <pre>, trim block edges, drop empty wrappers.
function tidy(nodes, inPre = false) {
  const out = [];
  for (const node of nodes) {
    if (node.text !== undefined) {
      out.push(inPre ? node : text(node.text.replace(/\s+/g, " ")));
      continue;
    }
    const pre = inPre || node.tag === "pre";
    const children = VOID.has(node.tag) ? [] : tidy(node.children, pre);
    const next = { ...node, children };
    if (!pre) trimEdges(next);
    // Empty paragraphs and headings are Substack spacing, not content. Cells and
    // list items stay: dropping them would shift a table or numbering.
    if (!["td", "th", "li", "tr"].includes(node.tag) && isEmpty(next)) continue;
    out.push(next);
  }
  return out;
}

function trimEdges(node) {
  const kids = node.children;
  const isBr = (n) => n.tag === "br";
  while (
    kids.length &&
    (isBr(kids[0]) ||
      (kids[0].text !== undefined && kids[0].text.trim() === ""))
  )
    kids.shift();
  while (
    kids.length &&
    (isBr(kids.at(-1)) ||
      (kids.at(-1).text !== undefined && kids.at(-1).text.trim() === ""))
  )
    kids.pop();
  if (kids[0]?.text !== undefined && BLOCK.has(node.tag))
    kids[0].text = kids[0].text.trimStart();
  if (kids.at(-1)?.text !== undefined && BLOCK.has(node.tag))
    kids.at(-1).text = kids.at(-1).text.trimEnd();
}

// Loose text or inline runs between blocks get a paragraph, so markdown never
// sees them as its own syntax.
function wrapLoose(nodes) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length && !run.every(isEmpty))
      out.push(...tidy([el("p", {}, run)]));
    run = [];
  };
  for (const node of nodes) {
    if (node.text !== undefined || INLINE.has(node.tag)) {
      if (node.tag === "img") {
        flush();
        out.push(el("figure", {}, [node]));
      } else run.push(node);
    } else {
      flush();
      out.push(node);
    }
  }
  flush();
  return out;
}

function shiftHeadings(nodes) {
  const levels = [];
  const collect = (n) => {
    if (/^h[1-6]$/.test(n.tag ?? "")) levels.push(Number(n.tag[1]));
    n.children?.forEach(collect);
  };
  nodes.forEach(collect);
  // The page owns the h1; the post's own headings start at h2.
  const shift = levels.length ? Math.max(0, 2 - Math.min(...levels)) : 0;
  if (!shift) return;
  const apply = (n) => {
    if (/^h[1-6]$/.test(n.tag ?? ""))
      n.tag = `h${Math.min(6, Number(n.tag[1]) + shift)}`;
    n.children?.forEach(apply);
  };
  nodes.forEach(apply);
}

// --- serialise --------------------------------------------------------------

const escText = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function serialise(node) {
  if (node.text !== undefined) return escText(node.text);
  const attrs = Object.entries(node.attrs ?? {})
    .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
    .join("");
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(serialise).join("")}</${node.tag}>`;
}

// A blank line inside a nested <pre> would end the surrounding HTML block, so
// encode it. Top-level <pre> is its own HTML block and may keep blank lines.
function markdownSafe(html, topLevelPre) {
  if (topLevelPre) return html;
  return html.replace(/<pre>[\s\S]*?<\/pre>/g, (pre) =>
    pre.replace(/\n(?=[ \t]*\n)/g, "\n&#10;"),
  );
}

/**
 * @param {string} html Substack `body_html` (or RSS `content:encoded`).
 * @param {{ rewriteHref?: (href: string) => string, imageSizes?: string }} [options]
 * @returns {{ html: string, text: string, stats: { images: number, code: number } }}
 */
export function sanitizeSubstackHtml(html, options = {}) {
  const ctx = {
    rewriteHref: options.rewriteHref,
    imageSizes: options.imageSizes ?? "(min-width: 800px) 720px, 100vw",
    stats: { images: 0, code: 0 },
  };
  const fragment = parseFragment(html ?? "");
  const nodes = wrapLoose(
    tidy(fragment.childNodes.flatMap((n) => walk(n, ctx))),
  );
  shiftHeadings(nodes);
  const blocks = nodes.map((node) =>
    markdownSafe(serialise(node), node.tag === "pre"),
  );
  return {
    html: blocks.join("\n\n"),
    text: nodes.map(textOf).join(" ").replace(/\s+/g, " ").trim(),
    stats: ctx.stats,
  };
}
