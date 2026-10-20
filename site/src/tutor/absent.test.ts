// The built site carries no Tutor (spec #104): no route path, system prompt or panel code.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorInFiles } from "./absent.ts";

function site(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "tutor-absent-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

describe("tutorInFiles", () => {
  it("names each built file that carries the route path, the system prompt or the panel", () => {
    const dir = site({
      "index.html": "<p>Nothing here</p>",
      "_astro/a.js": 'fetch("/__tutor",{method:"POST"})',
      "_astro/b.js": "const s=`You are the AstraTron Tutor, sitting beside`",
      "_astro/c.css": ".tutor-panel{position:fixed}",
    });
    expect(tutorInFiles(dir)).toEqual(["_astro/a.js", "_astro/b.js", "_astro/c.css"]);
  });

  it("finds nothing in a site without the Tutor", () => {
    expect(tutorInFiles(site({ "index.html": "<p>Ask your teacher</p>", "_astro/a.js": "tutorial()" }))).toEqual([]);
  });
});
