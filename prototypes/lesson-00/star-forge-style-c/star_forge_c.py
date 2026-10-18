"""PROTOTYPE: `star-forge`, Style C "Cinematic Trailer", Manim CE half. Throwaway, for side-by-side comparison.

Derived from ../star-forge-manim/star_forge.py (cut 4). What changes for style C (rules cited in STYLE.md):
- one slow, continuous push-in across the star and the approach (camera updater, ease-in-out sine, 5 s);
  no idle "breathing" on the star: the push is the motion
- the three 4He drift in on a gentle spiral and DECELERATE to a hover just short of contact, hold
  ~0.5 s nearly still, then rush in over 0.2 s: the contact frame is the section cut s2|s3
- impact: white flash + an expanding shock ring, and the camera gives a little under the hit
- the card arrives on an inverse zoom-through (exit 1 -> 0.8 with power-in, cut, entry 1.25 -> 1 with
  expo-out). Resolve adds the blur over the seam.
- 16:9 is composed for a 2.39:1 letterbox (Resolve adds the bars); 9:16 is not letterboxed.
Timing lives in timing.py (shared with the sound design and the Lua). ASPECT env var = 16x9 | 9x16.
"""

import os
import sys
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403  (idiomatic Manim)
from manim.utils.rate_functions import ease_in_out_sine, ease_out_cubic, ease_out_expo, rush_into

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import timing as T  # noqa: E402

ASPECT = os.environ.get("ASPECT", "16x9")
PORTRAIT = ASPECT == "9x16"

if PORTRAIT:
    config.pixel_width, config.pixel_height = 1080, 1920
    config.frame_width = 8.0
    config.frame_height = 8.0 * 1920 / 1080
else:
    config.pixel_width, config.pixel_height = 1920, 1080
    config.frame_height = 8.0
    config.frame_width = 8.0 * 1920 / 1080
config.frame_rate = T.FPS
config.background_color = "#0d0626"
LETTERBOX = 0.0 if PORTRAIT else (1 - 1920 / 2.39 / 1080) / 2  # fraction of height under each bar

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


def secs(frames):
    return frames / T.FPS


# ---- building blocks (as cut 4) --------------------------------------------
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
    core = VGroup(nucleon(CYAN).shift(UP * d), nucleon(WHITE_T).shift(RIGHT * d),
                  nucleon(CYAN).shift(DOWN * d), nucleon(WHITE_T).shift(LEFT * d))
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


