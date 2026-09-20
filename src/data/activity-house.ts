/**
 * A deliberately static, public-safe house plan. These are metaphors for the
 * site, not an inventory of machines, accounts, people, or live activity.
 */
export type HouseRoom = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  furnishing: "desk" | "bench" | "shelves" | "table" | "sofa" | "plants";
  grid: { column: string; row: string };
  href?: string;
  linkLabel?: string;
};

export type HouseResident = {
  id: string;
  name: string;
  role: string;
  description: string;
};

export type HouseWorker = {
  id: string;
  name: string;
  verb: string;
  roomId: string;
};

export const houseRooms: HouseRoom[] = [
  {
    id: "dispatch",
    name: "Cockpit dispatch hall",
    eyebrow: "The round table",
    description:
      "A round table for loose notes, a next good question, and the pleasure of putting a small plan in order.",
    furnishing: "table",
    grid: { column: "4 / span 4", row: "1 / span 2" },
  },
  {
    id: "mac",
    name: "Mac wing",
    eyebrow: "Writing desk",
    description:
      "The familiar lamp-and-notebook desk, where a half-formed thought can become a thing with edges.",
    furnishing: "desk",
    grid: { column: "1 / span 3", row: "1 / span 3" },
  },
  {
    id: "s23",
    name: "S23+ balcony",
    eyebrow: "Pocket doorway",
    description:
      "A small outward-facing perch for saving a link, catching a thought, and coming back with one useful thing.",
    furnishing: "plants",
    grid: { column: "8 / span 3", row: "1 / span 2" },
  },
  {
    id: "undertext",
    name: "Undertext digestion room",
    eyebrow: "Slow reading",
    description:
      "A low-lit room for fragments, drafts, and letting a text say more than it first seemed to.",
    furnishing: "shelves",
    grid: { column: "4 / span 3", row: "3 / span 3" },
  },
  {
    id: "design-lab",
    name: "Design Lab atelier",
    eyebrow: "Making table",
    description:
      "A bright table for swatches, specimens, and the visual decisions that want to be seen together.",
    furnishing: "bench",
    grid: { column: "7 / span 4", row: "3 / span 3" },
  },
  {
    id: "bjslab",
    name: "bjslab machine room",
    eyebrow: "Warm machinery",
    description:
      "A drawn machine room with warm little dials. It is a picture of care, not a live dashboard.",
    furnishing: "bench",
    grid: { column: "1 / span 3", row: "4 / span 3" },
  },
  {
    id: "reddit",
    name: "Reddit reading nook",
    eyebrow: "A low chair",
    description:
      "A tucked-away chair for following a thread, noticing one odd detail, and taking the useful part back upstairs.",
    furnishing: "sofa",
    grid: { column: "4 / span 3", row: "6 / span 2" },
  },
  {
    id: "projects",
    name: "Project gallery",
    eyebrow: "Public rooms",
    description:
      "A little gallery of public pieces, with their stories hung at an easy reading height.",
    furnishing: "shelves",
    grid: { column: "7 / span 4", row: "6 / span 2" },
    href: "/projects",
    linkLabel: "Visit public projects",
  },
];

// Hermes is a permanent illustrated house resident, not a runtime identity.
export const houseResidents: HouseResident[] = [
  {
    id: "hermes-steward",
    name: "Hermes",
    role: "House steward",
    description: "Keeps the doors labelled and the pathways clear.",
  },
  {
    id: "hermes-librarian",
    name: "Hermes",
    role: "Shelf keeper",
    description:
      "Returns a useful thread to its room before the next one arrives.",
  },
];

// Visiting figures only appear in the explicit fictional demo or from a future,
// separately verified presence source. Their names are labels, never proof of a
// running process or a real person at work.
export const houseWorkers: HouseWorker[] = [
  { id: "t3", name: "T3", verb: "tinkering", roomId: "bjslab" },
  { id: "codex", name: "Codex", verb: "building", roomId: "design-lab" },
  { id: "claude", name: "Claude", verb: "scouting", roomId: "undertext" },
  { id: "astra", name: "Astra", verb: "mapping", roomId: "dispatch" },
];

export const quietHouseMessage = "The house is waiting for a signal.";
