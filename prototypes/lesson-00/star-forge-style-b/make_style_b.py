"""PROTOTYPE (throwaway): everything the Style B edit needs outside Resolve.

  media/white-<aspect>.mp4   white leg of the fusion flash dip
  audio/{music,fx,ui}.wav     self-synthesised 120 BPM music bed + CC0 SFX, mixed as a LOOP:
                              every tail that runs past 12.0 s wraps onto the start, so the audio seam is
                              seamless by construction. Stems sum (unity faders in Resolve) to audio/mix.wav.
  audio/cues.json             every cue with its time, for the sync check
  the PLAN block in star_forge_style_b_PROTOTYPE.lua
  out/preview-ffmpeg-<aspect>.mp4   Manim picture + mix, a quick check before Resolve

Run: ../star-forge-manim/.venv/bin/python -I make_style_b.py
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

HERE = Path(__file__).resolve().parent
SFX, AUDIO, MEDIA, OUT = HERE / "sfx", HERE / "audio", HERE / "media", HERE / "out"
LUA = HERE / "star_forge_style_b_PROTOTYPE.lua"
FPS, SR = 30, 48000
TOTAL = 360                     # frames: 12.0 s loop
L = TOTAL / FPS
N = int(L * SR)
BEAT = 0.5                      # 120 BPM: one beat = 15 frames
TARGET_LUFS, TP_CEIL = -14.0, -2.0   # WAV true-peak ceiling leaves 0.5 dB for AAC overshoot (deliver <= -1.5)
ASPECTS = {"16x9": (1920, 1080), "9x16": (1080, 1920)}
WHITE_LEN = 30

# ---- visual hit frames (from manim/star_forge_b.py)
F_HE_IN, F_CONTACT, F_EQ, F_PULL, F_MORPH, F_DOTS, F_CARD, F_LOOP = 45, 90, 120, 180, 210, 225, 240, 342

# ---- the edit (frames). Record == source for Manim clips (one continuous render), so every dissolve has handles.
CLIPS = [  # name, src, in, out, rec
    ("hook-approach", "manim", 0, 90, 0),
    ("flash-white", "white", 12, 15, 90),      # 3 white frames on the contact
    ("fuse-to-card", "manim", 93, 342, 93),
    ("loop-dive", "manim", 342, 360, 342),
]
TRANSITIONS = [(0, "Cross Dissolve", 2), (1, "Cross Dissolve", 4)]  # (after clip index, type, frames), centred
FINISH = {"glowThreshold": 0.62, "glowGain": 0.5, "grain": 0.06}    # identical on every clip: no look pops at cuts or at the loop seam
AUDIO_TRACKS = [("music", 1), ("fx", 2), ("ui", 3)]


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"FAILED: {cmd}\n{r.stderr[-3000:]}")
    return r


# ------------------------------------------------------------------ DSP helpers
def db(x):
    return 10 ** (x / 20)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x, axis=0)


def loop_lp(x, cutoff, pre=1.0):
    """sweep_lp for a loop: run 1 s of the loop's end through the filter first, so the state at sample 0
    is the state the end of the loop leaves (no click at the seam)."""
    k = int(pre * SR)
    y = sweep_lp(np.concatenate([x[-k:], x]), np.concatenate([cutoff[-k:], cutoff]))
    return y[k:]


def sweep_lp(x, cutoff, block=256, order=2):
    """Low-pass with a time-varying cutoff (Hz per sample), blockwise with carried filter state."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        sos = butter(order, float(np.clip(cutoff[min(i, len(cutoff) - 1)], 40, SR * 0.45)), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.stack([sosfilt_zi(sos)] * 2, axis=-1) * 0
        y[i:i + block], zi = sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y


def load(name, rate=1.0):
    cmd = ["ffmpeg", "-v", "error", "-i", SFX / name, "-ac", "2", "-ar", str(SR)]
    if rate != 1.0:
        cmd += ["-af", f"asetrate={int(SR * rate)},aresample={SR}"]
    raw = subprocess.run([str(c) for c in cmd] + ["-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def onset(x, rel_db=-20.0):
    """Perceived transient: first sample within rel_db of the peak (seconds)."""
    a = np.abs(x).max(axis=1)
    return int(np.argmax(a >= a.max() * db(rel_db))) / SR


def peak_t(x, win=0.03):
    e = uniform_filter1d((x ** 2).mean(axis=1), int(win * SR))
    return int(np.argmax(e)) / SR


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    n = len(x)
    if fin:
        k = min(n, int(fin * SR)); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    if fout:
        k = min(n, int(fout * SR)); x[n - k:] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None] ** 2
    return x


def pan(x, p):
    m = x.mean(axis=1)
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1) * np.sqrt(2)


