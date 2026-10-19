"""The only way a molecule enters Blender (#69).

Reads the props file that pipelines/blender/render.ts builds from the cited-data lookup: each
molecule's atoms (already turned to its start view and placed, in Å: x right, y up, z toward the
viewer), bonds with their order, and per element the cited Jmol colour and the ball-and-stick
radius (Bondi van der Waals radius x 0.3, the 3D card's convention); plus orbital meshes (glb
from the orbital pipeline, #70, in the molecule's data frame). Nothing is placed by hand.

Blender's frame: the camera looks along +Y, so image (x, y, z) -> Blender (x, -z, y).
"""
import json
import os

import bpy
from mathutils import Matrix, Vector

STICK = 0.11  # bond stick radius in Å, as the 3D card draws it (a drawing size, not chemistry)
BOND_COLOUR = "#c8c8d0"  # the 3D card's bond grey
# glTF is Y-up: the importer turns a file point (x, y, z) into Blender (x, -z, y), the same turn as image -> Blender.
Y_UP = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def colour(hex_):
    return tuple(srgb_to_linear(int(hex_[i:i + 2], 16) / 255) for i in (1, 3, 5))


def load_props(path):
    with open(path) as fh:
        return json.load(fh)


def studio(name, hex_, alpha=1.0):
    """The studio matcap's material (make_matcap.py), in the element's colour."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour(hex_), 1)
    b.inputs["Roughness"].default_value = 0.22
    b.inputs["Coat Weight"].default_value = 0.7
    b.inputs["Alpha"].default_value = alpha
    return m


def to_blender(p):
    return Vector((p["x"], -p["z"], p["y"]))


def sideways(mol, a, b, at):
    """A unit vector across bond a-b in the plane of a neighbouring atom (as the 3D card does);
    for a linear molecule, across the bond in the image plane."""
    axis = (at[b] - at[a]).normalized()
    neighbour = next((q for x in mol["bonds"] for p, q in ((x["a"], x["b"]), (x["b"], x["a"]))
                      if (p == a and q != b) or (p == b and q != a)), None)
    ref = at[neighbour] - at[a] if neighbour is not None else Vector((0, 0, 0))
    off = ref - axis * ref.dot(axis)
    if off.length_squared < 1e-9:
        off = axis.cross(Vector((0, -1, 0)))  # across the view direction
    if off.length_squared < 1e-9:
        off = axis.cross(Vector((1, 0, 0)))
    return off.normalized()


def add_molecule(scene, mol):
    root = bpy.data.objects.new(mol["id"], None)
    scene.collection.objects.link(root)
    at = [to_blender(a) for a in mol["atoms"]]
    mats = {el: studio(f"{mol['id']}-{el}", style["colour"]) for el, style in mol["elements"].items()}
    for atom, p in zip(mol["atoms"], at):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=mol["elements"][atom["element"]]["radius"], location=p)
        o = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        o.parent = root
        o.data.materials.append(mats[atom["element"]])
    bond = studio(f"{mol['id']}-bond", BOND_COLOUR)
    for x in mol["bonds"]:
        a, b, order = x["a"], x["b"], x["order"]
        d = at[b] - at[a]
        across = sideways(mol, a, b, at) * STICK * 2.4
        shifts = [0] if order == 1 else [-0.5, 0.5] if order == 2 else [-1, 0, 1]
        width = STICK if order == 1 else STICK * 0.6
        for k in shifts:
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=width, depth=d.length, location=(at[a] + at[b]) / 2 + across * k)
            o = bpy.context.active_object
            bpy.ops.object.shade_smooth()
            o.parent = root
            o.rotation_mode = "QUATERNION"
            o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
            o.data.materials.append(bond)
    return root


def data_to_blender(frame):
    """World matrix taking an imported data-frame mesh to where its molecule's atoms are."""
    r = Matrix([list(row) + [0] for row in frame["rotation"]] + [[0, 0, 0, 1]])
    return Y_UP @ Matrix.Translation(Vector(frame["offset"])) @ r @ Matrix.Translation(-Vector(frame["centre"])) @ Y_UP.inverted()


def hatched(m, hex_):
    """Dark diagonal stripes: the orbital's second phase, as the Lessons draw it."""
    nt = m.node_tree
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 6
    wave.wave_profile = "SAW"
    wave.bands_direction = "DIAGONAL"
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].color = (*colour(hex_), 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (*(c * 0.15 for c in colour(hex_)), 1)
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def add_mesh(scene, mesh, frame, base):
    """An orbital mesh (glb, #70, data frame, Å), translucent over its molecule's atoms."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(base, mesh["path"]))
    imported = set(bpy.data.objects) - before
    holder = bpy.data.objects.new(os.path.basename(mesh["path"]), None)
    scene.collection.objects.link(holder)
    holder.matrix_world = data_to_blender(frame)
    solid = studio(f"{mesh['path']}-solid", mesh["colour"], alpha=0.82)
    second = hatched(studio(f"{mesh['path']}-hatched", mesh["colour"], alpha=0.82), mesh["colour"])
    for o in imported:
        if o.parent is None:
            o.parent = holder
        if o.type == "MESH":
            o.data.materials.clear()
            o.data.materials.append(second if "hatched" in o.name else solid)
    return holder


def import_all(scene, props, base):
    """Every molecule and mesh of a props file; mesh paths are relative to `base` (the repo)."""
    for mol in props["molecules"]:
        add_molecule(scene, mol)
    frames = {mol["id"]: mol["frame"] for mol in props["molecules"]}
    for mesh in props["meshes"]:
        add_mesh(scene, mesh, frames[mesh["molecule"]], base)
