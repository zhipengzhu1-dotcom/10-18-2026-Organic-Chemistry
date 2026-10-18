"""PROTOTYPE (throwaway): Style A sound design for star-forge, mixed offline.

Five quiet cues, each tied to a visible event, read from the Manim beat log (out/manim/beats-16x9.json):
  1. ambience bed (space wind + sub hum), fades in with the picture, fades over the last 1 s
  2. ONE soft impact on the fusion contact frame (soft punch + a low-passed boom tail)
  3. a glass shimmer as the nucleus becomes the letter C
  4. four very quiet synthesised sine "tings" for the valence dots (rising A5 B5 C#6 E6)
  5. a soft confirmation chime when the card starts to write on
The approach and the pull-back are silent on purpose.
Every cue is placed by its TRANSIENT (first sample within 30 dB of its peak), not its file start.
Writes audio/{amb,fx,ui}.wav (unity faders sum to mix.wav, -16 LUFS integrated) + audio/cues.json.

Run: ../star-forge-manim/.venv/bin/python -I make_audio_a.py
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = Path(__file__).resolve().parent
SFX = HERE / "sfx"
AUDIO = HERE / "audio"
FPS, SR = 30, 48000
TARGET_LUFS = -16.0
TP_CEIL = -2.0  # WAV true-peak ceiling: leaves 0.5 dB for AAC overshoot under the -1.5 dBTP delivery limit

BEATS = json.loads((HERE / "out" / "manim" / "beats-16x9.json").read_text())["beats"]


def fr(t):  # snap a scene time to its frame start
    return round(t * FPS) / FPS


def load(name, rate=1.0):
    af = [f"asetrate={int(SR * rate)}", f"aresample={SR}"] if rate != 1.0 else []
    cmd = ["ffmpeg", "-v", "error", "-i", SFX / name, "-ac", "2", "-ar", str(SR)] + (["-af", ",".join(af)] if af else [])
    raw = subprocess.run(cmd + ["-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def db(x):
    return 10 ** (x / 20)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def norm(x):
    return x / (np.abs(x).max() + 1e-12)


def fade(x, fin=0.0, fout=0.0):
    x = x.copy(); n = len(x)
    if fin:
        k = min(n, int(fin * SR)); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    if fout:
        k = min(n, int(fout * SR)); x[n - k:] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    return x


def pan(x, p):
    m = x.mean(axis=1); a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1) * np.sqrt(2)


def reverb(x, wet=0.35, rt60=2.2, tone=6000, tail=2.5):
    x = np.concatenate([x, np.zeros((int(tail * SR), 2))])
    rng = np.random.default_rng(7)
    n = int(rt60 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-6.9 * t / rt60)[:, None]
    ir[: int(0.015 * SR)] = 0
    ir = lp(ir, tone); ir /= np.sqrt((ir ** 2).sum(axis=0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + y * wet


def attack(x, rel_db=-30.0):
    """Seconds from file start to the perceived transient: first sample within rel_db of the peak."""
    a = np.abs(x).max(axis=1)
    return int(np.argmax(a >= a.max() * db(rel_db))) / SR


def place(bus, x, t_hit, gain_db, cues, stem, what):
    """Put x so its transient lands exactly on t_hit (seconds)."""
    off = attack(x)
    i = int(round((t_hit - off) * SR))
    x = x * db(gain_db)
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(bus), i + len(x))
    bus[i:j] += x[: j - i]
    cues.append({"stem": stem, "hit_s": round(t_hit, 4), "hit_frame": round(t_hit * FPS, 2),
                 "file_start_s": round(t_hit - off, 4), "gain_db": gain_db, "what": what})


def ting(f0, dur=1.4):
    """Self-synthesised soft bell: sine + quiet 2nd/3rd partials, 4 ms attack, exponential decay."""
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(t / 0.004, 1) * np.exp(-t / 0.32)
    s = (np.sin(2 * np.pi * f0 * t) + 0.18 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t / 0.12)
         + 0.06 * np.sin(2 * np.pi * 3.01 * f0 * t) * np.exp(-t / 0.08)) * env
    return np.stack([s, s], axis=1)


def level_out(x, win=0.5, max_boost_db=8.0):
    from scipy.ndimage import uniform_filter1d
    p_ = uniform_filter1d(uniform_filter1d((x ** 2).mean(axis=1), size=int(win * SR)), size=int(win * SR))
    rms = np.sqrt(np.maximum(p_, 1e-12))
    return x * np.minimum(np.median(rms) / rms, db(max_boost_db))[:, None]


def limit_gain(x, ceiling, look_ms=5.0, release_ms=150.0):
    """Look-ahead peak limiter gain curve for x (ceiling = linear sample peak). Returned, not applied,
    so the SAME curve can be applied to every stem (linked): the stems then still sum to the limited mix."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    w = int(look_ms / 1000 * SR)
    a = np.abs(x).max(axis=1)
    g = np.minimum(1.0, ceiling / np.maximum(a, 1e-12))
    g = minimum_filter1d(g, size=2 * w + 1)
    r = int(release_ms / 1000 * SR)
    g = minimum_filter1d(g, size=r, origin=-(r // 2) + 1)  # hold, then the smoothing below makes the release
    return uniform_filter1d(g, size=w + 1)[:, None]


def write_wav(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", path], input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    return (float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)),
            float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1)))


