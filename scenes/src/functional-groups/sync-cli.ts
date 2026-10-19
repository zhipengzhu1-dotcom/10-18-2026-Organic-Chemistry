// `pnpm --filter @astratron/scenes run sync:structures`: copies the structure
// files Lesson 5's Scenes draw into structures.json (see ids.ts).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contentRoot, readStructure } from "@astratron/content";
import { FG_STRUCTURE_IDS } from "./ids.ts";

const out = Object.fromEntries(FG_STRUCTURE_IDS.map((id) => [id, readStructure(contentRoot, "organic", id)]));
const file = new URL("./structures.json", import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${fileURLToPath(file)} (${FG_STRUCTURE_IDS.length} structures)`);
