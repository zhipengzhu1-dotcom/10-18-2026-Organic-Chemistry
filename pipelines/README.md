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

## Blender: the studio matcap and share images (#69)

Blender 5.2.2 LTS at `/Applications/Blender.app` (not on PATH), headless. CI never runs it.

```sh
pnpm blender render                         # all three, or name some: matcap share-site share-unit-1
pnpm blender check                          # CI gate: re-hash every recorded input and output
```

| Render | Script | Output |
|---|---|---|
| `matcap` | `blender/make_matcap.py` | `site/public/matcaps/studio.webp` (512 px, ~10 KB; the 3D card tints it per element) |
| `share-site` | `blender/share_images.py` | `site/public/share/site.webp` (1200×630: the Push hero's water + wordmark) |
| `share-unit-1` | `blender/share_images.py` | `site/public/share/unit-1.webp` (1200×630: methane, ethylene, acetylene + Unit 1's title) |

- Molecules enter Blender only through `blender/molecule_import.py`, which reads `blender/renders/<name>.props.json`. `blender/render.ts` writes that file from the cited-data lookup (atoms, bonds, Jmol colours, Bondi radii × 0.3, the Unit's title), the design tokens and the layout. Orbital meshes (glb in the molecule's data frame, #70) go in `meshes`.
- `blender/renders/<name>.json` records the Blender version and the sha256 of every file Blender read (scripts, fonts, props, meshes) and of each output. `pnpm blender check` (and `pnpm test`) fail when any changed, or when the props the cited data now gives differ from the committed ones. Data a render doesn't use (another element's colour) doesn't make it stale.
- Fonts: Pixelify Sans (`blender/fonts/`, OFL) and the Manim fonts in `scenes/manim/fonts/`.
- `blender/molecule-import.test.ts` runs the import in Blender where it is installed (skipped in CI).
