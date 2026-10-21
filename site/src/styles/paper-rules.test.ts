// The Paper Notebook's drawing rules (#117) checked in the site's style sheets: a marker fill always
// sits inside a pen line and text on a fill is pen ink; exits leave faster than entries and a press
// takes the press step; corners and offset shadows come from tokens, not hand-typed one-offs.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SHEETS = {
  global: "./global.css",
  structure: "../components/structure.css",
  explore: "../explore/explore.css",
  tutor: "../tutor/tutor.css",
} as const;
const source = (sheet: keyof typeof SHEETS) => readFileSync(new URL(SHEETS[sheet], import.meta.url), "utf8");

interface Rule {
  sheet: string;
  selectors: string[];
  decls: Map<string, string>;
}

/** The innermost rules of a sheet (at-rule wrappers like @layer and @media dropped), comments stripped. */
function rules(sheet: keyof typeof SHEETS): Rule[] {
  const css = source(sheet).replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Rule[] = [];
  const stack: { head: string; leaf: boolean; start: number }[] = [];
  let from = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (stack.length) stack[stack.length - 1].leaf = false;
      stack.push({ head: css.slice(from, i).trim(), leaf: true, start: i + 1 });
      from = i + 1;
    } else if (css[i] === "}") {
      const block = stack.pop()!;
      if (block.leaf && !block.head.startsWith("@")) {
        const decls = new Map<string, string>();
        for (const d of css.slice(block.start, i).split(/;(?![^(]*\))/)) {
          const at = d.indexOf(":");
          if (at > 0) decls.set(d.slice(0, at).trim(), d.slice(at + 1).trim().replace(/\s+/g, " "));
        }
        out.push({ sheet, selectors: block.head.split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, " ")), decls });
      }
      from = i + 1;
    } else if (css[i] === ";" && !stack.at(-1)?.leaf) {
      from = i + 1;
    }
  }
  return out;
}

const all = (Object.keys(SHEETS) as (keyof typeof SHEETS)[]).flatMap(rules);
/** A declaration of the (unique) rule for `selector`, across all sheets. */
function decl(selector: string, prop: string): string | undefined {
  const hits = all.filter((r) => r.selectors.includes(selector) && r.decls.has(prop));
  return hits.at(-1)?.decls.get(prop);
}
const where = (r: Rule, prop: string) => `${r.sheet}: ${r.selectors.join(", ")} { ${prop}: ${r.decls.get(prop)} }`;
const FILL = /var\(--at-[a-z]+-fill\b/;
const PEN = /var\(--at-(ink|blue|green|pink|violet|orange)\)/;

describe("a marker fill always sits inside a pen line", () => {
  it("no 3D-card overlay strokes a marker fill as a bare line", () => {
    const bare = all
      .filter((r) => r.selectors.some((s) => s.includes(".molecule-")) && FILL.test(r.decls.get("stroke") ?? ""))
      .map((r) => where(r, "stroke"));
    expect(bare).toEqual([]);
  });

  it("every 3D-card overlay shape filled with marker has a pen-ink outline", () => {
    const loose = all
      .filter((r) => r.selectors.some((s) => s.includes(".molecule-")) && FILL.test(r.decls.get("fill") ?? ""))
      .filter((r) => !PEN.test(r.decls.get("stroke") ?? ""))
      .map((r) => where(r, "fill"));
    expect(loose).toEqual([]);
  });

  it("the overlay picks, cursor, tags, dipoles and net arrow are drawn in pen ink", () => {
    for (const s of [".molecule-pick", ".molecule-cursor", ".molecule-tag path", ".molecule-tag rect", ".molecule-tag-angle path", ".molecule-tag-angle rect", ".molecule-dipole line", ".molecule-net line", ".molecule-sheet"])
      expect(decl(s, "stroke"), s).toMatch(PEN);
  });

  it("no checkbox, radio or range is tinted with a marker fill (accent-color is pen ink)", () => {
    const tinted = all.filter((r) => r.decls.has("accent-color")).map((r) => where(r, "accent-color"));
    expect(tinted.length).toBeGreaterThan(0);
    for (const t of tinted) expect(t).toMatch(/accent-color: var\(--at-(blue|ink)\) \}$/);
  });

  it("the ✓ on a Tap pick (text on a marker fill) is pen ink", () => {
    expect(decl(".picked-ring text", "fill")).toBe("var(--at-ink)");
  });
});

describe("exits leave faster than entries; a press takes the press step", () => {
  const exit = "var(--at-dur-exit) var(--at-step-exit)";
  const ui = "var(--at-dur-ui) var(--at-step-ui)";
  const press = "var(--at-dur-press) var(--at-step-press)";

  it("a Unit tile lifts at ui, settles back at exit and presses at press", () => {
    expect(decl(".tile", "transition")).toBe(`transform ${exit}, box-shadow ${exit}`);
    expect(decl(".tile.open:hover", "transition")).toBe(`transform ${ui}, box-shadow ${ui}`);
    expect(decl(".tile.open:active", "transition")).toBe(`transform ${press}, box-shadow ${press}`);
  });

  it("a choice's marker tint comes in at ui and goes at exit", () => {
    expect(decl(".opt", "transition")).toBe(`transform ${press}, background-color ${exit}`);
    expect(decl('.opt[aria-pressed="true"]', "transition")).toContain(`background-color ${ui}`);
  });
});

describe("hand-drawn corners and offset shadows come from tokens", () => {
  it("no border-radius is a hand-typed one-off (wobble tokens, a circle, square or inherit only)", () => {
    const oneOff = all
      .filter((r) => r.decls.has("border-radius"))
      .filter((r) => !/^(var\(--at-wobble[\w-]*\)|50%|0|inherit)$/.test(r.decls.get("border-radius")!))
      .map((r) => where(r, "border-radius"));
    expect(oneOff).toEqual([]);
  });

  it("no offset shadow is hand-typed (Npx Npx 0 var(--at-…) uses a --at-drop-offset token)", () => {
    const typed = all
      .filter((r) => /-?\d+px -?\d+px 0 var\(--at-/.test(r.decls.get("box-shadow") ?? ""))
      .map((r) => where(r, "box-shadow"));
    expect(typed).toEqual([]);
  });

  it("an aside's backdrop is the ink token mixed, with no dead fallbacks on drop spots", () => {
    expect(decl("dialog.aside::backdrop", "background")).toBe("color-mix(in srgb, var(--at-ink) 45%, transparent)");
    expect(decl(".drop-spot .spot", "fill")).toBe("var(--at-blue-fill)");
  });
});
