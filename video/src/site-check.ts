// The site ships no Remotion code (ADR 0001): Remotion is only the video
// renderer, and its licence stays inside video/. Two checks: no module the
// site ships depends on a Remotion package, and the built site contains no
// trace of it (`pnpm video check-site`, run in CI after the site build).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const isRemotion = (name: string) => name === "remotion" || name.startsWith("@remotion/");

/** Built files (relative paths) whose text mentions Remotion. */
export function remotionInFiles(dir: string): string[] {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/remotion/i.test(readFileSync(path, "latin1"))) hits.push(relative(dir, path).split("\\").join("/"));
    }
  };
  walk(dir);
  return hits;
}

/** `<module>/package.json: <package>` for every Remotion dependency of the given modules. */
export function remotionDependencies(repo: string, modules: string[]): string[] {
  return modules.flatMap((m) => {
    const pkg = JSON.parse(readFileSync(join(repo, m, "package.json"), "utf8"));
    const names = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((k) => Object.keys(pkg[k] ?? {}));
    return names.filter(isRemotion).map((n) => `${m}/package.json: ${n}`);
  });
}
