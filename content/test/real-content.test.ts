import { expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";

it("the real content tree builds with no errors", () => {
  const result = buildContent(contentRoot);
  expect(result.errors).toEqual([]);
  const urls = result.model!.subjects.flatMap((s) =>
    s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => l.url))),
  );
  expect(urls).toContain("/organic/orgo-1/structure-bonding/sample-carbons-four-bonds");
});

it("the Organic Chemistry Course map holds both Courses and all 18 Units, with only Unit 1 open", () => {
  const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
  const map = organic.courses.map((c) => ({
    course: `${c.slug}: ${c.title}`,
    units: c.units.map((u) => `${u.number} ${u.title}${u.status === "available" ? " (open)" : ""}`),
  }));
  expect(map).toEqual([
    {
      course: "orgo-1: Organic Chemistry I",
      units: [
        "1 Structure & Bonding (open)",
        "2 Acids & Bases",
        "3 Alkanes & Conformations",
        "4 Stereochemistry",
        "5 How Reactions Work",
        "6 Alkenes: Addition Reactions",
        "7 Alkynes",
        "8 Substitution & Elimination",
        "9 Aromaticity & EAS",
        "10 Alcohols, Ethers & Epoxides",
      ],
    },
    {
      course: "orgo-2: Organic Chemistry II",
      units: [
        "11 Spectroscopy",
        "12 Conjugation & Diels–Alder",
        "13 Pericyclic Reactions",
        "14 Aldehydes & Ketones",
        "15 Carboxylic Acids & Derivatives",
        "16 Enols & Enolates",
        "17 Amines",
        "18 Biomolecules",
      ],
    },
  ]);
  expect(organic.courses[0].units[0].url).toBe("/organic/orgo-1/structure-bonding");
});
