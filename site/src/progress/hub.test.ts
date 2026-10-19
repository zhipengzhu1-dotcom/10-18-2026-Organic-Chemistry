import { describe, expect, it } from "vitest";
import { continueCard, type CatalogLesson } from "./hub.ts";
import { emptyRecord, saveLesson } from "./record.ts";

const now = new Date(2026, 9, 19, 12);
const lesson = (id: string, title: string, onRamp = false): CatalogLesson => ({
  id,
  title,
  url: `/organic/orgo-1/structure-bonding/${id}`,
  unit: "Unit 1 · Structure & Bonding",
  steps: ["s01", "s02", "s03", "s04"],
  onRamp,
});
const catalog = [lesson("l0", "Why Carbon?", true), lesson("l1", "Bonds"), lesson("l2", "Drawing")];

describe("Hub Continue card", () => {
  it("a first-time visitor has no Continue card", () => {
    expect(continueCard(emptyRecord(), catalog)).toBeNull();
  });

  it("points at the Lesson last played, at the Step the Student left", () => {
    const record = saveLesson(emptyRecord(), "l1", { step: "s03", answers: { s01: [{ choice: ["a"] }] }, done: false }, now).record;
    expect(continueCard(record, catalog)).toEqual({
      title: "Bonds",
      unit: "Unit 1 · Structure & Bonding",
      url: "/organic/orgo-1/structure-bonding/l1",
      where: "Step 3 of 4",
      action: "Resume",
    });
  });

  it("after a finished Lesson, points at the next Lesson not yet done", () => {
    let record = saveLesson(emptyRecord(), "l2", { step: "s04", answers: {}, done: true }, now).record;
    record = saveLesson(record, "l0", { step: "s04", answers: {}, done: true }, now).record;
    expect(continueCard(record, catalog)).toMatchObject({ title: "Bonds", where: "Step 1 of 4", action: "Start" });
  });

  it("when every Lesson is done, offers the last one again", () => {
    let record = emptyRecord();
    for (const l of catalog) record = saveLesson(record, l.id, { step: "s04", answers: {}, done: true }, now).record;
    expect(continueCard(record, catalog)).toMatchObject({ title: "Drawing", action: "Replay" });
  });

  it("a last Lesson that no longer exists falls back to the first Lesson not done", () => {
    const record = saveLesson(emptyRecord(), "gone", { step: "s01", answers: {}, done: false }, now).record;
    expect(continueCard(record, catalog)).toMatchObject({ title: "Why Carbon?", action: "Start" });
  });
});
