"""Imports one orbital GLB (#70: quantised, meshopt-compressed) into Blender and prints what arrived:
`PROBE {"meshes": [{"name", "vertices", "faces"}]}`. Used by molecule-import.test.ts to check that
Blender's glTF importer reads the site's orbital meshes (#69's share images take meshes this way).
Run: Blender -b --factory-startup -P glb_probe.py -- <file.glb>"""

import json
import sys

import bpy

path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [
    {"name": o.name, "vertices": len(o.data.vertices), "faces": len(o.data.polygons)}
    for o in bpy.context.scene.objects
    if o.type == "MESH"
]
print("PROBE " + json.dumps({"meshes": meshes}))
