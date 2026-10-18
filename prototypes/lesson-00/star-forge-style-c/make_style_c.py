"""PROTOTYPE (style C, throwaway): everything the Resolve edit needs, built offline from timing.py.

  1. audio/{music,sfx,amb}.wav + mix.wav  self-synthesised score + CC0 SFX, mixed to -16 LUFS, TP <= -2 dBTP
  2. timeline/style-c-<aspect>.fcpxml    V1 sections after a black head (the J-cut), letterbox bar clips
                                         (16:9) on lanes 1-2, three stems on lanes -1..-3
  3. the PLAN block in star_forge_style_c_PROTOTYPE.lua
  4. work/preview-<aspect>.mp4           Manim + mix, for checking sync before Resolve (not a deliverable)

Run: ../star-forge-manim/.venv/bin/python -I make_style_c.py [--no-preview]
"""

import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import timing as T  # noqa: E402

SFX = HERE / "sfx"
AUDIO = HERE / "audio"
TL = HERE / "timeline"
WORK = HERE / "work"
LUA = HERE / "star_forge_style_c_PROTOTYPE.lua"
ASPECTS = {"16x9": (1920, 1080), "9x16": (1080, 1920)}
SR, FPS = T.SR, T.FPS
N = int(T.TOTAL_R / FPS * SR)
TARGET_LUFS = -16.0
BAR = round((1080 - 1920 / 2.39) / 2)  # 2.39:1 letterbox bar height in px at 1920x1080 (138)
RNG = np.random.default_rng(2026)


def t_r(m):
    """Manim frame -> seconds on the timeline."""
    return T.r(m) / FPS


IMPACT = t_r(T.IMPACT)               # 5.90 s
GAP = 0.30                           # audio gap before the impact
RISER_END = IMPACT - GAP             # 5.60 s
PIC_IN = T.HEAD / FPS                # 0.70 s: first picture
SWAP = t_r(T.SWAP)                   # 13.40 s: card lands (inverse zoom seam)
MUSIC_OUT = t_r(T.TOTAL_M) - 0.5     # music fully faded 0.5 s before the end
END = T.TOTAL_R / FPS


# ------------------------------------------------------------------ helpers
def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stderr[-3000:]}")
    return r


def db(x):
    return 10 ** (x / 20)


def tvec(n=N):
    return np.arange(n) / SR


