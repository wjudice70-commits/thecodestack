"""Build the keep-matte for the bench clip once: the two people (segmented, smoothed over time), the lamp,
and everything below the railing. Writes alpha.npy (for blend.py) and matte.mp4 (kept in the repo, so the
clips can be rebuilt later without running segmentation again).
Needs frames in f720/ (ffmpeg -i istanbul-bench.mp4 -vf scale=720:1280 f720/%03d.png) and masks in m720/ (segment.py)."""
import numpy as np, os, subprocess
from PIL import Image, ImageFilter, ImageDraw
W, H = 720, 1280
static = Image.new('L', (W, H), 0); d = ImageDraw.Draw(static)
d.rectangle([0, 578, W, H], fill=255)            # railing, bench, ground
d.ellipse([-6, 52, 104, 205], fill=255)          # lantern and its glow
d.rectangle([20, 190, 60, 600], fill=255)        # lamp post
static = np.asarray(static.filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255
names = sorted(os.listdir('m720')); M = [np.asarray(Image.open('m720/' + n).convert('L'), dtype=np.float32) / 255 for n in names]
out = []
for i in range(len(M)):
    m = M[i] * .5 + M[max(0, i - 1)] * .25 + M[min(len(M) - 1, i + 1)] * .25
    m = np.clip((m - .12) / .76, 0, 1)
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
    out.append((np.maximum(np.asarray(mi, dtype=np.float32) / 255, static) * 255).astype(np.uint8))
np.save('alpha.npy', np.stack(out))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                      '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', 'matte.mp4'], stdin=subprocess.PIPE)
for a in out: p.stdin.write(a.tobytes())
p.stdin.close(); p.wait(); print('matte frames:', len(out))
