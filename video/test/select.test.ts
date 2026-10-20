// Which Scenes a local `pnpm video stills` renders (#91): --only, --changed, or all (CI).
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sceneManifests } from "@astratron/scenes/manifests";
import { piTwist } from "../../scenes/src/pi-twist/manifest.ts";
import { changedScenes, parseSelection, sceneFiles, unknownScenesError } from "../src/select.ts";

const repo = fileURLToPath(new URL("../..", import.meta.url));

describe("parseSelection", () => {
  it("renders every Scene with no flag (CI's full run)", () => {
    expect(parseSelection([])).toEqual({ kind: "all" });
    expect(parseSelection(["--sources-only"])).toEqual({ kind: "all" });
  });

  it("takes --only ids, comma-separated, with = or a space, alongside positional ids", () => {
    expect(parseSelection(["--only", "pi-twist"])).toEqual({ kind: "ids", ids: ["pi-twist"] });
    expect(parseSelection(["--only=pi-twist,mo-filler"])).toEqual({ kind: "ids", ids: ["pi-twist", "mo-filler"] });
    expect(parseSelection(["dots-and-sticks", "--only", "pi-twist, dots-and-sticks"])).toEqual({
      kind: "ids",
      ids: ["dots-and-sticks", "pi-twist"],
    });
  });

  it("takes --changed alone", () => {
    expect(parseSelection(["--changed"])).toEqual({ kind: "changed" });
    expect(() => parseSelection(["--changed", "--only", "pi-twist"])).toThrow(/--changed/);
    expect(() => parseSelection(["--changed", "pi-twist"])).toThrow(/--changed/);
  });

  it("rejects --only with no ids", () => {
    expect(() => parseSelection(["--only"])).toThrow(/--only needs Scene ids/);
    expect(() => parseSelection(["--only", "--changed"])).toThrow(/--only needs Scene ids/);
  });
});

describe("unknownScenesError", () => {
  it("names the unknown ids and lists every valid one", () => {
    const known = sceneManifests.map((m) => m.id);
    expect(unknownScenesError(["pi-twist"], known)).toBeUndefined();
    const error = unknownScenesError(["pi-twist", "pi-twirl"], known)!;
    expect(error).toMatch(/^Unknown Scene\(s\): pi-twirl\. Scenes: /);
    for (const id of known) expect(error).toContain(id);
  });
});

describe("sceneFiles", () => {
  const files = sceneFiles(repo, piTwist.id, piTwist.data);

  it("holds the Scene's folder and the shared code it imports", () => {
    expect(files).toContain("scenes/src/pi-twist/manifest.ts");
    expect(files).toContain("scenes/src/pi-twist/PiTwist.tsx");
    expect(files).toContain("scenes/src/types.ts");
    expect([...files].every((f) => !f.endsWith(".test.ts"))).toBe(true);
  });

  it("holds the cited-data files its manifest names", () => {
    expect(files).toContain("content/subjects/organic/data/ethylene.json");
    expect(files).toContain("content/subjects/organic/data/elements.yaml");
    expect(files).not.toContain("content/subjects/organic/data/acetate.json");
  });

  it("leaves out other Scenes' folders", () => {
    expect([...files].some((f) => f.startsWith("scenes/src/mo-filler/"))).toBe(false);
  });
});

describe("changedScenes", () => {
  const files = new Map([
    ["pi-twist", new Set(["scenes/src/pi-twist/PiTwist.tsx", "scenes/src/motion.ts"])],
    ["mo-filler", new Set(["scenes/src/mo-filler/MoFiller.tsx", "scenes/src/motion.ts"])],
  ]);

  it("picks the Scenes that hold a changed file", () => {
    expect(changedScenes(files, ["scenes/src/pi-twist/PiTwist.tsx", "README.md"])).toEqual(["pi-twist"]);
    expect(changedScenes(files, ["scenes/src/motion.ts"])).toEqual(["pi-twist", "mo-filler"]);
  });

  it("is empty when no Scene's files changed", () => {
    expect(changedScenes(files, ["site/src/pages/index.astro", "docs/dev/video.md"])).toEqual([]);
    expect(changedScenes(files, [])).toEqual([]);
  });

  it("picks every Scene when the shared render path changed", () => {
    for (const f of ["video/src/remotion/Root.tsx", "video/src/render.ts", "site/src/styles/tokens.css", "video/package.json"])
      expect(changedScenes(files, [f])).toEqual(["pi-twist", "mo-filler"]);
    expect(changedScenes(files, ["video/src/links.ts"])).toEqual([]);
  });
});
