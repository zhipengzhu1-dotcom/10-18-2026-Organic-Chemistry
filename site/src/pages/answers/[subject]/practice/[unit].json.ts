// Each Unit's Practice Set answer key, keyed by Problem id, built as its own file
// so answers stay out of the Practice Set page's HTML.
import type { APIRoute, GetStaticPaths } from "astro";
import { practicePages, renderStep, type PracticePage } from "../../../../lib/content.ts";
import { splitPractice } from "../../../../lib/practice.ts";

export const getStaticPaths = (() =>
  practicePages().map((page) => ({ params: { subject: page.subject, unit: page.unit.id }, props: page }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { key } = splitPractice((props as PracticePage).unit, renderStep);
  return new Response(JSON.stringify(key), { headers: { "Content-Type": "application/json" } });
};
