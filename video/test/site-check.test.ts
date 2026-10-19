// The site ships no Remotion code (ADR 0001; Remotion's licence stays inside video/).
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { remotionDependencies, remotionInFiles } from "../src/site-check.ts";

const repo = fileURLToPath(new URL("../..", import.meta.url));

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "site-check-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

describe("remotionInFiles", () => {
  it("finds Remotion in any built file, naming the file", () => {
    const dist = tree({
      "index.html": "<p>ok</p>",
      "_astro/Lesson.abc.js": 'import{x}from"./chunk.js";var r="remotion";',
      "_astro/other.css": "body{}",
    });
    expect(remotionInFiles(dist)).toEqual(["_astro/Lesson.abc.js"]);
  });

  it("passes a clean build", () => {
    expect(remotionInFiles(tree({ "index.html": "<p>Scenes</p>", "a/b.js": "export{}" }))).toEqual([]);
  });
});

describe("remotionDependencies", () => {
  it("the site and the Scenes it ships depend on no Remotion package", () => {
    expect(remotionDependencies(repo, ["site", "scenes", "content"])).toEqual([]);
  });

  it("names a module that does", () => {
    const root = tree({ "m/package.json": JSON.stringify({ dependencies: { "@remotion/player": "4.0.537" } }) });
    expect(remotionDependencies(root, ["m"])).toEqual(["m/package.json: @remotion/player"]);
  });
});
