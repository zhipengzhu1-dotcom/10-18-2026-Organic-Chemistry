"""Lesson 3 (Molecules in 3D): three watch-only Scenes, Manim CE 0.22.0, plain text (no LaTeX).

- MethaneUnflatten (methane-unflatten, s01 reveal, 8 s): the flat Lewis CH4 with a right-angle mark
  lifts off the page; the H's swing into 3D until every H-C-H angle is equal; an arc reads the
  measured angle. Ends with the flat drawing beside the 3D molecule (the poster).
- DomainSpread (domain-spread, s02, 10 s): 2, 3 and 4 translucent "domain" balloons start bunched
  and push apart into a line, a flat triangle and a tetrahedron, each captioned with the model angle.
- WedgeDashMethane (wedge-dash-methane, s08, 10 s): 3D methane turns until two H's lie on a sheet
  (the page); those bonds flatten into lines, the H in front grows a wedge, the H behind a dash; the
  finished drawing sits beside the model.

Methane is rebuilt from its cited C-H length and H-C-H angle (SCENE_PROPS values); colours are the
cited Jmol colours; the model angles are cited too (vsepr-model.yaml, a model, not a measurement). 3D is drawn
by projecting coordinates ourselves (orthographic), so frames are plain 2D Cairo shapes. Silent,
60 fps, the last frame is the poster. Render with `pnpm scenes:render <id>`, never by hand.
"""

import json
import os
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403  (idiomatic Manim)
from manim.utils.rate_functions import ease_in_out_sine

HERE = Path(__file__).resolve().parent
PROPS = json.loads(Path(os.environ["SCENE_PROPS"]).read_text())
PORTRAIT = PROPS["aspect"] == "9x16"
VALUES = PROPS["values"]
TEXT = PROPS["text"]

config.pixel_width, config.pixel_height = PROPS["width"], PROPS["height"]
if PORTRAIT:
    config.frame_width = 8.0
    config.frame_height = 8.0 * PROPS["height"] / PROPS["width"]
else:
    config.frame_height = 8.0
    config.frame_width = 8.0 * PROPS["width"] / PROPS["height"]
config.frame_rate = PROPS["fps"]

PAL = {k: ManimColor(v) for k, v in PROPS["palette"].items()}
SPACE, INK, MUTED = PAL["at-space"], PAL["at-ink"], PAL["at-ink-muted"]
CYAN, ORANGE = PAL["at-electron"], PAL["at-ignite"]
MAGENTA = PAL["at-neb-1"]
config.background_color = SPACE
MONO = "JetBrains Mono"
SANS = "Space Grotesk"
FW, FH = config.frame_width, config.frame_height


def fonts():
    return register_font(str(HERE / "fonts" / "SpaceGrotesk-wght.ttf")), register_font(
        str(HERE / "fonts" / "JetBrainsMono-wght.ttf")
    )


# ---- geometry ------------------------------------------------------------------
def unit(v):
    return np.asarray(v, dtype=float) / np.linalg.norm(v)


def rot(axis, deg):
    """Rotation matrix about a unit axis (Rodrigues)."""
    a = unit(axis)
    t = np.radians(deg)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + np.sin(t) * K + (1 - np.cos(t)) * K @ K


def methane_dirs():
    """Unit C-H directions with the cited H-C-H angle: H1 and H2 in the xy plane (the page),
    symmetric about the 45-degree screen direction; H3 and H4 straddle the page, one toward you."""
    a = np.radians(float(VALUES["methane/a.HCH"]))
    bis = unit([1, 1, 0])  # in-page bisector of H1-C-H2
    perp = unit([-1, 1, 0])  # in-page, across it
    h1 = np.cos(a / 2) * bis + np.sin(a / 2) * perp
    h2 = np.cos(a / 2) * bis - np.sin(a / 2) * perp
    # H3/H4: opposite bisector, spread along the page normal, at the same angle to each other.
    h3 = -np.cos(a / 2) * bis + np.sin(a / 2) * np.array([0, 0, 1.0])
    h4 = -np.cos(a / 2) * bis - np.sin(a / 2) * np.array([0, 0, 1.0])
    return [h1, h2, h3, h4]


