import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { lesson, problem, sampleSteps, validTree, writeTree } from "./tree.ts";

describe("the Course map in the course model", () => {
  it("numbers Units continuously across a Subject's Courses and gives each a URL", () => {
    const tree = validTree();
    tree["chem/courses/chem-2.yaml"] = {
      title: "Chemistry II",
      units: [{ id: "u3", slug: "unit-three", title: "Unit Three", status: "coming-soon" }],
    };
    const { model, errors } = buildContent(writeTree(tree));

    expect(errors).toEqual([]);
    const [subject] = model!.subjects;
    expect(subject.url).toBe("/chem");
    expect(subject.courses.map((c) => [c.title, c.units.map((u) => [u.number, u.title, u.status, u.url])])).toEqual([
      [
        "Chemistry I",
        [
          [1, "Unit One", "available", "/chem/chem-1/unit-one"],
          [2, "Unit Two", "coming-soon", "/chem/chem-1/unit-two"],
        ],
      ],
      ["Chemistry II", [[3, "Unit Three", "coming-soon", "/chem/chem-2/unit-three"]]],
    ]);
  });

  it("gives each Lesson what its Level select row shows", () => {
    const tree = validTree();
    const onRampSteps = sampleSteps().filter((s) => !["s04", "s05", "s06", "s07"].includes(s.id));
    tree["chem/lessons/l0.yaml"] = lesson({ id: "l0", slug: "warm-up", onRamp: true, act: "Warm-up", steps: onRampSteps });
    tree["chem/lessons/l1.yaml"] = lesson({ act: "Atoms", signature: "s06" });
    tree["chem/lessons/l2.yaml"] = lesson({ id: "l2", slug: "boss", act: "Capstone", capstone: true });
    (tree["chem/courses/chem-1.yaml"] as { units: { lessons?: string[] }[] }).units[0].lessons = ["l0", "l1", "l2"];
    const { model, errors } = buildContent(writeTree(tree));

    expect(errors).toEqual([]);
    const rows = model!.subjects[0].courses[0].units[0].lessons.map((l) => ({
      number: l.number,
      act: l.act,
      onRamp: l.onRamp,
      capstone: l.capstone,
      signature: l.signature,
      phases: l.phases,
    }));
    expect(rows).toEqual([
      { number: 0, act: "Warm-up", onRamp: true, capstone: false, signature: "multiple-choice", phases: { hook: 1, build: 2, check: 2, wrap: 1 } },
      { number: 1, act: "Atoms", onRamp: false, capstone: false, signature: "multiple-choice", phases: { hook: 1, build: 6, check: 2, wrap: 1 } },
      { number: 2, act: "Capstone", onRamp: false, capstone: true, signature: "multiple-choice", phases: { hook: 1, build: 6, check: 2, wrap: 1 } },
    ]);
  });

  it("a signature Step that is not in the Lesson fails the build", () => {
    const tree = validTree();
    tree["chem/lessons/l1.yaml"] = lesson({ signature: "s42" });
    expect(buildContent(writeTree(tree)).errors).toEqual(['chem/lessons/l1.yaml: signature Step "s42" is not one of its Steps']);
  });

  it("a new Subject needs only its own content folder and course manifest", () => {
    const tree = {
      ...validTree(),
      "bio/subject.yaml": { title: "Biochemistry" },
      "bio/courses/bio-1.yaml": {
        title: "Biochemistry I",
        units: [{ id: "u1", slug: "amino-acids", title: "Amino Acids", status: "available", lessons: ["l1"] }],
      },
      "bio/lessons/l1.yaml": lesson({ slug: "side-chains", title: "Side Chains" }),
      "bio/problems/p1.yaml": problem("p1"),
      "bio/problems/p2.yaml": problem("p2"),
    };
    const { model, errors } = buildContent(writeTree(tree));

    expect(errors).toEqual([]);
    expect(model!.subjects.map((s) => [s.title, s.url])).toEqual([
      ["Biochemistry", "/bio"],
      ["Chemistry", "/chem"],
    ]);
    const bio = model!.subjects[0].courses[0].units[0];
    expect(bio.lessons.map((l) => [l.title, l.url])).toEqual([["Side Chains", "/bio/bio-1/amino-acids/side-chains"]]);
  });
});
