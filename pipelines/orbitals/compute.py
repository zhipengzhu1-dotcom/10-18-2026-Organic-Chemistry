"""Computed orbitals → cited data + meshes (#70). Slow-ish (seconds to a minute per set), so the
output is committed and CI only checks it (tests/test_orbital_output.py):

    OMP_NUM_THREADS=4 uv run --group compute python -m orbitals.compute            # every set
    OMP_NUM_THREADS=4 uv run --group compute python -m orbitals.compute ethylene-orbitals

Two kinds of set, as the Lesson specs fix them:
- Lesson 4 (`ibo`): a B3LYP/cc-pVTZ single point at the **experimental** geometry (the molecule's
  CCCBDB data file), then intrinsic bond orbitals (IBO, Knizia 2013) over the valence occupied
  orbitals. Sanity checks: ethylene's one π antisymmetric through the molecular plane; acetylene's
  two π rotated into the axis-aligned planes with a uniform summed density (2%); ketene's C=C and
  C=O π in perpendicular planes.
- Lesson 8 (`canonical`): canonical MOs at the B3LYP/cc-pVTZ geometry #67 optimised and
  frequency-checked (the `*-b3lyp` data files), restricted closed shell; HOMO/LUMO/gap in eV, and
  `frontier-flow` (the two NH₃/BF₃ HOMO→LUMO gaps). Sanity checks 1–7 of the Lesson 8 spec.

Every orbital is evaluated on a grid (no cube file needed: `mol.eval_gto` is what cubegen calls),
meshed per sign at one isovalue (ISO, a.u.), oriented and gated by `mesh.isosurface` /
`mesh.write_glb` (closed, counter-clockwise outside, outward normals), and written to
site/public/orbitals/<set>/<orbital>.glb. The data file content/subjects/organic/data/<set>.json
carries the energies (cited values), the isovalue, the orbital list (mesh URL + sha256, labels,
lobe label points) and the input hash.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .mesh import Grid, Mesh, MeshError, isosurface, write_glb

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "content/subjects/organic/data"
MESHES = REPO / "site/public/orbitals"

XC, BASIS, GRID_LEVEL, CONV_TOL = "b3lyp", "cc-pvtz", 4, 1e-11
LEVEL = "B3LYP/cc-pVTZ"
ISO = 0.05  # orbital amplitude in a.u. (bohr^-3/2); one isovalue for every orbital in both Lessons
STEP = 0.14  # Å between grid points
PAD = 4.5  # Å of box around the atoms
BOHR = 0.52917721090380  # Å, CODATA 2018
HARTREE_EV = 27.211386245988  # eV, CODATA 2018
CODATA = "CODATA 2018 (Tiesinga et al., Rev. Mod. Phys. 93, 025010 (2021), doi:10.1103/RevModPhys.93.025010)"
LICENCE = "CC BY-NC-SA 4.0 (our calculation, AstraTron content)"
KNIZIA = "Knizia, J. Chem. Theory Comput. 9, 4834 (2013), doi:10.1021/ct400687b"


@dataclass
class Orbital:
    id: str
    label: str  # e.g. "π (HOMO)"
    chip: str  # the text chip, e.g. "π"
    style: str  # "sigma" | "pi" (L4: colour = kind) or "phase" (L8: colour + pattern = sign)
    energy: str | None = None  # value key holding its energy


@dataclass
class OrbitalSet:
    id: str
    molecule: str  # data file id of the geometry
    kind: str  # "ibo" | "canonical"
    title: str
    lesson: str
    orbitals: list[Orbital] = field(default_factory=list)


SETS = [
    OrbitalSet("ethylene-orbitals", "ethylene", "ibo", "Ethylene bond orbitals", "L4", [
        Orbital("sigma", "C–C σ bond orbital", "σ", "sigma"),
        Orbital("pi", "C=C π bond orbital", "π", "pi"),
    ]),
    OrbitalSet("acetylene-orbitals", "acetylene", "ibo", "Acetylene bond orbitals", "L4", [
        Orbital("sigma", "C–C σ bond orbital", "σ", "sigma"),
        Orbital("pi1", "π bond orbital 1 (xz plane)", "π", "pi"),
        Orbital("pi2", "π bond orbital 2 (yz plane)", "π", "pi"),
        Orbital("pi-both", "both π bond orbitals, summed density", "π", "pi"),
    ]),
    OrbitalSet("ketene-orbitals", "ketene", "ibo", "Ketene π bond orbitals", "L4", [
        Orbital("cc-pi", "C=C π bond orbital", "π", "pi"),
        Orbital("co-pi", "C=O π bond orbital", "π", "pi"),
    ]),
    OrbitalSet("hydrogen-b3lyp-orbitals", "hydrogen-b3lyp", "canonical", "H₂ molecular orbitals", "L8", [
        Orbital("sigma", "σ (HOMO)", "σ", "phase", "homo"),
        Orbital("sigma-star", "σ* (LUMO)", "σ*", "phase", "lumo"),
    ]),
    OrbitalSet("ethane-b3lyp-orbitals", "ethane-b3lyp", "canonical", "Ethane frontier orbitals", "L8", []),
    OrbitalSet("ethylene-b3lyp-orbitals", "ethylene-b3lyp", "canonical", "Ethylene frontier orbitals", "L8", [
        Orbital("homo", "π (HOMO)", "π", "phase", "homo"),
        Orbital("lumo", "π* (LUMO)", "π*", "phase", "lumo"),
    ]),
    OrbitalSet("ammonia-b3lyp-orbitals", "ammonia-b3lyp", "canonical", "Ammonia frontier orbitals", "L8", [
        Orbital("homo", "lone pair (HOMO)", "HOMO", "phase", "homo"),
    ]),
    OrbitalSet("boron-trifluoride-b3lyp-orbitals", "boron-trifluoride-b3lyp", "canonical", "Boron trifluoride frontier orbitals", "L8", [
        Orbital("lumo", "empty p on boron (LUMO)", "LUMO", "phase", "lumo"),
    ]),
]
BY_ID = {s.id: s for s in SETS}
FORMULA = {"hydrogen-b3lyp": "H₂", "ethane-b3lyp": "Ethane", "ethylene-b3lyp": "Ethylene", "ammonia-b3lyp": "NH₃", "boron-trifluoride-b3lyp": "BF₃"}


class CheckError(RuntimeError):
    """A spec sanity check failed; nothing is written for the set."""


def check(ok: bool, message: str) -> None:
    if not ok:
        raise CheckError(message)


# ---- the calculation ------------------------------------------------------------------------------


def load_atoms(molecule: str) -> tuple[dict, list]:
    data = json.loads((DATA / f"{molecule}.json").read_text(encoding="utf-8"))
    return data, data["atoms"]["list"]


def input_sha256(s: OrbitalSet, atoms: list) -> str:
    """What the output depends on: the atoms as committed, and every setting. CI compares it."""
    payload = {"set": s.id, "kind": s.kind, "atoms": atoms, "level": LEVEL, "grid": GRID_LEVEL, "conv": CONV_TOL,
               "iso": ISO, "step": STEP, "pad": PAD, "orbitals": [o.id for o in s.orbitals]}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def scf(atoms: list):
    from pyscf import dft, gto

    mol = gto.M(atom=[[e, (x, y, z)] for e, x, y, z in atoms], basis=BASIS, unit="Angstrom", charge=0, spin=0, verbose=0)
    mf = dft.RKS(mol)
    mf.xc, mf.grids.level, mf.conv_tol = XC, GRID_LEVEL, CONV_TOL
    mf.kernel()
    check(bool(mf.converged), "SCF did not converge")
    return mol, mf


class Field:
    """ψ (or a density) and its gradient at points given in Å."""

    def __init__(self, mol, coeffs: np.ndarray, density: bool = False):
        self.mol, self.c, self.density = mol, np.atleast_2d(np.asarray(coeffs).T).T, density

    def _ao(self, points: np.ndarray, deriv: bool):
        return self.mol.eval_gto("GTOval_sph_deriv1" if deriv else "GTOval_sph", points / BOHR)

    def __call__(self, points: np.ndarray, chunk: int = 40000) -> np.ndarray:
        out = []
        for i in range(0, len(points), chunk):
            v = self._ao(points[i : i + chunk], False) @ self.c
            out.append((v**2).sum(1) if self.density else v[:, 0])
        return np.concatenate(out)

    def gradient(self, points: np.ndarray, chunk: int = 20000) -> np.ndarray:
        out = []
        for i in range(0, len(points), chunk):
            ao = self._ao(points[i : i + chunk], True)  # (4, N, nao): value, d/dx, d/dy, d/dz
            v = ao[0] @ self.c
            d = np.stack([ao[k] @ self.c for k in (1, 2, 3)], 1)  # N×3×norb
            out.append(2 * np.einsum("nk,nck->nc", v, d) if self.density else d[:, :, 0])
        return np.concatenate(out)


def populations(mol, S: np.ndarray, c: np.ndarray) -> np.ndarray:
    """Mulliken-style share of one orbital on each atom (sums to 1)."""
    sc = S @ c
    per_ao = c * sc
    out = np.zeros(mol.natm)
    for a, (_, _, p0, p1) in enumerate(mol.aoslice_by_atom()):
        out[a] = per_ao[p0:p1].sum()
    return out


def sample_points(xyz: np.ndarray, n: int = 600) -> np.ndarray:
    """Fixed points around the molecule (seeded), for symmetry tests."""
    rng = np.random.default_rng(70)
    return xyz.mean(0) + rng.normal(scale=1.2, size=(n, 3))


def parity(f, points: np.ndarray, mirror) -> float:
    """+1 if f is symmetric under the mirror map, −1 if antisymmetric."""
    a, b = f(points), f(mirror(points))
    return float((a * b).sum() / max((a * a).sum(), 1e-300))


def reflect(axis: int, through: float = 0.0):
    def m(p):
        q = p.copy()
        q[:, axis] = 2 * through - q[:, axis]
        return q
    return m


def plane_normal(xyz: np.ndarray) -> np.ndarray:
    """Unit normal of the best plane through the atoms."""
    _, _, vt = np.linalg.svd(xyz - xyz.mean(0))
    return vt[2]


def grid_for(xyz: np.ndarray) -> Grid:
    lo = np.floor((xyz.min(0) - PAD) / STEP) * STEP
    hi = xyz.max(0) + PAD
    shape = tuple(int(np.ceil((hi[i] - lo[i]) / STEP)) + 1 for i in range(3))
    return Grid(lo, STEP, shape)


# ---- picking the orbitals --------------------------------------------------------------------------


def ibo_orbitals(s: OrbitalSet, mol, mf, xyz: np.ndarray, symbols: list[str]) -> dict[str, Field]:
    from pyscf import lo

    occ = mf.mo_coeff[:, mf.mo_occ > 0]
    ncore = sum(1 for e in symbols if e != "H")
    valence = occ[:, ncore:]
    ibo = lo.ibo.ibo(mol, valence, iaos=lo.iao.iao(mol, valence), verbose=0)
    S = mol.intor("int1e_ovlp")
    pts = sample_points(xyz)
    fields = [Field(mol, ibo[:, k]) for k in range(ibo.shape[1])]
    pops = [populations(mol, S, ibo[:, k]) for k in range(ibo.shape[1])]
    heavy = [i for i, e in enumerate(symbols) if e != "H"]

    def on(k, atoms_):
        return float(sum(pops[k][a] for a in atoms_))

    if s.id == "ethylene-orbitals":
        n = plane_normal(xyz)
        axis = int(np.argmax(np.abs(n)))
        check(np.abs(n)[axis] > 0.999, "ethylene is not in an axis plane")
        par = [parity(f, pts, reflect(axis)) for f in fields]
        anti = [k for k, p in enumerate(par) if p < -0.9]
        check(len(anti) == 1, f"ethylene: expected exactly one valence IBO antisymmetric through the molecular plane, found {len(anti)}")
        check(on(anti[0], heavy) > 0.9 and min(pops[anti[0]][a] for a in heavy) > 0.3, "ethylene: the π IBO is not centred on the two carbons")
        sigma = [k for k, p in enumerate(par) if p > 0.9 and on(k, heavy) > 0.9 and min(pops[k][a] for a in heavy) > 0.3]
        check(len(sigma) == 1, "ethylene: expected one symmetric C–C σ IBO")
        pi = signed(fields[anti[0]], probe(xyz, heavy, axis))
        return {"sigma": signed(fields[sigma[0]], xyz[heavy].mean(0)[None]), "pi": pi}

    if s.id == "acetylene-orbitals":
        check(np.allclose(xyz[:, :2], 0, atol=1e-6), "acetylene is not on the z axis")
        c2 = lambda p: p * np.array([-1, -1, 1])  # noqa: E731 (rotation by 180° about the axis)
        par = [parity(f, pts, c2) for f in fields]
        pis = [k for k, p in enumerate(par) if p < -0.9]
        check(len(pis) == 2, f"acetylene: expected two π IBOs, found {len(pis)}")
        sigma = [k for k, p in enumerate(par) if p > 0.9 and on(k, heavy) > 0.9 and min(pops[k][a] for a in heavy) > 0.3]
        check(len(sigma) == 1, "acetylene: expected one C–C σ IBO")
        c1, c2_ = ibo[:, pis[0]], ibo[:, pis[1]]
        mid = xyz[heavy].mean(0)
        a, b = Field(mol, c1)(mid[None] + [[0, 0.7, 0]])[0], Field(mol, c2_)(mid[None] + [[0, 0.7, 0]])[0]
        r = np.hypot(a, b)
        pix = Field(mol, (b * c1 - a * c2_) / r)  # zero on the yz plane: lobes along ±x
        piy = Field(mol, (a * c1 + b * c2_) / r)  # zero on the xz plane: lobes along ±y
        check(parity(pix, pts, reflect(0)) < -0.99, "acetylene: π1 is not antisymmetric through the yz plane")
        check(parity(piy, pts, reflect(1)) < -0.99, "acetylene: π2 is not antisymmetric through the xz plane")
        pix, piy = signed(pix, probe(xyz, heavy, 0)), signed(piy, probe(xyz, heavy, 1))
        both = Field(mol, np.stack([pix.c[:, 0], piy.c[:, 0]], 1), density=True)
        ring = mid + 0.7 * np.stack([np.cos(t := np.linspace(0, 2 * np.pi, 36, endpoint=False)), np.sin(t), 0 * t], 1)
        rho = both(ring)
        check(rho.max() / rho.min() - 1 < 0.02, f"acetylene: summed π density varies {rho.max() / rho.min() - 1:.1%} around the axis")
        return {"sigma": signed(fields[sigma[0]], mid[None]), "pi1": pix, "pi2": piy, "pi-both": both}

    if s.id == "ketene-orbitals":
        # CCCBDB frame: the H–C–H plane is x = 0, the C=C=O axis is z.
        c_h2, c_o, o = heavy[0], heavy[1], heavy[2]
        check(symbols[o] == "O", "ketene: unexpected atom order")
        px = [k for k, f in enumerate(fields) if parity(f, pts, reflect(0)) < -0.9]
        py = [k for k, f in enumerate(fields) if parity(f, pts, reflect(1)) < -0.9]
        cc = [k for k in px if pops[k][c_h2] > 0.3 and pops[k][c_o] > 0.3]
        check(len(cc) == 1, "ketene: expected one C=C π IBO antisymmetric through the H–C–H plane")
        co = sorted(py, key=lambda k: -min(pops[k][c_o], pops[k][o]))
        check(bool(co) and min(pops[co[0]][c_o], pops[co[0]][o]) > 0.15,
              "ketene: expected a C=C=O-axis π IBO on C and O, antisymmetric through the plane at right angles to H–C–H")
        return {"cc-pi": signed(fields[cc[0]], probe(xyz, [c_h2, c_o], 0)), "co-pi": signed(fields[co[0]], probe(xyz, [c_o, o], 1))}

    raise KeyError(s.id)


def probe(xyz: np.ndarray, atoms_: list[int], axis: int) -> np.ndarray:
    """A point 0.7 Å off the bond's midpoint along +axis: the π lobe there is the solid one."""
    p = xyz[atoms_].mean(0).copy()
    p[axis] += 0.7
    return p[None]


