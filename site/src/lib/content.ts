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

/**
 * Inline Markdown → HTML, done at build time so no Markdown parser ships to the browser.
 * Numbers and formulas get `<span class="data">` (the data face); see markData.
 */
export const md = (text: string) => markData(marked.parseInline(text, { async: false }));

// Element symbols that turn up in organic chemistry, two-letter ones first.
const EL = "(?:Cl|Br|Na|Mg|Al|Si|Li|Ca|Fe|Zn|Cu|Mn|Cr|Pd|Pt|Sn|Hg|Se|Os|Ni|Ag|Au|Ti|He|Ne|Ar|H|B|C|N|O|F|P|S|K|I)";
const CHUNK = `(?:${EL}[₀-₉]*|\\((?:${EL}[₀-₉]*)+\\)[₀-₉]*)+[⁺⁻]*`;
const DATA = new RegExp(
  `(?<![A-Za-z])${CHUNK}(?:[–=≡]${CHUNK})*(?![a-z])` + // formula: CH₄, H₃C–CH₃, C=O, OH⁻
    `|(?<![\\w.])[−+]?\\d+(?:\\.\\d+)?(?![\\w])`, // number: 4, 1.54, −1.7
  "g",
);
/** A formula needs a subscript, a charge or a bond; a lone capital (I, C) stays prose. */
const isData = (t: string) => /[\d₀-₉⁺⁻–=≡]/.test(t);

/** Wraps numbers and formulas in HTML text (not tags, entities or code) in the data face. */
function markData(html: string): string {
  let inCode = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<code\b/.test(part)) inCode++;
        else if (part === "</code>") inCode--;
        return part;
      }
      if (inCode) return part;
      return part
        .split(/(&[#\w]+;)/)
        .map((t) => (t.startsWith("&") ? t : t.replace(DATA, (m) => (isData(m) ? `<span class="data">${m}</span>` : m))))
        .join("");
    })
    .join("");
}

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
