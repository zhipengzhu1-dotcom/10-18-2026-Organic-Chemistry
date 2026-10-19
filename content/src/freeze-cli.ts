// `pnpm content:freeze`: freezes every Lesson's current Step ids (ADR 0003).
// Run it before a Lesson's links go public; commit the lock file it writes.
import { contentRoot, freezeStepIds } from "./index.ts";

freezeStepIds(contentRoot);
console.log("Step ids frozen in each Subject's step-ids.lock.yaml.");
