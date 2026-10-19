// Orbital meshes by hash (Lesson 8, #86): a 3D card that shows its orbitals only as A and B loads
// them from here, so the page never names "sigma-star.glb". See lib/orbital-meshes.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { courseModel } from "../../../lib/content.ts";
import { hashedMeshes, type HashedMesh } from "../../../lib/orbital-meshes.ts";

declare const __CONTENT_ROOT__: string;

export const getStaticPaths = (() =>
  hashedMeshes(courseModel(), join(__CONTENT_ROOT__, "../../site/public")).map((m) => ({ params: { hash: m.hash }, props: m }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(readFileSync((props as HashedMesh).file), { headers: { "Content-Type": "model/gltf-binary" } });
