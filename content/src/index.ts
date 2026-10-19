import { fileURLToPath } from "node:url";

export { buildContent, type BuildOptions } from "./build.ts";
export { invalidValue, sameValue } from "./scenes.ts";
export { freezeStepIds } from "./freeze.ts";
export { parseProblem, readBank } from "./bank.ts";
export { readStructure } from "./structure-file.ts";
export type * from "./model.ts";

/** The real content tree: one folder per Subject. */
export const contentRoot = fileURLToPath(new URL("../subjects", import.meta.url));
