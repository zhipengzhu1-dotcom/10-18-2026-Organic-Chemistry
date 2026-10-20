// Every orbital mesh (pipelines/orbitals, committed under site/public/orbitals) is also served by
// its hash, at the address `blindMesh` gives, so a card that names its orbitals only A and B
// (Lesson 8, #86) loads them without a telling file name (spec story 99: answers stay out of the page).
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { CourseModel } from "@astratron/content";
import { blindMesh } from "@astratron/content/molecule";

const PUBLIC = fileURLToPath(new URL("../../public", import.meta.url));

export interface HashedMesh {
  /** The first 16 hex digits of the mesh's sha256: the served file is /orbitals/m/<hash>.glb. */
  hash: string;
  /** The mesh's own site path, e.g. /orbitals/hydrogen-b3lyp-orbitals/sigma-star.glb. */
  mesh: string;
  /** The file on disk. */
  file: string;
}

export function hashedMeshes(model: CourseModel, publicDir = PUBLIC): HashedMesh[] {
  const seen = new Map<string, HashedMesh>();
  for (const subject of model.subjects)
    for (const set of Object.values(subject.data))
      for (const entry of Object.values(set.orbitals?.list ?? {})) {
        const hash = blindMesh(entry.sha256).replace(/^\/orbitals\/m\/|\.glb$/g, "");
        if (!seen.has(hash)) seen.set(hash, { hash, mesh: entry.mesh, file: join(publicDir, entry.mesh) });
      }
  return [...seen.values()];
}