R_CH = float(VALUES.get("methane/r.CH", 1.0))
C_COL = ManimColor(VALUES.get("elements/C.colour", "#909090"))
H_COL = ManimColor(VALUES.get("elements/H.colour", "#FFFFFF"))


def ball(colour, r, letter, z_index=0):
    shade = VGroup(
        Circle(radius=r, stroke_color=SPACE, stroke_width=3).set_fill(colour, opacity=1),
        Circle(radius=r * 0.45, stroke_width=0).set_fill(WHITE, opacity=0.35).shift(UL * r * 0.3),
    )
    ink = SPACE if colour == H_COL else WHITE
    txt = Text(letter, font=MONO, font_size=int(r * 70), color=ink, weight=BOLD).move_to(shade[0])
    return VGroup(shade, txt).set_z_index(z_index)


def molecule_2d(points, centre, depth, scale=1.0):
    """Balls and sticks for methane from projected points (Å, xy) with depths; back to front."""
    c = np.array([centre[0], centre[1], 0])
    group = VGroup()
    order = sorted(range(4), key=lambda i: depth[i])
    sticks = VGroup(*[Line(c, c + np.array([*points[i], 0]) * scale, stroke_color=GREY_B, stroke_width=10) for i in range(4)])
    group.add(*[sticks[i] for i in order if depth[i] < 0])
    group.add(ball(C_COL, 0.34 * scale, "C").move_to(c))
    group.add(*[sticks[i] for i in order if depth[i] >= 0])
    for i in order:
        group.add(ball(H_COL, 0.24 * scale, "H").move_to(c + np.array([*points[i], 0]) * scale))
    return group


def flat_lewis(centre, size=1.0, mark=True):
    """The flat Lewis CH4: H up, right, down and left at right angles, with a right-angle mark."""
    c = np.array([centre[0], centre[1], 0])
    L = 1.15 * size
    g = VGroup()
    g.add(Text("C", font=MONO, font_size=int(64 * size), color=INK, weight=BOLD).move_to(c))
    for d in (UP, RIGHT, DOWN, LEFT):
        g.add(Line(c + d * 0.32 * size, c + d * (L - 0.3 * size), stroke_color=INK, stroke_width=5 * size))
        g.add(Text("H", font=MONO, font_size=int(56 * size), color=INK, weight=BOLD).move_to(c + d * L))
    if mark:
        s = 0.42 * size
        g.add(VMobject(stroke_color=CYAN, stroke_width=5 * size).set_points_as_corners(
            [c + UP * s, c + UP * s + RIGHT * s, c + RIGHT * s]))
    return g


def caption(text, size=34, colour=MUTED):
    return Text(text, font=SANS, font_size=size, color=colour)


class Timed(Scene):
    def setup(self):
        self.shown = {}

    def now(self):
        return float(self.renderer.time)

    def mark(self, ref, start, end):
        self.shown.setdefault(ref, []).append([round(start, 3), round(end, 3)])

    def construct(self):
        a, b = fonts()
        with a, b:
            self.build()
        self.wait(max(0, PROPS["duration"] - self.now()))
        out = os.environ.get("TIMINGS_OUT")
        if out:
            Path(out).write_text(json.dumps(self.shown))


