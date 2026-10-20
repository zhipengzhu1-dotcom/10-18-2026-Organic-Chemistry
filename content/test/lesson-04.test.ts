// Lesson 4 (#82): the spec's build sanity checks on the cited data, and the start views the
// Lesson's 3D cards open in, checked by projecting the real coordinates.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { project, viewMatrix, type Vec3, type ViewSpec } from "../src/molecule.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const data = organic.data;
const views = parse(readFileSync(join(contentRoot, "organic", "views.yaml"), "utf8")) as Record<string, Record<string, ViewSpec>>;
/** Screen coordinates (x right, y up, z toward the viewer) of a molecule in one of its views. */
const seen = (id: string, view: string) => project(data[id].atoms!.list, viewMatrix(data[id].atoms!.list, views[id][view]));
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** The unit normal of the plane of three projected atoms. */
const normal = (p: Vec3[], [a, b, c]: number[]) => unit(cross(sub(p[a], p[b]), sub(p[c], p[b])));
const deg = (cos: number) => (Math.acos(Math.min(1, Math.abs(cos))) * 180) / Math.PI;

describe("Lesson 4 start views", () => {
  it("ethylene face-on (s07): all six atoms in the screen plane, the C=C level", () => {
    const p = seen("ethylene", "face-on");
    for (const a of p) expect(Math.abs(a[2])).toBeLessThan(0.01);
    expect(Math.abs(p[0][1] - p[1][1])).toBeLessThan(0.01);
  });

  it("ethylene three-quarter (s05): the plane tilted well away from both face-on and edge-on, C=C across", () => {
    const p = seen("ethylene", "three-quarter");
    const tilt = deg(normal(p, [2, 0, 3])[2]);
    expect(tilt).toBeGreaterThan(35);
    expect(tilt).toBeLessThan(70);
    expect(Math.abs(p[1][0] - p[0][0])).toBeGreaterThan(Math.abs(p[1][1] - p[0][1]));
  });

  it("acetylene three-quarter (s09): the axis runs across the screen, turned partly toward the viewer", () => {
    const p = seen("acetylene", "three-quarter");
    const axis = unit(sub(p[2], p[3]));
    expect(deg(axis[2])).toBeGreaterThan(50); // well out of the line of sight
    expect(deg(axis[2])).toBeLessThan(75); // but not flat in the screen
    expect(Math.abs(axis[0])).toBeGreaterThan(Math.abs(axis[1]));
  });

  it("ketene end-on (u1-hyb-ketene-pi): looking straight down the C=C=O axis", () => {
    const p = seen("ketene", "end-on");
    for (const i of [1, 2]) {
      expect(Math.abs(p[i][0] - p[0][0])).toBeLessThan(0.01);
      expect(Math.abs(p[i][1] - p[0][1])).toBeLessThan(0.01);
    }
  });

  it("ketene side (its reveal and poster): C=C=O level across the screen, the H–C–H plane seen a little from above", () => {
    const p = seen("ketene", "side");
    expect(Math.abs(p[2][1] - p[0][1])).toBeLessThan(0.01);
    expect(Math.abs(p[2][2] - p[0][2])).toBeLessThan(0.01);
    const tilt = deg(normal(p, [3, 0, 4])[1]); // angle between the plane's normal and screen up
    expect(tilt).toBeGreaterThan(10);
    expect(tilt).toBeLessThan(40);
  });
});

