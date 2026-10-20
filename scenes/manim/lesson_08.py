"""Lesson 8's watch-only Scenes (#86), Manim CE 0.22.0, plain text (no LaTeX), silent, 60 fps.

- BfThreeNhThreeSnap (`bf3-nh3-snap`, s01 reveal): flat BF₃ (boron's six electrons counted) and NH₃
  (lone pair on top) drift together; N's lone pair swings to B and becomes a N–B bond; BF₃ folds
  into a pyramid; N⁺ and B⁻ appear. Ends on the adduct with the new bond highlighted.
- MoFromOverlapH2 / MoFromOverlapEthylene (`mo-from-overlap-h2`, `-ethylene`; s02, s05): two
  atomic orbitals as 2D cross-sections with their sign marked. In phase they add between the
  nuclei and the level drops on a schematic ladder; out of phase they cancel in the middle, a
  node appears and the level rises. Ends on both results beside their levels.
- ArrowIsFlow (`arrow-is-flow`, s08, s15): two schematic ladders (NH₃, BF₃); an arrow from NH₃'s
  HOMO to BF₃'s LUMO; the ladders fold into Lewis drawings and the arrow becomes the curved arrow
  from N's lone pair to B; the caption writes on.

Schematic on purpose: no computed numbers (the ladders say "not to scale"); the only digits on
screen are electron counts. Sign is never colour alone: + lobes are solid cyan with a solid
outline, − lobes orange with a dashed outline, and each carries a "+" or "−". Every word comes from
the manifest's `text` (SCENE_PROPS). Render with `pnpm scenes:render <id>`, never by hand.
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
config.background_color = SPACE
MONO = "JetBrains Mono"
SANS = "Space Grotesk"
LINE = interpolate_color(MUTED, SPACE, 0.35)


def t(key: str, i: int = 0) -> str:
    return TEXT[key][i]


# ---- drawing pieces ---------------------------------------------------------


def label(s: str, size=30, color=INK, font=SANS) -> Text:
    return Text(s, font=font, font_size=size, color=color)


def atom(el: str, size=44) -> Text:
    return Text(el, font=MONO, font_size=size, weight=BOLD, color=INK)


def pair_dots(at: np.ndarray, along: np.ndarray, gap=0.16, r=0.055) -> VGroup:
    """Two cyan dots side by side across `along` (a lone pair)."""
    n = np.array([-along[1], along[0], 0.0])
    n = n / (np.linalg.norm(n) or 1)
    return VGroup(Dot(at + n * gap / 2, radius=r, color=CYAN), Dot(at - n * gap / 2, radius=r, color=CYAN))


def unit(v) -> np.ndarray:
    v = np.array(v, dtype=float)
    return v / np.linalg.norm(v)


def bond(a: np.ndarray, b: np.ndarray, trim=0.3, color=INK, width=5) -> Line:
    d = unit(b - a)
    return Line(a + d * trim, b - d * trim, color=color, stroke_width=width)


class Lewis(VGroup):
    """A centre atom with ligands at given directions; each ligand may carry lone pairs."""

    def __init__(self, centre_el, ligands, centre_lp=(), length=1.2, **kw):
        super().__init__(**kw)
        self.centre = atom(centre_el)
        self.add(self.centre)
        self.bonds, self.ligands, self.ligand_lp = VGroup(), VGroup(), VGroup()
        for el, d, lp in ligands:
            d = unit(d)
            pos = d * length
            letter = atom(el).move_to(pos)
            self.ligands.add(letter)
            self.bonds.add(bond(ORIGIN, pos))
            pairs = VGroup()
            for k in range(lp):
                ang = np.arctan2(d[1], d[0]) + (k - (lp - 1) / 2) * (PI / 2.2)
                u = np.array([np.cos(ang), np.sin(ang), 0.0])
                pairs.add(pair_dots(pos + u * 0.38, u))
            self.ligand_lp.add(pairs)
        self.lp = VGroup(*[pair_dots(unit(d) * 0.4, unit(d)) for d in centre_lp])
        self.add(self.bonds, self.ligands, self.ligand_lp, self.lp)


def bf3(length=1.25, open_side=RIGHT) -> Lewis:
    """BF₃ flat, its F's spread away from `open_side` (where a partner comes in)."""
    base = np.arctan2(open_side[1], open_side[0]) + PI
    return Lewis("B", [("F", (np.cos(base + a), np.sin(base + a), 0), 3) for a in (0, -2 * PI / 3, 2 * PI / 3)], length=length)


