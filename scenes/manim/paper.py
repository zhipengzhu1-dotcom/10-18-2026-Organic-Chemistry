"""Paper Notebook for the watch-only Scenes (#123): what every script here draws on and with.

Import it right after Manim (`from manim import *` then `from paper import *`) so its colour names
win over Manim's built-in BLUE, PINK and the rest. It reads the props file the render command writes
(SCENE_PROPS), sets the frame for the aspect at 60 fps, and gives:

- the palette from the site's tokens.css (`palette` in the props): PAPER, RULE, MARGIN, the pen inks
  INK, MUTED, BLUE, GREEN, PINK, VIOLET, ORANGE, and the marker fills *_FILL. Marker fills are too
  pale to stand alone on white, so a fill always sits inside a pen line (`marked`), as on the site;
- the faces: HAND (Patrick Hand) for labels and headings, TEXT_FONT (Nunito) for sentences, MONO
  (JetBrains Mono) for formulas and numbers; `fonts()` registers them;
- `ruled()`: white paper with faint blue rules (and the pink margin line on 16:9 only, as the site
  draws it only from 640 px up);
- `doodle()`: one of the six hand-drawn doodles in doodles/ (flask, tubes, benzene, atom, sprig,
  beaker), its marker fill printed a little off its pen line.

Every input here (this file, fonts/, doodles/) is in each render's inputs hash.
"""

import json
import os
from contextlib import ExitStack
from pathlib import Path

import numpy as np
from manim import ORIGIN, Line, ManimColor, SVGMobject, VGroup, VMobject, config, register_font

HERE = Path(__file__).resolve().parent
PROPS = json.loads(Path(os.environ["SCENE_PROPS"]).read_text())
PORTRAIT = PROPS["aspect"] == "9x16"
VALUES = PROPS["values"]
TEXT = PROPS["text"]

# ---- the frame: 8 units across its short side ---------------------------------
config.pixel_width, config.pixel_height = PROPS["width"], PROPS["height"]
if PORTRAIT:
    config.frame_width = 8.0
    config.frame_height = 8.0 * PROPS["height"] / PROPS["width"]
else:
    config.frame_height = 8.0
    config.frame_width = 8.0 * PROPS["width"] / PROPS["height"]
config.frame_rate = PROPS["fps"]
FW, FH = config.frame_width, config.frame_height

# ---- palette (tokens.css) -------------------------------------------------------
PAL = {k: ManimColor(v) for k, v in PROPS["palette"].items()}
PAPER, RULE, MARGIN = PAL["at-paper"], PAL["at-rule"], PAL["at-margin"]
INK, MUTED = PAL["at-ink"], PAL["at-ink-muted"]
BLUE, GREEN, PINK, VIOLET, ORANGE = (PAL[f"at-{c}"] for c in ("blue", "green", "pink", "violet", "orange"))
BLUE_FILL, GREEN_FILL, PINK_FILL, VIOLET_FILL, ORANGE_FILL, YELLOW_FILL = (
    PAL[f"at-{c}-fill"] for c in ("blue", "green", "pink", "violet", "orange", "yellow")
)
config.background_color = PAPER

# A pen line, in Manim stroke units (about px at 1080p).
PEN = 4.5

# ---- type -------------------------------------------------------------------------
HAND = "Patrick Hand"
TEXT_FONT = "Nunito"
MONO = "JetBrains Mono"


def fonts():
    """Register the three faces for the length of a `with` block."""
    stack = ExitStack()
    for f in ("PatrickHand-Regular.ttf", "Nunito-wght.ttf", "JetBrainsMono-wght.ttf"):
        stack.enter_context(register_font(str(HERE / "fonts" / f)))
    return stack


# ---- paper ---------------------------------------------------------------------------
RULE_GAP = 0.42  # about 57 px at 1080p: the site's 32 px rules at a video's viewing size


def ruled(width=None, height=None, centre=ORIGIN, margin=None):
    """Ruled paper covering width x height around centre (default: the frame), behind everything."""
    w, h = width or FW, height or FH
    c = np.array(centre, dtype=float)
    g = VGroup()
    top = c[1] + h / 2
    k = 1
    while top - k * RULE_GAP > c[1] - h / 2:
        y = top - k * RULE_GAP
        g.add(Line([c[0] - w / 2, y, 0], [c[0] + w / 2, y, 0], stroke_color=RULE, stroke_width=2.5))
        k += 1
    if margin is None:
        margin = not PORTRAIT
    if margin:
        x = -FW / 2 + 1.05
        g.add(Line([x, c[1] - h / 2, 0], [x, c[1] + h / 2, 0], stroke_color=MARGIN, stroke_width=3))
    return g.set_z_index(-100)


# ---- pen and marker ---------------------------------------------------------------------
MARKER_OFFSET = np.array([0.045, -0.035, 0])  # the fill prints a little off the pen line


def marked(shape: VMobject, fill, pen=INK, width=PEN, opacity=1.0, offset=MARKER_OFFSET):
    """A shape as the notebook draws it: a marker fill a little off-register, under its pen line."""
    under = shape.copy().set_stroke(width=0).set_fill(fill, opacity=opacity).shift(offset)
    over = shape.copy().set_fill(opacity=0).set_stroke(pen, width=width)
    return VGroup(under, over)


# ---- doodles ---------------------------------------------------------------------------------
DOODLES = ("flask", "tubes", "benzene", "atom", "sprig", "beaker")


def doodle(name: str, height: float, at=ORIGIN, angle=0.0):
    """One hand-drawn doodle, `height` units tall: marker fills and pen lines as drawn in doodles/."""
    d = SVGMobject(str(HERE / "doodles" / f"{name}.svg"), height=height)
    for part in d.family_members_with_points():
        if part.get_stroke_opacity() > 0 and part.get_stroke_width() > 0:
            part.set_stroke(INK, width=PEN * 0.75)
    return d.rotate(angle).move_to(at).set_z_index(-50)


__all__ = [
    "PROPS", "PORTRAIT", "VALUES", "TEXT", "FW", "FH", "PAL",
    "PAPER", "RULE", "MARGIN", "INK", "MUTED", "BLUE", "GREEN", "PINK", "VIOLET", "ORANGE",
    "BLUE_FILL", "GREEN_FILL", "PINK_FILL", "VIOLET_FILL", "ORANGE_FILL", "YELLOW_FILL",
    "PEN", "HAND", "TEXT_FONT", "MONO", "fonts", "ruled", "marked", "doodle", "DOODLES", "RULE_GAP",
]