_IR = {}


def reverb(x, wet=0.35, rt60=1.8, tone=6000):
    key = (rt60, tone)
    if key not in _IR:
        rng = np.random.default_rng(7)
        n = int(rt60 * SR)
        t = np.arange(n) / SR
        ir = rng.standard_normal((n, 2)) * np.exp(-6.9 * t / rt60)[:, None]
        ir[: int(0.012 * SR)] = 0
        ir = lp(ir, tone)
        _IR[key] = ir / np.sqrt((ir ** 2).sum(axis=0))
    ir = _IR[key]
    x = np.concatenate([x, np.zeros((len(ir), 2))])
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + y * wet


class LoopBus:
    """A 12 s bus that wraps anything placed past the end back onto the start (and before 0 onto the end)."""

    def __init__(self):
        self.x = np.zeros((N, 2))

    def place(self, sig, t, gain_db=0.0):
        sig = sig * db(gain_db)
        i = int(round(t * SR))
        idx = (np.arange(len(sig)) + i) % N
        np.add.at(self.x, idx, sig)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + phase) % 1.0) - 1


def note_env(n, a=0.02, r=0.08):
    e = np.ones(n)
    ka, kr = int(a * SR), int(r * SR)
    e[:ka] = np.linspace(0, 1, ka)
    e[n - kr:] *= np.linspace(1, 0, kr)
    return e


# ------------------------------------------------------------------ music (self-synthesised, 120 BPM)
CHORDS = [  # start, end, bass midi, pad midis
    (0.0, 3.0, 47, [54, 59, 61, 62, 66]),    # Bm add9: the question
    (3.0, 6.0, 43, [55, 59, 62, 66]),        # Gmaj7: the drop
    (6.0, 8.5, 40, [55, 59, 62, 64]),        # Em7: drifting out
    (8.5, 11.0, 38, [62, 66, 69, 76]),       # D add9: the answer
    (11.0, 12.0, 45, [57, 62, 64]),          # Asus4: leans back into the loop
]


