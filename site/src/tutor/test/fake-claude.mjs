#!/usr/bin/env node
// A stand-in for the `claude` command in the Tutor route tests (Aliquot's fake-claude pattern).
// It writes what it received (arguments, working folder and its files, stdin) to $FAKE_CLAUDE_LOG
// and answers with scripted stream-json lines: the reply written in pieces, then the result.
import { readdirSync, writeFileSync } from "node:fs";

let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (stdin += d));
process.stdin.on("end", () => {
  if (process.env.FAKE_CLAUDE_LOG) {
    writeFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), files: readdirSync(process.cwd()), stdin }));
  }
  const model = process.argv[process.argv.indexOf("--model") + 1];
  const say = (o) => process.stdout.write(JSON.stringify(o) + "\n");
  say({ type: "system", subtype: "init" });
  say({ type: "stream_event", event: { type: "content_block_start", index: 0 } });
  for (const partial_json of ['{"rep', 'ly":"What pulls', " the electrons", '?"}']) {
    say({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "input_json_delta", partial_json } } });
  }
  say({ type: "result", is_error: false, structured_output: { reply: "What pulls the electrons?" }, modelUsage: { [model]: { outputTokens: 12 } } });
});
