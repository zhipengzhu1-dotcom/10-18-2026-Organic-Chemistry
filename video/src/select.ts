// Which Scenes `pnpm video stills|render` renders (#91). No flag: every Scene
// (CI's full run). `--only a,b` (or positional ids): those Scenes. `--changed`:
// the Scenes whose files differ from the merge-base with the default branch, so
// a local run renders only what the branch touched.
//
// A Scene's files: everything under `scenes/src/<id>/` plus every file those
// reach by relative import (shared drawing code such as `scenes/src/structure/`
// counts for each Scene that imports it), and the cited-data files its
// manifest's `data` refs name (`content/subjects/*/data/<file>.*`). A change to
// the shared render path (`renderPaths`) counts for every Scene.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

export type Selection = { kind: "all" } | { kind: "ids"; ids: string[] } | { kind: "changed" };

/** Reads the Scene selection from the command's arguments (after the command name). */
export function parseSelection(rest: readonly string[]): Selection {
  const ids: string[] = [];
  let only = false;
  let changed = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--changed") changed = true;
    else if (arg === "--only" || arg.startsWith("--only=")) {
      const value = arg === "--only" ? rest[++i] : arg.slice("--only=".length);
      if (!value || value.startsWith("--")) throw new Error("--only needs Scene ids: --only <id>[,<id>…]");
      only = true;
      ids.push(...value.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (!arg.startsWith("--")) ids.push(arg);
  }
  if (changed && (only || ids.length)) throw new Error("--changed picks the Scenes itself; drop --only and the Scene ids");
  if (changed) return { kind: "changed" };
  return ids.length ? { kind: "ids", ids: [...new Set(ids)] } : { kind: "all" };
}

/** The error for ids not in the registry, naming every valid id; undefined when all are known. */
export function unknownScenesError(ids: readonly string[], known: readonly string[]): string | undefined {
  const unknown = ids.filter((id) => !known.includes(id));
  if (!unknown.length) return undefined;
  return `Unknown Scene(s): ${unknown.join(", ")}. Scenes: ${[...known].sort().join(", ")}`;
}

/** Files outside a Scene's own code that change every render: the video module's render path, its deps, the site's tokens. */
export const renderPaths: readonly (string | RegExp)[] = [
  /^video\/src\/remotion\//,
  "video/src/render.ts",
  "video/src/browser.ts",
  "video/src/cited.ts",
  "video/src/jobs.ts",
  "video/package.json",
  "site/src/styles/tokens.css",
];

/** The Scenes (in registry order) whose files include a changed file; every Scene when the render path changed. */
export function changedScenes(
  sceneFiles: ReadonlyMap<string, ReadonlySet<string>>,
  changedFiles: readonly string[],
): string[] {
  const ids = [...sceneFiles.keys()];
  const shared = changedFiles.some((f) => renderPaths.some((p) => (typeof p === "string" ? f === p : p.test(f))));
  if (shared) return ids;
  return ids.filter((id) => changedFiles.some((f) => sceneFiles.get(id)!.has(f)));
}

const importSpec = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;

/**
 * Every repo-relative file a Scene's render reads: its folder, the relative-import closure of
 * that folder's code, and the cited-data files its `dataRefs` name.
 */
export function sceneFiles(repo: string, sceneId: string, dataRefs: readonly string[]): Set<string> {
  const files = new Set<string>();
  const queue = listFiles(join(repo, "scenes/src", sceneId)).filter((f) => !/\.test\.tsx?$/.test(f));
  while (queue.length) {
    const abs = queue.pop()!;
    const rel = relative(repo, abs).split("\\").join("/");
    if (files.has(rel) || rel.startsWith("..") || !existsSync(abs)) continue;
    files.add(rel);
    if (!/\.(ts|tsx|js|mjs)$/.test(abs)) continue;
    for (const [, spec] of readFileSync(abs, "utf8").matchAll(importSpec)) queue.push(normalize(join(dirname(abs), spec!)));
  }
  const dataFiles = new Set(dataRefs.map((ref) => ref.slice(0, ref.indexOf("/"))));
  const subjects = join(repo, "content/subjects");
  for (const subject of existsSync(subjects) ? readdirSync(subjects) : []) {
    const dir = join(subjects, subject, "data");
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir))
      if (dataFiles.has(name.replace(/\.[^.]+$/, ""))) files.add(`content/subjects/${subject}/data/${name}`);
  }
  return files;
}

/**
 * Repo-relative files that differ from the merge-base with the default branch (`origin/HEAD`):
 * committed, staged, unstaged and untracked.
 */
export function gitChangedFiles(repo: string): string[] {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  let base: string;
  try {
    base = git("symbolic-ref", "--short", "refs/remotes/origin/HEAD");
  } catch {
    throw new Error("--changed needs origin/HEAD to name the default branch: run `git remote set-head origin --auto`");
  }
  const mergeBase = git("merge-base", "HEAD", base);
  const lists = [git("diff", "--name-only", mergeBase), git("ls-files", "--others", "--exclude-standard")];
  return [...new Set(lists.join("\n").split("\n").filter(Boolean))];
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