def env_curve(points):
    """Piecewise-linear envelope over the loop, points = [(t, v), ...] (seconds)."""
    t = np.arange(N) / SR
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def build_music():
    rng = np.random.default_rng(3)
    pad_bus, bass_bus, kick_bus, arp_bus, riser_bus = (LoopBus() for _ in range(5))
    # pad: 3 detuned saws per note, each chord one event with attack/release (release wraps at the seam)
    for a, b, bass, notes in CHORDS:
        n = int((b - a + 0.25) * SR)
        sig = np.zeros((n, 2))
        for m in notes:
            for k, cents in enumerate((-8, 0, 7)):
                f = mtof(m) * 2 ** (cents / 1200)
                ch = k % 2
                v = saw(f, n, rng.random()) * 0.6
                sig[:, ch] += v
                sig[:, 1 - ch] += v * 0.5
        sig *= note_env(n, a=0.03, r=0.25)[:, None] / len(notes)
        pad_bus.place(sig, a)
    # bass: quarter-note pulses under the hook, eighth-note pulses from the drop to the card's end
    for a, b, bass, notes in CHORDS:
        t = a if a < 3.0 else max(a, 3.0)
        while t < min(b, 11.0) - 1e-6 and not (2.6 <= t < 3.0):
            n = int(0.24 * SR)
            tt = np.arange(n) / SR
            f = mtof(bass)
            v = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.15 * saw(f, n)) * np.exp(-tt / 0.11)
            v *= note_env(n, a=0.004, r=0.03)
            bass_bus.place(np.stack([v, v], 1) * (0.6 if t < 3.0 else 1.0), t)
            t += 0.5 if t < 3.0 else 0.25
    # kick: half-time through the body, on every beat under the card
    kicks = [3.0, 4.0, 5.0, 6.0, 7.0, 8.0] + [8.5 + BEAT * k for k in range(5)]
    for t0 in kicks:
        n = int(0.4 * SR)
        tt = np.arange(n) / SR
        f = 45 + 85 * np.exp(-tt / 0.03)
        v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.13)
        v[: int(0.003 * SR)] += rng.standard_normal(int(0.003 * SR)) * 0.25
        kick_bus.place(np.stack([v, v], 1), t0)
    # arp: 16ths of the chord tones an octave up, from the drop to the card's end
    for a, b, bass, notes in CHORDS:
        seq = [m + 12 for m in notes] + [notes[1] + 24]
        t, k = max(a, 3.0), 0
        while t < min(b, 11.0) - 1e-6:
            n = int(0.16 * SR)
            tt = np.arange(n) / SR
            f = mtof(seq[k % len(seq)])
            v = (2 * np.abs(saw(f, n, 0.25)) - 1) * np.exp(-tt / 0.06) * note_env(n, 0.002, 0.02)
            arp_bus.place(pan(np.stack([v, v], 1), 0.5 if k % 2 else -0.5), t)
            t += 0.125
            k += 1
    # riser into the gap: filtered noise swelling 2.0-2.7 s
    n = int(0.7 * SR)
    noise = rng.standard_normal((n, 2))
    cut = np.geomspace(400, 6000, n)
    rise = sweep_lp(hp(noise, 300), cut) * np.linspace(0, 1, n)[:, None] ** 2
    rise = fade(rise, 0, 0.02)
    riser_bus.place(rise, 2.0)

    # tone/level automation (loop-periodic: values at 0 and 12 s match)
    pad_cut = env_curve([(0, 950), (2.0, 1000), (2.7, 2600), (3.0, 4200), (4.0, 1300), (8.0, 1300), (8.5, 5200),
                         (11.0, 3000), (12.0, 950)])
    pad = loop_lp(pad_bus.x, pad_cut)
    arp = loop_lp(arp_bus.x, env_curve([(0, 1500), (8.4, 1500), (8.5, 7000), (11.0, 7000), (12.0, 1500)]))
    # sidechain pump on the pad and bass from the kicks
    pump = np.ones(N)
    for t0 in kicks:
        i = int(t0 * SR)
        k = np.arange(int(0.3 * SR))
        idx = (i + k) % N
        pump[idx] = np.minimum(pump[idx], 1 - 0.55 * np.exp(-k / SR / 0.09))
    level = env_curve([(0, 0.75), (2.0, 0.75), (2.69, 0.85), (2.70, 0.0), (2.995, 0.0), (3.0, 1.0), (4.0, 0.8),
                       (8.4, 0.8), (8.5, 1.0), (11.0, 1.0), (11.4, 0.75), (12.0, 0.75)])
    gap = env_curve([(0, 1), (2.695, 1), (2.70, 0), (2.995, 0), (3.0, 1), (12.0, 1)])  # the 0.3 s hole before the drop
    music = (pad * db(-4) * pump[:, None] * level[:, None]
             + bass_bus.x * db(-9) * pump[:, None] * gap[:, None]
             + kick_bus.x * db(-6)
             + arp * db(-17) * gap[:, None] * level[:, None]
             + riser_bus.x * db(-24))
    return music


