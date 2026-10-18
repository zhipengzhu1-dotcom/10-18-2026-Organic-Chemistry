"""PROTOTYPE helper: how seamless is the loop? Compares |f(N-1) - f0| with ordinary frame-to-frame motion."""
import subprocess, sys
import numpy as np
v = sys.argv[1]
w, h, n = [int(x) for x in subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
           "stream=width,height,nb_read_frames", "-of", "csv=p=0", v], capture_output=True, text=True).stdout.strip().splitlines()[0].split(",")]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-map", "0:v:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)
d = [np.abs(f[i + 1] - f[i]).mean() for i in range(len(f) - 1)]
seam = np.abs(f[0] - f[-1]).mean()
print(f"{v.split('/')[-1]}: {len(f)} frames; seam |last-first| = {seam:.2f}; frame-to-frame median {np.median(d):.2f}, "
      f"first 5 {np.round(d[:5], 2).tolist()}, last 5 {np.round(d[-5:], 2).tolist()}")