def env(points, n=N):
    """Piecewise-linear envelope from (time_s, gain) points (gain in linear amplitude)."""
    ts, gs = zip(*points)
    return np.interp(tvec(n), ts, gs)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def sweep_lp(x, cutoff, block=256, order=2):
    """Time-varying low-pass: Butterworth recomputed per block, state carried across blocks."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        c = float(np.clip(cutoff[min(i, len(cutoff) - 1)], 20, SR / 2 - 100))
        sos = butter(order, c, "low", fs=SR, output="sos")
        if zi is None:
            zi = np.stack([sosfilt_zi(sos)] * x.shape[1], axis=-1) * 0
        y[i:i + block], zi = sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y


def stereo(m, width=0.0):
    return np.stack([m, m], axis=1) if width == 0 else np.stack([m * (1 - width), m * (1 + width)], axis=1)


def saw(freq, t, phase=0.0):
    return 2 * ((freq * t + phase) % 1.0) - 1


def saw_stack(freqs, t, detune_cents=7, spread=0.6):
    """Detuned saw stack, each note as 3 voices spread across the stereo field."""
    out = np.zeros((len(t), 2))
    for f in freqs:
        for k, c in enumerate((-detune_cents, 0, detune_cents)):
            ff = f * 2 ** (c / 1200)
            v = saw(ff, t, RNG.uniform())
            p = (k - 1) * spread
            out[:, 0] += v * np.cos((p + 1) * np.pi / 4)
            out[:, 1] += v * np.sin((p + 1) * np.pi / 4)
    return out / (len(freqs) * 3) ** 0.5


def noise(n=N, color="white"):
    w = RNG.standard_normal((n, 2))
    if color == "brown":
        w = np.cumsum(w, axis=0)
        w = hp(w, 15)
        w /= np.abs(w).max()
    elif color == "pink":
        w = lp(w, 1200, 1) + 0.3 * w
    return w


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
    key = (rt60, tone)
    if key not in _IR:
        rng = np.random.default_rng(7)
        n = int(rt60 * SR)
        tt = np.arange(n) / SR
        ir = rng.standard_normal((n, 2)) * np.exp(-6.9 * tt / rt60)[:, None]
        ir[: int(0.015 * SR)] = 0
        ir = lp(ir, tone)
        _IR[key] = ir / np.sqrt((ir ** 2).sum(axis=0))
    ir = _IR[key]
    y = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)
    out = np.zeros_like(y)
    out[: len(x)] += x * (1 - wet)
    return out + y * wet


def load(name, rate=1.0):
    af = [] if rate == 1.0 else ["-af", f"asetrate={int(SR * rate)},aresample={SR}"]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SFX / name, "-ac", "2", "-ar", str(SR), *af, "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def attack(x, rel_db=-30.0):
    """Seconds from file start to the first sample within rel_db of the peak (the perceived transient)."""
    a = np.abs(x).max(axis=1)
    return int(np.argmax(a >= a.max() * db(rel_db))) / SR


def place(bus, x, t, gain_db=0.0):
    i = int(round(t * SR))
    x = x * db(gain_db)
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(bus), i + len(x))
    if j > i:
        bus[i:j] += x[: j - i]


def norm(x):
    return x / (np.abs(x).max() + 1e-12)


def write_wav(path, x):
    x = np.clip(x, -1, 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", path], input=x.tobytes(), check=True)


def loudness(path, extra=""):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", f"{extra}ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
    lra = float(re.search(r"LRA:\s+(-?[\d.]+) LU", s).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1))
    return i, tp, lra


def limit_gain(x, ceiling, look_ms=5.0, release_ms=120.0):
    """Look-ahead peak limiter gain curve with a smooth release (no pumping on a sparse mix)."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    w = max(1, int(look_ms / 1000 * SR))
    a = np.abs(x).max(axis=1)
    g = minimum_filter1d(np.minimum(1.0, ceiling / np.maximum(a, 1e-12)), size=2 * w + 1)
    rel = np.exp(-1 / (release_ms / 1000 * SR))
    out = g.copy()
    for i in range(1, len(out)):  # fine for 17 s
        out[i] = min(g[i], rel * out[i - 1] + (1 - rel) * g[i])
    return uniform_filter1d(out, size=w)