def nh3(lone=RIGHT) -> Lewis:
    """NH₃ drawn flat: the lone pair toward `lone`, three H's spread away from it."""
    base = np.arctan2(lone[1], lone[0]) + PI
    return Lewis("N", [("H", (np.cos(base + a), np.sin(base + a), 0), 0) for a in (-1.05, 0, 1.05)], centre_lp=[lone], length=1.0)


def lobe(width, height, sign, at=ORIGIN, mark=ORIGIN) -> VGroup:
    """One lobe of an orbital cross-section, its sign marked (+ solid cyan, − dashed orange)."""
    c = CYAN if sign > 0 else ORANGE
    body = Ellipse(width=width, height=height).set_fill(c, opacity=0.32).set_stroke(width=0).move_to(at)
    rim = Ellipse(width=width, height=height, color=c, stroke_width=4).move_to(at)
    if sign < 0:
        rim = DashedVMobject(rim, num_dashes=24)
    mark_ = mark
    mark = Text("+" if sign > 0 else "−", font=MONO, font_size=34, weight=BOLD, color=INK).move_to(np.array(at, dtype=float) + mark_)
    return VGroup(body, rim, mark)


def node_line(a, b) -> DashedLine:
    return DashedLine(a, b, dash_length=0.12, color=INK, stroke_width=3)


def nucleus(el: str, at) -> VGroup:
    return VGroup(Dot(at, radius=0.07, color=INK), Text(el, font=MONO, font_size=24, color=MUTED).next_to(at, DOWN, buff=0.12))


def half_arrow(at, up=True, h=0.42, color=CYAN) -> VMobject:
    """One electron as a half-arrow (↑ or ↓): the barb on one side only."""
    top, bottom = at + UP * h / 2, at + DOWN * h / 2
    tip = top if up else bottom
    back = DOWN * h * 0.32 if up else UP * h * 0.32
    return VGroup(Line(bottom, top, color=color, stroke_width=5), Line(tip, tip + back + LEFT * h * 0.22, color=color, stroke_width=5))


class Ladder(VGroup):
    """Schematic MO ladder: two atomic levels at the sides, a lower and a higher MO in the middle."""

    def __init__(self, centre, low_text, high_text, width=5.2, height=4.0, **kw):
        super().__init__(**kw)
        cx, cy = centre[0], centre[1]
        side = width / 2 - 0.45
        self.ao = VGroup(*[Line([cx + s * side - 0.4, cy, 0], [cx + s * side + 0.4, cy, 0], color=MUTED, stroke_width=5) for s in (-1, 1)])
        self.low_y, self.high_y = cy - height * 0.34, cy + height * 0.42
        self.low = Line([cx - 0.7, self.low_y, 0], [cx + 0.7, self.low_y, 0], color=INK, stroke_width=6)
        self.high = Line([cx - 0.7, self.high_y, 0], [cx + 0.7, self.high_y, 0], color=INK, stroke_width=6)
        self.ties_low = VGroup(*[DashedLine(self.ao[i].get_end() if i == 0 else self.ao[i].get_start(), self.low.get_start() if i == 0 else self.low.get_end(), color=LINE, stroke_width=3) for i in (0, 1)])
        self.ties_high = VGroup(*[DashedLine(self.ao[i].get_end() if i == 0 else self.ao[i].get_start(), self.high.get_start() if i == 0 else self.high.get_end(), color=LINE, stroke_width=3) for i in (0, 1)])
        self.low_label = label(low_text, 24, MUTED, MONO).next_to(self.low, DOWN, buff=0.14)
        self.high_label = label(high_text, 24, MUTED, MONO).next_to(self.high, UP, buff=0.14)
        self.scale_note = label(t("notToScale"), 20, MUTED).move_to([cx + width / 2 - 0.9, cy - height / 2 - 0.35, 0])
        self.energy = label(t("energy"), 20, MUTED).move_to([cx - width / 2 + 0.3, cy + height / 2 + 0.2, 0])
        self.add(self.ao, self.ties_low, self.ties_high, self.low, self.high, self.low_label, self.high_label, self.scale_note, self.energy)


