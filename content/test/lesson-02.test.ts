// Lesson 2: Drawing Molecules, as built from its merged Lesson spec
// (docs/specs/unit-1/lesson-02-drawing-molecules.md). Shape, Check Problems,
// and the spec's build sanity checks against the cached PubChem records.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot, type Lesson, type Structure } from "../src/index.ts";
import { hydrogenCount } from "../src/valence.ts";
import { readStructures } from "../src/structures-json.ts";
import { sceneCatalog } from "../../scenes/src/manifest-check.ts";
import { sceneManifests } from "../../scenes/src/manifests.ts";
import { watchSceneManifests } from "../../scenes/src/watch.ts";

const { model, errors } = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const organic = model?.subjects.find((s) => s.slug === "organic");
const lesson = organic?.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).find((l) => l.id === "u1-l02") as Lesson;

const pubchemH = (cid: number) => {
  const formula: string = JSON.parse(readFileSync(join(contentRoot, `organic/data/pubchem/${cid}.json`), "utf8")).PropertyTable
    .Properties[0].MolecularFormula;
  return Number(formula.match(/H(\d*)/)![1] || 1);
};

describe("Lesson 2: Drawing Molecules", () => {
  it("builds, with 15 Steps: Hook 1, Build 9, Check 4, Wrap 1", () => {
    expect(errors).toEqual([]);
    expect(lesson.steps).toHaveLength(15);
    expect(lesson.phases).toEqual({ hook: 1, build: 9, check: 4, wrap: 1 });
    expect(lesson.steps.map((s) => s.id)).toEqual(Array.from({ length: 15 }, (_, i) => `s${String(i + 1).padStart(2, "0")}`));
  });

  it("plays its four Check Problems, in the spec's order", () => {
    const checks = lesson.steps.filter((s) => s.phase === "check").map((s) => ("problemId" in s ? s.problemId : undefined));
    expect(checks).toEqual(["u1-draw-n2-kekule", "u1-draw-acrylonitrile", "u1-draw-acetaminophen-lone-pairs", "u1-draw-limonene-h"]);
  });

  it("puts Explain Steps at 2, 4, 7 and 15", () => {
    const explains = lesson.steps.flatMap((s, i) => (s.type === "explain" ? [i + 1] : []));
    expect(explains).toEqual([2, 4, 7, 15]);
  });

  it("states each H count as PubChem's formula has it, and each drawing stands for that many H's", () => {
    const counts = organic!.data["h-counts"].values;
    const cids: Record<string, number> = { estradiol: 5757, cyclohexanone: 7967, limonene: 22311, acrylonitrile: 7855 };
    for (const [name, cid] of Object.entries(cids)) {
      expect(counts[name].value, name).toBe(pubchemH(cid));
      const structure = organic!.courses
        .flatMap((c) => c.units.flatMap((u) => u.lessons.flatMap((l) => l.steps)))
        .flatMap((s) => [...("structure" in s && s.structure ? [s.structure.structure as Structure] : []), ...(s.figures ?? []).map((f) => f.view.structure)])
        .find((st) => st.id === name);
      expect(structure, `${name} is drawn in the Lesson`).toBeDefined();
      expect(hydrogenCount(structure!), name).toBe(pubchemH(cid));
    }
  });

  it("its Scenes draw the very structure files the Steps draw (regenerate with `pnpm structures:json`)", () => {
    const bundled = JSON.parse(readFileSync(join(contentRoot, "../../scenes/src/lesson-02/structures.json"), "utf8"));
    expect(bundled).toEqual(readStructures(contentRoot, "organic", Object.keys(bundled)));
    expect(Object.keys(bundled).sort()).toEqual(
      ["acetaminophen", "acetamide", "chloroethane", "cyclohexanone", "estradiol", "ethanol", "ethanol-lewis", "ethylamine", "limonene"].sort(),
    );
  });

  it("has a cached PubChem record for every drawing that names a PubChem compound, so the build checks it", () => {
    const named = lesson.steps.flatMap((s) => [
      ...("structure" in s && s.structure ? [s.structure.structure] : []),
      ...(s.figures ?? []).map((f) => f.view.structure),
      ...(s.type === "multiple-choice" ? s.options.flatMap((o) => (o.structure ? [o.structure.structure] : [])) : []),
    ]);
    expect(named.length).toBeGreaterThan(10);
    for (const s of named) {
      const cid = s.source?.match(/PubChem CID (\d+)/)?.[1];
      if (cid) expect(existsSync(join(contentRoot, `organic/data/pubchem/${cid}.json`)), s.id).toBe(true);
    }
  });
});
