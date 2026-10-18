"""PROTOTYPE (throwaway): `star-forge` in Style A, "Calm Explainer" (3Blue1Brown).

Copied from ../../star-forge-manim/star_forge.py (cut 4) and retimed for Style A. See ../STYLE.md.
One continuous render: every beat bridges into the next inside Manim (morphs, TransformFromCopy,
camera moves), so the edit needs no dissolves. The only editorial transition is the flash on the
fusion contact frame, which Resolve adds at the cut logged here as `contact`.

Every beat time is logged (scene clock) to beats-<aspect>.json, which drives the SFX placement and
the Resolve cut, so picture, sound and edit cannot drift apart.
Aspect from ASPECT env var ("9x16" or "16x9"); see render.sh.
"""

import json
import os
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403
from manim.utils.rate_functions import ease_in_out_sine

HERE = Path(__file__).resolve().parent
FONTS = HERE.parent.parent / "star-forge-manim" / "fonts"
ASPECT = os.environ.get("ASPECT", "16x9")
PORTRAIT = ASPECT == "9x16"

# 9:16 framing via frame_width/frame_height (not just -r): research manim-resolve-craft §3.5
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


def glow(color, radius, layers=18, peak=0.6, inner=None):
    discs = VGroup()
    for i in range(layers):
        f = 1 - i / layers
        c = color if inner is None else interpolate_color(inner, color, f**0.8)
        discs.add(Circle(radius=radius * f, stroke_width=0)
                  .set_fill(c, opacity=peak / layers * (1.6 if i > layers * 0.7 else 1)))
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
    d = 0.07
    core = VGroup(
        nucleon(CYAN).shift(UP * d), nucleon(WHITE_T).shift(RIGHT * d),
        nucleon(CYAN).shift(DOWN * d), nucleon(WHITE_T).shift(LEFT * d),
    )
    return VGroup(glow(CYAN, 0.42, layers=12, peak=0.55), core)


def carbon_core():
    pts = [ORIGIN] + [0.13 * np.array([np.cos(a), np.sin(a), 0]) for a in np.arange(6) * TAU / 6]
    pts += [0.235 * np.array([np.cos(a), np.sin(a), 0]) for a in (np.arange(5) * TAU / 5 + 0.3)]
    cols = [CYAN, WHITE_T] * 6
    return VGroup(*[nucleon(c, r=0.085).move_to(p) for c, p in zip(cols, pts)])


def isotope(mass, sym, size, weight=MEDIUM):
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


def safe_text(t, max_w):
    if t.width > max_w:
        t.scale_to_fit_width(max_w)
    return t


