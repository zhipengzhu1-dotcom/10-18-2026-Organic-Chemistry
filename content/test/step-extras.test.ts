// What a Lesson spec gives a Step besides its interaction (#83, Lesson 5):
// a written Source note (credits for wording and structures), a figure (the
// structures a Multiple choice Step shows above its choices), and a reveal
// Scene (a Scene that plays only once the answer is out).
import { describe, expect, it } from "vitest";
import { buildContent, type SceneCatalog } from "../src/index.ts";
import { lesson, problem, sampleSteps, validTree, writeTree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const ethanol = {
  id: "ethanol",
  style: "line-angle",
  smiles: "CCO",
  source: "PubChem CID 702",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.3, y: -0.75 },
    { id: "a3", el: "O", x: 2.6, y: 0, h: 1, lp: 2 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
  ],
};

const catalog: SceneCatalog = {
  spotlight: {
    states: {
      view: {
        kind: "choice",
        label: "Molecule",
        options: [
          { id: "ethanol", label: "Ethanol" },
          { id: "water", label: "Water" },
        ],
        default: "water",
      },
    },
    data: [],
  },
};

/** The sample tree with s03 (a Multiple choice Step) and Problem p1 extended. */
function build(s03: object = {}, p1: object = {}, scenes: SceneCatalog | undefined = catalog) {
  const steps: object[] = sampleSteps();
  steps[2] = { ...(steps[2] as object), ...s03 };
  const tree = validTree();
  tree[L] = lesson({ steps });
  tree["chem/problems/p1.yaml"] = problem("p1", p1);
  tree["chem/structures/ethanol.yaml"] = ethanol;
  return buildContent(writeTree(tree), scenes ? { scenes } : {});
}
const stepsOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;

describe("written Source notes", () => {
  it("a Step keeps its Source note, and a Check Step carries its Problem's", () => {
    const result = build(
      { sourceNote: "Structures: PubChem CID 702." },
      { sourceNote: "Adapted from MIT OCW 5.12, Problem Set 1 Q4." },
    );
    expect(result.errors).toEqual([]);
    const steps = stepsOf(result);
    expect(steps[2]).toMatchObject({ id: "s03", sourceNote: "Structures: PubChem CID 702." });
    expect(steps[7]).toMatchObject({ problemId: "p1", sourceNote: "Adapted from MIT OCW 5.12, Problem Set 1 Q4." });
  });

  it("an Explain Step may carry one too", () => {
    const steps: object[] = sampleSteps();
    steps[1] = { ...(steps[1] as object), sourceNote: "Groups from the MIT OCW 5.12 Functional Groups sheet." };
    const tree = validTree();
    tree[L] = lesson({ steps });
    const result = buildContent(writeTree(tree));
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[1]).toMatchObject({ sourceNote: "Groups from the MIT OCW 5.12 Functional Groups sheet." });
  });
});

describe("figures", () => {
  it("a Multiple choice Step shows its figure's structures, resolved", () => {
    const result = build({
      figure: [{ structure: "ethanol", hide: ["lone-pairs"], text: "Ethanol: CH₃–CH₂–OH." }],
    });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2]).toMatchObject({
      figure: [{ text: "Ethanol: CH₃–CH₂–OH.", structure: { structure: { id: "ethanol" }, hide: ["lone-pairs"] } }],
    });
  });

  it("a Problem's figure is resolved for its Check Step", () => {
    const result = build({}, { figure: [{ structure: "ethanol", text: "Ethanol." }] });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[7]).toMatchObject({ figure: [{ text: "Ethanol.", structure: { structure: { id: "ethanol" }, hide: [] } }] });
  });

  it("a figure naming a missing structure is an error", () => {
    const result = build({ figure: [{ structure: "nope", text: "Missing." }] });
    expect(result.errors).toEqual([`${L}: step s03: structure "nope" not found`]);
  });
});

describe("reveal Scenes", () => {
  it("a Step's reveal Scene is resolved like its Scene", () => {
    const result = build({ revealScene: { id: "spotlight", state: { view: "ethanol" } } });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2]).toMatchObject({ revealScene: { id: "spotlight", state: { view: "ethanol" }, cited: {} } });
  });

  it("a Problem's reveal Scene is resolved for its Check Step, states filled from the defaults", () => {
    const result = build({}, { revealScene: "spotlight" });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[7]).toMatchObject({ revealScene: { id: "spotlight", state: { view: "water" } } });
  });

  it("an unknown reveal Scene or state value is an error, in a Lesson or a Problem", () => {
    const result = build({ revealScene: { id: "spotlight", state: { view: "ice" } } }, { revealScene: "nope" });
    expect(result.errors).toEqual([
      `${L}: step s03: reveal Scene "spotlight" state "view" must be one of ethanol, water`,
      `chem/problems/p1.yaml: reveal Scene "nope" is not in the Scene registry`,
    ]);
  });
});