# ------------------------------------------------------------------ the score and the sound design
def build_audio():
    AUDIO.mkdir(exist_ok=True)
    t = tvec()
    music, sfx, amb = (np.zeros((N, 2)) for _ in range(3))
    cues = []
    D1, D2, F2, A2, D3, F3, Fs3, A3, E4, A4 = 36.71, 73.42, 87.31, 110.0, 146.83, 174.61, 185.0, 220.0, 329.63, 440.0
    gap = env([(0, 1), (RISER_END - 0.012, 1), (RISER_END, 0), (IMPACT - 0.002, 0), (IMPACT, 1), (END, 1)])

    # -- A3 amb: the J-cut rumble. It starts on frame 0 in black and rises; the picture follows at 0.70 s
    rum = lp(noise(color="brown"), 90, 4) * 1.6 + stereo(np.sin(2 * np.pi * D1 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)), 0) * 0.25
    rum *= env([(0, 0.0), (0.05, 0.25), (1.6, 0.85), (RISER_END, 1.0), (IMPACT, 1.0), (IMPACT + 0.6, 0.45),
                (t_r(T.PULLBACK[0]), 0.4), (MUSIC_OUT - 1.5, 0.35), (MUSIC_OUT, 0.0), (END, 0)])[:, None]
    wind = load("space-wind_0.mp3")[int(19.4 * SR):int(19.4 * SR) + N]
    wind = lp(hp(wind, 120), 1400, 4)
    wind = np.pad(wind, ((0, N - len(wind)), (0, 0)))
    wind = norm(wind) * env([(0, 0), (IMPACT + 0.8, 0), (IMPACT + 2.5, 0.35), (MUSIC_OUT - 1.0, 0.3), (MUSIC_OUT, 0), (END, 0)])[:, None]
    amb += norm(rum) * db(-7) + wind * db(-10)
    amb *= gap[:, None]
    cues += [("amb", 0.0, "J-cut: low rumble (brown noise lp 90 Hz + D1 sine) rises from black, 0.7 s before the picture"),
             ("amb", round(IMPACT + 0.8, 2), "space-wind texture under the pull-back (CC0, OpenGameArt)")]

    # -- A1 music: build -> gap -> DROP (braam) -> pad -> swell into the card -> faded before the end
    # build: D1/D2/A2 saw drone, low-pass opening 140 -> 1500 Hz, crescendo
    build = saw_stack([D1, D2, A2], t)
    cut_b = np.exp(np.interp(t, [PIC_IN, RISER_END], [np.log(140), np.log(1500)]))
    build = sweep_lp(build, cut_b, order=2)
    build *= env([(0, 0), (PIC_IN, 0.0), (2.4, 0.35), (RISER_END - 0.1, 1.0), (RISER_END, 1.0), (RISER_END + 0.01, 0), (END, 0)])[:, None]
    # heartbeat pulses on the build, accelerating (0.9 s -> 0.38 s apart): low sine thumps with a pitch drop
    beats, tb, gap_s = [], 1.5, 0.9
    while tb < RISER_END - 0.15:
        beats.append(tb); tb += gap_s; gap_s = max(0.38, gap_s * 0.84)
    pulse = np.zeros((N, 2))
    for k, b in enumerate(beats):
        n = int(0.45 * SR); tt = np.arange(n) / SR
        f = 48 + 40 * np.exp(-tt * 30)
        th = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
        place(pulse, stereo(th), b, -13 + 8 * (k / max(1, len(beats) - 1)) ** 1.3)  # crescendo
    music += norm(build) * db(-13) + norm(pulse) * db(-8)
    cues.append(("music", 1.5, f"build: D-minor saw drone, filter 140->1500 Hz + {len(beats)} accelerating heartbeat pulses"))

    # drop at the impact: a low "braam" (detuned saws D1 D2 A2 D3 F3), filter 3200 -> 380 Hz over 2 s
    dt = np.clip(t - IMPACT, 0, None)
    braam = saw_stack([D1, D2, A2, D3, F3], t, detune_cents=12, spread=0.8)
    braam = sweep_lp(braam, 380 + 2800 * np.exp(-dt / 0.55), order=2)
    braam *= np.where(t >= IMPACT, (1 - np.exp(-dt / 0.012)) * (0.3 + 0.7 * np.exp(-dt / 1.1)), 0)[:, None]
    braam *= env([(0, 1), (IMPACT + 3.0, 1), (IMPACT + 4.2, 0), (END, 0)])[:, None]
    # pad under the pull-back: Dm(add9) D2 D3 F3 A3 E4, soft, filter breathing; it swells into the card
    PAD_IN = IMPACT + 0.6
    pad_m = saw_stack([D2, D3, F3, A3, E4], t, detune_cents=9, spread=0.9)
    pad_m = sweep_lp(pad_m, 700 + 250 * np.sin(2 * np.pi * 0.18 * t) + 1400 * np.clip((t - (SWAP - 1.4)) / 1.4, 0, 1), order=2)
    # the card chord: D major add9 (F#3 for F3): the "lift" lands with the card
    pad_M = saw_stack([D2, D3, Fs3, A3, E4, A4], t, detune_cents=9, spread=0.9)
    pad_M = sweep_lp(pad_M, 1900 + 600 * np.exp(-np.clip(t - SWAP, 0, None) / 0.8), order=2)
    xf = np.clip((t - (SWAP - 0.05)) / 0.12, 0, 1)[:, None]
    pad = pad_m * (1 - xf) + pad_M * xf
    pad *= env([(0, 0), (PAD_IN, 0), (PAD_IN + 1.6, 0.42), (t_r(T.PULLBACK[1]), 0.5), (SWAP - 1.4, 0.5), (SWAP - 0.1, 0.95),
                (SWAP + 0.5, 1.0), (MUSIC_OUT - 1.3, 0.9), (MUSIC_OUT, 0.0), (END, 0)])[:, None]
    shimmer = stereo(np.sin(2 * np.pi * 2 * A4 * t) * 0.5 + np.sin(2 * np.pi * 3 * E4 * t) * 0.3, 0.2)
    shimmer *= (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * t))[:, None]
    shimmer *= env([(0, 0), (SWAP - 0.2, 0), (SWAP + 0.4, 0.5), (MUSIC_OUT - 1.3, 0.4), (MUSIC_OUT, 0), (END, 0)])[:, None]
    score_after = norm(braam) * db(-1) + norm(pad) * db(-11) + shimmer * db(-30)
    music += reverb(score_after, wet=0.25, rt60=2.4, tone=5000)[:N]
    music *= gap[:, None]
    music[int(MUSIC_OUT * SR):] = 0
    cues += [("music", round(IMPACT, 2), "DROP: braam (detuned saws D1-F3), filter 3.2 kHz -> 380 Hz"),
             ("music", round(PAD_IN, 2), "pad Dm(add9) under the pull-back"),
             ("music", round(SWAP - 1.4, 2), "swell: pad opens and rises into the card"),
             ("music", round(SWAP, 2), "card chord D major add9 (the lift), shimmer on top"),
             ("music", round(MUSIC_OUT - 1.3, 2), f"music fades 1.3 s, silent from {MUSIC_OUT:.2f} s (0.5 s before the end)")]

    # -- A2 sfx (low and heavy; few cues)
    # riser over the approach: noise band sweeping up + a 2-octave glide; it stops dead 0.3 s before contact
    RIS_IN = t_r(T.DRIFT[0])
    p = np.clip((t - RIS_IN) / (RISER_END - RIS_IN), 0, 1)
    glide = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (2 * p ** 1.6)) / SR)
    ris = sweep_lp(noise(color="pink"), 300 * 2 ** (4.3 * p ** 1.4), order=2) * 0.8 + stereo(glide, 0.1) * 0.25
    ris = hp(ris, 120)
    ris *= (np.where(t < RIS_IN, 0, p ** 2.2) * (t < RISER_END))[:, None]
    ris = fade(ris, 0, 0)  # (hard stop is the point; a 10 ms ramp avoids a click)
    ris *= env([(0, 1), (RISER_END - 0.01, 1), (RISER_END, 0), (END, 0)])[:, None]
    place(sfx, norm(ris), 0.0, -21)
    cues.append(("sfx", round(RIS_IN, 2), f"riser (pink noise sweep + 110->440 Hz glide), stops dead at {RISER_END:.2f} s"))

    # the impact: Kenney boom (attack-aligned) + soft punch + a synthesised sub drop + a short crack into a hall
    boom = load("lowFrequency_explosion_000.ogg")
    a_b = attack(boom)
    place(sfx, fade(boom, 0, 0.8), IMPACT - a_b, -4)
    punch = lp(load("impactSoft_heavy_000.ogg"), 1600)
    a_p = attack(punch)
    place(sfx, punch, IMPACT - a_p, -6)
    n = int(2.6 * SR); tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 45 * np.exp(-tt * 5)) / SR) * np.exp(-tt * 1.4) * (1 - np.exp(-tt / 0.004))
    place(sfx, stereo(sub), IMPACT, -3)
    crack = hp(noise(int(0.06 * SR)), 1800) * np.exp(-np.arange(int(0.06 * SR)) / SR * 70)[:, None]
    crack = reverb(np.concatenate([crack, np.zeros((int(2.8 * SR), 2))]), wet=0.55, rt60=2.8, tone=7000)
    place(sfx, norm(crack), IMPACT, -9)
    cues += [("sfx", round(IMPACT - a_b, 3), f"Kenney low-frequency explosion, attack {a_b * 1000:.0f} ms aligned to the contact frame"),
             ("sfx", round(IMPACT - a_p, 3), "Kenney soft heavy impact (lp 1.6 kHz)"),
             ("sfx", round(IMPACT, 2), "synth sub drop 75 -> 30 Hz + noise crack into a 2.8 s hall")]

    # pull-back: a synthesised whoosh whose level and brightness follow the camera's speed (ease-in-out sine)
    PB0, PB1 = t_r(T.PULLBACK[0]), t_r(T.PULLBACK[1])
    q = np.clip((t - PB0) / (PB1 - PB0), 0, 1)
    vel = np.where((t >= PB0) & (t <= PB1), np.sin(np.pi * q), 0)  # d/dt of ease_in_out_sine
    wh = sweep_lp(noise(color="pink"), 250 + 2600 * vel ** 1.5, order=2)
    wh = hp(wh, 90) * (vel ** 1.6)[:, None]
    wh[:, 0] *= 1 + 0.35 * np.cos(np.pi * q)   # drifts left -> right with the carbon
    wh[:, 1] *= 1 - 0.35 * np.cos(np.pi * q)
    wh = reverb(wh, wet=0.3, rt60=1.6)[:N]
    place(sfx, norm(wh), 0.0, -13)
    cues.append(("sfx", round(PB0, 2), f"velocity-envelope whoosh under the pull-back, peaks {(PB0 + PB1) / 2:.2f} s"))

    # one soft shimmer as the C forms (nothing on the four dots)
    C_FORMED = t_r(T.MORPH[1])
    gl = load("glass_004.ogg", rate=0.84)
    gl = reverb(np.concatenate([lp(gl, 6000), np.zeros((int(2.2 * SR), 2))]), wet=0.6, rt60=2.4, tone=7000)
    place(sfx, fade(gl, 0, 1.0), C_FORMED - attack(gl), -21)
    cues.append(("sfx", round(C_FORMED, 2), "single soft shimmer as the C forms (Kenney glass, 0.84x, hall)"))

    # inverse zoom-through: a reversed swell sucks into the seam; a lighter sub thump as the card lands
    n = int(1.2 * SR)
    burst = hp(noise(int(0.05 * SR)), 400)
    tail = reverb(np.concatenate([burst, np.zeros((n, 2))]), wet=1.0, rt60=1.1, tone=6000)[:n]
    rev = tail[::-1]
    place(sfx, norm(rev) * env([(0, 0), (0.4, 0.2), (1.2, 1)], n)[:, None], SWAP - 1.2, -17)
    n = int(1.4 * SR); tt = np.arange(n) / SR
    thump = np.sin(2 * np.pi * np.cumsum(34 + 40 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 2.6) * (1 - np.exp(-tt / 0.003))
    place(sfx, stereo(thump), SWAP, -9)
    cues += [("sfx", round(SWAP - 1.2, 2), "reversed hall swell into the zoom seam"),
             ("sfx", round(SWAP, 2), "sub thump: the card lands (lighter than the fusion hit)")]
    sfx *= gap[:, None]

    # ---- balance and master: fixed stem trims, then ONE gain + a peak limiter so the stems sum to the mix
    stems = {"music": music * db(0), "sfx": sfx * db(0), "amb": amb * db(-4)}
    mix = sum(stems.values())
    write_wav(AUDIO / "_probe.wav", mix)
    lufs, tp, _ = loudness(AUDIO / "_probe.wav")
    g = db(TARGET_LUFS - lufs)
    for attempt in range(8):
        cand = {k: v * g for k, v in stems.items()}
        m = sum(cand.values())
        gc = limit_gain(m, db(-3.0))  # one gain curve applied to every stem, so stems still sum to the mix
        cand = {k: v * gc[:, None] for k, v in cand.items()}
        m = sum(cand.values())
        write_wav(AUDIO / "_probe.wav", m)
        lufs, tp, lra = loudness(AUDIO / "_probe.wav")
        print(f"  master pass {attempt}: {lufs:.2f} LUFS, TP {tp:.2f} dBTP, LRA {lra:.1f}")
        if abs(lufs - TARGET_LUFS) <= 0.2 and tp <= -2.0:
            break
        g *= db(TARGET_LUFS - lufs)
    (AUDIO / "_probe.wav").unlink()
    for k, v in cand.items():
        write_wav(AUDIO / f"{k}.wav", v)
    write_wav(AUDIO / "mix.wav", m)
    lufs, tp, lra = loudness(AUDIO / "mix.wav")
    print(f"mix: {lufs:.1f} LUFS integrated, TP {tp:.1f} dBTP, LRA {lra:.1f} LU")
    (AUDIO / "cues.json").write_text(json.dumps(
        {"integrated_lufs": lufs, "true_peak_dbtp": tp, "lra": lra,
         "cues": [{"stem": s, "t": tt_, "what": w} for s, tt_, w in sorted(cues, key=lambda c: c[1])]}, indent=1))
    return cues


# ------------------------------------------------------------------ FCPXML (structure only; Lua adds the rest)
def ft(frames):
    return f"{int(frames)}/{FPS}s" if frames else "0s"


def url(p):
    return "file://" + urllib.parse.quote(str(p))


def manim_path(a):
    return WORK / "manim" / f"star-forge-c-{a}.mp4"


def fcpxml(aspect):
    w, h = ASPECTS[aspect]
    tot = T.TOTAL_R
    res = [f'    <format id="r1" name="FFVideoFormat{h}p30" frameDuration="1/{FPS}s" width="{w}" height="{h}" colorSpace="1-1-1 (Rec. 709)"/>',
           f'    <asset id="rv" name="star-forge-c-{aspect}" uid="rv-c-{aspect}" start="0s" duration="{ft(T.TOTAL_M)}" hasVideo="1" format="r1" videoSources="1">\n'
           f'      <media-rep kind="original-media" src="{url(manim_path(aspect))}"/>\n    </asset>']
    if aspect == "16x9":
        res.append(f'    <asset id="rb" name="black-16x9" uid="rb-c" start="0s" duration="{ft(600)}" hasVideo="1" format="r1" videoSources="1">\n'
                   f'      <media-rep kind="original-media" src="{url(WORK / "media" / "black-16x9.mp4")}"/>\n    </asset>')
    for k, stem in enumerate(("music", "sfx", "amb")):
        res.append(f'    <asset id="ra{k}" name="{stem}" uid="ra{k}-c-{aspect}" start="0s" duration="{ft(tot)}" hasAudio="1" audioSources="1" audioChannels="2" audioRate="{SR}">\n'
                   f'      <media-rep kind="original-media" src="{url(AUDIO / (stem + ".wav"))}"/>\n    </asset>')
    conn = []
    if aspect == "16x9":
        conn += [f'        <asset-clip ref="rb" lane="{ln}" offset="0s" name="letterbox-{nm}" start="0s" duration="{ft(tot)}" format="r1"/>'
                 for ln, nm in ((1, "top"), (2, "bottom"))]
    conn += [f'        <asset-clip ref="ra{k}" lane="-{k + 1}" offset="0s" name="{stem}" start="0s" duration="{ft(tot)}" audioRole="effects"/>'
             for k, stem in enumerate(("music", "sfx", "amb"))]
    spine = [f'      <gap name="head" offset="0s" start="0s" duration="{ft(T.HEAD)}">\n' + "\n".join(conn) + '\n      </gap>']
    for name, a, b, _ in T.SECTIONS:
        spine.append(f'      <asset-clip ref="rv" offset="{ft(T.r(a))}" name="{name}" start="{ft(a)}" duration="{ft(b - a)}" format="r1" tcFormat="NDF"/>')
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
{chr(10).join(res)}
  </resources>
  <library>
    <event name="star-forge style C">
      <project name="star-forge STYLE-C {aspect}">
        <sequence format="r1" duration="{ft(tot)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
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
    p = TL / f"style-c-{aspect}.fcpxml"
    p.write_text(xml)
    return p


# ------------------------------------------------------------------ Lua plan
def lua_plan():
    q = lambda s: '"' + s + '"'  # noqa: E731
    L = ["local PLAN = {",
         f"  fps = {FPS}, head = {T.HEAD}, total = {T.TOTAL_R}, bar = {BAR},",
         "  fadeIn = 36,  -- frames: the picture fades up from black under the rumble",
         "  clips = {"]
    for name, a, b, look in T.SECTIONS:
        L.append(f"    {{ name = {q(name)}, s = {a}, e = {b}, rec = {T.r(a)}, look = {q(look)} }},")
    L += ["  },",
          "  -- the fusion hit: Brightness Flash (pure-Fusion template), centred on the contact frame",
          f"  flash = {{ after = 2, type = \"Brightness Flash\", dur = 8 }},",
          "}"]
    block = "\n".join(L)
    src = LUA.read_text()
    new = re.sub(r"-- BEGIN PLAN.*?-- END PLAN",
                 "-- BEGIN PLAN (generated by make_style_c.py from timing.py; edit there)\n" + block + "\n-- END PLAN", src, flags=re.S)
    LUA.write_text(new)


# ------------------------------------------------------------------ preview (sync check only)
def preview(aspect):
    out = WORK / f"preview-{aspect}.mp4"
    w, h = ASPECTS[aspect]
    run(["ffmpeg", "-v", "error", "-y", "-i", manim_path(aspect), "-i", AUDIO / "mix.wav",
         "-filter_complex", f"[0:v]tpad=start={T.HEAD}:color=black,format=yuv420p[v]",
         "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "256k", "-shortest", out])
    print("preview:", out)


if __name__ == "__main__":
    build_audio()
    for a in ASPECTS:
        fcpxml(a)
    lua_plan()
    if "--no-preview" not in sys.argv:
        for a in ASPECTS:
            preview(a)
