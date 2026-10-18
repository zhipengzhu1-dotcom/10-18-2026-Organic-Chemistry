"""PROTOTYPE (throwaway): verify the sound-v2 guardrails on every final file (WAV and the AAC in each mp4).

ffmpeg ebur128 for loudness / true peak / short-term / momentary, and for the band ratios
(literal spec filter AND a steep 8th-order version, since a single 2-pole highpass leaks low-mid energy);
numpy/scipy for pure tones above 1.2 kHz, attack (10-90 % rise) times, clicks, fades and cue offsets.
Writes measurements.json and prints a Markdown table.

Run: ../../star-forge-manim/.venv/bin/python -I measure_v2.py
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, find_peaks, hilbert, sosfilt, stft

HERE = Path(__file__).resolve().parent
SR, FPS = 48000, 30
VARIANTS = ["v1-hush", "v2-ambient-score", "v3-soft-sfx"]
BUILD = json.loads((HERE / "build.json").read_text())


def ebur(path, af=None, stream=None):
    chain = (af + "," if af else "") + "ebur128=peak=true:framelog=info"
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path)]
    if stream:
        cmd += ["-map", stream]
    r = subprocess.run(cmd + ["-af", chain, "-f", "null", "-"], capture_output=True, text=True).stderr
    m = [float(v) for v in re.findall(r" M:\s*(-?[\d.]+)", r)]
    s = [float(v) for v in re.findall(r" S:\s*(-?[\d.]+)", r)]
    tail = r[r.rfind("Summary:"):]
    integ = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)", tail)
    return {"I": integ, "TP": float(tp.group(1)) if tp else None, "M_max": max(m), "S_max": max(s)}


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-f", "f64le", "-ac", "2",
                          "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float64).reshape(-1, 2)


def sos(kind, f, order):
    return butter(order, f, kind, fs=SR, output="sos")


def tone_check(x):
    """Tonal peaks above 1.2 kHz: local-max bins >= 15 dB above the local median (+-40 bins)
    and within 60 dB of that frame's loudest bin. Returns (count, strongest such bin rel. frame max dB,
    strongest bin of ANY kind above 1.2 kHz rel. frame max dB)."""
    f, _, Z = stft(x.mean(axis=1), fs=SR, nperseg=8192, noverlap=8192 - 2048, window="hann")
    S = 20 * np.log10(np.abs(Z) + 1e-12)
    hi = f > 1200
    count, worst, any_hi = 0, -999.0, -999.0
    from scipy.ndimage import median_filter
    for j in range(S.shape[1]):
        col = S[:, j]; fmax = col.max()
        if fmax < -110:
            continue
        any_hi = max(any_hi, col[hi].max() - fmax)
        med = median_filter(col, size=81, mode="nearest")
        lm = np.r_[False, (col[1:-1] > col[:-2]) & (col[1:-1] >= col[2:]), False]
        cand = hi & lm & (col - med >= 15) & (col >= fmax - 60)
        if cand.any():
            count += int(cand.sum()); worst = max(worst, (col[cand] - fmax).max())
    return count, worst, any_hi


def rms_env(x, win_ms):
    """Centred (zero-delay) RMS envelope of the stereo power sum, win_ms rectangular window."""
    from scipy.ndimage import uniform_filter1d
    return np.sqrt(np.maximum(uniform_filter1d((x ** 2).sum(axis=1), size=max(1, int(win_ms / 1000 * SR)), mode="nearest"), 0))


def attacks(x):
    """Onset rise meter for an isolated events stem. Envelope = per-channel Hilbert magnitude, power-summed,
    1 ms Hann smoothing, 0.25 ms grid. Onset = envelope >= 3 dB above its own max 10-60 ms earlier and
    within 40 dB of the stem's loudest moment. Rise = 10 -> 90 % from the pre-onset trough (min of the
    80 ms before) to the max of the next 100 ms. Returns sorted [(rise_ms, onset_s)]."""
    from scipy.ndimage import maximum_filter1d
    e = np.sqrt(sum(np.abs(hilbert(x[:, c])) ** 2 for c in range(2)))
    k = int(0.001 * SR); w = np.hanning(k); e = np.convolve(e, w / w.sum(), mode="same")
    a = e[::12]; G = 4
    mf = maximum_filter1d(a, size=50 * G + 1, mode="nearest")
    recent = np.r_[np.full(35 * G, np.inf), mf[:-35 * G]]
    cand = np.flatnonzero((a >= np.sqrt(2) * recent) & (a >= a.max() * 10 ** (-40 / 20)))
    events, last = [], -10 ** 9
    for i in cand:
        if i - last > 100 * G:
            events.append(i)
        last = i
    out = []
    for i in events:
        lo = max(0, i - 80 * G); j = lo + int(np.argmin(a[lo:i + 1]))
        r = a[j:i + 100 * G]; base, pk = a[j], r.max(); d = pk - base
        t10 = np.argmax(r >= base + 0.1 * d); t90 = t10 + np.argmax(r[t10:] >= base + 0.9 * d)
        out.append((round(float(t90 - t10) / G, 2), round(i / G / 1000, 3)))
    return sorted(out)


def attack_selftest(x, at_s=3.0):
    """Calibrate the meter on this stem: add an A3 pluck (6 dB under the stem's peak) with raised-cosine
    attacks of 2/4/8/16 ms at at_s (a silent spot of every events stem) and report what attacks() reads."""
    res = {}
    t = np.arange(int(1.0 * SR)) / SR
    for att in (2, 4, 8, 16):
        env = (0.5 - 0.5 * np.cos(np.pi * np.clip(t / (att / 1000), 0, 1))) * np.exp(-t / 0.5)
        y = x.copy(); i0 = int(at_s * SR)
        y[i0:i0 + len(t)] += (np.abs(x).max() * 10 ** (-6 / 20) * env * np.sin(2 * np.pi * 220 * t))[:, None]
        hits = [r for r, ts in attacks(y) if abs(ts - at_s) < 0.05]
        res[f"{att}ms"] = hits[0] if hits else None
    return res


def solo_attacks():
    """Each event instrument rendered ALONE by the build's own synth functions (same code, same seeds as
    a fresh run), through the master low-pass, then metered: separates a real attack from beating
    between two overlapping notes in the stem."""
    import sys
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(HERE))
    import make_sound_v2 as m
    rng = np.random.default_rng(0); res = {}
    evs = {f"pluck {f:.0f} Hz": m.pluck(f, rng) for f in (m.A3, m.D4, m.Fs4, m.A4)}
    evs["thump (v3)"] = m.thump(rng); evs["bell D3 (v3)"] = m.bell(m.D3, rng)
    evs["low tone D3 (v1)"] = m.low_tone(m.D3, rng)
    evs["swell (v1/v2/v3 shapes)"] = m.swell(rng, rise=0.467, fall_tau=0.9)
    for k, (x, _) in evs.items():
        pad = np.zeros((SR, 2))
        y = m.lp(np.concatenate([pad, x, pad]), 2500.0, 8)
        a = attacks(y)
        res[k] = a[0][0] if a else None
    return res


def clicks(x):
    dx = np.abs(np.diff(x, axis=0)).max()
    h = sosfilt(sos("high", 8000, 8), x, axis=0)
    return {"max_step_dbfs": 20 * np.log10(dx + 1e-15), "hp8k_peak_dbfs": 20 * np.log10(np.abs(h).max() + 1e-15),
            "first_sample": float(np.abs(x[0]).max()), "last_sample": float(np.abs(x[-1]).max())}


def fades(x):
    m = np.sqrt((x ** 2).mean(axis=1))
    def rms(a, b):
        return 20 * np.log10(np.sqrt((m[int(a * SR):int(b * SR)] ** 2).mean()) + 1e-15)
    T = len(x) / SR
    return {"rms_0_0.1": rms(0, 0.1), "rms_1.2_2.2": rms(1.2, 2.2), "rms_last_0.1": rms(T - 0.1, T),
            "rms_T-3.3_T-1.8": rms(T - 3.3, T - 1.8)}


def cue_offsets(x, ev, cues):
    """Per cue: (1) placement on the events stem: onset cues = time the 5 ms RMS envelope first reaches 50 %
    of its local peak (the midpoint of a raised-cosine attack, which is the placement anchor); crest cues =
    max of the 50 ms envelope. (2) what the MIX gives a band-limited detector (steepest rise / crest of the
    cue's band envelope; band-pass group delay adds ~5-20 ms)."""
    m = x.mean(axis=1); res = []
    e5, e50 = rms_env(ev, 5.0), rms_env(ev, 50.0)
    for c in cues:
        t0 = c["t_s"]
        span = None
        if c["kind"] == "crest":
            a, b = int((t0 - 0.6) * SR), int((t0 + 0.6) * SR)
            seg = e50[a:b]; ts = (a + np.argmax(seg)) / SR
            top = np.flatnonzero(seg >= seg.max() * 10 ** (-1 / 20))
            span = [round(((a + top[0]) / SR - t0) * 1000), round(((a + top[-1]) / SR - t0) * 1000)]
        else:
            a, b = int((t0 - 0.1) * SR), int((t0 + 0.1) * SR)
            i0 = int((t0 - 0.010) * SR)
            base = e5[int((t0 - 0.030) * SR):i0].min(); pk = e5[i0:int((t0 + 0.060) * SR)].max()
            ts = (i0 + np.argmax(e5[i0:] >= base + 0.5 * (pk - base))) / SR
        lo, hi = c["band_hz"]
        y = sosfilt(sos("band", [lo, hi], 4), m) if lo > 45 else sosfilt(sos("low", hi, 4), m)
        e = np.abs(hilbert(y))
        if c["kind"] == "crest":
            k = int(0.05 * SR); w = np.hanning(k); e = np.convolve(e, w / w.sum(), mode="same")
            a, b = int((t0 - 0.6) * SR), int((t0 + 0.6) * SR)
            tm = (a + np.argmax(e[a:b])) / SR
        else:
            k = int(0.004 * SR); w = np.hanning(k); e = np.convolve(e, w / w.sum(), mode="same")
            a, b = int((t0 - 0.15) * SR), int((t0 + 0.15) * SR)
            tm = (a + np.argmax(np.diff(e[a:b]))) / SR
        res.append({"name": c["name"], "frame": c["frame"], "kind": c["kind"],
                    "stem_offset_ms": round((ts - t0) * 1000, 1), "crest_1db_span_ms": span, "mix_offset_ms": round((tm - t0) * 1000, 1)})
    return res


def main():
    out = {}
    hp5_lit = "highpass=f=5000"
    hp5_steep = ",".join(["highpass=f=5000"] * 4)
    band_lit = "highpass=f=2000,lowpass=f=5000"
    band_steep = ",".join(["highpass=f=2000"] * 4 + ["lowpass=f=5000"] * 4)
    for v in VARIANTS:
        wav = HERE / f"{v}.wav"
        r = {"wav": ebur(wav)}
        for a in ("16x9", "9x16"):
            r[f"aac_{a}"] = ebur(HERE / f"{v}-{a}.mp4", stream="0:a:0")
        r["hf5k_I_literal"] = ebur(wav, hp5_lit)["I"]
        r["hf5k_I_steep"] = ebur(wav, hp5_steep)["I"]
        r["b2_5k_I_literal"] = ebur(wav, band_lit)["I"]
        r["b2_5k_I_steep"] = ebur(wav, band_steep)["I"]
        x = load(wav)
        r["samples"] = len(x)
        r["tones_above_1k2"] = dict(zip(("count", "worst_tonal_rel_db", "loudest_bin_rel_db"), tone_check(x)))
        r["clicks"] = clicks(x)
        r["fades"] = fades(x)
        r["cues"] = cue_offsets(x, load(HERE / "stems" / f"{v}-events.wav"), BUILD["variants"][v]["cues"])
        evs = load(HERE / "stems" / f"{v}-events.wav")
        r["attack_selftest"] = attack_selftest(evs)
        sa = attacks(evs)
        r["events_stem_attacks"] = sa
        r["events_stem_attack_min_ms"] = sa[0][0] if sa else None
        r["master_gain_db"] = BUILD["variants"][v]["master_gain_db"]
        out[v] = r
    solo = solo_attacks()
    out["_solo_event_attacks_ms"] = solo
    (HERE / "measurements.json").write_text(json.dumps(out, indent=1))

    rows = [("Master gain (one static stage; limit +6 dB)", lambda r: f"{r['master_gain_db']:+.1f} dB"),
            ("Limiter / compressor gain reduction", lambda r: "none (0 dB)"),
            ("Integrated, WAV (−24…−22 LUFS)", lambda r: f"{r['wav']['I']:.1f}"),
            ("Integrated, AAC 16:9 / 9:16", lambda r: f"{r['aac_16x9']['I']:.1f} / {r['aac_9x16']['I']:.1f}"),
            ("True peak, WAV (≤ −6 dBTP)", lambda r: f"{r['wav']['TP']:.1f}"),
            ("True peak, AAC 16:9 / 9:16", lambda r: f"{r['aac_16x9']['TP']:.1f} / {r['aac_9x16']['TP']:.1f}"),
            ("Short-term max (≤ −16 LUFS)", lambda r: f"{r['wav']['S_max']:.1f}"),
            ("Momentary max (≤ −14 LUFS)", lambda r: f"{r['wav']['M_max']:.1f}"),
            (">5 kHz vs full band, literal `highpass=f=5000` (≤ −30 LU)",
             lambda r: f"{r['hf5k_I_literal'] - r['wav']['I']:.1f}"),
            (">5 kHz vs full band, 8th-order (≤ −30 LU)", lambda r: f"{r['hf5k_I_steep'] - r['wav']['I']:.1f}"),
            ("2–5 kHz vs full band, literal hp2k+lp5k (≤ −18 LU)",
             lambda r: f"{r['b2_5k_I_literal'] - r['wav']['I']:.1f}"),
            ("2–5 kHz vs full band, 8th-order (≤ −18 LU)", lambda r: f"{r['b2_5k_I_steep'] - r['wav']['I']:.1f}"),
            ("Tonal peaks > 1.2 kHz (count)", lambda r: f"{r['tones_above_1k2']['count']}"),
            ("Loudest bin > 1.2 kHz vs frame max", lambda r: f"{r['tones_above_1k2']['loudest_bin_rel_db']:.0f} dB"),
            ("Shortest event attack, 10–90 %, events stem (8 ms raised-cos reads ≈ 4.7)", lambda r: f"{r['events_stem_attack_min_ms']:.1f} ms ({len(r['events_stem_attacks'])} onsets)"),
            ("Meter self-test: 2 / 4 / 8 / 16 ms attack reads as", lambda r: " / ".join(str(r['attack_selftest'][k]) for k in ('2ms','4ms','8ms','16ms')) + " ms"),
            ("Largest sample step / >8 kHz peak", lambda r: f"{r['clicks']['max_step_dbfs']:.0f} / {r['clicks']['hp8k_peak_dbfs']:.0f} dBFS"),
            ("First / last sample", lambda r: f"{r['clicks']['first_sample']:.0e} / {r['clicks']['last_sample']:.0e}"),
            ("RMS 0–0.1 s → 1.2–2.2 s (fade-in 1.2 s)", lambda r: f"{r['fades']['rms_0_0.1']:.0f} → {r['fades']['rms_1.2_2.2']:.0f} dBFS"),
            ("RMS T−3.3…T−1.8 s → last 0.1 s (fade-out 1.8 s)", lambda r: f"{r['fades']['rms_T-3.3_T-1.8']:.0f} → {r['fades']['rms_last_0.1']:.0f} dBFS")]
    print("solo event attacks (10-90 ms):", solo)
    print("| Check | " + " | ".join(VARIANTS) + " |")
    print("|---|" + "---|" * len(VARIANTS))
    for label, f in rows:
        print(f"| {label} | " + " | ".join(f(out[v]) for v in VARIANTS) + " |")
    print()
    for v in VARIANTS:
        print(f"**{v} cue offsets** (detected − frame time): " + "; ".join(
            f"{c['name']} @ {c['frame']:.0f}: stem {c['stem_offset_ms']:+.0f} ms"
            + (f" (−1 dB crest {c['crest_1db_span_ms'][0]:+d}…{c['crest_1db_span_ms'][1]:+d} ms)" if c['crest_1db_span_ms'] else "")
            + f", mix {c['mix_offset_ms']:+.0f} ms"
            for c in out[v]["cues"]))
        print(f"  events-stem onsets: {out[v]['events_stem_attacks']}")
        print(f"  attack meter self-test (true raised-cosine attack -> measured 10-90 ms): {out[v]['attack_selftest']}")


if __name__ == "__main__":
    main()
