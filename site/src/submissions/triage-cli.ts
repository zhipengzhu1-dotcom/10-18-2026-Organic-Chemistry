// `pnpm triage <command>`: the submissions triage against the LOCAL D1 (site/.wrangler/state),
// for the triage-submissions skill. Prints JSON or text; never sends anything anywhere.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import { contentRoot } from "@astratron/content";
import type { Db } from "./store.ts";
import { accept, draftFix, draftProblem, draftReply, reject, screenOut, startRun, type Outcome } from "./triage.ts";

const USAGE = `pnpm triage <command>
  start                         apply retention, list received rows (JSON, no emails)
  screen-out <id>               screen a row out
  draft <id> <problem.yaml>     add a draft Problem file to the Bank; prints the PR branch and body
  fix <id> "<one-line summary>" record a confirmed Mistake report; prints the fix PR branch and body
  reply <id> accepted|rejected|screened-out   print the one reply as text (nothing is sent)
  accept <id>                   after the PR merged: accept and delete the row
  reject <id>                   after the PR was closed unmerged`;

const site = fileURLToPath(new URL("../../", import.meta.url));
const subjectDir = join(contentRoot, "organic");
const [command, id, arg] = process.argv.slice(2);

const proxy = await getPlatformProxy<{ DB: Db }>({
  configPath: join(site, "wrangler.toml"),
  persist: { path: join(site, ".wrangler/state/v3") },
  remoteBindings: false,
});
const db = proxy.env.DB;
const now = Date.now();
const print = (v: unknown) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));

try {
  if (command === "start") print(await startRun(db, subjectDir, now));
  else if (!id) throw new Error(USAGE);
  else if (command === "screen-out") await screenOut(db, id, now);
  else if (command === "draft" && arg) print(await draftProblem(db, id, readFileSync(arg, "utf8"), { subjectDir, now }));
  else if (command === "fix" && arg) print(await draftFix(db, id, { subjectDir, summary: arg, now }));
  else if (command === "reply" && ["accepted", "rejected", "screened-out"].includes(arg))
    print((await draftReply(db, id, arg as Outcome)) ?? "No reply: the Student left no address.");
  else if (command === "accept") await accept(db, id, now);
  else if (command === "reject") await reject(db, id, now);
  else throw new Error(USAGE);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await proxy.dispose();
}
