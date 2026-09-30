const pageRedirects: Record<string, string> = {
  home: "/",
  about: "/about",
  resume: "/resume",
  projects: "/projects",
  blog: "https://buroojs.substack.com",
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

export function getLegacyRedirect(url: URL): string | undefined {
  const page = url.searchParams.get("page");

  if (page === "project") {
    const projectId = url.searchParams.get("project");
    return projectId !== null
      ? (projectRedirects[projectId] ?? "/projects")
      : undefined;
  }

  return page ? pageRedirects[page] : undefined;
}
