import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite, elementStyle } from "../src/data.ts";

it("the real content tree builds with no errors", () => {
  const result = buildContent(contentRoot);
  expect(result.errors).toEqual([]);
  const units = result.model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units));
  // v1 ships Unit 1's nine Lessons and its Bank, and nothing else: the build-time sample Lessons
  // and Problems are gone (#88).
  expect(units.flatMap((u) => u.lessons.map((l) => l.id))).toEqual(
    ["u1-l00", "u1-l01", "u1-l02", "u1-l03", "u1-l04", "u1-l05", "u1-l06", "u1-l07", "u1-l08"],
  );
  expect(units.flatMap((u) => u.bank.map((p) => p.id)).filter((id) => /sample/.test(id))).toEqual([]);
});

describe("the real cited data", () => {
  const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;

  it("element colours are Jmol's CPK table, not a library default", () => {
    // Expected values: argbsCpk in Jmol's org/jmol/c/PAL.java.
    const colours = Object.fromEntries(
      ["H", "C", "N", "O", "F", "P", "S", "Cl", "Br", "I"].map((el) => [el, elementStyle(data, el).colour.value]),
    );
    expect(colours).toEqual({
      H: "#FFFFFF", C: "#909090", N: "#3050F8", O: "#FF0D0D", F: "#90E050",
      P: "#FF8000", S: "#FFFF30", Cl: "#1FF01F", Br: "#A62929", I: "#940094",
    });
    expect(elementStyle(data, "C").colour.source.citation).toMatch(/Jmol/);
  });

  it("van der Waals radii are Bondi's (1964)", () => {
    const radii = Object.fromEntries(
      ["H", "C", "N", "O", "F", "P", "S", "Cl", "Br", "I"].map((el) => [el, elementStyle(data, el).vdwRadius.display]),
    );
    expect(radii).toEqual({
      H: "1.20 Å", C: "1.70 Å", N: "1.55 Å", O: "1.52 Å", F: "1.47 Å",
      P: "1.80 Å", S: "1.80 Å", Cl: "1.75 Å", Br: "1.85 Å", I: "1.98 Å",
    });
    expect(elementStyle(data, "H").vdwRadius.source.citation).toContain("doi:10.1021/j100785a001");
  });

  it("covalent radii are Cordero et al.'s (2008), carbon by hybridisation", () => {
    expect(["H", "C.sp3", "C.sp2", "C.sp", "N", "O", "Cl"].map((k) => cite(data, `elements/${k}.covalent`).value)).toEqual([
      0.31, 0.76, 0.73, 0.69, 0.71, 0.66, 1.02,
    ]);
    expect(cite(data, "elements/O.covalent").source.citation).toContain("doi:10.1039/b801115j");
  });

  it("methane's C–H is experimental, from CCCBDB", () => {
    expect(cite(data, "methane/r.CH")).toMatchObject({ display: "1.09 Å", full: "1.087 Å", tier: "experimental" });
    expect(data.methane.atoms!.list).toHaveLength(5);
  });
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
