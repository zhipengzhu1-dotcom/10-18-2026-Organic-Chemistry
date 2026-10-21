// Scene and island code names colours as design tokens with a fallback, `var(--at-x, #hex)`.
// The fallback is what shows where tokens.css isn't loaded, so it must be the token's own value
// in the single Paper Notebook :root block: one source of truth, no drift.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const tokens = readFileSync(join(repo, "site/src/styles/tokens.css"), "utf8");
const root = tokens.slice(tokens.indexOf(":root"), tokens.indexOf("}", tokens.indexOf(":root")));
const value = new Map([...root.matchAll(/(--at-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => [m[1], m[2].toLowerCase()]));

const long = (hex: string) => (hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex).toLowerCase();

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("token fallbacks", () => {
  it("tokens.css is one :root block, with no theme override to drift from", () => {
    expect(tokens.match(/\{/g)).toHaveLength(1);
    expect(value.size).toBeGreaterThan(0);
  });

  it("every var(--at-…, #hex) fallback in Scenes and islands is that token's :root value", () => {
    const wrong: string[] = [];
    for (const file of [...files(join(repo, "scenes/src")), ...files(join(repo, "site/src"))]) {
      for (const m of readFileSync(file, "utf8").matchAll(/var\((--at-[a-z0-9-]+),\s*(#[0-9a-fA-F]{3,8})\)/g)) {
        const want = value.get(m[1]);
        if (want === undefined || long(m[2]) !== long(want)) wrong.push(`${file.slice(repo.length)}: ${m[0]} (token: ${want ?? "none"})`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
