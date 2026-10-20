"""Turn a parsed CCCBDB page or a cached PySCF result into a cited data file (ADR 0002, #60 shape).

Experimental files: every value is one of CCCBDB's listed internal coordinates, cited to its own
paper "via" CCCBDB; the atoms are CCCBDB's Cartesians. If those Cartesians disagree with the listed
parameters (ketene, see the Lesson 4 spec), they are rebuilt from the parameters by least squares, so
a distance a Student taps always equals the cited value. Computed files: values measured on our
optimised structure at the atoms the molecule registry names.
"""

from __future__ import annotations

import re
from collections import Counter

import numpy as np

from .cccbdb import Atom, Internal, Page
from .checks import bonds_from_radii, imaginary_modes
from .molecules import Molecule, cas_digits

NIST_CITATION = (
    "NIST Computational Chemistry Comparison and Benchmark Database, NIST Standard Reference Database Number 101, "
    "Release 22, May 2022, Editor: Russell D. Johnson III, http://cccbdb.nist.gov/, DOI:10.18434/T47C7Z"
)
NIST_SHORT = "NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z"
NIST_LICENCE ="NIST SRD 101; reuse with acknowledgement (https://www.nist.gov/open/license). Not covered by the repo's MIT licence."
NOTICE = (
    "Data derived from NIST CCCBDB; not covered by the repository's MIT licence or the content's CC BY-NC-SA licence. "
    f"{NIST_CITATION}. © U.S. Secretary of Commerce; used with acknowledgement under https://www.nist.gov/open/license."
)
OURS_LICENCE = "CC BY-NC-SA 4.0 (our calculation, AstraTron content)"
PIPELINE = "pipelines/geometry (#67)"
LENGTH_TOL, ANGLE_TOL = 0.001, 0.1  # Å, degrees: tapped values must match the cited ones


# --- measuring ---------------------------------------------------------------------------------

def measure(xyz: np.ndarray, idx: tuple[int, ...]) -> float:
    """Distance (2 atoms, Å), angle at the middle atom (3, °) or dihedral (4, °); 0-based indices."""
    p = [np.asarray(xyz[i], dtype=float) for i in idx]
    if len(p) == 2:
        return float(np.linalg.norm(p[0] - p[1]))
    if len(p) == 3:
        u, v = p[0] - p[1], p[2] - p[1]
        c = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v))
        return float(np.degrees(np.arccos(np.clip(c, -1.0, 1.0))))
    b0, b1, b2 = p[0] - p[1], p[2] - p[1], p[3] - p[2]
    b1n = b1 / np.linalg.norm(b1)
    v, w = b0 - np.dot(b0, b1n) * b1n, b2 - np.dot(b2, b1n) * b1n
    return float(np.degrees(np.arctan2(np.dot(np.cross(b1n, v), w), np.dot(v, w))))


def _usable(internal: Internal, n_atoms: int) -> bool:
    """Parameters on dummy atoms (CCCBDB numbers them 255, "X is on symmetry axis") are not geometry we show."""
    return len(internal.atoms) >= 2 and all(1 <= a <= n_atoms for a in internal.atoms)