def signed(f: Field, at: np.ndarray) -> Field:
    """Fixes the sign so ψ > 0 at the probe point (so solid/hatched is stable between builds)."""
    if not f.density and f(at)[0] < 0:
        f.c = -f.c
    return f


def canonical_sign(f: Field, grid_values: np.ndarray, points: np.ndarray) -> Field:
    """Canonical MOs: ψ > 0 at the grid point of largest |ψ|, ties broken by the largest (z, y, x)."""
    top = np.abs(grid_values).max()
    near = np.nonzero(np.abs(grid_values) >= top * (1 - 1e-6))[0]
    best = near[np.lexsort((points[near, 0], points[near, 1], points[near, 2]))[-1]]
    if grid_values[best] < 0:
        f.c = -f.c
    return f


# ---- one set ----------------------------------------------------------------------------------------


def run(s: OrbitalSet) -> dict:
    import pyscf

    t0 = time.time()
    data, atoms = load_atoms(s.molecule)
    symbols = [a[0] for a in atoms]
    xyz = np.array([a[1:] for a in atoms], float)
    mol, mf = scf(atoms)
    grid = grid_for(xyz)
    points = grid.points()
    prov: dict = {"pipeline": "pipelines/orbitals (#70)", "inputSha256": input_sha256(s, atoms), "scfEnergyHartree": float(mf.e_tot),
                  "grid": {"step": STEP, "pad": PAD, "shape": list(grid.shape)}, "checks": []}
    values: dict = {}
    fields: dict[str, Field] = {}

    if s.kind == "ibo":
        fields = ibo_orbitals(s, mol, mf, xyz, symbols)
        prov["checks"].append({"ethylene-orbitals": "one π IBO antisymmetric through the molecular plane, on the two carbons; one symmetric C–C σ",
                               "acetylene-orbitals": "two π IBOs rotated into the xz and yz planes; summed π density uniform within 2% around the axis",
                               "ketene-orbitals": "C=C π antisymmetric through the H–C–H plane; C=O π antisymmetric through the plane at right angles"}[s.id])
    else:
        check(data.get("provenance", {}).get("imaginaryModes") == 0, f"{s.molecule}: not a checked true minimum")
        homo = int(np.nonzero(mf.mo_occ > 0)[0][-1])
        lumo = homo + 1
        e = mf.mo_energy * HARTREE_EV
        name = FORMULA[s.molecule]
        values = {
            "homo": energy(f"{name} HOMO", e[homo]),
            "lumo": energy(f"{name} LUMO", e[lumo]),
            "gap": energy(f"{name} HOMO–LUMO gap", e[lumo] - e[homo]),
        }
        prov.update({"homoIndex": homo, "energiesHartree": {"homo": float(mf.mo_energy[homo]), "lumo": float(mf.mo_energy[lumo])}})
        mo = {"homo": Field(mol, mf.mo_coeff[:, homo]), "lumo": Field(mol, mf.mo_coeff[:, lumo])}
        canon = {}
        for k, f in mo.items():
            canon[k] = canonical_sign(f, f(points), points)
        canonical_checks(s, mol, mf, xyz, symbols, canon, homo, lumo, prov)
        ids = {"sigma": "homo", "sigma-star": "lumo", "homo": "homo", "lumo": "lumo"}
        fields = {o.id: canon[ids[o.id]] for o in s.orbitals}
        if s.id in ("ethane-b3lyp-orbitals", "ammonia-b3lyp-orbitals"):
            f = canon["lumo"]
            prov["lumoValenceLike"] = valence_like(f, f(points), points, xyz)

    values["iso"] = {"label": "Isosurface value", "quantity": "isovalue", "value": ISO, "unit": "a.u.", "source": "ours"}

    out_dir = MESHES / s.id
    orbitals = {}
    for o in s.orbitals:
        f = fields[o.id]
        vals = f(points)
        iso = ISO**2 if f.density else ISO
        lobes: list[tuple[str, Mesh]] = []
        labels = []
        gate = {}
        # Node names follow the Blender import contract (#69): "hatched" in the name = the striped phase.
        for sign, node in (("+", "plus-solid"), ("-", "minus-hatched")):
            if f.density and sign == "-":
                continue
            try:
                m = isosurface(vals.reshape(grid.shape), grid, iso, sign, f.gradient)
            except MeshError as err:
                if str(err).startswith(f"no {sign} lobe"):
                    continue
                raise
            lobes.append((node, m))
            gate[node] = (sign, f.gradient)
            labels.append({"sign": sign, "at": [round(float(c), 3) + 0.0 for c in largest_component_centre(m)]})
        check(bool(lobes), f"{s.id}/{o.id}: nothing above the isovalue")
        path = out_dir / f"{o.id}.glb"
        write_glb(path, lobes, gate=gate)
        orbitals[o.id] = {
            "label": o.label,
            "chip": o.chip,
            "style": o.style,
            **({"energy": o.energy} if o.energy else {}),
            **({"density": True} if f.density else {}),
            "mesh": f"/orbitals/{s.id}/{o.id}.glb",
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "triangles": int(sum(len(m.faces) for _, m in lobes)),
            "lobes": labels,
        }

    prov["seconds"] = round(time.time() - t0)
    date = dt.date.today().isoformat()
    if s.kind == "ibo":
        citation = (f"Our calculation: intrinsic bond orbitals ({KNIZIA}) from a {LEVEL} single point with PySCF {pyscf.__version__} "
                    f"at the experimental geometry, {date}")
        note = ("Drawn at the isosurface value given. Bond orbitals are one honest way to divide a molecule's electrons into bonds; "
                "Lesson 8 shows another.")
    else:
        citation = (f"Our calculation: canonical molecular orbitals and their energies with PySCF {pyscf.__version__}, {LEVEL}, "
                    f"isolated molecule at the geometry optimised with the same method, {date}; hartree to eV with {CODATA}")
        note = "Computed orbital energies are model values: compare them with each other, not with measured energies."
    return {
        "id": s.id,
        "kind": "table",
        "title": s.title,
        "sources": {"ours": {"kind": "computed", "citation": citation, "licence": LICENCE, "note": note,
                             "method": {"program": "PySCF", "version": pyscf.__version__, "level": LEVEL, "date": date}}},
        "values": values,
        "orbitals": {"molecule": s.molecule, "kind": s.kind, "iso": "iso", "list": orbitals},
        "provenance": prov,
    }