# ------------------------------------------------------------------ SFX (CC0 Kenney / OpenGameArt + self-synth)
def build_sfx(cues):
    fx, ui = LoopBus(), LoopBus()

    def cue(bus, sig, at, gain, what, anchor="onset", visual=None):
        off = onset(sig) if anchor == "onset" else (peak_t(sig) if anchor == "peak" else (len(sig) / SR if anchor == "end" else 0.0))
        bus.place(sig, at - off, gain)
        cues.append({"stem": "fx" if bus is fx else "ui", "file_start": round(at - off, 3), "hit": round(at, 3),
                     "anchor": anchor, "visual_frame": visual, "visual_t": None if visual is None else round(visual / FPS, 3),
                     "gain_db": gain, "what": what})

    # 1. f45: the three 4He snap in: one whoosh per nucleus (rates varied), peaks on each arrival
    for k, (rate, p, g) in enumerate([(1.08, -0.6, -16), (0.95, 0.6, -18), (1.02, 0.0, -18)]):
        w = fade(lp(load("whoosh2_0.wav", rate=rate), 6000), 0, 0.15)
        pk = peak_t(w)
        w = w[int((pk - 0.35) * SR): int((pk + 0.4) * SR)]          # 0.35 s swell, 0.4 s tail
        w = fade(pan(w, p), 0.2, 0.3)
        f_start = F_HE_IN + 2.66 * k                                  # LaggedStart(lag 0.17) start of nucleus k
        cue(fx, w, (f_start + 1.5) / FPS, g, f"whoosh {k + 1} (rate {rate}) peaks as nucleus {k + 1} snaps in (expo-out: fastest at its start)", "peak", round(f_start, 1))
    # 1b. frame 0 (and every loop seam): the star "blooms": a soft low hit + a shimmer, landing the dive
    bl = fade(lp(load("lowFrequency_explosion_000.ogg", rate=0.8), 400), 0, 0.8)
    cue(fx, bl, 0.0, -13, "low bloom on frame 0 / the loop seam (boom at 0.8x, low-passed 400 Hz)", "onset", 0)
    sh = fade(reverb(hp(load("glass_004.ogg", rate=0.7), 600), wet=0.6, rt60=1.8), 0, 1.0)
    cue(ui, sh, 0.0, -22, "shimmer on frame 0 / the loop seam (glass at 0.7x + reverb)", "onset", 0)
    # 2. impact 80 ms before the flash (f90 = 3.000 s)
    imp = lp(load("impactSoft_heavy_000.ogg"), 2500)
    cue(fx, imp, F_CONTACT / FPS - 0.08, -9, "soft heavy impact, transient 80 ms before the flash", "onset", F_CONTACT)
    # 3. sub boom on the flash
    boom = fade(load("lowFrequency_explosion_000.ogg"), 0, 0.5)
    cue(fx, boom, F_CONTACT / FPS, -6, "low-frequency boom on the flash frame", "onset", F_CONTACT)
    # 4. f180: pull-back whoosh, peak at the move's fastest point (ease-in-out cubic: mid-move)
    pw = lp(load("whoosh2_0.wav", rate=0.85), 3500)
    pk = peak_t(pw)
    pw = fade(pw[int((pk - 0.5) * SR): int((pk + 0.7) * SR)], 0.3, 0.4)
    cue(fx, pan(pw, 0.3), (F_PULL + 15) / FPS, -15, "low whoosh, peak at the pull-back's mid-point", "peak", F_PULL)
    # 5. f210: nucleus -> C: glass ping when the disc becomes the glyph
    gl = reverb(lp(load("glass_004.ogg"), 9000), wet=0.35, rt60=1.4)
    cue(ui, fade(gl, 0, 0.6), (F_MORPH + 6) / FPS, -15, "glass ping as the disc becomes the C", "onset", F_MORPH + 6)
    # 6. f225..: four dot ticks, rate varied 0.92-1.1, panned with their dots (top, right, bottom, left)
    for k, (rate, p) in enumerate([(0.92, 0.0), (0.98, 0.5), (1.04, 0.0), (1.10, -0.5)]):
        b = reverb(lp(load("pluck_002.ogg", rate=rate), 5000), wet=0.25, rt60=0.9)
        cue(ui, fade(pan(b, p), 0, 0.3), (F_DOTS + 4 * k + 1) / FPS, -20, f"valence-dot tick {k + 1} (rate {rate})", "onset", F_DOTS + 4 * k + 1)
    # 7. f240: card lands: confirmation chime
    ch = reverb(lp(load("confirmation_002.ogg"), 8000), wet=0.4, rt60=1.8)
    cue(ui, fade(ch, 0, 0.8), (F_CARD + 10) / FPS, -19, "confirmation chime as the first card line lands", "onset", F_CARD + 10)
    # 8. f342-360: the loop dive: reversed whoosh + reversed shimmer swelling INTO the seam (ends on frame 360 = frame 0)
    w = lp(load("whoosh2_0.wav", rate=1.1), 5000)
    rw = w[int(peak_t(w) * SR):][::-1]   # the whoosh's decay, reversed: a swell that ends on its peak
    sw = reverb(load("glass_004.ogg", rate=0.7), wet=0.7, rt60=1.6)[::-1]
    dive = np.zeros((max(len(rw), len(sw)), 2))
    dive[-len(rw):] += rw
    dive[-len(sw):] += sw * db(-6)
    dive = fade(dive[-int(0.9 * SR):], 0.3, 0.01)
    cue(fx, dive, L, -14, "reversed whoosh + reversed shimmer, swelling into the loop seam", "end", TOTAL)
    return fx.x, ui.x


# ------------------------------------------------------------------ mastering
def limit(x, ceiling, look_ms=5.0, release_ms=80.0):
    w = int(look_ms / 1000 * SR)
    a = np.abs(x).max(axis=1)
    g = np.minimum(1.0, ceiling / np.maximum(a, 1e-12))
    g = minimum_filter1d(g, size=2 * w + 1, mode="wrap")
    g = uniform_filter1d(g, size=int(release_ms / 1000 * SR) // 4 * 2 + 1, mode="wrap")
    g = minimum_filter1d(g, size=2 * w + 1, mode="wrap")
    return x * g[:, None]


def write_wav(path, x):
    x = np.clip(x, -1, 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", str(path)], input=x.tobytes(), check=True)


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1))


