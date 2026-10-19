// The Unit page's Level select, rendered to static HTML (as Astro does: no client JS).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent } from "@astratron/content";
import { lesson, sampleSteps, validTree, writeTree } from "../../../content/test/tree.ts";
import LevelSelect from "./LevelSelect.tsx";

function unitPage(): string {
  const tree = validTree();
  const onRampSteps = sampleSteps().filter((s) => !["s04", "s05", "s06", "s07"].includes(s.id));
  tree["chem/lessons/l0.yaml"] = lesson({ id: "l0", slug: "why-carbon", title: "Why Carbon?", onRamp: true, act: "Warm-up", steps: onRampSteps });
  tree["chem/lessons/l1.yaml"] = lesson({ act: "Atoms & bonds" });
  tree["chem/lessons/l2.yaml"] = lesson({ id: "l2", slug: "second", title: "Second Lesson", act: "Atoms & bonds" });
  tree["chem/lessons/l3.yaml"] = lesson({ id: "l3", slug: "orbitals", title: "Orbitals", act: "Capstone", capstone: true });
  (tree["chem/courses/chem-1.yaml"] as { units: { lessons?: string[] }[] }).units[0].lessons = ["l0", "l1", "l2", "l3"];
  const { model, errors } = buildContent(writeTree(tree));
  expect(errors).toEqual([]);
  return renderToStaticMarkup(createElement(LevelSelect, { unit: model!.subjects[0].courses[0].units[0] }));
}

/** The page's visible text, in order, one entry per element that holds text. */
const texts = (html: string) =>
  [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").trim()).filter(Boolean);

describe("Level select", () => {
  it("groups the Lessons into acts, each row with number, title, goal, signature Step type and Step count", () => {
    const shown = texts(unitPage());
    expect(shown.filter((t) => ["Warm-up", "Atoms & bonds", "Capstone", "Final round"].includes(t))).toEqual([
      "Warm-up",
      "Atoms & bonds",
      "Capstone",
      "Final round",
    ]);
    const row = shown.slice(shown.indexOf("Atoms & bonds"), shown.indexOf("Second Lesson") + 1);
    expect(row).toEqual(["Atoms & bonds", "Lesson 1", "Not started", "First Lesson", "Do the first thing.", "Multiple choice", "10 Steps", "Lesson 2", "Not started", "Second Lesson"]);
  });

  it("shows each Lesson's Hook/Build/Check/Wrap bar", () => {
    expect(unitPage()).toContain('aria-label="Hook 1 Step, Build 6 Steps, Check 2 Steps, Wrap 1 Step"');
  });

  it("marks the On-ramp optional with a link that skips it to Lesson 1", () => {
    const html = unitPage();
    expect(texts(html).slice(2, 6)).toEqual(["On-ramp · optional", "Not started", "Why Carbon?", "Do the first thing."]);
    expect(html).toMatch(/<a [^>]*href="\/chem\/chem-1\/unit-one\/first-lesson"[^>]*>Skip the on-ramp<\/a>/);
  });

  it("styles the capstone as a boss level and ends with the Practice Set", () => {
    const shown = texts(unitPage());
    expect(shown.slice(shown.indexOf("Capstone"))).toEqual([
      "Capstone",
      "Lesson 3 · boss level",
      "Not started",
      "Orbitals",
      "Do the first thing.",
      "Multiple choice",
      "10 Steps",
      "Final round",
      "Unit review",
      "Practice Set",
      "10 Problems from the Unit's Bank, easy to hard, covering every Lesson.",
      "Mixed",
      "10 Problems",
      "Opens soon",
    ]);
  });

  it("shows n of N Lessons, not counting the On-ramp, before the browser fills in progress", () => {
    expect(texts(unitPage())[0]).toBe("0 of 3 Lessons");
  });

  it("links each Lesson row to its Lesson page", () => {
    expect(unitPage()).toMatch(/<a [^>]*href="\/chem\/chem-1\/unit-one\/orbitals"[^>]*>Orbitals<\/a>/);
  });
});