def energy(label: str, ev: float) -> dict:
    return {"label": label, "quantity": "energy", "value": round(float(ev), 4), "unit": "eV", "source": "ours"}


def largest_component_centre(m: Mesh) -> np.ndarray:
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components

    f = m.faces
    rows = np.concatenate([f[:, 0], f[:, 1], f[:, 2]])
    cols = np.concatenate([f[:, 1], f[:, 2], f[:, 0]])
    n = len(m.vertices)
    _, comp = connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)), directed=False)
    biggest = np.bincount(comp).argmax()
    return m.vertices[comp == biggest].mean(0)


def valence_like(f: Field, vals: np.ndarray, points: np.ndarray, xyz: np.ndarray, reach: float = 3.0) -> bool:
    """Lesson 8 check 6: the isosurface stays near the atoms (every point above ISO within `reach` Å of an atom)."""
    inside = points[np.abs(vals) >= ISO]
    d = np.linalg.norm(inside[:, None, :] - xyz[None], axis=2).min(1)
    return bool(d.max() <= reach)


def canonical_checks(s: OrbitalSet, mol, mf, xyz, symbols, mo: dict[str, Field], homo: int, lumo: int, prov: dict) -> None:
    """Lesson 8 spec sanity checks 1, 2 and 4 (3 and 5 compare sets; see `cross_checks`)."""
    pts = sample_points(xyz)
    if s.id == "hydrogen-b3lyp-orbitals":
        v = mo["homo"](pts)
        big = np.abs(v) > 1e-4 * np.abs(v).max()
        check(bool((v[big] > 0).all()), "H₂: the HOMO changes sign (it should have no node)")
        mid = xyz[:, 2].mean()
        check(parity(mo["lumo"], pts, reflect(2, mid)) < -0.99, "H₂: the LUMO does not change sign across the midplane (not σ*)")
        prov["checks"].append("H₂: HOMO one sign everywhere; LUMO antisymmetric through the midplane (σ*)")
    elif s.id == "ethylene-b3lyp-orbitals":
        n = int(np.argmax(np.abs(plane_normal(xyz))))
        check(parity(mo["homo"], pts, reflect(n)) < -0.99 and parity(mo["homo"], pts, reflect(2)) > 0.99,
              "ethylene: the HOMO is not π (antisymmetric through the molecular plane only)")
        check(parity(mo["lumo"], pts, reflect(n)) < -0.99 and parity(mo["lumo"], pts, reflect(2)) < -0.99,
              "ethylene: the LUMO is not π* (antisymmetric through the molecular plane and the C=C bisector)")
        prov["checks"].append("ethylene: HOMO antisymmetric through the molecular plane only (π); LUMO also through the C=C bisector (π*)")
    elif s.id == "ammonia-b3lyp-orbitals":
        n_at = symbols.index("N")
        h = [i for i, e in enumerate(symbols) if e == "H"]
        away = xyz[n_at] - xyz[h].mean(0)
        away /= np.linalg.norm(away)
        p = grid_for(xyz).points()
        v = mo["homo"](p)
        # The largest lobe: of the two signs, the one with more grid points above the isovalue;
        # its |ψ|²-weighted centre must be nearest N and on the side away from the H's.
        sign = 1 if (v >= ISO).sum() >= (v <= -ISO).sum() else -1
        inside = sign * v >= ISO
        w = v[inside] ** 2
        centre = (p[inside] * w[:, None]).sum(0) / w.sum()
        nearest = int(np.argmin(np.linalg.norm(xyz - centre, axis=1)))
        check(nearest == n_at and float((centre - xyz[n_at]) @ away) > 0, "NH₃: the HOMO's largest lobe is not on N, away from the H's")
        prov["checks"].append("NH₃: HOMO's largest lobe centred nearest N, on the side away from the H's")
    elif s.id == "boron-trifluoride-b3lyp-orbitals":
        b = symbols.index("B")
        n = int(np.argmax(np.abs(plane_normal(xyz))))
        check(parity(mo["lumo"], pts, reflect(n, xyz[:, n].mean())) < -0.99, "BF₃: the LUMO does not change sign across the molecular plane")
        S = mol.intor("int1e_ovlp")
        pl = populations(mol, S, mf.mo_coeff[:, lumo])
        check(int(np.argmax(pl)) == b, "BF₃: the LUMO's largest share is not on B")
        ph = populations(mol, S, mf.mo_coeff[:, homo])
        # By symmetry (a2') only boron's f polarisation functions can enter the HOMO, so its share is tiny, not zero.
        check(abs(ph[b]) < 0.05, f"BF₃: the HOMO has a boron share of {ph[b]:.3f} (expected a fluorine lone-pair combination)")
        check(mf.mo_energy[homo] - mf.mo_energy[homo - 1] > 0.1 / HARTREE_EV, "BF₃: the HOMO is degenerate")
        prov["bf3HomoBoronShare"] = round(float(ph[b]), 3)
        prov["checks"].append("BF₃: LUMO antisymmetric through the molecular plane, largest share on B; HOMO a non-degenerate F lone-pair combination (boron share below 0.05, f functions only)")


