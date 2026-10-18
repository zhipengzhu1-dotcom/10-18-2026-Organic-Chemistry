"""PROTOTYPE (style C): the one beat plan shared by the Manim scene, the sound design and the Resolve Lua.

All numbers are frames at 30 fps. M = frame in the Manim render, R = frame on the Resolve timeline.
The timeline opens on HEAD frames of black with sound only (the J-cut), so R = M + HEAD.
"""

FPS = 30
SR = 48000
HEAD = 21  # 0.7 s of black: the rumble rises before the picture (sound leads picture)

# Manim beats (M frames)
STAR_IN = (0, 60)          # star kindles; slow push-in runs 0..HOVER_END
HE_IN = (60, 84)           # three 4He fade in (staggered) ...
DRIFT = (60, 135)          # ... and drift in, decelerating to a hover just short of contact
HOVER = (135, 150)         # 0.5 s of near-stillness before the climax
SNAP = (150, 156)          # 0.2 s rush into contact
IMPACT = 156               # contact frame = fusion flash = section cut s2|s3
C_LABEL_IN = (168, 180)
EQ_WRITE = (162, 207)      # 3 4He -> 12C writes on
PULLBACK = (231, 306)      # slow, weighty pull-back
CELL = (306, 324)
MORPH = (324, 345)         # nucleus -> letter C
DOTS = (345, 369)          # four valence dots, silent
EXIT = (375, 381)          # inverse zoom-through, exit leg: content 1 -> 0.8 (power-in)
SWAP = 381                 # cut point: card composition replaces the cell shot
ARRIVE = (381, 396)        # entry leg: content 1.25 -> 1 (expo-out); the card "lands"
SUB_IN = (402, 414)        # second card line fades in (one element at a time)
TOTAL_M = 489              # card holds 2.5 s after the last element lands

# Edit sections (cut points in M frames) and their finishing look
SECTIONS = [
    ("s1-star", 0, 60, "star"),
    ("s2-approach", 60, IMPACT, "star"),
    ("s3-fuse", IMPACT, 231, "fuse"),
    ("s4-pullback", 231, 324, "space"),
    ("s5-morph", 324, 375, "space"),
    ("s6-exit", 375, SWAP, "exit"),
    ("s7-card", SWAP, TOTAL_M, "card"),
]
TOTAL_R = TOTAL_M + HEAD


def r(m):
    """Manim frame -> timeline frame."""
    return m + HEAD


def sec(frame):
    return frame / FPS
