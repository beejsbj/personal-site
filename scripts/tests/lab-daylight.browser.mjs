/** Daylight's Lab (issue #93): the room is the Bench, then the Shelf, each
 * under its heading, the featured experiment first and widest; a link-out
 * entry opens where it lives and a page entry opens /lab/<slug>.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Checked twice: on /prism/fixtures/lab, whose fixture experiments cover
 * every state whatever src/content/lab holds, and on /lab itself against
 * /prism/content.json. Same server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};

/** The room as a visitor meets it: each place with its heading and, in
 * reading order, each experiment's link, mark and card. */
const survey = (page) =>
  page.evaluate(() => {
    const text = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? null;
    return {
      h1: [...document.querySelectorAll("h1")].filter((el) =>
        el.checkVisibility(),
      ).length,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headings: [...document.querySelectorAll("main h2")]
        .filter((el) => el.checkVisibility())
        .map(text),
      places: [...document.querySelectorAll("main [data-lab-place]")].map(
        (place) => ({
          place: place.dataset.labPlace,
          heading: text(
            document.getElementById(place.getAttribute("aria-labelledby")),
          ),
          entries: [...place.querySelectorAll("article")].map((card) => {
            const title = card.querySelector("[data-part='lab.title']");
            const link = title?.querySelector("a");
            const meta = card.querySelector("[data-part='lab.meta']");
            return {
              slug: title?.dataset.ref ?? null,
              title: text(link?.querySelector(".link-label")),
              href: link?.getAttribute("href") ?? null,
              outbound: !!link?.querySelector(".link-sat"),
              says: text(link?.querySelector(".ds-link__note")),
              meta: meta ? text(meta) : null,
              pictures: card.querySelectorAll("img").length,
              hollow: [...card.querySelectorAll("p, div, span, ul, li")].filter(
                (el) =>
                  !el.closest("[aria-hidden='true']") &&
                  !el.querySelector("img, svg") &&
                  !text(el),
              ).length,
              width: Math.round(card.getBoundingClientRect().width),
            };
          }),
        }),
      ),
    };
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Daylight's Lab is a Bench and a Shelf",
  { skip, timeout: 10 * 60_000 },
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
    const { bench, shelf } = content.pages.lab.places;
    const open = async (size, path) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: "reduce",
      });
      // Nothing here leaves the test: a link out lands on a blank page.
      await context.route(
        (url) => url.origin !== base,
        (route) => route.fulfill({ contentType: "text/html", body: "" }),
      );
      const page = await context.newPage();
      const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
      assert.equal(response.status(), 200, `${path} answers`);
      return { context, page };
    };
    const find = (room, slug) =>
      room.places
        .flatMap((place) => place.entries)
        .find((entry) => entry.slug === slug);
    /** Follow an experiment's own link and say where it led. */
    const follow = async (size, path, slug) => {
      const { context, page } = await open(size, path);
      const from = page.url();
      await page.click(`[data-part='lab.title'][data-ref='${slug}'] a`);
      await page.waitForURL((url) => url.href !== from);
      const landed = page.url();
      await context.close();
      return landed;
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: the fixture room has both places, the featured entry first on the Bench`,
          async () => {
            const { context, page } = await open(size, "/prism/fixtures/lab");
            const room = await survey(page);
            await context.close();
            assert.equal(room.h1, 1, "one h1");
            assert.equal(room.overflow, 0, "nothing wider than the screen");
            assert.deepEqual(
              room.places.map(({ place, heading }) => ({ place, heading })),
              [
                { place: "bench", heading: bench.title },
                { place: "shelf", heading: shelf.title },
              ],
            );
            assert.deepEqual(
              room.places.map((place) =>
                place.entries.map((entry) => entry.slug),
              ),
              [
                [
                  "fixture-featured",
                  "fixture-linkout",
                  "fixture-bare",
                  "fixture-note",
                ],
                ["fixture-archive", "fixture-quiet", "fixture-plain"],
              ],
            );
            const [featured, ...rest] = room.places[0].entries;
            if (size === "desktop")
              for (const entry of rest)
                assert.ok(
                  featured.width > entry.width,
                  `the featured entry (${featured.width}px) is given more room than ${entry.slug} (${entry.width}px)`,
                );
          },
        );

        await t.test(
          `${size}: a link-out entry is marked as leaving, a page entry is not`,
          async () => {
            const { context, page } = await open(size, "/prism/fixtures/lab");
            const room = await survey(page);
            await context.close();
            for (const slug of [
              "fixture-linkout",
              "fixture-note",
              "fixture-quiet",
            ]) {
              const entry = find(room, slug);
              assert.equal(entry.href, `https://example.com/${slug}`);
              assert.equal(entry.outbound, true, `${slug} wears the arrow`);
              assert.equal(entry.says, "(external site)");
            }
            for (const slug of [
              "fixture-featured",
              "fixture-bare",
              "fixture-archive",
              "fixture-plain",
            ]) {
              const entry = find(room, slug);
              assert.equal(entry.href, `/lab/${slug}`);
              assert.equal(entry.outbound, false, `${slug} has no arrow`);
              assert.equal(entry.says, null);
            }
          },
        );

        await t.test(
          `${size}: a link-out entry opens its href, a page entry opens /lab/<slug>`,
          async () => {
            assert.equal(
              await follow(size, "/prism/fixtures/lab", "fixture-linkout"),
              "https://example.com/fixture-linkout",
            );
            assert.equal(
              await follow(size, "/prism/fixtures/lab", "fixture-bare"),
              `${base}/lab/fixture-bare`,
            );
          },
        );

        await t.test(
          `${size}: an entry with no cover, type or era leaves no gap behind`,
          async () => {
            const { context, page } = await open(size, "/prism/fixtures/lab");
            const room = await survey(page);
            await context.close();
            const metas = Object.fromEntries(
              room.places
                .flatMap((place) => place.entries)
                .map((entry) => [entry.slug, entry.meta]),
            );
            assert.deepEqual(metas, {
              "fixture-featured": "Tools",
              "fixture-linkout": "Canvas + sound · CodePen",
              "fixture-bare": null,
              "fixture-note": "A deck",
              "fixture-archive": "Client archive",
              "fixture-quiet": "SVG + motion · CodePen",
              "fixture-plain": null,
            });
            for (const entry of room.places.flatMap((place) => place.entries)) {
              assert.equal(entry.hollow, 0, `${entry.slug}: an empty element`);
              assert.equal(
                entry.pictures,
                ["fixture-bare", "fixture-note", "fixture-plain"].includes(
                  entry.slug,
                )
                  ? 0
                  : 1,
                `${entry.slug}: pictures`,
              );
            }
          },
        );

        await t.test(
          `${size}: a place with nothing in it is not there at all`,
          async () => {
            const { context, page } = await open(
              size,
              "/prism/fixtures/lab?fixture=shelf-only",
            );
            const room = await survey(page);
            await context.close();
            assert.deepEqual(
              room.places.map((place) => place.place),
              ["shelf"],
            );
            assert.ok(room.headings.includes(shelf.title));
            assert.ok(
              !room.headings.includes(bench.title),
              "no heading for an empty Bench",
            );
          },
        );

        await t.test(
          `${size}: /lab shows the experiments in src/content the same way`,
          async () => {
            const expected = ["bench", "shelf"]
              .map((place) => {
                const here = content.lab.filter(
                  (entry) => entry.place === place,
                );
                return {
                  place,
                  heading: content.pages.lab.places[place].title,
                  entries: [
                    ...here.filter((entry) => entry.featured),
                    ...here.filter((entry) => !entry.featured),
                  ],
                };
              })
              .filter((group) => group.entries.length);
            const { context, page } = await open(size, "/lab");
            const room = await survey(page);
            await context.close();
            assert.equal(room.h1, 1, "one h1");
            assert.equal(room.overflow, 0, "nothing wider than the screen");
            assert.deepEqual(
              room.places.map(({ place, heading, entries }) => ({
                place,
                heading,
                entries: entries.map(({ slug, href, outbound }) => ({
                  slug,
                  href,
                  outbound,
                })),
              })),
              expected.map(({ place, heading, entries }) => ({
                place,
                heading,
                entries: entries.map((entry) => ({
                  slug: entry.slug,
                  href: entry.detail,
                  outbound: !entry.hasPage,
                })),
              })),
            );
            for (const entry of content.lab) {
              const landed = await follow(size, "/lab", entry.slug);
              assert.equal(
                landed,
                new URL(entry.hasPage ? `/lab/${entry.slug}` : entry.href, base)
                  .href,
                `${entry.slug} opens where it lives`,
              );
            }
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
