// md(): Lesson Markdown → HTML, with every number and formula set in the data
// face (JetBrains Mono) so C never reads as O.
import { describe, expect, it } from "vitest";
import type { Lesson, Structure } from "@astratron/content";
import { md, renderLesson } from "./content.ts";

describe("renderLesson pre-renders the drawing under a prompt", () => {
  const water: Structure = {
    id: "water",
    style: "line-angle",
    atoms: [{ id: "a1", el: "O", x: 0, y: 0, h: 2, lp: 2 }],
    bonds: [],
  };
  const lesson = {
    id: "l",
    keyIdea: "k",
    steps: [
      {
        id: "s01", phase: "build", type: "numeric", prompt: "How many?", unitSymbol: "lone pairs", answer: 2, tolerance: 0,
        reveal: "2", structure: { structure: water, hide: ["lone-pairs"] },
      },
      {
        id: "s02", phase: "build", type: "multiple-choice", prompt: "Which?", options: [{ id: "a", text: "A" }], answer: ["a"],
        reveal: "A", structure: { structure: water, hide: [] },
      },
    ],
  } as unknown as Lesson;

  it("draws it as SVG at build time, honouring what it hides", () => {
    const [numeric, choice] = renderLesson(lesson).steps as { structure?: { drawn?: { svg: string } } }[];
    expect(numeric.structure?.drawn?.svg).toContain("<svg");
    expect(numeric.structure?.drawn?.svg).not.toContain("lone-pair-dot");
    expect(choice.structure?.drawn?.svg).toContain("lone-pair-dot");
  });
});

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
  });

  it("leaves ordinary words and capitals alone", () => {
    expect(md("A Carbon atom. I think Of course")).toBe("A Carbon atom. I think Of course");
  });

  it("never touches tags, entities or code", () => {
    expect(md("Carbon's **4** bonds")).toBe(`Carbon&#39;s <strong>${d("4")}</strong> bonds`);
    expect(md("`CH4` stays code")).toBe("<code>CH4</code> stays code");
  });
});
