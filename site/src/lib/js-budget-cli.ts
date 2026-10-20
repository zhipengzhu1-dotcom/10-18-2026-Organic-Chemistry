// `pnpm budget:js`: fails when a built Lesson page's first-load JS is over 200 KB compressed (#88).
// Run after the site build (CI runs it after the browser tests build site/dist).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BUDGET_BYTES, firstLoadJs, lessonPages, overBudget } from "./js-budget.ts";

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
if (!existsSync(dist)) {
  console.error("site/dist not found: build the site first (pnpm build).");
  process.exit(1);
}
const pages = lessonPages(dist);
for (const page of pages) console.log(`${(firstLoadJs(dist, page).bytes / 1024).toFixed(1).padStart(6)} KB  ${page}`);
const over = overBudget(dist, BUDGET_BYTES);
if (!pages.length || over.length) {
  console.error(pages.length ? `First-load JS over budget:\n  ${over.join("\n  ")}` : "No Lesson pages found in site/dist.");
  process.exit(1);
}
console.log(`All ${pages.length} Lesson pages load at most ${BUDGET_BYTES / 1024} KB of compressed JS first.`);
