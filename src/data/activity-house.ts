import { getCollection, type CollectionEntry } from "astro:content";
import catalogDocument from "./house.catalog.json";
import {
  buildHouseModel,
  validateHouseCatalog,
} from "../lib/activity-house-model.mjs";
import { getPublicActivity } from "../lib/public-activity";

const idOf = (item: unknown) =>
  item &&
  typeof item === "object" &&
  typeof (item as { id?: unknown }).id === "string"
    ? (item as { id: string }).id
    : undefined;
const activityIds = (items: unknown[]) =>
  new Set(items.map(idOf).filter((id): id is string => Boolean(id)));

function visibleIdsFromModel(model: {
  rooms: Array<{ events: unknown[]; occupants: unknown[] }>;
  unassignedEvents: unknown[];
  unassignedSignals: unknown[];
}) {
  return new Set(
    [
      ...model.rooms.flatMap((room) => [...room.events, ...room.occupants]),
      ...model.unassignedEvents,
      ...model.unassignedSignals,
    ]
      .map(idOf)
      .filter((id): id is string => Boolean(id)),
  );
}

function fullProjects(projects: CollectionEntry<"projects">[]) {
  return projects.map((project) => ({
    id: project.slug,
    title: project.data.title,
    summary: project.data.summary,
    href: `/projects/${project.slug}`,
    hidden: project.data.hidden,
    archived: project.data.status === "archive",
  }));
}

/**
 * Server-only comparison. It returns IDs that a hidden catalog/project suppresses
 * without serializing the hidden reference that caused the suppression.
 */
export function getHouseExcludedActivityIdsFromInput(
  catalog: unknown,
  projects: CollectionEntry<"projects">[],
  events: unknown[] = [],
  signals: unknown[] = [],
) {
  const model = buildHouseModel({
    catalog,
    projects: fullProjects(projects),
    events,
    signals,
  });
  const visible = visibleIdsFromModel(model);
  return [...activityIds([...events, ...signals])]
    .filter((id) => !visible.has(id))
    .sort();
}

/** Returns only public labels/copy safe to serialize into the house client. */
export async function getHouseInput() {
  const [projects, events] = await Promise.all([
    getCollection("projects"),
    getPublicActivity(),
  ]);
  const catalog = validateHouseCatalog(catalogDocument);
  const excluded = getHouseExcludedActivityIdsFromInput(
    catalog,
    projects,
    events,
  );
  const excludedIds = new Set(excluded);
  return {
    catalog: {
      ...catalog,
      rooms: catalog.rooms.filter((room) => !room.hidden),
      residents: catalog.residents.filter((resident) =>
        catalog.rooms.some(
          (room) => room.id === resident.roomId && !room.hidden,
        ),
      ),
    },
    projects: fullProjects(projects).filter((project) => !project.hidden),
    events: events.filter((event) => !excludedIds.has(event.id)),
  };
}

/** Load full server-only metadata to suppress hidden dynamic activity IDs. */
export async function getHouseExcludedActivityIds(
  events: unknown[] = [],
  signals: unknown[] = [],
) {
  const projects = await getCollection("projects");
  return getHouseExcludedActivityIdsFromInput(
    validateHouseCatalog(catalogDocument),
    projects,
    events,
    signals,
  );
}
