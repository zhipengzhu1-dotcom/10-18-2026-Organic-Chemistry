"""PROTOTYPE: `star-forge`, Manim Community Edition. Cut 2 (silent) and cut 4 (feeds the Resolve edit).

Storyboard: ../star-forge-storyboard.md (30 fps, Arcade Cosmos). Cut 4 holds the card 1.0 s longer
(14.0 s) so the edit can fade out without eating the poster frame.
Aspect comes from the ASPECT env var ("9x16" or "16x9"); see render.sh.
Sections (render with --save_sections) are the edit's cut points:
  s1-star 0-2.0, s2-approach 2.0-5.0, s3-fuse 5.0-6.5 (cut on the fusion flash),
  s4-pullback 6.5-9.0, s5-morph 9.0-10.5, s6-card 10.5-14.0.
"""

import os
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403  (idiomatic Manim)
from manim.utils.rate_functions import ease_in_out_sine

HERE = Path(__file__).resolve().parent
ASPECT = os.environ.get("ASPECT", "16x9")
PORTRAIT = ASPECT == "9x16"

# ---- config per aspect ---------------------------------------------------
if PORTRAIT:
    config.pixel_width, config.pixel_height = 1080, 1920
    config.frame_width = 8.0
    config.frame_height = 8.0 * 1920 / 1080
else:
    config.pixel_width, config.pixel_height = 1920, 1080
    config.frame_height = 8.0
    config.frame_width = 8.0 * 1920 / 1080
config.frame_rate = 30
config.background_color = "#0d0626"

# ---- Arcade Cosmos tokens --------------------------------------------------
SPACE = ManimColor("#0d0626")
MAGENTA = ManimColor("#ff4fd8")
VIOLET = ManimColor("#b44dff")
BLUE_N = ManimColor("#2340ff")
CYAN = ManimColor("#3ee8ff")
ORANGE = ManimColor("#ff9a1f")
WHITE_T = ManimColor("#ffffff")
MUTED = ManimColor("#b9a8e8")
MONO = "JetBrains Mono"
SANS = "Space Grotesk"

RNG = np.random.default_rng(12)


# ---- building blocks -------------------------------------------------------
def glow(color, radius, layers=18, peak=0.6, inner=None):
    """Radial glow from stacked translucent discs (Cairo has no blur)."""
    discs = VGroup()
    for i in range(layers):
        f = 1 - i / layers  # 1 -> small
        c = color if inner is None else interpolate_color(inner, color, f**0.8)
        discs.add(
            Circle(radius=radius * f, stroke_width=0)
            .set_fill(c, opacity=peak / layers * (1.6 if i > layers * 0.7 else 1))
        )
    return discs


def nebula(color, w, h, peak=0.16):
    return glow(color, 1.0, layers=32, peak=peak).stretch(w, 0).stretch(h, 1)


def starfield(w, h, n):
    dots = VGroup()
    for _ in range(n):
        x, y = RNG.uniform(-w / 2, w / 2), RNG.uniform(-h / 2, h / 2)
        r = RNG.choice([0.008, 0.012, 0.018, 0.026], p=[0.4, 0.3, 0.2, 0.1])
        col = RNG.choice([WHITE_T, MUTED, CYAN], p=[0.7, 0.2, 0.1])
        dots.add(Dot([x, y, 0], radius=r, color=col).set_opacity(RNG.uniform(0.35, 0.95)))
    return dots


def nucleon(color, r=0.075):
    return Dot(radius=r, color=color).set_stroke(SPACE, width=1.2, opacity=0.6)


def helium():
    """2 p (cyan) + 2 n (white) in a tight diamond, with a soft cyan glow."""
    d = 0.07
    core = VGroup(
        nucleon(CYAN).shift(UP * d), nucleon(WHITE_T).shift(RIGHT * d),
        nucleon(CYAN).shift(DOWN * d), nucleon(WHITE_T).shift(LEFT * d),
    )
    return VGroup(glow(CYAN, 0.42, layers=12, peak=0.55), core)


