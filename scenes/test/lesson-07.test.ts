// Lesson 7 (Resonance: Which Contributor Wins) against its merged Lesson spec,
// docs/specs/unit-1/lesson-07-which-contributor-wins.md, the source of truth:
// every Prompt, Correct line, Hint, quoted Reveal, tap-only cue, Source note and
// Scene screen-reader text is read from the spec and compared with the build.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot, type Lesson, type Step } from "@astratron/content";
import { cite } from "@astratron/content/data";
import { sceneManifests } from "../src/manifests.ts";
import { watchSceneManifests } from "../src/watch.ts";
import { sceneCatalog } from "../src/manifest-check.ts";
import { stateAt } from "../src/timeline.ts";

const specText = readFileSync(new URL("../../docs/specs/unit-1/lesson-07-which-contributor-wins.md", import.meta.url), "utf8");
const built = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const organic = built.model?.subjects.find((s) => s.slug === "organic");
const lesson = organic?.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).find((l) => l.id === "u1-l07") as Lesson;
const data = organic?.data ?? {};

/** Collapses whitespace so wrapped spec lines compare with YAML paragraphs. */
const flat = (s: string | undefined) => s?.replace(/\s+/g, " ").trim();
/** The quoted passages of a spec line ("…"), with `{molecule.r_CN} Å` swapped for the cited value. */
function quotes(line: string): string[] {
  return [...line.matchAll(/"([^"]+)"/g)].map((m) =>
    m[1].replace(/\{([a-z-]+)\.r_CN\} Å/g, (_, molecule) => cite(data, `${molecule}/r.CN`).display),
  );
}

