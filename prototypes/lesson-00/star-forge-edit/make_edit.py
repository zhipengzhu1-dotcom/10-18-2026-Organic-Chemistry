"""PROTOTYPE (throwaway): build everything the star-forge cut-4 edit needs, outside Resolve.

One edit plan (below) drives four outputs, so they cannot drift apart:
  1. media/white-<aspect>.mp4       the white leg of the fusion dip-to-white
  2. audio/{amb,fx,ui}.wav + mix.wav the CC0 sound design, as three stems pre-mixed to ~-14 LUFS
  3. timeline/star-forge-<aspect>.fcpxml   the same edit as FCPXML (diagnostic / manual fallback)
  4. the PLAN block inside star_forge_edit_PROTOTYPE.lua (Resolve builds the edit natively from it)
  5. out/preview-ffmpeg-<aspect>.mp4 an ffmpeg-only render of the same edit (xfade + same mix)

Run with the Manim venv's python (needs numpy + scipy):
  ../star-forge-manim/.venv/bin/python -I make_edit.py [--no-preview]
"""

import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MANIM = ROOT / "star-forge-manim" / "out" / "cut4"
SFX = HERE / "sfx"
AUDIO = HERE / "audio"
MEDIA = HERE / "media"
TL = HERE / "timeline"
OUT = HERE / "out"
LUA = HERE / "star_forge_edit_PROTOTYPE.lua"

FPS = 30
SR = 48000
TOTAL = 420  # frames (14.0 s): the Manim cut-4 render
ASPECTS = {"16x9": (1920, 1080), "9x16": (1080, 1920)}
WHITE_LEN = 60  # frames in the white source (handles on both sides of the 12 used)
TARGET_LUFS = -16.0  # sparse sound design: -16 keeps the boom un-squashed; ~-14 would need heavy limiting
STEM_TRIM_DB = {"amb": -21.0, "fx": 0.0, "ui": 2.0}  # relative balance before the master gain

# ---- the edit plan (frames). Record == source for every Manim clip: the edit cuts one continuous
# render at the beat boundaries, so every dissolve has real handles and continuity is exact.
CLIPS = [
    # name,          src,     in,  out, rec, finish
    ("s1-star",      "manim",   0,  60,   0, "star"),
    ("s2-approach",  "manim",  60, 144,  60, "star"),
    ("dip-white",    "white",  24,  36, 144, None),   # 12 white frames bridge the fusion flash
    ("s3-fuse",      "manim", 156, 195, 156, "star"),
    ("s4-pullback",  "manim", 195, 270, 195, "space"),
    ("s5-morph",     "manim", 270, 315, 270, "space"),
    ("s6-card",      "manim", 315, 420, 315, "space"),
]
# transition at the END of clip index i (0-based), centred on the cut
TRANSITIONS = [
    (0, "Cross Dissolve", 10),  # star -> approach (seamless: same continuous frames)
    (1, "Cross Dissolve", 8),   # approach -> WHITE  } together: dip to white on the fusion flash
    (2, "Cross Dissolve", 12),  # WHITE -> fuse      }
    (3, "Cross Dissolve", 14),  # fuse -> pull-back (grain fades in under it)
    (4, "Cross Dissolve", 10),  # pull-back -> morph
    (5, "Cross Dissolve", 10),  # morph -> card
]
FADE_IN, FADE_OUT = 18, 18  # frames, from/to black
FINISH = {
    # Fusion finishing per look. Grain only on the dark space shots: never on the star core.
    "star":  {"glow_threshold": 0.70, "glow_gain": 0.35, "grain": None},
    "space": {"glow_threshold": 0.50, "glow_gain": 0.55, "grain": 0.05},
}
AUDIO_TRACKS = [("amb", 1), ("fx", 2), ("ui", 3)]


def manim_path(aspect):
    return MANIM / f"star-forge-manim-cut4-{aspect}.mp4"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stderr[-3000:]}")
    return r


