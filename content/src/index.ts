import { fileURLToPath } from "node:url";

export { buildContent } from "./build.ts";
export type * from "./model.ts";

/** The real content tree: one folder per Subject. */
export const contentRoot = fileURLToPath(new URL("../subjects", import.meta.url));
