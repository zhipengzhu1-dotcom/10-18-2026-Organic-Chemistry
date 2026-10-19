"""The studio matcap (#69): a lit neutral-grey sphere seen straight on, rendered headless.

  pnpm blender render matcap     (runs: Blender -b --factory-startup -P make_matcap.py -- <out.webp>)

three.js's MeshMatcapMaterial reads it by view-space normal and tints it with each element's
cited Jmol colour, so the sphere stays neutral grey ("Standard" view transform: grey stays grey).
From prototype/blender-matcap (make_matcaps.py), the owner's pick of its three sets.
"""
import math
import sys

import bpy

SIZE = 512
out = sys.argv[sys.argv.index("--") + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
s = bpy.context.scene
s.render.engine = "CYCLES"
s.cycles.device = "CPU"
s.cycles.samples = 128
s.cycles.seed = 69
s.cycles.use_denoising = True
s.render.resolution_x = s.render.resolution_y = SIZE
s.render.film_transparent = True
s.view_settings.view_transform = "Standard"
s.render.image_settings.file_format = "WEBP"
s.render.image_settings.color_mode = "RGBA"
s.render.image_settings.quality = 90

bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1)
bpy.ops.object.shade_smooth()
sphere = bpy.context.active_object

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.0
cam.location = (0, -10, 0)
cam.rotation_euler = (math.pi / 2, 0, 0)
s.collection.objects.link(cam)
s.camera = cam

world = bpy.data.worlds.new("w")
s.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

m = bpy.data.materials.new("studio")
m.use_nodes = True
b = m.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
b.inputs["Roughness"].default_value = 0.22
b.inputs["Coat Weight"].default_value = 0.7
sphere.data.materials.append(m)

for name, loc, power, size in (("key", (-4, -6, 5), 600, 4), ("fill", (5, -5, -1), 90, 6), ("rim", (2, 6, 3), 500, 3)):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
    light.data.energy = power
    light.data.size = size
    light.location = loc
    light.constraints.new("TRACK_TO").target = sphere
    s.collection.objects.link(light)

s.render.filepath = out
bpy.ops.render.render(write_still=True)
