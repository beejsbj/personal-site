/** The portrait as a Phantom Thief cut-out: posterised to black, blood red
 * and white by an SVG filter, clipped along a hand-traced jagged silhouette,
 * and pasted down with a thick white edge and a hard black shadow. */
import { svg } from "./dom";

// Traced over /images/burooj4.jpg (1260 × 2240).
const SILHOUETTE =
  "M170 2240 L96 2080 L128 1960 L30 1840 L60 1720 L0 1620 L0 1470 L90 1432 L200 1398 L262 1372 L300 1330 L258 1252 L284 1182 L236 1160 L274 1090 L258 990 L294 880 L338 800 L420 735 L470 718 L540 664 L612 638 L662 622 L702 654 L782 688 L862 734 L932 800 L986 880 L1014 980 L1000 1062 L966 1122 L962 1230 L906 1310 L884 1398 L962 1450 L1082 1510 L1192 1580 L1260 1640 L1224 1760 L1260 1850 L1170 1990 L1210 2090 L1120 2240 L1010 2180 L880 2236 L720 2168 L560 2230 L420 2174 L290 2232 Z";

// Three inks. Luminance below 1/3 prints black, below ~0.6 red, the rest paper.
const table = (black: number, red: number, white: number) =>
  [
    ...Array(10).fill(black),
    ...Array(8).fill(red),
    ...Array(12).fill(white),
  ].join(" ");

let count = 0;

export function portrait(alt: string, variant: "full" | "bust" = "full") {
  const id = `cc-portrait-${++count}`;
  const view = variant === "bust" ? "150 560 1110 1150" : "-60 560 1380 1680";
  const el = svg(
    `<title>${alt}</title>
    <defs>
      <clipPath id="${id}-clip"><path d="${SILHOUETTE}"/></clipPath>
      <filter id="${id}-ink" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>
        <feGaussianBlur stdDeviation="1.6"/>
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="${table(0.04, 0.898, 1)}"/>
          <feFuncG type="discrete" tableValues="${table(0.04, 0.098, 1)}"/>
          <feFuncB type="discrete" tableValues="${table(0.04, 0.11, 1)}"/>
        </feComponentTransfer>
      </filter>
      <pattern id="${id}-dots" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="9" cy="9" r="4.2" fill="#0a0a0a"/>
      </pattern>
    </defs>
    <path class="cc-portrait__shadow" d="${SILHOUETTE}" transform="translate(-46 26)"/>
    <path class="cc-portrait__edge" d="${SILHOUETTE}"/>
    <g clip-path="url(#${id}-clip)">
      <image href="/images/burooj4.jpg" width="1260" height="2240" filter="url(#${id}-ink)" preserveAspectRatio="none"/>
      <rect class="cc-portrait__dots" x="0" y="560" width="1260" height="420" fill="url(#${id}-dots)"/>
    </g>`,
    {
      viewBox: view,
      class: `cc-portrait cc-portrait--${variant}`,
      preserveAspectRatio: "xMidYMin meet",
      role: "img",
      "aria-hidden": null,
    },
  );
  el.removeAttribute("aria-hidden");
  el.setAttribute("aria-label", alt);
  return el;
}
