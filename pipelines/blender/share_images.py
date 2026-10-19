"""A 1200x630 share image (#69), rendered headless from a props file.

  pnpm blender render share-site share-unit-1
  (runs: Blender -b --factory-startup -P share_images.py -- <props.json> <out.webp> <repo>)

The props (pipelines/blender/render.ts) carry everything: the molecules from the cited data
(imported by molecule_import.py, the only way a molecule gets in), the Arcade Cosmos tokens,
the text and where it goes. An orthographic camera, so 1 Å is `scale` px everywhere, as in
the 3D card. Studio lighting to match the matcap; "Standard" view transform so token colours
come out as written.
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import molecule_import as mi  # noqa: E402

props_path, out, repo = sys.argv[sys.argv.index("--") + 1:][:3]
props = mi.load_props(props_path)
W, H, SCALE = props["width"], props["height"], props["scale"]
P = props["palette"]

bpy.ops.wm.read_factory_settings(use_empty=True)
s = bpy.context.scene
s.render.engine = "CYCLES"
s.cycles.device = "CPU"
s.cycles.samples = props["samples"]
s.cycles.seed = props["seed"]
s.cycles.use_denoising = True
s.render.resolution_x, s.render.resolution_y = W, H
s.view_settings.view_transform = "Standard"
s.render.image_settings.file_format = "WEBP"
s.render.image_settings.color_mode = "RGB"
s.render.image_settings.quality = 82

mi.import_all(s, props, repo)


def px(x, y):
    """Image px (from the top left) -> Blender x, z in Å."""
    return (x - W / 2) / SCALE, (H / 2 - y) / SCALE


# Camera: orthographic, looking along +Y.
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.type = "ORTHO"
cam.data.ortho_scale = W / SCALE
cam.data.clip_end = 200
cam.location = (0, -50, 0)
cam.rotation_euler = (math.pi / 2, 0, 0)
s.collection.objects.link(cam)
s.camera = cam

world = bpy.data.worlds.new("w")
s.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*mi.colour(P["at-space"]), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0


def emission(name, nodes_fn):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    out_ = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs["Emission"], out_.inputs["Surface"])
    nodes_fn(nt, em)
    return m


def nebula(nt, em):
    """The Arcade Cosmos ground: --at-space with faint --at-neb-* clouds (fixed noise, no randomness)."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.2
    nz.inputs["Detail"].default_value = 4
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    space = mi.colour(P["at-space"])
    tint = lambda hex_, k: tuple(a + (b - a) * k for a, b in zip(space, mi.colour(hex_)))  # noqa: E731
    e[0].position, e[0].color = 0.45, (*space, 1)
    e[1].position, e[1].color = 0.68, (*tint(P["at-neb-2"], 0.22), 1)
    e.new(0.8).color = (*tint(P["at-neb-1"], 0.16), 1)
    nt.links.new(tc.outputs["Generated"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])


bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 40, 0), rotation=(math.pi / 2, 0, 0))
ground = bpy.context.active_object
ground.scale = (W / SCALE * 1.02, H / SCALE * 1.02, 1)
ground.data.materials.append(emission("nebula", nebula))
ground.visible_shadow = False

# Text: flat emission in the token colour, just in front of the ground.
fonts = {k: bpy.data.fonts.load(os.path.join(repo, path)) for k, path in props["fonts"].items()}
for i, t in enumerate(props["text"]):
    curve = bpy.data.curves.new(f"text{i}", "FONT")
    curve.body = t["text"]
    curve.font = fonts[t["font"]]
    curve.size = t["size"] / SCALE
    o = bpy.data.objects.new(f"text{i}", curve)
    x, z = px(t["x"], t["y"])
    o.location = (x, 30, z)
    o.rotation_euler = (math.pi / 2, 0, 0)
    s.collection.objects.link(o)
    o.visible_shadow = False
    hex_ = t["colour"]
    o.data.materials.append(emission(f"ink{i}", lambda nt, em, h=hex_: em.inputs["Color"].__setattr__("default_value", (*mi.colour(h), 1))))

# Studio lights (make_matcap.py's key, fill and rim), aimed at the image centre.
target = bpy.data.objects.new("target", None)
s.collection.objects.link(target)
for name, loc, power, size in (("key", (-8, -12, 10), 2400, 8), ("fill", (10, -10, -2), 360, 12), ("rim", (4, 12, 6), 2000, 6)):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
    light.data.energy = power
    light.data.size = size
    light.location = loc
    light.constraints.new("TRACK_TO").target = target
    s.collection.objects.link(light)

bpy.ops.render.render()
bpy.data.images["Render Result"].save_render(out, scene=s)
