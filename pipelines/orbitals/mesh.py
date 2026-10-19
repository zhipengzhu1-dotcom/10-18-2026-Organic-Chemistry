"""Orbital lobes as meshes: marching cubes on a gridded field, the orientation gate, and GLB I/O.

A lobe is the region where the signed field f = +ψ (sign "+") or −ψ (sign "−") exceeds the isovalue.
Its surface must be closed, its triangles must wind counter-clockwise seen from outside, and its
normals must point outward (toward falling f, i.e. along −∇f). `assert_outward` checks all three
and every writer calls it before a byte reaches disk: three.js culls back faces and lights by the
normals, so a flipped lobe would vanish or shade inside out (#70, the "orbital mesh orientation"
CI gate of #56).

GLB layout (glTF 2.0 + KHR_mesh_quantization, readable by three.js GLTFLoader and Blender):
one node per lobe (name = lobe name), positions as int16 with the node's translation and uniform
scale undoing the quantisation (Å), normals as normalised int8, indices uint16 (uint32 if needed).
No materials: the site styles lobes itself.
"""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Callable, NamedTuple

import numpy as np

Gradient = Callable[[np.ndarray], np.ndarray]
"""∇ψ at points (N×3, Å) → N×3. Its sign is ψ's; `assert_outward` flips it for a "−" lobe."""


class MeshError(ValueError):
    """A mesh broke the orientation gate (or can't be meshed); nothing is written."""


class Mesh(NamedTuple):
    vertices: np.ndarray  # V×3 float, Å
    faces: np.ndarray  # F×3 int, counter-clockwise seen from outside
    normals: np.ndarray  # V×3 unit, outward


class Grid(NamedTuple):
    origin: np.ndarray  # Å, the corner point [0, 0, 0]
    step: float  # Å
    shape: tuple[int, int, int]

    def points(self) -> np.ndarray:
        """Every grid point (Å), x slowest, as N×3 (reshape values to `shape`)."""
        axes = [self.origin[i] + self.step * np.arange(self.shape[i]) for i in range(3)]
        x, y, z = np.meshgrid(*axes, indexing="ij")
        return np.stack([x.ravel(), y.ravel(), z.ravel()], 1)


def isosurface(values: np.ndarray, grid: Grid, iso: float, sign: str, gradient: Gradient) -> Mesh:
    """The surface of one sign's lobes at `iso` (> 0), oriented and gated. `values` is ψ on the grid."""
    from skimage.measure import marching_cubes

    f = values if sign == "+" else -values
    edges = [f[0], f[-1], f[:, 0], f[:, -1], f[:, :, 0], f[:, :, -1]]
    if max(float(e.max()) for e in edges) >= iso:
        raise MeshError(f"{sign} lobe is not closed: it reaches the edge of the grid (make the box bigger)")
    if f.max() < iso:
        raise MeshError(f"no {sign} lobe at isovalue {iso}")
    v, faces, _, _ = marching_cubes(f, iso, spacing=(grid.step,) * 3)
    v = v + grid.origin
    # skimage winds its triangles clockwise seen from the high side (outside the lobe) for this
    # setup, so reverse them; the gate below is what guarantees the result.
    faces = faces[:, ::-1]
    keep = (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
    faces = np.ascontiguousarray(faces[keep])
    mesh = Mesh(v, faces, outward_normals(v, sign, gradient))
    assert_outward(mesh, sign, gradient)
    return mesh


def outward_normals(points: np.ndarray, sign: str, gradient: Gradient) -> np.ndarray:
    g = -_signed(gradient(points), sign)
    return g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-300)


def _signed(g: np.ndarray, sign: str) -> np.ndarray:
    return g if sign == "+" else -g


def assert_closed_ccw(mesh: Mesh) -> None:
    """Every edge is shared by exactly two triangles that run it in opposite directions (closed and
    consistently wound), and the enclosed volume is positive (so that winding is counter-clockwise
    seen from outside)."""
    f = mesh.faces
    if len(f) == 0:
        raise MeshError("empty mesh")
    directed = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]])
    n = int(f.max()) + 1
    keys = directed[:, 0].astype(np.int64) * n + directed[:, 1]
    reverse = directed[:, 1].astype(np.int64) * n + directed[:, 0]
    if len(np.unique(keys)) != len(keys) or not np.isin(reverse, keys).all():
        raise MeshError("mesh is not closed and consistently wound (an edge is open or runs the same way twice)")
    v = mesh.vertices
    volume = np.einsum("ij,ij->i", v[f[:, 0]], np.cross(v[f[:, 1]], v[f[:, 2]])).sum() / 6
    if volume <= 0:
        raise MeshError("triangles must wind counter-clockwise seen from outside (enclosed volume is negative)")