def main():
    AUDIO.mkdir(exist_ok=True)
    T = fr(BEATS["end"])
    n = int(T * SR)
    amb, fx, ui = (np.zeros((n, 2)) for _ in range(3))
    cues = []

    # 1. bed: steady stretches of the wind chained with crossfades, low-passed; plus a sub hum
    full = load("space-wind_0.mp3")
    wind, ov = np.zeros((0, 2)), int(0.8 * SR)
    segs = [(5.8, 8.2), (10.4, 12.8), (15.0, 17.6), (19.4, 22.0), (24.2, 26.2), (32.2, 34.8),
            (40.0, 42.2), (44.0, 46.2)]
    for a, b in segs * 3:
        seg = full[int(a * SR):int(b * SR)]
        if len(wind) == 0:
            wind = seg; continue
        r = np.linspace(0, np.pi / 2, ov)[:, None]
        wind = np.concatenate([wind[:-ov], wind[-ov:] * np.cos(r) + seg[:ov] * np.sin(r), seg[ov:]])
        if len(wind) >= n:
            break
    assert len(wind) >= n, "bed too short"
    wind = level_out(lp(hp(wind[:n], 60), 800, order=4))
    hum_src = load("spaceEngineLow_000.ogg", rate=0.6)
    reps = int(np.ceil(n / (len(hum_src) - SR))) + 1
    hum = np.zeros((0, 2))
    for _ in range(reps):  # 1 s crossfaded loop
        if len(hum) == 0:
            hum = hum_src; continue
        r = np.linspace(0, np.pi / 2, SR)[:, None]
        hum = np.concatenate([hum[:-SR], hum[-SR:] * np.cos(r) + hum_src[:SR] * np.sin(r), hum_src[SR:]])
    hum = lp(hum[:n], 240, order=4)
    bed = fade(norm(wind) * db(-6) + norm(hum) * db(-12), fin=1.0, fout=1.0)  # with the picture fade-up; last 1 s
    amb += bed * db(-21)
    cues.append({"stem": "amb", "hit_s": 0.0, "what": "space-wind bed + sub hum; fade in 1.0 s, fade out over the last 1.0 s"})

    # 2. fusion contact: one soft impact (punch + low-passed boom body), transient on the contact frame
    t_contact = fr(BEATS["contact"])
    punch = lp(load("impactSoft_heavy_000.ogg"), 2200)
    boom = fade(lp(load("lowFrequency_explosion_000.ogg"), 300, order=4), 0, 1.2)
    pre = SR // 2  # both layers' transients line up 0.5 s into the composite
    hit = np.zeros((pre + max(len(punch), len(boom)), 2))
    for x, g in ((punch, 0.0), (boom, -10.0)):
        i = pre - int(attack(x) * SR)
        hit[i:i + len(x)] += norm(x) * db(g)
    hit = reverb(hit, wet=0.25, rt60=1.8, tone=3000, tail=1.5)
    hit = hit * limit_gain(hit, np.abs(hit).max() * db(-9), look_ms=2.0, release_ms=30.0)  # shave the click, keep the body
    place(fx, fade(hit, 0, 0.8), t_contact, -8.0, cues, "fx", "soft impact on the fusion contact frame (+ the Resolve flash)")

    # 3. nucleus -> C: glass shimmer, transient when the C becomes legible (~0.45 s into the FadeTransform)
    t_c = fr(BEATS["morph"] + 0.45)
    glass = reverb(hp(load("glass_004.ogg"), 600), wet=0.55, rt60=2.4, tone=8000)
    place(fx, fade(glass, 0, 1.5), t_c, -20.0, cues, "fx", "glass shimmer as the nucleus becomes the letter C")

    # 4. valence dots: four quiet synthesised tings, rising, panned with their dots (top, right, bottom, left)
    for k, (f0, p) in enumerate([(880.0, 0.0), (987.8, 0.35), (1108.7, 0.0), (1318.5, -0.35)]):
        t = fr(BEATS[f"dot{k + 1}"]) + 2 / FPS  # GrowFromCenter (ease-out cubic) reads as "there" ~2 frames in
        x = reverb(ting(f0), wet=0.3, rt60=1.2, tone=7000, tail=1.0)
        place(ui, pan(x, p), t, -32.0, cues, "ui", f"valence dot {k + 1}: sine ting {f0:.0f} Hz (self-synthesised)")

    # 5. card: one soft confirmation chime as the bold line starts to write
    t_card = fr(BEATS["card"])
    ch = reverb(lp(load("confirmation_002.ogg"), 6000), wet=0.45, rt60=2.0)
    place(ui, fade(ch, 0, 1.2), t_card, -21.0, cues, "ui", "soft confirmation chime as the card writes on")

    for bus in (fx, ui):
        bus[:] = fade(bus, 0, 1.0)  # nothing rings past the end

    # ---- master: one gain to -16 LUFS, then peak-limit the event stems if the true peak would exceed the ceiling
    for attempt in range(8):
        write_wav(AUDIO / "_probe.wav", amb + fx + ui)
        lufs, tp = loudness(AUDIO / "_probe.wav")
        g = TARGET_LUFS - lufs
        print(f"  pass {attempt}: {lufs:.2f} LUFS, true peak after gain {tp + g:.2f} dBTP")
        if tp + g <= TP_CEIL:
            break
        gl = limit_gain(amb + fx + ui, db(TP_CEIL - g - 0.8 - 0.4 * attempt))
        amb, fx, ui = amb * gl, fx * gl, ui * gl
    (AUDIO / "_probe.wav").unlink()
    for name, bus in (("amb", amb), ("fx", fx), ("ui", ui)):
        write_wav(AUDIO / f"{name}.wav", bus * db(g))
    write_wav(AUDIO / "mix.wav", (amb + fx + ui) * db(g))
    lufs, tp = loudness(AUDIO / "mix.wav")
    print(f"mix.wav: {lufs:.1f} LUFS integrated, {tp:.1f} dBTP, {T:.3f} s (gain {g:+.1f} dB)")
    (AUDIO / "cues.json").write_text(json.dumps({"duration_s": T, "integrated_lufs": round(lufs, 1),
                                                 "true_peak_dbtp": round(tp, 1), "master_gain_db": round(g, 1),
                                                 "cues": cues}, indent=1))
    for c in cues:
        print(f"  {c['stem']:3s} {c['hit_s']:7.3f}s  {c['what']}")


if __name__ == "__main__":
    main()
