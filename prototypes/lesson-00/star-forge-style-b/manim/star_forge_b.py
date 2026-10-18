"""PROTOTYPE (throwaway): `star-forge`, Style B "Punchy Short" (9:16 first). Manim CE 0.22.

One continuous 12.0 s loop (360 frames at 30 fps, 120 BPM = 15 frames per beat). Every beat lands on
the music grid; the gaps between visual changes are deliberately uneven. See ../STYLE.md.

  f   0  star at full brightness + hook line on screen (no fade-up); slow push-in
  f  45  three 4He nuclei snap in (expo-out, 100 ms stagger)
  f  66  near-stillness before the climax (nuclei creep, labels leave)
  f  90  FUSION: flash, merge into 12C, 1.09 punch-in (the edit adds a white dip here)
  f 120  "3 4He -> 12C" lands
  f 180  pull-back (one move); star shrinks to a point; cell draws round the carbon
  f 210  carbon -> letter C;  f 225.. four valence dots, 4 frames apart
  f 240  C lifts, star-line card lands
  f 342  loop: card leaves, camera dives back into the star; hook returns. Frame 359 + 1 == frame 0.

ASPECT env var: "9x16" (primary) or "16x9". Framing via frame_width/frame_height, never just -r.
"""

import os
from pathlib import Path

import numpy as np
from manim import *  # noqa: F403
from manim.utils.rate_functions import ease_in_out_cubic, ease_in_out_sine, ease_in_quad, ease_out_back, ease_out_cubic, ease_out_expo

HERE = Path(__file__).resolve().parent
FONTS = HERE.parent / "fonts"
ASPECT = os.environ.get("ASPECT", "9x16")
PORTRAIT = ASPECT == "9x16"
FPS = 30

if PORTRAIT:
    config.pixel_width, config.pixel_height = 1080, 1920
    config.frame_width = 8.0
    config.frame_height = 8.0 * 1920 / 1080
else:
    config.pixel_width, config.pixel_height = 1920, 1080
    config.frame_height = 8.0
    config.frame_width = 8.0 * 1920 / 1080
config.frame_rate = FPS
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


def rt(frames):
    """run_time that renders exactly `frames` frames (Manim uses np.arange(0, run_time, 1/fps))."""
    return (frames - 0.5) / FPS


# ---- building blocks (from ../../star-forge-manim/star_forge.py) ----------------
def win(n, a, b, rf=smooth):
    """Rate func for a play of n frames that runs rf only between frames a and b (holds 0 before, 1 after)."""
    T = n - 0.5
    return lambda t: rf(min(1.0, max(0.0, (t * T - a) / (b - a))))


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


def fit(mob, max_w):
    if mob.width > max_w:
        mob.scale_to_fit_width(max_w)
    return mob


