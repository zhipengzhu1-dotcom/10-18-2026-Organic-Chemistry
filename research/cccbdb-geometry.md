# Research: NIST CCCBDB coverage and a fallback geometry source

Ticket: #19 (map #1). Researched 2026-10-18. Follows the decision on #13: Students see experimental geometry from NIST CCCBDB, not PubChem's MMFF94 conformers. Standing constraints: every number has a visible source note, lesson content is CC BY-NC-SA, code is MIT, and the budget is $0.

All CCCBDB observations below come from fetching the live pages on 2026-10-18 (CCCBDB Release 22, May 2022). The experimental-geometry page for a species is `https://cccbdb.nist.gov/expgeom2x.asp?casno=<CAS without dashes>&charge=0`.

## TL;DR

- **Coordinates: sometimes.** Where CCCBDB has a complete experimental structure, the page gives a full **Cartesian table (x, y, z in Å)**, an internal-coordinate table, an atom–atom distance matrix and a reference for each value. Where the experiment did not fix every parameter, it lists **internal coordinates only and an empty Cartesian table**. **L-alanine is one of those cases.** There is no API or file export for experimental geometries; the only route is scraping the HTML.
- **Coverage:** 24 of the 45 course molecules checked have experimental Cartesians, 19 have internal coordinates only, one (benzaldehyde) has only a reference, and one (glucose) is out of scope. CCCBDB is restricted to "six or fewer heavy atoms and twenty or fewer total atoms", so most Orgo II molecules will never be in it.
- **Terms:** CCCBDB is NIST Standard Reference Database 101. It is copyrighted under the Standard Reference Data Act ("All rights reserved"), unlike most US-government data. It is free to use online, and its catalogue entry points to the NIST licence, which asks for acknowledgement. Citing individual values per Scene on a non-commercial site looks fine. Republishing a compiled geometry file in a public repo is the part that needs a human check.
- **Fallback, recommended:** for any molecule without experimental Cartesians in CCCBDB, use **our own computed geometry: one PySCF optimisation at B3LYP/cc-pVTZ for every case, labelled "computed"**. Do not use crystal structures (CSD has licence limits; CSD and COD are both solid-state, give zwitterionic alanine and short X–H bonds). Do not hand-assemble geometries from gas-phase compilations (paywalled, incomplete, manual). CCCBDB publishes B3LYP/cc-pVTZ geometries for its own species, so our pipeline can be checked against it.

## 1. What CCCBDB gives, and in what format

### Page contents (checked live)

For **methane** (`casno=74828`) the page lists:

- rotational constants (A = B = C = 5.24120 cm⁻¹, from 1966Herzberg) and point group Td;
- an internal-coordinate table, one row per parameter, with its value, the atoms it connects, a reference key and a comment: `rCH 1.087 … 1979Hir:213 re` and `aHCH 109.471 … 1974sve/kov`;
- a **Cartesian table**: `C1 0.0000 0.0000 0.0000; H2 0.6276 0.6276 0.6276; …`;
- an atom–atom distance matrix (C–H 1.0870, H···H 1.7751);
- a reference list, keyed to the table, with full citations and DOIs. For example, `1979Hir:213` is E. Hirota, "Anharmonic Potential Function and Equilibrium Structure of Methane", *J. Mol. Spect.* 77, 213–221 (1979), doi:10.1016/0022-2852(79)90103-6.

**Per-value citation is therefore built in.** Each bond length and angle carries its own reference key, which is exactly what our Source note needs.

**The Cartesians are not themselves measurements.** They are CCCBDB's construction from the listed internal coordinates. Ethanol's Cartesians include methyl H angles that its internal table does not list, so some values must be assumed or derived. That is my inference; CCCBDB's introduction page doesn't say how the Cartesians are built. Measuring a listed parameter in the viewer (e.g. a C–H or C–C distance) returns the cited value exactly. A distance between atoms not directly bonded is derived from the listed parameters.

### Format and automation