describe("Lesson 4 follows its spec word for word", () => {
  const spec = readFileSync(join(contentRoot, "..", "..", "docs", "specs", "unit-1", "lesson-04-hybridization-orbitals.md"), "utf8");
  const yaml = (path: string) => parse(readFileSync(join(contentRoot, "organic", path), "utf8"));
  const lessonFile = yaml("lessons/u1-l04.yaml");
  /** Spec text and Lesson text in one form: cites as {file.key} with no unit after, Markdown line breaks as spaces. */
  const norm = (s: string) =>
    s
      .replace(/\{\{([\w-]+)\/([\w.]+)\}\}/g, "{$1.$2}")
      .replace(/(\{[\w.-]+\})(°| Å| degrees| ångströms)/g, "$1")
      .replace(/<br>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  /** The spec's section for one Step or Problem id. */
  const section = (id: string) => {
    const start = spec.indexOf(`### \`${id}\``);
    const end = spec.indexOf("\n### ", start + 4);
    return spec.slice(start, end < 0 ? undefined : end);
  };
  const quoted = (text: string, field: string) => {
    const m = text.match(new RegExp(`\\*\\*${field}:\\*\\* "([\\s\\S]*?)"\\n`));
    return m ? norm(m[1]) : undefined;
  };
  const hintTexts = (text: string) => [...text.matchAll(/^\s*\| [^|]+ \| "(.*)" \|$/gm)].map((m) => norm(m[1]));

  const items: { id: string; body: Record<string, unknown> }[] = [
    ...lessonFile.steps.filter((s: { type?: string }) => s.type).map((s: Record<string, unknown>) => ({ id: `u1-l04-${s.id}`, body: s })),
    ...["u1-hyb-pi-count", "u1-hyb-tap-sp2", "u1-hyb-becl2", "u1-hyb-ketene-pi"].map((id) => ({ id, body: yaml(`problems/${id}.yaml`) })),
  ];

  it.each(items.map((i) => [i.id, i.body] as const))("%s: Prompt, Correct line and Hints", (id, body) => {
    const text = section(id);
    expect(text, `spec section for ${id}`).toContain(id);
    const prompt = quoted(text, "Prompt");
    expect(prompt, `spec Prompt for ${id}`).toBeDefined();
    expect(norm(String(body.prompt ?? body.text))).toBe(prompt);
    const correct = quoted(text, "Correct line");
    if (correct) expect(norm(String(body.correct))).toBe(correct);
    const hints = hintTexts(text);
    if (hints.length) expect(new Set((body.hints as { text: string }[]).map((h) => norm(h.text)))).toEqual(new Set(hints));
  });

  it("the Lesson has the spec's 15 Steps, its signature Step, and the Check Problems in order", () => {
    expect(lessonFile.steps).toHaveLength(15);
    expect(lessonFile.signature).toBe("s07");
    expect(lessonFile.steps.filter((s: { phase: string }) => s.phase === "check").map((s: { problem: string }) => s.problem)).toEqual([
      "u1-hyb-pi-count",
      "u1-hyb-tap-sp2",
      "u1-hyb-becl2",
      "u1-hyb-ketene-pi",
    ]);
  });
});

describe("Lesson 4 sanity checks on the cited data", () => {
  const v = (ref: string) => {
    const [file, key] = ref.split("/");
    return Number(data[file].values[key].value);
  };

  it("the C–C bonds shorten single > double > triple (s10's Rank answer)", () => {
    expect(v("acetylene/r.CC")).toBeLessThan(v("ethylene/r.CC"));
    expect(v("ethylene/r.CC")).toBeLessThan(v("ethane/r.CC"));
  });

  it("every Lesson 4 molecule is experimental (no computed geometry in this Lesson)", () => {
    for (const id of ["methane", "ethane", "ethylene", "acetylene", "ketene"]) expect(data[id].geometry).toBe("experimental");
  });

  it("each stored structure agrees with its cited lengths and angles (0.001 Å, 0.1°), ketene included", () => {
    for (const id of ["methane", "ethane", "ethylene", "acetylene", "ketene"]) {
      const atoms = data[id].atoms!.list;
      const at = (i: number): Vec3 => [atoms[i].x, atoms[i].y, atoms[i].z];
      for (const value of Object.values(data[id].values)) {
        const ids = value.atoms;
        if (!ids) continue;
        if (ids.length === 2) expect(Math.abs(Math.hypot(...sub(at(ids[0]), at(ids[1]))) - Number(value.value))).toBeLessThan(0.001);
        if (ids.length === 3) {
          const [a, b] = [unit(sub(at(ids[0]), at(ids[1]))), unit(sub(at(ids[2]), at(ids[1])))];
          const angle = (Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180) / Math.PI;
          expect(Math.abs(angle - Number(value.value))).toBeLessThan(0.1);
        }
      }
    }
  });
});
