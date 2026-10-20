// The first-load JS budget (#88): every Lesson page (and each Unit's Practice Set page)
// ships at most 200 KB of compressed JavaScript before a Student does anything. First
// load = the page's module scripts, every island's component and renderer, and all they
// import statically. Dynamic imports (three.js, orbital meshes, Draw arrows when a Step
// needs it) load later, so they don't count. `pnpm budget:js` runs it on site/dist in CI.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { gzipSync } from "node:zlib";

export const BUDGET_BYTES = 200 * 1024;

/** Static `import … from "x"`, `import "x"` and `export … from "x"` specifiers (not `import("x")`). */
const STATIC = /(?:^|[;{}\s)])(?:import|export)\s*(?:[\w$*{}\s,]*?\s*from\s*)?["'`]([^"'`]+)["'`]/g;

/** Root-relative path (`_astro/x.js`) of `spec` imported from `from` (also root-relative). */
const resolve = (from: string, spec: string) =>
  spec.startsWith("/") ? spec.slice(1) : posix.normalize(posix.join(posix.dirname(from), spec));

export function firstLoadJs(dist: string, page: string): { files: string[]; bytes: number } {
  const html = readFileSync(join(dist, page), "utf8");
  const queue: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)) queue.push(resolve(page, m[1]));
  for (const m of html.matchAll(/<script\b[^>]*\btype="module"[^>]*>([\s\S]*?)<\/script>/g))
    for (const s of m[1].matchAll(STATIC)) queue.push(resolve(page, s[1]));
  for (const m of html.matchAll(/<astro-island\b[^>]*>/g))
    for (const url of m[0].matchAll(/\b(?:component|renderer|before-hydration)-url="([^"]+)"/g)) if (url[1]) queue.push(resolve(page, url[1]));
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file) || !file.endsWith(".js")) continue;
    seen.add(file);
    for (const s of readFileSync(join(dist, file), "utf8").matchAll(STATIC)) queue.push(resolve(file, s[1]));
  }
  const files = [...seen].sort();
  return { files, bytes: files.reduce((n, f) => n + gzipSync(readFileSync(join(dist, f))).length, 0) };
}

/** Lesson-depth pages: `<subject>/<course>/<unit>/<lesson>/index.html`. */
export function lessonPages(dist: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "index.html") {
        const rel = relative(dist, path).split("\\").join("/");
        if (rel.split("/").length === 5 && !rel.startsWith("_astro/")) out.push(rel);
      }
    }
  };
  walk(dist);
  return out;
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** "page: size > limit (biggest files)" for every Lesson page over `limit` compressed bytes. */
export function overBudget(dist: string, limit = BUDGET_BYTES): string[] {
  return lessonPages(dist).flatMap((page) => {
    const { files, bytes } = firstLoadJs(dist, page);
    if (bytes <= limit) return [];
    const sized = files
      .map((f) => ({ f, n: gzipSync(readFileSync(join(dist, f))).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map(({ f, n }) => `${f} ${kb(n)}`);
    return [`${page}: ${kb(bytes)} > ${kb(limit)} (${sized.join(", ")})`];
  });
}