# ---------------------------------------------------------------- 1. white media
def make_white():
    MEDIA.mkdir(exist_ok=True)
    for a, (w, h) in ASPECTS.items():
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
             f"color=c=white:s={w}x{h}:r={FPS}:d={WHITE_LEN / FPS}",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "12", "-r", str(FPS),
             MEDIA / f"white-{a}.mp4"])


# ---------------------------------------------------------------- 2. audio
def load(name, rate=1.0, start=None, end=None):
    """Decode an SFX file to float32 stereo at SR. rate != 1 resamples (pitch + speed, like tape)."""
    af = []
    if start is not None or end is not None:
        af.append(f"atrim={start or 0}:{end if end is not None else 1e9}")
    if rate != 1.0:
        af += [f"asetrate={int(SR * rate)}", f"aresample={SR}"]
    cmd = ["ffmpeg", "-v", "error", "-i", SFX / name, "-ac", "2", "-ar", str(SR)]
    if af:
        cmd += ["-af", ",".join(af)]
    raw = subprocess.run(cmd + ["-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def db(x):
    return 10 ** (x / 20)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def pan(x, p):
    """Equal-power pan of a stereo signal's mono sum, p in [-1, 1]."""
    m = x.mean(axis=1)
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1) * np.sqrt(2)


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    n = len(x)
    if fin:
        k = min(n, int(fin * SR)); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    if fout:
        k = min(n, int(fout * SR)); x[n - k:] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    return x


_IR = {}


def reverb(x, wet=0.35, rt60=2.2, tone=6000):
    """Small synthetic hall: decorrelated noise IR with an exponential decay."""
    key = (rt60, tone)
    if key not in _IR:
        rng = np.random.default_rng(7)
        n = int(rt60 * SR)
        t = np.arange(n) / SR
        env = np.exp(-6.9 * t / rt60)
        ir = rng.standard_normal((n, 2)) * env[:, None]
        ir[: int(0.012 * SR)] = 0  # pre-delay
        ir = lp(ir, tone)
        _IR[key] = ir / np.sqrt((ir ** 2).sum(axis=0))
    ir = _IR[key]
    y = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)
    out = np.zeros_like(y)
    out[: len(x)] += x * (1 - wet)
    return out + y * wet


def place(bus, x, t, gain_db=0.0):
    i = int(round(t * SR))
    x = x * db(gain_db)
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(bus), i + len(x))
    bus[i:j] += x[: j - i]


