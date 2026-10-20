// The built site carries no Tutor (spec #104): it is dev only. `pnpm budget:js` runs this on
// site/dist after its budget check.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PANEL_CLASS, TUTOR_PATH } from "./contract.ts";
import { SYSTEM } from "./route.ts";

/** Text only the Tutor has: its route path, its system prompt's first line, its panel's class. */
const MARKS = [TUTOR_PATH, SYSTEM.split("\n")[0].slice(0, 40), PANEL_CLASS];

/** Built files (relative paths) that carry any trace of the Tutor. */
export function tutorInFiles(dir: string): string[] {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else {
        const text = readFileSync(path, "latin1");
        if (MARKS.some((m) => text.includes(m))) hits.push(relative(dir, path).split("\\").join("/"));
      }
    }
  };
  walk(dir);
  return hits;
}
