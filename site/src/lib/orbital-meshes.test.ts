// Orbitals shown only as A and B (Lesson 8, #86) load their meshes by hash, so the file name
// ("sigma-star.glb") can't give the answer away. Every orbital mesh is served at that address too.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { blindMesh } from "@astratron/content/molecule";
import { hashedMeshes } from "./orbital-meshes.ts";

const model = buildContent(contentRoot).model!;

describe("orbital meshes served by hash", () => {
  const meshes = hashedMeshes(model);

  it("lists every orbital mesh once, at the address an A/B card asks for, with the bytes of its file", () => {
    const sigmaStar = model.subjects[0].data["hydrogen-b3lyp-orbitals"].orbitals!.list["sigma-star"];
    const served = meshes.find((m) => `/orbitals/m/${m.hash}.glb` === blindMesh(sigmaStar.sha256))!;
    expect(served.mesh).toBe("/orbitals/hydrogen-b3lyp-orbitals/sigma-star.glb");
    expect(createHash("sha256").update(readFileSync(served.file)).digest("hex")).toBe(sigmaStar.sha256);
    expect(new Set(meshes.map((m) => m.hash)).size).toBe(meshes.length);
  });
});
