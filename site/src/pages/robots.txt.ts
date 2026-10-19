// robots.txt lets crawlers in so they can read each page's `noindex`, and names the sitemap.
import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/site.ts";

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`, { headers: { "Content-Type": "text/plain" } });
