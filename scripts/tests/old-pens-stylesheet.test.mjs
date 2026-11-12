import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Old CodePen Pens @import https://burooj.dev/styles/default/site.css, which
// an earlier version of this site served (issue #101). It is kept as one
// static file at that address, and nothing on this site uses it.

const KEPT = "public/styles/default/site.css";
const BUILT = "dist/client/styles/default/site.css";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("the stylesheet old Pens import is built at the address they ask for", () => {
  assert.equal(
    readFileSync(BUILT, "utf8"),
    readFileSync(KEPT, "utf8"),
    `${BUILT} is not ${KEPT}`,
  );
});

test("it says why it is kept, and is one file: nothing it imports is on this site", () => {
  const css = readFileSync(KEPT, "utf8");
  assert.match(css, /^\/\*[^\n]*old CodePen Pens[^\n]*\*\/\n/);
  const imports = [
    ...css.matchAll(/@import\s+(?:url\(\s*["']?|["'])([^"')\s]+)/g),
  ].map(([, target]) => target);
  assert.ok(css.length > 10_000, "the stylesheet is all there");
  for (const target of imports)
    assert.match(target, /^https:\/\//, `a relative import: ${target}`);
});

test("no page of this site uses it", () => {
  for (const path of walk("dist/client").filter((path) =>
    /\.(html|css)$/.test(path),
  )) {
    if (path === BUILT) continue;
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /styles\/default\/site\.css/,
      `${path} refers to the kept stylesheet`,
    );
  }
});
