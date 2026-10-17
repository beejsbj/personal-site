/** Entrances play on a real first arrival only (issue #28). A page that is
 * already there (a prism face, or a lens stepped into from the prism) is
 * marked `data-prism-settled` and lands at rest. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("a face is settled, and the mark never outlives its page", () => {
  const boot = read("prism/LensBoot.astro");
  const face = boot.slice(
    boot.indexOf('params.get("prism-face")'),
    boot.indexOf("return;"),
  );
  assert.match(face, /setAttribute\("data-prism-settled", ""\)/);
  // carried across a navigation it would silence the next page's arrival
  const carried = boot.slice(
    boot.indexOf("const lensAttributes"),
    boot.indexOf("];", boot.indexOf("const lensAttributes")),
  );
  assert.doesNotMatch(carried, /data-prism-settled/);
});

test("stepping into a new lens from the prism arrives settled", () => {
  const stage = read("prism/stage.ts");
  const crossing = stage.slice(stage.indexOf("const stepIn"));
  assert.ok(
    crossing.indexOf('setAttribute("data-prism-settled", "")') <
      crossing.indexOf("await setLens("),
    "the page is marked settled before the new lens mounts",
  );
  const runtime = read("prism/shell-runtime.ts");
  assert.match(runtime, /settled,/, "shells are told");
  assert.match(runtime, /if \(settled\) settle\(root\)/, "and land at rest");
});

/** Each of Daylight's arrival animations, and the components that run them. */
const ARRIVALS = {
  "design/unique/BallNav.astro": ["sunrise"],
  "design/compositions/WelcomeHero.astro": ["wave", "land", "rise"],
  "design/unique/Portrait.astro": ["portrait-in"],
  "components/Homepage.astro": ["below-in"],
};

test("Daylight's arrival plays only when the page is not already there", () => {
  for (const [file, names] of Object.entries(ARRIVALS)) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const name of names) {
      const rules = [
        ...css.matchAll(
          new RegExp(`([^{}]*)\\{[^{}]*animation:\\s*${name}\\b`, "g"),
        ),
      ];
      assert.ok(rules.length, `${file} no longer runs ${name}`);
      for (const [, selector] of rules)
        for (const part of selector.split(","))
          assert.match(
            part,
            /:global\(:root:not\(\[data-prism-settled\]\)\)/,
            `${file}: ${name} on "${part.trim()}" also plays on a settled page`,
          );
    }
  }
});
