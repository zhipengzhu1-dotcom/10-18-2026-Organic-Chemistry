"""star-forge: Lesson 0's watch-only intro (s01), Manim CE 0.22.0, plain text (no LaTeX).

The owner-approved prototype cut 2 (prototypes/lesson-00/star-forge-manim/ on branch
prototype/lesson-00-why-carbon), ported to the pipeline and redrawn on Paper Notebook (#123):
silent, 60 fps, about 13 s, the last frame is the poster. Six beats: a hand-drawn star; three
helium-4 drift in; they fuse into carbon-12 as "3 4He -> 12C" writes on; pull back, the carbon
drifts into a cell; the nucleus morphs into a C with four valence dots; the star-line card.
The Arcade nebula and starfield are now ruled paper with doodles around the edges.

Every number and colour comes from the props file the render command writes
(SCENE_PROPS, built from the cited-data lookup and the design tokens); the mass
numbers label the nuclei and the proton counts decide how many nucleons of each
kind are drawn. When each number is on screen goes to TIMINGS_OUT for the sources
sidecar. Render with `pnpm scenes:render star-forge`, never by hand.
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403  (idiomatic Manim)
from manim.utils.rate_functions import ease_in_out_sine

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paper import *  # noqa: E402, F403  (after Manim: the palette names win)

# ---- cited numbers ------------------------------------------------------------
HE_Z, HE_A = int(VALUES["nuclides/He-4.Z"]), int(VALUES["nuclides/He-4.A"])
C_Z, C_A = int(VALUES["nuclides/C-12.Z"]), int(VALUES["nuclides/C-12.A"])
N_HE = C_A // HE_A  # helium nuclei per carbon nucleus


# ---- building blocks -------------------------------------------------------
def star(radius):
    """A hand-drawn star: an orange marker disc with a yellow middle, a pen outline and rays."""
    disc = marked(Circle(radius=radius), ORANGE_FILL, pen=ORANGE, width=PEN * 1.2)
    middle = Circle(radius=radius * 0.55).set_stroke(width=0).set_fill(YELLOW_FILL, opacity=1).shift(MARKER_SHIFT)
    rays = VGroup()
    for k in range(12):
        a = k * TAU / 12 + 0.13
        u = np.array([np.cos(a), np.sin(a), 0])
        r0, r1 = radius * 1.12, radius * (1.42 if k % 2 else 1.3)
        rays.add(Line(u * r0, u * r1, stroke_color=ORANGE, stroke_width=PEN * 1.2))
    return VGroup(disc[0], middle, disc[1], rays)


MARKER_SHIFT = np.array([0.05, -0.04, 0])


def nucleon(color, r=0.075):
    return Dot(radius=r).set_fill(color, opacity=1).set_stroke(INK, width=1.6)


def nucleon_colours(z, a):
    """Protons (blue marker) and neutrons (paper), alternating while both remain; every one inked round."""
    p, n, cols = z, a - z, []
    while p or n:
        if p:
            cols.append(BLUE_FILL)
            p -= 1
        if n:
            cols.append(PAPER)
            n -= 1
    return cols


def cluster_points(a):
    """Close-packed positions for a nucleons: a small ring, or a centre, a ring of 6 and an outer ring."""
    if a <= 4:
        return [0.07 * np.array([np.cos(t), np.sin(t), 0]) for t in PI / 2 - np.arange(a) * TAU / a]
    pts = [ORIGIN] + [0.13 * np.array([np.cos(t), np.sin(t), 0]) for t in np.arange(6) * TAU / 6]
    rest = a - 7
    pts += [0.235 * np.array([np.cos(t), np.sin(t), 0]) for t in (np.arange(rest) * TAU / rest + 0.3)]
    return pts


def nucleus(z, a, r=0.075):
    return VGroup(*[nucleon(c, r=r).move_to(p) for c, p in zip(nucleon_colours(z, a), cluster_points(a))])


def ring(radius):
    """A blue pen ring round a nucleus (the Arcade glow, as the notebook draws it)."""
    return Circle(radius=radius, stroke_color=BLUE, stroke_width=PEN * 0.7)


def helium():
    """One helium nucleus inside its ring."""
    return VGroup(ring(0.3), nucleus(HE_Z, HE_A))


def isotope(mass, sym, size, weight=MEDIUM):
    """Mass number as a tight superscript, composed (a Unicode superscript in a monospace font reads as a gap)."""
    body = Text(sym, font=MONO, font_size=size, color=INK, weight=weight)
    m = Text(str(mass), font=MONO, font_size=size * 0.58, color=INK, weight=weight)
    m.next_to(body, LEFT, buff=0.03 * size / 36).align_to(body, UP).shift(UP * body.height * 0.22)
    return VGroup(m, body)


def equation(size):
    n = Text(str(N_HE), font=MONO, font_size=size, color=INK)
    he = isotope(HE_A, "He", size, weight=NORMAL)
    arrow = Text("→", font=MONO, font_size=size, color=BLUE)
    c = isotope(C_A, "C", size, weight=NORMAL)
    parts = VGroup(n, he, arrow, c).arrange(RIGHT, buff=0.32 * size / 56)
    for p in (he, c):
        p.align_to(n, DOWN)
    arrow.move_to([arrow.get_x(), n.get_y(), 0])
    return parts


def backdrop(P):
    """Ruled paper wide enough for the camera's travel, with doodles in the corners the story leaves free."""
    lo = np.minimum(ORIGIN, P) - np.array([FW, FH, 0]) * 0.75
    hi = np.maximum(ORIGIN, P) + np.array([FW, FH, 0]) * 0.75
    paper = ruled(hi[0] - lo[0], hi[1] - lo[1], (lo + hi) / 2, margin=False)
    if PORTRAIT:
        spots = [("sprig", 2.2, (-2.65, 4.4), 0.12), ("tubes", 1.15, (2.55, 4.95), -0.06),
                 ("flask", 1.3, (-2.8, -5.35), -0.1), ("benzene", 1.05, (-1.9, -11.1), 0.0),
                 ("beaker", 1.25, (3.9, -11.25), 0.08)]
    else:
        spots = [("sprig", 2.2, (-4.85, 1.45), 0.12), ("flask", 1.5, (-4.75, -2.2), -0.08),
                 ("tubes", 1.0, (5.3, 2.25), -0.05), ("benzene", 1.0, (10.1, 2.0), 0.0),
                 ("beaker", 1.1, (10.35, -4.1), 0.08)]
    doodles = VGroup(*[doodle(n, h, [x, y, 0], a) for n, h, (x, y), a in spots])
    return VGroup(paper, doodles)


