import { defineCollection, z } from "astro:content";

/* Every word a visitor reads lives in src/content. Daylight renders it and
 * /prism/content.json hands the same words to every lens. Short copy fields
 * may use inline markdown: **bold**, _em_, `code` and [links](/somewhere).
 *
 * Link hrefs may name the site's own identity instead of repeating it, so a
 * changed email or profile URL is changed once, in site/config.json:
 *   "social:GitHub"  a `social` entry by label (label defaults to it)
 *   "site:email"     mailto: the site email (label defaults to the address)
 *   "site:writing"   the writing URL (needs a label) */

const linkSchema = z.object({
  label: z.string(),
  url: z.string().min(1),
});

const linkRefSchema = z.object({
  label: z.string().optional(),
  href: z.string().min(1),
});

const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** A page's opening: eyebrow, h1, intro and its action links. */
const headerSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  intro: z.string().optional(),
  actions: z.array(linkRefSchema).default([]),
});

/** "2022", "2022-01" or "2022-01-15". */
const partialDate = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d{4}(-\d{2}){0,2}$/));

/** A role or a course on the resume. The date line is derived from
 * `kind`, `start` and `end` ("January 2022 - November 2024"), unless
 * `dateLabel` says it in other words. No `end` means current. */
const resumeEntrySchema = z.object({
  title: z.string().optional(),
  org: z.string().optional(),
  kind: z.string().optional(),
  start: partialDate.optional(),
  end: partialDate.optional(),
  dateLabel: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

const roleSchema = resumeEntrySchema.refine(
  (role) => role.title || role.org,
  "A role needs a title or an org.",
);

/** One schema for every page; each page fills the groups it uses and
 * src/lib/portfolio.ts insists on the ones its page needs. */
const pageSchema = z.object({
  /** Document title and meta description. */
  title: z.string(),
  description: z.string(),
  header: headerSchema.optional(),

  // Home
  hero: z
    .object({
      greeting: z.string(),
      headline: z.string(),
      occupation: z.string(),
      welcome: z.string(),
      portrait: z.object({
        src: z.string(),
        alt: z.string(),
        caption: z.string(),
        href: z.string(),
      }),
      links: z.array(linkRefSchema).default([]),
    })
    .optional(),
  sidebarLabel: z.string().optional(),
  work: z
    .object({
      title: z.string(),
      link: linkRefSchema,
      /** How many featured projects the home page shows. */
      limit: z.number().int().positive(),
    })
    .optional(),
  currently: z
    .object({
      title: z.string(),
      body: z.string(),
      link: linkRefSchema,
    })
    .optional(),
  updates: z
    .object({
      title: z.string(),
      intro: z.string(),
      listLabel: z.string(),
      empty: z.string(),
      caption: z.string(),
      /** How many updates the home page shows. */
      limit: z.number().int().positive(),
    })
    .optional(),
  elsewhere: z
    .object({
      label: z.string(),
      items: z.array(
        z.object({ title: z.string(), href: z.string(), blurb: z.string() }),
      ),
    })
    .optional(),

  // Projects and Lab
  listLabel: z.string().optional(),
  more: linkRefSchema.optional(),
  aside: z.string().optional(),
  /** Copy for each entry's own page. */
  entry: z
    .object({
      eyebrow: z.string().optional(),
      back: linkRefSchema.optional(),
      labels: z.record(z.string()),
    })
    .optional(),

  // Resume
  experience: z
    .object({ title: z.string(), roles: z.array(roleSchema) })
    .optional(),
  education: z
    .object({ title: z.string(), entries: z.array(roleSchema) })
    .optional(),
  tools: z
    .object({ title: z.string(), items: z.array(z.string()) })
    .optional(),
  /** The end of a date line for a role with no end date. */
  ongoing: z.string().optional(),
});

export type PageData = z.infer<typeof pageSchema>;
export type ResumeEntryData = z.infer<typeof resumeEntrySchema>;
export type LinkRef = z.infer<typeof linkRefSchema>;

const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  kind: z.enum(["Project", "Arcade"]).default("Project"),
  year: z.number(),
  dateLabel: z.string(),
  role: z.string(),
  location: z.string(),
  tools: z.array(z.string()),
  featured: z.boolean().default(false),
  status: z.string(),
  cover: z.string(),
  links: z.array(linkSchema).default([]),
  media: z.array(mediaSchema).default([]),
  order: z.number().default(100),
  tags: z.array(z.string()).default([]),
  hidden: z.boolean().default(false),
});

