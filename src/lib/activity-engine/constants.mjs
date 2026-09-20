export const ENGINE_VERSION = 1;

export const SOURCES = [
  "github",
  "bjslab",
  "agent-session",
  "manual",
  "generic",
];

// These match the site's content schema. New display kinds need an intentional
// renderer/schema change before they can be exported.
export const EVENT_KINDS = [
  "project",
  "pull-request",
  "repository",
  "writing",
  "lab",
  "milestone",
  "status",
  "location",
  "agents",
];

export const PRESENCE_KINDS = new Set(["status", "location", "agents"]);
export const REVIEW_STATES = ["pending", "approved", "rejected", "retracted"];
export const MAX_INPUT_BYTES = 256 * 1024;
export const MAX_PAYLOAD_BYTES = 32 * 1024;
export const MAX_PUBLIC_TEXT_LENGTH = 280;

// A real operator must narrow this to producers they intend to amplify. This
// sample deliberately permits synthetic fixture producers only.
export const DEFAULT_POLICY = {
  version: ENGINE_VERSION,
  // Opt-in exact rules only. Add no real producer here by default.
  autoPublish: [],
  sources: {
    github: {
      enabled: true,
      producers: ["github:example/public-repo"],
      review: "required",
    },
    bjslab: {
      enabled: true,
      producers: ["bjslab:milestone-producer"],
      review: "required",
    },
    "agent-session": {
      enabled: true,
      producers: ["agent-session:operator"],
      review: "required",
    },
    manual: {
      enabled: true,
      producers: ["manual:operator"],
      review: "required",
    },
    generic: { enabled: false, producers: [], review: "required" },
  },
};
