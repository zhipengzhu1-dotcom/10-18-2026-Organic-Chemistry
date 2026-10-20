// The sitemap: every page, on the one site-address setting (lib/site.ts).
import type { APIRoute } from "astro";
import { courseModel, lessonPages, practicePages, unitPages } from "../lib/content.ts";
import { practiceUrl } from "../lib/practice.ts";
import { sitemapXml } from "../lib/site.ts";

export const GET: APIRoute = () => {
  const paths = [
    "/",
    ...courseModel().subjects.map((s) => s.url),
    ...unitPages().map((p) => p.unit.url),
    ...lessonPages().map((p) => p.lesson.url),
    ...practicePages().map((p) => practiceUrl(p.unit)),
    "/privacy",
    "/submit",
  ];
  return new Response(sitemapXml(paths), { headers: { "Content-Type": "application/xml" } });
};
