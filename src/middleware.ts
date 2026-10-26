import { defineMiddleware } from "astro:middleware";
import { getLegacyRedirect } from "./lib/legacyRedirects";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const legacyRedirect = getLegacyRedirect(url);

  if (legacyRedirect) {
    // A relative Location: behind Vercel the request URL's host can be the
    // function's own (localhost), which an absolute URL would leak.
    return new Response(null, {
      status: 301,
      headers: { Location: legacyRedirect },
    });
  }

  return next();
});
