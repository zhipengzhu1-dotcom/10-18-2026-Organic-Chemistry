// Part of `pnpm content:build`: checks every Scene manifest, then re-runs the
// content build with the Scene catalog so each Step's Scene (id, settable
// states, data sources, Manipulate control and answer) is checked too.
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { checkManifests, sceneCatalog } from "./manifest-check.ts";
import { sceneManifests } from "./manifests.ts";

export function checkScenes(): string[] {
  const errors = checkManifests(sceneManifests);
  const { model, errors: content } = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests) });
  errors.push(...content);
  if (model)
    for (const m of sceneManifests)
      for (const ref of m.data)
        if (!model.subjects.some((s) => find(s.data, ref)))
          errors.push(`scenes/${m.id}: data: cites "${ref}", which is not in any Subject's cited data`);
  return errors;
}

const errors = checkScenes();
if (errors.length) {
  console.error(`Scene check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`Scenes OK: ${sceneManifests.length} Scene manifest(s); every Step's Scene checked.`);
