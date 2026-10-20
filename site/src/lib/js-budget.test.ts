import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { firstLoadJs, overBudget } from "./js-budget.ts";

/** A tiny built site: one Lesson page whose island pulls a chunk graph. */
function site(files: Record<string, string>): string {
  const dist = mkdtempSync(join(tmpdir(), "js-budget-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dist, path, ".."), { recursive: true });
    writeFileSync(join(dist, path), text);
  }
  return dist;
}

const LESSON = "organic/orgo-1/structure-bonding/why-carbon/index.html";
const page = (body: string) => `<!doctype html><html><head><script type="module" src="/_astro/page.js"></script></head><body>${body}</body></html>`;
const island = `<astro-island client="load" component-url="/_astro/Player.js" renderer-url="/_astro/client.js"></astro-island>`;

describe("first-load JS of a built page", () => {
  it("counts the page's module scripts, its load islands and everything they import statically, not dynamic imports", () => {
    const dist = site({
      [LESSON]: page(island),
      "_astro/page.js": `console.log(1)`,
      "_astro/Player.js": `import{a}from"./react.js";export{b}from"./store.js";const v=()=>import("./three.js");`,
      "_astro/client.js": `import"./react.js";`,
      "_astro/react.js": `export const a=1`,
      "_astro/store.js": `export const b=2`,
      "_astro/three.js": `export const huge=${"0".repeat(5000)}`,
    });
    const { files } = firstLoadJs(dist, LESSON);
    expect(files).toEqual(["_astro/Player.js", "_astro/client.js", "_astro/page.js", "_astro/react.js", "_astro/store.js"]);
  });

  it("an island that hydrates on view or idle is still first-load; one that only renders on the server is not", () => {
    const dist = site({
      [LESSON]: page(`<astro-island client="visible" component-url="/_astro/Later.js" renderer-url="/_astro/client.js"></astro-island>`),
      "_astro/page.js": ``,
      "_astro/Later.js": ``,
      "_astro/client.js": ``,
    });
    expect(firstLoadJs(dist, LESSON).files).toEqual(["_astro/Later.js", "_astro/client.js", "_astro/page.js"]);
  });

  it("measures bytes gzip-compressed", () => {
    const text = `export const x="${"abc".repeat(300)}"`;
    const dist = site({ [LESSON]: `<script type="module" src="/_astro/a.js"></script>`, "_astro/a.js": text });
    expect(firstLoadJs(dist, LESSON).bytes).toBe(gzipSync(text).length);
  });

  it("names every Lesson page over the limit, with its size and its biggest files", () => {
    const big = Array.from({ length: 4000 }, (_, i) => `v${i * 7919}`).join(",");
    const dist = site({
      [LESSON]: `<script type="module" src="/_astro/big.js"></script>`,
      "organic/orgo-1/structure-bonding/drawing-molecules/index.html": `<script type="module" src="/_astro/small.js"></script>`,
      "organic/orgo-1/structure-bonding/index.html": `<script type="module" src="/_astro/big.js"></script>`,
      "_astro/big.js": `export const big=[${big}]`,
      "_astro/small.js": `export const s=1`,
    });
    const over = overBudget(dist, 1000);
    expect(over).toHaveLength(1);
    expect(over[0]).toMatch(/^organic\/orgo-1\/structure-bonding\/why-carbon\/index\.html: \d+\.\d KB > 1\.0 KB \(_astro\/big\.js \d+\.\d KB\)$/);
  });
});
