import { expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";

it("the real content tree builds with no errors", () => {
  const result = buildContent(contentRoot);
  expect(result.errors).toEqual([]);
  const urls = result.model!.subjects.flatMap((s) =>
    s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => l.url))),
  );
  expect(urls).toContain("/organic/orgo-1/structure-bonding/sample-carbons-four-bonds");
});
