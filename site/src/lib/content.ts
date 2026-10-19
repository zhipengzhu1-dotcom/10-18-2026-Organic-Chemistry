// Build-time access to the course model. A content error fails the site build.
import { buildContent, type CourseModel, type Lesson, type Step } from "@astratron/content";
import { marked } from "marked";

/** Set in astro.config.mjs: the real content tree. */
declare const __CONTENT_ROOT__: string;

let cached: CourseModel | undefined;

export function courseModel(): CourseModel {
  if (cached) return cached;
  const { model, errors } = buildContent(__CONTENT_ROOT__);
  if (!model) throw new Error(`Content build failed:\n  ${errors.join("\n  ")}`);
  return (cached = model);
}

export interface LessonPage {
  subject: string;
  course: string;
  unit: string;
  unitTitle: string;
  lesson: Lesson;
}

export function lessonPages(): LessonPage[] {
  return courseModel().subjects.flatMap((s) =>
    s.courses.flatMap((c) =>
      c.units.flatMap((u) =>
        u.lessons.map((lesson) => ({ subject: s.slug, course: c.slug, unit: u.slug, unitTitle: u.title, lesson })),
      ),
    ),
  );
}

/** Inline Markdown → HTML, done at build time so no Markdown parser ships to the browser. */
export const md = (text: string) => marked.parseInline(text, { async: false });

/** The Lesson with every text field turned from Markdown into HTML. */
export function renderLesson(lesson: Lesson): Lesson {
  const step = (s: Step): Step =>
    s.type === "explain"
      ? { ...s, text: md(s.text) }
      : {
          ...s,
          prompt: md(s.prompt),
          options: s.options.map((o) => ({ ...o, text: md(o.text) })),
          correct: s.correct && md(s.correct),
          hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })),
          reveal: md(s.reveal),
        };
  return { ...lesson, keyIdea: md(lesson.keyIdea), steps: lesson.steps.map(step) };
}