class StarForgeA(MovingCameraScene):
    def construct(self):
        self.beats = {}
        with register_font(str(FONTS / "SpaceGrotesk-wght.ttf")), \
             register_font(str(FONTS / "JetBrainsMono-wght.ttf")):
            self.build()
        self.mark("end")
        out = Path(os.environ.get("BEATS_OUT", HERE / f"beats-{ASPECT}.json"))
        out.write_text(json.dumps({"fps": 30, "aspect": ASPECT,
                                   "beats": {k: round(v, 4) for k, v in self.beats.items()}}, indent=1))

    def mark(self, name):
        self.beats[name] = float(self.renderer.time)

    def build(self):
        frame = self.camera.frame
        FW, FH = config.frame_width, config.frame_height
        P = np.array([1.0, -6.0, 0]) if PORTRAIT else np.array([4.2, -1.2, 0])

        neb = VGroup(
            nebula(MAGENTA, FW * 0.55, FH * 0.35).move_to([-FW * 0.35, FH * 0.32, 0]),
            nebula(VIOLET, FW * 0.7, FH * 0.4).move_to(P + np.array([FW * 0.1, -FH * 0.05, 0])),
            nebula(BLUE_N, FW * 0.6, FH * 0.45, peak=0.22).move_to([FW * 0.4, FH * 0.1, 0]),
            nebula(MAGENTA, FW * 0.4, FH * 0.3, peak=0.12).move_to(P + np.array([-FW * 0.3, -FH * 0.2, 0])),
            nebula(BLUE_N, FW * 0.5, FH * 0.3, peak=0.18).move_to([-FW * 0.3, -FH * 0.35, 0]),
        )
        stars = starfield(FW * 2.2, FH * 2.2, 260)
        self.add(neb, stars)

        # ---- Beat 1: star core fades up (Resolve adds the 1 s fade from black), slow push-in
        star = VGroup(
            glow(ORANGE, 2.7 if not PORTRAIT else 2.4, layers=70, peak=2.6, inner=ManimColor("#ffe2a8")),
            glow(WHITE_T, 0.9, layers=30, peak=2.0),
        )
        breath = ValueTracker(0)
        star.base = star.copy()
        star.add_updater(lambda m: m.become(
            star.base.copy().scale(1 + 0.025 * np.sin(breath.get_value() * TAU / 3.0))))
        self.add(breath)
        breath.add_updater(lambda v, dt: v.increment_value(dt))
        self.mark("star")
        self.play(FadeIn(star, scale=0.9), frame.animate.scale(0.86), run_time=2.2, rate_func=smooth)

        # ---- Beat 2: three ⁴He appear ONE AT A TIME, then spiral in together; labels follow
        # start inside the pushed-in frame (an ellipse), so each entrance is seen
        rx, ry = (2.5, 3.6) if PORTRAIT else (3.9, 2.35)
        ang = [PI / 2 + k * TAU / 3 for k in range(3)]
        ends = [0.6 * np.array([np.cos(a), np.sin(a), 0]) for a in ang]
        starts = [np.array([rx * np.cos(a + 0.55), ry * np.sin(a + 0.55), 0]) for a in ang]
        hes, labels = VGroup(), VGroup()
        for s in starts:
            he = helium().move_to(s)
            lab = isotope("4", "He", 32)
            lab.add_updater(lambda m, he=he: m.next_to(he[1], UR, buff=0.12))
            hes.add(he)
            labels.add(lab)
        self.mark("he_in")
        self.play(LaggedStart(*[FadeIn(VGroup(h, l), scale=0.6) for h, l in zip(hes, labels)],
                              lag_ratio=0.55), run_time=1.3)
        self.mark("drift")
        self.play(
            *[h.animate(path_arc=-35 * DEGREES).move_to(e) for h, e in zip(hes, ends)],
            frame.animate.scale(0.97),
            Succession(Wait(1.5), FadeOut(labels, run_time=0.5)),
            run_time=2.0, rate_func=smooth,
        )
        # stillness before the climax (0.3-0.75 s), then the final rush
        self.wait(0.35)
        self.mark("rush")
        self.play(*[h.animate.move_to(ORIGIN) for h in hes], run_time=0.4, rate_func=rate_functions.ease_in_quad)
        self.mark("contact")  # Resolve cuts here and puts its one flash transition on the cut

        # ---- Beat 3: geometry first (merge into ¹²C), then algebra (equation writes on)
        c_nuc = VGroup(glow(CYAN, 0.8, layers=16, peak=0.7), carbon_core())
        c_label = isotope("12", "C", 38)
        c_label.add_updater(lambda m: m.next_to(c_nuc[1], UR, buff=0.14))
        eq = equation(64 if PORTRAIT else 56)
        eq.move_to([0, -FH * (0.19 if PORTRAIT else 0.267), 0])
        he_dots = VGroup(*[n for h in hes for n in h[1]])
        flash = glow(WHITE_T, 0.5, layers=20, peak=1.6)
        self.add(flash)
        self.play(
            flash.animate(rate_func=rate_functions.ease_out_cubic).scale(5).set_opacity(0),
            ReplacementTransform(he_dots, c_nuc[1]),
            FadeOut(VGroup(*[h[0] for h in hes])),
            FadeIn(c_nuc[0], scale=0.4),
            Succession(Wait(0.5), FadeIn(c_label, run_time=0.5)),
            run_time=1.0,
        )
        self.remove(flash)
        self.add(c_nuc, c_label)
        self.mark("eq_write")
        self.play(Write(VGroup(eq[0], eq[1], eq[2])), run_time=1.2, rate_func=linear)
        self.play(TransformFromCopy(c_label, eq[3], path_arc=-40 * DEGREES), run_time=0.8)
        self.mark("eq_hold")
        self.wait(2.0)

        # ---- Beat 4: silent calm pull-back; the star shrinks to a point, carbon drifts out; cell
        self.mark("pullback")
        star.clear_updaters()
        mid = P * 0.55
        end_w = FW * (1.05 if PORTRAIT else 1.0)
        self.play(
            frame.animate.set(width=end_w).move_to(mid),
            star.animate.scale(0.035).set_opacity(0.9),
            c_nuc.animate.move_to(P),
            Succession(FadeOut(eq, run_time=0.6), Wait(1.8)),
            run_time=2.4, rate_func=ease_in_out_sine,
        )
        cell = self.membrane(P)
        self.mark("cell")
        self.play(Create(cell[2]), FadeIn(cell[0]), FadeIn(cell[1]), run_time=0.8, rate_func=smooth)

        # ---- Beat 5: nucleus FadeTransforms into the letter C, then four valence dots, one at a time
        C = Text("C", font=MONO, font_size=150, color=WHITE_T, weight=BOLD).move_to(P)
        c_label.clear_updaters()
        self.mark("morph")
        self.play(
            FadeTransform(c_nuc[1], C),
            FadeOut(c_nuc[0], scale=1.5),
            FadeOut(c_label, run_time=0.4),
            frame.animate.move_to(P + (UP * 0.9 if PORTRAIT else UP * 0.35)),
            run_time=1.2, rate_func=smooth,
        )
        self.remove(c_nuc)
        self.wait(0.2)
        d = 0.9
        vdots = VGroup(*[
            VGroup(glow(CYAN, 0.16, layers=8, peak=0.7), Dot(radius=0.085, color=CYAN)).move_to(P + v * d)
            for v in (UP, RIGHT, DOWN, LEFT)
        ])
        for k, v in enumerate(vdots):
            self.mark(f"dot{k + 1}")
            self.play(GrowFromCenter(v), run_time=0.25, rate_func=rate_functions.ease_out_cubic)
            self.wait(0.12)
        self.wait(0.7)

        # ---- Beat 6: the atom rises, the star-line card writes on, long hold (poster frame)
        atom = VGroup(C, vdots)
        fc = frame.get_center()
        fh = frame.height
        maxw = frame.width - 1.2
        if PORTRAIT:
            atom_target = fc + UP * fh * 0.2
            card = self.card(["Every carbon atom", "in you was forged", "in a star."],
                             ["Organic chemistry is what", "that carbon learned to do next."],
                             big=50, small=34, maxw=maxw)
            card.move_to(fc + DOWN * fh * 0.12)
        else:
            atom_target = fc + UP * fh * 0.2
            card = self.card(["Every carbon atom in you was forged in a star."],
                             ["Organic chemistry is what that carbon learned to do next."],
                             big=46, small=30, maxw=maxw)
            card.move_to(fc + DOWN * fh * 0.2)
        self.mark("rise")
        self.play(atom.animate.scale(0.8).move_to(atom_target), FadeOut(cell), run_time=0.9, rate_func=smooth)
        self.mark("card")
        self.play(Write(card[0]), run_time=2.0, rate_func=linear)
        self.mark("card2")
        self.play(FadeIn(card[1], shift=UP * 0.1), run_time=0.7)
        self.mark("hold")
        self.wait(3.2)

    def membrane(self, center):
        a, b = (1.9, 1.5) if PORTRAIT else (2.1, 1.45)

        def pt(t):
            r = 1 + 0.025 * np.sin(2 * t + 0.6) + 0.015 * np.sin(3 * t + 1.3)
            return center + np.array([a * r * np.cos(t), b * r * np.sin(t), 0])

        outline = ParametricFunction(pt, t_range=[0, TAU], stroke_color=CYAN, stroke_width=3, stroke_opacity=0.55)
        halo = outline.copy().set_stroke(CYAN, width=14, opacity=0.12)
        fill = outline.copy().set_stroke(width=0).set_fill(CYAN, opacity=0.06)
        return VGroup(fill, halo, outline)

    def card(self, big_lines, small_lines, big, small, maxw):
        b = VGroup(*[Text(s, font=SANS, font_size=big, weight=BOLD, color=WHITE_T) for s in big_lines])
        b.arrange(DOWN, buff=0.18)
        s = VGroup(*[Text(t, font=SANS, font_size=small, color=MUTED) for t in small_lines])
        s.arrange(DOWN, buff=0.14)
        g = VGroup(b, s).arrange(DOWN, buff=0.45)
        return safe_text(g, maxw)
