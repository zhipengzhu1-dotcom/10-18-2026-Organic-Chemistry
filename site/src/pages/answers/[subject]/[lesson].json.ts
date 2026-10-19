// Each Lesson's answer key, built as its own file so answers, Hints and reveals
// stay out of the Lesson page's HTML. The Step player fetches it (see answer-key.ts).
import type { APIRoute, GetStaticPaths } from "astro";
import { lessonPages, renderLesson, type LessonPage } from "../../../lib/content.ts";
import { splitLesson } from "../../../lib/answer-key.ts";

export const getStaticPaths = (() =>
  lessonPages().map((page) => ({ params: { subject: page.subject, lesson: page.lesson.id }, props: page }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { key } = splitLesson(renderLesson((props as LessonPage).lesson));
  return new Response(JSON.stringify(key), { headers: { "Content-Type": "application/json" } });
};
