// Lesson 5's Scenes' copy of their structure files (see ids.ts).
import type { Structure } from "@astratron/content";
import data from "./structures.json" with { type: "json" };
import type { FgStructureId } from "./ids.ts";

export const fgStructures = data as unknown as Record<FgStructureId, Structure>;
