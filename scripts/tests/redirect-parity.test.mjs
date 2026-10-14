import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const legacySource = readFileSync("src/lib/legacyRedirects.ts", "utf8");
const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
const astroConfig = readFileSync("astro.config.mjs", "utf8");
const compiledLegacyRedirects = ts.transpileModule(legacySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const appModule = { exports: {} };
vm.runInNewContext(compiledLegacyRedirects, {
  exports: appModule.exports,
  module: appModule,
});
const getLegacyRedirect = appModule.exports.getLegacyRedirect;

function vercelDestination(query) {
  for (const rule of vercelConfig.redirects) {
    if (rule.source !== "/" || !rule.has?.length) continue;
    const captures = {};
    const matches = rule.has.every((condition) => {
      if (condition.type !== "query" || !(condition.key in query)) return false;
      if (!condition.value) return true;
      const expression = new RegExp(`^(?:${condition.value})$`);
      const match = String(query[condition.key]).match(expression);
      if (!match) return false;
      Object.assign(captures, match.groups);
      return true;
    });
    if (matches) {
      return rule.destination.replace(
        /:([A-Za-z][A-Za-z0-9_]*)/g,
        (_, key) => captures[key] ?? _,
      );
    }
  }
  return undefined;
}

test("Vercel and the executed middleware policy agree on legacy query requests", () => {
  const requests = [
    { page: "about" },
    { page: "resume" },
    { page: "projects" },
    { page: "blog" },
    { page: "garden" },
    { page: "layout-detail" },
    { page: "e4p" },
    { page: "exercise-detail" },
    { page: "e4p-in-vue" },
    { page: "style-guide" },
    { page: "project", project: "garden" },
    { page: "project", project: "flashcards" },
    { page: "project", project: "conduit-market" },
    { page: "project", project: "api3-ecosystem" },
    { page: "project", project: "qrng" },
    { page: "project", project: "e4p" },
    { page: "project", project: "quantumon" },
    { page: "project", project: "roulette" },
    { page: "project", project: "pizza-nano" },
    { page: "project", project: "desci-bengaluru" },
    { page: "project", project: "missing-project" },
    { page: "project", project: "" },
    { page: "project" },
    { page: "missing-page" },
  ];

  for (const query of requests) {
    const url = new URL("https://burooj.dev/");
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    assert.equal(
      vercelDestination(query),
      getLegacyRedirect(url),
      `Redirect disagreement for ${new URLSearchParams(query)}`,
    );
  }
});

test("the home query reaches the served home without a Vercel redirect loop", () => {
  const url = new URL("https://burooj.dev/?page=home");
  assert.equal(getLegacyRedirect(url), "/");
  assert.equal(vercelDestination({ page: "home" }), undefined);
});

test("duplicated legacy path aliases remain declared for app and Vercel ingress", () => {
  const aliases = [
    ["/design-system", "/style-guide", "src/pages/design-system.astro"],
    ["/e4p", "/projects/e4p", "src/pages/e4p.astro"],
    ["/garden", "/projects/garden", "src/pages/garden.astro"],
  ];

  for (const [source, destination, appPath] of aliases) {
    assert.ok(
      vercelConfig.redirects.some(
        (rule) =>
          rule.source === source &&
          rule.destination === destination &&
          rule.permanent,
      ),
      `Missing permanent Vercel alias: ${source}`,
    );
    assert.match(
      readFileSync(appPath, "utf8"),
      new RegExp(`Astro\\.redirect\\("${destination}", 301\\)`),
    );
  }

  for (const [source, destination] of [
    ["/lab/e4p", "/projects/e4p"],
    ["/lab/garden", "/projects/garden"],
    ["/lab/flashcards", "/projects/flashcards"],
    ["/lab/style-guide", "/style-guide"],
  ]) {
    assert.ok(
      vercelConfig.redirects.some(
        (rule) =>
          rule.source === source &&
          rule.destination === destination &&
          rule.permanent,
      ),
      `Missing permanent Vercel alias: ${source}`,
    );
    assert.match(astroConfig, new RegExp(`"${source}": "${destination}"`));
  }
});