class StarForge(MovingCameraScene):
    def construct(self):
        self.shown = {}  # ref -> [[from, to], ...] seconds on screen
        with fonts():
            self.build()
        out = os.environ.get("TIMINGS_OUT")
        if out:
            Path(out).write_text(json.dumps(self.shown))

    def now(self):
        return float(self.renderer.time)

    def mark(self, ref, start, end):
        self.shown.setdefault(ref, []).append([round(start, 3), round(end, 3)])

    def build(self):
        frame = self.camera.frame

        # Where the carbon ends up (reflowed per aspect).
        P = np.array([1.0, -6.0, 0]) if PORTRAIT else np.array([4.2, -1.2, 0])

        # ---- backdrop: ruled paper and doodles (static, wide enough for camera travel)
        self.add(backdrop(P))

        # ---- Beat 1 (0.0-2.0): the star fades up, breathes; camera pushes in
        sun = star(1.55 if not PORTRAIT else 1.4)
        breath = ValueTracker(0)
        sun.base = sun.copy()
        sun.add_updater(lambda m: m.become(
            sun.base.copy().scale(1 + 0.035 * np.sin(breath.get_value() * TAU / 2.2))))
        self.add(breath)
        breath.add_updater(lambda v, dt: v.increment_value(dt))
        frame.save_state()
        self.play(FadeIn(sun, scale=0.9), frame.animate.scale(0.86),
                  run_time=2.0, rate_func=ease_in_out_sine)

        # ---- Beat 2 (2.0-4.5): the helium nuclei drift in, labels follow
        R0 = FH * 0.42 if PORTRAIT else FW * 0.36
        ends = [0.55 * np.array([np.cos(a), np.sin(a), 0]) for a in PI / 2 + np.arange(N_HE) * TAU / N_HE]
        starts = [R0 * np.array([np.cos(a), np.sin(a), 0]) for a in PI / 2 + np.arange(N_HE) * TAU / N_HE + 0.5]
        hes, labels = VGroup(), VGroup()
        for s in starts:
            he = helium().move_to(s)
            lab = isotope(HE_A, "He", 30)
            lab.add_updater(lambda m, he=he: m.next_to(he[1], UR, buff=0.12))
            hes.add(he)
            labels.add(lab)
        t_labels = self.now()
        self.play(
            LaggedStart(*[FadeIn(VGroup(h, l)) for h, l in zip(hes, labels)], lag_ratio=0.15),
            run_time=0.5,
        )
        self.play(
            *[h.animate.move_to(e) for h, e in zip(hes, ends)],
            frame.animate.scale(0.97),
            Succession(Wait(1.5), FadeOut(labels, run_time=0.5)),
            run_time=2.0, rate_func=ease_in_out_sine,
        )
        self.mark("nuclides/He-4.A", t_labels, self.now())

        # ---- Beat 3 (4.5-6.5): a highlighter flash, merge into carbon; equation writes on
        c_nuc = VGroup(ring(0.5), nucleus(C_Z, C_A, r=0.085))
        c_label = isotope(C_A, "C", 36)
        c_label.add_updater(lambda m: m.next_to(c_nuc[1], UR, buff=0.14))
        eq = equation(64 if PORTRAIT else 56)
        eq.move_to([0, -FH * 0.86 * 0.5 * 0.62, 0])
        # The equation sits on a strip of paper, so it reads over the star's rays.
        eq_card = SurroundingRectangle(eq, buff=0.18, corner_radius=0.12, stroke_color=INK, stroke_width=PEN * 0.6) \
            .set_fill(PAPER, opacity=1)
        eq = VGroup(eq_card, eq)
        he_dots = VGroup(*[n for h in hes for n in h[1]])
        flash = Circle(radius=0.5).set_stroke(width=0).set_fill(YELLOW_FILL, opacity=0.9)
        self.play(
            *[h.animate.move_to(ORIGIN) for h in hes],
            run_time=0.5, rate_func=rate_functions.ease_in_quad,
        )
        self.add(flash)
        t_eq = self.now()
        self.play(
            flash.animate(rate_func=rate_functions.ease_out_cubic).scale(5).set_opacity(0),
            ReplacementTransform(he_dots, c_nuc[1]),
            FadeOut(VGroup(*[h[0] for h in hes])),
            FadeIn(c_nuc[0], scale=0.4),
            FadeIn(eq_card, run_time=0.3),
            Write(eq[1], run_time=1.5),
            Succession(Wait(0.4), FadeIn(c_label, run_time=0.4)),
            run_time=1.5,
        )
        self.remove(flash)
        self.add(c_nuc, c_label)

        # ---- Beat 4 (6.5-9.0): pull back, star shrinks to a point, carbon drifts out; cell
        sun.clear_updaters()
        t_pull = self.now()
        mid = P * 0.55
        end_w = FW * (1.05 if PORTRAIT else 1.0)
        self.play(
            frame.animate.set(width=end_w).move_to(mid),
            sun.animate.scale(0.06),
            c_nuc.animate.move_to(P),
            Succession(FadeOut(eq, run_time=0.6), Wait(1.3)),
            run_time=1.9, rate_func=ease_in_out_sine,
        )
        self.mark("nuclides/He-4.A", t_eq, t_pull + 0.6)  # the equation fades out early in beat 4
        cell = self.membrane(P)
        self.play(Create(cell[1], run_time=0.6), FadeIn(cell[0]), run_time=0.6)

        # ---- Beat 5 (9.0-10.5): nucleus morphs into C; four valence dots, one at a time
        C = Text("C", font=MONO, font_size=150, color=INK, weight=BOLD).move_to(P)
        c_label.clear_updaters()
        # The nucleons collapse into one ink disc, whose outline then morphs into the C.
        disc = Circle(radius=0.27, stroke_width=0).set_fill(INK, opacity=1).move_to(c_nuc[1]).set_z_index(1)
        collapse = AnimationGroup(
            *[n.animate.move_to(disc.get_center()).scale(0.4) for n in c_nuc[1]],
            FadeIn(disc, scale=0.5),
            run_time=0.3, rate_func=rate_functions.ease_in_quad,
        )
        morph = Succession(collapse, AnimationGroup(
                Transform(disc, C, rate_func=ease_in_out_sine),
                FadeOut(c_nuc[1], run_time=0.1),  # hidden under the disc; must not show in the C's mouth
                run_time=0.4))
        t_morph = self.now()
        self.play(
            morph,
            FadeOut(c_nuc[0], scale=1.4),
            FadeOut(c_label, run_time=0.3),
            frame.animate.move_to(P + (UP * 0.9 if PORTRAIT else UP * 0.35)),
            run_time=0.7, rate_func=ease_in_out_sine,
        )
        self.mark("nuclides/C-12.A", t_eq, t_morph + 0.3)
        # Succession puts its own Group on the scene: drop it and every nucleon, keep only the glyph
        self.remove(morph.mobject, c_nuc, disc, *c_nuc[1])
        self.add(C)
        d = 0.9
        vdots = VGroup(*[Dot(radius=0.09, color=BLUE).move_to(P + v * d) for v in (UP, RIGHT, DOWN, LEFT)])
        self.play(Succession(*[GrowFromCenter(v, run_time=0.2) for v in vdots]), run_time=0.8)

        # ---- Beat 6 (10.5-13.0): C slides up, star-line card writes on, hold
        atom = VGroup(C, vdots)
        fc = frame.get_center()
        fh = frame.height
        atom_target = fc + UP * fh * 0.2
        if PORTRAIT:
            card = self.card(TEXT["card"], TEXT["cardSub"], big=60, small=34)
            card.move_to(fc + DOWN * fh * 0.13)
        else:
            card = self.card([" ".join(TEXT["card"])], [" ".join(TEXT["cardSub"])], big=58, small=32)
            card.move_to(fc + DOWN * fh * 0.2)
        self.play(
            atom.animate.scale(0.8).move_to(atom_target),
            FadeOut(cell),
            run_time=0.8, rate_func=ease_in_out_sine,
        )
        self.play(Write(card[0]), run_time=0.9)
        self.play(FadeIn(card[1], shift=UP * 0.1), run_time=0.5)
        self.wait(PROPS["duration"] - self.now())  # hold the card; the last frame is the poster

    # ---- helpers -----------------------------------------------------------
    def membrane(self, center):
        """A cell drawn in green: a slightly wobbly pen outline over a pale leaf-green marker fill."""
        a, b = (1.9, 1.5) if PORTRAIT else (2.1, 1.45)

        def pt(t):
            r = 1 + 0.025 * np.sin(2 * t + 0.6) + 0.015 * np.sin(3 * t + 1.3)
            return center + np.array([a * r * np.cos(t), b * r * np.sin(t), 0])

        outline = ParametricFunction(pt, t_range=[0, TAU], stroke_color=GREEN, stroke_width=PEN)
        fill = outline.copy().set_stroke(width=0).set_fill(GREEN_FILL, opacity=0.3).shift(MARKER_SHIFT)
        return VGroup(fill, outline)

    def card(self, big_lines, small_lines, big, small):
        b = VGroup(*[Text(s, font=HAND, font_size=big, color=INK) for s in big_lines])
        b.arrange(DOWN, buff=0.14)
        s = VGroup(*[Text(t, font=TEXT_FONT, font_size=small, color=MUTED) for t in small_lines])
        s.arrange(DOWN, buff=0.14)
        return VGroup(b, s).arrange(DOWN, buff=0.4)
