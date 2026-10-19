// Structure files bundled for Scenes. A Scene is a pure component of its props
// and can't read the content tree, so a Scene that draws a Lesson's molecules
// imports a JSON copy of their structure files. The copy is written by
// `pnpm structures:json <out.json> <id…>` and a test keeps it equal to the files,
// so a Scene's frames match the Step's drawing exactly.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Structure } from "./model.ts";
import { structureFile } from "./schema.ts";

/** The named structure files of a Subject, parsed and checked, by id. */
export function readStructures(root: string, subject: string, ids: string[]): Record<string, Structure> {
  return Object.fromEntries(
    ids.map((id) => [id, structureFile.parse(parse(readFileSync(join(root, subject, "structures", `${id}.yaml`), "utf8")))]),
  );
}
