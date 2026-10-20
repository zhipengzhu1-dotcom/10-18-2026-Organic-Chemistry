// `pnpm video <command>`: the video module's commands.
//   links <lesson> [--origin <url>]   each Step's id, phase, Prompt opening and deep link
//   render [scene…] [--sources-only]  video + sources sidecar per Scene × aspect → video/out/
//   stills [scene…]                   the poster frame per Scene × aspect → video/out/ (CI gate)
//     render/stills pick Scenes with ids, --only <id>[,<id>…] or --changed (select.ts); none = all
//   check-site                        fails if the built site or its modules carry Remotion (builds the site if needed)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildContent, contentRoot } from "@astratron/content";
import { sceneManifests } from "@astratron/scenes/manifests";
import { formatLinks, lessonLinks } from "./links.ts";
import { changedScenes, gitChangedFiles, parseSelection, sceneFiles, unknownScenesError } from "./select.ts";
import { builtSite, remotionDependencies, remotionInFiles } from "./site-check.ts";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith("--"));
const args = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--origin");

const usage = `Usage: pnpm video links <lesson id or slug> [--origin <url>]
       pnpm video render [scene… | --only <id>[,<id>…] | --changed] [--sources-only]
       pnpm video stills [scene… | --only <id>[,<id>…] | --changed]
       pnpm video check-site`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** The Scene ids to render ([] = all), or undefined when `--changed` finds none. */
function selectScenes(rest: string[]): string[] | undefined {
  const selection = parseSelection(rest);
  if (selection.kind === "all") return [];
  if (selection.kind === "ids") {
    const unknown = unknownScenesError(selection.ids, sceneManifests.map((m) => m.id));
    if (unknown) fail(unknown);
    return selection.ids;
  }
  const files = new Map(sceneManifests.map((m) => [m.id, sceneFiles(repo, m.id, m.data)]));
  const changed = changedScenes(files, gitChangedFiles(repo));
  if (changed.length) console.log(`Changed Scenes: ${changed.join(", ")}`);
  return changed.length ? changed : undefined;
}

async function main() {
  switch (command) {
    case "links": {
      if (args.length !== 1) fail(usage);
      const { model, errors } = buildContent(contentRoot);
      if (!model) fail(`Content build failed:\n  ${errors.join("\n  ")}`);
      const at = rest.indexOf("--origin");
      const origin = at >= 0 ? rest[at + 1] : process.env.ASTRATRON_ORIGIN;
      console.log(formatLinks(lessonLinks(model, args[0]!, origin ?? "")));
      return;
    }
    case "render":
    case "stills": {
      const scenes = selectScenes(rest);
      if (!scenes) return console.log("no Scenes changed");
      const { renderScenes } = await import("./render.ts");
      const files = await renderScenes({ mode: command === "stills" ? "still" : "video", scenes, sidecarOnly: flags.includes("--sources-only") });
      console.log(`${files.length} file(s) written.`);
      return;
    }
    case "check-site": {
      const dist = builtSite(repo, () => {
        console.log("site/dist not found: building the site first (pnpm build).");
        execFileSync("pnpm", ["build"], { cwd: repo, stdio: "inherit" });
      });
      const hits = [...remotionDependencies(repo, ["site", "scenes", "content"]), ...remotionInFiles(dist).map((f) => `site/dist/${f}`)];
      if (hits.length) fail(`Remotion found in the site (ADR 0001: it is only the video renderer):\n  ${hits.join("\n  ")}`);
      console.log("Site OK: no Remotion code in site/dist or in the modules it ships.");
      return;
    }
    default:
      fail(usage);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
