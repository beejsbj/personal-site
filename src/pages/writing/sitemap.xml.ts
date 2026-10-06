import type { APIRoute } from "astro";
import { getPosts, writingHeaders } from "../../lib/writing";
export const prerender = false;
const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
export const GET: APIRoute = async () => {
  try {
    const posts = await getPosts();
    const urls = [
      "https://burooj.dev/writing/",
      ...posts.map((post) => `https://burooj.dev/writing/${post.slug}/`),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`,
      {
        headers: {
          ...writingHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    );
  } catch {
    return new Response("Writing sitemap temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
};
