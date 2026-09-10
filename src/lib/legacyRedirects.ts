const pageRedirects: Record<string, string> = {
  home: "/",
  about: "/about",
  resume: "/resume",
  projects: "/projects",
  blog: "https://buroojs.substack.com",
  garden: "/lab/garden",
  "layout-detail": "/lab/garden",
  e4p: "/lab/e4p",
  "exercise-detail": "/lab/e4p",
  "e4p-in-vue": "/lab/e4p",
  "style-guide": "/lab/style-guide",
};

const projectRedirects: Record<string, string> = {
  "conduit-market": "/projects/conduit-market",
  "api3-ecosystem": "/projects/api3-ecosystem",
  qrng: "/projects/qrng",
  garden: "/lab/garden",
  e4p: "/lab/e4p",
  flashcards: "/lab/flashcards",
  quantumon: "/lab",
  roulette: "/lab",
  "pizza-nano": "/projects",
  "desci-bengaluru": "/projects",
};

export function getLegacyRedirect(url: URL): string | undefined {
  const page = url.searchParams.get("page");

  if (page === "project") {
    const projectId = url.searchParams.get("project");
    return projectId ? (projectRedirects[projectId] ?? "/projects") : undefined;
  }

  return page ? pageRedirects[page] : undefined;
}
