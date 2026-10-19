// The cited values a Scene's manifest names, from the same lookup the site
// uses (ADR 0002), so a video cites exactly what the site cites.
import type { CourseModel } from "@astratron/content";
import { find, type Cited } from "@astratron/content/data";

export function citedFor(model: CourseModel, refs: readonly string[]): Record<string, Cited> {
  const out: Record<string, Cited> = {};
  for (const ref of refs) {
    const hit = model.subjects.map((s) => find(s.data, ref)).find(Boolean);
    if (!hit) throw new Error(`No cited value "${ref}" in any Subject's data`);
    out[ref] = hit;
  }
  return out;
}
