const pageRedirects: Record<string, string> = {
  home: "/",
  about: "/about",
  resume: "/about/resume",
  projects: "/projects",
  blog: "/writing",
  garden: "/projects/garden",
  "layout-detail": "/projects/garden",
  e4p: "/projects/e4p",
  "exercise-detail": "/projects/e4p",
  "e4p-in-vue": "/projects/e4p",
  "style-guide": "/style-guide",
};

const projectRedirects: Record<string, string> = {
  "conduit-market": "/projects/conduit-market",
  "api3-ecosystem": "/projects/api3-ecosystem",
  qrng: "/projects/qrng",
  garden: "/projects/garden",
  e4p: "/projects/e4p",
  flashcards: "/projects/flashcards",
  quantumon: "/lab",
  roulette: "/lab",
  "pizza-nano": "/projects",
  "desci-bengaluru": "/projects",
};

/** Old paths that moved. The visitor's query string (a `?lens=`, say)
 * travels with them, as it does through Vercel's redirects. */
const pathRedirects: Record<string, string> = {
  "/resume": "/about/resume",
};

export function getLegacyRedirect(url: URL): string | undefined {
  const moved = pathRedirects[url.pathname.replace(/(.)\/$/, "$1")];
  if (moved) return `${moved}${url.search}`;

  const page = url.searchParams.get("page");

  if (page === "project") {
    const projectId = url.searchParams.get("project");
    return projectId !== null
      ? (projectRedirects[projectId] ?? "/projects")
      : undefined;
  }

  return page ? pageRedirects[page] : undefined;
}
