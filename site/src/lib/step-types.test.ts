// The Step type table against every built Step and Problem of the real content (#97): the answer
// key splits and rejoins through each type's secret list without loss or leak.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot, type Step } from "@astratron/content";
import { joinStep, splitStep, stepTypes } from "@astratron/content/step-types";
import { sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { keyText } from "./answer-key.ts";

const { model } = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const units = model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units));
const all: [string, Step][] = [
  ...units.flatMap((u) => u.lessons.flatMap((l) => l.steps.map((s): [string, Step] => [`${l.id}#${s.id}`, s]))),
  ...units.flatMap((u) => u.bank.map((p): [string, Step] => [`problem:${p.id}`, p.step])),
];

describe("the answer key, over every built Step and Problem", () => {
  it("covers every Step type", () => {
    expect(new Set(all.map(([, s]) => s.type))).toEqual(new Set(Object.keys(stepTypes)));
  });

  it("rejoin(split(step)) is the step, through JSON as the page and key files carry them", () => {
    const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));
    for (const [where, step] of all) {
      const { shown, secrets } = splitStep(step);
      expect(joinStep(json(shown), secrets && json(secrets)), where).toEqual(json(step));
    }
  });

  it("no word of the key is on the page side", () => {
    const leaks = all.flatMap(([where, step]) => {
      const { shown, secrets } = splitStep(step);
      const page = JSON.stringify(shown);
      return keyText(secrets ?? {}).filter((t) => page.includes(JSON.stringify(t).slice(1, -1))).map((t) => `${where}: "${t}"`);
    });
    expect(leaks).toEqual([]);
  });

  it("the key's words are what it hides (Hints, Correct lines, reveals; ids and Scenes left out)", () => {
    expect(keyText({ answer: ["a"], correct: "Right.", hints: [{ match: ["b"], text: "Look again." }], revealScene: { id: "x", cited: { r: { source: "S" } } } })).toEqual([
      "Right.",
      "Look again.",
    ]);
    expect(keyText({ stages: [{ prompt: "Drag it.", goal: { bonded: 4 }, correct: "Done.", blocked: "Not yet.", idle: "Try the H." }] })).toEqual(["Done.", "Not yet.", "Try the H."]);
  });
});
