# pipelines

Python scripts run at build time, never in the browser. They fetch from PubChem, scrape CCCBDB, run PySCF optimisations, turn cube files into orbital meshes and drive the Blender import and render scripts. Their output is committed under `content/` and read through the cited-data lookup (ADR 0002). CI never reruns them: it checks the committed output (`content/test/geometry-data.test.ts`) and runs the fast unit tests here.

Python 3.12 via [uv](https://docs.astral.sh/uv/). `uv sync` installs the light dependencies; add `--group compute` for PySCF, geomeTRIC and RDKit.

```sh
cd pipelines
uv run --group compute pytest                       # unit tests (parser, checks, assembler)
```

## Geometry (#67)

Every Unit 1 molecule gets `content/subjects/organic/data/<id>.json`. The molecule list, and how each molecule is sourced, is `geometry/molecules.py`.

- **Experimental**: NIST CCCBDB, only when its page has a complete Cartesian table. Each value is one of CCCBDB's listed parameters, cited to its own paper via CCCBDB. If the Cartesians disagree with the listed parameters by more than 0.001 Å or 0.1° (ketene, chloroform), they are rebuilt from the parameters by least squares and the file's `provenance.rebuilt` says so. These files carry the NIST notice and are not MIT (see `geometry/cccbdb/NOTICE.md`).
- **Computed**: our own PySCF B3LYP/cc-pVTZ optimisation (geomeTRIC, GAU_TIGHT), then harmonic frequencies; a result is written only if the SCF and optimiser converged, the bonds match the SMILES graph and no frequency is imaginary. The starting conformer is recorded (`provenance.start`).
- `maxDeviation` (in every computed source): the largest bond-length difference between B3LYP/cc-pVTZ and experiment over every experimental molecule here, re-optimised from its CCCBDB Cartesians (`geometry/computed/validation/summary.json`).

Steps (each reads only committed files except `fetch` and `compute`):

```sh
uv run python -m geometry.fetch                     # CCCBDB pages not yet cached, 8 s apart -> geometry/cccbdb/<CAS>.html
OMP_NUM_THREADS=4 uv run --group compute python -m geometry.compute acetate acetic-acid      # -> geometry/computed/<id>.json
uv run --group compute python -m geometry.compute --validate methane                        # optimisation only, for maxDeviation
uv run --group compute python -m geometry.build     # -> content/subjects/organic/data/<id>.json
```

### Adding a molecule

1. Add a `Molecule` to `MOLECULES` in `geometry/molecules.py`: id (= data file name), title, formula, SMILES, PubChem CID, CAS, and the CCCBDB name exactly as its page prints it (lower case).
2. `python -m geometry.fetch <CAS>`. Check the page is the molecule you asked for.
3. Experimental if the page has Cartesians, else `tier="computed"` with `start` (`"cccbdb"`, `"xyz"` or `"smiles"` + `dihedrals`), a `start_note` naming the conformer, and `values` (key -> label, 0-based atoms).
4. Computed: run `geometry.compute <id>`. Experimental: run `geometry.compute --validate <id>` so it joins the max-deviation set.
5. `python -m geometry.build`, then `pnpm content:build` and `pnpm test`; add any spec sanity check to `content/test/geometry-data.test.ts`. Commit the page, the result JSON and the data file.

## Orbitals (#70)

Computed orbitals for Lessons 4 and 8, as cited data plus meshes. The set list and settings are in `orbitals/compute.py` (`SETS`, `ISO` = 0.05 a.u. for every orbital, grid step 0.14 Å).

- **Lesson 4** (`ethylene-orbitals`, `acetylene-orbitals`, `ketene-orbitals`): B3LYP/cc-pVTZ single point at the experimental (CCCBDB) geometry, then intrinsic bond orbitals (IBO, Knizia 2013) over the valence occupied orbitals. Checks: one ethylene π antisymmetric through the plane; acetylene π pair rotated into the xz/yz planes with a summed density uniform within 2%; ketene C=C and C=O π in perpendicular planes. Sign fixed so the solid (+) lobe is on +x (or +y).
- **Lesson 8** (`hydrogen-b3lyp-orbitals`, `ethane-…`, `ethylene-…`, `ammonia-…`, `boron-trifluoride-b3lyp-orbitals`, and `frontier-flow`): canonical MOs at the #67 B3LYP geometries; HOMO, LUMO and gap in eV (CODATA 2018) and the Lesson 8 spec checks 1–7.
- Every orbital is evaluated on a grid, meshed per sign (marching cubes), and passes the **orientation gate** (`orbitals/mesh.py`: closed surface, counter-clockwise winding seen from outside, outward normals) before `write_glb` writes `site/public/orbitals/<set>/<orbital>.glb` (glTF + KHR_mesh_quantization, nodes `plus-solid`/`minus-hatched`, the names #69's Blender import reads). The data file records each mesh's sha256 and the input hash; `tests/test_orbital_output.py` re-checks the committed meshes and flags stale output in CI.

```sh
OMP_NUM_THREADS=4 uv run --group compute python -m orbitals.compute            # every set, ~30 s
OMP_NUM_THREADS=4 uv run --group compute python -m orbitals.compute ethylene-orbitals
```
