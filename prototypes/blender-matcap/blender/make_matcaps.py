"""PROTOTYPE: render neutral grey matcaps headless.

  /Applications/Blender.app/Contents/MacOS/Blender -b -P make_matcaps.py

A matcap is a lit sphere seen straight on with an orthographic camera; three.js reads it by the
view-space normal. Every set is neutral grey so the page can tint it per element (Jmol colour).
Writes ../out/matcap-<set>.webp (512 px) and ../out/matcaps.inputs.json (script hash).
"""
import hashlib, json, math, os
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
os.makedirs(OUT, exist_ok=True)
SIZE = 512


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = 128
    s.cycles.use_denoising = True
    s.render.resolution_x = s.render.resolution_y = SIZE
    s.render.film_transparent = True
    s.view_settings.view_transform = "Standard"  # no filmic curve: grey stays grey
    s.render.image_settings.file_format = "WEBP"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.quality = 90
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1)
    bpy.ops.object.shade_smooth()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.type = "ORTHO"; cam.data.ortho_scale = 2.0
    cam.location = (0, -10, 0); cam.rotation_euler = (math.pi / 2, 0, 0)
    s.collection.objects.link(cam); s.camera = cam
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    return s, bpy.context.active_object


def area(s, name, loc, power, size):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA"))
    l.data.energy = power; l.data.size = size; l.location = loc
    c = l.constraints.new("TRACK_TO"); c.target = bpy.data.objects["Sphere"]
    s.collection.objects.link(l)


def principled(obj, rough, coat):
    m = bpy.data.materials.new("m"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    obj.data.materials.append(m)


def toon(obj):
    """Three hard bands plus a rim, as emission (deterministic, no lights needed)."""
    m = bpy.data.materials.new("toon"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    dot.inputs[1].default_value = (-0.45, -0.6, 0.66)  # light from upper left, toward camera
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].position = 0.0; e[0].color = (0.22, 0.22, 0.22, 1)
    e[1].position = 0.35; e[1].color = (0.55, 0.55, 0.55, 1)
    e.new(0.8).color = (0.85, 0.85, 0.85, 1)
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    rim = nt.nodes.new("ShaderNodeMath"); rim.operation = "GREATER_THAN"; rim.inputs[1].default_value = 0.72
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs["B"].default_value = (1, 1, 1, 1)
    em = nt.nodes.new("ShaderNodeEmission"); out = nt.nodes.new("ShaderNodeOutputMaterial")
    L = nt.links.new
    L(geo.outputs["Normal"], dot.inputs[0]); L(dot.outputs["Value"], ramp.inputs["Fac"])
    L(lw.outputs["Facing"], rim.inputs[0]); L(rim.outputs[0], mix.inputs["Factor"])
    L(ramp.outputs["Color"], mix.inputs["A"]); L(mix.outputs["Result"], em.inputs["Color"])
    L(em.outputs["Emission"], out.inputs["Surface"])
    obj.data.materials.append(m)


def lit(s):
    area(s, "key", (-4, -6, 5), 600, 4)
    area(s, "fill", (5, -5, -1), 90, 6)
    area(s, "rim", (2, 6, 3), 500, 3)


SETS = {
    "clay": lambda s, o: (principled(o, 0.75, 0.0), lit(s)),
    "studio": lambda s, o: (principled(o, 0.22, 0.7), lit(s)),
    "arcade": lambda s, o: toon(o),
}

for name, build in SETS.items():
    s, sphere = reset()
    build(s, sphere)
    s.render.filepath = os.path.join(OUT, f"matcap-{name}.webp")
    bpy.ops.render.render(write_still=True)

with open(__file__, "rb") as fh:
    script = hashlib.sha256(fh.read()).hexdigest()
json.dump({"script_sha256": script, "blender": bpy.app.version_string, "size_px": SIZE, "sets": list(SETS)},
          open(os.path.join(OUT, "matcaps.inputs.json"), "w"), indent=2)
