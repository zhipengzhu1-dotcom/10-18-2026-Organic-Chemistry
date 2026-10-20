// md(): Lesson Markdown → HTML, with every number and formula set in the data
// face (JetBrains Mono) so C never reads as O.
import { describe, expect, it } from "vitest";
import type { Lesson, Structure } from "@astratron/content";
import { md, renderLesson } from "./content.ts";

const d = (s: string) => `<span class="data">${s}</span>`;

describe("md marks numbers and formulas as data", () => {
  it("wraps numbers, including decimals and signs", () => {
    expect(md("A bond of 1.54 Å and 4 bonds")).toBe(`A bond of ${d("1.54")} Å and ${d("4")} bonds`);
    expect(md("an option of just 2")).toBe(`an option of just ${d("2")}`);
    expect(md("pKa −1.7")).toBe(`pKa ${d("−1.7")}`);
    expect(md("in 3D, sp3 carbon")).toBe(`in ${d("3")}D, sp${d("3")} carbon`);
  });

  it("wraps formulas with subscripts or charges and bond notation", () => {
    expect(md("In methane, CH₄, and water, H₂O.")).toBe(`In methane, ${d("CH₄")}, and water, ${d("H₂O")}.`);
    expect(md("ethane, H₃C–CH₃, has a C–C bond and C=O")).toBe(`ethane, ${d("H₃C–CH₃")}, has a ${d("C–C")} bond and ${d("C=O")}`);
    expect(md("OH⁻ takes H⁺")).toBe(`${d("OH⁻")} takes ${d("H⁺")}`);
    expect(md("Beryllium chloride, BeCl₂, and Cl–Be–Cl")).toBe(`Beryllium chloride, ${d("BeCl₂")}, and ${d("Cl–Be–Cl")}`);
  });

  it("leaves ordinary words and capitals alone", () => {
    expect(md("A Carbon atom. I think Of course")).toBe("A Carbon atom. I think Of course");
  });

  it("never touches tags, entities or code", () => {
    expect(md("Carbon's **4** bonds")).toBe(`Carbon&#39;s <strong>${d("4")}</strong> bonds`);
    expect(md("`CH4` stays code")).toBe("<code>CH4</code> stays code");
  });
});

describe("renderLesson draws a Step's figures and aside tables at build time", () => {
  const fragment: Structure = {
    id: "o",
    style: "full",
    atoms: [
      { id: "a1", el: "O", x: 0, y: 0, lp: 1, charge: 1 },
      { id: "a2", el: "*", x: -1.5, y: 0 },
    ],
    bonds: [{ id: "b1", a: "a1", b: "a2", order: 1 }],
  };
  const figure = {
    view: { structure: fragment, hide: [], highlight: { ring: ["a1"], outline: [] } },
    caption: "O, 1 bond",
    alt: "An oxygen.",
  };
  const lesson = {
    id: "l", slug: "l", title: "L", goal: "g", keyIdea: "k", onRamp: false, number: 1, capstone: false,
    signature: "explain", phases: { hook: 0, build: 1, check: 0, wrap: 0 }, url: "/l",
    steps: [
      {
        id: "s01", phase: "build", type: "explain", text: "Look.",
        figures: [figure],
        aside: { label: "Card", table: { columns: ["+1", "0"], rows: [{ head: "O", cells: [figure, null] }] } },
      },
    ],
  } as Lesson;

  it("pre-renders each figure's SVG, ring included, and renders its caption", () => {
    const [step] = renderLesson(lesson).steps;
    expect(step.figures![0].view.drawn?.svg).toContain('class="atom-ring"');
    expect(step.figures![0].caption).toBe(`O, ${d("1")} bond`);
    expect(step.aside!.table!.rows[0].cells[0]?.view.drawn?.svg).toContain("<svg");
    expect(step.aside!.table!.rows[0].cells[1]).toBeNull();
  });
});
