"""hybrid-mixing: Lesson 4's watch-only s02 Scene, Manim CE 0.22.0, plain text (no LaTeX).

Silent, 60 fps, 10 s; the last frame is the poster. One round 2s and three 2p dumbbells (solid +
lobe, hatched - lobe) slide to the centre and blend; four sp3 lobes come out and swing to the
corners of a tetrahedron; "4 in -> 4 out" writes on; the "model" label stays on screen.

The lobe shapes are Lesson 4's hybrid model (scenes/src/hybrid-model/model.ts), repeated here in
a few lines: hydrogen-like angular parts Y00 and Y10 mixed as (s + sqrt(n) p)/sqrt(1+n), drawn as
the polar plot of the angular part squared, a p lobe reaching 1 unit. A 3D direction is drawn by
laying the lobe's profile flat along its projected axis (the same view turn as the hybrid-sets
Scene's sp3 panel). No measured numbers. Words and colours come from the props file the render
command writes (SCENE_PROPS). Render with `pnpm scenes:render hybrid-mixing`, never by hand.
"""

import json
import math
import os
import sys
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403  (idiomatic Manim)
from manim.utils.rate_functions import ease_in_out_sine

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paper import *  # noqa: E402, F403  (after Manim: the palette names win)

# Each orbital colour as a pen line and the marker fill inside it.
SKY = (BLUE, BLUE_FILL)  # s, p
SUN = (ORANGE, ORANGE_FILL)  # the hybrids

# ---- the hybrid model (scenes/src/hybrid-model/model.ts) ---------------------
Y00 = 1 / (2 * math.sqrt(math.pi))
Y10 = math.sqrt(3 / (4 * math.pi))


def angular(n, theta):
    """n p orbitals mixed with the s (None: a pure p)."""
    if n is None:
        return Y10 * math.cos(theta)
    return (Y00 + math.sqrt(n) * Y10 * math.cos(theta)) / math.sqrt(1 + n)


def profile(n, sign, steps=96):
    """The upper half (v >= 0) of one sign's lobe: [(u along the axis, v across)]."""
    pts = []
    for i in range(steps + 1):
        th = math.pi * i / steps
        a = angular(n, th) * sign
        if a > 0:
            r = a * a / (Y10 * Y10)
            pts.append((r * math.cos(th), r * math.sin(th)))
    return pts


def view(v, yaw=25, pitch=-15):
    """A frame vector on screen (x right, y up), as hybrid-model's project()."""
    yw, pt = math.radians(yaw), math.radians(pitch)
    x1 = v[0] * math.cos(yw) + v[2] * math.sin(yw)
    z1 = -v[0] * math.sin(yw) + v[2] * math.cos(yw)
    y2 = v[1] * math.cos(pt) - z1 * math.sin(pt)
    return np.array([x1, y2])


def hatch(shape, color, gap=0.13):
    """Diagonal stripes clipped to a shape: the - sign's pattern."""
    w = max(shape.width, shape.height) * 1.6
    stripes = VGroup()
    c = shape.get_center()
    k = -w
    while k < w:
        s = Rectangle(width=gap * 0.45, height=w * 2).rotate(PI / 4).move_to(c + np.array([k, 0, 0]))
        cut = Intersection(s, shape)
        if len(cut.points):
            stripes.add(cut.set_fill(color, 0.9).set_stroke(width=0))
        k += gap * 1.41
    return stripes


def lobe(n, sign, axis2d, scale, color):
    """One lobe as a marker-filled pen outline laid along a screen direction; - lobes are hatched in pen."""
    pen, fill = color
    length = float(np.linalg.norm(axis2d))
    d = axis2d / length if length > 1e-9 else np.array([0.0, 1.0])
    across = np.array([-d[1], d[0]])
    along = max(length, 0.45)
    half = profile(n, sign)
    ring = half + [(u, -v) for (u, v) in reversed(half)]
    pts = [np.array([*(scale * (u * along * d + v * across)), 0.0]) for (u, v) in ring]
    shape = Polygon(*pts).set_stroke(pen, PEN * 0.75).set_fill(fill, 0.75 if sign > 0 else 0.2)
    if sign < 0:
        return VGroup(shape, hatch(shape, pen))
    return VGroup(shape)


def orbital(n, axis2d, scale, color):
    return VGroup(lobe(n, 1, axis2d, scale, color), lobe(n, -1, axis2d, scale, color))


