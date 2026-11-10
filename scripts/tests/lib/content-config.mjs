import { registerHooks } from "node:module";

/** The real src/content.config.ts, loaded outside Astro, so a test can hand
 * a fixture to the very schema the build validates content with.
 * `astro:content` only exists inside Astro; here it resolves to a stub. */
const stub = new URL("./astro-content-stub.mjs", import.meta.url).href;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "astro:content"
      ? { url: stub, shortCircuit: true }
      : next(specifier, context),
});

export const { collections } = await import("../../../src/content.config.ts");

/** What the build would say about `data` in `collection`: `[]` when it
 * validates, otherwise one "field: message" line per problem. */
export function problems(collection, data) {
  const result = collections[collection].schema.safeParse(data);
  return result.success
    ? []
    : result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
}

/** `data` as the build would hand it to the site. Throws when it is invalid. */
export const parse = (collection, data) =>
  collections[collection].schema.parse(data);
