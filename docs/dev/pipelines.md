# Pipelines: geometry, orbitals, Blender

`pipelines/README.md` has the commands, the tier rules and "Adding a molecule". This file holds what the README and code don't say. All output is committed; CI only checks it (ADR 0002 for why numbers come from these files).

## Geometry (`pipelines/geometry/`)

- The experimental/computed rule ("never mix tiers") holds **per data file**, not per molecule: `ethylene` (experimental, L4) and `ethylene-b3lyp` (computed, L8) coexist. A re-optimised molecule gets its own `<id>-b3lyp` file.
- CCCBDB has no API and rate-limits: HTTP 429 after ~20 requests at 1/s. `geometry.fetch` spaces requests 8 s apart and caches pages in `geometry/cccbdb/`; reuse the cache.
- An unknown CAS returns a different species with HTTP 200 (2-fluorobutane's CAS gave formaldehyde). The identity check catches it; read the cached page's name before trusting it.
- Ignore CCCBDB's point-group labels (ethane is labelled D3h but is staggered D3d).
- A CCCBDB page with internal coordinates only (acetic acid, methylamine) means computed tier. Leave internal-coordinate molecules whole rather than patching in computed H positions.
- When CCCBDB's Cartesians disagree with its own listed parameters, the build rebuilds them by least squares (`provenance.rebuilt`); give a symmetric molecule `symmetric` in `molecules.py` so equivalent bonds stay equal (chloroform).
- Value keys are CCCBDB-style (`r.CH`, `a.HCH`, `d.HCCH`); `values.<key>.atoms` are 0-based indices. Adding a value to an existing file (e.g. `ethanol/a.HC1H`) is a `molecules.py` edit + `geometry.build`, no recompute.
- PubChem 3D conformers and RDKit embeds are starting geometries only; Students never see them.
- PySCF runs natively on macOS arm64 under Python 3.12. Budget a few minutes per small molecule (opt + freq), longer for bigger ones; set `OMP_NUM_THREADS`.
- `maxDeviation` appears in the Source note of every computed file. Re-running `--validate` on an experimental molecule can change it, which changes 13+ data files at once: rebuild and commit them together.

## Orbitals (`pipelines/orbitals/`)

- GLB meshes use KHR_mesh_quantization, not meshopt; three.js and Blender 5.2.2 both read them with no decoder.
- The orientation gate (`mesh.py`: closed, CCW from outside, normals agree with −∇|ψ|) runs before `write_glb` writes anything, and again in CI on the committed meshes (`tests/test_orbital_output.py`). The card culls back faces, so a failing gate means invisible lobes.
- Sign rules: L4 IBOs put the solid (+) lobe on +x / +y; L8 canonical MOs put + at the grid point of largest |ψ|; the `pair` set fixes signs so facing lobes are both +.
- One `ISO` for every orbital in both Lessons (`compute.py`); acetylene `pi-both` is a density, so it uses ISO².
- Spec sanity checks run inside `compute`; a failing check writes nothing. Two thresholds were loosened (NH₃ lobe centre vs peak; BF₃ HOMO boron share ≤ 0.05) and are recorded in provenance.
- Output is deterministic: a re-run gives identical sha256s, and `provenance.inputSha256` (atoms + settings) flags stale output.

## Blender (`pipelines/blender/`)

- Blender 5.2.2 LTS at `/Applications/Blender.app/Contents/MacOS/Blender`, not on PATH (`BLENDER` in `render.ts`), run headless. CI never runs Blender: `pnpm blender check` re-hashes instead, and runs inside `pnpm test` too.
- Molecules enter Blender only through `molecule_import.py`, reading `renders/<name>.props.json` that `render.ts` builds from cited data and `tokens.css`. Place nothing by hand.
- `render.ts` imports `BALL` from `site/src/molecule/layout.ts` so share images match the card. Renaming or changing `BALL` stales every render: re-render and commit.
- A changed colour, radius, geometry, token, Unit title or layout stales a render; data a render doesn't use (a new element) does not. Fix a stale render with `pnpm blender render <name>` and commit the outputs plus `renders/`.
- Records live in `pipelines/blender/renders/`, outside `site/public`, so they don't ship.
- Share images are WebP only (widest og:image support). The site image shows water, the Push hero's product.