def chip(text, color, size=24):
    t = Text(text, font=MONO, font_size=size, color=color)
    box = SurroundingRectangle(t, buff=0.08, color=color, stroke_width=2.5).set_fill(PAPER, 1)
    return VGroup(box, t)


class HybridMixing(Scene):
    def construct(self):
        self.add(ruled())
        with fonts():
            self.build()
        out = os.environ.get("TIMINGS_OUT")
        if out:
            Path(out).write_text(json.dumps({}))  # no cited numbers on screen

    def now(self):
        return float(self.renderer.time)

    def build(self):
        model = Text(TEXT["model"][0], font=MONO, font_size=26, color=MUTED)
        model_box = DashedVMobject(SurroundingRectangle(model, buff=0.12, color=MUTED, stroke_width=2), num_dashes=24)
        label = VGroup(model_box, model).to_corner(UL, buff=0.35)
        if not PORTRAIT:
            label.shift(RIGHT * 0.95)  # right of the margin line
        self.add(label)

        s_chip, p_chip, h_chip = TEXT["chips"]
        scale = 0.95 if not PORTRAIT else 0.9
        # Four atomic orbitals in a row (16:9) or a 2 x 2 grid (9:16).
        if PORTRAIT:
            spots = [np.array(p) for p in [(-1.8, 2.6, 0), (1.8, 2.6, 0), (-1.8, -2.6, 0), (1.8, -2.6, 0)]]
        else:
            spots = [np.array([x, 0.2, 0]) for x in (-5.0, -1.7, 1.7, 5.0)]
        s_shape = Circle(radius=scale / 3).set_stroke(BLUE, PEN * 0.75).set_fill(BLUE_FILL, 0.75)
        p_dirs = [np.array([0.0, 1.0]), view((1, 0, 0), 35, -18), view((0, 0, 1), 35, -18)]
        inputs = [VGroup(s_shape, chip(s_chip, BLUE).next_to(s_shape, DOWN, buff=0.35))]
        for d in p_dirs:
            orb = orbital(None, d, scale * 0.8, SKY)
            inputs.append(VGroup(orb, chip(p_chip, BLUE).next_to(orb, DOWN, buff=0.25)))
        for g, spot in zip(inputs, spots):
            g.move_to(spot)
        self.play(LaggedStart(*[FadeIn(g, scale=0.9) for g in inputs], lag_ratio=0.2), run_time=1.6)
        self.wait(0.4)

        # Slide together and blend.
        centre = ORIGIN + np.array([0, -0.1, 0])
        self.play(*[g.animate.move_to(centre).scale(0.6) for g in inputs], run_time=1.6, rate_func=ease_in_out_sine)
        blend = Circle(radius=0.75).set_stroke(ORANGE, PEN * 0.75).set_fill(ORANGE_FILL, 0.8).move_to(centre)
        self.play(FadeOut(VGroup(*inputs), scale=0.7), FadeIn(blend, scale=0.6), run_time=1.0)

        # Four sp3 lobes swing out to the corners of a tetrahedron.
        dirs = [view(v) for v in [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]]
        dirs = [d / math.sqrt(3) for d in dirs]
        big = scale * 1.25
        # Each orbital is built with its nucleus at the origin, then shifted onto the centre.
        lobes = [orbital(3, d, big, SUN).shift(centre) for d in dirs]
        starts = [orbital(3, d, big * 0.25, SUN).shift(centre) for d in dirs]
        self.play(FadeOut(blend), *[ReplacementTransform(a, b) for a, b in zip(starts, lobes)], run_time=2.0, rate_func=ease_in_out_sine)
        nucleus = Dot(centre, radius=0.12, color=INK)
        reach = max(r for (r, _) in profile(3, 1))  # the + lobe's tip, along its axis

        def tip(d):
            n = float(np.linalg.norm(d))
            return centre + np.array([*(d / n * (big * reach * max(n, 0.45) + 0.45)), 0])

        chips = VGroup(*[chip(h_chip, ORANGE).move_to(tip(d)) for d in dirs])
        self.play(FadeIn(nucleus), FadeIn(chips), run_time=0.6)

        counter = Text(TEXT["counter"][0], font=MONO, font_size=40, color=INK)
        counter.to_edge(DOWN, buff=0.6)
        self.play(Write(counter), run_time=1.2)
        self.wait(PROPS["duration"] - self.now())  # hold; the last frame is the poster
