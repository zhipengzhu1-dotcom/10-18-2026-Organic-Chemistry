"""PROTOTYPE: build ethylene in Blender from pipeline data only, then render
  1. a share image / hero still (1200x630 WebP), and
  2. a 4 s "cinematic" camera flight with depth of field (960x540, 24 fps), for the plain-vs-Blender A/B.

  /Applications/Blender.app/Contents/MacOS/Blender -b -P hero_and_flight.py [-- still|flight]

Guard rails being tested: nothing is placed by hand. Atom positions come from data/ethylene.geometry.json,
radii from its Bondi table (ball-and-stick at 30%, the viewer's convention), colours from its Jmol table,
the π lobes from data/ethylene-pi.mesh.json. Each render writes <name>.inputs.json with the sha256 of
every input file, so CI can flag a stale render without running Blender.
"""
import hashlib, json, math, os, subprocess, sys
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "..", "out")
GEOM = os.path.join(DATA, "ethylene.geometry.json")
MESH = os.path.join(DATA, "ethylene-pi.mesh.json")
BALL = 0.3
CYAN, ORANGE, INK = (0.24, 0.91, 1.0), (1.0, 0.6, 0.12), (0.051, 0.024, 0.149)  # Arcade Cosmos --cyan, --orange, --bg (sRGB)
which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["still", "flight"]


def lin(c):  # sRGB -> linear
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def hexrgb(h):
    return lin(tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))


def mat(name, rgb, rough=0.3, coat=0.5, emit=0.0, alpha=1.0, stripes=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Alpha"].default_value = alpha
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    if stripes:  # the "hatched" lobe: dark diagonal stripes, as the Lesson draws the second sign
        wave = nt.nodes.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 6
        wave.wave_profile = "SAW"; wave.bands_direction = "DIAGONAL"
        ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
        ramp.color_ramp.elements[0].color = (*rgb, 1); ramp.color_ramp.elements[1].position = 0.55
        ramp.color_ramp.elements[1].color = (*(x * 0.15 for x in rgb), 1)
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
        nt.links.new(ramp.outputs["Color"], b.inputs["Emission Color"])
    return m


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    g = json.load(open(GEOM)); pi = json.load(open(MESH))
    root = bpy.data.objects.new("ethylene", None); s.collection.objects.link(root)
    root.rotation_euler = (0, -math.pi / 2, 0)  # C=C horizontal, π lobes above and below (a rigid turn, no atom moves)
    pos = [Vector(a[1:]) for a in g["atoms"]]
    for (el, *_), p in zip(g["atoms"], pos):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=g["radii"][el] * BALL, location=p)
        o = bpy.context.active_object; bpy.ops.object.shade_smooth(); o.parent = root
        o.data.materials.append(mat(el, hexrgb(g["colours"][el]), rough=0.35))
    bond_m = mat("bond", lin(CYAN), rough=0.4, coat=0.2, emit=0.4)
    plane_n = Vector((1, 0, 0))  # molecular plane is x = 0 in the CCCBDB frame; a double bond's sticks sit in it
    for i, j, order in g["bonds"]:
        a, b = pos[i], pos[j]; d = b - a
        off = d.cross(plane_n).normalized()
        for k in ([0] if order == 1 else [-0.5, 0.5]):
            r = 0.11 if order == 1 else 0.066
            mid = (a + b) / 2 + off * k * r * 2.6
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=d.length, location=mid)
            o = bpy.context.active_object; bpy.ops.object.shade_smooth(); o.parent = root
            o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
            o.data.materials.append(bond_m)
    for lobe, stripes in (("solid", False), ("hatched", True)):
        L = pi["lobes"][lobe]; P = L["positions"]; I = L["index"]
        me = bpy.data.meshes.new(lobe)
        me.from_pydata([P[k:k + 3] for k in range(0, len(P), 3)], [], [I[k:k + 3] for k in range(0, len(I), 3)])
        me.shade_smooth()
        o = bpy.data.objects.new(f"pi-{lobe}", me); s.collection.objects.link(o); o.parent = root
        me.materials.append(mat(f"pi-{lobe}", lin(CYAN), rough=0.25, coat=0.8, emit=0.6, alpha=0.82, stripes=stripes))
    return s, root