- **No machine-readable export for experimental geometry.** The "MOL file" page (`mdlmol1x.asp`) only serves "MDL MOL file formatted **optimized**" (calculated) geometries, looked up by formula. Experimental values exist only as HTML tables, so a build script has to fetch the page and parse the `Atom x y z` table and the reference table.
- **Fetching works without a key**, and the pages are reachable directly by `casno`. `robots.txt` disallows only `/requestmost2.asp` (and blocks the `gsa-crawler` agents completely), so the geometry pages are not disallowed.
- **Rate limiting:** the site is behind Cloudflare. At one request per second I got **HTTP 429 Too Many Requests after about 20 requests**. At one request per 8 s, 30 requests went through without a 429. The build script should fetch each species once at ≥8 s spacing, check the parsed result into the repo and never fetch at runtime (the same rule PubChem has in `research/chem-data-and-drawing`).
- **Pitfall 1: a CAS that isn't in CCCBDB silently returns another species.** `casno=50997` (D-glucose) returned the **formaldehyde** page with HTTP 200. The script must check the returned name, formula and atom count against what it asked for.
- **Pitfall 2: the point-group label can be wrong.** Ethane is labelled **D3h** (eclipsed), but its Cartesians are staggered (H3 at x = −1.0192 on the upper carbon and H6 at x = +1.0192 on the lower one), which is **D3d**. Cyclohexane is labelled **C2**, but its Cartesians are the D3d chair (C ±0.2313 Å alternating in z, axial C–H 1.101 Å, equatorial 1.093 Å). Trust the coordinates; don't show the point-group label without recomputing it.
- **Units:** distances in Å, angles in degrees; the page states this.

## 2. Coverage

### Scope limit (CCCBDB's own statement)

The MOL-file page states the species scope: "Mostly atoms with atomic number less than 36 (Krypton) … **Six or fewer heavy atoms and twenty or fewer total atoms.** Exception: Versions 8 and higher have a few substituted benzenes with more than six heavy atoms." So glucose, most Orgo II substrates, drug-like examples and anything with more than about 7 heavy atoms will never have a CCCBDB geometry.

### The five named molecules

| Molecule | CAS | Experimental Cartesians? | What is there | Source of values |
|---|---|---|---|---|
| Methane | 74-82-8 | **Yes** (5 atoms), Td | C–H 1.087 Å (re), HCH 109.471° | Hirota 1979, doi:10.1016/0022-2852(79)90103-6; Sverdlov et al. 1974 |
| Ethanol | 64-17-5 | **Yes** (9 atoms), anti (trans) conformer, C1 | O–H 0.971, C–O 1.431, C–C 1.512, C–H 1.086–1.098 Å, CCO 107.8°, HOC 105.4° | Coussan et al., *J. Phys. Chem. A* 102, 5789 (1998), doi:10.1021/jp9805961; rotational constants Kakar & Quade 1980, doi:10.1063/1.439723 |
| Cyclohexane | 110-82-7 | **Yes** (18 atoms), chair (labelled C2, actually D3d) | C–C 1.530, C–H ax 1.101 / eq 1.093 Å, CCC 111.28°, CCCC 55.26° | Kuchitsu (ed.), *Structure of Free Polyatomic Molecules – Basic Data*, Springer 1998, doi:10.1007/978-3-642-45748-7 |
| Benzene | 71-43-2 | **Yes** (12 atoms), D6h | C–C 1.397, C–H 1.084 Å, 120° | Herzberg, *Electronic spectra and electronic structure of polyatomic molecules*, Van Nostrand 1966 |
| L-alanine | 56-41-7 | **No**: internal coordinates only, empty Cartesian table | 9 heavy-atom parameters (C–N 1.471, C=O 1.192, C–O 1.347 Å, …); **no H positions** | Landolt-Börnstein II/23 (Kuchitsu 1995); rotational constants Godfrey et al., *JACS* 115, 9687 (1993), doi:10.1021/ja00074a039 |

Notes:

- **Alanine** is the neutral gas-phase molecule, not the zwitterion found in water and in crystals. CCCBDB's calculated-geometry page for it gives the InChI `…/t2-/m0/s1` (L), and lists optimised geometries at many levels: HF, B3LYP, ωB97X-D, M06-2X, MP2 and others, with bases up to aug-cc-pVTZ.
- **Ethanol's** listed geometry comes from a matrix-isolation IR paper (Coussan 1998). Whether those parameters were measured or taken from calculations in that paper needs checking against the paper (see Open questions).

### Wider course list (Orgo I/II examples, checked live)

**Experimental Cartesians available (24):** methane, ethane, ethylene, acetylene, water, ammonia, formaldehyde, methanol, formic acid, propane, isobutane, cyclopropane, cyclohexane, benzene, ethanol, chloromethane, bromomethane, dimethyl ether, acetonitrile, nitromethane, urea, acetamide, furan, ethyl acetate.

