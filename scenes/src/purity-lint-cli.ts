// `pnpm lint:scenes`: Scenes stay pure functions of (t, state) (ADR 0001).
import { lintSceneDirs } from "./purity-lint.ts";

const messages = lintSceneDirs();
if (messages.length) {
  console.error(`Scene purity lint: ${messages.length} problem(s). A Scene draws only from (t, state):`);
  for (const message of messages) console.error(`  ${message}`);
  process.exit(1);
}
console.log("Scene purity lint OK: no timers, frame hooks, CSS animation or unseeded randomness in Scene code.");
