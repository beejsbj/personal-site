import { defineCollection, z } from "astro:content";

const linkSchema = z.object({
  label: z.string(),
  url: z.string().min(1),
});

const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const pageSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string().optional(),
  headline: z.string().optional(),
  intro: z.string().optional(),
  availability: z.string().optional(),
});

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

const updateSchema = z
  .object({
    // Events describe things that happened, not another project/writing collection.
    kind: z
      .enum([
        "project",
        "pull-request",
        "repository",
        "writing",
        "lab",
        "milestone",
        "status",
        "location",
        "agents",
      ])
      .default("project"),
    source: z
      .enum(["site", "github", "substack", "bjslab", "manual"])
      .default("site"),
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
  nav: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      external: z.boolean().optional(),
    }),
  ),
  social: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    }),
  ),
});

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

export const collections = {
  pages,
  projects,
  lab,
  updates,
  site,
};
