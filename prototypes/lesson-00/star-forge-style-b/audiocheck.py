"""PROTOTYPE helper: RMS timeline (dBFS, 100 ms), the pre-drop gap, the loop seam and section loudness of an audio/video file."""
import re, subprocess, sys
import numpy as np
p = sys.argv[1]
SR = 48000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-map", "a:0", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
print(f"{p.split('/')[-1]}: {len(x) / SR:.3f} s")
def rms(a, b):
    s = x[int(a * SR):int(b * SR)]
    return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)
row = [f"{rms(t / 10, t / 10 + 0.1):5.0f}" for t in range(int(len(x) / SR * 10))]
for i in range(0, len(row), 20):
    print(f"  {i / 10:5.1f}s " + "".join(row[i:i + 20]))
print(f"  gap 2.72-2.90 s: {rms(2.72, 2.90):.1f} dBFS   (around: 2.4-2.6 {rms(2.4, 2.6):.1f}, 3.0-3.3 {rms(3.0, 3.3):.1f})")
n = len(x)
print(f"  seam: last-sample/first-sample step {np.abs(x[-1] - x[0]).max():.4f}; typical step {np.median(np.abs(np.diff(x[:SR], axis=0))):.4f}; "
      f"rms last 0.1 s {rms(n / SR - 0.1, n / SR):.1f} vs first 0.1 s {rms(0, 0.1):.1f}")
for a, b, name in [(0, 2.7, "hook"), (3.0, 6.0, "drop/fuse"), (6.0, 8.0, "pull/morph"), (8.0, 11.4, "card"), (11.4, 12.0, "loop dive")]:
    seg = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(a), "-t", str(b - a), "-i", p, "-map", "a:0", "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    s = seg[seg.rfind("Summary:"):]
    m = re.search(r"I:\s+(-?[\d.]+) LUFS", s)
    print(f"  {name:11s} {a:4.1f}-{b:4.1f} s: I {m.group(1) if m else '?'} LUFS")
full = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-map", "a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
s = full[full.rfind("Summary:"):]
print("  FULL: I", re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1), "LUFS, LRA", re.search(r"LRA:\s+(-?[\d.]+) LU", s).group(1),
      "LU, true peak", re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1), "dBTP")