class Base(Scene):
    def construct(self):
        with register_font(str(HERE / "fonts" / "SpaceGrotesk-wght.ttf")), register_font(str(HERE / "fonts" / "JetBrainsMono-wght.ttf")):
            self.build()
        out = os.environ.get("TIMINGS_OUT")
        if out:
            Path(out).write_text(json.dumps({}))  # no cited numbers on screen

    def now(self) -> float:
        return float(self.renderer.time)

    def hold(self):
        self.wait(max(1 / config.frame_rate, PROPS["duration"] - self.now()))  # the last frame is the poster

    def build(self):
        raise NotImplementedError


# ---- bf3-nh3-snap -------------------------------------------------------------


class BfThreeNhThreeSnap(Base):
    def build(self):
        s = 0.95 if PORTRAIT else 1.3
        b = bf3().scale(s).move_to(LEFT * (1.7 if PORTRAIT else 3.4))
        n = nh3(lone=LEFT).scale(s).move_to(RIGHT * (2.1 if PORTRAIT else 3.6))
        count = label(t("boronBefore"), 34, CYAN, MONO).next_to(b, DOWN, buff=0.5)
        name_b = label("BF₃", 34, MUTED, MONO).move_to(b.get_center() + UP * 2.0 * s)
        name_n = label("NH₃", 34, MUTED, MONO).move_to(n.get_center() + UP * 2.0 * s)
        self.play(FadeIn(b), FadeIn(n), FadeIn(name_b), FadeIn(name_n), run_time=0.8)
        self.play(Write(count), run_time=0.6)
        self.wait(0.6)

        # Drift together: N's lone pair turns toward boron.
        gap = 1.45 * s
        target_n = b.centre.get_center() + RIGHT * (gap + (n.get_center() - n.centre.get_center())[0])
        self.play(
            n.animate.move_to(target_n + (n.get_center() - n.centre.get_center()) * 0 + UP * 0.0),
            FadeOut(name_b), FadeOut(name_n),
            run_time=1.6, rate_func=ease_in_out_sine,
        )
        # The lone pair swings over to B and becomes the new N–B bond (highlighted).
        new_bond = Line(n.centre.get_center() + LEFT * 0.28 * s, b.centre.get_center() + RIGHT * 0.28 * s, color=CYAN, stroke_width=9)
        self.play(ReplacementTransform(n.lp, new_bond), run_time=1.0)
        # BF₃ folds into a pyramid: the three F's swing back, away from N.
        folded = []
        for k, a in enumerate((PI, 2.0, -2.0)):
            d = np.array([np.cos(a), np.sin(a), 0.0])
            folded.append(d)
        moves = []
        for k, d in enumerate(folded):
            pos = b.centre.get_center() + d * 1.25 * s
            moves.append(b.ligands[k].animate.move_to(pos))
            moves.append(Transform(b.bonds[k], bond(b.centre.get_center(), pos).scale(1)))
            shift = pos - b.ligands[k].get_center()
            moves.append(b.ligand_lp[k].animate.shift(shift))
        after = label(t("boronAfter"), 34, CYAN, MONO).move_to(count)
        self.play(*moves, Transform(count, after), run_time=1.1, rate_func=ease_in_out_sine)
        # Charges as letters beside the atoms (formal charge, Lesson 1).
        plus = label("+", 40, INK, MONO).move_to(n.centre.get_center() + np.array([-0.3, 0.42, 0]) * s)
        minus = label("−", 40, INK, MONO).move_to(b.centre.get_center() + np.array([0.32, 0.42, 0]) * s)
        self.play(FadeIn(plus, scale=1.4), FadeIn(minus, scale=1.4), run_time=0.6)
        caption = label(t("adduct"), 34, INK, MONO).to_edge(DOWN, buff=1.0 if PORTRAIT else 0.7)
        self.play(FadeIn(caption, shift=UP * 0.1), new_bond.animate.set_stroke(width=11), run_time=0.6)
        self.hold()