def carbon_core():
    """12 nucleons (6 p cyan, 6 n white): a hexagonal close-packed blob."""
    pts = [ORIGIN] + [0.13 * np.array([np.cos(a), np.sin(a), 0]) for a in np.arange(6) * TAU / 6]
    pts += [0.235 * np.array([np.cos(a), np.sin(a), 0]) for a in (np.arange(5) * TAU / 5 + 0.3)]
    cols = [CYAN, WHITE_T] * 6
    return VGroup(*[nucleon(c, r=0.085).move_to(p) for c, p in zip(cols, pts)])


def isotope(mass, sym, size, weight=MEDIUM):
    """Mass number as a tight superscript. JetBrains Mono gives Unicode
    superscripts a full monospace cell, so 12C reads as "1 2C"; compose instead."""
    body = Text(sym, font=MONO, font_size=size, color=WHITE_T, weight=weight)
    m = Text(mass, font=MONO, font_size=size * 0.58, color=WHITE_T, weight=weight)
    m.next_to(body, LEFT, buff=0.03 * size / 36).align_to(body, UP).shift(UP * body.height * 0.22)
    return VGroup(m, body)


def equation(size):
    three = Text("3", font=MONO, font_size=size, color=WHITE_T)
    he = isotope("4", "He", size, weight=NORMAL)
    arrow = Text("→", font=MONO, font_size=size, color=CYAN)
    c = isotope("12", "C", size, weight=NORMAL)
    parts = VGroup(three, he, arrow, c).arrange(RIGHT, buff=0.32 * size / 56)
    for p in (he, c):
        p.align_to(three, DOWN)
    arrow.move_to([arrow.get_x(), three.get_y(), 0])
    return parts


