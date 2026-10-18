"""PROTOTYPE helper: prove the Resolve Fusion finish from rendered pixels (not GetInput): grain = high-frequency
noise in a flat dark patch, glow = brightness spread around a bright feature; Resolve render vs Manim source."""
import subprocess, sys
import numpy as np
from scipy.ndimage import uniform_filter
def frame(v, n, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf", f"select='eq(n\\,{n})'", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float32)
src, ren, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
for n in [int(x) for x in sys.argv[5:]]:
    a, b = frame(src, n, w, h), frame(ren, n, w, h)
    ga, gb = a.mean(2), b.mean(2)
    hfa, hfb = ga - uniform_filter(ga, 5), gb - uniform_filter(gb, 5)
    patch = (slice(h // 2 + h // 4, h // 2 + h // 4 + 120), slice(40, 240))   # a dark corner patch
    print(f"frame {n}: HF noise std src {hfa[patch].std():.2f} -> resolve {hfb[patch].std():.2f};  mean luma src {ga.mean():.1f} -> resolve {gb.mean():.1f};"
          f"  pixels > 200: src {(ga > 200).mean() * 100:.2f}% -> resolve {(gb > 200).mean() * 100:.2f}%;  mean |diff| {np.abs(a - b).mean():.2f}")
