import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { validTree, writeTree } from "./tree.ts";

describe("content build", () => {
  it("resolves a valid tree into the course model", () => {
    const result = buildContent(writeTree(validTree()));

    expect(result.errors).toEqual([]);
    const [subject] = result.model!.subjects;
    expect(subject.slug).toBe("chem");
    expect(subject.title).toBe("Chemistry");
    const [course] = subject.courses;
    expect(course.slug).toBe("chem-1");
    expect(course.units.map((u) => [u.slug, u.status])).toEqual([
      ["unit-one", "available"],
      ["unit-two", "coming-soon"],
    ]);
    const lesson = course.units[0].lessons[0];
    expect(lesson.id).toBe("l1");
    expect(lesson.url).toBe("/chem/chem-1/unit-one/first-lesson");
    expect(lesson.steps.map((s) => s.id)).toEqual([
      "s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10",
    ]);
    const check = lesson.steps[7];
    expect(check).toMatchObject({
      id: "s08",
      phase: "check",
      problemId: "p1",
      type: "multiple-choice",
      prompt: "Question p1",
      answer: ["a"],
    });
  });
});

describe("Source note text", () => {
  it("a Step carries its written Source note; a Check Step carries its Problem's source unless it is Original", () => {
    const tree = validTree();
    const lessonFile = tree["chem/lessons/l1.yaml"] as { steps: Record<string, unknown>[] };
    lessonFile.steps[1] = { ...lessonFile.steps[1], source: "Adapted from MIT OCW 5.12, Lecture 2 p. 4." };
    (tree["chem/problems/p1.yaml"] as Record<string, unknown>).source = "Adapted from MIT OCW 5.12, Problem Set 1 Q6a.";
    const { model, errors } = buildContent(writeTree(tree));
    expect(errors).toEqual([]);
    const steps = model!.subjects[0].courses[0].units[0].lessons[0].steps;
    expect(steps[1].source).toBe("Adapted from MIT OCW 5.12, Lecture 2 p. 4.");
    expect(steps[7].source).toBe("Adapted from MIT OCW 5.12, Problem Set 1 Q6a.");
    expect(steps[8].source).toBeUndefined(); // p2's source is "Original"
  });
});

function errorsFor(edit: (tree: ReturnType<typeof validTree>) => void): string[] {
  const tree = validTree();
  edit(tree);
  const result = buildContent(writeTree(tree));
  expect(result.model).toBeUndefined();
  return result.errors;
}

describe("content build rejects malformed files", () => {
  it("a Lesson Step missing its prompt", () => {
    expect(
      errorsFor((t) => {
        const l = t["chem/lessons/l1.yaml"] as { steps: Record<string, unknown>[] };
        delete l.steps[2].prompt;
      }),
    ).toEqual(["chem/lessons/l1.yaml: steps.2.prompt: Invalid input: expected string, received undefined"]);
  });

  it("a Problem with a difficulty outside 1–3", () => {
    // Reported once, at the Problem; the Check Step using it doesn't repeat the error.
    expect(errorsFor((t) => ((t["chem/problems/p1.yaml"] as { difficulty: number }).difficulty = 4))).toEqual([
      "chem/problems/p1.yaml: difficulty: Invalid input",
    ]);
  });

  it("a course manifest with an unknown Unit status", () => {
    expect(
      errorsFor((t) => {
        const c = t["chem/courses/chem-1.yaml"] as { units: { status: string }[] };
        c.units[1].status = "soon";
      }),
    ).toEqual(['chem/courses/chem-1.yaml: units.1.status: Invalid option: expected one of "available"|"coming-soon"']);
  });

  it("a file that is not YAML", () => {
    const errors = errorsFor((t) => (t["chem/subject.yaml"] = "title: [unclosed"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^chem\/subject\.yaml: not valid YAML: /);
  });

  it("a Lesson whose id does not match its file name", () => {
    expect(errorsFor((t) => ((t["chem/lessons/l1.yaml"] as { id: string }).id = "l9"))).toEqual([
      'chem/lessons/l1.yaml: id "l9" must match the file name',
    ]);
  });

  it("a course manifest listing a Lesson that has no file", () => {
    expect(errorsFor((t) => delete t["chem/lessons/l1.yaml"])).toEqual([
      'chem/courses/chem-1.yaml: unit u1 lists Lesson "l1", which has no file',
    ]);
  });
});

describe("Check Steps resolve to approved Problems", () => {
  it("a Check Step pointing at a draft Problem fails the build", () => {
    expect(errorsFor((t) => ((t["chem/problems/p2.yaml"] as { status: string }).status = "draft"))).toEqual([
      'chem/lessons/l1.yaml: step s09: Check Problem "p2" is draft, not approved',
    ]);
  });

  it("a Check Step pointing at a missing Problem fails the build", () => {
    expect(errorsFor((t) => delete t["chem/problems/p2.yaml"])).toEqual([
      'chem/lessons/l1.yaml: step s09: Check Problem "p2" not found',
    ]);
  });
});