def assert_outward(mesh: Mesh, sign: str, gradient: Gradient, share: float = 0.99) -> None:
    """The orientation gate. Raises MeshError unless the lobe is closed, at least `share` of its
    triangles wind counter-clockwise seen from outside (their geometric normal points along −∇f),
    and at least `share` of its vertex normals point outward."""
    assert_closed_ccw(mesh)
    v, f, normals = mesh
    centres = v[f].mean(1)
    face_normals = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    out = -_signed(gradient(centres), sign)
    if (np.einsum("ij,ij->i", face_normals, out) > 0).mean() < share:
        raise MeshError("triangles must wind counter-clockwise seen from outside")
    out_v = -_signed(gradient(v), sign)
    if (np.einsum("ij,ij->i", normals, out_v) > 0).mean() < share:
        raise MeshError("normals must point outward, away from the lobe")


# ---- GLB -----------------------------------------------------------------------------------------

ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER = 34962, 34963
BYTE, SHORT, UNSIGNED_SHORT, UNSIGNED_INT = 5120, 5122, 5123, 5125


def write_glb(path: Path, lobes: list[tuple[str, Mesh]], gate: dict[str, tuple[str, Gradient]] | None = None) -> None:
    """Writes named lobes to one GLB. Every lobe passes `assert_closed_ccw` (and `assert_outward`
    when `gate` gives its sign and gradient) before anything is written."""
    for name, mesh in lobes:
        assert_closed_ccw(mesh)
        if gate and name in gate:
            assert_outward(mesh, *gate[name])

    blob = bytearray()
    views, accessors, meshes, nodes = [], [], [], []

    def view(data: bytes, target: int, stride: int | None = None) -> int:
        while len(blob) % 4:
            blob.append(0)
        views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(data), "target": target, **({"byteStride": stride} if stride else {})})
        blob.extend(data)
        return len(views) - 1

    for name, (v, f, nrm) in lobes:
        lo, hi = v.min(0), v.max(0)
        centre = (lo + hi) / 2
        scale = float(max((hi - lo).max() / 2, 1e-6) / 32767)
        q = np.round((v - centre) / scale).astype(np.int16)
        pos = np.zeros((len(v), 4), np.int16)
        pos[:, :3] = q
        nq = np.zeros((len(v), 4), np.int8)
        nq[:, :3] = np.clip(np.round(nrm * 127), -127, 127)
        wide = len(v) > 65535
        idx = f.astype(np.uint32 if wide else np.uint16).ravel()
        accessors.append({"bufferView": view(pos.tobytes(), ARRAY_BUFFER, 8), "componentType": SHORT, "count": len(v), "type": "VEC3",
                          "min": q.min(0).tolist(), "max": q.max(0).tolist()})
        accessors.append({"bufferView": view(nq.tobytes(), ARRAY_BUFFER, 4), "componentType": BYTE, "normalized": True, "count": len(v), "type": "VEC3"})
        accessors.append({"bufferView": view(idx.tobytes(), ELEMENT_ARRAY_BUFFER), "componentType": UNSIGNED_INT if wide else UNSIGNED_SHORT,
                          "count": len(idx), "type": "SCALAR"})
        a = len(accessors)
        meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": a - 3, "NORMAL": a - 2}, "indices": a - 1, "mode": 4}]})
        nodes.append({"name": name, "mesh": len(meshes) - 1, "translation": [round(float(c), 6) for c in centre], "scale": [scale] * 3})

    while len(blob) % 4:
        blob.append(0)
    doc = {
        "asset": {"version": "2.0", "generator": "astratron pipelines/orbitals"},
        "extensionsUsed": ["KHR_mesh_quantization"],
        "extensionsRequired": ["KHR_mesh_quantization"],
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(
        struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(blob), 0x004E4942) + bytes(blob)
    )


def read_glb(path: Path) -> list[tuple[str, Mesh]]:
    """Reads a GLB written by `write_glb` back into named lobes (Å)."""
    data = Path(path).read_bytes()
    magic, _, _ = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise MeshError(f"{path}: not a GLB")
    jlen, _ = struct.unpack_from("<II", data, 12)
    doc = json.loads(data[20 : 20 + jlen])
    blen, _ = struct.unpack_from("<II", data, 20 + jlen)
    blob = data[28 + jlen : 28 + jlen + blen]
    types = {BYTE: np.int8, SHORT: np.int16, UNSIGNED_SHORT: np.uint16, UNSIGNED_INT: np.uint32}

    def read(i: int) -> np.ndarray:
        acc = doc["accessors"][i]
        bv = doc["bufferViews"][acc["bufferView"]]
        dt = np.dtype(types[acc["componentType"]])
        width = 3 if acc["type"] == "VEC3" else 1
        stride = bv.get("byteStride", dt.itemsize * width) // dt.itemsize
        raw = np.frombuffer(blob, dt, bv["byteLength"] // dt.itemsize, bv["byteOffset"])
        return raw.reshape(-1, stride)[: acc["count"], :width] if width > 1 else raw[: acc["count"]]

    out = []
    for node in doc["nodes"]:
        prim = doc["meshes"][node["mesh"]]["primitives"][0]
        pos = read(prim["attributes"]["POSITION"]).astype(float) * node["scale"][0] + np.array(node["translation"])
        nrm = read(prim["attributes"]["NORMAL"]).astype(float) / 127
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
        faces = read(prim["indices"]).astype(np.int64).reshape(-1, 3)
        out.append((node["name"], Mesh(pos, faces, nrm)))
    return out