# ---- mo-from-overlap --------------------------------------------------------------


def work_and_ladder():
    """Where the orbitals are built and where the ladder sits, per aspect."""
    if PORTRAIT:
        return UP * 2.4, DOWN * 3.0, 6.6, 5.0
    return LEFT * 2.5, RIGHT * 3.7, 5.4, 5.2


class Overlap(Base):
    """The shared beats; subclasses say what the two atomic orbitals and the two results look like."""

    low_text = high_text = ""

    def atomic(self, sign_right: int) -> tuple[VGroup, VGroup]:
        raise NotImplementedError

    def bonding(self) -> VGroup:
        raise NotImplementedError

    def antibonding(self) -> VGroup:
        raise NotImplementedError

    def frame_atoms(self) -> VGroup:
        raise NotImplementedError

    def extra_end(self, ladder: Ladder):
        return []

    def build(self):
        work, lad_c, lad_w, lad_h = work_and_ladder()
        ladder = Ladder(lad_c, self.low_text, self.high_text, width=lad_w, height=lad_h)
        atoms = self.frame_atoms().move_to(work)
        # Where each result rests at the end: beside its level (landscape), or side by side above the ladder (portrait).
        small = 0.55 if PORTRAIT else 0.45
        if PORTRAIT:
            rest_low, rest_high = np.array([-1.9, 5.4, 0]), np.array([1.9, 5.4, 0])
        else:
            rest_low, rest_high = np.array([-5.6, ladder.low_y, 0]), np.array([-5.6, ladder.high_y, 0])

        def heading(key, colour):
            h = label(t(key), 30, colour)
            return h.next_to(atoms, DOWN, buff=1.3) if PORTRAIT else h.next_to(atoms, UP, buff=1.6)

        self.play(FadeIn(ladder.ao), FadeIn(ladder.energy), FadeIn(ladder.scale_note), FadeIn(atoms), run_time=0.5)

        # In phase: same sign on both sides.
        left, right = self.atomic(+1)
        VGroup(left, right).shift(work)
        title = heading("inPhase", CYAN)
        self.play(FadeIn(left), FadeIn(right), Write(title), run_time=0.7)
        bonded = self.bonding().move_to(work)
        self.play(ReplacementTransform(VGroup(left, right), bonded), run_time=1.1, rate_func=ease_in_out_sine)
        self.play(Create(ladder.ties_low), Create(ladder.low), FadeIn(ladder.low_label), run_time=0.8)
        self.wait(0.3)
        self.play(bonded.animate.scale(small).move_to(rest_low), FadeOut(title), run_time=0.6)

        # Out of phase: opposite signs.
        left, right = self.atomic(-1)
        VGroup(left, right).shift(work)
        title = heading("outOfPhase", ORANGE)
        self.play(FadeIn(left), FadeIn(right), Write(title), run_time=0.7)
        anti = self.antibonding().move_to(work)
        self.play(ReplacementTransform(VGroup(left, right), anti), run_time=1.1, rate_func=ease_in_out_sine)
        self.play(Create(ladder.ties_high), Create(ladder.high), FadeIn(ladder.high_label), run_time=0.8)
        self.wait(0.3)

        # Both results at rest: bonding lower, antibonding higher with its node.
        if PORTRAIT:
            end = [anti.animate.scale(small).move_to(rest_high), FadeOut(title), FadeOut(atoms)]
        else:
            # Landscape: both grow back into the emptied work area, each level with its picture.
            big = 0.8
            end = [
                anti.animate.scale(big).move_to([work[0], ladder.high_y, 0]),
                bonded.animate.scale(big / small).move_to([work[0], ladder.low_y, 0]),
                FadeOut(title), FadeOut(atoms),
            ]
        if PORTRAIT:
            tags = VGroup(
                label(self.low_text, 24, MUTED, MONO).move_to(rest_low + DOWN * 1.05),
                label(self.high_text, 24, MUTED, MONO).move_to(rest_high + DOWN * 1.05),
            )
            end.append(FadeIn(tags))
        self.play(*end, run_time=0.7)
        extra = self.extra_end(ladder)
        if extra:
            self.play(*[FadeIn(m) for m in extra], run_time=0.5)
        self.hold()


