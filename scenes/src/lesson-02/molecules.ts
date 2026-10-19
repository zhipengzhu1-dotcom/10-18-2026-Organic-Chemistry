// Lesson 2's Scenes draw the Lesson's own structure files (bundled as JSON by
// `pnpm structures:json`; content/test/lesson-02.test.ts keeps the copy equal
// to the files), so each Scene's frames match the Step's drawing exactly.
import type { Structure } from "@astratron/content";
import bundled from "./structures.json" with { type: "json" };

export const molecules = bundled as unknown as Record<string, Structure>;

export const molecule = (id: string): Structure => {
  const s = molecules[id];
  if (!s) throw new Error(`Lesson 2 Scenes: no bundled structure "${id}"`);
  return s;
};
