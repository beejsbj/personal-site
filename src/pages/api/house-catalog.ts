import type { APIRoute } from "astro";
import { fileURLToPath } from "node:url";
import {
  readHouseCatalog,
  saveHouseCatalog,
  isLocalEditorRequest,
} from "../../lib/house-catalog-store.mjs";
import { getHouseInput } from "../../data/activity-house";
import { buildHouseModel } from "../../lib/activity-house-model.mjs";

export const prerender = false;
const file = fileURLToPath(
  new URL("../../data/house.catalog.json", import.meta.url),
);
const respond = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });

export const GET: APIRoute = async ({ request }) => {
  if (!isLocalEditorRequest(request, import.meta.env.DEV))
    return new Response("Not found", { status: 404 });
  try {
    const saved = await readHouseCatalog(file);
    const input = await getHouseInput();
    const model = buildHouseModel({ ...input, catalog: saved.catalog });
    const suggestedRooms = model.rooms
      .filter(
        (room) => !saved.catalog.rooms.some((entry) => entry.id === room.id),
      )
      .map((room) => ({
        id: room.id,
        title: room.title,
        summary: room.summary,
        kind: room.kind,
        furnishing: room.furnishing,
        href: room.href,
        aliases: room.aliases,
        pinned: room.pinned,
        hidden: false,
        order: room.order,
      }));
    return respond({ ...saved, suggestedRooms });
  } catch {
    return respond(
      {
        error:
          "The roster could not be read. Check its JSON before reopening the editor.",
      },
      400,
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isLocalEditorRequest(request, import.meta.env.DEV))
    return new Response("Not found", { status: 404 });
  try {
    // This development-only endpoint cannot write arbitrary files or accept an unbounded body.
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: "A roster is required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65_536) {
          await reader.cancel();
          return respond({ error: "The roster is too large." }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const { catalog, revision } = JSON.parse(new TextDecoder().decode(bytes));
    return respond(await saveHouseCatalog(file, revision, catalog));
  } catch (error) {
    if ((error as { code?: string }).code === "CONFLICT") {
      return respond(
        {
          error:
            "The roster changed or another save is in progress. Reload it before saving.",
        },
        409,
      );
    }
    return respond(
      {
        error:
          "The roster is invalid or could not be saved. Check room IDs, links, and resident rooms.",
      },
      400,
    );
  }
};
