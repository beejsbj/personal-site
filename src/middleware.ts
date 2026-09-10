import { defineMiddleware } from "astro:middleware";
import { getLegacyRedirect } from "./lib/legacyRedirects";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const legacyRedirect = getLegacyRedirect(url);

  if (legacyRedirect) {
    return Response.redirect(new URL(legacyRedirect, url), 301);
  }

  return next();
});
