import { createHash, randomUUID } from "node:crypto";
import { readFile, open, rename, unlink } from "node:fs/promises";
import { validateHouseCatalog } from "./activity-house-model.mjs";

const revisionOf = (text) => createHash("sha256").update(text).digest("hex");

export async function readHouseCatalog(file) {
  const text = await readFile(file, "utf8");
  return {
    catalog: validateHouseCatalog(JSON.parse(text)),
    revision: revisionOf(text),
  };
}

/** Explicit local saves, optimistic revision checks, and atomic replacement. */
export async function saveHouseCatalog(file, revision, value) {
  const catalog = validateHouseCatalog(value);
  const lockPath = `${file}.lock`;
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    throw Object.assign(new Error("Another save is in progress. Try again."), {
      code: "CONFLICT",
    });
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const current = await readHouseCatalog(file);
    if (typeof revision !== "string" || current.revision !== revision) {
      throw Object.assign(
        new Error(
          "The roster changed since you opened it. Reload before saving.",
        ),
        { code: "CONFLICT" },
      );
    }
    const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
    const output = await open(temporary, "wx", 0o644);
    try {
      await output.writeFile(serialized, "utf8");
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(temporary, file);
    return { catalog, revision: revisionOf(serialized) };
  } finally {
    await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(lockPath);
  }
}

export function isLocalEditorRequest(request, development) {
  if (!development) return false;
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
  if (request.method === "GET") return true;
  return (
    request.method === "PUT" &&
    request.headers.get("Origin") === url.origin &&
    request.headers.get("Content-Type")?.split(";")[0].trim() ===
      "application/json"
  );
}
