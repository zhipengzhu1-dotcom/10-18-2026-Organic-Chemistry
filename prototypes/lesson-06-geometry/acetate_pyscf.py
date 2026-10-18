"""PROTOTYPE geometry run for Lesson 6 (acetate-bond-lengths, acetate-hybrid Scenes).

Spec: docs/specs/unit-1/lesson-06-resonance.md, "Geometry for acetate-bond-lengths and acetate-hybrid":
both molecules optimised with the same method, PySCF B3LYP/cc-pVTZ, gas phase, labelled "computed".
Then a harmonic frequency check (no imaginary modes = a true minimum) and the spec's build-time sanity check.

Run (WSL):  ~/.venvs/astratron-pyscf/bin/python acetate_pyscf.py
Writes acetic-acid.json and acetate.json next to this file.
"""
import json, os, platform, sys, time
import numpy as np
import pyscf, geometric
from pyscf import gto, dft
from pyscf.geomopt.geometric_solver import optimize
from pyscf.hessian import thermo

HERE = os.path.dirname(os.path.abspath(__file__))
BASIS, XC = "cc-pvtz", "b3lyp"

# Rough starting structures (Å). Acetic acid: the syn conformer (O=C–O–H dihedral ≈ 0), the gas-phase minimum.
# Acetate: one methyl H perpendicular to the carboxylate plane, so a mirror plane maps one O onto the other.
START = {
    "acetic-acid": dict(charge=0, atoms="""
        C  -1.500  0.000  0.000
        C   0.000  0.000  0.000
        O   0.690  1.000  0.000
        O   0.700 -1.150  0.000
        H   1.650 -1.000  0.000
        H  -1.860  1.020  0.000
        H  -1.860 -0.510  0.880
        H  -1.860 -0.510 -0.880""",
        labels={"methyl C": 0, "carboxyl C": 1, "O (C=O)": 2, "O (C–OH)": 3}),
    "acetate": dict(charge=-1, atoms="""
        C  -1.540  0.000  0.000
        C   0.000  0.000  0.000
        O   0.660  1.100  0.000
        O   0.660 -1.100  0.000
        H  -1.900  0.000  1.020
        H  -1.900  0.880 -0.510
        H  -1.900 -0.880 -0.510""",
        labels={"methyl C": 0, "carboxyl C": 1, "O (a)": 2, "O (b)": 3}),
    # The perpendicular-H acetate turns out to be a methyl-rotation saddle (one small imaginary mode).
    # Start again with one methyl H in the carboxylate plane, eclipsing O (a): the true minimum.
    "acetate-eclipsed": dict(charge=-1, atoms="""
        C  -1.540  0.000  0.000
        C   0.000  0.000  0.000
        O   0.660  1.100  0.000
        O   0.660 -1.100  0.000
        H  -1.900  1.020  0.000
        H  -1.900 -0.510  0.880
        H  -1.900 -0.510 -0.880""",
        labels={"methyl C": 0, "carboxyl C": 1, "O (a)": 2, "O (b)": 3}),
}

def run(name, spec):
    t0 = time.time()
    mol = gto.M(atom=spec["atoms"], basis=BASIS, charge=spec["charge"], spin=0, unit="Angstrom", verbose=3)
    mf = dft.RKS(mol); mf.xc = XC; mf.grids.level = 4; mf.conv_tol = 1e-10
    mol_eq = optimize(mf, maxsteps=100, convergence_set="GAU_TIGHT")
    mf = dft.RKS(mol_eq); mf.xc = XC; mf.grids.level = 4; mf.conv_tol = 1e-11
    energy = mf.kernel()
    freq = thermo.harmonic_analysis(mol_eq, mf.Hessian().kernel())["freq_wavenumber"]
    xyz = mol_eq.atom_coords(unit="Angstrom")
    d = lambda i, j: float(np.linalg.norm(xyz[i] - xyz[j]))
    L = spec["labels"]; o = [k for k in L if k.startswith("O")]
    out = {
        "molecule": name, "charge": spec["charge"], "multiplicity": 1,
        "method": {"program": "PySCF", "version": pyscf.__version__, "xc": XC, "pyscf_xc_definition": dft.libxc.parse_xc(XC)[1] and str(dft.libxc.parse_xc(XC)),
                   "basis": BASIS, "phase": "gas", "grid_level": 4, "optimizer": f"geomeTRIC {geometric.__version__}, GAU_TIGHT"},
        "label": "computed",
        "source_note": "Bond lengths computed with PySCF, B3LYP/cc-pVTZ, gas phase. Both molecules use the same method so they can be compared fairly.",
        "energy_hartree": float(energy),
        "atoms": [{"el": mol_eq.atom_symbol(i), "xyz_angstrom": [round(float(c), 6) for c in xyz[i]]} for i in range(mol_eq.natm)],
        "bonds_angstrom": {f"C–{k}": round(d(L["carboxyl C"], L[k]), 4) for k in o} | {"C–C": round(d(L["methyl C"], L["carboxyl C"]), 4)},
        "frequencies_cm1": [round(float(np.real(f)), 1) if np.isreal(f) else f"{float(np.imag(f)):.1f}i" for f in freq],
        "imaginary_modes": int(sum(1 for f in freq if not np.isreal(f) or np.real(f) < 0)),
        "run": {"seconds": round(time.time() - t0), "host": platform.platform(), "python": sys.version.split()[0]},
    }
    with open(os.path.join(HERE, f"{name}.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print(name, out["bonds_angstrom"], "imaginary:", out["imaginary_modes"], flush=True)
    return out

if __name__ == "__main__":
    only = sys.argv[1:]
    if only:  # e.g. `python acetate_pyscf.py acetate-eclipsed` reruns one structure
        for n in only: run(n, START[n])
        sys.exit()
    acid, anion = (run(n, START[n]) for n in ("acetic-acid", "acetate"))
    a = acid["bonds_angstrom"]; b = anion["bonds_angstrom"]
    co_double, co_single = a["C–O (C=O)"], a["C–O (C–OH)"]; b1, b2 = b["C–O (a)"], b["C–O (b)"]
    checks = {
        "acetate's two C–O agree within 0.005 Å": abs(b1 - b2) < 0.005,
        "acetic acid's C=O shorter than its C–O by more than 0.1 Å": co_single - co_double > 0.1,
        "acetate's C–O lies between acetic acid's two": co_double < (b1 + b2) / 2 < co_single,
        "both are true minima (no imaginary frequencies)": acid["imaginary_modes"] == 0 and anion["imaginary_modes"] == 0,
    }
    with open(os.path.join(HERE, "sanity-check.json"), "w", encoding="utf-8") as fh:
        json.dump(checks, fh, ensure_ascii=False, indent=2)
    for k, v in checks.items(): print("PASS" if v else "FAIL", k)
