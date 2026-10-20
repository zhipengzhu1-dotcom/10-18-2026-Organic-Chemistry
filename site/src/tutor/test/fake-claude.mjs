#!/usr/bin/env node
// A stand-in for the `claude` command in the Tutor route tests (Aliquot's fake-claude pattern).
// It writes what it received (arguments, working folder and its files, stdin) to $FAKE_CLAUDE_LOG
// and answers with scripted stream-json lines: the reply written in pieces, then the result.
// $FAKE_CLAUDE_MODE picks another script: "slow" (answers after $FAKE_CLAUDE_DELAY ms),
// "exit" (a non-zero exit with stderr lines), "signed-out" (an error result asking to log in),
// "malformed" (lines that aren't stream-json, then a clean exit).
import { readdirSync, writeFileSync } from "node:fs";

let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (stdin += d));
process.stdin.on("end", () => {
  if (process.env.FAKE_CLAUDE_LOG) {
    writeFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), files: readdirSync(process.cwd()), stdin }));
  }
  const mode = process.env.FAKE_CLAUDE_MODE ?? "";
  if (mode === "slow") setTimeout(answer, Number(process.env.FAKE_CLAUDE_DELAY ?? 1000));
  else answer();

  function answer() {
    // FAKE_CLAUDE_ANSWERS_WITH: the model that "answered", as when Claude Code falls back to another.
    const model = process.env.FAKE_CLAUDE_ANSWERS_WITH || process.argv[process.argv.indexOf("--model") + 1];
    const say = (o) => process.stdout.write(JSON.stringify(o) + "\n");
    if (mode === "exit") {
      process.stderr.write("Error: something went wrong\n    at somewhere\n");
      process.exit(3);
    }
    if (mode === "malformed") {
      process.stdout.write('not json at all\n{"type":"stream_event","event":\n');
      return;
    }
    say({ type: "system", subtype: "init" });
    if (mode === "signed-out") {
      say({ type: "result", is_error: true, result: "Invalid API key · Please run /login" });
      process.exit(1);
    }
    say({ type: "stream_event", event: { type: "content_block_start", index: 0 } });
    for (const partial_json of ['{"rep', 'ly":"What pulls', " the electrons", '?"}']) {
      say({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "input_json_delta", partial_json } } });
    }
    say({ type: "result", is_error: false, structured_output: { reply: "What pulls the electrons?" }, modelUsage: { [model]: { outputTokens: 12 } } });
  }
});
