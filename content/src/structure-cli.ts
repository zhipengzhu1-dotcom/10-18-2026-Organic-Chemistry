// `pnpm structure <subject> <id> "<SMILES>" [--style full|lewis|line-angle] [--source "PubChem CID 750"]`
// Lays a structure out with RDKit.js and writes <subject>/structures/<id>.yaml,
// then prints its atom and bond ids, which Tap answers and Hints name.
// Edit the written file to add screen-reader `label`s or `letter: true`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Document, YAMLMap, YAMLSeq } from "yaml";
import { contentRoot } from "./index.ts";
import { layoutStructure } from "./layout.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { style: { type: "string", default: "full" }, source: { type: "string" } },
});
const [subject, id, smiles] = positionals;
const style = values.style as "full" | "lewis" | "line-angle";
if (!subject || !id || !smiles || !["full", "lewis", "line-angle"].includes(style)) {
  console.error('usage: pnpm structure <subject> <id> "<SMILES>" [--style full|lewis|line-angle] [--source "…"]');
  process.exit(1);
}

const structure = await layoutStructure({ id, smiles, style, source: values.source });
const doc = new Document(structure);
for (const key of ["atoms", "bonds"]) {
  const seq = doc.get(key);
  if (seq instanceof YAMLSeq) for (const item of seq.items) if (item instanceof YAMLMap) item.flow = true;
}
doc.commentBefore = ` Laid out by RDKit.js ${"(`pnpm structure`)"}; drawn by the site's own renderer.`;

const dir = join(contentRoot, subject, "structures");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${id}.yaml`);
writeFileSync(file, doc.toString({ lineWidth: 0 }));

console.log(`wrote ${file}`);
for (const a of structure.atoms) {
  const bonds = structure.bonds.filter((b) => b.a === a.id || b.b === a.id).map((b) => `${b.id}→${b.a === a.id ? b.b : b.a}`);
  console.log(`  ${a.id.padEnd(4)} ${a.el}${a.h ? `H${a.h}` : ""}${a.charge ? ` (${a.charge > 0 ? "+" : ""}${a.charge})` : ""}  ${bonds.join(" ")}`);
}