**Internal coordinates only, no Cartesians (19):** L-alanine, glycine, acetic acid, butane, acetone, acetaldehyde, methylamine, propene, 1,3-butadiene, cis-2-butene, trans-2-butene, cyclopentane, cyclohexene, tert-butyl chloride, toluene, phenol, aniline, pyridine, naphthalene.

**Reference only, no parameters parsed (1):** benzaldehyde (Desyatnyk et al. 2005).

**Out of scope (1):** D-glucose, which has 12 heavy atoms; the CAS lookup returned formaldehyde instead.

So even within CCCBDB's size limit, about **4 in 10 common teaching molecules lack Cartesians**. That includes several Unit 1 staples (butane conformers, acetone, acetic acid, propene) and most aromatics beyond benzene. **The fallback will be needed often, not rarely.**

## 3. Terms of use and licence

- **CCCBDB is NIST Standard Reference Database 101.** Its introduction page states: "© 2015 copyright by the U.S. Secretary of Commerce on behalf of the United States of America. All rights reserved." Required citation (verbatim from [introx.asp](https://cccbdb.nist.gov/introx.asp)): *NIST Computational Chemistry Comparison and Benchmark Database, NIST Standard Reference Database Number 101, Release 22, May 2022, Editor: Russell D. Johnson III, http://cccbdb.nist.gov/, DOI:10.18434/T47C7Z*. (The DOI currently redirects to `http://cccbdb.nist.gov/`.)
- **Why "all rights reserved" for a government database:** the Standard Reference Data Act (15 U.S.C. § 290e) "empowers the Secretary of Commerce to secure copyright on behalf of the United States … in Standard Reference Data (SRD) prepared by NIST", and NIST's copyright page gives no public-domain carve-out for SRD ([NIST copyright, fair use and licensing statements](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications)). This is the opposite of PubChem and other NCBI data, which are public domain.
- **What reuse is allowed:** CCCBDB has no terms-of-use page of its own; [creditsx.asp](https://cccbdb.nist.gov/creditsx.asp) only gives the citation. Its [data.gov catalogue entry](https://catalog.data.gov/dataset/nist-computational-chemistry-comparison-and-benchmark-database-srd-101) lists access level "public" and licence `https://www.nist.gov/open/license`. That licence grants rights to "print, publish, prepare derivative works" for NIST data, contingent on "appropriate acknowledgments of NIST's creation of the data/work". It asks that modified data be marked as modified, and it disclaims any warranty ("AS IS"). It does not address commercial use; NIST sends that to `nist.gov/srd`, which lists SRD 101 among its free databases.
- **The underlying numbers are facts from the published literature.** CCCBDB credits each one to Herzberg, Hirota, Kuchitsu and so on. Single numeric facts are generally not copyrightable in the US (*Feist v. Rural*, 499 U.S. 340 (1991)); the compilation is.
- **My reading (not legal advice):** showing a handful of values per Scene, each citing the original paper **and** CCCBDB SRD 101, on a non-commercial CC BY-NC-SA site is within the NIST licence's acknowledgement condition. What is less clear is **republishing a CCCBDB-derived geometry file in a public repo whose code is MIT**. Those data files should **not** be under the MIT licence. Mark them separately with the NIST copyright notice and citation. If in doubt, ask NIST at `data@nist.gov` (the contact on `nist.gov/srd`).

## 4. Fallback options

| Option | Experimental? | Licence | Automatable | Fit for gas-phase teaching geometry | Verdict |
|---|---|---|---|---|---|
| **A. Gas-phase compilations**: Landolt-Börnstein II/7, II/15, II/23…; Kuchitsu 1998; MOGADOC; original microwave/ED papers | Yes | Paywalled books and databases; the values are facts, so citing is fine | **No**: values are internal coordinates, usually heavy-atom only, with H positions assumed. Building a Z-matrix by hand per molecule. | Good physics, incomplete structures. This is where CCCBDB's "internal coordinates only" rows come from in the first place. | Reject as a pipeline. Fine as an occasional hand-curated exception. |
| **B. CSD crystal structures** (CCDC) | Yes (X-ray) | Free viewing of individual entries through Access Structures, but CCDC states "We do not permit systematic searching via our free services". The licence summary bars redistributing the data or building products that "incorporate, reproduce, substitute for or materially derive their value from the data" without permission ([CCDC licence](https://ccdc.cam.ac.uk/licence-agreement/), [Access Structures terms](https://ccdc.cam.ac.uk/access-structures-terms/), [CSD Python API conditions](https://downloads.ccdc.cam.ac.uk/documentation/API/conditions_of_use.html)) | No | **Poor**: solid-state packing; **L-alanine crystallises as the zwitterion**; X-ray C–H bonds come out about 0.1 Å short because X-rays locate electron density, not nuclei; many teaching molecules are liquids or gases with no routine crystal structure | Reject |
| **C. COD** (Crystallography Open Database) | Yes (X-ray) | "All data in the COD and the database itself are dedicated to the public domain and licensed under the CC0 License" ([crystallography.net/cod](https://www.crystallography.net/cod/)) | Yes (CIF downloads) | Same solid-state problems as CSD, and coverage of small organics is patchy | Reject for geometry; licence is fine |
| **D. CCCBDB calculated geometries** (same database) | No (computed) | SRD 101, as in section 3 | Partly (MOL-file export of optimised geometries) | Good, but **only for CCCBDB's ≤6-heavy-atom species**, so it doesn't solve Orgo II | Use as a cross-check, not as the source |
| **E. Our own computed geometry** (PySCF, one level of theory) | No (computed) | PySCF is Apache-2.0 ([github.com/pyscf/pyscf](https://github.com/pyscf/pyscf)); the output is our own work, so we can put it under CC BY-NC-SA or CC0 | **Yes**: SMILES → RDKit embed → PySCF optimisation via geomeTRIC or PyBerny ([PySCF geometry optimisation docs](https://pyscf.org/user/geomopt.html)) | Good: gas-phase, neutral, all H positions; covers any molecule, ion or intermediate we choose; one consistent method | **Recommend** |

### Recommendation

**Two tiers, and never mix them within one molecule:**

1. **CCCBDB experimental**, used only when the page has a **complete Cartesian table**. Store the coordinates plus the per-parameter reference keys.
2. Everything else gets **our own computed geometry**: a PySCF optimisation at **B3LYP/cc-pVTZ**, starting from an RDKit embedding of the SMILES, with the conformer chosen deliberately (e.g. anti butane, chair cyclohexene). Label it "computed".

Why B3LYP/cc-pVTZ: CCCBDB publishes optimised geometries at exactly this level for its own species (it is listed for alanine), so the pipeline can be validated in two ways. First, re-optimise the 24 experimental-Cartesian molecules and report each bond length's deviation from experiment. Second, compare against CCCBDB's B3LYP/cc-pVTZ coordinates to confirm the setup is right. Publish the measured deviation in the methods note rather than quoting a literature error bar. A different single level would also work (e.g. ωB97X-D, also in CCCBDB). What matters is one level, stated and validated. PySCF needs Linux or WSL (see `research/chem-data-and-drawing`, section 4); it is a build-time tool only and is never shipped.

Don't fill in CCCBDB's internal-coordinate-only molecules (alanine, butane, acetone…) by mixing the experimental heavy-atom values with computed H positions. That geometry would have two sources and no honest one-line label. Use the computed geometry for the whole molecule. If a lesson wants to quote an experimental bond length for that molecule, put it in the text with its own citation.

### Source-note wording

Experimental (CCCBDB):

> **Geometry: experimental (gas phase).** C–H 1.087 Å and H–C–H 109.47° from Hirota, *J. Mol. Spectrosc.* 77, 213 (1979), via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z. Other distances are calculated from these values.

Computed (ours):

> **Geometry: computed, not measured.** Optimised at B3LYP/cc-pVTZ with PySCF <version> (our calculation, <date>), isolated molecule in the gas phase. For molecules with experimental structures, this method's bond lengths differ from experiment by up to <max deviation from our validation set> Å.

In both cases the tapped value carries its own label: a cited reference for an experimental parameter, "computed" for a computed one, and "derived from the listed values" for a distance between non-bonded atoms.

## Open questions (need a human)

1. **Licence wording.** Is publishing CCCBDB-derived coordinate files in a public GitHub repo, with the NIST copyright notice, acceptable under the NIST licence for SRD 101? Or should we email `data@nist.gov` first? Separately, make sure the repo's MIT licence does not appear to cover those data files.
2. **Ethanol's reference.** Check whether the Coussan et al. 1998 parameters CCCBDB lists are experimental or computed in that paper. If computed, ethanol drops to the computed tier.
3. **Alanine as taught.** The gas-phase neutral structure (experimental or computed) is not the zwitterion students meet in biochemistry. Does the lesson show both (the zwitterion computed with implicit solvent, labelled as such)?
4. **Conformer choice** for computed molecules (butane anti vs gauche, cyclohexene half-chair) is a teaching decision, not a data one.
