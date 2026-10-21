"""A 1200x630 share image (#69, on Paper Notebook since #123), rendered headless from a props file.

  pnpm blender render share-site share-unit-1
  (runs: Blender -b --factory-startup -P share_images.py -- <props.json> <out.webp> <repo>)

The props (pipelines/blender/render.ts) carry everything: the molecules from the cited data
(imported by molecule_import.py, the only way a molecule gets in), the Paper Notebook tokens,
the ruled paper, the doodles (the Manim Scenes' own SVGs), the text and where it goes. The ground
is white paper with faint blue rules and the pink margin line, as the site's body draws it; the
molecules get a pen-ink outline (Freestyle), so the white H balls read on white paper. An
orthographic camera, so 1 Å is `scale` px everywhere, as in the 3D card. Studio lighting to match
the matcap; "Standard" view transform so token colours come out as written.
"""
import math
import os
import sys

import addon_utils
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import molecule_import as mi  # noqa: E402

props_path, out, repo = sys.argv[sys.argv.index("--") + 1:][:3]
props = mi.load_props(props_path)
W, H, SCALE = props["width"], props["height"], props["scale"]
P = props["palette"]
PEN_PX = 2.5  # a pen line, px

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

before = set(bpy.data.objects)
mi.import_all(s, props, repo)
molecules = bpy.data.collections.new("molecules")
s.collection.children.link(molecules)
for o in set(bpy.data.objects) - before:
    for c in list(o.users_collection):
        c.objects.unlink(o)
    molecules.objects.link(o)


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
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*mi.colour(P["at-paper"]), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0


def flat(name, hex_):
    """A flat emission material: the token colour exactly as written (no lighting)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*mi.colour(hex_), 1)
    out_ = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs["Emission"], out_.inputs["Surface"])
    return m


def strip(name, x0, y0, x1, y1, depth, material):
    """A flat rectangle between image px corners, `depth` Å behind the camera's focus (larger = further)."""
    (bx0, bz0), (bx1, bz1) = px(x0, y0), px(x1, y1)
    bpy.ops.mesh.primitive_plane_add(size=1, location=((bx0 + bx1) / 2, depth, (bz0 + bz1) / 2), rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.scale = (abs(bx1 - bx0), abs(bz1 - bz0), 1)
    o.data.materials.append(material)
    o.visible_shadow = False
    return o


# ---- the ground: white paper, a faint blue rule every `rule` px, the pink margin line -------------
paper = props["paper"]
strip("paper", -0.01 * W, -0.01 * H, 1.01 * W, 1.01 * H, 40, flat("paper", P["at-paper"]))
rule = flat("rule", P["at-rule"])
for k in range(1, H // paper["rule"] + 1):
    y = k * paper["rule"]
    strip(f"rule{k}", -2, y - 1, W + 2, y + 1, 39.5, rule)
strip("margin", paper["margin"] - 1, -2, paper["margin"] + 1, H + 2, 39.4, flat("margin", P["at-margin"]))

# ---- doodles: the SVGs' marker fills flat, their pen lines as tubes of ink --------------------------
addon_utils.enable("io_curve_svg")
ink = flat("ink", P["at-ink"])
fills = {}
MARKERS = [v for k, v in P.items() if k.endswith("-fill")] + [P["at-ink"]]


def nearest_fill(rgb):
    """The token a filled SVG shape was drawn in (the importer may hand it back linear or sRGB)."""
    def dist(hex_):
        raw = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        return min(sum((a - b) ** 2 for a, b in zip(rgb, ref)) for ref in (raw, mi.colour(hex_)))
    return min(MARKERS, key=dist)
for i, d in enumerate(props["doodles"]):
    seen = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=os.path.join(repo, d["path"]))
    parts = [o for o in bpy.data.objects if o not in seen]
    bpy.context.view_layer.update()
    corners = [o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
    lo = Vector((min(c.x for c in corners), min(c.y for c in corners), 0))
    hi = Vector((max(c.x for c in corners), max(c.y for c in corners), 0))
    k = d["height"] / SCALE / (hi.y - lo.y)
    holder = bpy.data.objects.new(f"doodle{i}", None)
    s.collection.objects.link(holder)
    for o in parts:
        o.parent = holder
        o.location -= (lo + hi) / 2
        c = o.data
        if c.materials:  # a marker fill (2D, filled): the marker token nearest the SVG's colour
            hex_ = nearest_fill(c.materials[0].diffuse_color[:3])
            c.materials.clear()
            c.materials.append(fills.setdefault(hex_, flat(f"fill{hex_}", hex_)))
        else:  # a pen line
            c.bevel_depth = PEN_PX / 2 / SCALE / k
            c.bevel_resolution = 2
            c.materials.append(ink)
        o.visible_shadow = False
    x, z = px(d["x"], d["y"])
    holder.location = (x, 35, z)
    holder.rotation_euler = (math.pi / 2, math.radians(-d["angle"]), 0)
    holder.scale = (k, k, k)

# ---- text: flat emission in the token colour, just in front of the ground --------------------------
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
    o.data.materials.append(flat(f"ink{i}", t["colour"]))

# ---- a pen-ink outline round the molecules (Freestyle), so a fill sits inside a pen line ------------
s.render.use_freestyle = True
s.render.line_thickness_mode = "ABSOLUTE"
s.render.line_thickness = PEN_PX
layer = s.view_layers[0]
layer.freestyle_settings.as_render_pass = False
lineset = layer.freestyle_settings.linesets.new("pen")
lineset.select_by_visibility = True
lineset.select_by_edge_types = True
lineset.select_by_collection = True
lineset.collection = molecules
lineset.select_silhouette = True
lineset.select_border = False
lineset.select_crease = False
lineset.linestyle.color = mi.colour(P["at-ink"])
lineset.linestyle.thickness = PEN_PX

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
