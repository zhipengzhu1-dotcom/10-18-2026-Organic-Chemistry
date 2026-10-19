// `pnpm structures:json <out.json> <id…>`: writes organic structure files as one
// JSON object (id → structure) for a Scene to import. See structures-json.ts.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentRoot } from "./index.ts";
import { readStructures } from "./structures-json.ts";

const [out, ...ids] = process.argv.slice(2);
if (!out || !ids.length) {
  console.error("usage: pnpm structures:json <out.json> <structure id…>");
  process.exit(1);
}
const file = resolve(process.env.INIT_CWD ?? process.cwd(), out);
writeFileSync(file, `${JSON.stringify(readStructures(contentRoot, "organic", ids), null, 1)}\n`);
console.log(`wrote ${file}`);
