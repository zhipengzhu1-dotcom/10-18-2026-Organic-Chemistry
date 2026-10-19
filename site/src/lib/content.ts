// Build-time access to the course model. A content error fails the site build.
import { buildContent, type Course, type CourseModel, type Lesson, type Step, type Unit } from "@astratron/content";
import { marked } from "marked";
import { drawView } from "./structures.ts";

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
  /** The Unit id (u1, ...), for Mistake reports. */
  unitId: string;
  unitTitle: string;
  unitUrl: string;
  lesson: Lesson;
  /** The next Lesson in the Unit, if any. */
  nextUrl?: string;
}

export function lessonPages(): LessonPage[] {
  return courseModel().subjects.flatMap((s) =>
    s.courses.flatMap((c) =>
      c.units.flatMap((u) =>
        u.lessons.map((lesson, i) => ({
          subject: s.slug,
          course: c.slug,
          unit: u.slug,
          unitId: u.id,
          unitTitle: u.title,
          unitUrl: u.url,
          lesson,
          nextUrl: u.lessons[i + 1]?.url,
        })),
      ),
    ),
  );
}

export interface UnitPage {
  subject: string;
  course: Course;
  unit: Unit;
}

/** Only `available` Units get a page; coming-soon Units can't be entered. */
export function unitPages(): UnitPage[] {
  return courseModel().subjects.flatMap((s) =>
    s.courses.flatMap((course) =>
      course.units.filter((u) => u.status === "available").map((unit) => ({ subject: s.slug, course, unit })),
    ),
  );
}

/** Where a Lesson's answer key is built: a separate file, so answers stay out of the page's HTML. */
export const answerKeyUrl = (subject: string, lessonId: string) => `/answers/${subject}/${lessonId}.json`;

/** Inline Markdown → HTML, done at build time so no Markdown parser ships to the browser. */
export const md = (text: string) => marked.parseInline(text, { async: false });

/** The Lesson with every text field turned from Markdown into HTML and every structure pre-rendered to SVG. */
export function renderLesson(lesson: Lesson): Lesson {
  const step = (s: Step): Step => {
    if (s.type === "explain") return { ...s, text: md(s.text) };
    const shared = { prompt: md(s.prompt), correct: s.correct && md(s.correct), reveal: md(s.reveal) };
    const choices = (list: { id: string; text: string }[]) => list.map((o) => ({ ...o, text: md(o.text) }));
    switch (s.type) {
      case "multiple-choice":
        return {
          ...s,
          ...shared,
          // A structure card's text is its screen-reader label: kept plain; its drawing is pre-rendered SVG.
          options: s.options.map((o) => (o.structure ? { ...o, structure: drawView(o.structure) } : { ...o, text: md(o.text) })),
          hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })),
        };
      case "tap-to-identify":
        return {
          ...s,
          ...shared,
          structure: drawView(s.structure, s.targets),
          hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })),
        };
      case "numeric":
        return { ...s, ...shared, hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })) };
      case "rank":
        return { ...s, ...shared, items: choices(s.items), hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })) };
    }
  };
  return { ...lesson, keyIdea: md(lesson.keyIdea), steps: lesson.steps.map(step) };
}