def build_audio():
    AUDIO.mkdir(exist_ok=True)
    n = int(TOTAL / FPS * SR)
    T = TOTAL / FPS
    amb, fx, ui = (np.zeros((n, 2)) for _ in range(3))
    cues = []  # (stem, t, what) for the report / SOURCES.md

    # -- ambience bed: space wind, low-passed, plus a slow sub-octave engine hum
    # the source is separate gusts with silent gaps: chain its steady stretches with 0.8 s crossfades
    full = load("space-wind_0.mp3")
    wind = np.zeros((0, 2))
    ov = int(0.8 * SR)
    for a, b in [(5.8, 8.2), (10.4, 12.8), (15.0, 17.6), (19.4, 22.0), (24.2, 26.2), (32.2, 34.8), (40.0, 42.2),
                 (44.0, 46.2), (6.0, 8.2), (19.6, 22.0)]:
        seg = full[int(a * SR):int(b * SR)]
        if len(wind) == 0:
            wind = seg
            continue
        r = np.linspace(0, np.pi / 2, ov)[:, None]
        mid = wind[-ov:] * np.cos(r) + seg[:ov] * np.sin(r)
        wind = np.concatenate([wind[:-ov], mid, seg[ov:]])
        if len(wind) >= n:
            break
    wind = lp(hp(wind[:n], 60), 900, order=4)
    wind = level_out(wind)  # the gusts breathe; even out the dips at the joins
    hum_src = load("spaceEngineLow_000.ogg", rate=0.6)  # ~8.3 s, an octave-ish down
    hum = np.concatenate([fade(hum_src, 0, 1.0), fade(hum_src, 1.0, 0)])  # 2 copies
    hum = lp(hum, 260, order=4)[:n]
    bed = wind / (np.abs(wind).max() + 1e-9) * db(-6) + hum / (np.abs(hum).max() + 1e-9) * db(-10)
    bed = fade(bed, fin=1.8, fout=1.6)
    place(amb, bed, 0.0)
    cues.append(("amb", 0.0, "space-wind bed + engine hum, fade in 1.8 s / out 1.6 s"))

    # -- three ⁴He approach whooshes, panned to where each nucleus comes from, peaks just before 5.0 s
    whoosh = load("whoosh2_0.wav", start=2.6)  # its peak sits 2.01 s into this trim
    whoosh = lp(whoosh, 5500)
    for target, rate, p, g in [(4.55, 1.0, -0.7, -10.0), (4.72, 0.92, 0.7, -11.0), (4.86, 1.07, -0.2, -11.0)]:
        w = load("whoosh2_0.wav", rate=rate, start=2.6)
        w = lp(w, 5500)
        start = target - 2.01 / rate
        end_at = 5.06  # tails stop where the boom takes over
        w = w[: int((end_at - start) * SR)]
        place(fx, fade(pan(w, p), fin=0.6, fout=0.08), start, g)
        cues.append(("fx", round(start, 2), f"whoosh (rate {rate}, pan {p:+.1f}) peaks {target:.2f} s"))

    # -- fusion at 5.00 s (frame 150): sub boom + soft punch + shimmer tail
    boom = load("lowFrequency_explosion_000.ogg")
    place(fx, fade(boom, 0, 0.6), 4.95, -6.0)
    cues.append(("fx", 4.95, "low-frequency boom (onset ~4.99 s)"))
    punch = lp(load("impactSoft_heavy_000.ogg"), 1800)
    place(fx, punch, 5.0, -10.0)
    cues.append(("fx", 5.0, "soft punch transient"))
    shim = load("glass_004.ogg")
    shim = reverb(np.concatenate([shim, np.zeros((int(2.5 * SR), 2))]), wet=0.6, rt60=2.6, tone=9000)
    shim_lo = reverb(np.concatenate([load("glass_004.ogg", rate=0.75), np.zeros((int(2.5 * SR), 2))]),
                     wet=0.7, rt60=2.6, tone=7000)
    place(fx, fade(hp(shim, 700), 0, 1.2), 5.03, -15.0)
    place(fx, fade(hp(shim_lo, 500), 0, 1.2), 5.08, -17.0)
    cues.append(("fx", 5.03, "glass shimmer x2 with reverb tail"))

    # -- pull-back at 6.5 s: the approach whoosh reversed (sharp swell, long recede), soft and wide
    back = load("whoosh2_0.wav")[::-1]
    back = lp(back, 2600)[: int(3.2 * SR)]
    back = fade(back, fin=0.25, fout=1.8)
    place(fx, back, 6.45, -9.0)
    cues.append(("fx", 6.45, "reversed whoosh, receding (pull-back)"))

    # -- four valence dots (GrowFromCenter starts 291/297/303/309; each reads as "there" ~3 frames in)
    for k, (rate, p) in enumerate([(1.0, 0.0), (1.125, 0.45), (1.25, 0.0), (1.5, -0.45)]):
        t = (294 + 6 * k) / FPS
        b = reverb(np.concatenate([lp(load("pluck_002.ogg", rate=rate), 4500), np.zeros((SR, 2))]),
                   wet=0.3, rt60=1.2)
        place(ui, fade(pan(b, p), 0, 0.4), t, -13.0)
        cues.append(("ui", round(t, 2), f"valence-dot blip {k + 1} (pluck rate {rate})"))

    # -- card writes on at frame 339 (11.30 s): one soft chime
    ch = load("confirmation_002.ogg")
    ch = reverb(np.concatenate([lp(ch, 7000), np.zeros((2 * SR, 2))]), wet=0.45, rt60=2.0)
    place(ui, fade(ch, 0, 1.0), 339 / FPS, -21.0)
    cues.append(("ui", round(339 / FPS, 2), "card chime"))

    # everything dies with the picture fade (last 18 frames), plus a longer tail on the bed
    for bus in (fx, ui):
        bus[:] = fade(bus, 0, FADE_OUT / FPS)

    # ---- balance: fixed stem trims (bed well under the events), then ONE master gain for all stems
    # so they sum in Resolve (unity faders) to exactly the reference mix.
    amb *= db(STEM_TRIM_DB["amb"]); fx *= db(STEM_TRIM_DB["fx"]); ui *= db(STEM_TRIM_DB["ui"])
    for attempt in range(6):
        write_wav(AUDIO / "_probe.wav", amb + fx + ui)
        lufs, tp = loudness(AUDIO / "_probe.wav")
        g = TARGET_LUFS - lufs
        print(f"  balance pass {attempt}: {lufs:.1f} LUFS, true peak after gain {tp + g:.1f} dBTP")
        if tp + g <= -1.0:
            break
        # a peak would clip: limit the event stems' peaks a little harder and measure again
        # final sample peak must stay under -1.5 dBFS after gain g; leave 3 dB for the bed underneath
        ceiling = db(-1.5 - g - 3.0 - 0.5 * attempt)
        fx, ui = limit(fx, ceiling), limit(ui, ceiling)
    (AUDIO / "_probe.wav").unlink()
    for name, bus in (("amb", amb), ("fx", fx), ("ui", ui)):
        write_wav(AUDIO / f"{name}.wav", bus * db(g))
    write_wav(AUDIO / "mix.wav", (amb + fx + ui) * db(g))
    lufs, tp = loudness(AUDIO / "mix.wav")
    print(f"mix: integrated {lufs:.1f} LUFS, true peak {tp:.1f} dBTP (gain {g:+.1f} dB)")
    (AUDIO / "cues.json").write_text(json.dumps(
        {"integrated_lufs": round(lufs, 1), "true_peak_dbtp": round(tp, 1),
         "cues": [{"stem": s, "t": t, "what": w} for s, t, w in cues]}, indent=1))
    return cues


