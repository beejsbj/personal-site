import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ActivityEngineError } from "./errors.mjs";
import { ENGINE_VERSION } from "./constants.mjs";

const LOCK_FILE = "activity-store.lock";

export function emptyStore() {
  return { version: ENGINE_VERSION, records: [] };
}

export async function readStore(storeDir) {
  const file = join(storeDir, "activity-store.json");
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (parsed?.version !== ENGINE_VERSION || !Array.isArray(parsed.records)) {
      throw new ActivityEngineError(
        "Activity store has an unsupported shape.",
        "STORE_SHAPE_ERROR",
      );
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function writeAtomic(file, value, mode = 0o600) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode,
  });
  await rename(temporary, file);
}

/**
 * Serialises mutating commands. A stale lock is intentionally an operator
 * handoff, not a lock we guess is safe to break: remove it only after checking
 * the prior command has stopped.
 */
export async function withStoreLock(storeDir, operation) {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
  const lockPath = join(storeDir, LOCK_FILE);
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new ActivityEngineError(
        `Activity store is locked: ${lockPath}. Check the prior command before removing the lock.`,
        "STORE_LOCKED",
      );
    }
    throw error;
  }
  try {
    return await operation();
  } finally {
    await handle.close();
    await rm(lockPath, { force: true });
  }
}

export async function mutateStore(storeDir, mutator) {
  return withStoreLock(storeDir, async () => {
    const store = await readStore(storeDir);
    const result = await mutator(store);
    await writeAtomic(join(storeDir, "activity-store.json"), store);
    return result;
  });
}

export async function writePublicExport(outFile, document) {
  await writeAtomic(outFile, document, 0o644);
}