def stage(s, w, h):
    s.render.engine = "CYCLES"; s.cycles.device = "CPU"; s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = w, h
    s.view_settings.view_transform = "AgX"
    # nebula backdrop: the Arcade Cosmos canvas as a world shader, two noise layers of violet / blue / magenta
    wd = bpy.data.worlds.new("cosmos"); s.world = wd; wd.use_nodes = True
    nt = wd.node_tree; bg = nt.nodes["Background"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.6; nz.inputs["Detail"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeValToRGB"); e = ramp.color_ramp.elements
    e[0].position = 0.35; e[0].color = (*lin(INK), 1)
    e[1].position = 0.7; e[1].color = (*lin((0.42, 0.18, 0.85)), 1)
    e.new(0.85).color = (*lin((1.0, 0.31, 0.85)), 1)
    nt.links.new(tc.outputs["Generated"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.9
    for name, loc, power, col in (("key", (6, -4, 5), 900, (1, 1, 1)), ("cyan", (-6, 3, 2), 500, lin(CYAN)), ("orange", (2, 6, -4), 400, lin(ORANGE))):
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA")); l.data.energy = power; l.data.size = 3
        l.data.color = col; l.location = loc; l.constraints.new("TRACK_TO").target = bpy.data.objects["ethylene"]
        s.collection.objects.link(l)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); s.collection.objects.link(cam); s.camera = cam
    cam.data.lens = 50
    look = bpy.data.objects.new("look", None); s.collection.objects.link(look)
    cam.constraints.new("TRACK_TO").target = look
    return cam, look


def sidecar(name, outputs):
    h = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    json.dump({"render": name, "outputs": outputs, "blender": bpy.app.version_string,
               "inputs": {os.path.relpath(p, os.path.join(HERE, "..")): h(p) for p in (GEOM, MESH, __file__)}},
              open(os.path.join(OUT, f"{name}.inputs.json"), "w"), indent=2)


if "still" in which:
    s, root = build(); cam, look = stage(s, 1200, 630)
    s.cycles.samples = 256
    cam.location = (5.0, -14.0, 4.2)
    look.location = (-2.6, -0.9, 0.0)  # aim left of the molecule so it sits right of centre, room for a title
    bpy.ops.render.render()
    for fmt, ext in (("WEBP", "webp"), ("AVIF", "avif")):
        s.render.image_settings.file_format = fmt; s.render.image_settings.quality = 80
        bpy.data.images["Render Result"].save_render(os.path.join(OUT, f"hero-share-1200x630.{ext}"), scene=s)
    sidecar("hero-share-1200x630", ["hero-share-1200x630.webp", "hero-share-1200x630.avif"])

if "flight" in which:
    s, root = build(); cam, look = stage(s, 960, 540)
    s.cycles.samples = 48
    s.frame_start, s.frame_end, s.render.fps = 1, 96, 24
    cam.data.dof.use_dof = True; cam.data.dof.focus_object = root; cam.data.dof.aperture_fstop = 1.4
    # a slow dolly from wide and low to close on the π lobe, a quarter turn around the molecule
    for f, ang, dist, hgt in ((1, -0.9, 11.0, 0.5), (96, 0.6, 5.2, 2.6)):
        cam.location = (dist * math.cos(ang), dist * math.sin(ang), hgt); cam.keyframe_insert("location", frame=f)
    frames = os.path.join(HERE, "..", "frames"); os.makedirs(frames, exist_ok=True)
    s.render.image_settings.file_format = "PNG"
    s.render.filepath = os.path.join(frames, "f")
    bpy.ops.render.render(animation=True)
    # Blender 5 dropped FFMPEG as an image format; encode the frames outside it
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", "24", "-i", os.path.join(frames, "f%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart",
                    os.path.join(OUT, "flight-cinematic.mp4")], check=True)
    sidecar("flight-cinematic", ["flight-cinematic.mp4"])