def level_out(x, win=0.5, max_boost_db=8.0):
    """Slow auto-gain: divide by a smoothed RMS envelope so the bed sits at a steady level."""
    from scipy.ndimage import uniform_filter1d
    p_ = uniform_filter1d((x ** 2).mean(axis=1), size=int(win * SR))
    p_ = uniform_filter1d(p_, size=int(win * SR))
    rms = np.sqrt(np.maximum(p_, 1e-12))
    target = np.median(rms)
    g = np.minimum(target / rms, db(max_boost_db))
    return x * g[:, None]


def limit(x, ceiling, look_ms=40.0):
    """Look-ahead brickwall: per-sample gain = min(1, ceiling/|x|), spread over the look-ahead
    window (so the gain is already down when the peak arrives) and smoothed."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    w = int(look_ms / 1000 * SR)
    a = np.abs(x).max(axis=1)
    g = np.minimum(1.0, ceiling / np.maximum(a, 1e-12))
    g = minimum_filter1d(g, size=4 * w + 1)
    g = uniform_filter1d(g, size=2 * w + 1)
    return x * g[:, None]


def write_wav(path, x):
    x = np.clip(x, -1, 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", path], input=x.tobytes(), check=True)


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = r[r.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary).group(1))
    return i, tp


# ---------------------------------------------------------------- 3. FCPXML
def t(frames):
    return f"{int(frames)}/{FPS}s" if frames else "0s"


def url(p):
    return "file://" + urllib.parse.quote(str(p))


def fcpxml(aspect):
    w, h = ASPECTS[aspect]
    src = {"manim": ("r2", manim_path(aspect), TOTAL), "white": ("r3", MEDIA / f"white-{aspect}.mp4", WHITE_LEN)}
    res = [f'    <format id="r1" name="FFVideoFormat{h}p30" frameDuration="1/{FPS}s" width="{w}" height="{h}" colorSpace="1-1-1 (Rec. 709)"/>']
    for rid, path, dur in src.values():
        res.append(f'    <asset id="{rid}" name="{path.stem}" uid="{rid}-{aspect}" start="0s" duration="{t(dur)}" '
                   f'hasVideo="1" format="r1" videoSources="1">\n'
                   f'      <media-rep kind="original-media" src="{url(path)}"/>\n    </asset>')
    for k, (stem, _) in enumerate(AUDIO_TRACKS):
        res.append(f'    <asset id="ra{k}" name="{stem}" uid="ra{k}-{aspect}" start="0s" duration="{t(TOTAL)}" '
                   f'hasAudio="1" audioSources="1" audioChannels="2" audioRate="{SR}">\n'
                   f'      <media-rep kind="original-media" src="{url(AUDIO / (stem + ".wav"))}"/>\n    </asset>')
    spine = []
    tr = {i: (name, d) for i, name, d in TRANSITIONS}
    for i, (name, s, a, b, rec, _) in enumerate(CLIPS):
        rid = src[s][0]
        inner = ""
        if i == 0:  # audio stems as connected clips under the first clip, lanes -1..-3
            inner = "".join(
                f'\n        <asset-clip ref="ra{k}" lane="-{k + 1}" offset="0s" name="{stem}" start="0s" '
                f'duration="{t(TOTAL)}" audioRole="effects"/>' for k, (stem, _) in enumerate(AUDIO_TRACKS))
            inner += "\n      "
        spine.append(f'      <asset-clip ref="{rid}" offset="{t(rec)}" name="{name}" start="{t(a)}" '
                     f'duration="{t(b - a)}" format="r1" tcFormat="NDF">{inner}</asset-clip>')
        if i in tr:
            tname, d = tr[i]
            cut = rec + (b - a)
            spine.append(f'      <transition name="{tname}" offset="{t(cut - d // 2)}" duration="{t(d)}"/>')
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
{chr(10).join(res)}
  </resources>
  <library>
    <event name="star-forge cut 4">
      <project name="star-forge FCPXML {aspect}">
        <sequence format="r1" duration="{t(TOTAL)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
{chr(10).join(spine)}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
'''
    TL.mkdir(exist_ok=True)
    p = TL / f"star-forge-{aspect}.fcpxml"
    p.write_text(xml)
    return p


def check_plan():
    """Offline checks of the plan every output relies on."""
    cur = 0
    for name, s, a, b, rec, _ in CLIPS:
        assert rec == cur, f"{name}: record {rec} != running {cur} (gap/overlap)"
        if s == "manim":
            assert a == rec, f"{name}: manim clips must be record==source"
        cur += b - a
    assert cur == TOTAL, (cur, TOTAL)
    for i, _, d in TRANSITIONS:
        name, s, a, b, rec, _ = CLIPS[i]
        nname, ns, na, nb, nrec, _ = CLIPS[i + 1]
        src_len = TOTAL if s == "manim" else WHITE_LEN
        nsrc_len = TOTAL if ns == "manim" else WHITE_LEN
        assert b + d // 2 <= src_len, f"{name}: no tail handle for {d}f"
        assert na - d // 2 >= 0, f"{nname}: no head handle for {d}f"
        assert d // 2 * 2 == d
        # transitions must not overlap each other on the same clip
        assert d // 2 < (b - a) and d // 2 < (nb - na)
    w = CLIPS[2]
    assert TRANSITIONS[1][2] // 2 + TRANSITIONS[2][2] // 2 <= w[3] - w[2], "white leg too short for both dissolves"


# ---------------------------------------------------------------- 4. Lua plan block
def lua_plan():
    def q(s):
        return '"' + s + '"'
    lines = ["local PLAN = {", f"  fps = {FPS}, total = {TOTAL}, fadeIn = {FADE_IN}, fadeOut = {FADE_OUT},", "  clips = {"]
    for name, s, a, b, rec, fin in CLIPS:
        lines.append(f"    {{ name = {q(name)}, src = {q(s)}, s = {a}, e = {b}, rec = {rec}, finish = {q(fin) if fin else 'nil'} }},")
    lines.append("  },")
    lines.append("  transitions = {  -- at the END of clip [after] (1-based), centred on the cut")
    for i, name, d in TRANSITIONS:
        lines.append(f"    {{ after = {i + 1}, type = {q(name)}, dur = {d} }},")
    lines.append("  },")
    lines.append("  finish = {")
    for k, v in FINISH.items():
        g = "nil" if v["grain"] is None else v["grain"]
        lines.append(f"    {k} = {{ glowThreshold = {v['glow_threshold']}, glowGain = {v['glow_gain']}, grain = {g} }},")
    lines.append("  },")
    lines.append("  audio = {")
    for stem, track in AUDIO_TRACKS:
        lines.append(f"    {{ stem = {q(stem)}, track = {track} }},")
    lines.append("  },")
    lines.append("}")
    block = "\n".join(lines)
    src = LUA.read_text()
    new = re.sub(r"-- BEGIN PLAN.*?-- END PLAN",
                 "-- BEGIN PLAN (generated by make_edit.py; edit the plan there, not here)\n" + block + "\n-- END PLAN",
                 src, flags=re.S)
    LUA.write_text(new)


# ---------------------------------------------------------------- 5. ffmpeg preview
def preview(aspect):
    """Same clips, same centred dissolves (xfade), same fades and mix. The Fusion finish is
    approximated: soft glow = blurred bright pass screened on top; grain = light temporal noise
    on the space shots only."""
    w, h = ASPECTS[aspect]
    tr = {i: d for i, _, d in TRANSITIONS}
    inputs = ["-i", manim_path(aspect), "-i", MEDIA / f"white-{aspect}.mp4", "-i", AUDIO / "mix.wav"]
    f = []
    segs = []
    for i, (name, s, a, b, rec, fin) in enumerate(CLIPS):
        head = tr.get(i - 1, 0) // 2
        tail = tr.get(i, 0) // 2
        idx = 0 if s == "manim" else 1
        lbl = f"c{i}"
        look = ""
        if fin:
            cfg = FINISH[fin]
            th = int(cfg["glow_threshold"] * 255)
            look = f",format=gbrp,split[{lbl}a][{lbl}b];[{lbl}b]lutrgb=r='if(gt(val,{th}),val,0)':g='if(gt(val,{th}),val,0)':b='if(gt(val,{th}),val,0)'," \
                   f"gblur=sigma=18[{lbl}g];[{lbl}a][{lbl}g]blend=all_mode=screen:all_opacity={cfg['glow_gain'] * 0.6:.2f},format=yuv420p"
            if cfg["grain"]:
                look += f",noise=c0s={int(cfg['grain'] * 100)}:c0f=t"
        f.append(f"[{idx}:v]trim=start_frame={a - head}:end_frame={b + tail},setpts=PTS-STARTPTS,format=yuv420p{look}[{lbl}]")
        segs.append((lbl, rec - head, b - a + head + tail))
    cur, cur_start = segs[0][0], 0
    for i in range(1, len(segs)):
        d = tr[i - 1]
        cut = CLIPS[i][4]
        nxt = f"x{i}"
        f.append(f"[{cur}][{segs[i][0]}]xfade=transition=fade:duration={d / FPS:.4f}:offset={(cut - d // 2) / FPS:.4f}[{nxt}]")
        cur = nxt
    f.append(f"[{cur}]fade=t=in:st=0:d={FADE_IN / FPS:.3f},fade=t=out:st={(TOTAL - FADE_OUT) / FPS:.3f}:d={FADE_OUT / FPS:.3f},"
             f"trim=end_frame={TOTAL},format=yuv420p[v]")
    OUT.mkdir(exist_ok=True)
    out = OUT / f"preview-ffmpeg-{aspect}.mp4"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(f), "-map", "[v]", "-map", "2:a",
         "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out])
    print("preview:", out)


if __name__ == "__main__":
    check_plan()
    make_white()
    build_audio()
    for a in ASPECTS:
        fcpxml(a)
    lua_plan()
    if "--no-preview" not in sys.argv:
        for a in ASPECTS:
            preview(a)
