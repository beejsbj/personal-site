import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Chromium for browser tests: PRISM_CHROMIUM, else the newest cached
 * Playwright headless shell, else null (the test skips, saying so). */
export function chromium() {
  if (process.env.PRISM_CHROMIUM) return process.env.PRISM_CHROMIUM;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return null;
  const found = readdirSync(cache)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map((name) =>
      join(
        cache,
        name,
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
      ),
    )
    .find((path) => existsSync(path));
  return found ?? null;
}
