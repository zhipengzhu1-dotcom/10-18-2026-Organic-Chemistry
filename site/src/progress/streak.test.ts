// Streak rules, with the clock injected: a day counts after one Lesson or three
// Problems on the Student's local calendar day; up to two freezes cover missed days.
import { describe, expect, it } from "vitest";
import { emptyRecord, recordProblem, saveLesson, streakOn, type ProgressRecord } from "./record.ts";

const day = (d: number, hour = 12, minute = 0) => new Date(2026, 9, d, hour, minute);
const done = { step: "s10", answers: {}, done: true };

function finishLesson(record: ProgressRecord, id: string, now: Date) {
  return saveLesson(record, id, done, now);
}
/** Finishes a fresh Lesson on each given day of October. */
function lessonsOn(...days: number[]): ProgressRecord {
  return days.reduce((r, d, i) => finishLesson(r, `l${i}`, day(d)).record, emptyRecord());
}
const solve = (record: ProgressRecord, id: string, now: Date) =>
  recordProblem(record, id, { tries: 1, correct: true }, now);

describe("Streak", () => {
  it("starts at zero with two freezes", () => {
    expect(streakOn(emptyRecord(), day(19))).toEqual({ count: 0, freezes: 2, today: false });
  });

  it("finishing a Lesson earns the day", () => {
    const { record, earned } = finishLesson(emptyRecord(), "l1", day(19));
    expect(earned).toBe(true);
    expect(streakOn(record, day(19))).toEqual({ count: 1, freezes: 2, today: true });
  });

  it("a second Lesson the same day doesn't earn it again", () => {
    const { record, earned } = finishLesson(lessonsOn(19), "l9", day(19, 20));
    expect(earned).toBe(false);
    expect(streakOn(record, day(19)).count).toBe(1);
  });

  it("returning to a Lesson already done doesn't earn a day", () => {
    const first = finishLesson(emptyRecord(), "l1", day(18)).record;
    const { record, earned } = finishLesson(first, "l1", day(19));
    expect(earned).toBe(false);
    expect(streakOn(record, day(19)).today).toBe(false);
  });

  it("three different Problems earn the day; two don't", () => {
    let record = emptyRecord();
    record = solve(record, "p1", day(19)).record;
    const second = solve(record, "p2", day(19));
    expect(second.earned).toBe(false);
    expect(streakOn(second.record, day(19)).count).toBe(0);
    const third = solve(solve(second.record, "p2", day(19)).record, "p3", day(19));
    expect(third.earned).toBe(true);
    expect(streakOn(third.record, day(19)).count).toBe(1);
  });

  it("Problems from yesterday don't add up with today's", () => {
    let record = solve(solve(emptyRecord(), "p1", day(18, 23, 50)).record, "p2", day(18, 23, 55)).record;
    const result = solve(record, "p3", day(19, 0, 5));
    expect(result.earned).toBe(false);
    record = result.record;
    expect(streakOn(record, day(19)).count).toBe(0);
  });

  it("consecutive local days count up, split at local midnight", () => {
    const record = [day(17, 23, 59), day(18, 0, 1), day(19, 9)].reduce(
      (r, now, i) => finishLesson(r, `l${i}`, now).record,
      emptyRecord(),
    );
    expect(streakOn(record, day(19)).count).toBe(3);
  });

  it("yesterday's Streak still shows today before today is earned", () => {
    expect(streakOn(lessonsOn(17, 18), day(19))).toEqual({ count: 2, freezes: 2, today: false });
  });

  it("a missed day is covered by a freeze automatically", () => {
    const record = lessonsOn(15, 16, 18);
    expect(streakOn(record, day(18))).toEqual({ count: 3, freezes: 1, today: true });
  });

  it("two missed days use both freezes", () => {
    expect(streakOn(lessonsOn(10, 13), day(13))).toEqual({ count: 2, freezes: 0, today: true });
  });

  it("three missed days break the Streak", () => {
    expect(streakOn(lessonsOn(10, 14), day(14))).toEqual({ count: 1, freezes: 2, today: true });
  });

  it("an unearned gap longer than the freezes shows a Streak of zero", () => {
    expect(streakOn(lessonsOn(10, 11), day(15)).count).toBe(0);
    expect(streakOn(lessonsOn(10, 11), day(14)).count).toBe(2);
  });

  it("there are never more than two freezes; a spent one comes back after seven Streak days", () => {
    const spent = lessonsOn(1, 3);
    expect(streakOn(spent, day(3)).freezes).toBe(1);
    const sixMore = lessonsOn(1, 3, 4, 5, 6, 7, 8, 9);
    expect(streakOn(sixMore, day(9)).freezes).toBe(1);
    const sevenMore = lessonsOn(1, 3, 4, 5, 6, 7, 8, 9, 10);
    expect(streakOn(sevenMore, day(10))).toEqual({ count: 9, freezes: 2, today: true });
    const longer = lessonsOn(...Array.from({ length: 20 }, (_, i) => i + 1));
    expect(streakOn(longer, day(20)).freezes).toBe(2);
  });
});
