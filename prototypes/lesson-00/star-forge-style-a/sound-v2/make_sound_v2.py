"""PROTOTYPE (throwaway): star-forge Style A, sound v2. Three gentle, fully self-synthesised alternatives.

  v1-hush           a soft warm low pad that breathes with the beats + one low swell under the fusion
                    + one gentle low tone when the card lands. Nothing else.
  v2-ambient-score  slow warm chords (band-limited triangle-ish pads, soft reverb, low-passed), quiet opening,
                    gentle rise to the fusion, soft resolve on the C, warm sustain under the card; the four dots
                    are soft felt/marimba plucks that are notes of the chord.
  v3-soft-sfx       style A's cue map, tamed: very quiet low wind bed, muffled low thump on contact, soft low
                    swell for the C (replaces the glass), four soft low plucks, a soft low bell for the card.

Design guards (by construction, then verified by measure_v2.py):
  * no oscillator partial above 1.1 kHz anywhere (so no pure tone above 1.2 kHz);
  * every event attack is a raised cosine >= 16 ms (10-90 % rise >= ~9 ms);
  * master = high-pass 30 Hz + 8th-order low-pass (1.5 kHz v1, 2.5 kHz v2/v3) + fade in 1.2 s / out 1.8 s
    + ONE static gain to -23 LUFS (must be within +-6 dB). No limiter, no compressor: gain reduction is 0 dB.
Cue frames come from ../audio/cues.json (style A's cue map), so picture and sound stay locked.

Run (from this folder):  ../../star-forge-manim/.venv/bin/python -I make_sound_v2.py
Then:                    ../../star-forge-manim/.venv/bin/python -I measure_v2.py
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

HERE = Path(__file__).resolve().parent
STYLE = HERE.parent
FPS, SR = 30, 48000
TARGET_LUFS = -23.0
MAX_GAIN_DB = 6.0
PARTIAL_MAX_HZ = 1100.0
FADE_IN, FADE_OUT = 1.2, 1.8
FONT = STYLE.parent / "star-forge-manim" / "fonts" / "SpaceGrotesk-wght.ttf"
PICTURE = {a: STYLE / "out" / f"star-forge-style-a-{a}-ORIGINAL.mp4" for a in ("16x9", "9x16")}

CUES = json.loads((STYLE / "audio" / "cues.json").read_text())
T_END = CUES["duration_s"]
N = int(round(T_END * SR))
BEATS = json.loads((STYLE / "out" / "manim" / "beats-16x9.json").read_text())["beats"]


def frame_t(f):
    return f / FPS


_fx = [c for c in CUES["cues"] if c["stem"] != "amb"]
T_CONTACT = frame_t(_fx[0]["hit_frame"])           # 188
T_C = frame_t(_fx[1]["hit_frame"])                 # 448 (was the glass)
T_DOTS = [frame_t(c["hit_frame"]) for c in _fx[2:6]]  # 478 490 502 514
T_CARD = frame_t(_fx[6]["hit_frame"])              # 572
B = {k: v for k, v in BEATS.items()}


# ---------------------------------------------------------------- helpers
def db(x):
    return 10 ** (x / 20)


def lp(x, hz, order=4, zero_phase=False):
    sos = butter(order, hz, "low", fs=SR, output="sos")
    return (sosfiltfilt if zero_phase else sosfilt)(sos, x, axis=0)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def tvec(dur):
    return np.arange(int(round(dur * SR))) / SR


def raised(t, dur):
    """0 -> 1 raised-cosine ramp over dur seconds (smooth, zero slope at both ends)."""
    return 0.5 - 0.5 * np.cos(np.pi * np.clip(t / dur, 0, 1))


def automation(points, n=N):
    """Smooth gain curve (linear) through (time_s, dB) points with raised-cosine segments."""
    t = np.arange(n) / SR
    ts = np.array([p[0] for p in points]); ds = np.array([p[1] for p in points])
    i = np.clip(np.searchsorted(ts, t, side="right") - 1, 0, len(ts) - 2)
    u = np.clip((t - ts[i]) / (ts[i + 1] - ts[i]), 0, 1)
    u = 0.5 - 0.5 * np.cos(np.pi * u)
    return db(ds[i] + (ds[i + 1] - ds[i]) * u)


def osc(f, t, rng, rolloff=2.0, partials_hz=PARTIAL_MAX_HZ, detune_c=0.0, odd_bias=0.6):
    """Band-limited warm tone: partials k*f (k*f <= partials_hz), amplitude 1/k^rolloff, even partials
    scaled by odd_bias (triangle-ish), random phases. Returns mono."""
    f = f * 2 ** (detune_c / 1200)
    out = np.zeros_like(t)
    k = 1
    while k * f <= partials_hz:
        a = 1 / k ** rolloff * (odd_bias if k % 2 == 0 else 1.0)
        out += a * np.sin(2 * np.pi * k * f * t + rng.uniform(0, 2 * np.pi))
        k += 1
    return out


def noise(n, rng, color="brown"):
    w = rng.standard_normal(n)
    if color == "brown":
        x = np.cumsum(w); x = hp(x, 20, 2)
    else:  # pink-ish
        x = lp(w, 1000, 1) + 0.3 * w
    return x / (np.abs(x).max() + 1e-12)


def stereo(m, p=0.0):
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1) * np.sqrt(2)


def add(bus, x, i0):
    i0 = int(round(i0))
    if i0 < 0:
        x, i0 = x[-i0:], 0
    j = min(len(bus), i0 + len(x))
    if j > i0:
        bus[i0:j] += x[: j - i0]


def reverb(x, wet=0.3, rt60=2.6, tone=1800, predelay=0.025, seed=11):
    """Synthetic, dark stereo hall: exponentially decaying noise IR, low-passed at `tone`."""
    rng = np.random.default_rng(seed)
    n = int(rt60 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-6.9 * t / rt60)[:, None]
    ir = lp(lp(ir, tone, 4), tone, 4)
    ir[: int(predelay * SR)] = 0
    ir[int(predelay * SR):int(predelay * SR) + 480] *= np.linspace(0, 1, 480)[:, None]  # no IR click
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + y * wet


# ---------------------------------------------------------------- instruments
def pad_note(f, t0, t1, att, rel, gain_db, rng, pan=0.0, detune_c=4.0, rolloff=2.2, partials_hz=PARTIAL_MAX_HZ):
    """One sustained pad note, two detuned voices (L/R) for gentle width, slow random breathing."""
    dur = (t1 - t0) + rel
    t = tvec(dur)
    env = raised(t, att) * np.where(t > t1 - t0, 1 - raised(t - (t1 - t0), rel), 1.0)
    breathe = 1 + 0.08 * np.sin(2 * np.pi * rng.uniform(0.07, 0.13) * t + rng.uniform(0, 6.28))
    l = osc(f, t, rng, rolloff, partials_hz, -detune_c)
    r = osc(f, t, rng, rolloff, partials_hz, +detune_c)
    x = np.stack([l, r], axis=1) * (env * breathe * db(gain_db))[:, None]
    if pan:
        x = stereo(x.mean(axis=1), pan)
    return x, int(round(t0 * SR))


def chord(bus, freqs, t0, t1, att, rel, gain_db, rng, **kw):
    for k, f in enumerate(freqs):
        x, i0 = pad_note(f, t0, t1, att, rel, gain_db - 3.0 * np.log2(len(freqs)), rng, **kw)
        add(bus, x, i0)


def pluck(f0, rng, att=0.016, dur=2.6, tau=0.7, felt=0.12):
    """Soft felt/marimba pluck: fundamental + rolled-off quick-decaying 2nd/4th partials (only if <= 1.1 kHz)
    + a tiny low-passed felt thud. Raised-cosine attack `att`. Returns (stereo, anchor index = attack midpoint)."""
    t = tvec(dur)
    a = raised(t, att)
    s = np.sin(2 * np.pi * f0 * t) * np.exp(-t / tau)
    for k, g, tk in ((2, 0.10, 0.22), (3, 0.025, 0.12), (4, 0.06, 0.10)):
        if k * f0 <= PARTIAL_MAX_HZ:
            s += g * np.sin(2 * np.pi * k * f0 * t + rng.uniform(0, 6.28)) * np.exp(-t / tk)
    th = lp(noise(len(t), rng, "brown"), 500, 4) * np.exp(-t / 0.035) * felt
    s = (s + th) * a
    s *= np.where(t > dur - 0.3, 1 - raised(t - (dur - 0.3), 0.3), 1.0)  # end at exact zero
    return np.stack([s, s], axis=1), int(round(att / 2 * SR))


def swell(rng, rise, fall_tau, f_tones=(55.0, 110.0), noise_lp=260.0, noise_g=0.35, total=None):
    """Low swell with no transient: raised-cosine rise of `rise` s to a crest, then a smooth exponential
    fall. Tones + low-passed brown noise. Returns (stereo, anchor index = crest)."""
    total = total or rise + 7 * fall_tau
    t = tvec(total)
    rise_env = raised(t, rise)
    fall = np.exp(-np.maximum(t - rise, 0) / fall_tau)
    # round the crest: blend the corner over 150 ms
    k = int(0.15 * SR)
    env = rise_env * fall
    env = np.convolve(env, np.hanning(k) / np.hanning(k).sum(), mode="same")
    env *= np.where(t > total - 0.5, 1 - raised(t - (total - 0.5), 0.5), 1.0)
    m = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) / (i + 1) for i, f in enumerate(f_tones))
    m = m / len(f_tones) + noise_g * lp(noise(len(t), rng, "brown"), noise_lp, 4)
    x = np.stack([m, np.roll(m, 240)], axis=1) * env[:, None]  # 5 ms inter-channel offset: soft width
    return x, int(np.argmax(env))


def thump(rng, att=0.020, dur=2.0):
    """Muffled low thump: pitch-gliding sine 92 -> 52 Hz + low brown noise, low-passed at 300 Hz,
    raised-cosine attack >= 20 ms. Returns (stereo, anchor = attack midpoint)."""
    t = tvec(dur)
    f = 52 + 40 * np.exp(-t / 0.12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.45) + 0.25 * np.sin(2 * ph) * np.exp(-t / 0.18)
    nz = lp(noise(len(t), rng, "brown"), 220, 4) * np.exp(-t / 0.12) * 0.6
    s = (body + nz) * raised(t, att)
    s *= np.where(t > dur - 0.4, 1 - raised(t - (dur - 0.4), 0.4), 1.0)
    s = lp(s, 300, 4)
    return np.stack([s, s], axis=1), int(round(att / 2 * SR))


def bell(f0, rng, att=0.025, dur=5.0):
    """Soft low bell-like tone: inharmonic partial set (bell-ish ratios), all partials <= 1.1 kHz,
    long decay for the low ones, quick for the upper. Returns (stereo, anchor = attack midpoint)."""
    t = tvec(dur)
    s = np.zeros_like(t)
    for r, g, tau in ((0.5, 0.35, 2.6), (1.0, 1.0, 1.9), (2.0, 0.30, 1.1), (2.76, 0.12, 0.6), (4.07, 0.05, 0.35),
                      (5.4, 0.025, 0.25)):
        if r * f0 <= PARTIAL_MAX_HZ:
            s += g * np.sin(2 * np.pi * r * f0 * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    s *= raised(t, att)
    s *= np.where(t > dur - 0.6, 1 - raised(t - (dur - 0.6), 0.6), 1.0)
    return np.stack([s, s * 0.98], axis=1), int(round(att / 2 * SR))


def low_tone(f0, rng, att=0.12, dur=6.0, tau=2.2):
    """Gentle low tone (v1 card): warm band-limited tone, slow 120 ms attack, long decay."""
    t = tvec(dur)
    s = osc(f0, t, rng, rolloff=2.6, partials_hz=800.0) * raised(t, att) * np.exp(-t / tau)
    s *= np.where(t > dur - 0.8, 1 - raised(t - (dur - 0.8), 0.8), 1.0)
    return np.stack([s, s], axis=1), int(round(att / 2 * SR))


def place(bus, ev, t_hit, gain_db, log, name, kind, band):
    x, anchor = ev
    add(bus, x * db(gain_db), t_hit * SR - anchor)
    log.append({"name": name, "t_s": round(t_hit, 4), "frame": round(t_hit * FPS, 2), "kind": kind,
                "band_hz": band, "gain_db": gain_db})


# ---------------------------------------------------------------- notes (Hz), key of D
D2, E2, G2, A2, B2 = 73.42, 82.41, 98.00, 110.00, 123.47
D3, E3, Fs3, G3, A3, B3 = 146.83, 164.81, 185.00, 196.00, 220.00, 246.94
D4, E4, Fs4, A4 = 293.66, 329.63, 369.99, 440.00


def v1_hush(rng):
    bus = np.zeros((N, 2)); log = []
    # one long open-fifth pad, D2 A2 D3 A3, partials <= 1.1 kHz, warm roll-off; "breathes" with the beats
    chord(bus, [D2, A2, D3, A3], 0.0, T_END, 1.5, 0.5, -20.0, rng, detune_c=3.0, rolloff=2.6)
    breath = automation([
        (0.0, -3), (B["he_in"], -2.5), (B["drift"], -1.5), (B["rush"] - 0.4, 0.0), (B["contact"], 0.0),
        (B["eq_write"], -1.5), (B["pullback"], -2.5), (B["cell"], -5.0), (B["morph"], -3.5),
        (T_C, -2.0), (B["rise"], -2.0), (T_CARD, -1.5), (B["hold"], -2.0), (T_END, -2.5)])
    bus *= breath[:, None]
    ev = np.zeros((N, 2))
    place(ev, swell(rng, rise=1.4, fall_tau=1.3, f_tones=(D2 / 2 * 1.5, A2, D3), noise_lp=240, noise_g=0.3),
          T_CONTACT, -13.0, log, "fusion swell (crest on contact)", "crest", [40, 250])
    place(ev, low_tone(D3, rng), T_CARD, -19.0, log, "card low tone D3", "onset", [130, 165])
    return bus, ev, 1500.0, log


def v2_score(rng):
    pad = np.zeros((N, 2)); dots = np.zeros((N, 2)); low = np.zeros((N, 2)); log = []
    x_fade = 1.2  # chords overlap/crossfade over >= 1 s; attacks >= 0.6 s
    secs = [  # (start, end, voicing, level dB)
        (0.0, B["he_in"] + 0.6, [D3, A3, E4], -25.0),                     # quiet opening, Dadd9 (no 3rd)
        (B["he_in"], B["drift"] + 0.6, [B2, Fs3, A3, D4], -24.0),        # Bm7: the 4He arrive
        (B["drift"], B["rush"], [G2, D3, A3, B3], -22.0),                 # Gadd9: drawing together
        (B["rush"] - 0.6, B["eq_write"] + 0.8, [A2, E3, A3, D4], -20.5),   # Asus4: gentle rise to the fusion
        (B["contact"] - 0.1, B["pullback"] + 0.8, [E2, B2, G3, D4, Fs4], -22.5),  # Em9 under the equation
        (B["pullback"], B["morph"] + 0.6, [A2, E3, G3, D4], -26.0),       # A7sus4, quiet, pull-back
        (T_C - 0.35, B["card"] + 0.8, [D2, A2, Fs3, A3, E4], -22.5),      # soft resolve on the C: Dadd9
        (B["card"] - 0.4, T_END, [D2, A2, D3, Fs3, A3, E4], -22.0),       # warm sustain under the card
    ]
    for t0, t1, notes, g in secs:
        chord(pad, notes, max(0.0, t0), t1, att=max(0.6, min(1.4, (t1 - t0) / 3)), rel=x_fade, gain_db=g,
              rng=rng, detune_c=4.0, rolloff=2.2)
    pad = reverb(pad, wet=0.30, rt60=2.8, tone=1800)
    # gentle rise into the fusion and settle after; the contact is the softest possible "arrival"
    arc = automation([(0.0, -2), (B["he_in"], -1.5), (B["drift"], -0.5), (B["rush"], 1.0), (B["contact"], 1.5),
                      (B["eq_write"], 0.0), (B["pullback"], -0.5), (B["cell"], -2.0), (T_C, 0.0),
                      (B["rise"], 0.0), (T_CARD, 0.5), (T_END, 0.0)])
    pad *= arc[:, None]
    place(low, swell(rng, rise=1.4, fall_tau=1.2, f_tones=(A2 / 2, A2, E3), noise_lp=220, noise_g=0.25),
          T_CONTACT, -13.0, log, "fusion low swell (crest on contact)", "crest", [40, 250])
    # four dots = an arpeggio of the D chord the pad is holding: A3 D4 F#4 A4 (220-440 Hz)
    for k, (f0, p) in enumerate([(A3, 0.0), (D4, 0.3), (Fs4, 0.0), (A4, -0.3)]):
        ev = pluck(f0, rng)
        place(dots, (stereo(ev[0].mean(axis=1), p), ev[1]), T_DOTS[k], -17.0, log,
              f"dot {k + 1} pluck {f0:.0f} Hz", "onset", [f0 * 0.9, f0 * 1.1])
    dots = reverb(dots, wet=0.28, rt60=2.2, tone=1600, seed=5)
    return pad, low + dots, 2500.0, log


def v3_sfx(rng):
    bed = np.zeros((N, 2)); fx = np.zeros((N, 2)); log = []
    # very quiet low wind: brown noise through a slowly wandering band-pass (gusts), plus a soft D2/A2 hum
    w = np.zeros((N, 2))
    for c in range(2):
        nz = noise(N, rng, "brown")
        w[:, c] = bp(nz, 120, 700, 2)
    gust = 1 + 0.35 * np.sin(2 * np.pi * 0.09 * np.arange(N) / SR) + 0.2 * np.sin(2 * np.pi * 0.23 * np.arange(N) / SR + 1.3)
    w = lp(w, 1200, 4) * gust[:, None]
    w /= np.sqrt((w ** 2).mean()) + 1e-12
    bed += w * db(-34)
    t = np.arange(N) / SR
    hum = (np.sin(2 * np.pi * D2 * t) + 0.5 * np.sin(2 * np.pi * A2 * t + 1)) * (1 + 0.1 * np.sin(2 * np.pi * 0.11 * t))
    bed += stereo(hum, 0) * db(-36)
    # 1. fusion contact: muffled low thump (+ dark short room)
    place(fx, thump(rng), T_CONTACT, -17.0, log, "contact thump", "onset", [40, 160])
    # 2. nucleus -> C: soft low swell instead of the glass (crest when the C is legible)
    place(fx, swell(rng, rise=T_C - B["morph"], fall_tau=0.9, f_tones=(D3, A3, D4), noise_lp=450, noise_g=0.25),
          T_C, -18.0, log, "C swell (crest at C legible)", "crest", [130, 460])
    # 3. dots: soft low plucks (same pitches as v2: A3 D4 F#4 A4)
    for k, (f0, p) in enumerate([(A3, 0.0), (D4, 0.3), (Fs4, 0.0), (A4, -0.3)]):
        ev = pluck(f0, rng)
        place(fx, (stereo(ev[0].mean(axis=1), p), ev[1]), T_DOTS[k], -22.0, log,
              f"dot {k + 1} pluck {f0:.0f} Hz", "onset", [f0 * 0.9, f0 * 1.1])
    # 4. card: soft low bell on D3 (partials 73, 147, 294, 405, 598, 793 Hz), low-passed 2 kHz by the master
    place(fx, bell(D3, rng), T_CARD, -17.0, log, "card bell D3", "onset", [130, 165])
    fx = reverb(fx, wet=0.25, rt60=2.0, tone=1500, seed=9)
    return bed, fx, 2000.0, log


# ---------------------------------------------------------------- master + io
def master(x, lp_hz):
    x = hp(x, 30, 2)
    x = lp(x, lp_hz, 8)
    t = np.arange(len(x)) / SR
    env = raised(t, FADE_IN) * (1 - raised(t - (T_END - FADE_OUT), FADE_OUT))
    env[-1] = 0.0
    return x * env[:, None]


def write_wav(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f64le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", str(path)], input=np.ascontiguousarray(x).tobytes(), check=True)


def integrated(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))


def mux(wav, aspect, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(PICTURE[aspect]), "-i", str(wav),
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                    "-ar", str(SR), "-ac", "2", "-movflags", "+faststart", str(out)], check=True)


def slate_png(text, path):
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (1920, 1080), (0, 0, 0))
    f = ImageFont.truetype(str(FONT), 96)
    try:
        f.set_variation_by_name("Medium")
    except Exception:
        pass
    d = ImageDraw.Draw(img)
    w = d.textlength(text, font=f)
    d.text(((1920 - w) / 2, 1080 / 2 - 60), text, font=f, fill=(235, 235, 235))
    img.save(path)


def compare(variants):
    tmp = HERE / "_slates"; tmp.mkdir(exist_ok=True)
    args, filt, labels = [], [], []
    k = 0
    for i, (name, label) in enumerate(variants):
        png = tmp / f"slate{i + 1}.png"; slate_png(label, png)
        args += ["-loop", "1", "-framerate", str(FPS), "-t", "1", "-i", str(png),
                 "-f", "lavfi", "-t", "1", "-i", f"anullsrc=r={SR}:cl=stereo",
                 "-i", str(PICTURE["16x9"]), "-i", str(HERE / f"{name}.wav")]
        filt.append(f"[{k}:v]format=yuv420p,setsar=1,fps={FPS}[s{i}];[{k + 2}:v]format=yuv420p,setsar=1[p{i}]")
        labels.append(f"[s{i}][{k + 1}:a][p{i}][{k + 3}:a]")
        k += 4
    fc = ";".join(filt) + ";" + "".join(labels) + f"concat=n={2 * len(variants)}:v=1:a=1[v][a]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(HERE / "compare-16x9.mp4")],
                   check=True)
    for p in tmp.iterdir():
        p.unlink()
    tmp.rmdir()


def main():
    report = {"target_lufs": TARGET_LUFS, "fade_in_s": FADE_IN, "fade_out_s": FADE_OUT, "duration_s": T_END,
              "variants": {}}
    for name, fn, seed in (("v1-hush", v1_hush, 1), ("v2-ambient-score", v2_score, 2), ("v3-soft-sfx", v3_sfx, 3)):
        bed, ev, lp_hz, log = fn(np.random.default_rng(seed))
        bed, ev = master(bed, lp_hz), master(ev, lp_hz)  # linear chain, so bed + events = the mastered mix
        mix = bed + ev
        probe = HERE / f"_{name}.wav"
        write_wav(probe, mix)
        g = TARGET_LUFS - integrated(probe)
        probe.unlink()
        assert abs(g) <= MAX_GAIN_DB, f"{name}: master gain {g:+.1f} dB exceeds +-{MAX_GAIN_DB} dB; retune trims"
        out = mix * db(g)
        peak = 20 * np.log10(np.abs(out).max())
        write_wav(HERE / f"{name}.wav", out)
        (HERE / "stems").mkdir(exist_ok=True)
        write_wav(HERE / "stems" / f"{name}-bed.wav", bed * db(g))
        write_wav(HERE / "stems" / f"{name}-events.wav", ev * db(g))
        for a in ("16x9", "9x16"):
            mux(HERE / f"{name}.wav", a, HERE / f"{name}-{a}.mp4")
        report["variants"][name] = {"master_gain_db": round(g, 2), "master_lowpass_hz": lp_hz,
                                    "sample_peak_dbfs": round(peak, 2), "limiter": "none", "cues": log}
        print(f"{name}: master gain {g:+.2f} dB, sample peak {peak:.2f} dBFS")
    compare([("v1-hush", "1 hush"), ("v2-ambient-score", "2 ambient score"), ("v3-soft-sfx", "3 soft sfx")])
    (HERE / "build.json").write_text(json.dumps(report, indent=1))
    print("wrote build.json, compare-16x9.mp4")


if __name__ == "__main__":
    main()