def cross_checks(sets: dict[str, dict]) -> dict:
    """Lesson 8 checks 3 and 5, and the frontier-flow table."""
    v = {k: {n: d["values"][n]["value"] for n in ("homo", "lumo", "gap")} for k, d in sets.items()}
    eth, ethane = v["ethylene-b3lyp-orbitals"], v["ethane-b3lyp-orbitals"]
    check(eth["homo"] > ethane["homo"] and eth["gap"] < ethane["gap"], "ethylene's HOMO must be above ethane's, and its gap smaller")
    nh3, bf3 = sets["ammonia-b3lyp-orbitals"], sets["boron-trifluoride-b3lyp-orbitals"]
    h = lambda d, k: d["provenance"]["energiesHartree"][k] * HARTREE_EV  # noqa: E731
    nh3_bf3 = h(bf3, "lumo") - h(nh3, "homo")
    bf3_nh3 = h(nh3, "lumo") - h(bf3, "homo")
    check(nh3_bf3 < bf3_nh3, "NH₃ HOMO → BF₃ LUMO must be the smaller gap")
    src = dict(nh3["sources"]["ours"])
    return {
        "id": "frontier-flow",
        "kind": "table",
        "title": "HOMO → LUMO gaps between NH₃ and BF₃",
        "sources": {"ours": src},
        "values": {
            "nh3_bf3": energy("BF₃ LUMO − NH₃ HOMO", nh3_bf3),
            "bf3_nh3": energy("NH₃ LUMO − BF₃ HOMO", bf3_nh3),
        },
        "provenance": {"pipeline": "pipelines/orbitals (#70)", "from": ["ammonia-b3lyp-orbitals", "boron-trifluoride-b3lyp-orbitals"],
                       "checks": ["ethylene HOMO above ethane's, gap smaller", "NH₃→BF₃ gap smaller than BF₃→NH₃"]},
    }


def write(doc: dict) -> None:
    (DATA / f"{doc['id']}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    ids = [a for a in argv if not a.startswith("--")] or [s.id for s in SETS]
    done: dict[str, dict] = {}
    for sid in ids:
        doc = run(BY_ID[sid])
        done[sid] = doc
        print(f"{sid}: {doc['provenance']['seconds']} s, " + ", ".join(f"{k} {o['triangles']} tris" for k, o in doc["orbitals"]["list"].items()), flush=True)
    l8 = [s.id for s in SETS if s.kind == "canonical"]
    if all(k in done for k in l8):
        flow = cross_checks({k: done[k] for k in l8})
    else:
        flow = None
    for doc in done.values():
        write(doc)
    if flow:
        write(flow)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
