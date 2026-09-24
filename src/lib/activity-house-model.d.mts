export type HouseRoomKind = "project" | "place";
export type HouseFurnishing =
  "desk" | "bench" | "shelves" | "table" | "sofa" | "plants";
export interface PublicActor {
  id: string;
  name: string;
  role: string;
}
export interface HouseRoom {
  id: string;
  title: string;
  summary: string;
  kind: HouseRoomKind;
  furnishing: HouseFurnishing;
  href?: string;
  aliases?: string[];
  pinned?: boolean;
  hidden?: boolean;
  order?: number;
}
export interface HouseResident {
  id: string;
  name: string;
  role: string;
  roomId: string;
}
export interface HouseCatalog {
  version: 1;
  rooms: HouseRoom[];
  residents: HouseResident[];
}
export interface HouseEvent {
  id?: string;
  title: string;
  summary: string;
  href: string;
  date: string;
  occurredAt?: string;
  relatedProject?: string;
  actor?: PublicActor;
}
export interface HouseModelRoom extends Required<Omit<HouseRoom, "href">> {
  href: string;
  origin: "catalog" | "project" | "activity";
  events: HouseEvent[];
  occupants: Array<{ actor?: PublicActor; [key: string]: unknown }>;
  active: boolean;
  lastActivityAt?: string;
}
export function validateHouseCatalog(value: unknown): {
  version: 1;
  rooms: Array<Required<Omit<HouseRoom, "href">> & Pick<HouseRoom, "href">>;
  residents: HouseResident[];
};
export function buildHouseModel(input: {
  catalog: unknown;
  projects?: unknown[];
  events?: unknown[];
  signals?: unknown[];
  now?: number;
}): {
  rooms: HouseModelRoom[];
  unassignedEvents: unknown[];
  unassignedSignals: unknown[];
  residents: HouseResident[];
};
