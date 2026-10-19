// The Scene purity lint (ADR 0001): a Scene is a pure function of (t, state),
// so its code may not use timers, frame hooks, state or effect hooks, CSS or
// SMIL animation, wall clocks, unseeded randomness or Remotion. Comments are
// ignored; a line ending in `// scene-purity: ok, <reason>` is skipped.
// Run by `pnpm lint:scenes` (CI) and by the Vitest suite.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface SourceFile {
  path: string;
  text: string;
}

const rules: [RegExp, string][] = [
  [/\b(setTimeout|setInterval|requestAnimationFrame|requestIdleCallback)\b/g, "a timer; drive motion from t instead"],
  [/\b(useFrame)\b/g, "a frame hook; drive motion from t instead"],
  [
    /\b(useState|useReducer|useEffect|useLayoutEffect|useInsertionEffect)\b/g,
    "state or an effect inside a Scene; take everything from props (t, state)",
  ],
  [/\b(Math\.random)\b/g, "unseeded randomness; use seededRandom(seed)"],
  [/\b(Date\.now|performance\.now|new Date)\b/g, "a wall clock; use t"],
  [/(?<![\w-])(transition|animation)(?=\s*:|["'`]\s*:)|(@keyframes)/g, "a CSS transition or animation; compute the frame from t"],
  [/(<animate)(?:Transform|Motion)?\b/g, "SVG animation; compute the frame from t"],
  [/(["'](?:remotion|@remotion\/[\w-]+)["'])/g, "Remotion stays in the video module; use the helpers in scenes/src/motion.ts"],
];
const silenced = /\/\/\s*scene-purity:\s*ok/;

/** One message per violation, `<path>:<line>: <what>: <why>`. */
export function lintScenePurity(files: SourceFile[]): string[] {
  const messages: string[] = [];
  for (const file of files) {
    let inBlock = false;
    file.text.split("\n").forEach((raw, i) => {
      if (silenced.test(raw)) return;
      let line = raw;
      if (inBlock) {
        const end = line.indexOf("*/");
        if (end < 0) return;
        line = line.slice(end + 2);
        inBlock = false;
      }
      line = line.replace(/\/\*.*?\*\//g, "");
      const open = line.indexOf("/*");
      if (open >= 0) {
        line = line.slice(0, open);
        inBlock = true;
      }
      line = line.replace(/(?<!:)\/\/.*$/, "");
      const found: [number, string][] = [];
      for (const [pattern, why] of rules)
        for (const m of line.matchAll(pattern)) found.push([m.index, `${m[1] ?? m[2] ?? m[3] ?? m[0]}: ${why}`]);
      for (const [, message] of found.sort(([a], [b]) => a - b)) messages.push(`${file.path}:${i + 1}: ${message}`);
    });
  }
  return messages;
}

/** Tool files in scenes/src that are not Scene code (they name the banned APIs). */
const notSceneCode = new Set(["purity-lint.ts", "purity-lint-cli.ts", "check-cli.ts", "manifest-check.ts"]);

/** Lints every Scene source file (tests and tool files excluded) under scenes/src. */
export function lintSceneDirs(dirs = ["scenes/src"]): string[] {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const files: SourceFile[] = [];
  const walk = (rel: string) => {
    if (!existsSync(join(repo, rel))) return;
    for (const name of readdirSync(join(repo, rel)).sort()) {
      const child = `${rel}/${name}`;
      if (statSync(join(repo, child)).isDirectory()) walk(child);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && !/\.test\./.test(name) && !notSceneCode.has(name))
        files.push({ path: child, text: readFileSync(join(repo, child), "utf8") });
    }
  };
  dirs.forEach(walk);
  return lintScenePurity(files);
}
