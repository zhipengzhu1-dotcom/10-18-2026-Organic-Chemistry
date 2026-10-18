# Research: open chemistry data and drawing tools

Ticket: #3 (map #1). Researched 2026-10-18. Standing constraints: every number cited with a visible source note; code MIT, lesson content CC BY-NC-SA; $0.

## TL;DR

- **Molecule data: PubChem.** PUG-REST gives computed properties and a **computed** 3D conformer SDF per compound, with no key. PUG-View gives **experimental** values (bp, density, pKa), and each value carries its own source and licence. Build a small offline script that fetches once and stores the result, with citation, in the repo. Never call PubChem from the browser at runtime.
- **Radii and colours:** use Cordero 2008 for covalent radii, Alvarez 2013 (CC BY-NC 3.0) or Bondi 1964 for van der Waals radii, and Jmol CPK for element colours. Store each table as one JSON file and cite one paper per column. The CC0 Blue Obelisk Data Repository (BODR) is handy for a cross-check, but it mixes sources, so it shouldn't be the cited source.
- **Drawing:** for render-only skeletal structures, use **RDKit.js** (BSD-3) or **SmilesDrawer** (MIT). For a student-facing editor with **curved electron-pushing arrows anchored to atoms and bonds**, **Kekule.js** (MIT) is the only candidate here with that built in. **Ketcher** (Apache-2.0) is the most polished general editor, but its arcs are free-floating shapes, not electron-pushing arrows. 3D: 3Dmol.js (BSD-3) or Mol* (MIT).
- **Orbitals: feasible.** Precompute cube files offline with PySCF (Apache-2.0, Linux/WSL only) or Psi4 (LGPL-3.0, tool only, not shipped), then render isosurfaces with 3Dmol.js. This only works for a curated list of small molecules. Keep it as an offline build step, not a runtime feature.

## 1. PubChem (PUG-REST / PUG-View)

### What it gives (checked live against the API, 2026-10-18)

| Need | Endpoint | Notes |
|---|---|---|
| Computed properties | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/ethanol/property/MolecularFormula,MolecularWeight,XLogP,TPSA,IUPACName,IsomericSMILES/JSON` | Returned CID 702, C2H6O, 46.07, SMILES `CCO`, XLogP −0.1, TPSA 20.2. |
| 3D conformer | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/702/record/SDF?record_type=3d` | HTTP 200, a V2000 SDF from OEChem. `.../cid/702/conformers/JSON` lists conformer IDs. |
| Experimental bp, density, pKa | `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/702/JSON?heading=Boiling+Point` (also `Density`, `Dissociation+Constants`) | Several values per property, each from a different depositor with its own licence (see below). |

