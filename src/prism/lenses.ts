/** The prism's faces, in travel order. One portfolio, five refractions.
 * A lens only changes how the Normal Portfolio looks; content never forks. */
export interface Lens {
  id: string;
  /** Internal handle, shown softly in the prism, never as a theme picker. */
  name: string;
  /** Where this refraction comes from. */
  source: string;
  /** Signature colour: the band this face contributes to the spectrum. */
  signal: string;
}

export const LENSES: readonly Lens[] = [
  {
    id: "daylight",
    name: "Daylight",
    source: "the warm welcome",
    signal: "#e5b483",
  },
  {
    id: "calling-card",
    name: "Calling Card",
    source: "Roll to Win, the lottery",
    signal: "#e5191c",
  },
  {
    id: "cut-paper",
    name: "Cut Paper",
    source: "EmotiTone",
    signal: "#e0a93a",
  },
  {
    id: "back-page",
    name: "Back Page",
    source: "Dotfight",
    signal: "#3a5fe0",
  },
  {
    id: "hion",
    name: "Hion",
    source: "Yumi and the Nightmare Painter, and Spin to Win",
    signal: "#ff2bd6",
  },
];

export const DEFAULT_LENS = LENSES[0].id;
export const isLens = (id: unknown): id is string =>
  typeof id === "string" && LENSES.some((lens) => lens.id === id);
