// Step fields Lesson 6 (#84) added for its spec: a Step's own Source note line
// (`source`), a Scene that waits for the answer (`scene.on: answered`), and a
// structure drawn above a Multiple choice Step's choices (`structure`).
import { describe, expect, it } from "vitest";
import { buildContent, type MultipleChoiceStep, type SceneCatalog } from "../src/index.ts";
import { elements, lesson, problem, sampleSteps, validTree, writeTree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";
const catalog: SceneCatalog = { still: { states: {}, data: [] } };

const formaldehyde = {
  id: "formaldehyde",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "O", x: 0, y: 1.5, lp: 2 },
  ],
  bonds: [{ id: "b1", a: "a1", b: "a2", order: 2 }],
};

/** The sample Lesson with s01 and s02 replaced. */
function build(s01: object, s02: object = { type: "explain", text: "Watch." }, extra: (t: Record<string, unknown>) => void = () => {}) {
  const steps: object[] = sampleSteps();
  steps[0] = { ...(steps[0] as object), ...s01 };
  steps[1] = { id: "s02", phase: "build", ...s02 };
  const tree = validTree();
  tree[L] = lesson({ steps });
  tree["chem/data/elements.yaml"] = elements();
  tree["chem/structures/formaldehyde.yaml"] = formaldehyde;
  extra(tree);
  return buildContent(writeTree(tree), { scenes: catalog });
}
const stepsOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;

describe("a Step's Source note line", () => {
  it("reaches the model as `source`, on any Step type", () => {
    const result = build({ source: "Adapted from MIT OCW 5.12, Lecture 2 p. 1." }, { type: "explain", text: "Watch.", source: "Our example." });
    expect(result.errors).toEqual([]);
    const [s01, s02] = stepsOf(result);
    expect(s01.source).toBe("Adapted from MIT OCW 5.12, Lecture 2 p. 1.");
    expect(s02.source).toBe("Our example.");
  });

  it("a Check Step carries its Problem's source", () => {
    const result = build({}, undefined, (t) => (t["chem/problems/p1.yaml"] = problem("p1", { source: "Adapted from MIT OCW 5.12, PS1 Q3c." })));
    expect(result.errors).toEqual([]);
    const check = stepsOf(result).find((s) => s.id === "s08")!;
    expect(check.source).toBe("Adapted from MIT OCW 5.12, PS1 Q3c.");
  });
});

describe("a Scene that waits for the answer", () => {
  it("`on: answered` reaches the resolved Scene; a plain Scene has no `on`", () => {
    const result = build({ scene: { id: "still", on: "answered" } }, { type: "explain", text: "Watch.", scene: "still" });
    expect(result.errors).toEqual([]);
    const [s01, s02] = stepsOf(result);
    expect(s01.scene).toMatchObject({ id: "still", on: "answered" });
    expect(s02.scene).not.toHaveProperty("on");
  });
});

describe("a still Scene", () => {
  it("`still: true` reaches the resolved Scene (one frame, no Play controls)", () => {
    const result = build({}, { type: "explain", text: "The end.", scene: { id: "still", still: true } });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[1].scene).toMatchObject({ id: "still", still: true });
  });
});

describe("a structure above a Multiple choice Step's choices", () => {
  it("resolves the named structure file", () => {
    const result = build({ structure: "formaldehyde" });
    expect(result.errors).toEqual([]);
    const s01 = stepsOf(result)[0] as MultipleChoiceStep;
    expect(s01.structure?.structure.id).toBe("formaldehyde");
    expect(s01.structure?.hide).toEqual([]);
  });

  it("an unknown structure is a build error", () => {
    const result = build({ structure: "no-such-molecule" });
    expect(result.errors).toEqual([`${L}: step s01: structure "no-such-molecule" not found`]);
  });
});