class MoFromOverlapH2(Overlap):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.low_text, self.high_text = t("sigma"), t("sigmaStar")

    def frame_atoms(self):
        return VGroup(nucleus("H", LEFT * 0.75), nucleus("H", RIGHT * 0.75))

    def atomic(self, sign_right):
        return lobe(1.7, 1.7, +1, LEFT * 0.75, UP * 0.45), lobe(1.7, 1.7, sign_right, RIGHT * 0.75, UP * 0.45)

    def bonding(self):
        return VGroup(lobe(3.4, 1.9, +1, ORIGIN, UP * 0.5), nucleus("H", LEFT * 0.75), nucleus("H", RIGHT * 0.75))

    def antibonding(self):
        node = node_line(UP * 1.1, DOWN * 1.1)
        tag = label(t("node"), 22, INK).next_to(node, UP, buff=0.08)
        return VGroup(lobe(1.45, 1.6, +1, LEFT * 0.9, UP * 0.45), lobe(1.45, 1.6, -1, RIGHT * 0.9, UP * 0.45), node, tag, nucleus("H", LEFT * 0.75), nucleus("H", RIGHT * 0.75))


class MoFromOverlapEthylene(Overlap):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.low_text, self.high_text = t("pi"), t("piStar")

    def frame_atoms(self):
        cc = Line(LEFT * 0.75, RIGHT * 0.75, color=MUTED, stroke_width=5)
        return VGroup(cc, nucleus("C", LEFT * 0.75), nucleus("C", RIGHT * 0.75))

    def p(self, x, sign):
        return VGroup(lobe(0.75, 1.15, sign, [x, 0.68, 0]), lobe(0.75, 1.15, -sign, [x, -0.68, 0]))

    def atomic(self, sign_right):
        return self.p(-1.15, +1), self.p(1.15, sign_right)

    def bonding(self):
        plane = node_line(LEFT * 2.0, RIGHT * 2.0)
        return VGroup(lobe(2.6, 1.0, +1, UP * 0.68), lobe(2.6, 1.0, -1, DOWN * 0.68), plane, self.frame_atoms())

    def antibonding(self):
        plane = node_line(LEFT * 2.0, RIGHT * 2.0)
        node = node_line(UP * 1.45, DOWN * 1.45)
        tag = label(t("node"), 22, INK).next_to(node, UP, buff=0.08)
        lobes = VGroup(*[lobe(0.95, 1.0, s, [x, y, 0]) for x, y, s in ((-0.78, 0.68, 1), (0.78, 0.68, -1), (-0.78, -0.68, -1), (0.78, -0.68, 1))])
        return VGroup(lobes, plane, node, tag, self.frame_atoms())

    def extra_end(self, ladder):
        """π holds ethylene's last pair: HOMO (filled); π* is empty: LUMO (empty)."""
        c = ladder.low.get_center()
        pair = VGroup(half_arrow(c + LEFT * 0.2 + UP * 0.22, True), half_arrow(c + RIGHT * 0.2 + UP * 0.22, False))
        homo = label(t("homo"), 22, CYAN).next_to(ladder.low, RIGHT, buff=0.2)
        lumo = label(t("lumo"), 22, MUTED).next_to(ladder.high, RIGHT, buff=0.2)
        if PORTRAIT:
            homo.next_to(ladder.low_label, DOWN, buff=0.1)
            lumo.next_to(ladder.high_label, UP, buff=0.1)
        return [pair, homo, lumo]


