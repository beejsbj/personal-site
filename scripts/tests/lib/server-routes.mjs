import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// A server route resolves only when the final Vercel artifact contains its
// routing rule, function config, and real handler. Runtime tests exercise it.
export function isServerRoute(pathname) {
  const output = ".vercel/output";
  const config = JSON.parse(readFileSync(join(output, "config.json"), "utf8"));
  return config.routes.some((route) => {
    if (!route.dest || route.dest.startsWith("/") || !route.src) return false;
    if (!new RegExp(route.src).test(pathname)) return false;
    const directory = join(output, "functions", `${route.dest}.func`);
    const file = join(directory, ".vc-config.json");
    if (!existsSync(file)) return false;
    const { handler } = JSON.parse(readFileSync(file, "utf8"));
    return Boolean(handler && existsSync(join(directory, handler)));
  });
}
