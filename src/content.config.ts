import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineCollection, z } from "astro:content";
import { BLOCK_NAME, parseTree } from "./lib/blocks.ts";
import { penEmbedSrc } from "./lib/labbook.ts";

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

/* ---- blocks: what an experiment's or a project's page is told with ----
 *
 * A page names its blocks in `blocks` and its body places each with a line
 * that is `::name` and nothing else (src/lib/blocks.ts). Every block is
 * strict: a field it does not have is refused by name. `caption`, a
 * quote's `text` and a step's `text` may use inline markdown. */

/** A file a block shows: one of the site's own, or one kept elsewhere. */
const file = z
  .string()
  .regex(
    /^(?:\/(?!\/)|https:\/\/)\S+$/,
    "A file is a site path (/images/…) or an https:// address.",
  );
const poster = z
  .string()
  .regex(
    /^\/(?!\/)\S+$/,
    "A poster is one of the site's own files (/images/…): nothing is asked of another site before a click.",
  );
const ratio = z
  .string()
  .regex(/^\d+\/\d+$/, 'A ratio is written width/height: "16/9".');

/** Every piece of media says what it shows. */
const UNSAID = {
  message: "Say what it shows: give it alt text or a caption.",
  path: ["alt"],
};
const said = (media: { alt?: string; caption?: string }) =>
  !!(media.alt?.trim() || media.caption?.trim());
const words = {
  alt: z.string().optional(),
  caption: z.string().optional(),
};

const pictureFields = {
  src: file,
  ...words,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
};
const picture = z.object(pictureFields).strict().refine(said, UNSAID);
/** One side of a compare: `label` says which, in place of "Before". */
const side = z
  .object({ ...pictureFields, label: z.string().optional() })
  .strict()
  .refine(said, UNSAID);

const blockSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("gallery"),
        items: z.array(picture).min(1, "A gallery shows at least one picture."),
      })
      .strict(),
    z
      .object({
        type: z.literal("compare"),
        before: side,
        after: side,
        caption: z.string().optional(),
      })
      .strict(),
    /** Something live, loaded only when asked for: a Pen by its address,
     * a demo or a deck by the page a frame should show. */
    z
      .object({
        type: z.literal("embed"),
        kind: z.enum(["pen", "demo", "deck"]),
        src: file,
        ...words,
        poster: poster.optional(),
        ratio: ratio.optional(),
      })
      .strict(),
    /** A 3D model or a Gaussian splat, shown by a viewer loaded only when
     * asked for. `rotation` stands it upright: degrees about x, y and z. */
    z
      .object({
        type: z.literal("model"),
        src: file.regex(
          /\.(?:glb|spz|sog|splat)(?:[?#].*)?$/i,
          "A model is a .glb, .spz, .sog or .splat file.",
        ),
        ...words,
        poster: poster.optional(),
        ratio: ratio.optional(),
        rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("code"),
        code: z.string().regex(/\S/, "A code excerpt is not empty."),
        language: z.string().min(1),
        caption: z.string().optional(),
      })
      .strict(),
    /** Burooj's own words, and where they were said. */
    z
      .object({
        type: z.literal("quote"),
        text: z.string().min(1),
        source: z.string().min(1),
        date: partialDate.optional(),
      })
      .strict(),
    /** Numbered by their order. */
    z
      .object({
        type: z.literal("steps"),
        items: z
          .array(
            z
              .object({
                title: z.string().optional(),
                text: z.string().min(1),
                image: picture.optional(),
              })
              .strict(),
          )
          .min(1, "Steps have at least one step."),
      })
      .strict(),
    /** Files and folders, written as an indented outline (two spaces to a
     * level, `# a note` after a name) and handed on as nodes. */
    z
      .object({
        type: z.literal("tree"),
        tree: z.string().transform((outline, context) => {
          try {
            return parseTree(outline);
          } catch (error) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: (error as Error).message,
            });
            return z.NEVER;
          }
        }),
        caption: z.string().optional(),
      })
      .strict(),
    z.object({ type: z.literal("audio"), src: file, ...words }).strict(),
    /** A short clip. One that loops plays by itself, silently, unless the
     * visitor asked for less motion. */
    z
      .object({
        type: z.literal("film"),
        src: file,
        ...words,
        poster: poster.optional(),
        loop: z.boolean().default(false),
      })
      .strict(),
  ])
  .superRefine((block, context) => {
    if (
      ["embed", "model", "audio", "film"].includes(block.type) &&
      !said(block as { alt?: string; caption?: string })
    )
      context.addIssue({ code: z.ZodIssueCode.custom, ...UNSAID });
    if (
      block.type === "embed" &&
      block.kind === "pen" &&
      block.src.startsWith("https://") &&
      !penEmbedSrc(block.src)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["src"],
        message:
          "A Pen is named by its address: https://codepen.io/<user>/pen/<id>.",
      });
  });

