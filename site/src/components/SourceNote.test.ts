// The Source note under a Step: the written credit (HTML from the build) and the cited numbers' sources.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import SourceNote from "./SourceNote.tsx";

const render = (props: Parameters<typeof SourceNote>[0]) => renderToStaticMarkup(createElement(SourceNote, props));

it("shows a Step's written Source note even when it cites no numbers", () => {
  const html = render({ cited: [], text: "Adapted from MIT OCW 5.12, <em>Lecture 2</em> p. 4." });
  expect(html).toContain("<summary>ⓘ Source</summary>");
  expect(html).toContain("Adapted from MIT OCW 5.12, <em>Lecture 2</em> p. 4.");
});

it("shows nothing when there is neither text nor a cited number", () => {
  expect(render({ cited: [] })).toBe("");
});
