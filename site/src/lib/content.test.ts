// md(): Lesson Markdown → HTML, with every number and formula set in the data
// face (JetBrains Mono) so C never reads as O.
import { describe, expect, it } from "vitest";
import { md, renderStep } from "./content.ts";

describe("renderStep", () => {
  it("renders an Explain Step's text as blocks: paragraphs and lists keep their breaks (Lesson 7 s05, s10)", () => {
    const step = renderStep({
      id: "s05",
      phase: "build",
      type: "explain",
      text: "Four **rules**:\n\n1. Full octets.\n2. Fewest charges.\n\nThe first that differs decides.",
    });
    if (step.type !== "explain") throw new Error(step.type);
    expect(step.text).toBe(
      `<p>Four <strong>rules</strong>:</p>\n<ol>\n<li>Full octets.</li>\n<li>Fewest charges.</li>\n</ol>\n<p>The first that differs decides.</p>\n`,
    );
  });

  it("pre-renders a Rank structure card and keeps its text as the plain screen-reader label", () => {
    const structure = {
      id: "methyl-cation",
      style: "full" as const,
      atoms: [
        { id: "a1", el: "C", x: 0, y: 0, charge: 1 },
        { id: "a2", el: "H", x: 1.5, y: 0 },
      ],
      bonds: [{ id: "b1", a: "a1", b: "a2", order: 1 as const }],
    };
    const step = renderStep({
      id: "s09",
      phase: "build",
      type: "rank",
      prompt: "Most important **first**.",
      items: [
        { id: "a", text: "CH₃⁺: a carbon with a +", structure: { structure, hide: [] } },
        { id: "b", text: "a **text** card" },
      ],
      answer: ["a", "b"],
      reveal: "a, b",
    });
    if (step.type !== "rank") throw new Error(step.type);
    expect(step.items[0].text).toBe("CH₃⁺: a carbon with a +");
    expect(step.items[0].structure?.drawn?.svg).toMatch(/^<svg/);
    expect(step.items[1].text).toBe("a <strong>text</strong> card");
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
