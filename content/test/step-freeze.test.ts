// The Step-id freeze (ADR 0003): once a Lesson's Step ids are frozen in its
// Subject's step-ids.lock.yaml, links to them must keep working.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, freezeStepIds } from "../src/index.ts";
import { lesson, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const frozen = (ids: string[]): Tree => ({ ...validTree(), "chem/step-ids.lock.yaml": { l1: ids } });
const tenIds = sampleSteps().map((s) => s.id);
const LESSON = "chem/lessons/l1.yaml";

/** The sample Lesson with Step `from` renamed to `to`. */
const renamed = (from: string, to: string) =>
  lesson({ steps: sampleSteps().map((s) => (s.id === from ? { ...s, id: to } : s)) });

describe("the Step-id freeze", () => {
  it("a Lesson whose Steps match its frozen ids builds", () => {
    expect(buildContent(writeTree(frozen(tenIds))).errors).toEqual([]);
  });

  it("a renamed Step id fails the build", () => {
    const tree = { ...frozen(tenIds), [LESSON]: renamed("s07", "s11") };
    expect(buildContent(writeTree(tree)).errors).toEqual([
      `${LESSON}: frozen Step id s07 is missing; a deleted Step's id stays under deletedSteps, pointing at the Step its links now open`,
    ]);
  });

  it("reusing a deleted Step's id fails the build", () => {
    const tree = {
      ...frozen([...tenIds, "s11"]),
      [LESSON]: lesson({ deletedSteps: { s11: "s03" }, steps: renamed("s07", "s11").steps }),
    };
    expect(buildContent(writeTree(tree)).errors).toEqual([
      `${LESSON}: frozen Step id s07 is missing; a deleted Step's id stays under deletedSteps, pointing at the Step its links now open`,
      `${LESSON}: Step id s11 belongs to a deleted Step; ids are never reused (the next unused id is s12)`,
    ]);
  });

  it("a new Step must take the next unused id, never one below a frozen id", () => {
    const tree = { ...frozen(["s01", "s02", "s03", "s04", "s05", "s06", "s08", "s09", "s10", "s11"]) };
    expect(buildContent(writeTree(tree)).errors).toEqual([
      `${LESSON}: frozen Step id s11 is missing; a deleted Step's id stays under deletedSteps, pointing at the Step its links now open`,
      `${LESSON}: new Step id s07 is below frozen ids; a new Step takes the next unused id (s12)`,
    ]);
  });

  it("a deleted Step's id still resolves to the Step its old links now open", () => {
    const tree = { ...frozen([...tenIds, "s11"]), [LESSON]: lesson({ deletedSteps: { s11: "s06" } }) };
    const { model, errors } = buildContent(writeTree(tree));
    expect(errors).toEqual([]);
    expect(model!.subjects[0].courses[0].units[0].lessons[0].deletedSteps).toEqual({ s11: "s06" });
  });

  it("a deleted Step's id must point at a live Step", () => {
    const tree = { ...frozen([...tenIds, "s11"]), [LESSON]: lesson({ deletedSteps: { s11: "s12" } }) };
    expect(buildContent(writeTree(tree)).errors).toEqual([
      `${LESSON}: deleted Step id s11 points at s12, which is not one of its Steps`,
    ]);
  });

  it("freezing records every Lesson's Step ids, after which a rename fails", () => {
    const root = writeTree(validTree());
    freezeStepIds(root);
    expect(readFileSync(join(root, "chem/step-ids.lock.yaml"), "utf8")).toContain(`l1: [ ${tenIds.join(", ")} ]`);

    const renamedRoot = writeTree({ ...validTree(), [LESSON]: renamed("s02", "s11") });
    freezeStepIds(renamedRoot);
    expect(buildContent(renamedRoot).errors).toEqual([]);
    const lock = readFileSync(join(renamedRoot, "chem/step-ids.lock.yaml"), "utf8");
    const again = writeTree({ ...validTree(), "chem/step-ids.lock.yaml": lock, [LESSON]: renamed("s02", "s12") });
    expect(buildContent(again).errors).toEqual([
      `${LESSON}: frozen Step id s11 is missing; a deleted Step's id stays under deletedSteps, pointing at the Step its links now open`,
    ]);
  });
});