# ---- methane-unflatten ------------------------------------------------------------
class MethaneUnflatten(Timed):
    def build(self):
        dirs = methane_dirs()
        # A small turn about the in-page bisector separates H3 and H4 on screen.
        R = rot([1, 1, 0], 22)
        real = [R @ (d * R_CH) for d in dirs]
        flat_dirs = [UP[:2], RIGHT[:2], DOWN[:2], LEFT[:2]]
        # Pair each H with its flat place: H1 top, H2 right, H3 bottom, H4 left.
        flat = [np.array(flat_dirs[0]) * R_CH, np.array(flat_dirs[1]) * R_CH,
                np.array(flat_dirs[2]) * R_CH, np.array(flat_dirs[3]) * R_CH]
        scale = 1.55 if not PORTRAIT else 1.45
        here = np.array([0.0, 0.3])
        right_spot = np.array([FW * 0.18, 0.0]) if not PORTRAIT else np.array([0.0, -FH * 0.17])
        left_spot = np.array([-FW * 0.27, 0.0]) if not PORTRAIT else np.array([0.0, FH * 0.25])

        # Beat 1 (0-1.4): the flat drawing with its right-angle mark.
        paper = flat_lewis(here, size=1.15)
        self.play(FadeIn(paper), run_time=0.8)
        self.wait(0.6)

        # Beat 2 (1.4-2.4): a small copy of the flat drawing parks aside, captioned "On paper".
        small = flat_lewis(left_spot, size=0.75)
        on_paper = caption(TEXT["flat"][0]).next_to(small, DOWN, buff=0.35)
        s = ValueTracker(0.0)
        centre = ValueTracker(0.0)

        def model():
            k = s.get_value()
            pos = [(1 - k) * np.array(f) + k * np.array(r[:2]) for f, r in zip(flat, real)]
            dep = [k * r[2] for r in real]
            ctr = (1 - centre.get_value()) * here + centre.get_value() * right_spot
            return molecule_2d(pos, ctr, dep, scale=scale)

        mol = always_redraw(model)
        self.play(ReplacementTransform(paper, small), FadeIn(on_paper), FadeIn(mol), run_time=1.0)

        # Beat 3 (2.4-5.6): it lifts off the page; the H's swing into 3D.
        self.play(s.animate.set_value(1.0), centre.animate.set_value(1.0), run_time=3.2, rate_func=ease_in_out_sine)
        mol.clear_updaters()

        # Beat 4 (5.6-8): the arc between H1 and H2 with the measured angle.
        c = np.array([*right_spot, 0])
        p1 = c + np.array([*real[0][:2], 0]) * scale
        p2 = c + np.array([*real[1][:2], 0]) * scale
        a1 = np.arctan2(*(p1 - c)[1::-1])
        a2 = np.arctan2(*(p2 - c)[1::-1])
        arc = Arc(radius=0.75, start_angle=a2, angle=(a1 - a2) % TAU, arc_center=c, stroke_color=CYAN, stroke_width=6)
        value = f"{float(VALUES['methane/a.HCH']):.1f}°"
        mid = (a1 + a2) / 2
        label = Text(value, font=MONO, font_size=40, color=CYAN, weight=BOLD).move_to(c + 2.45 * np.array([np.cos(mid), np.sin(mid), 0]))
        measured = caption(TEXT["real"][0]).next_to(mol, DOWN, buff=0.35)
        t0 = self.now()
        self.play(Create(arc), FadeIn(label), FadeIn(measured), run_time=0.9)
        self.mark("methane/a.HCH", t0, PROPS["duration"])


# ---- domain-spread -----------------------------------------------------------------
def balloon(direction, length, width, opacity):
    """A translucent teardrop from the origin along a 2D direction."""
    d = unit([direction[0], direction[1], 0]) if np.linalg.norm(direction[:2]) > 1e-6 else UP
    n = np.array([-d[1], d[0], 0])
    tip = d * length
    pts = [ORIGIN, d * length * 0.35 + n * width, tip + n * width * 0.7, tip + d * width * 0.6, tip - n * width * 0.7, d * length * 0.35 - n * width, ORIGIN]
    shape = VMobject().set_points_smoothly(pts)
    return shape.set_fill(CYAN, opacity=opacity).set_stroke(CYAN, width=3, opacity=min(1, opacity + 0.4))


def tetra_dirs():
    """The model tetrahedron's four directions (from its symmetry, not a measurement)."""
    return [unit(v) for v in ([1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1])]


