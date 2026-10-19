// `pnpm blender render [matcap|share-site|share-unit-1 …]`: renders headless with the local
// Blender and commits-ready writes each output plus its record (sha256 of every input and output).
// `pnpm blender check`: the CI gate; re-hashes the recorded inputs, no Blender needed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  BLENDER,
  BLENDER_VERSION,
  RENDER_NAMES,
  blenderProps,
  checkBlenderRenders,
  propsPath,
  propsText,
  recordPath,
  renderPlan,
  renderRecord,
  repoRoot,
  type RenderName,
} from "./render.ts";

const [command, ...args] = process.argv.slice(2);

if (command === "check") {
  const errors = checkBlenderRenders();
  if (errors.length) {
    console.error(`Blender renders are stale (${errors.length}):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`Blender renders OK: ${RENDER_NAMES.join(", ")} match their recorded inputs.`);
} else if (command === "render") {
  if (!existsSync(BLENDER)) throw new Error(`Blender ${BLENDER_VERSION} not found at ${BLENDER}`);
  const version = execFileSync(BLENDER, ["--version"], { encoding: "utf8" }).split("\n")[0].replace(/^Blender\s+/, "").trim();
  if (!version.startsWith(BLENDER_VERSION)) throw new Error(`Blender is ${version}; the renders are pinned to ${BLENDER_VERSION}`);
  const names = (args.length ? args : RENDER_NAMES) as RenderName[];
  for (const name of names) {
    if (!RENDER_NAMES.includes(name)) throw new Error(`unknown render "${name}" (one of ${RENDER_NAMES.join(", ")})`);
    const { script, outputs } = renderPlan(name);
    for (const out of outputs) mkdirSync(dirname(join(repoRoot, out)), { recursive: true });
    const blenderArgs = ["-b", "--factory-startup", "-noaudio", "-P", join(repoRoot, script), "--"];
    if (name === "matcap") blenderArgs.push(join(repoRoot, outputs[0]));
    else {
      writeFileSync(join(repoRoot, propsPath(name)), propsText(blenderProps(name)));
      blenderArgs.push(join(repoRoot, propsPath(name)), join(repoRoot, outputs[0]), repoRoot);
    }
    console.log(`Rendering ${name} with Blender ${version}…`);
    execFileSync(BLENDER, blenderArgs, { stdio: ["ignore", "ignore", "inherit"] });
    writeFileSync(join(repoRoot, recordPath(name)), `${JSON.stringify(renderRecord(name, version), null, 2)}\n`);
    console.log(`  wrote ${outputs.join(", ")} and ${recordPath(name)}`);
  }
} else {
  console.error("usage: pnpm blender render [matcap|share-site|share-unit-1 …] | pnpm blender check");
  process.exit(2);
}