# ---- arrow-is-flow ------------------------------------------------------------------


class ArrowIsFlow(Base):
    def build(self):
        dx = 2.0 if PORTRAIT else 3.4
        y0 = 0.6 if PORTRAIT else 0.3

        def ladder(cx, homo_y, lumo_y, name):
            lumo = Line([cx - 0.8, lumo_y, 0], [cx + 0.8, lumo_y, 0], color=INK, stroke_width=6)
            homo = Line([cx - 0.8, homo_y, 0], [cx + 0.8, homo_y, 0], color=INK, stroke_width=6)
            pair = VGroup(half_arrow(homo.get_center() + LEFT * 0.2 + UP * 0.22, True), half_arrow(homo.get_center() + RIGHT * 0.2 + UP * 0.22, False))
            tags = VGroup(label(t("lumoShort"), 22, MUTED, MONO).next_to(lumo, UP, buff=0.1), label(t("homoShort"), 22, MUTED, MONO).next_to(homo, DOWN, buff=0.1))
            title = label(name, 32, INK, MONO).move_to([cx, y0 + 2.5, 0])
            return VGroup(lumo, homo, pair, tags, title), homo, lumo

        # Schematic: NH₃'s filled level high, BF₃'s empty level low; BF₃'s filled level far down.
        left, n_homo, _ = ladder(-dx, y0 - 0.2, y0 + 1.7, "NH₃")
        right, _, b_lumo = ladder(dx, y0 - 2.2, y0 + 0.5, "BF₃")
        note = label(t("notToScale"), 20, MUTED).to_corner(DR, buff=0.5)
        self.play(FadeIn(left), FadeIn(right), FadeIn(note), run_time=0.8)
        flow = CurvedArrow(n_homo.get_right() + RIGHT * 0.1, b_lumo.get_left() + LEFT * 0.1, angle=-PI / 4, color=CYAN, stroke_width=7)
        self.play(Create(flow), run_time=1.4)
        self.wait(0.8)

        # The ladders fold away into the Lewis drawings; the arrow becomes the curved arrow.
        s = 0.8 if PORTRAIT else 1.0
        n = nh3(lone=RIGHT).scale(s).move_to(LEFT * (2.1 if PORTRAIT else 2.6) + UP * y0)
        b = bf3(open_side=LEFT).scale(s).move_to(RIGHT * (1.9 if PORTRAIT else 2.6) + UP * y0)
        lp = n.lp.get_center()
        curved = CurvedArrow(lp + UP * 0.15, b.centre.get_center() + LEFT * 0.35 + UP * 0.2, angle=-PI / 2.2, color=CYAN, stroke_width=7)
        self.play(
            FadeOut(left, shift=DOWN * 0.3), FadeOut(right, shift=DOWN * 0.3), FadeOut(note),
            FadeIn(n, shift=UP * 0.2), FadeIn(b, shift=UP * 0.2),
            ReplacementTransform(flow, curved),
            run_time=1.6, rate_func=ease_in_out_sine,
        )
        tag_h = label(t("homoShort"), 24, CYAN, MONO).next_to(n.lp, DOWN, buff=0.35)
        tag_l = label(t("lumoShort"), 24, CYAN, MONO).move_to(b.centre.get_center() + np.array([0.5, 0.7, 0]) * s)
        self.play(FadeIn(tag_h), FadeIn(tag_l), run_time=0.5)
        lines = TEXT["caption"] if PORTRAIT else [" ".join(TEXT["caption"])]
        caption = VGroup(*[label(s_, 40 if not PORTRAIT else 34, INK) for s_ in lines]).arrange(DOWN, buff=0.15)
        caption.to_edge(DOWN, buff=1.2 if PORTRAIT else 0.8)
        self.play(Write(caption), run_time=1.4)
        self.hold()