class StarForgeB(MovingCameraScene):
    def construct(self):
        with register_font(str(FONTS / "SpaceGrotesk-wght.ttf")), register_font(str(FONTS / "JetBrainsMono-wght.ttf")):
            self.build()

    def beat(self, frames, *anims):
        """Play `anims` for exactly `frames` frames and keep the running frame count honest."""
        if anims:
            self.play(*anims, run_time=rt(frames))
        else:
            self.play(Wait(run_time=rt(frames)))
        self.f += frames

    def build(self):
        self.f = 0
        frame = self.camera.frame
        FW, FH = config.frame_width, config.frame_height
        # a ticking updater keeps every Wait on the "animated" path, so frame counts stay exact
        tick = ValueTracker(0).add_updater(lambda v, dt: v.increment_value(dt))
        self.add(tick)

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

        # ---- frame 0: the best frame. Star at full brightness, hook already on screen.
        star = VGroup(
            glow(ORANGE, 2.9 if PORTRAIT else 2.7, layers=70, peak=2.6, inner=ManimColor("#ffe2a8")),
            glow(WHITE_T, 0.9, layers=30, peak=2.0),
        )
        star.save_state()
        if PORTRAIT:
            hook = VGroup(Text("Where did your", font=SANS, font_size=64, weight=BOLD, color=WHITE_T),
                          Text("carbon come from?", font=SANS, font_size=64, weight=BOLD, color=WHITE_T)
                          ).arrange(DOWN, buff=0.16)
            fit(hook, 6.4).move_to(UP * 4.05)
        else:
            hook = Text("Where did your carbon come from?", font=SANS, font_size=56, weight=BOLD, color=WHITE_T)
            fit(hook, 11.5).move_to(UP * 2.75)
        # dark under-glow so white type keeps >= 4.5:1 over the bright nebula and star halo
        hook_shadow = hook.copy().set_fill(SPACE, opacity=0.55).set_stroke(SPACE, width=10, opacity=0.35).shift(DOWN * 0.03)
        hook_g = VGroup(hook_shadow, hook)
        hook_g.save_state()
        self.add(star, hook_g)
        frame.save_state()
        W0 = frame.width

        # ---- f0-45 (1.5 s): slow push-in, the hook reads
        self.beat(45, frame.animate(rate_func=linear).set(width=W0 * 0.965))

        # ---- f45-66: three 4He snap in from off-frame, 100 ms stagger, expo-out arrival
        R0 = FH * 0.62 if PORTRAIT else FW * 0.46
        angs = [PI + 0.25, -0.2, -PI / 2 - 0.3]   # from the left, right and below: nothing crosses the hook
        hes, labels = VGroup(), VGroup()
        for a in angs:
            he = helium().move_to(R0 * np.array([np.cos(a), np.sin(a), 0]))
            lab = isotope("4", "He", 34)
            lab.add_updater(lambda m, he=he: m.next_to(he[1], UR, buff=0.1))
            hes.add(he)
            labels.add(lab)
        self.add(hes, labels)
        near = [1.05 * np.array([np.cos(a - 0.35), np.sin(a - 0.35), 0]) for a in angs]
        self.beat(21,
                  LaggedStart(*[h.animate(rate_func=ease_out_expo).move_to(n) for h, n in zip(hes, near)],
                              lag_ratio=0.17),
                  frame.animate(rate_func=linear).set(width=W0 * 0.955))
        # ---- f66-87: stillness before the climax: a slow creep, labels leave
        close = [0.42 * np.array([np.cos(a - 0.9), np.sin(a - 0.9), 0]) for a in angs]
        self.beat(21,
                  *[h.animate(rate_func=ease_in_out_sine).move_to(c) for h, c in zip(hes, close)],
                  FadeOut(labels, rate_func=ease_out_cubic),
                  frame.animate(rate_func=linear).set(width=W0 * 0.948))
        self.remove(labels)
        # ---- f87-90: snap together (ease-in), contact on f90
        self.beat(3, *[h.animate(rate_func=ease_in_quad).move_to(ORIGIN) for h in hes])

        # ---- f90: FUSION. flash, merge into 12C, punch-in 1.09 (spring-like, no bounce)
        c_nuc = VGroup(glow(CYAN, 0.8, layers=16, peak=0.7), carbon_core())
        he_dots = VGroup(*[n for h in hes for n in h[1]])
        flash = glow(WHITE_T, 0.55, layers=20, peak=2.2)
        self.add(flash)
        Wp = frame.width / 1.09
        self.beat(15,
                  flash.animate(rate_func=ease_out_cubic).scale(6).set_opacity(0),
                  ReplacementTransform(he_dots, c_nuc[1], rate_func=ease_out_expo),
                  FadeOut(VGroup(*[h[0] for h in hes])),
                  FadeIn(c_nuc[0], scale=0.4, rate_func=ease_out_expo),
                  FadeOut(hook_g, rate_func=ease_out_cubic),
                  frame.animate(rate_func=ease_out_expo).set(width=Wp))
        self.remove(flash, hook_g)
        self.add(c_nuc)
        c_label = isotope("12", "C", 42)
        c_label.add_updater(lambda m: m.next_to(c_nuc[1], UR, buff=0.12))
        # f105-120: 12C label lands
        self.beat(15, FadeIn(c_label, shift=DOWN * 0.12, rate_func=ease_out_expo))

        # ---- f120: "3 4He -> 12C" lands (scale-down + fade, expo-out, 450 ms), holds to f180
        eq = equation(64 if PORTRAIT else 58)
        fit(eq, 6.0 if PORTRAIT else 9.0)
        eq.move_to(DOWN * (3.4 if PORTRAIT else 2.3))
        self.beat(14, FadeIn(eq, scale=1.18, rate_func=ease_out_expo))
        self.beat(46)

        # ---- f180-210: pull-back in one move; star -> point; carbon drifts out; cell draws in
        mid = P * 0.55
        end_w = FW * (1.05 if PORTRAIT else 1.0)
        cell = self.membrane(P)
        self.beat(30,
                  frame.animate(rate_func=ease_in_out_cubic).set(width=end_w).move_to(mid),
                  star.animate(rate_func=ease_in_out_cubic).scale(0.05),   # keep the glow profile: a soft point, not a disc
                  c_nuc.animate(rate_func=ease_in_out_cubic).move_to(P),
                  FadeOut(eq, rate_func=win(30, 0, 7, ease_in_quad)),
                  Create(cell[2], rate_func=win(30, 15, 29.5, ease_out_cubic)),
                  FadeIn(VGroup(cell[0], cell[1]), rate_func=win(30, 20, 29.5, ease_out_cubic)))
        # ---- f210-225: nucleus -> C (collapse to a disc, disc -> glyph); camera settles on it
        C = Text("C", font=MONO, font_size=150, color=WHITE_T, weight=BOLD).move_to(P)
        c_label.clear_updaters()
        disc = Circle(radius=0.27, stroke_width=0).set_fill(WHITE_T, opacity=1).move_to(c_nuc[1]).set_z_index(1)
        collapse = AnimationGroup(*[n.animate.move_to(disc.get_center()).scale(0.4) for n in c_nuc[1]],
                                  FadeIn(disc, scale=0.5), run_time=rt(6), rate_func=ease_in_quad)
        morph = Succession(collapse, AnimationGroup(Transform(disc, C, rate_func=ease_out_cubic),
                                                    FadeOut(c_nuc[1], run_time=0.05), run_time=rt(9)))
        cam_focus = P + (UP * 0.9 if PORTRAIT else UP * 0.35)
        self.beat(15, morph, FadeOut(c_nuc[0], scale=1.4), FadeOut(c_label, rate_func=win(15, 0, 5)),
                  frame.animate(rate_func=ease_out_cubic).move_to(cam_focus))
        self.remove(morph.mobject, c_nuc, disc, *c_nuc[1])
        self.add(C)
        # ---- f225-240: four valence dots, 4 frames (133 ms) apart: 400 ms total stagger
        d = 0.9
        vdots = VGroup(*[VGroup(glow(CYAN, 0.16, layers=8, peak=0.7), Dot(radius=0.085, color=CYAN)).move_to(P + v * d)
                         for v in (UP, RIGHT, DOWN, LEFT)])
        for k, v in enumerate(vdots):
            v.save_state()
            v.scale(0.01)
        self.add(vdots)
        self.beat(15, *[Restore(v, rate_func=win(15, 4 * k, 4 * k + 5, ease_out_back))
                        for k, v in enumerate(vdots)])

        # ---- f240: C lifts, card lands line by line (expo-out, 120 ms stagger)
        atom = VGroup(C, vdots)
        fc, fh = frame.get_center(), frame.height
        if PORTRAIT:
            card = self.card(["Every carbon atom", "in you was forged", "in a star."],
                             ["Organic chemistry is what", "that carbon learned", "to do next."], big=56, small=38, w=6.1)  # <= 824 px: clears the right 120 px rail
            atom_target = fc + UP * fh * 0.21
            card.move_to(fc + DOWN * fh * 0.1)
        else:
            card = self.card(["Every carbon atom in you was forged in a star."],
                             ["Organic chemistry is what that carbon learned to do next."], big=54, small=36, w=11.8)
            atom_target = fc + UP * fh * 0.2
            card.move_to(fc + DOWN * fh * 0.2)
        lines = [*card[0], *card[1]]
        self.beat(9, atom.animate(rate_func=ease_out_expo).scale(0.8).move_to(atom_target),
                  FadeOut(cell, rate_func=ease_out_cubic))
        self.beat(21, LaggedStart(*[FadeIn(l, shift=UP * 0.3, rate_func=ease_out_expo) for l in lines], lag_ratio=0.22))
        # hold the answer (2.4 s): f270-342
        self.beat(72)

        # ---- f342-360: loop seam. Card + atom exit (75% of the entry), camera dives back into the star,
        # the star blooms back to full, the hook returns. Frame 360 would be frame 0 exactly.
        self.beat(18,
                  FadeOut(VGroup(card, atom), rate_func=win(18, 0, 5, ease_in_quad)),
                  Restore(frame, rate_func=ease_out_cubic),
                  Restore(star, rate_func=ease_out_cubic),
                  FadeIn(hook_g, rate_func=win(18, 6, 17.5, ease_out_cubic)))
        assert self.f == 360, self.f

    def membrane(self, center):
        a, b = (1.9, 1.5) if PORTRAIT else (2.1, 1.45)

        def pt(t):
            r = 1 + 0.025 * np.sin(2 * t + 0.6) + 0.015 * np.sin(3 * t + 1.3)
            return center + np.array([a * r * np.cos(t), b * r * np.sin(t), 0])

        outline = ParametricFunction(pt, t_range=[0, TAU], stroke_color=CYAN, stroke_width=3, stroke_opacity=0.6)
        halo = outline.copy().set_stroke(CYAN, width=14, opacity=0.12)
        fill = outline.copy().set_stroke(width=0).set_fill(CYAN, opacity=0.06)
        return VGroup(fill, halo, outline)

    def card(self, big_lines, small_lines, big, small, w):
        b = VGroup(*[Text(s, font=SANS, font_size=big, weight=BOLD, color=WHITE_T) for s in big_lines]).arrange(DOWN, buff=0.16)
        s = VGroup(*[Text(t, font=SANS, font_size=small, color=MUTED) for t in small_lines]).arrange(DOWN, buff=0.13)
        g = VGroup(b, s).arrange(DOWN, buff=0.42)
        sc = min(1.0, w / g.width)
        g.scale(sc)
        return g