interface SpecItem {
  fields: Record<string, string>;
  hints: string[];
}
/** The spec's sections by id (`u1-l07-s04`, `u1-res-enamine-site`): each "- **Field:**" line (with its continuation) and the Hint table's texts. */
function specItems(): Map<string, SpecItem> {
  const items = new Map<string, SpecItem>();
  for (const section of specText.split(/^### /m).slice(1)) {
    const id = section.match(/^`([^`]+)`/)?.[1];
    if (!id) continue; // "### New Scenes"
    const fields: Record<string, string> = {};
    let current: string | undefined;
    const hints: string[] = [];
    for (const line of section.split("\n").slice(1)) {
      const field = line.match(/^- \*\*([^*]+):\*\* ?(.*)$/);
      if (field) {
        current = field[1];
        fields[current] = field[2];
      } else if (/^\s+\|/.test(line)) {
        current = undefined;
        const cells = line.split("|").map((c) => c.trim());
        const text = cells.at(-2)!;
        if (/^".*"$/.test(text)) hints.push(text.slice(1, -1));
      } else if (current && /^ {2}\S/.test(line)) fields[current] += `\n${line.trim()}`;
      else if (!line.trim()) current = undefined;
    }
    items.set(id, { fields, hints });
  }
  return items;
}
const spec = specItems();
const geometryNote = quotes(specText.match(/\*\*Source note \(both Scenes\):\*\* (.*)/)![1])[0];

/** The spec section a Step comes from: its own, or for a Check Step its Problem's. */
const sectionOf = (step: Step) =>
  step.phase === "check" && "problemId" in step ? step.problemId! : `${lesson.id}-${step.id}`;

describe("Lesson 7 builds", () => {
  it("with the Scene registry, and no errors", () => {
    expect(built.errors).toEqual([]);
    expect(lesson).toBeDefined();
  });

  it("15 Steps: Hook, Build ×10, Check ×3, Wrap, in the spec's Step types; signature Rank", () => {
    expect(lesson.steps.map((s) => `${s.id} ${s.phase} ${s.type}`)).toEqual([
      "s01 hook multiple-choice",
      "s02 build draw-arrows",
      "s03 build explain",
      "s04 build multiple-choice",
      "s05 build explain",
      "s06 build multiple-choice",
      "s07 build draw-arrows",
      "s08 build multiple-choice",
      "s09 build rank",
      "s10 build explain",
      "s11 build tap-to-identify",
      "s12 check multiple-choice",
      "s13 check tap-to-identify",
      "s14 check rank",
      "s15 wrap explain",
    ]);
    expect(lesson).toMatchObject({ title: "Resonance: Which Contributor Wins", signature: "rank", act: "Moving electrons" });
  });

  it("its Check Steps play the spec's three Problems, each approved and tagged with this Lesson", () => {
    const checks = lesson.steps.filter((s) => s.phase === "check").map((s) => ("problemId" in s ? s.problemId : undefined));
    expect(checks).toEqual(["u1-res-major-dimethylaniline", "u1-res-enamine-site", "u1-res-rank-methoxyacrylonitrile"]);
    const bank = organic!.courses[0].units[0].bank.filter((p) => p.lesson === lesson.id);
    expect(bank.map((p) => [p.id, p.status, p.difficulty, p.check])).toEqual([
      ["u1-res-enamine-site", "approved", 2, true],
      ["u1-res-major-dimethylaniline", "approved", 1, true],
      ["u1-res-rank-methoxyacrylonitrile", "approved", 3, true],
    ]);
  });
});

describe("Lesson 7 matches its spec", () => {
  for (const id of ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "s11", "s12", "s13", "s14", "s15"]) {
    it(`${id}: prompt, Correct line, Hints, quoted Reveal, tap-only cue and Source note`, () => {
      const step = lesson.steps.find((s) => s.id === id)!;
      const { fields, hints } = spec.get(sectionOf(step))!;
      const prompt = quotes(fields.Prompt.replace(/\n/g, " "))[0];
      expect(flat(step.type === "explain" ? step.text : step.prompt)).toBe(flat(prompt));
      if (step.type === "explain") return;

      if (fields["Correct line"]) expect(step.correct).toBe(quotes(fields["Correct line"])[0]);
      expect(step.hints?.map((h) => h.text) ?? []).toEqual(hints);
      // A Rank reveal's quoted per-card notes are the cards' tags; any other quote is in the reveal text.
      const tags = step.type === "rank" ? Object.values(step.revealTags ?? {}) : [];
      for (const quote of quotes(fields.Reveal ?? "")) expect([step.reveal, ...tags].some((t) => t.includes(quote)), quote).toBe(true);
      if (step.type === "rank" && /tagged/.test(fields.Reveal)) expect(step.answer.map((id) => step.revealTags?.[id])).toEqual(quotes(fields.Reveal));
      if (fields["Tap-only cue"]) {
        const [idle, drag] = quotes(fields["Tap-only cue"]);
        expect(step.type === "tap-to-identify" && step.tapOnly).toEqual({ idle, drag });
      }

      const note = fields["Source note"];
      if (note.startsWith("n/a")) expect(step.source).toBeUndefined();
      else {
        const wanted = [...quotes(note), ...(/Geometry/.test(note) ? [geometryNote] : [])];
        expect(wanted.length).toBeGreaterThan(0);
        for (const quote of wanted) expect(step.source).toContain(quote);
      }
    });
  }

  it("Explain Steps' Source notes (s03, s05) match too", () => {
    for (const id of ["s03", "s05"]) {
      const step = lesson.steps.find((s) => s.id === id)!;
      const note = spec.get(`${lesson.id}-${id}`)!.fields["Source note"];
      for (const quote of quotes(note)) expect(step.source).toContain(quote);
    }
  });

  it("Rank cards start in the spec's order and the answer is the spec's", () => {
    const rank = (id: string) => lesson.steps.find((s) => s.id === id)!;
    const s09 = rank("s09");
    const s14 = rank("s14");
    if (s09.type !== "rank" || s14.type !== "rank") throw new Error("not Rank");
    expect([s09.items.map((i) => i.id), s09.answer]).toEqual([["c", "a", "b"], ["a", "b", "c"]]);
    expect([s14.items.map((i) => i.id), s14.answer]).toEqual([["c", "a", "d", "b"], ["a", "b", "c", "d"]]);
    expect(s14.items.every((i) => i.structure)).toBe(true);
  });

  it("each Scene's screen-reader text is the spec's", () => {
    const describeAt = (id: string, state: Record<string, string | number>, t: number) =>
      sceneManifests.find((m) => m.id === id)!.describe(state, t);
    const screenReader = (stepId: string) => quotes(spec.get(`${lesson.id}-${stepId}`)!.fields.Scene.split("Screen reader:")[1])[0];
    const at = (stepId: string) => lesson.steps.find((s) => s.id === stepId)!.scene!;
    const posterOf = (id: string) => sceneManifests.find((m) => m.id === id)!.poster.t;

    const s01 = at("s01");
    expect(s01.id).toBe("amide-cn-lengths");
    expect(describeAt(s01.id, { ...s01.state, ...s01.onAnswer }, posterOf(s01.id))).toBe(screenReader("s01"));
    expect(at("s03").id).toBe("amide-hybrid");
    expect(describeAt("amide-hybrid", {}, 0)).toBe(screenReader("s03"));
    expect(at("s15")).toMatchObject({ id: "amide-hybrid", still: true });
    expect(describeAt("amide-hybrid", {}, posterOf("amide-hybrid"))).toBe(screenReader("s15"));
    expect(at("s05")).toMatchObject({ id: "rule-ladder", state: { rung: "all" } });
    expect(describeAt("rule-ladder", { rung: "all" }, posterOf("rule-ladder"))).toBe(screenReader("s05"));
    expect(at("s10").id).toBe("carbonyl-sites");
    expect(describeAt("carbonyl-sites", {}, posterOf("carbonyl-sites"))).toBe(screenReader("s10"));
  });

  it("the Hook's Scene hides the lengths until the Student answers (the spec's 'plays on reveal')", () => {
    const s01 = lesson.steps[0].scene!;
    expect(s01).toMatchObject({ state: { molecule: "all", labels: "hidden" }, onAnswer: { labels: "shown" } });
    const manifest = sceneManifests.find((m) => m.id === "amide-cn-lengths")!;
    expect(manifest.describe(s01.state, manifest.poster.t)).not.toMatch(/Å|\d/);
    expect(stateAt(manifest, 0)).toBeDefined();
  });
});
