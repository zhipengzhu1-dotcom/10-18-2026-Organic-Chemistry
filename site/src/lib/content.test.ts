// md(): Lesson Markdown → HTML, with every number and formula set in the data
// face (JetBrains Mono) so C never reads as O.
import { describe, expect, it } from "vitest";
import type { Lesson, MultipleChoiceStep, Structure } from "@astratron/content";
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
  });

  it("leaves ordinary words and capitals alone", () => {
    expect(md("A Carbon atom. I think Of course")).toBe("A Carbon atom. I think Of course");
  });

  it("never touches tags, entities or code", () => {
    expect(md("Carbon's **4** bonds")).toBe(`Carbon&#39;s <strong>${d("4")}</strong> bonds`);
    expect(md("`CH4` stays code")).toBe("<code>CH4</code> stays code");
  });
});

describe("renderLesson", () => {
  const ethanol: Structure = {
    id: "ethanol",
    style: "line-angle",
    atoms: [
      { id: "a1", el: "C", x: 0, y: 0 },
      { id: "a2", el: "C", x: 1.3, y: -0.75 },
      { id: "a3", el: "O", x: 2.6, y: 0, h: 1, lp: 2 },
    ],
    bonds: [
      { id: "b1", a: "a1", b: "a2", order: 1 },
      { id: "b2", a: "a2", b: "a3", order: 1 },
    ],
  };
  const step: MultipleChoiceStep = {
    id: "s08",
    phase: "build",
    type: "multiple-choice",
    prompt: "Which group?",
    figure: [{ text: "Ethanol.", structure: { structure: ethanol, hide: ["lone-pairs"] } }],
    options: [
      { id: "a", text: "alcohol" },
      { id: "b", text: "ether" },
    ],
    answer: ["a"],
    reveal: "Alcohol.",
    sourceNote: "Structure: *PubChem* CID 702.",
  };
  const lesson = { keyIdea: "Read the neighbours.", steps: [step] } as unknown as Lesson;

  it("pre-renders a figure's structures to SVG, keeping its label plain", () => {
    const [fig] = (renderLesson(lesson).steps[0] as MultipleChoiceStep).figure!;
    expect(fig.text).toBe("Ethanol.");
    expect(fig.structure.drawn?.svg).toMatch(/^<svg[^>]*class="structure"/);
    expect(fig.structure.drawn?.svg).toContain(">OH<");
    expect(fig.structure.drawn?.svg).not.toContain("lone-pair-dot");
  });

  it("renders a written Source note's Markdown", () => {
    expect(renderLesson(lesson).steps[0].sourceNote).toBe(`Structure: <em>PubChem</em> CID ${d("702")}.`);
  });
});