def build_audio():
    AUDIO.mkdir(exist_ok=True)
    cues = []
    music = build_music()
    fx, ui = build_sfx(cues)
    stems = {"music": music * db(-3), "fx": fx, "ui": ui}
    g = 0.0
    for attempt in range(8):
        mix = sum(stems.values()) * db(g)
        write_wav(AUDIO / "_probe.wav", mix)
        lufs, tp = loudness(AUDIO / "_probe.wav")
        print(f"  pass {attempt}: {lufs:.2f} LUFS, TP {tp:.2f} dBTP (gain {g:+.2f})")
        if abs(lufs - TARGET_LUFS) < 0.15 and tp <= TP_CEIL:
            break
        g += TARGET_LUFS - lufs
        if tp + (TARGET_LUFS - lufs) > TP_CEIL:
            # limit the summed peaks: compute one gain curve from the sum and apply it to every stem (stems still sum exactly)
            total = sum(stems.values()) * db(g)
            a = np.abs(total).max(axis=1)
            ceiling = db(TP_CEIL - 1.0)
            gc = limit(np.ones((N, 2)) * a[:, None], ceiling)[:, 0] / np.maximum(a, 1e-12)
            gc = np.minimum(gc, 1.0)
            stems = {k: v * gc[:, None] for k, v in stems.items()}
    (AUDIO / "_probe.wav").unlink()
    for k, v in stems.items():
        write_wav(AUDIO / f"{k}.wav", v * db(g))
    write_wav(AUDIO / "mix.wav", sum(stems.values()) * db(g))
    lufs, tp = loudness(AUDIO / "mix.wav")
    print(f"mix.wav: {lufs:.2f} LUFS integrated, {tp:.2f} dBTP")
    (AUDIO / "cues.json").write_text(json.dumps({"integrated_lufs": lufs, "true_peak_dbtp": tp, "cues": cues}, indent=1))


# ------------------------------------------------------------------ white media, Lua plan, preview
def make_white():
    MEDIA.mkdir(exist_ok=True)
    for a, (w, h) in ASPECTS.items():
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=white:s={w}x{h}:r={FPS}:d={WHITE_LEN / FPS}",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "12", "-r", FPS, MEDIA / f"white-{a}.mp4"])


def check_plan():
    cur = 0
    for name, s, a, b, rec in CLIPS:
        assert rec == cur, (name, rec, cur)
        if s == "manim":
            assert a == rec
        cur += b - a
    assert cur == TOTAL
    w = CLIPS[1]
    assert TRANSITIONS[0][2] // 2 + TRANSITIONS[1][2] // 2 <= w[3] - w[2], "white leg too short for both dissolves"
    assert w[2] - TRANSITIONS[0][2] // 2 >= 0 and w[3] + TRANSITIONS[1][2] // 2 <= WHITE_LEN


def lua_plan():
    q = lambda s: '"' + s + '"'
    lines = ["local PLAN = {", f"  fps = {FPS}, total = {TOTAL},", "  clips = {"]
    for name, s, a, b, rec in CLIPS:
        lines.append(f"    {{ name = {q(name)}, src = {q(s)}, s = {a}, e = {b}, rec = {rec}, finish = {'true' if s == 'manim' else 'false'} }},")
    lines += ["  },", "  transitions = {  -- at the END of clip [after] (1-based), centred on the cut"]
    for i, name, d in TRANSITIONS:
        lines.append(f"    {{ after = {i + 1}, type = {q(name)}, dur = {d} }},")
    lines += ["  },", f"  finish = {{ glowThreshold = {FINISH['glowThreshold']}, glowGain = {FINISH['glowGain']}, grain = {FINISH['grain']} }},",
              "  audio = {"]
    for stem, tr in AUDIO_TRACKS:
        lines.append(f"    {{ stem = {q(stem)}, track = {tr} }},")
    lines += ["  },", "}"]
    src = LUA.read_text()
    LUA.write_text(re.sub(r"-- BEGIN PLAN.*?-- END PLAN", "-- BEGIN PLAN (generated by make_style_b.py)\n" + "\n".join(lines) + "\n-- END PLAN",
                          src, flags=re.S))


def preview(aspect):
    OUT.mkdir(exist_ok=True)
    out = OUT / f"preview-ffmpeg-{aspect}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", MEDIA / f"manim-{aspect}.mp4", "-i", AUDIO / "mix.wav", "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", out])
    return out


if __name__ == "__main__":
    check_plan()
    make_white()
    build_audio()
    if LUA.exists():
        lua_plan()
    for a in ASPECTS:
        preview(a)
