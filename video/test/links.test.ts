// `pnpm video links <lesson>` (story 112): each Step's id, phase, Prompt opening
// and deep link, for video descriptions.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { formatLinks, lessonLinks, promptOpening } from "../src/links.ts";

const model = buildContent(contentRoot).model!;
const base = "/organic/orgo-1/structure-bonding/sample-carbons-four-bonds";

describe("lessonLinks", () => {
  it("lists every Step of a Lesson, found by id, with its phase, Prompt opening and deep link", () => {
    const { lesson, links } = lessonLinks(model, "u1-sample");
    expect(lesson.title).toBe("Sample: Carbon's Four Bonds");
    expect(links.length).toBe(lesson.steps.length);
    expect(links[0]).toEqual({
      id: "s01",
      phase: "hook",
      opening: "Carbon sits at the centre of almost every molecule in your body.",
      link: `${base}#s01`,
    });
    // Explain Steps open with their text, Markdown stripped and cited numbers filled in.
    expect(links[1]).toMatchObject({ id: "s02", phase: "build", opening: "A covalent bond is a pair of electrons shared between two atoms." });
  });

  it("finds a Lesson by its slug too, and prefixes the site origin when given", () => {
    const { links } = lessonLinks(model, "sample-carbons-four-bonds", "https://example.org/");
    expect(links[0]!.link).toBe(`https://example.org${base}#s01`);
  });

  it("names the Lessons it knows when the Lesson isn't found", () => {
    expect(() => lessonLinks(model, "nope")).toThrow(/No Lesson "nope".*u1-sample/s);
  });

  it("prints one tab-separated line per Step under a header", () => {
    const text = formatLinks(lessonLinks(model, "u1-sample"));
    const lines = text.split("\n");
    expect(lines[0]).toBe("Sample: Carbon's Four Bonds (u1-sample)");
    expect(lines[1]).toBe("id\tphase\tprompt\tlink");
    expect(lines[2]).toBe(`s01\thook\tCarbon sits at the centre of almost every molecule in your body.\t${base}#s01`);
  });
});

describe("promptOpening", () => {
  it("keeps the first sentence", () => {
    expect(promptOpening("Twist one end. Then press **Check**.")).toBe("Twist one end.");
  });

  it("cuts a long first sentence at a word, with an ellipsis", () => {
    const long = "Which of these structures shows every carbon atom with exactly four bonds and every hydrogen atom with exactly one bond";
    const out = promptOpening(long);
    expect(out.length).toBeLessThanOrEqual(81);
    expect(out.endsWith("…")).toBe(true);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
  });

  it("strips Markdown emphasis, code and links", () => {
    expect(promptOpening("Tap the *most* `acidic` [proton](https://x.y).")).toBe("Tap the most acidic proton.");
  });

  it("doesn't end a sentence at a decimal point", () => {
    expect(promptOpening("Each C–H bond is 1.09 Å long. Next.")).toBe("Each C–H bond is 1.09 Å long.");
  });
});
