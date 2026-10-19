"""PySCF B3LYP/cc-pVTZ optimisation + harmonic frequency check, cached as JSON under computed/.

Slow (minutes per molecule), so results are committed and the assembler only reads them:

    OMP_NUM_THREADS=4 uv run --group compute python -m geometry.compute acetate acetic-acid
    uv run --group compute python -m geometry.compute --validate methane   # optimisation only, for the max-deviation check

A result is written only after the sanity checks pass: SCF and optimiser converged, the
optimised connectivity (Cordero covalent radii) matches the SMILES graph, and (unless
--validate) every harmonic frequency is real, so the structure is a true minimum.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np

from .checks import connectivity_matches, imaginary_modes
from .molecules import BY_ID, Molecule

OUT = Path(__file__).parent / "computed"
XC, BASIS, GRID = "b3lyp", "cc-pvtz", 4
LEVEL = "B3LYP/cc-pVTZ"


def start_geometry(m: Molecule, *, validate_from: str | None = None) -> tuple[list[str], np.ndarray, str]:
    """Starting symbols and coordinates (Å) plus a one-line description for the record."""
    if validate_from or m.start == "cccbdb":
        from .cccbdb import parse
        from .fetch import cache_path

        cas = validate_from or m.start_from
        page = parse(cache_path(cas).read_text(encoding="utf-8"))
        symbols = [a.element for a in page.atoms]
        return symbols, np.array([[a.x, a.y, a.z] for a in page.atoms]), f"CCCBDB experimental Cartesians (CAS {cas})"
    if m.start == "xyz":
        rows = [line.split() for line in m.xyz.strip().splitlines()]
        return [r[0] for r in rows], np.array([[float(v) for v in r[1:4]] for r in rows]), m.start_note
    if m.start == "smiles":
        from rdkit import Chem
        from rdkit.Chem import AllChem, rdMolTransforms

        rd = Chem.AddHs(Chem.MolFromSmiles(m.smiles))
        if AllChem.EmbedMolecule(rd, randomSeed=7) != 0:
            raise RuntimeError(f"{m.id}: RDKit embed failed")
        AllChem.MMFFOptimizeMolecule(rd)
        conf = rd.GetConformer()
        for i, j, k, l, deg in m.dihedrals:
            rdMolTransforms.SetDihedralDeg(conf, i, j, k, l, deg)
        symbols = [a.GetSymbol() for a in rd.GetAtoms()]
        return symbols, np.array([list(conf.GetAtomPosition(i)) for i in range(rd.GetNumAtoms())]), m.start_note
    raise ValueError(f"{m.id}: no start for a {m.tier} molecule")


def run(m: Molecule, *, validate: bool = False) -> dict:
    import geometric
    import pyscf
    from pyscf import dft, gto
    from pyscf.geomopt.geometric_solver import optimize
    from pyscf.hessian import thermo

    symbols, xyz, start = start_geometry(m, validate_from=m.cas if validate else None)
    start_text = "\n".join(f"{s} {x:.6f} {y:.6f} {z:.6f}" for s, (x, y, z) in zip(symbols, xyz))
    t0 = time.time()
    mol = gto.M(atom=[[s, tuple(c)] for s, c in zip(symbols, xyz)], basis=BASIS, charge=m.charge, spin=0, unit="Angstrom", verbose=0)
    mf = dft.RKS(mol)
    mf.xc, mf.grids.level, mf.conv_tol = XC, GRID, 1e-10
    # assert_convergence: geomeTRIC raises if it has not converged within maxsteps.
    mol_eq = optimize(mf, maxsteps=200, convergence_set="GAU_TIGHT", assert_convergence=True)
    conv = {"optimiser": True}
    mf = dft.RKS(mol_eq)
    mf.xc, mf.grids.level, mf.conv_tol = XC, GRID, 1e-11
    energy = mf.kernel()
    conv["scf"] = bool(mf.converged)
    if not mf.converged:
        raise RuntimeError(f"{m.id}: SCF did not converge at the optimised geometry")
    out_xyz = mol_eq.atom_coords(unit="Angstrom")
    if not connectivity_matches(m.smiles, symbols, out_xyz, charge=m.charge):
        raise RuntimeError(f"{m.id}: optimised connectivity does not match {m.smiles}")

    freqs: list[float] | None = None
    if not validate and len(symbols) > 1:
        raw = thermo.harmonic_analysis(mol_eq, mf.Hessian().kernel())["freq_wavenumber"]
        # Imaginary modes come back as negative reals (PySCF convention) or complex numbers.
        freqs = [float(np.real(f)) if np.isreal(f) else -float(np.abs(np.imag(f))) for f in np.atleast_1d(raw)]
        if imaginary_modes(freqs):
            raise RuntimeError(f"{m.id}: {imaginary_modes(freqs)} imaginary mode(s); not a minimum: {freqs[:3]}")

    return {
        "id": m.id,
        "smiles": m.smiles,
        "charge": m.charge,
        "multiplicity": 1,
        "method": {
            "program": "PySCF",
            "version": pyscf.__version__,
            "level": LEVEL,
            "xc": XC,
            "xc_definition": str(dft.libxc.parse_xc(XC)),
            "basis": BASIS,
            "grid_level": GRID,
            "optimizer": f"geomeTRIC {geometric.__version__}, GAU_TIGHT",
            "phase": "gas (isolated molecule)",
        },
        "date": dt.date.today().isoformat(),
        "start": start,
        "input_sha256": hashlib.sha256(f"{LEVEL} q={m.charge}\n{start_text}".encode()).hexdigest(),
        "converged": conv,
        "energy_hartree": float(energy),
        "atoms": [[s, *(round(float(v), 6) for v in c)] for s, c in zip(symbols, out_xyz)],
        "frequencies_cm1": None if freqs is None else [round(f, 1) for f in freqs],
        "imaginary_modes": None if freqs is None else imaginary_modes(freqs),
        "seconds": round(time.time() - t0),
    }


def result_path(mid: str, *, validate: bool = False) -> Path:
    return OUT / ("validation" if validate else "") / f"{mid}.json"


def main(argv: list[str]) -> int:
    validate = "--validate" in argv
    for mid in [a for a in argv if not a.startswith("--")]:
        m = BY_ID[mid]
        res = run(m, validate=validate)
        path = result_path(mid, validate=validate)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(res, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{mid}: E={res['energy_hartree']:.6f} Eh, {res['seconds']} s, imaginary={res['imaginary_modes']}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