/** A page's blocks, each under the name its body places it by. */
const blocksSchema = z
  .record(
    z
      .string()
      .regex(
        BLOCK_NAME,
        'A block is named in lower-case letters, digits and hyphens, starting with a letter: "first-drawings".',
      ),
    blockSchema,
  )
  .default({});

export type BlockData = z.infer<typeof blockSchema>;

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
  writing: z
    .object({
      subscribeLabel: z.string(),
      sourceLabel: z.string(),
      originLabel: z.string(),
      backLabel: z.string(),
      listLabel: z.string(),
      emptyMessage: z.string(),
      unavailableMessage: z.string(),
      entryUnavailableMessage: z.string(),
      entryMissingMessage: z.string(),
      endHeading: z.string(),
      endBody: z.string(),
    })
    .optional(),

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
  /** The Lab's two places: what each is called, and a line about it. */
  places: z
    .object({
      bench: z.object({ title: z.string(), note: z.string() }),
      shelf: z.object({ title: z.string(), note: z.string() }),
    })
    .optional(),
  /** The Labbook on the Lab's page: its heading, what an artifact's frame
   * says before and after it loads, and how a redacted update, and each
   * bar on its line, is named. */
  labbook: z
    .object({
      title: z.string(),
      note: z.string(),
      listLabel: z.string(),
      /** Narrowing it to one experiment or project: what the links to
       * each are called together, what it says while narrowed, the way
       * back to every entry, and how many entries one has, said aloud
       * (`{count}` is the number). */
      narrow: z.object({
        label: z.string(),
        showing: z.string(),
        all: z.string(),
        count: z.object({ one: z.string(), other: z.string() }),
      }),
      /** What introduces the experiment or project an update is about. */
      related: z.object({ experiment: z.string(), project: z.string() }),
      artifact: z.object({
        /** Asks for a Pen or a demo to load where it stands. */
        load: z.object({ pen: z.string(), demo: z.string() }),
        /** Goes to where it lives instead. */
        open: z.object({ pen: z.string(), demo: z.string() }),
        note: z.string(),
      }),
      redacted: z.object({
        label: z.string(),
        /** What a black bar is called aloud. */
        bar: z.string(),
        /** A name for each kind of work a redacted update may be. */
        works: z.object({
          code: z.string(),
          design: z.string(),
          writing: z.string(),
          research: z.string(),
          other: z.string(),
        }),
      }),
    })
    .optional(),
  /** What a card on the list says for the way to play an experiment where
   * it stands: to ask for it, to put it away, and while it loads. */
  preview: z
    .object({
      load: z.object({ pen: z.string(), demo: z.string() }),
      close: z.string(),
      note: z.string(),
      loading: z.string(),
    })
    .optional(),
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
  tools: z.object({ title: z.string(), items: z.array(z.string()) }).optional(),
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
  blocks: blocksSchema,
  order: z.number().default(100),
  tags: z.array(z.string()).default([]),
  hidden: z.boolean().default(false),
});

/** Strict: a field an experiment does not have would only be dropped;
 * here it is refused by name, so one left over from before is loud. */
const labSchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    /** The Bench holds what is being worked on now; the Shelf what has gone
     * quiet, and the archive. */
    place: z.enum(["bench", "shelf"]),
    /** The slug of the project this experiment graduated into. */
    graduatedTo: z.string().optional(),
    /** The one entry given pride of place. */
    featured: z.boolean().optional(),
    cover: z.string().optional(),
    /** The live experiment, when it lives elsewhere: the entry links straight
     * out and has no page here. */
    href: z.string().url().optional(),
    /** That `href` may be played where its card sits in the Lab, in a frame
     * (src/lib/labbook.ts, `labPreview`). A Pen needs no word: it is told by
     * its address. Any other page is never framed unless it is said here, and
     * `false` keeps a Pen from being. */
    embeddable: z.boolean().optional(),
    links: z.array(linkSchema).default([]),
    media: z.array(mediaSchema).default([]),
    blocks: blocksSchema,
    order: z.number().default(100),
    hidden: z.boolean().default(false),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.embeddable && !entry.href?.startsWith("https://"))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embeddable"],
        message:
          "A page can be framed only if the entry links out: give it an https:// href.",
      });
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
  "codepen",
] as const;

/** The thing an update shows for itself. */
const artifactSchema = z.object({
  kind: z.enum(["image", "video", "pen", "demo", "sound"]),
  src: z.string().min(1),
  alt: z.string(),
  poster: z.string().optional(),
});

/** "2026-07-01". */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** A field one kind of update must not have. An unknown key would only be
 * dropped; these are refused, so a mistake is loud. */