**3D geometry is computed, not experimental.** PubChem3D builds its conformers with OpenEye OMEGA and the MMFF94s force field ([Bolton et al. 2011, *J. Cheminf.* 3:4](https://pmc.ncbi.nlm.nih.gov/articles/PMC3042967/)). A compound gets a conformer only if it meets all of these: ≤50 non-hydrogen atoms; ≤15 rotatable bonds; only the elements H C N O F Si P S Cl Br I; a single covalent unit (no salts or mixtures); MMFF94s-typeable; and fewer than 6 undefined stereocentres ([Bolton et al. 2011, "PubChem3D: a new resource for scientists"](https://pmc.ncbi.nlm.nih.gov/articles/PMC3269824/)). This covers almost all neutral Orgo I/II molecules. **Carbocations, carbanions, radicals and transition states may lack a conformer** (an inference from the MMFF94s-typeable and single-covalent-unit criteria), so those need our own computed geometry (see section 4). The source note should read something like "Geometry: PubChem CID 702, computed conformer (PubChem3D, MMFF94s)".

### Rate limits

PubChem's own policy page ([programmatic access](https://pubchem.ncbi.nlm.nih.gov/docs/programmatic-access)) is behind a reCAPTCHA wall for automated fetches. Its search snippet confirms "**no more than 5 requests per second**", along with dynamic throttling and a request to contact PubChem about large jobs. Secondary sources add "≤400 requests per minute; ≤300 s running time per minute" ([Towards Data Science summary](https://towardsdatascience.com/how-to-programmatically-obtain-chemical-data-from-pubchem-59762810eb1/)). **Unverified against the primary page.** Each response carries an `X-Throttling-Control` header. I observed: `Request Count status: Green (0%), Request Time status: Green (0%), Service status: Green (27%)`. Going over the limits can get a client temporarily blocked. Our use is a few hundred compounds fetched once at build time, far below every limit.

### Terms and licence

- NCBI policy: "Information that is created by or for the US government on this site is within the public domain." NLM asks for acknowledgement. It warns that some resources, **including PubChem**, contain third-party material that "may be protected by U.S. and foreign copyright laws" ([NCBI policies](https://www.ncbi.nlm.nih.gov/home/about/policies/)).
- In practice, **each PUG-View value has its own `Reference` block with `SourceName`, `LicenseNote`, `LicenseURL`**. For ethanol (CID 702):

  | Value | Source | Licence |
  |---|---|---|
  | bp 78.24 °C, pKa 15.9 | HSDB (NLM) | US-gov public domain |
  | bp 78 °C | ILO-WHO ICSC | CC BY 4.0 |
  | bp 173.3 °F | CAMEO Chemicals (NOAA) | free, NOAA terms |
  | bp 173 °F | OSHA | US-gov public domain |
  | bp 78.2, pKa 15.9 | DrugBank | CC BY-NC 4.0 |
  | pKa | IUPAC Digitized pKa Dataset | CC BY-NC 4.0 ([repo README](https://github.com/IUPAC/Dissociation-Constants)) |

- **Recommendation:** the fetch script keeps `SourceName` and `LicenseURL` beside every stored value and **prefers public-domain or CC BY sources** (HSDB, OSHA, ICSC). The NC sources (DrugBank, IUPAC pKa) suit our non-commercial CC BY-NC-SA content, but they only stay compatible while the site stays non-commercial. **Donations don't make the site commercial** (my reading, not legal advice). Single numeric facts are generally not copyrightable in the US (*Feist v. Rural*, 499 U.S. 340 (1991)), but attributing them is still required by our own standard.
- The IUPAC pKa dataset is also the best citable pKa source in its own right: Zheng & Lafontant-Joseph, IUPAC Digitized pKa Dataset v2.4a, [doi:10.5281/zenodo.7236452](https://doi.org/10.5281/zenodo.7236452), CC BY-NC 4.0, attribution "Reproduced by permission of International Union of Pure and Applied Chemistry."

## 2. Radius tables and element colours

| Table | Citation | Access / licence | Use |
|---|---|---|---|
| Covalent radii | Cordero, Gómez, Platero-Prats et al., "Covalent radii revisited", *Dalton Trans.* 2008, 2832–2838, [doi:10.1039/b801115j](https://doi.org/10.1039/b801115j) | Paywalled article; the table values are facts | Ball-and-stick bond-connectivity thresholds and atom sizes. It gives separate C sp3/sp2/sp radii (0.76/0.73/0.69 Å, recalled from the paper and not re-checked against its table), which is useful for teaching hybridisation. |
| Covalent radii (alt.) | Pyykkö & Atsumi, *Chem. Eur. J.* 2009, 15, 186 | Paywalled | Used by BODR (C = 0.75 Å) |
| vdW radii | Bondi, *J. Phys. Chem.* 1964, 68, 441 | Paywalled | The classic table: C 1.70, H 1.20 (BODR value for C = 1.7). Used by most viewers. |
| vdW radii (modern) | Alvarez, "A cartography of the van der Waals territories", *Dalton Trans.* 2013, 42, 8617–8636, [doi:10.1039/c3dt50599e](https://doi.org/10.1039/c3dt50599e) | **Open access, CC BY-NC 3.0** ([RSC](https://pubs.rsc.org/en/content/articlehtml/2013/dt/c3dt50599e)) | Space-filling models. Covers nearly all elements, derived from more than 5 million non-bonded contacts. |
| Element colours | Jmol "CPK" scheme, from `JmolConstants.java`, published at [jmol.sourceforge.net/jscolors](https://jmol.sourceforge.net/jscolors/) (data file `jmol_constants.js`) | Jmol is LGPL. A colour convention isn't really copyrightable, but cite it anyway. | H `FFFFFF`, C `909090`, N `3050F8`, O `FF0D0D`, F `90E050`, P `FF8000`, S `FFFF30`, Cl `1FF01F` (Jmol's CPK column; RasMol's differs, e.g. C `C8C8C8`) |
| Machine-readable bundle | Blue Obelisk Data Repository, [github.com/BlueObelisk/bodr](https://github.com/BlueObelisk/bodr), `bodr/elements/elements.xml` | **CC0 1.0** (`bodr/COPYING`) | Has `radiusCovalent`, `radiusVDW`, `elementColor` for every element. **But the sources are mixed:** `radii-covalent.bibxml` cites Pyykkö 2009 and WebElements, and `radii-vdw.bibxml` cites Bondi 1964 and Batsanov 2001. Last edited 2016. Use it only to cross-check. |

**Accessibility caveat:** CPK relies on red and green hue contrast (O red vs Cl green, F green). Pair colour with atom labels or letters on atoms, because the colour-blind-safe requirement can't be met by CPK colour alone.

**Recommendation:** check in `data/elements.json` with columns `covalent_cordero2008`, `vdw_bondi1964` (fallback `vdw_alvarez2013`), `color_jmol`. Each column carries a DOI or URL, so the Scene source note can name it directly.

## 3. Structure drawing and editing (ChemDraw alternatives)

Licences come from GitHub and npm metadata (2026-10-18). Sizes are npm *unpacked* sizes (all builds included), not the shipped bundle.

| Library | Licence | Kind | Latest / activity | Notes |
|---|---|---|---|---|
| [RDKit.js](https://www.rdkitjs.com/) (`@rdkit/rdkit`) | BSD-3-Clause | Render only (+ cheminformatics), WASM | 2026.9.1 | Very good 2D depiction from SMILES/molfile to SVG or canvas, plus substructure highlighting. "High-level UI components are not included." Loading is async, so the `.wasm` file must be served next to the glue code; a Web Worker is supported. ~7.5 MB unpacked. |
| [SmilesDrawer](https://github.com/reymond-group/smilesDrawer) | MIT | Render only, pure JS | v2.4.1 (2026-06) | Lightweight SMILES to SVG/canvas. Good for static skeletal formulas in Steps. |
| [OpenChemLib JS](https://github.com/cheminfo/openchemlib-js) | BSD-3-Clause | Render + editor (`CanvasEditor`) + cheminformatics | v9.25.1 (2026-10) | Active (Zakodium). Small; a candidate for "draw the product" Problems. |
| [Ketcher](https://github.com/epam/ketcher) (`ketcher-react` + `ketcher-standalone`) | Apache-2.0 | Full editor (React) | v3.18.0 (2026-09), very active | Most ChemDraw-like. Reactions and atom mapping; Indigo WASM in standalone mode. Heavy (standalone ~110 MB unpacked). `RxnArrowMode` includes `elliptical-arc-arrow-*` shapes, but they are **free-floating graphics not bound to atoms/bonds**, so they can't be graded as electron-pushing arrows. |
| [Kekule.js](https://github.com/partridgejiang/Kekule.js) | MIT | Full editor + viewer (2D/3D) | v1.0.4 (2026-05) | **Has `Kekule.Glyph.ElectronPushingArrow` and `BondFormingElectronPushingArrow`** (`src/chemdoc/kekule.glyph.chemGlyphs.js`), i.e. curved arrows that connect to atoms and bonds, which is exactly the mechanism-arrow must-have. Older-style JS (non-module). ~42 MB unpacked (includes 3D/demos). |
| [JSME](https://jsme-editor.github.io/) (`jsme-editor`) | BSD-3-Clause | Editor (GWT-compiled) | npm 2024.4.29; repo release 2021 | Small, stable, widely embedded in teaching sites. Slow development; no mechanism arrows. |
| [3Dmol.js](https://github.com/3dmol/3Dmol.js) | BSD-3-Clause | 3D viewer | 2.5.5 | Loads SDF from PubChem; `addVolumetricData(data,"cube",spec)` draws orbital isosurfaces ([GLViewer docs](https://3dmol.csb.pitt.edu/doc/GLViewer.html)). |
| [Mol*](https://github.com/molstar/molstar) | MIT | 3D viewer | v5.13 | Strong but protein-oriented and heavy. 3Dmol.js fits small organics better. |

All licences above (MIT, BSD-3, Apache-2.0) are compatible with an MIT-licensed codebase. Apache-2.0 asks us to carry its NOTICE. LGPL (Jmol, Psi4) only matters if we ship that code, and we don't.

**Shortlist:**
1. **Static structures in Steps:** RDKit.js (best depiction quality) or SmilesDrawer (lightest).
2. **Mechanism arrow-drawing (must-have):** check Kekule.js's electron-pushing glyphs in a prototype first. If its UX is poor on mobile, the fallback is a **custom SVG arrow layer** over RDKit.js-rendered structures, using RDKit's atom coordinates as anchors. Owning that layer is also what makes arrows gradable and video-renderable.
3. **Free-form "draw a structure" Problems:** OpenChemLib `CanvasEditor` (light) or Ketcher (full, heavy). Grade by canonical SMILES/InChI comparison with RDKit.js.
4. **3D:** 3Dmol.js.

## 4. Computed orbitals (PySCF / Psi4)

**Feasible for a curated set of small molecules, done offline.**

- **PySCF** (Apache-2.0, v2.14.0): `pyscf.tools.cubegen.orbital(mol, outfile, coeff, nx=80, ny=80, nz=80, resolution=None, margin=3.0)` and `density(...)` write Gaussian cube files ([source](https://pyscf.org/_modules/pyscf/tools/cubegen.html)). **"PySCF is not supported natively on Windows. You must use the Windows Subsystem for Linux"** ([install docs](https://pyscf.org/user/install.html)). That matters on this Windows machine. A CI runner (GitHub Actions ubuntu, free for public repos) also works.
- **Psi4** (LGPL-3.0, v1.11): `cubeprop()` with `CUBEPROP_TASKS` = `ORBITALS`, `FRONTIER_ORBITALS` (HOMO/LUMO), `DENSITY`, `ESP`, `ELF`/`LOL`. The second line of each cube header gives the isovalue that captures 85% of the density ([manual](https://psicode.org/psi4manual/master/cubeprop.html)). Used only as a tool, so the LGPL doesn't touch our code.
- **Rendering:** 3Dmol.js reads cube files directly (above). An alternative is offline marching cubes to a mesh (glTF), which is smaller and also usable in Blender for video.
- **Cost:** an 80³ grid holds 512,000 values per orbital, which is roughly 5–7 MB of text per cube file. That's fine gzipped for a handful of orbitals, but too big to ship many. Downsample (40³ is usually plenty for teaching), or ship meshes. *(Size estimate is my arithmetic, not measured.)*
- **Method choice:** HF or B3LYP with a small basis (STO-3G or 6-31G*) on ethene, formaldehyde, butadiene, benzene, allyl, carbonyls and so on runs in seconds to minutes on a laptop CPU (typical experience, not benchmarked here). Note: **computed MOs are delocalised canonical orbitals, not the hybrid/LCAO cartoons in textbooks.** Show them as "computed MO (B3LYP/6-31G*, PySCF)" next to the idealised drawing. Don't substitute one for the other. Geometry source: PubChem conformer, re-optimised at the same level.
- The same pipeline also gives geometries for species PubChem3D excludes (cations, carbanions, radicals) and electrostatic-potential maps.

## Open questions for the owner

- Should NC-licensed values (DrugBank, IUPAC pKa) be allowed, or only PD/CC BY ones? This affects the fetch script's source preference.
- Covalent radii: Cordero (hybridisation-specific, chemist-friendly) or Pyykkö (single table)? I recommend Cordero.
- Does Kekule.js's arrow UX pass, or do we build our own arrow layer? This belongs in a prototype ticket.

## Method note

PubChem's documentation pages are behind a reCAPTCHA wall for automated fetches. API behaviour was therefore checked by calling the endpoints directly. Licences were read from repo `LICENSE`/`COPYING` files and npm metadata. Published PDFs for Cordero and Bondi weren't accessible (RSC returned 403), so their citations come from the RSC landing-page search results and BODR's bibliography files.
