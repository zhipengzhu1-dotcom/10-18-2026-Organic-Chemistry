// md(): Lesson Markdown → HTML, with every number and formula set in the data
// face (JetBrains Mono) so C never reads as O.
import { describe, expect, it } from "vitest";
import { md } from "./content.ts";

const d = (s: string) => `<span class="data">${s}</span>`;

describe("md marks numbers and formulas as data", () => {
  it("wraps numbers, including decimals and signs", () => {
    expect(md("A bond of 1.54 Å and 4 bonds")).toBe(`A bond of ${d("1.54")} Å and ${d("4")} bonds`);
    expect(md("an option of just 2")).toBe(`an option of just ${d("2")}`);
    expect(md("pKa −1.7")).toBe(`pKa ${d("−1.7")}`);
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
