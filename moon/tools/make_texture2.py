from PIL import Image, ImageFilter
import numpy as np, os

SRC = r"E:\zy\moon\assets\source-full-moon.jpg"
OUT = r"E:\zy\moon\assets\moon-900.jpg"

im = Image.open(SRC).convert("RGB")
cx, cy = 729.0, 676.0
r = 584.0

box = (int(round(cx - r)), int(round(cy - r)), int(round(cx + r)), int(round(cy + r)))
crop = im.crop(box)
print("crop", box, crop.size)

size = 900
tex = crop.resize((size, size), Image.LANCZOS)
tex = tex.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))

a = np.asarray(tex).astype(np.float32) / 255.0
a = np.where(a > 0.82, 0.82 + (a - 0.82) * 0.55, a)
a = np.clip((a - 0.02) * 1.06, 0, 1)

out = Image.fromarray((a * 255).astype(np.uint8))

yy, xx = np.mgrid[0:size, 0:size]
rr = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
arr = np.asarray(out).copy()
arr[rr > 1.0] = 0
out = Image.fromarray(arr)

out.save(OUT, quality=86, optimize=True, progressive=True)
print("saved", OUT, "bytes", os.path.getsize(OUT))
print("mean inside", arr[rr < 0.9].mean(), "max", arr.max())
