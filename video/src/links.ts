// `pnpm video links <lesson>` (story 112): each Step's id, phase, the opening
// of its Prompt and its deep link (the Lesson URL + `#<step id>`, ADR 0003),
// so a video description can link into the Lesson.
import type { CourseModel, Lesson, Phase } from "@astratron/content";

export interface StepLink {
  id: string;
  phase: Phase;
  opening: string;
  link: string;
}

const MAX = 80;

/** The first sentence of a Prompt as plain text, cut at a word to 80 characters. */
export function promptOpening(markdown: string): string {
  const plain = markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const end = plain.search(/[.?!](\s|$)/);
  const sentence = end < 0 ? plain : plain.slice(0, end + 1);
  if (sentence.length <= MAX) return sentence;
  const cut = sentence.slice(0, MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : MAX).replace(/[\s,;:]+$/, "")}…`;
}

/** The Lesson with this id or slug, and its Step links; `origin` (e.g. the public site) is put before each path. */
export function lessonLinks(model: CourseModel, lessonIdOrSlug: string, origin = ""): { lesson: Lesson; links: StepLink[] } {
  const lessons = model.subjects.flatMap((s) => s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)));
  const lesson = lessons.find((l) => l.id === lessonIdOrSlug || l.slug === lessonIdOrSlug);
  if (!lesson) throw new Error(`No Lesson "${lessonIdOrSlug}". Lessons: ${lessons.map((l) => l.id).join(", ")}`);
  const prefix = origin.replace(/\/+$/, "");
  return {
    lesson,
    links: lesson.steps.map((step) => ({
      id: step.id,
      phase: step.phase,
      opening: promptOpening(step.type === "explain" ? step.text : step.prompt),
      link: `${prefix}${lesson.url}#${step.id}`,
    })),
  };
}

export function formatLinks({ lesson, links }: { lesson: Lesson; links: StepLink[] }): string {
  return [
    `${lesson.title} (${lesson.id})`,
    "id\tphase\tprompt\tlink",
    ...links.map((l) => [l.id, l.phase, l.opening, l.link].join("\t")),
  ].join("\n");
}
