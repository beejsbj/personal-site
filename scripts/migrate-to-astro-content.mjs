import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const contentDir = path.join(root, "src", "content");

const projectTargetMap = {
  "api3-ecosystem": {
    collection: "projects",
    featured: true,
    status: "selected",
    order: 1,
  },
  "desci-bengaluru": {
    collection: "projects",
    featured: true,
    status: "selected",
    order: 2,
  },
  "pizza-nano": {
    collection: "projects",
    featured: true,
    status: "selected",
    order: 3,
  },
  qrng: {
    collection: "projects",
    featured: true,
    status: "selected",
    order: 4,
  },
  garden: {
    collection: "lab",
    type: "layout exploration",
    sourceEra: "Student work",
    order: 1,
  },
  e4p: {
    collection: "lab",
    type: "learning archive",
    sourceEra: "Student work",
    order: 2,
  },
  flashcards: {
    collection: "lab",
    type: "app experiment",
    sourceEra: "Student work",
    order: 3,
  },
  quantumon: {
    collection: "lab",
    type: "client archive",
    sourceEra: "Early freelance",
    order: 4,
    hidden: true,
  },
  roulette: {
    collection: "lab",
    type: "interaction archive",
    sourceEra: "API3 experiments",
    order: 5,
    hidden: true,
  },
};

function parseYear(dateLabel) {
  const match = dateLabel.match(/(20\d{2})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function toYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const lines = Object.entries(item).map(([key, entry]) => {
            return `${pad}  ${key}: ${formatYamlValue(entry, indent + 2)}`;
          });
          return `${pad}-\n${lines.join("\n")}`;
        }
        return `${pad}- ${formatYamlValue(item, indent)}`;
      })
      .join("\n");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => {
        const formatted = formatYamlValue(entry, indent);
        if (typeof formatted === "string" && formatted.startsWith("\n")) {
          return `${pad}${key}:${formatted}`;
        }
        return `${pad}${key}: ${formatted}`;
      })
      .join("\n");
  }

  return formatYamlValue(value, indent);
}

function formatYamlValue(value, indent = 0) {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    const rendered = toYaml(value, indent + 2);
    if (rendered === "[]") {
      return rendered;
    }
    return `\n${rendered}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function cleanText(text = "") {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<a class='text' href='\?page=project&project=([^']+)'>/g, "[$1](/projects/$1)")
    .replace(/<em>(.*?)<\/em>/g, "*$1*")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function sectionToMarkdown(section) {
  const chunks = [];

  if (section.module === "goals-list" && Array.isArray(section.goals)) {
    chunks.push(`## ${section.heading || "Goals"}`);
    chunks.push(section.goals.map((goal) => `- ${cleanText(goal)}`).join("\n"));
  }

  if (section.module === "generic-list" && Array.isArray(section.paragraphs)) {
    chunks.push(`## ${section.heading || "Highlights"}`);
    chunks.push(section.paragraphs.map((item) => `- ${cleanText(item)}`).join("\n"));
  }

  if (section.module === "article-grid" && Array.isArray(section.articles)) {
    chunks.push("## Writing about this work");
    chunks.push(
      section.articles
        .map((article) => `- [${cleanText(article.title)}](${article.link})`)
        .join("\n"),
    );
  }

  if (!section.module || section.module === "project-meta") {
    if (section.heading && Array.isArray(section.paragraphs)) {
      chunks.push(`## ${cleanText(section.heading)}`);
      chunks.push(section.paragraphs.map((paragraph) => cleanText(paragraph.text || paragraph)).join("\n\n"));
    }
  }

  if (Array.isArray(section.paragraphs) && section.module !== "generic-list" && !section.heading && section.module !== "project-meta") {
    chunks.push(section.paragraphs.map((paragraph) => cleanText(paragraph.text || paragraph)).join("\n\n"));
  }

  return chunks.filter(Boolean).join("\n\n");
}

function collectLinks(project) {
  const links = [];
  for (const section of project.sections || []) {
    if (section.module === "menu-module" && Array.isArray(section.links)) {
      for (const link of section.links) {
        let url = link.slug;
        if (url.startsWith("projects/")) {
          url = `/${url}`;
        }
        if (url.startsWith("?page=")) {
          continue;
        }
        if (url.startsWith("http") || url.startsWith("/")) {
          links.push({
            label: cleanText(link.name),
            url,
          });
        }
      }
    }
  }
  return links;
}

function collectMedia(project) {
  const coverImage = project.image ? `/images/projects/${project.image}` : "/images/landscape.jpg";
  return [
    {
      type: "image",
      src: coverImage,
      alt: `${project.heading} cover image`,
    },
  ];
}

async function writeEntry(project, target) {
  const destinationDir = path.join(contentDir, target.collection);
  await fs.mkdir(destinationDir, { recursive: true });

  const frontmatter =
    target.collection === "projects"
      ? {
          title: project.heading,
          summary: cleanText(project.description),
          year: parseYear(project.date),
          dateLabel: project.date,
          role: project.role,
          location: project.location,
          tools: project.tools || [],
          featured: Boolean(target.featured),
          status: target.status || "archive",
          cover: `/images/projects/${project.image}`,
          links: collectLinks(project),
          media: collectMedia(project),
          order: target.order || 100,
          tags: project.tags || [],
          hidden: Boolean(target.hidden),
        }
      : {
          title: project.heading,
          summary: cleanText(project.description),
          type: target.type || "archive",
          sourceEra: target.sourceEra || "Archive",
          cover: `/images/projects/${project.image}`,
          links: collectLinks(project),
          media: collectMedia(project),
          order: target.order || 100,
          hidden: Boolean(target.hidden),
        };

  const body = (project.sections || [])
    .map(sectionToMarkdown)
    .filter(Boolean)
    .join("\n\n");

  const fileContents = `---\n${toYaml(frontmatter)}\n---\n\n${body}\n`;
  await fs.writeFile(path.join(destinationDir, `${project.id}.md`), fileContents, "utf8");
}

async function main() {
  const raw = await fs.readFile(path.join(dataDir, "projects-list.json"), "utf8");
  const projects = JSON.parse(raw);

  await fs.mkdir(path.join(contentDir, "projects"), { recursive: true });
  await fs.mkdir(path.join(contentDir, "lab"), { recursive: true });

  for (const project of projects) {
    const target = projectTargetMap[project.id];

    if (!target) {
      continue;
    }

    await writeEntry(project, target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
