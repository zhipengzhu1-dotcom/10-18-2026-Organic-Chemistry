// Valence-electron counts are cited data (ADR 0002): the one VALENCE table every drawing,
// Draw-arrows grade and Scene uses is read from valence-electrons.json, which the build checks.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite } from "../src/data.ts";
import { formalCharge, VALENCE } from "../src/valence.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;

describe("VALENCE", () => {
  it("is exactly the cited valence-electrons table", () => {
    const cited = Object.keys(data["valence-electrons"].values).map((key) => [key.replace(/\.valence$/, ""), cite(data, `valence-electrons/${key}`).value]);
    expect(VALENCE).toEqual(Object.fromEntries(cited));
  });

  it("covers every element a drawing or Scene uses, with its group's count", () => {
    expect(VALENCE).toMatchObject({ H: 1, Li: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Cl: 7, Br: 7, Ne: 8 });
  });

  it("gives formal charge as valence − lone-pair electrons − bonds − H's", () => {
    expect(formalCharge("O", 3, 1)).toBe(-1); // hydroxide O: 3 lone pairs, one bond
    expect(formalCharge("N", 0, 3, 1)).toBe(1); // N with 3 drawn bonds and 1 written H
    expect(formalCharge("B", 0, 3)).toBe(0);
    expect(formalCharge("C", 0, 3, 0)).toBe(1); // a carbocation corner
  });

  it("agrees with the ionization table's outer-electron counts", () => {
    for (const el of ["Li", "Be", "B", "C", "N", "O", "F"])
      expect(VALENCE[el], el).toBe(cite(data, `ionization-li-f/${el}.valence`).value);
  });
});
