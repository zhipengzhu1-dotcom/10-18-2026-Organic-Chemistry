import { describe, expect, it } from "vitest";
import { lintChemistryNumbers, lintRepo } from "../src/number-lint.ts";

const colours = { "#909090": "C colour", "#FF0D0D": "O colour" };
const lint = (text: string) => lintChemistryNumbers([{ path: "scenes/src/Bond.tsx", text }], colours);

describe("chemistry-number lint for Scene code", () => {
  it("flags a number on a line that talks about chemistry", () => {
    expect(lint("const x = 1;\nconst bondLength = 1.09;\nconst hch = { angle: 109.5 };")).toEqual([
      "scenes/src/Bond.tsx:2: 1.09 looks like a chemistry number typed into Scene code; read it with cite() from the cited data",
      "scenes/src/Bond.tsx:3: 109.5 looks like a chemistry number typed into Scene code; read it with cite() from the cited data",
    ]);
  });

  it("flags a number with a chemistry unit, wherever it is", () => {
    expect(lint('<Label text="C–H 1.09 Å" />\n<Label text={`${t}°`} />\n<Label text="−1.5 eV" />')).toEqual([
      "scenes/src/Bond.tsx:1: 1.09 looks like a chemistry number typed into Scene code; read it with cite() from the cited data",
      "scenes/src/Bond.tsx:3: 1.5 looks like a chemistry number typed into Scene code; read it with cite() from the cited data",
    ]);
  });

  it("flags an element colour typed in", () => {
    expect(lint('const carbon = "#909090";\nconst red = 0xff0d0d;')).toEqual([
      "scenes/src/Bond.tsx:1: #909090 is the C colour from the cited elements table; read it with elementStyle()",
      "scenes/src/Bond.tsx:2: 0xff0d0d is the O colour from the cited elements table; read it with elementStyle()",
    ]);
  });

  it("leaves layout, timing and maths numbers alone", () => {
    expect(
      lint(
        [
          "const width = 1.5 * height;",
          "const opacity = 0.8;",
          "const eased = t * t * (3 - 2 * t);",
          "const bonds = ch.map((b, i) => i + 1);",
          'const ink = "#123456";',
          "// the C–H bond is 1.09 Å (a comment, not shown)",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("passes on the repo's Scene code", () => {
    expect(lintRepo()).toEqual([]);
  });

  it("can be silenced on one line with a reason", () => {
    expect(lint("const angle = 90; // cited-data: ok, a screen rotation, not a bond angle")).toEqual([]);
  });
});