const labSchema = z.object({
  title: z.string(),
  summary: z.string(),
  type: z.string(),
  sourceEra: z.string(),
  cover: z.string().optional(),
  href: z.string().url().optional(),
  links: z.array(linkSchema).default([]),
  media: z.array(mediaSchema).default([]),
  order: z.number().default(100),
  hidden: z.boolean().default(false),
});

const UPDATE_KINDS = [
  "project",
  "pull-request",
  "repository",
  "writing",
  "lab",
  "milestone",
  "status",
  "location",
  "agents",
] as const;
const UPDATE_SOURCES = [
  "site",
  "github",
  "substack",
  "bjslab",
  "manual",
] as const;

const updateSchema = z
  .object({
    // Events describe things that happened, not another project/writing collection.
    kind: z.enum(UPDATE_KINDS).default("project"),
    source: z.enum(UPDATE_SOURCES).default("site"),
    evidence: z
      .object({
        url: z.string().url(),
        observedAt: z.string().datetime({ offset: true }),
      })
      .optional(),
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateLabel: z.string(),
    summary: z.string(),
    href: z.string().min(1),
    linkLabel: z.string(),
    relatedProject: z.string().optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((update, context) => {
    if (
      ["status", "location", "agents"].includes(update.kind) &&
      !update.expiresAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message:
          "Ephemeral signals need an expiry; do not publish indefinite live claims.",
      });
    }
  });

export type UpdateData = z.infer<typeof updateSchema>;

const siteSchema = z.object({
  name: z.string(),
  siteTitle: z.string(),
  siteDescription: z.string(),
  email: z.string().email(),
  writingUrl: z.string().url(),
  /** The wordmark in the header, and its accessible name. */
  mark: z.object({ text: z.string(), label: z.string() }),
  skipLink: z.string(),
  nav: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      external: z.boolean().optional(),
    }),
  ),
  /** Daylight's header: which `nav` items it shows, in order, between a
   * home link and a "say hello" mail link. */
  header: z.object({
    label: z.string(),
    home: z.string(),
    hello: z.string(),
    items: z.array(z.string()),
  }),
  footer: z.object({
    links: z.array(linkRefSchema),
    signoff: z.string(),
  }),
  social: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    }),
  ),
  /** How each kind and source of update is named. */
  updateKinds: z.record(z.enum(UPDATE_KINDS), z.string()),
  updateSources: z.record(z.enum(UPDATE_SOURCES), z.string()),
});

export type SiteData = z.infer<typeof siteSchema>;

const pages = defineCollection({
  type: "content",
  schema: pageSchema,
});

const projects = defineCollection({
  type: "content",
  schema: projectSchema,
});

const lab = defineCollection({
  type: "content",
  schema: labSchema,
});

const updates = defineCollection({
  type: "content",
  schema: updateSchema,
});

const site = defineCollection({
  type: "data",
  schema: siteSchema,
});

/** Each lens's own flavour copy: the words a lens's designer wrote for it
 * (command help lines, captions, labels). Shells read it as
 * `content.lenses[id]`; its shape is the JSON file itself (see
 * src/prism/shells/types.ts), so `astro check` catches a missing key. */
const lenses = defineCollection({
  type: "data",
  schema: z.record(z.string(), z.unknown()),
});

export const collections = {
  pages,
  projects,
  lab,
  updates,
  site,
  lenses,
};