const refused = (message: string) =>
  z.custom<undefined>((value) => value === undefined, message);

const updateFields = {
  // Events describe things that happened, not another project/writing collection.
  kind: z.enum(UPDATE_KINDS).default("project"),
  source: z.enum(UPDATE_SOURCES).default("site"),
  evidence: z
    .object({
      url: z.string().url(),
      observedAt: z.string().datetime({ offset: true }),
    })
    .optional(),
  date: day,
  /** The date said in other words; without it the site writes
   * "01 Jul 2026" from `date`. */
  dateLabel: z.string().optional(),
  /** A project's slug. */
  relatedProject: z.string().optional(),
  /** A lab slug. */
  relatedExperiment: z.string().optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
};

const openUpdateSchema = z.object({
  ...updateFields,
  visibility: z.literal("open"),
  title: z.string(),
  summary: z.string(),
  href: z.string().min(1).optional(),
  linkLabel: z.string().optional(),
  artifact: artifactSchema.optional(),
  shape: refused("Only a redacted update has a shape."),
});

/** A word a redacted update shows: one short word, so a sentence cannot
 * be passed as one. */
const shownWord = z
  .string()
  .min(1, "A word shown in a redacted update is not empty.")
  .max(24, "A word shown in a redacted update is at most 24 characters.")
  .regex(
    /^\S*$/,
    "A word shown in a redacted update has no spaces: one word to a part.",
  );

/** Something made that stays private: the site is told that it happened
 * and what shape it has. Its line is given part by part, and the site is
 * never told the parts that are blacked out. */
const noWords = refused("A redacted update shows its shape and nothing else.");
const redactedUpdateSchema = z.object({
  ...updateFields,
  visibility: z.literal("redacted"),
  shape: z.object({
    work: z.enum(["code", "design", "writing", "research", "other"]),
    /** Its line, in order: a word shown as written, or the length of a
     * black bar (chosen, not measured from the hidden text). At least one
     * part is a bar. */
    parts: z
      .array(z.union([shownWord, z.number().positive()]))
      .refine((parts) => parts.some((part) => typeof part === "number"), {
        message: "A redacted update blacks out at least one part.",
      }),
  }),
  title: noWords,
  summary: noWords,
  href: noWords,
  linkLabel: noWords,
  dateLabel: noWords,
  artifact: noWords,
  evidence: noWords,
});

/** The slug of every project: its file's name in src/content/projects. */
const projectSlugs = () =>
  new Set(
    readdirSync(join(process.cwd(), "src/content/projects")).map((name) =>
      name.replace(/\.mdx?$/, ""),
    ),
  );

const updateSchema = z
  .preprocess(
    // Open unless it says otherwise.
    (update) =>
      update && typeof update === "object" && !("visibility" in update)
        ? { ...update, visibility: "open" }
        : update,
    z.discriminatedUnion("visibility", [
      openUpdateSchema,
      redactedUpdateSchema,
    ]),
  )
  .superRefine((update, context) => {
    if (update.relatedProject && !projectSlugs().has(update.relatedProject))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedProject"],
        message: `"${update.relatedProject}" is not the slug of any project.`,
      });
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
export type UpdateKind = (typeof UPDATE_KINDS)[number];
export type UpdateSource = (typeof UPDATE_SOURCES)[number];

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
  /** What a page's blocks say for themselves: which side of a compare is
   * which, and what asks for an embed or a model to load, goes to where
   * an embed lives instead, and puts either away again. */
  blocks: z.object({
    compare: z.object({ before: z.string(), after: z.string() }),
    embed: z.object({
      load: z.object({ pen: z.string(), demo: z.string(), deck: z.string() }),
      open: z.object({ pen: z.string(), demo: z.string(), deck: z.string() }),
      close: z.string(),
      note: z.string(),
    }),
    model: z.object({
      load: z.string(),
      close: z.string(),
      note: z.string(),
      /** How the viewer is handled, said once it is showing. */
      hint: z.string(),
      /** Said when the viewer cannot show the model. */
      failed: z.string(),
    }),
  }),
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

/** Experiments that are not on show: written as one is, and checked by the
 * same schema, so the pages built on them (/prism/fixtures/lab) and the
 * tests that read those pages see what a real entry would give. */
const fixtures = defineCollection({
  type: "content",
  schema: labSchema,
});

/** A Labbook that is not on show: updates written as real ones are, and
 * checked by the same schema, spanning months and holding every kind of
 * entry. /prism/fixtures/lab?labbook=notebook renders it, and the harness
 * hands it to the shells (/prism/fixtures/labbook.json). */
const fixtureUpdates = defineCollection({
  type: "content",
  schema: updateSchema,
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
  fixtures,
  "fixture-updates": fixtureUpdates,
};
