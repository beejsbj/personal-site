import { updateSchema } from "../content.config";
import { validatePublicExport } from "./activity-engine/validation.mjs";
import publicActivity from "../data/activity.public.json";

// Share the engine's static-public boundary, then check the rendering contract.
// Invalid exports fail the build; presence cannot enter the static homepage.
const document = validatePublicExport(publicActivity);
export const generatedActivity = document.events.map((event: unknown) =>
  updateSchema.parse(event),
);
