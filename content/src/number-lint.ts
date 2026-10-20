// The chemistry-number lint (ADR 0002): Scene code, the 3D viewer (site/src/molecule)
// and the content module must read bond lengths,
// angles, radii, energies and element colours from the cited data, never type
// them in. Heuristic, so it flags what *looks* like chemistry:
//   - any number (other than 0 and 1) on a line whose identifiers or text
//     name a chemistry quantity (bond, angle, radius, energy, pKa, ...);
//   - any number followed by a chemistry unit (Å, °, pm, eV, kJ, kcal);
//   - any hex colour that is an element colour in the cited elements table.
// Comments are ignored. A line ending in `// cited-data: ok, <reason>` is
// skipped, for the rare number that only looks like chemistry.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent } from "./build.ts";

const contentRoot = fileURLToPath(new URL("../subjects", import.meta.url));

export interface SourceFile {
  path: string;
  text: string;
}

const chemistryWords = new Set([
  "bond", "angle", "dihedral", "radius", "radii", "vdw", "covalent", "angstrom",
  "pka", "energy", "dipole", "electronegativity", "wavelength",
]);
const number = /(?<![\w.#$])\d+(?:\.\d+)?(?![\w.])/g;
const withUnit = /(?<![\w.#$])(\d+(?:\.\d+)?)\s*(?:Å|°|pm(?![A-Za-z])|eV(?![A-Za-z])|kJ(?![A-Za-z])|kcal(?![A-Za-z]))/g;
const hex = /#[0-9a-fA-F]{6}(?![0-9a-fA-F])|0x[0-9a-fA-F]{6}(?![0-9a-fA-F])/g;
const silenced = /\/\/\s*cited-data:\s*ok/;

/**
 * Returns one message per suspect constant, `<path>:<line>: <message>`.
 * `elementColours` maps "#RRGGBB" (upper case) to its label, from the cited elements table.
 */
export function lintChemistryNumbers(files: SourceFile[], elementColours: Record<string, string>): string[] {
  const colours = new Map(Object.entries(elementColours).map(([k, v]) => [k.toUpperCase(), v]));
  const messages: string[] = [];
  for (const file of files) {
    let inBlockComment = false;
    file.text.split("\n").forEach((raw, i) => {
      if (silenced.test(raw)) return;
      let line = raw;
      if (inBlockComment) {
        const end = line.indexOf("*/");
        if (end < 0) return;
        line = line.slice(end + 2);
        inBlockComment = false;
      }
      line = line.replace(/\/\*.*?\*\//g, "");
      const open = line.indexOf("/*");
      if (open >= 0) {
        line = line.slice(0, open);
        inBlockComment = true;
      }
      line = line.replace(/(?<!:)\/\/.*$/, "");

      const at = `${file.path}:${i + 1}: `;
      const found = new Map<number, string>();
      for (const m of line.matchAll(hex)) {
        const label = colours.get(m[0].replace(/^0x/i, "#").toUpperCase());
        if (label) found.set(m.index, `${m[0]} is the ${label} from the cited elements table; read it with elementStyle()`);
      }
      const suspect = (value: string, index: number) => {
        if (!found.has(index)) found.set(index, `${value} looks like a chemistry number typed into Scene code; read it with cite() from the cited data`);
      };
      for (const m of line.matchAll(withUnit)) suspect(m[1], m.index);
      if (namesChemistry(line))
        for (const m of line.matchAll(number)) if (m[0] !== "0" && m[0] !== "1") suspect(m[0], m.index);
      for (const [, message] of [...found].sort(([a], [b]) => a - b)) messages.push(at + message);
    });
  }
  return messages;
}

/** Folders the lint covers, relative to the repo root: Scene code, the 3D viewer and the content module. */
export const sceneCodeDirs = ["scenes/src", "site/src/molecule", "content/src"];

/**
 * Lints every .ts/.tsx/.js/.jsx file (tests excluded) under the Scene code
 * folders against the real cited elements table. Used by `pnpm lint:numbers`.
 */
export function lintRepo(dirs = sceneCodeDirs): string[] {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const organic = buildContent(contentRoot).model?.subjects.find((s) => s.slug === "organic");
  const colours: Record<string, string> = {};
  for (const v of Object.values(organic?.data.elements?.values ?? {}))
    if (v.quantity === "colour") colours[String(v.value)] = v.label;

  const files: SourceFile[] = [];
  const walk = (rel: string) => {
    const abs = join(repo, rel);
    if (!existsSync(abs)) return;
    for (const name of readdirSync(abs).sort()) {
      const child = `${rel}/${name}`;
      if (statSync(join(repo, child)).isDirectory()) walk(child);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && !/\.test\./.test(name))
        files.push({ path: child, text: readFileSync(join(repo, child), "utf8") });
    }
  };
  dirs.forEach(walk);
  return lintChemistryNumbers(files, colours);
}

/** True if any identifier or word on the line, split at camelCase and snake_case, names a chemistry quantity. */
function namesChemistry(line: string): boolean {
  for (const word of line.match(/[A-Za-z]+/g) ?? []) {
    for (const part of word.split(/(?<=[a-z])(?=[A-Z])/)) {
      const p = part.toLowerCase();
      if (chemistryWords.has(p) || (p.endsWith("s") && chemistryWords.has(p.slice(0, -1)))) return true;
    }
  }
  return false;
}