class StarForge(MovingCameraScene):
    def construct(self):
        with register_font(str(HERE / "fonts" / "SpaceGrotesk-wght.ttf")), \
             register_font(str(HERE / "fonts" / "JetBrainsMono-wght.ttf")):
            self.build()

    def build(self):
        frame = self.camera.frame
        FW, FH = config.frame_width, config.frame_height

        # Where the carbon ends up, and the shot it ends in (reflowed per aspect).
        if PORTRAIT:
            P = np.array([1.0, -6.0, 0])  # drifts down-right out of the core
        else:
            P = np.array([4.2, -1.2, 0])  # drifts right out of the core

        # ---- backdrop: nebula + stars (static, wide enough for camera travel)
        neb = VGroup(
            nebula(MAGENTA, FW * 0.55, FH * 0.35).move_to([-FW * 0.35, FH * 0.32, 0]),
            nebula(VIOLET, FW * 0.7, FH * 0.4).move_to(P + np.array([FW * 0.1, -FH * 0.05, 0])),
            nebula(BLUE_N, FW * 0.6, FH * 0.45, peak=0.22).move_to([FW * 0.4, FH * 0.1, 0]),
            nebula(MAGENTA, FW * 0.4, FH * 0.3, peak=0.12).move_to(P + np.array([-FW * 0.3, -FH * 0.2, 0])),
            nebula(BLUE_N, FW * 0.5, FH * 0.3, peak=0.18).move_to([-FW * 0.3, -FH * 0.35, 0]),
        )
        stars = starfield(FW * 2.2, FH * 2.2, 260)
        self.add(neb, stars)

        # ---- Beat 1 (0.0-2.0): star core fades up, breathes; camera pushes in
        star = VGroup(
            glow(ORANGE, 2.7 if not PORTRAIT else 2.4, layers=70, peak=2.6, inner=ManimColor("#ffe2a8")),
            glow(WHITE_T, 0.9, layers=30, peak=2.0),
        )
        breath = ValueTracker(0)
        star.base = star.copy()
        star.add_updater(lambda m: m.become(
            star.base.copy().scale(1 + 0.035 * np.sin(breath.get_value() * TAU / 2.2))))
        self.add(breath)
        breath.add_updater(lambda v, dt: v.increment_value(dt))
        frame.save_state()
        self.next_section("s1-star")
        self.play(FadeIn(star, scale=0.9), frame.animate.scale(0.86),
                  run_time=2.0, rate_func=ease_in_out_sine)

        # ---- Beat 2 (2.0-4.5): three ⁴He drift in, labels follow
        R0 = FH * 0.42 if PORTRAIT else FW * 0.36
        ends = [0.55 * np.array([np.cos(a), np.sin(a), 0]) for a in (PI / 2, PI / 2 + TAU / 3, PI / 2 + 2 * TAU / 3)]
        starts = [R0 * np.array([np.cos(a), np.sin(a), 0]) for a in (PI / 2 + 0.5, PI / 2 + TAU / 3 + 0.5, PI / 2 + 2 * TAU / 3 + 0.5)]
        self.next_section("s2-approach")
        hes, labels = VGroup(), VGroup()
        for s in starts:
            he = helium().move_to(s)
            lab = isotope("4", "He", 30)
            lab.add_updater(lambda m, he=he: m.next_to(he[1], UR, buff=0.12))
            hes.add(he)
            labels.add(lab)
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

        # ---- Beat 3 (4.5-6.5): flash, merge into ¹²C; equation writes on
        c_nuc = VGroup(glow(CYAN, 0.8, layers=16, peak=0.7), carbon_core())
        c_label = isotope("12", "C", 36)
        c_label.add_updater(lambda m: m.next_to(c_nuc[1], UR, buff=0.14))
        eq = equation(64 if PORTRAIT else 56)
        eq.move_to([0, -FH * 0.86 * 0.5 * 0.62, 0])
        he_dots = VGroup(*[n for h in hes for n in h[1]])
        flash = glow(WHITE_T, 0.5, layers=20, peak=2.0)
        self.play(
            *[h.animate.move_to(ORIGIN) for h in hes],
            run_time=0.5, rate_func=rate_functions.ease_in_quad,
        )
        self.next_section("s3-fuse")  # cut point sits exactly on the flash
        self.add(flash)
        self.play(
            flash.animate(rate_func=rate_functions.ease_out_cubic).scale(5).set_opacity(0),
            ReplacementTransform(he_dots, c_nuc[1]),
            FadeOut(VGroup(*[h[0] for h in hes])),
            FadeIn(c_nuc[0], scale=0.4),
            Write(eq, run_time=1.5),
            Succession(Wait(0.4), FadeIn(c_label, run_time=0.4)),
            run_time=1.5,
        )
        self.remove(flash)
        self.add(c_nuc, c_label)

        # ---- Beat 4 (6.5-9.0): pull back, star shrinks to a point, carbon drifts out; cell
        self.next_section("s4-pullback")
        star.clear_updaters()
        mid = P * 0.55
        end_w = FW * (1.05 if PORTRAIT else 1.0)
        self.play(
            frame.animate.set(width=end_w).move_to(mid),
            star.animate.scale(0.035).set_opacity(0.9),
            c_nuc.animate.move_to(P),
            Succession(FadeOut(eq, run_time=0.6), Wait(1.3)),  # play(run_time) overrides inner run_time
            run_time=1.9, rate_func=ease_in_out_sine,
        )
        cell = self.membrane(P)
        self.play(Create(cell, run_time=0.6), FadeIn(cell[0]), run_time=0.6)

        # ---- Beat 5 (9.0-10.5): nucleus morphs into C; four valence dots, one at a time
        self.next_section("s5-morph")
        C = Text("C", font=MONO, font_size=150, color=WHITE_T, weight=BOLD).move_to(P)
        c_label.clear_updaters()
        # Clean morph: the 12 nucleons first collapse into one white disc, then the single
        # disc outline morphs into the single C contour (no 12 overlapping partial C's).
        disc = Circle(radius=0.27, stroke_width=0).set_fill(WHITE_T, opacity=1).move_to(c_nuc[1]).set_z_index(1)
        collapse = AnimationGroup(
            *[n.animate.move_to(disc.get_center()).scale(0.4) for n in c_nuc[1]],
            FadeIn(disc, scale=0.5),
            run_time=0.3, rate_func=rate_functions.ease_in_quad,
        )
        morph = Succession(collapse, AnimationGroup(
                Transform(disc, C, rate_func=ease_in_out_sine),
                FadeOut(c_nuc[1], run_time=0.1),  # hidden under the disc; must not show in the C's mouth
                run_time=0.4))
        self.play(
            morph,
            FadeOut(c_nuc[0], scale=1.4),
            FadeOut(c_label, run_time=0.3),
            frame.animate.move_to(P + (UP * 0.9 if PORTRAIT else UP * 0.35)),
            run_time=0.7, rate_func=ease_in_out_sine,
        )
        # Succession puts its own Group on the scene: drop it and every nucleon, keep only the glyph
        self.remove(morph.mobject, c_nuc, disc, *c_nuc[1])
        self.add(C)
        d = 0.9
        vdots = VGroup(*[
            VGroup(glow(CYAN, 0.16, layers=8, peak=0.7), Dot(radius=0.085, color=CYAN)).move_to(P + v * d)
            for v in (UP, RIGHT, DOWN, LEFT)
        ])
        self.play(Succession(*[GrowFromCenter(v, run_time=0.2) for v in vdots]), run_time=0.8)

        # ---- Beat 6 (10.5-13.0): C slides up, star-line card writes on, hold
        self.next_section("s6-card")
        atom = VGroup(C, vdots)
        fc = frame.get_center()
        fh = frame.height
        if PORTRAIT:
            atom_target = fc + UP * fh * 0.2
            card = self.card(["Every carbon atom", "in you was forged", "in a star."],
                             ["Organic chemistry is what", "that carbon learned to do next."],
                             big=46, small=32)
            card.move_to(fc + DOWN * fh * 0.13)
        else:
            atom_target = fc + UP * fh * 0.2
            card = self.card(["Every carbon atom in you was forged in a star."],
                             ["Organic chemistry is what that carbon learned to do next."],
                             big=44, small=30)
            card.move_to(fc + DOWN * fh * 0.2)
        self.play(
            atom.animate.scale(0.8).move_to(atom_target),
            FadeOut(cell),
            run_time=0.8, rate_func=ease_in_out_sine,
        )
        self.play(Write(card[0]), run_time=0.9)
        self.play(FadeIn(card[1], shift=UP * 0.1), run_time=0.5)
        self.wait(1.3)  # hold; last frame is the poster frame (1.0 s longer than cut 2: room for the edit's fade-out)

    # ---- helpers -----------------------------------------------------------
    def membrane(self, center):
        """Soft rounded cell outline, faint cyan, slightly wobbly."""
        a, b = (1.9, 1.5) if PORTRAIT else (2.1, 1.45)

        def pt(t):
            r = 1 + 0.025 * np.sin(2 * t + 0.6) + 0.015 * np.sin(3 * t + 1.3)
            return center + np.array([a * r * np.cos(t), b * r * np.sin(t), 0])

        outline = ParametricFunction(pt, t_range=[0, TAU], stroke_color=CYAN, stroke_width=3,
                                     stroke_opacity=0.55)
        halo = outline.copy().set_stroke(CYAN, width=14, opacity=0.12)
        fill = outline.copy().set_stroke(width=0).set_fill(CYAN, opacity=0.06)
        return VGroup(fill, halo, outline)

    def card(self, big_lines, small_lines, big, small):
        b = VGroup(*[Text(s, font=SANS, font_size=big, weight=BOLD, color=WHITE_T) for s in big_lines])
        b.arrange(DOWN, buff=0.18)
        s = VGroup(*[Text(t, font=SANS, font_size=small, color=MUTED) for t in small_lines])
        s.arrange(DOWN, buff=0.14)
        return VGroup(b, s).arrange(DOWN, buff=0.4)