class StarForgeC(MovingCameraScene):
    def construct(self):
        with register_font(str(HERE / "fonts" / "SpaceGrotesk-wght.ttf")), \
             register_font(str(HERE / "fonts" / "JetBrainsMono-wght.ttf")):
            self.build()

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

        # ---- one continuous, weighty push-in from frame 0 to the end of the hover (no idle wobble)
        W0 = frame.width
        PUSH_END = secs(T.HOVER[1])
        clock = {"t": 0.0}

        def push(m, dt):
            clock["t"] += dt
            m.set(width=W0 * (1 - 0.20 * ease_in_out_sine(min(clock["t"] / PUSH_END, 1.0))))

        frame.add_updater(push)
        self.add(frame)

        # ---- s1 (M 0-60): the star kindles out of the dark
        star = VGroup(
            glow(ORANGE, 2.7 if not PORTRAIT else 2.4, layers=70, peak=2.6, inner=ManimColor("#ffe2a8")),
            glow(WHITE_T, 0.9, layers=30, peak=2.0),
        )
        self.next_section("s1-star")
        self.play(FadeIn(star, scale=0.9), run_time=secs(T.STAR_IN[1] - T.STAR_IN[0]), rate_func=ease_in_out_sine)

        # ---- s2 (M 60-156): three 4He spiral in, decelerate, HOVER nearly still, then rush into contact
        R0 = FH * 0.40 if PORTRAIT else FW * 0.36
        R_HOVER, R_CREEP = 0.95, 0.84  # hover at the white core's rim, so the nuclei read against orange
        angles = [PI / 2, PI / 2 + TAU / 3, PI / 2 + 2 * TAU / 3]
        u = ValueTracker(0.0)    # 0..1 drift, 1..2 hover, 2..3 snap
        fade = ValueTracker(0.0)  # entrance, 0..1 over HE_IN
        lab_a = ValueTracker(1.0)

        def pos(k):
            v, a = u.get_value(), angles[k]
            if v <= 1:
                rr, th = R0 + (R_HOVER - R0) * v, a + 0.6 * (1 - v)
            elif v <= 2:
                rr, th = R_HOVER + (R_CREEP - R_HOVER) * (v - 1), a - 0.03 * (v - 1)
            else:
                rr, th = R_CREEP * (3 - v), a - 0.03 - 0.06 * (v - 2)
            return rr * np.array([np.cos(th), np.sin(th), 0])

        def alpha(k):
            x = np.clip((fade.get_value() - k * 0.18) / 0.64, 0, 1)
            return float(smooth(x))

        hes, labels = VGroup(), VGroup()
        for k in range(3):
            he = helium()
            he.base = he.copy()
            he.add_updater(lambda m, k=k: m.become(m.base.copy().fade(1 - alpha(k)).move_to(pos(k))))
            lab = isotope("4", "He", 30)
            lab.add_updater(lambda m, k=k, he=he: m.next_to(he[1], UR, buff=0.12)
                            .set_opacity(alpha(k) * lab_a.get_value()))
            hes.add(he)
            labels.add(lab)
        self.add(u, fade, lab_a, hes, labels)
        hes.update(); labels.update()
        self.next_section("s2-approach")
        self.play(
            u.animate(run_time=secs(T.DRIFT[1] - T.DRIFT[0]), rate_func=ease_out_cubic).set_value(1.0),
            fade.animate(run_time=secs(T.HE_IN[1] - T.HE_IN[0]), rate_func=linear).set_value(1.0),
            Succession(Wait(secs(T.DRIFT[1] - T.DRIFT[0]) - 0.5), lab_a.animate(run_time=0.5).set_value(0.0)),
        )
        self.play(u.animate.set_value(2.0), run_time=secs(T.HOVER[1] - T.HOVER[0]), rate_func=linear)
        frame.remove_updater(push)
        self.play(u.animate.set_value(3.0), run_time=secs(T.SNAP[1] - T.SNAP[0]), rate_func=rush_into)
        for m in (*hes, *labels):
            m.clear_updaters()
        self.remove(labels)

        # ---- s3 (M 156-231): FLASH. Merge into 12C, shock ring, camera gives a little; equation writes on
        c_nuc = VGroup(glow(CYAN, 0.8, layers=16, peak=0.7), carbon_core())
        c_label = isotope("12", "C", 36)
        c_label.add_updater(lambda m: m.next_to(c_nuc[1], UR, buff=0.14))
        if PORTRAIT:
            eq = equation(60).move_to([0, -3.3, 0])
        else:
            eq = equation(52).move_to([0, -1.78, 0])  # inside the 2.39:1 letterbox
        he_dots = VGroup(*[n for h in hes for n in h[1]])
        flash = glow(WHITE_T, 0.5, layers=20, peak=2.0)
        ring = Circle(radius=0.35, stroke_color=ManimColor("#ffe2a8"), stroke_width=6, stroke_opacity=0.9)
        self.next_section("s3-fuse")
        self.add(flash, ring)
        fuse_len = secs(T.EQ_WRITE[1] - T.IMPACT)
        self.play(
            flash.animate(rate_func=ease_out_cubic, run_time=0.8).scale(4).set_opacity(0),
            ring.animate(rate_func=ease_out_cubic, run_time=0.9).scale(9).set_stroke(width=1, opacity=0),
            ReplacementTransform(he_dots, c_nuc[1], run_time=1.2),
            FadeOut(VGroup(*[h[0] for h in hes]), run_time=0.6),
            FadeIn(c_nuc[0], scale=0.4, run_time=1.2),
            frame.animate(rate_func=ease_out_cubic, run_time=1.2).scale(1.025),
            Succession(Wait(secs(T.EQ_WRITE[0] - T.IMPACT)), Write(eq, run_time=secs(T.EQ_WRITE[1] - T.EQ_WRITE[0]))),
            Succession(Wait(secs(T.C_LABEL_IN[0] - T.IMPACT)), FadeIn(c_label, run_time=secs(T.C_LABEL_IN[1] - T.C_LABEL_IN[0]))),
        )
        assert abs(fuse_len - 1.7) < 1e-6
        self.remove(flash, ring)
        self.add(c_nuc, c_label)
        self.wait(secs(T.PULLBACK[0] - T.EQ_WRITE[1]))

        # ---- s4 (M 231-324): the slow pull-back. Star shrinks to a point, carbon drifts out; cell
        self.next_section("s4-pullback")
        mid = P * 0.55
        end_w = FW * (1.05 if PORTRAIT else 1.0)
        self.play(
            frame.animate.set(width=end_w).move_to(mid),
            star.animate.scale(0.035),  # (cut 4's set_opacity here flattened the glow into a hard disc)
            c_nuc.animate.move_to(P),
            Succession(FadeOut(eq, run_time=0.6), Wait(secs(T.PULLBACK[1] - T.PULLBACK[0]) - 0.6)),
            run_time=secs(T.PULLBACK[1] - T.PULLBACK[0]), rate_func=ease_in_out_sine,
        )
        cell = self.membrane(P)
        self.play(Create(cell), FadeIn(cell[0]), run_time=secs(T.CELL[1] - T.CELL[0]))

        # ---- s5 (M 324-375): nucleus -> C, four valence dots one at a time (no sound on the dots)
        self.next_section("s5-morph")
        C = Text("C", font=MONO, font_size=150, color=WHITE_T, weight=BOLD).move_to(P)
        c_label.clear_updaters()
        disc = Circle(radius=0.27, stroke_width=0).set_fill(WHITE_T, opacity=1).move_to(c_nuc[1]).set_z_index(1)
        collapse = AnimationGroup(
            *[n.animate.move_to(disc.get_center()).scale(0.4) for n in c_nuc[1]],
            FadeIn(disc, scale=0.5), run_time=0.3, rate_func=rate_functions.ease_in_quad)
        morph = Succession(collapse, AnimationGroup(
            Transform(disc, C, rate_func=ease_in_out_sine), FadeOut(c_nuc[1], run_time=0.1), run_time=0.4))
        self.play(
            morph, FadeOut(c_nuc[0], scale=1.4), FadeOut(c_label, run_time=0.3),
            frame.animate.move_to(P + (UP * 0.9 if PORTRAIT else UP * 0.35)),
            run_time=secs(T.MORPH[1] - T.MORPH[0]), rate_func=ease_in_out_sine,
        )
        self.remove(morph.mobject, c_nuc, disc, *c_nuc[1])
        self.add(C)
        d = 0.9
        vdots = VGroup(*[
            VGroup(glow(CYAN, 0.16, layers=8, peak=0.7), Dot(radius=0.085, color=CYAN)).move_to(P + v * d)
            for v in (UP, RIGHT, DOWN, LEFT)])
        self.play(Succession(*[GrowFromCenter(v, run_time=secs(6)) for v in vdots]),
                  run_time=secs(T.DOTS[1] - T.DOTS[0]))
        self.wait(secs(T.EXIT[0] - T.DOTS[1]))

        # ---- s6 (M 375-381): inverse zoom-through, exit leg: everything recedes 1 -> 0.8, accelerating
        self.next_section("s6-exit")
        fc = frame.get_center().copy()
        W_card = frame.width
        self.play(frame.animate.scale(1.25), run_time=secs(T.EXIT[1] - T.EXIT[0]), rate_func=rush_into)

        # ---- s7 (M 381-489): entry leg: the card composition LANDS 1.25 -> 1 (expo-out); hold
        self.remove(cell)
        atom = VGroup(C, vdots)
        fh = W_card * config.frame_height / config.frame_width
        if PORTRAIT:
            atom.scale(0.8).move_to(fc + UP * fh * 0.15)
            card = self.card(["Every carbon atom", "in you was forged", "in a star."],
                             ["Organic chemistry is what", "that carbon learned to do next."], big=48, small=32)
            card.move_to(fc + DOWN * fh * 0.09)
        else:
            atom.scale(0.72).move_to(fc + UP * 1.25)
            card = self.card(["Every carbon atom in you was forged in a star."],
                             ["Organic chemistry is what that carbon learned to do next."], big=44, small=30)
            if card.width > 0.82 * W_card:  # >= 80 px side margins at 1920 (remotion layout rule)
                card.scale_to_fit_width(0.82 * W_card)
            card.move_to(fc + DOWN * 0.8)
            vis = fh / 2 * (1 - 2 * LETTERBOX)
            top, bot = atom.get_top()[1] - fc[1], card.get_bottom()[1] - fc[1]
            assert top < vis - 0.25 and bot > -vis + 0.25, ("card outside the letterbox", top, bot, vis)
        self.next_section("s7-card")
        frame.set(width=W_card / 1.25).move_to(fc)
        self.add(card[0])
        self.play(frame.animate.set(width=W_card), run_time=secs(T.ARRIVE[1] - T.ARRIVE[0]), rate_func=ease_out_expo)
        self.wait(secs(T.SUB_IN[0] - T.ARRIVE[1]))
        self.play(FadeIn(card[1], shift=UP * 0.1), run_time=secs(T.SUB_IN[1] - T.SUB_IN[0]))
        self.wait(secs(T.TOTAL_M - T.SUB_IN[1]))  # final hold: the last frame is the poster frame

    def membrane(self, center):
        a, b = (1.9, 1.5) if PORTRAIT else (2.1, 1.45)

        def pt(t):
            r = 1 + 0.025 * np.sin(2 * t + 0.6) + 0.015 * np.sin(3 * t + 1.3)
            return center + np.array([a * r * np.cos(t), b * r * np.sin(t), 0])

        outline = ParametricFunction(pt, t_range=[0, TAU], stroke_color=CYAN, stroke_width=3, stroke_opacity=0.55)
        halo = outline.copy().set_stroke(CYAN, width=14, opacity=0.12)
        fill = outline.copy().set_stroke(width=0).set_fill(CYAN, opacity=0.06)
        return VGroup(fill, halo, outline)

    def card(self, big_lines, small_lines, big, small):
        b = VGroup(*[Text(s, font=SANS, font_size=big, weight=BOLD, color=WHITE_T) for s in big_lines])
        b.arrange(DOWN, buff=0.18)
        s = VGroup(*[Text(t, font=SANS, font_size=small, color=MUTED) for t in small_lines])
        s.arrange(DOWN, buff=0.14)
        return VGroup(b, s).arrange(DOWN, buff=0.4)
