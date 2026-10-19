import { describe, expect, it } from "vitest";
import {
  CURRENT_VERSION,
  emptyRecord,
  finishPractice,
  practiceOf,
  startPractice,
  exportRecord,
  importRecord,
  lessonStatus,
  loadRecord,
  saveLesson,
  unitCount,
  type ProgressRecord,
} from "./record.ts";

const day = (d: number, hour = 12) => new Date(2026, 9, d, hour);
const midway = { step: "s03", answers: { s01: [{ choice: ["c"] }] }, done: false };
const finished = { step: "s10", answers: { s01: [{ choice: ["c"] }] }, done: true };

/**
 * One saved record per version the site has ever written, exactly as that version wrote it.
 * Add the old shape here before bumping CURRENT_VERSION.
 */
const PAST_RECORDS: Record<number, { stored: unknown; lessons: Record<string, string> }> = {
  1: {
    stored: {
      version: 1,
      lessons: { "u1-l1": { step: "s04", answers: { s03: [{ choice: ["a"] }] }, done: false } },
      problems: {},
      last: "u1-l1",
      streak: { count: 2, lastDay: "2026-10-18", freezes: 2, sinceFreeze: 2 },
      today: { day: "2026-10-18", lessons: ["u1-l0"], problems: [] },
    },
    lessons: { "u1-l1": "in-progress" },
  },
  2: {
    stored: {
      version: 2,
      lessons: { "u1-l1": { step: "s10", answers: { s03: [{ choice: ["a"] }] }, done: true } },
      problems: { "u1-p1": { tries: 1, correct: true } },
      practice: { u1: { draw: ["u1-p1"], done: true } },
      last: "u1-l1",
      streak: { count: 1, lastDay: "2026-10-19", freezes: 2, sinceFreeze: 1 },
      today: { day: "2026-10-19", lessons: ["u1-l1"], problems: [] },
    },
    lessons: { "u1-l1": "done" },
  },
};

describe("Progress record", () => {
  it("a first-time visitor has an empty record", () => {
    expect(loadRecord(null)).toEqual(emptyRecord());
    expect(emptyRecord()).toMatchObject({ version: CURRENT_VERSION, lessons: {}, last: undefined });
  });

  it("an unreadable saved record starts fresh rather than breaking the site", () => {
    expect(loadRecord("{not json")).toEqual(emptyRecord());
    expect(loadRecord('"a string"')).toEqual(emptyRecord());
  });

  it("every past record version migrates to the current one, keeping its Lessons", () => {
    for (let v = 1; v <= CURRENT_VERSION; v++) {
      const past = PAST_RECORDS[v];
      expect(past, `a saved record of version ${v} is missing from PAST_RECORDS`).toBeDefined();
      const record = loadRecord(JSON.stringify(past.stored));
      expect(record.version).toBe(CURRENT_VERSION);
      for (const [id, status] of Object.entries(past.lessons)) expect(lessonStatus(record, id)).toBe(status);
      expect(record.practice).toBeTypeOf("object");
    }
  });

  it("a version 1 record gains an empty Practice Set history", () => {
    expect(loadRecord(JSON.stringify(PAST_RECORDS[1].stored)).practice).toEqual({});
  });

  it("Lessons are keyed by their stable id and show not started, in progress or done", () => {
    let record = emptyRecord();
    record = saveLesson(record, "u1-l1", midway, day(19)).record;
    record = saveLesson(record, "u1-l2", finished, day(19)).record;
    expect(lessonStatus(record, "u1-l0")).toBe("not-started");
    expect(lessonStatus(record, "u1-l1")).toBe("in-progress");
    expect(lessonStatus(record, "u1-l2")).toBe("done");
    expect(record.lessons["u1-l1"]).toEqual(midway);
    expect(record.last).toBe("u1-l2");
  });

  it("a Lesson opened but not yet answered isn't in progress", () => {
    const record = saveLesson(emptyRecord(), "u1-l1", { step: "s01", answers: {}, done: false }, day(19)).record;
    expect(lessonStatus(record, "u1-l1")).toBe("not-started");
  });

  it("a done Lesson stays done when it is replayed", () => {
    let record = saveLesson(emptyRecord(), "u1-l1", finished, day(19)).record;
    record = saveLesson(record, "u1-l1", { ...midway, done: false }, day(19)).record;
    expect(lessonStatus(record, "u1-l1")).toBe("done");
  });

  it("the Unit counts done core Lessons, not the On-ramp", () => {
    let record = emptyRecord();
    for (const id of ["u1-l0", "u1-l1", "u1-l2"]) record = saveLesson(record, id, finished, day(19)).record;
    record = saveLesson(record, "u1-l3", midway, day(19)).record;
    const unit = [
      { id: "u1-l0", onRamp: true },
      { id: "u1-l1", onRamp: false },
      { id: "u1-l2", onRamp: false },
      { id: "u1-l3", onRamp: false },
    ];
    expect(unitCount(record, unit)).toEqual({ done: 2, total: 3 });
  });

  it("keeps each Unit's last Practice Set draw, for the next retake to avoid", () => {
    let record = startPractice(emptyRecord(), "u1", ["p1", "p2"]);
    expect(practiceOf(record, "u1")).toEqual({ draw: ["p1", "p2"], done: false });
    record = startPractice(record, "u1", ["p3"]);
    expect(practiceOf(record, "u1").draw).toEqual(["p3"]);
    expect(practiceOf(record, "u2")).toEqual({ draw: [], done: false });
  });

  it("a finished Practice Set counts toward the Unit and stays done on a retake", () => {
    let record = finishPractice(startPractice(emptyRecord(), "u1", ["p1"]), "u1");
    record = startPractice(record, "u1", ["p2"]);
    expect(practiceOf(record, "u1")).toEqual({ draw: ["p2"], done: true });
    const unit = [{ id: "u1-l1", onRamp: false }];
    expect(unitCount(record, unit, "u1")).toEqual({ done: 0, total: 1, practice: true });
    expect(unitCount(emptyRecord(), unit, "u1")).toEqual({ done: 0, total: 1, practice: false });
  });

  it("export and import round-trip the whole record", () => {
    const record = saveLesson(saveLesson(emptyRecord(), "u1-l1", finished, day(18)).record, "u1-l2", midway, day(19)).record;
    expect(importRecord(exportRecord(record))).toEqual({ record });
  });

  it("import migrates a file exported by an older version", () => {
    const result = importRecord(JSON.stringify(PAST_RECORDS[1].stored));
    expect("record" in result && lessonStatus(result.record, "u1-l1")).toBe("in-progress");
  });

  it("import refuses a file that isn't a progress record", () => {
    expect(importRecord("hello")).toEqual({ error: "That file isn't an AstraTron progress file." });
    expect(importRecord('{"version":1}')).toEqual({ error: "That file isn't an AstraTron progress file." });
    expect(importRecord('{"lessons":{}}')).toEqual({ error: "That file isn't an AstraTron progress file." });
  });

  it("import refuses a file from a newer version of the site", () => {
    const newer: ProgressRecord = { ...emptyRecord(), version: CURRENT_VERSION + 1 as typeof CURRENT_VERSION };
    expect(importRecord(JSON.stringify(newer))).toEqual({
      error: "That file comes from a newer version of AstraTron. Reload the page and try again.",
    });
  });
});
