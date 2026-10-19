"""The committed orbital output (#70), checked without recomputing (the CI "orbital mesh orientation"
gate): every mesh named by an orbital data file exists with the recorded hash, every lobe in it is
closed and wound counter-clockwise seen from outside with outward normals, and the outputs are not
stale against the geometry they were computed on."""

import hashlib
import json

import numpy as np
import pytest

from orbitals.compute import DATA, MESHES, SETS, input_sha256
from orbitals.mesh import assert_closed_ccw, read_glb

ORBITAL_FILES = sorted(p for p in DATA.glob("*.json") if "orbitals" in json.loads(p.read_text(encoding="utf-8")))
MESH_ENTRIES = [
    (p.stem, oid, entry)
    for p in ORBITAL_FILES
    for oid, entry in json.loads(p.read_text(encoding="utf-8"))["orbitals"]["list"].items()
]


def test_every_orbital_set_is_committed():
    assert sorted(p.stem for p in ORBITAL_FILES) == sorted(s.id for s in SETS)


@pytest.mark.parametrize("set_id,oid,entry", MESH_ENTRIES, ids=[f"{s}/{o}" for s, o, _ in MESH_ENTRIES])
def test_committed_meshes_match_their_hash_and_face_outward(set_id, oid, entry):
    path = MESHES.parent / entry["mesh"].lstrip("/")
    assert path.exists(), f"{path} is missing"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"], f"{path} changed since the data file was written"
    lobes = read_glb(path)
    # Node names follow the Blender import contract (#69): a name containing "hatched" gets the striped phase.
    assert [name for name, _ in lobes] == ["plus-solid" if lb["sign"] == "+" else "minus-hatched" for lb in entry["lobes"]]
    for name, mesh in lobes:
        assert_closed_ccw(mesh)
        v, f, n = mesh
        face_normals = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
        corner_normals = n[f].mean(1)
        agree = (np.einsum("ij,ij->i", face_normals, corner_normals) > 0).mean()
        assert agree > 0.99, f"{set_id}/{oid} {name}: vertex normals disagree with the winding on {1 - agree:.1%} of triangles"


@pytest.mark.parametrize("s", SETS, ids=[s.id for s in SETS])
def test_orbital_output_is_not_stale(s):
    doc = json.loads((DATA / f"{s.id}.json").read_text(encoding="utf-8"))
    atoms = json.loads((DATA / f"{s.molecule}.json").read_text(encoding="utf-8"))["atoms"]["list"]
    assert doc["provenance"]["inputSha256"] == input_sha256(s, atoms), f"rerun: python -m orbitals.compute {s.id}"
    assert doc["orbitals"]["molecule"] == s.molecule