class DomainSpread(Timed):
    def build(self):
        # Final directions per panel (3D); start bunched within a narrow cone pointing up.
        line = [np.array([-1.0, 0, 0]), np.array([1.0, 0, 0])]
        tri = [np.array([np.cos(t), np.sin(t), 0]) for t in (PI / 2, PI / 2 + TAU / 3, PI / 2 + 2 * TAU / 3)]
        # Tetrahedron turned so one domain points up and the view tilts a little toward the viewer.
        up = unit([1, 1, 1])
        R = rot(np.cross(up, [0, 1, 0]), np.degrees(np.arccos(np.dot(up, [0, 1, 0]))))
        tet = [rot([1, 0, 0], 18) @ rot([0, 1, 0], 25) @ (R @ d) for d in tetra_dirs()]
        sets = [line, tri, tet]
        names, caps = TEXT["names"], TEXT["captions"]
        # The model angles are cited (vsepr-model.yaml), in panel order: one decimal, no ".0".
        refs = list(VALUES.keys())
        angles = [f"{round(float(VALUES[r]), 1):g}°" for r in refs]
        if PORTRAIT:
            centres = [np.array([0, FH * 0.3, 0]), np.array([0, 0.0, 0]), np.array([0, -FH * 0.3, 0])]
        else:
            centres = [np.array([x, 0.5, 0]) for x in (-FW * 0.31, 0.0, FW * 0.31)]
        L = 1.25
        frames = VGroup(*[RoundedRectangle(corner_radius=0.3, width=(FW * 0.3 if not PORTRAIT else FW * 0.86),
                                           height=(FH * 0.6 if not PORTRAIT else FH * 0.29), stroke_color=GREY_D, stroke_width=2)
                          .move_to(c + (DOWN * 0.5 if not PORTRAIT else ORIGIN)) for c in centres])
        self.add(frames)
        rng = np.random.default_rng(3)
        starts = [[unit(np.array([rng.uniform(-0.25, 0.25), 1.0, rng.uniform(-0.25, 0.25)])) for _ in s] for s in sets]
        k = ValueTracker(0.0)

        def panel(i):
            def draw():
                t = k.get_value()
                ds = [unit((1 - t) * a + t * b) for a, b in zip(starts[i], sets[i])]
                order = sorted(range(len(ds)), key=lambda j: ds[j][2])
                g = VGroup()
                for j in order:
                    g.add(balloon(ds[j], L * (0.85 + 0.15 * (ds[j][2] + 1) / 2), 0.32, 0.18 + 0.2 * (ds[j][2] + 1) / 2))
                g.add(Dot(radius=0.12, color=INK))
                return g.move_to(centres[i], aligned_edge=ORIGIN).shift(centres[i] - g[-1].get_center())
            return always_redraw(draw)

        balloons = [panel(i) for i in range(3)]
        self.play(*[FadeIn(b) for b in balloons], run_time=0.8)
        self.wait(0.4)
        self.play(k.animate.set_value(1.0), run_time=4.5, rate_func=ease_in_out_sine)
        for b in balloons:
            b.clear_updaters()
        labels = VGroup()
        for i in range(3):
            off = DOWN * (FH * 0.22 if not PORTRAIT else FH * 0.095)
            n = Text(names[i], font=SANS, font_size=40, color=INK, weight=BOLD).move_to(centres[i] + off)
            c = Text(f"{caps[i]} {angles[i]}", font=MONO, font_size=32, color=MUTED).next_to(n, DOWN, buff=0.18)
            labels.add(VGroup(n, c))
        t0 = self.now()
        self.play(LaggedStart(*[FadeIn(l, shift=UP * 0.1) for l in labels], lag_ratio=0.3), run_time=1.6)
        for r in refs:
            self.mark(r, t0, PROPS["duration"])


# ---- wedge-dash-methane --------------------------------------------------------------
def wedge(a, b, width=0.16, colour=INK):
    d = unit(b - a)
    n = np.array([-d[1], d[0], 0])
    return Polygon(a, b + n * width, b - n * width, stroke_width=0).set_fill(colour, opacity=1)


def dash(a, b, width=0.16, colour=INK, steps=7):
    d = unit(b - a)
    n = np.array([-d[1], d[0], 0])
    g = VGroup()
    for i in range(1, steps + 1):
        t = i / steps
        p = a + (b - a) * t
        w = width * t + 0.02
        g.add(Line(p + n * w, p - n * w, stroke_color=colour, stroke_width=4))
    return g