def _angle_diff(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def inconsistencies(atoms: list[Atom], internals: list[Internal]) -> list[str]:
    """Listed parameters that the Cartesians do not reproduce within 0.001 Å / 0.1°."""
    xyz = np.array([[a.x, a.y, a.z] for a in atoms])
    out = []
    for it in internals:
        if not _usable(it, len(atoms)):
            continue
        got = measure(xyz, tuple(a - 1 for a in it.atoms))
        if len(it.atoms) == 2:
            bad = abs(got - it.value) > LENGTH_TOL
        else:
            bad = _angle_diff(abs(got) if len(it.atoms) == 4 else got, abs(it.value) if len(it.atoms) == 4 else it.value) > ANGLE_TOL
        if bad:
            out.append(f"{it.description} {it.atoms}: listed {it.value}, Cartesians give {got:.4f}")
    return out


def equivalents(atoms: list[Atom], idx: tuple[int, ...]) -> list[tuple[int, ...]]:
    """Every bonded chain of atoms (0-based) with the same elements as `idx`, each chain once (a chain and its reverse
    are the same bond or angle). For one-centre molecules such as chloroform these are the symmetry-equivalent ones."""
    from itertools import permutations

    symbols = [a.element for a in atoms]
    xyz = np.array([[a.x, a.y, a.z] for a in atoms])
    bonded = set(bonds_from_radii(symbols, xyz))
    linked = lambda i, j: (min(i, j), max(i, j)) in bonded  # noqa: E731
    out: list[tuple[int, ...]] = []
    for chain in permutations(range(len(atoms)), len(idx)):
        if [symbols[i] for i in chain] != [symbols[i] for i in idx]:
            continue
        if all(linked(chain[k], chain[k + 1]) for k in range(len(chain) - 1)) and chain[::-1] not in out:
            out.append(chain)
    return out


def rebuild(atoms: list[Atom], internals: list[Internal], *, symmetric: bool = False) -> np.ndarray:
    """Least-squares fit of the Cartesians to the listed parameters, starting from CCCBDB's own table. `symmetric`:
    each listed bond or angle holds for every equivalent one (see `equivalents`)."""
    from scipy.optimize import least_squares

    x0 = np.array([[a.x, a.y, a.z] for a in atoms])
    used = [it for it in internals if _usable(it, len(atoms)) and len(it.atoms) <= 3]
    targets = [
        (chain, it.value)
        for it in used
        for chain in (equivalents(atoms, tuple(a - 1 for a in it.atoms)) if symmetric else [tuple(a - 1 for a in it.atoms)])
    ]

    def residuals(flat: np.ndarray) -> np.ndarray:
        xyz = flat.reshape(-1, 3)
        res = []
        for chain, value in targets:
            got = measure(xyz, chain)
            res.append((got - value) * (1.0 if len(chain) == 2 else 0.01))
        res.extend(1e-4 * (flat - x0.ravel()))  # stay close to the original frame and orientation
        return np.array(res)

    fit = least_squares(residuals, x0.ravel(), xtol=1e-14, ftol=1e-14, gtol=1e-14)
    xyz = fit.x.reshape(-1, 3)
    return xyz - xyz.mean(axis=0) + x0.mean(axis=0)


# --- bonds -------------------------------------------------------------------------------------

def bonds_with_orders(symbols: list[str], xyz: np.ndarray, charge: int = 0) -> list[list[int]]:
    """[[i, j, order], ...] (0-based): connectivity from covalent radii, bond orders from RDKit."""
    from rdkit import Chem
    from rdkit.Chem import rdDetermineBonds

    block = f"{len(symbols)}\n\n" + "\n".join(f"{s} {x:.6f} {y:.6f} {z:.6f}" for s, (x, y, z) in zip(symbols, xyz))
    mol = Chem.MolFromXYZBlock(block)
    try:
        rdDetermineBonds.DetermineBonds(mol, charge=charge)
        found = {(min(b.GetBeginAtomIdx(), b.GetEndAtomIdx()), max(b.GetBeginAtomIdx(), b.GetEndAtomIdx())): int(b.GetBondTypeAsDouble())
                 for b in mol.GetBonds()}
    except ValueError:
        found = {}
    pairs = bonds_from_radii(symbols, xyz)
    return [[i, j, found.get((i, j), 1)] for i, j in pairs]


# --- data files --------------------------------------------------------------------------------

QUANTITY = {2: ("bond-length", "Å"), 3: ("angle", "°"), 4: ("dihedral", "°")}


def _source_id(ref_key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ref_key.lower()).strip("-")


def _value_key(description: str) -> str:
    return f"{description[0]}.{description[1:]}"


def _label(symbols: list[str], idx: tuple[int, ...]) -> str:
    return "–".join(symbols[i] for i in idx)


def experimental(m: Molecule, page: Page) -> dict:
    symbols = [a.element for a in page.atoms]
    internals = [it for it in page.internals if _usable(it, len(page.atoms))]
    provenance: dict = {
        "pipeline": PIPELINE,
        "url": f"https://cccbdb.nist.gov/expgeom2x.asp?casno={cas_digits(m.cas)}&charge=0",
        "cccbdbName": page.name,
        "pointGroup": "not used (CCCBDB labels can be wrong)",
    }
    problems = inconsistencies(page.atoms, page.internals)
    if problems:
        xyz = rebuild(page.atoms, page.internals, symmetric=m.symmetric)
        provenance["rebuilt"] = (
            "CCCBDB's Cartesian table disagrees with its own listed parameters (" + "; ".join(problems) + "), so the "
            "Cartesians were rebuilt from the listed parameters by a least-squares fit"
            + (", holding every symmetry-equivalent bond and angle at its listed value." if m.symmetric else ".")
        )
    else:
        xyz = np.array([[a.x, a.y, a.z] for a in page.atoms])

    # The short form reads well after "via" in the Source note; the full citation is in the notice.
    sources: dict = {"cccbdb": {"kind": "experimental", "citation": NIST_SHORT, "licence": NIST_LICENCE}}
    for it in internals:
        if it.ref and _source_id(it.ref) not in sources:
            ref = page.references.get(it.ref)
            if ref is None:
                raise ValueError(f"{m.id}: reference {it.ref!r} is not in the page's reference list")
            citation = ref.citation + (f", doi:{ref.doi}" if ref.doi else "")
            sources[_source_id(it.ref)] = {"kind": "experimental", "citation": citation, "via": "cccbdb", "licence": NIST_LICENCE}

    repeats = Counter(it.description for it in internals)
    values: dict = {}
    for it in internals:
        key = _value_key(it.description)
        if repeats[it.description] > 1:
            key += "." + "-".join(str(a) for a in it.atoms)
        idx = tuple(a - 1 for a in it.atoms)
        quantity, unit = QUANTITY[len(idx)]
        values[key] = {
            "label": _label(symbols, idx),
            "quantity": quantity,
            "value": it.value,
            "unit": unit,
            "source": _source_id(it.ref) if it.ref else "cccbdb",
            "atoms": list(idx),
        }
        if it.comment:
            values[key]["note"] = it.comment

    return {
        "id": m.id,
        "kind": "molecule",
        "title": m.title,
        "geometry": "experimental",
        "notice": NOTICE,
        "sources": sources,
        "values": values,
        "atoms": {"source": "cccbdb", "list": [[s, *(round(float(c), 4) for c in p)] for s, p in zip(symbols, xyz)]},
        "bonds": bonds_with_orders(symbols, xyz, m.charge),
        "provenance": provenance,
    }


def computed(m: Molecule, res: dict, *, max_deviation: float | None, extra: dict | None = None) -> dict:
    freqs = res.get("frequencies_cm1")
    if freqs is None:
        raise ValueError(f"{m.id}: no frequency check in the result; run without --validate")
    if imaginary_modes(freqs):
        raise ValueError(f"{m.id}: {imaginary_modes(freqs)} imaginary mode(s); not a true minimum")
    symbols = [a[0] for a in res["atoms"]]
    xyz = np.array([a[1:] for a in res["atoms"]], dtype=float)
    meth = res["method"]
    method = {"program": meth["program"], "version": meth["version"], "level": meth["level"], "date": res["date"]}
    if max_deviation is not None:
        method["maxDeviation"] = max_deviation
    values = {}
    for key, (label, idx) in m.values.items():
        quantity, unit = QUANTITY[len(idx)]
        v = measure(xyz, idx)
        values[key] = {"label": label, "quantity": quantity, "value": round(v, 4 if len(idx) == 2 else 2), "unit": unit, "source": "ours", "atoms": list(idx)}
    provenance = {
        "pipeline": PIPELINE,
        "start": res["start"],
        "inputSha256": res["input_sha256"],
        "optimiser": meth["optimizer"],
        "basis": meth["basis"],
        "gridLevel": meth["grid_level"],
        "xcDefinition": meth["xc_definition"],
        "energyHartree": res["energy_hartree"],
        "lowestFrequency": min(freqs) if freqs else None,
        "imaginaryModes": 0,
        "charge": res["charge"],
    }
    if m.note:
        provenance["note"] = m.note
    provenance.update(extra or {})
    return {
        "id": m.id,
        "kind": "molecule",
        "title": m.title,
        "geometry": "computed",
        "sources": {
            "ours": {
                "kind": "computed",
                "citation": (
                    f"Our calculation: {meth['program']} {meth['version']}, {meth['level']}, isolated molecule, optimised with "
                    f"{meth['optimizer']} and checked as a true minimum (all harmonic frequencies real), {res['date']}"
                ),
                "licence": OURS_LICENCE,
                "method": method,
            }
        },
        "values": values,
        "atoms": {"source": "ours", "list": [[s, *(round(float(c), 4) for c in p)] for s, p in zip(symbols, xyz)]},
        "bonds": bonds_with_orders(symbols, xyz, m.charge),
        "provenance": {k: v for k, v in provenance.items() if v is not None},
    }


def max_bond_deviation(exp_atoms: list[list], comp_atoms: list[list]) -> float:
    """Largest |Δr| over the bonds of the experimental structure; both lists in the same atom order."""
    symbols = [a[0] for a in exp_atoms]
    if symbols != [a[0] for a in comp_atoms]:
        raise ValueError("atom order differs between experimental and computed structures")
    e = np.array([a[1:] for a in exp_atoms], dtype=float)
    c = np.array([a[1:] for a in comp_atoms], dtype=float)
    return max(abs(measure(e, (i, j)) - measure(c, (i, j))) for i, j in bonds_from_radii(symbols, e))
