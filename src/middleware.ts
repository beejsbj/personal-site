import { defineMiddleware } from "astro:middleware";

const pageRedirects: Record<string, string> = {
  home: "/",
  about: "/about",
  resume: "/resume",
  projects: "/projects",
  garden: "/lab/garden",
  "layout-detail": "/lab/garden",
  e4p: "/lab/e4p",
  "exercise-detail": "/lab/e4p",
  "e4p-in-vue": "/lab/e4p",
  "style-guide": "/lab/style-guide",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const page = url.searchParams.get("page");
  const redirectTo = (pathname: string) => Response.redirect(new URL(pathname, url), 301);

  if (page === "project") {
    const projectId = url.searchParams.get("project");
    if (projectId) {
      return redirectTo(`/projects/${projectId}`);
    }
  }

  if (page && pageRedirects[page]) {
    return redirectTo(pageRedirects[page]);
  }

  return next();
});
