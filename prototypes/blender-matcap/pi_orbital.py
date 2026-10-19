"""PROTOTYPE: ethylene's π bond orbital as a mesh, per the Lesson 4 spec's Orbital data notes.

B3LYP/cc-pVTZ single point with PySCF at the CCCBDB geometry, IBOs over the valence occupied
orbitals, pick the one antisymmetric through the molecular plane (x = 0), mesh both signs at one
isovalue with marching cubes. Writes data/ethylene-pi.mesh.json (for three.js and Blender alike).

Run:  <venv>/bin/python pi_orbital.py
"""
import hashlib, json, os, time
import numpy as np
import pyscf
from pyscf import gto, dft, lo
from skimage import measure

HERE = os.path.dirname(os.path.abspath(__file__))
GEOM = os.path.join(HERE, "data", "ethylene.geometry.json")
ISO = 0.05  # orbital amplitude, a.u.; one isovalue for the whole Lesson

raw = open(GEOM, "rb").read()
g = json.loads(raw)
t0 = time.time()
mol = gto.M(atom=[[e, (x, y, z)] for e, x, y, z in g["atoms"]], basis="cc-pvtz", unit="Angstrom", verbose=0)
mf = dft.RKS(mol); mf.xc = "b3lyp"; mf.grids.level = 4; mf.conv_tol = 1e-10
energy = mf.kernel()

occ = mf.mo_coeff[:, mf.mo_occ > 0]
ncore = 2  # two C 1s
iao = lo.iao.iao(mol, occ[:, ncore:])
ibo = lo.ibo.ibo(mol, occ[:, ncore:], iaos=iao)

# the π is the one IBO that flips sign through the molecular plane (x -> -x)
pts = np.array([[0.6, 0.0, 0.7], [-0.6, 0.0, 0.7]]) / 0.529177
vals = mol.eval_gto("GTOval", pts) @ ibo
anti = [k for k in range(ibo.shape[1]) if vals[0, k] * vals[1, k] < 0 and abs(vals[0, k]) > 1e-3]
assert len(anti) == 1, f"expected exactly one π IBO, found {anti}"
pi = ibo[:, anti[0]]
if vals[0, anti[0]] < 0:
    pi = -pi  # larger/"solid" lobe on +x, so the pattern is stable between builds

# grid in Å, then evaluate
n, half = 72, 3.2
ax = np.linspace(-half, half, n)
X, Y, Z = np.meshgrid(ax, ax, ax, indexing="ij")
grid = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1) / 0.529177
psi = (mol.eval_gto("GTOval", grid) @ pi).reshape(n, n, n)

def mesh(level):
    v, f, nrm, _ = measure.marching_cubes(psi if level > 0 else -psi, abs(level), spacing=(ax[1] - ax[0],) * 3)
    v = v - half
    return {"positions": np.round(v, 4).ravel().tolist(), "normals": np.round(-nrm, 4).ravel().tolist(), "index": f.ravel().tolist()}

out = {
    "_prototype": "PROTOTYPE mesh, never merged",
    "molecule": "ethylene", "orbital": "pi (IBO)", "label": "computed",
    "method": {"program": "PySCF", "version": pyscf.__version__, "xc": "b3lyp", "basis": "cc-pvtz", "localisation": "IBO (Knizia 2013)", "isovalue_au": ISO},
    "input_sha256": hashlib.sha256(raw).hexdigest(),
    "energy_hartree": float(energy),
    "lobes": {"solid": mesh(ISO), "hatched": mesh(-ISO)},
    "seconds": round(time.time() - t0),
}
with open(os.path.join(HERE, "data", "ethylene-pi.mesh.json"), "w") as fh:
    json.dump(out, fh, separators=(",", ":"))
print("E =", energy, "π IBO index", anti[0], "verts", len(out["lobes"]["solid"]["positions"]) // 3, "in", out["seconds"], "s")
