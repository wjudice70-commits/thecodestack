"""Put one city's night backdrop behind the people: python3 blend.py backdrop.png out.mp4
Uses alpha.npy if present, otherwise reads the matte from matte.mp4."""
import numpy as np, sys, subprocess, os
from PIL import Image
bgp, out = sys.argv[1], sys.argv[2]
W, H = 720, 1280
def frames(path, ch):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gray' if ch == 1 else 'rgb24', '-s', f'{W}x{H}', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * ch)
        if len(b) < W * H * ch: return
        yield np.frombuffer(b, np.uint8).reshape(H, W, ch)
A = np.load('alpha.npy')[..., None] if os.path.exists('alpha.npy') else np.stack(list(frames('matte.mp4', 1)))
src = sys.argv[3] if len(sys.argv) > 3 else 'istanbul-bench.mp4'
bg = np.asarray(Image.open(bgp).convert('RGB').resize((W, H)), dtype=np.float32)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
for i, fg in enumerate(frames(src, 3)):
    a = A[min(i, len(A) - 1)].astype(np.float32) / 255
    enc.stdin.write((fg.astype(np.float32) * a + bg * (1 - a) + .5).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
