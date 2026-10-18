"""PROTOTYPE helper: SFX-to-picture sync measured on the RENDERED file. For each cue: the strongest audio onset
within +-120 ms of the planned hit (from the decoded AAC), and the biggest picture change within +-3 frames of
the planned visual frame (mean |frame difference|). Prints the measured audio-minus-visual offset."""
import json, subprocess, sys
import numpy as np
v = sys.argv[1]; SR = 48000; FPS = 30
cues = json.load(open("audio/cues.json"))["cues"]
a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-map", "a:0", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout, np.float32).astype(float)
hop = int(0.002 * SR)
e = np.array([np.sqrt((a[i:i + 4 * hop] ** 2).mean() + 1e-12) for i in range(0, len(a) - 4 * hop, hop)])
on = np.maximum(0, np.diff(20 * np.log10(e + 1e-9), prepend=-200))
on = on * (e > 1e-3)                       # ignore near-silence flicker
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", v], capture_output=True, text=True).stdout.split()[0]
w, h = map(int, probe.split(","))
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-map", "0:v:0", "-vf", "scale=iw/4:ih/4,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h // 4, w // 4).astype(np.float32)
d = np.r_[0, [np.abs(f[i] - f[i - 1]).mean() for i in range(1, len(f))]]
print(f"{v.split('/')[-1]}")
for c in cues:
    t = c["hit"] % 12.0
    i0, i1 = int((t - 0.12) / 0.002), int((t + 0.12) / 0.002)
    idx = np.arange(i0, i1) % len(on)
    k = idx[int(np.argmax(on[idx]))]
    ta = k * 0.002
    vf = c["visual_frame"]
    if vf is None:
        continue
    fr = [int(round(vf)) + j for j in range(-3, 4)]
    fr = [x % len(d) for x in fr]
    fv = fr[int(np.argmax(d[fr]))]
    print(f"  {c['what'][:58]:58s} planned {t:6.3f}s  audio onset {ta:6.3f}s  | picture change peaks f{fv} ({fv / FPS:6.3f}s)  -> audio - picture {1000 * (ta - fv / FPS):+5.0f} ms")
