/** The atlas grid: rows are the routes the content generates, columns the
 * five lenses, each cell a live prism face of that route in that lens. In
 * parts mode every face outlines the chosen part (`data-part`, optionally
 * one `data-ref`), scrolls it into view and says whether it is there. */
import { expectedParts, isGap, routesFor, type LensId } from "./parity";
import type { Part } from "./parts";
import type { SiteContent } from "./shells/types";

const grid = document.querySelector<HTMLElement>("[data-grid]")!;
const form = document.querySelector<HTMLFormElement>("[data-controls]")!;
const lenses: [LensId, string][] = JSON.parse(grid.dataset.lenses ?? "[]");
const HIGHLIGHT = "prism-atlas-highlight";

interface Cell {
  lens: LensId;
  kind: string;
  path: string;
  figure: HTMLElement;
  frame: HTMLIFrameElement;
  caption: HTMLElement;
}
let cells: Cell[] = [];
let content: SiteContent;

function value(name: string) {
  return (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
}

function build() {
  const scale = Number(value("scale")) || 0.3;
  const width = Number(value("width")) || 1280;
  const height = width > 600 ? 800 : 844;
  grid.replaceChildren();
  cells = [];
  for (const route of routesFor(content)) {
    const row = document.createElement("div");
    row.className = "atlas__row";
    const label = document.createElement("p");
    label.className = "atlas__label";
    label.textContent = route.path;
    row.append(label);
    for (const [lens, name] of lenses) {
      const figure = document.createElement("figure");
      figure.className = "atlas__cell";
      const box = document.createElement("div");
      box.className = "atlas__frame";
      box.style.width = `${Math.round(width * scale)}px`;
      box.style.height = `${Math.round(height * scale)}px`;
      const frame = document.createElement("iframe");
      frame.loading = "lazy";
      frame.title = `${route.path} in ${name}`;
      frame.width = String(width);
      frame.height = String(height);
      frame.style.transform = `scale(${scale})`;
      frame.src = `${route.path}?prism-face=${lens}`;
      box.append(frame);
      const caption = document.createElement("figcaption");
      caption.textContent = name;
      figure.append(box, caption);
      row.append(figure);
      const cell = { lens, kind: route.kind, path: route.path, figure, frame, caption };
      cells.push(cell);
      frame.addEventListener("load", () => {
        // shells paint after load; look again once they have
        setTimeout(() => highlight(cell), 1200);
      });
    }
    grid.append(row);
  }
}

function highlight(cell: Cell) {
  const part = value("part") as Part | "";
  const ref = value("ref").trim();
  const [, name] = lenses.find(([id]) => id === cell.lens) ?? [];
  const doc = cell.frame.contentDocument;
  delete cell.figure.dataset.state;
  cell.caption.textContent = name ?? cell.lens;
  if (!doc) return;
  doc.getElementById(HIGHLIGHT)?.remove();
  if (!part) return;
  const selector = `[data-part="${part}"]${ref ? `[data-ref="${CSS.escape(ref)}"]` : ""}`;
  const style = doc.createElement("style");
  style.id = HIGHLIGHT;
  style.textContent = `${selector} { outline: 4px solid #ff2bd6 !important; outline-offset: 2px !important; background-color: rgb(255 43 214 / 0.12) !important; }`;
  doc.head.append(style);
  // a lens with a shell shows only its shell; if the shell failed, the
  // face fell back to Daylight and that is what counts
  const scope = doc.documentElement.hasAttribute("data-lens-shell")
    ? doc.getElementById("lens-shell") ?? doc
    : doc;
  const found = [...scope.querySelectorAll(selector)].filter(
    (el) => (el as HTMLElement).getClientRects().length,
  );
  found[0]?.scrollIntoView({ block: "center" });
  const route = routesFor(content).find((r) => r.path === cell.path);
  const expected = route
    ? expectedParts(route, content).some(
        (e) => e.part === part && (!ref || e.ref === ref),
      )
    : false;
  const gap = isGap(cell.lens, cell.kind as never, part);
  const state = found.length
    ? "found"
    : gap
      ? "gap"
      : expected
        ? "missing"
        : "absent";
  cell.figure.dataset.state = state;
  cell.caption.textContent = `${name}: ${
    found.length
      ? `${found.length} found`
      : gap
        ? "left out on purpose"
        : expected
          ? "missing"
          : "not on this route"
  }`;
}

form.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (target.getAttribute("name") === "scale" || target.getAttribute("name") === "width") build();
  else cells.forEach(highlight);
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  cells.forEach(highlight);
});

fetch("/prism/content.json")
  .then((response) => response.json())
  .then((data: SiteContent) => {
    content = data;
    build();
  });
