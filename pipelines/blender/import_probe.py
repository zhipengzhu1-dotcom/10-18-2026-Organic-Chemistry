"""Test probe for molecule_import.py (run by molecule-import.test.ts where Blender is installed).

  Blender -b --factory-startup -P import_probe.py -- <props.json> <mesh point x,y,z> <work dir>

Writes a tiny glb (an icosphere named "hatched" at the given data-frame point), adds it to the
props as an orbital mesh of the first molecule, imports everything through molecule_import and
prints one JSON line: each atom sphere's world centre, radius and base colour, and the mesh's
world centre and material.
"""
import json
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import molecule_import as mi  # noqa: E402

props_path, point, work = sys.argv[sys.argv.index("--") + 1:][:3]
point = [float(v) for v in point.split(",")]

# A glb in the data frame: Blender writes glTF Y-up, so place the sphere at the Blender point of the data point.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.1, location=(point[0], -point[2], point[1]))
bpy.context.active_object.name = "hatched"
glb = os.path.join(work, "probe.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB")

bpy.ops.wm.read_factory_settings(use_empty=True)
props = mi.load_props(props_path)
props["meshes"] = [{"path": "probe.glb", "molecule": props["molecules"][0]["id"], "colour": "#3ee8ff"}]
mi.import_all(bpy.context.scene, props, work)
bpy.context.view_layer.update()


def centre(o):
    corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return [sum(c[i] for c in corners) / 8 for i in range(3)]


atoms = []
for o in bpy.data.objects:
    if o.type == "MESH" and o.parent and o.parent.name == props["molecules"][0]["id"] and o.name.startswith("Sphere"):
        m = o.data.materials[0]
        atoms.append({"centre": centre(o), "radius": o.dimensions[0] / 2,
                      "colour": list(m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value)[:3]})
mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("hatched"))
print("PROBE " + json.dumps({"atoms": atoms, "mesh": {"centre": centre(mesh), "material": mesh.data.materials[0].name}}))
