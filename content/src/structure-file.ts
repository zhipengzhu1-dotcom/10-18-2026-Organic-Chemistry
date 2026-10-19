// Reads one committed structure file, for Node tools outside the content
// build (e.g. a Scene that carries its own copy of a few structures).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Structure } from "./model.ts";
import { structureFile } from "./schema.ts";

export function readStructure(root: string, subject: string, id: string): Structure {
  return structureFile.parse(parse(readFileSync(join(root, subject, "structures", `${id}.yaml`), "utf8")));
}
