// Unit 1's real Problem Bank (#87): with the 24 Practice Problems, every draw covers each core
// Lesson, easy → hard, from Practice Problems alone (no On-ramp or Check Problem needed to reach 10).
// The sample Lessons (`u1-sample*`) are left out of the core list: #88 removes them.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { drawSet } from "../engine/practice-set.ts";
import { coreLessons, drawableBank } from "./practice.ts";

const unit = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.courses[0].units[0];
const core = coreLessons(unit).filter((id) => !id.startsWith("u1-sample"));
const bank = drawableBank(unit).filter((p) => core.includes(p.lesson));

/** A small seeded random source (mulberry32), so each draw can be replayed. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Unit 1's Practice Set draw", () => {
  it("has eight core Lessons and three Practice Problems (difficulty 1, 2, 3) for each, above the floor of 20", () => {
    expect(core).toEqual(["u1-l01", "u1-l02", "u1-l03", "u1-l04", "u1-l05", "u1-l06", "u1-l07", "u1-l08"]);
    const practice = bank.filter((p) => !p.check);
    expect(practice).toHaveLength(24);
    for (const lesson of core) expect(practice.filter((p) => p.lesson === lesson).map((p) => p.difficulty).sort()).toEqual([1, 2, 3]);
  });

  it.each(Array.from({ length: 40 }, (_, i) => i + 1))("seed %i: 10 Practice Problems, every core Lesson, easy → hard", (seed) => {
    const ids = drawSet(bank, core, { random: seeded(seed) });
    const drawn = ids.map((id) => bank.find((p) => p.id === id)!);
    expect(drawn).toHaveLength(10);
    expect(new Set(drawn.map((p) => p.lesson))).toEqual(new Set(core));
    expect(drawn.every((p) => !p.check && !p.onRamp)).toBe(true);
    expect(drawn.map((p) => p.difficulty)).toEqual([...drawn.map((p) => p.difficulty)].sort());
  });
});
