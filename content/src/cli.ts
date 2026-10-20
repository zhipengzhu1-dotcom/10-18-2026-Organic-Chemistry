// `pnpm content:build`: checks the real content tree and prints every error.
import { buildContent, contentRoot } from "./index.ts";

const { model, errors } = buildContent(contentRoot);
if (errors.length) {
  console.error(`Content build failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
const lessons = model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)));
console.log(`Content OK: ${model!.subjects.length} Subject(s), ${lessons.length} Lesson(s).`);