class WedgeDashMethane(Timed):
    def build(self):
        dirs = methane_dirs()  # H1, H2 in the page; H3 toward you (+z), H4 away
        page_view = rot([1, 1, 0], 22)  # the same small tilt as methane-unflatten, so H3/H4 separate
        scale = 1.5
        model_at = np.array([-FW * 0.2, 0.2]) if not PORTRAIT else np.array([0.0, FH * 0.18])
        drawing_at = np.array([FW * 0.22, 0.2]) if not PORTRAIT else np.array([0.0, -FH * 0.2])
        turn = ValueTracker(150.0)
        pos = ValueTracker(0.0)

        def view():
            return page_view @ rot([0, 1, 0], turn.get_value())

        def model():
            R = view()
            pts = [R @ (d * R_CH) for d in dirs]
            ctr = (1 - pos.get_value()) * np.array([0.0, 0.2]) + pos.get_value() * model_at
            return molecule_2d([p[:2] for p in pts], ctr, [p[2] for p in pts], scale=scale)

        mol = always_redraw(model)
        self.play(FadeIn(mol), run_time=0.6)
        # Beat 1 (0.6-4): the model turns until H1 and H2 lie in the page.
        self.play(turn.animate.set_value(0.0), run_time=3.2, rate_func=ease_in_out_sine)
        # Beat 2 (4-5): the sheet (the page) fades in through C, H1 and H2.
        sheet = RoundedRectangle(corner_radius=0.25, width=4.6, height=4.0, stroke_color=CYAN, stroke_width=2) \
            .set_fill(CYAN, opacity=0.12).move_to([0, 0.2, 0]).set_z_index(-1)
        sheet_label = Text(TEXT["sheet"][0], font=SANS, font_size=30, color=CYAN).next_to(sheet, UP, buff=0.12)
        self.play(FadeIn(sheet), FadeIn(sheet_label), run_time=0.8)
        # Beat 3 (5-6.6): the model and its sheet move aside; the drawing builds bond by bond beside it.
        pts = [page_view @ (d * R_CH) for d in dirs]
        self.play(pos.animate.set_value(1.0), VGroup(sheet, sheet_label).animate.shift([*model_at - np.array([0.0, 0.2]), 0]),
                  run_time=0.9, rate_func=ease_in_out_sine)
        mol.clear_updaters()
        c = np.array([*drawing_at, 0])
        ends = [c + np.array([*p[:2], 0]) * scale for p in pts]
        trim = 0.3

        def short(e):
            return c + (e - c) * (1 - trim / np.linalg.norm(e - c)), c + (e - c) * (0.28 / np.linalg.norm(e - c))

        Cl = Text("C", font=MONO, font_size=60, color=INK, weight=BOLD).move_to(c)
        Hs = [Text("H", font=MONO, font_size=52, color=INK, weight=BOLD).move_to(e) for e in ends]
        lines = [Line(short(e)[1], short(e)[0], stroke_color=INK, stroke_width=6) for e in ends[:2]]
        w = wedge(short(ends[2])[1], short(ends[2])[0])
        d = dash(short(ends[3])[1], short(ends[3])[0])
        self.play(FadeIn(Cl), *[FadeIn(h) for h in Hs[:2]], *[Create(l) for l in lines], run_time=0.8)
        self.play(FadeIn(Hs[2]), GrowFromPoint(w, c), run_time=0.6)
        self.play(FadeIn(Hs[3]), FadeIn(d), run_time=0.6)
        # Beat 4: label each bond.
        labs = TEXT["labels"]
        def lab(text, at, direction):
            return Text(text, font=SANS, font_size=28, color=CYAN).next_to(at, direction, buff=0.12)
        tags = VGroup(
            lab(labs[0], Hs[0], UP),
            lab(labs[0], Hs[1], RIGHT),
            lab(labs[1], Hs[2], DOWN),
            lab(labs[2], Hs[3], LEFT),
        )
        self.play(LaggedStart(*[FadeIn(t) for t in tags], lag_ratio=0.25), run_time=1.2)
