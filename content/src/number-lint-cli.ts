// `pnpm lint:numbers`: flags chemistry-looking constants typed into Scene code (ADR 0002).
import { lintRepo } from "./number-lint.ts";

const messages = lintRepo();
if (messages.length) {
  console.error(`Chemistry-number lint: ${messages.length} suspect constant(s). Read them from the cited data instead:`);
  for (const message of messages) console.error(`  ${message}`);
  process.exit(1);
}
console.log("Chemistry-number lint OK: no typed-in chemistry constants in Scene code.");
