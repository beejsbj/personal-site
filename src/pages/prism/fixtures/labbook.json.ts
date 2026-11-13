/** The fixture Labbook written as real updates are
 * (src/content/fixture-updates), as /prism/content.json would carry it.
 * The harness hands it to the shells (`labbook-notebook` in
 * src/prism/fixtures.ts); Daylight's page on it is
 * /prism/fixtures/lab?labbook=notebook. */
import type { APIRoute } from "astro";
import { getFixtureLabbook } from "../../../lib/portfolio";

export const GET: APIRoute = async () =>
  Response.json(await getFixtureLabbook());
