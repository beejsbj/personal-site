/** Browser parity: every lens shows every part of every route the content
 * generates, and every fixture in the fuzz harness, with no console errors
 * and exactly one visible <h1>.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Serves the built Vercel handler with deterministic public writing fixtures
 * (or tests BASE=http://127.0.0.1:4407 when given).
 * Chromium: PRISM_CHROMIUM, else the newest cached Playwright headless
 * shell; the test skips, saying so, when neither exists. Only these:
 * PRISM_LENSES=hion,cut-paper  PRISM_ONLY=routes|fixtures. */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  expectedParts,
  isGap,
  normalize,
  routesFor,
} from "../../src/prism/parity.ts";

const LENSES = (
  process.env.PRISM_LENSES ?? "daylight,calling-card,cut-paper,back-page,hion"
).split(",");
const SHELLS = LENSES.filter((lens) => lens !== "daylight");
const ONLY = process.env.PRISM_ONLY ?? "";

function chromium() {
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

/** Everything a page shows: its parts (inside the active lens's own root),
 * its visible h1 count. Back Page turns its pages and keeps looking. */
async function survey(page, lens) {
  const collect = () =>
    page.evaluate((lens) => {
      const root =
        lens === "daylight"
          ? document.querySelector(".site-frame")
          : document.getElementById("lens-shell");
      const shown = (el) =>
        el.checkVisibility() && !el.closest("[aria-hidden='true'], [inert]");
      const parts = [...(root?.querySelectorAll("[data-part]") ?? [])]
        .filter((el) => el.checkVisibility())
        .map((el) => ({
          part: el.getAttribute("data-part"),
          ref: el.getAttribute("data-ref"),
          text: el.textContent ?? "",
        }));
      const h1 = [...document.querySelectorAll("h1")].filter(shown).length;
      const turn = !!root?.querySelector(
        "[data-prism-turn='next']:not([disabled])",
      );
      return { parts, h1, turn };
    }, lens);
  let seen = await collect();
  const parts = [...seen.parts];
  const h1 = seen.h1;
  for (let i = 0; seen.turn && i < 40; i += 1) {
    await page.click("[data-prism-turn='next']");
    await page.waitForTimeout(450);
    seen = await collect();
    parts.push(...seen.parts);
  }
  return { parts, h1 };
}

/** What's wrong with one lens on one route, as sentences. */
function problems({ lens, route, expected, parts, h1, errors }) {
  const out = errors.map((error) => `console error: ${error}`);
  if (h1 !== 1) out.push(`${h1} visible h1 elements, not 1`);
  for (const want of expected) {
    if (isGap(lens, route.kind, want.part)) continue;
    const matching = parts.filter(
      (p) =>
        p.part === want.part && (want.ref === undefined || p.ref === want.ref),
    );
    const label = `${want.part}${want.ref === undefined ? "" : `[${want.ref}]`}`;
    if (!matching.length) {
      out.push(`missing ${label}`);
      continue;
    }
    const text = normalize(matching.map((p) => p.text).join(" "));
    for (const words of want.texts)
      if (!text.includes(normalize(words)))
        out.push(`${label} lacks "${words.slice(0, 50)}"`);
  }
  return out;
}

async function visit(context, url, lens) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/Failed to load resource/.test(message.text())
    )
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "load" });
  if (lens !== "daylight")
    await page
      .waitForSelector("html[data-shell-ready]", { timeout: 15000 })
      .catch(() => errors.push("the shell never became ready"));
  await page.waitForTimeout(700);
  return { page, errors };
}

/** Run jobs a few at a time. */
async function pool(jobs, size = 4) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        results.push(await job());
      }
    }),
  );
  return results;
}

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "every lens shows every part, error-free, with one h1",
  { skip, timeout: 30 * 60_000 },
  async (t) => {
    const { chromium: browserType } = await import("playwright-core");
    const external = process.env.BASE;
    if (!external)
      assert.ok(
        existsSync("dist/client/index.html"),
        "build first: dist/client is missing",
      );
    const server = external ? null : await serveRuntimeFixture();
    const base = external ?? server.base;
    const browser = await browserType.launch({ executablePath: executable });
    const content = await (await fetch(`${base}/prism/content.json`)).json();
    const failures = [];
    const record = (where, list) =>
      list.length && failures.push(`${where}\n    ${list.join("\n    ")}`);
    try {
      if (ONLY !== "fixtures") {
        const jobs = LENSES.flatMap((lens) =>
          routesFor(content).map((route) => async () => {
            const context = await browser.newContext({
              viewport: { width: 1280, height: 800 },
              reducedMotion: "reduce",
            });
            const { page, errors } = await visit(
              context,
              `${base}${route.path}?lens=${lens}`,
              lens,
            );
            const { parts, h1 } = await survey(page, lens);
            const data =
              route.kind === "writing-entry"
                ? await (
                    await fetch(
                      `${base}/prism/content.json?writing=${encodeURIComponent(route.slug)}`,
                    )
                  ).json()
                : content;
            record(
              `${lens} ${route.path}`,
              problems({
                lens,
                route,
                expected: expectedParts(route, data),
                parts,
                h1,
                errors,
              }),
            );
            await context.close();
          }),
        );
        await t.test(`${jobs.length} lens × route pages`, async () => {
          await pool(jobs);
        });
      }
      if (ONLY !== "routes") {
        // the harness lists its fixtures and each fixture's routes
        const context = await browser.newContext();
        const probe = await context.newPage();
        await probe.goto(`${base}/prism/harness?lens=daylight`);
        await probe.waitForFunction(() => window.prismHarness?.ready);
        const fixtures = await probe.evaluate(
          () => window.prismHarness.fixtures,
        );
        const plans = [];
        for (const fixture of fixtures) {
          await probe.goto(
            `${base}/prism/harness?lens=daylight&fixture=${fixture}`,
          );
          await probe.waitForFunction(() => window.prismHarness?.ready);
          const routes = await probe.evaluate(() => window.prismHarness.routes);
          for (const route of routes)
            for (const lens of SHELLS) plans.push({ fixture, route, lens });
        }
        await context.close();
        const jobs = plans.map(({ fixture, route, lens }) => async () => {
          const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            reducedMotion: "reduce",
          });
          const url = `${base}/prism/harness?lens=${lens}&fixture=${fixture}&route=${encodeURIComponent(route.path)}`;
          const { page, errors } = await visit(context, url, lens);
          await page
            .waitForFunction(() => window.prismHarness?.ready, null, {
              timeout: 15000,
            })
            .catch(() => {});
          const state = await page.evaluate(() => ({
            expected: window.prismHarness?.expected ?? [],
            error: window.prismHarness?.error,
          }));
          if (state.error) errors.push(state.error);
          const { parts, h1 } = await survey(page, lens);
          record(
            `${lens} fixture ${fixture} ${route.path}`,
            problems({
              lens,
              route,
              expected: state.expected,
              parts,
              h1,
              errors,
            }),
          );
          await context.close();
        });
        await t.test(`${jobs.length} lens × fixture pages`, async () => {
          await pool(jobs);
        });
      }
    } finally {
      await browser.close();
      await server?.close();
    }
    assert.equal(failures.length, 0, `\n${failures.sort().join("\n")}`);
  },
);
