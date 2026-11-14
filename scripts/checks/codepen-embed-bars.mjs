/** Does CodePen's embed still draw the bars the stage crops away?
 *
 * A played Pen is shown through its result alone because its frame is made
 * larger than the room it is shown in by the embed's own bars (the tabs
 * above, the toolbar below, a border round them): src/lib/pen-chrome.json,
 * used by src/lib/block-stage.ts. Those sizes are CodePen's. This loads one
 * real `/embed/<id>?default-tab=result` and measures where the result sits
 * in it, against that file. It is not part of `pnpm test`: it needs to
 * reach CodePen, which answers an automated browser only some of the time.
 *
 *   node scripts/checks/codepen-embed-bars.mjs [user/id]
 *       drives Chromium (PRISM_CHROMIUM, or Playwright's own) at the embed.
 *   node scripts/checks/codepen-embed-bars.mjs --probe
 *       prints a snippet that returns the measurement, for a browser this
 *       script cannot drive: run it in the console of a page at the embed's
 *       address, any viewport size.
 *   node scripts/checks/codepen-embed-bars.mjs --measured '{"top":51,...}'
 *       checks a measurement taken that way.
 *
 * Exits 0 when the bars match, 1 when they do not (and names the sizes to
 * put in pen-chrome.json), 2 when no measurement could be made. */
import { readFileSync } from "node:fs";
import { chromium as executable } from "../tests/lib/chromium.mjs";

const assumed = JSON.parse(
  readFileSync(new URL("../../src/lib/pen-chrome.json", import.meta.url), "utf8"),
);
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => args[args.indexOf(name) + 1];

/** In the embed's page: how far its result frame lies from each edge of
 * the page, the bars being what lies between. */
const PROBE = `(() => {
  const frame = document.querySelector("#result-iframe");
  if (!frame) return null;
  const r = frame.getBoundingClientRect();
  const to = (n) => Math.round(n * 10) / 10;
  return {
    top: to(r.top),
    right: to(document.documentElement.clientWidth - r.right),
    bottom: to(innerHeight - r.bottom),
    left: to(r.left),
  };
})()`;

function compare(seen) {
  const sides = ["top", "right", "bottom", "left"];
  const off = sides.filter((side) => Math.abs(seen[side] - assumed[side]) > 0.5);
  if (!off.length) {
    console.log(`CodePen's embed bars match src/lib/pen-chrome.json: ${JSON.stringify(seen)}`);
    return 0;
  }
  console.error(
    `CodePen's embed has changed. The Pen crop in src/lib/block-stage.ts assumes ${JSON.stringify(assumed)}; the embed now has ${JSON.stringify(seen)}.\n` +
      `Update ${off.map((side) => `"${side}" (${assumed[side]} -> ${seen[side]})`).join(", ")} in src/lib/pen-chrome.json, then run the stage tests (pnpm test:prism).`,
  );
  return 1;
}

if (flag("--probe")) {
  console.log(PROBE);
  process.exit(0);
}
if (flag("--measured")) {
  const seen = JSON.parse(value("--measured"));
  process.exit(compare(seen));
}

const pen = args.find((arg) => /^[\w-]+\/\w+$/.test(arg)) ?? "beejsbj/PwPJead";
const [user, id] = pen.split("/");
const { chromium } = await import("playwright-core");
const browser = await chromium.launch({ executablePath: executable() ?? undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`https://codepen.io/${user}/embed/${id}?default-tab=result`, {
    waitUntil: "load",
  });
  const found = await page
    .waitForSelector("#result-iframe", { timeout: 20000 })
    .then(() => true, () => false);
  const seen = found ? await page.evaluate(PROBE) : null;
  if (!seen) {
    console.error(
      `Could not measure: https://codepen.io/${pen.replace("/", "/embed/")} did not serve its embed to this browser (it is "${await page.title()}"). ` +
        `Take the measurement in a browser that gets it: print the snippet with --probe, run it at that address, and check the result with --measured.`,
    );
    process.exit(2);
  }
  process.exitCode = compare(seen);
} finally {
  await browser.close();
}
