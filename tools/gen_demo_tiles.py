#!/usr/bin/env python3
"""Generate StrongBow's CC0 demo override art (16x16 PNGs).

This is original art released under CC0 / public domain. It exists to prove the
external-asset pipeline and give an instant reskin. Swap these files (or remove
their entries from public/assets/manifest.json) to revert to procedural art.
"""
from PIL import Image
import os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "sprites")
os.makedirs(OUT, exist_ok=True)
S = 16

def img():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))

def px(im, x, y, c):
    if 0 <= x < S and 0 <= y < S:
        im.putpixel((x, y), c)

def rect(im, x, y, w, h, c):
    for j in range(y, y + h):
        for i in range(x, x + w):
            px(im, i, j, c)

def outline(im, c=(10, 10, 20, 255)):
    src = im.copy()
    for y in range(S):
        for x in range(S):
            if src.getpixel((x, y))[3] > 40:
                continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and src.getpixel((nx, ny))[3] > 40:
                    px(im, x, y, c); break

def save(im, name):
    im.save(os.path.join(OUT, name))
    print("wrote", name)

H = lambda s: tuple(int(s[i:i+2],16) for i in (0,2,4)) + (255,)

# ---------------- floor: cool arcade flagstone, tiles seamlessly ----------------
def floor():
    rng = random.Random(7)
    base, lite, dark, grout = H("3b414f"), H("4a5161"), H("2c313c"), H("21252e")
    im = img(); rect(im, 0, 0, S, S, base)
    for y in range(S):
        for x in range(S):
            n = rng.random()
            if n < 0.10: px(im, x, y, dark)
            elif n < 0.18: px(im, x, y, lite)
    rect(im, 0, 0, S, 1, grout)        # top seam
    rect(im, 0, 0, 1, S, grout)        # left seam
    rect(im, 0, 1, S, 1, H("434a59"))  # light under top seam
    # central flag crack
    for i in range(4):
        px(im, 8, 5 + i, grout)
    save(im, "floor.png")

# ---------------- wall: bold offset brick with lit top ----------------
def wall():
    base, mortar, lite, dark, cap = H("28305a"), H("0d1130"), H("4a63b0"), H("171f3e"), H("5a72c4")
    im = img(); rect(im, 0, 0, S, S, base)
    rows = [0, 4, 8, 12]
    for i, ry in enumerate(rows):
        off = 0 if i % 2 == 0 else 8
        rect(im, 0, ry, S, 1, mortar)
        for bx in range(0, S, 8):
            x = (bx + off) % S
            rect(im, x, ry + 1, 7, 3, base)
            rect(im, x, ry + 1, 7, 1, lite)      # top bevel
            rect(im, x, ry + 3, 7, 1, dark)      # bottom shade
            px(im, x + 7, ry + 1, mortar)
            px(im, x + 7, ry + 2, mortar)
            px(im, x + 7, ry + 3, mortar)
    rect(im, 0, 0, S, 2, cap)                    # lit top cap
    rect(im, 0, 2, S, 1, mortar)
    save(im, "wall.png")

# ---------------- crystal cluster ----------------
def crystal():
    im = img()
    c, hi, dk = H("6fe0ff"), H("dffaff"), H("2f6f9a")
    rect(im, 9, 5, 2, 9, dk); px(im, 9, 4, c)
    rect(im, 5, 6, 3, 8, c); rect(im, 5, 6, 1, 8, hi)
    rect(im, 6, 3, 1, 4, c); px(im, 6, 2, hi)
    rect(im, 3, 10, 2, 4, dk); px(im, 3, 9, c)
    rect(im, 2, 13, 11, 1, H("bfe9ff"))
    outline(im); save(im, "crystal.png")

# ---------------- brass cog ----------------
def cog():
    import math
    im = img()
    body, hi, dk = H("c79a3a"), H("f0d472"), H("6a4f18")
    cx = cy = 8
    for a in range(8):
        ang = a/8*2*math.pi
        rect(im, int(cx+math.cos(ang)*6)-1, int(cy+math.sin(ang)*6)-1, 2, 2, body)
    for y in range(S):
        for x in range(S):
            if (x-cx)**2+(y-cy)**2 <= 25: px(im, x, y, body)
    for y in range(S):
        for x in range(S):
            if (x-cx+1)**2+(y-cy+1)**2 <= 6: px(im, x, y, hi)
            if (x-cx)**2+(y-cy)**2 <= 3: px(im, x, y, dk)
    outline(im); save(im, "cog.png")

# ---------------- skull on pike ----------------
def skull_pike():
    im = img()
    b, hi, dk, pole = H("d8dce8"), H("f2f4fa"), H("202433"), H("5a4a2a")
    rect(im, 7, 6, 2, 9, pole)
    rect(im, 5, 2, 6, 5, b); rect(im, 6, 7, 4, 2, b)
    rect(im, 5, 2, 6, 1, hi)
    px(im, 6, 4, dk); px(im, 9, 4, dk); px(im, 7, 6, dk); px(im, 8, 6, dk)
    outline(im); save(im, "skull-pike.png")

# ---------------- treasure chest ----------------
def chest(open_=False):
    im = img()
    wood, woodhi, gold, golddk = H("6a4326"), H("9a6a30"), H("ffe27a"), H("c79a1e")
    rect(im, 2, 7, 12, 7, wood); rect(im, 2, 7, 12, 1, woodhi)
    rect(im, 2, 10, 12, 2, golddk); rect(im, 7, 7, 2, 7, golddk)
    if open_:
        rect(im, 2, 2, 12, 3, wood)
        rect(im, 4, 6, 8, 3, gold); px(im, 5, 6, H("ffffff")); px(im, 9, 7, H("ffffff"))
    else:
        rect(im, 2, 4, 12, 4, woodhi); rect(im, 2, 4, 12, 1, H("b07a38"))
        rect(im, 7, 4, 2, 4, gold); px(im, 7, 8, H("ffffff"))
    outline(im); save(im, "chest-open.png" if open_ else "chest.png")

floor(); wall(); crystal(); cog(); skull_pike(); chest(False); chest(True)
print("DONE ->", os.path.abspath(OUT))
