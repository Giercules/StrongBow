#!/usr/bin/env python3
"""Generate ORIGINAL CC0 top-down arcade hero sprite sheets for StrongBow.

Output: public/assets/sprites/{warrior,elf,wizard,valkyrie}.png
Each sheet is 240x24 = 12 frames of 20x24, ordered to match the engine:
  0-3  DOWN  (idle, walkA, walkB, attack)
  4-7  UP    (idle, walkA, walkB, attack)
  8-11 SIDE  (idle, walkA, walkB, attack)   facing RIGHT (engine flips for left)

Original work, released CC0 / public domain.
"""
from PIL import Image
import os

FW, FH, N = 20, 24, 12
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "sprites")
os.makedirs(OUT, exist_ok=True)

def H(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2],16), int(s[2:4],16), int(s[4:6],16), a)

OUTLINE = H("0a0a14")

class F:
    """One 20x24 frame."""
    def __init__(self):
        self.im = Image.new("RGBA", (FW, FH), (0,0,0,0))
    def px(self, x, y, c):
        if 0 <= x < FW and 0 <= y < FH and c[3] > 0:
            self.im.putpixel((int(x), int(y)), c)
    def rect(self, x, y, w, h, c):
        for j in range(int(y), int(y+h)):
            for i in range(int(x), int(x+w)):
                self.px(i, j, c)
    def outline(self):
        src = self.im.copy()
        op = lambda x,y: 0<=x<FW and 0<=y<FH and src.getpixel((x,y))[3] > 40
        for y in range(FH):
            for x in range(FW):
                if src.getpixel((x,y))[3] > 40: continue
                if op(x-1,y) or op(x+1,y) or op(x,y-1) or op(x,y+1):
                    self.im.putpixel((x,y), OUTLINE)

# ---------------------------------------------------------------- class specs
SPECS = {
 "warrior": dict(skin="#e6a878", skinHi="#ffcфa0".replace("ф","c"),
    c0="#1c3f78", c1="#2f6fd0", c2="#5a9aff", trim="#c8d2e6", trimHi="#ffffff",
    hair="#5a3a1c", boot="#3a2a18", metal="#cfd8ea", gold="#ffd24a"),
 "elf": dict(skin="#e8bc8a", skinHi="#ffd7a8",
    c0="#1c5a2a", c1="#2f8a3a", c2="#62c46a", trim="#caa56a", trimHi="#f2dca0",
    hair="#3a2a14", boot="#2a3a1a", metal="#caa56a", gold="#e0c060"),
 "wizard": dict(skin="#e8c4a2", skinHi="#ffe0c0",
    c0="#34147a", c1="#6a3cc0", c2="#a868ff", trim="#ffd45a", trimHi="#fff0b0",
    hair="#eaeaf2", boot="#2a1f4a", metal="#ffd45a", gold="#fff0b0", orb="#8cf0ff"),
 "valkyrie": dict(skin="#e8b888", skinHi="#ffd5a4",
    c0="#8a6a1e", c1="#c79a2e", c2="#ffd24a", trim="#ffffff", trimHi="#ffffff",
    hair="#e8d28a", boot="#6a4f18", metal="#eef2ff", gold="#ffe27a"),
}

def lerp(): pass

# ------------------------------------------------------------- shared anatomy
def legs(f, S, facing, pose, oy):
    boot = H(S["boot"]); c0 = H(S["c0"])
    if facing == "side":
        # profile scissor: front leg (right), back leg
        if pose == 1:   fx, bx = 12, 6
        elif pose == 2: fx, bx = 11, 8
        else:           fx, bx = 11, 8
        f.rect(bx, 16, 3, 6, c0); f.rect(bx-1, 21, 4, 2, boot)   # back leg
        f.rect(fx, 16, 3, 6, c0); f.rect(fx, 21, 4, 2, boot)     # front leg
    else:
        # toward/away: alternate foot height
        ld, rd = 22, 22
        if pose == 1: rd = 20
        elif pose == 2: ld = 20
        f.rect(7, 16, 3, ld-16, c0); f.rect(6, ld, 4, 2, boot)
        f.rect(10, 16, 3, rd-16, c0); f.rect(10, rd, 4, 2, boot)

def torso(f, S, facing, oy, wide):
    c0,c1,c2,trim = H(S["c0"]),H(S["c1"]),H(S["c2"]),H(S["trim"])
    x0 = 5 if wide else 6
    w = 10 if wide else 8
    f.rect(x0, 9+oy, w, 8, c1)
    f.rect(x0, 9+oy, w, 1, c2)              # top light
    f.rect(x0+1, 10+oy, 2, 6, c2)           # left chest highlight
    f.rect(x0+w-2, 10+oy, 2, 6, c0)         # right-side shadow
    f.rect(x0, 16+oy, w, 1, c0)             # bottom shade
    f.rect(x0+1, 9+oy, 1, 7, c2)            # left rim light
    f.rect(x0, 14+oy, w, 1, trim)           # belt

def arms(f, S, facing, pose, oy):
    c0 = H(S["c0"]); skin = H(S["skin"])
    if facing == "side":
        ax = 11
        f.rect(ax, 10+oy, 2, 5, c0); f.rect(ax, 15+oy, 2, 1, skin)
    else:
        la, ra = 0, 0
        if pose == 1: la, ra = 1, -1
        elif pose == 2: la, ra = -1, 1
        f.rect(4, 10+oy+la, 2, 5, c0); f.rect(4, 15+oy+la, 2, 1, skin)
        f.rect(14, 10+oy+ra, 2, 5, c0); f.rect(14, 15+oy+ra, 2, 1, skin)

def head(f, S, facing, oy):
    skin, skinHi, hair = H(S["skin"]), H(S["skinHi"]), H(S["hair"])
    if facing == "up":
        f.rect(7, 3+oy, 6, 6, hair)          # back of head = hair/hood base
        f.rect(7, 3+oy, 6, 1, H(S["c2"]))
    elif facing == "side":
        f.rect(7, 3+oy, 6, 6, skin)
        f.rect(7, 3+oy, 6, 1, skinHi)
        f.px(12, 6+oy, skin); f.px(13, 6+oy, skin)   # nose
        f.px(11, 5+oy, OUTLINE)               # eye
        f.rect(7, 3+oy, 3, 2, hair)           # hair back
    else:
        f.rect(7, 3+oy, 6, 6, skin)
        f.rect(7, 3+oy, 6, 1, skinHi)
        f.px(8, 6+oy, OUTLINE); f.px(11, 6+oy, OUTLINE)   # eyes
        f.px(9, 8+oy, H(S["skin"]) if False else OUTLINE) # mouth
        f.px(12, 7+oy, H("#00000040"))        # cheek shade (skipped if alpha)
        f.rect(7, 3+oy, 6, 1, hair)           # fringe

# ------------------------------------------------------------ class headgear
def headgear(f, S, cls, facing, oy):
    metal, gold, trim, c2 = H(S["metal"]), H(S["gold"]), H(S["trim"]), H(S["c2"])
    if cls == "warrior":
        f.rect(6, 3+oy, 8, 2, metal)         # steel dome helm
        f.rect(6, 2+oy, 8, 1, metal)
        f.rect(7, 2+oy, 2, 1, H("#ffffff"))  # small highlight
        f.px(5, 4+oy, metal); f.px(14, 4+oy, metal)  # cheek guards
        f.rect(9, 0+oy, 2, 3, H("#e04a3a") if facing!="up" else gold)  # red plume
    elif cls == "elf":
        # pointed hood
        f.rect(7, 2+oy, 6, 3, H(S["c1"]))
        f.rect(8, 0+oy, 4, 2, H(S["c1"]))
        f.px(9, -0+oy, H(S["c2"]) if False else H(S["c1"]))
        f.rect(8, 1+oy, 2, 1, c2)
    elif cls == "wizard":
        # tall pointed hat
        f.rect(6, 4+oy, 8, 1, H(S["c0"]))     # brim
        f.rect(7, 3+oy, 6, 2, H(S["c1"]))
        f.rect(8, 1+oy, 4, 2, H(S["c1"]))     # upper cone (fits frame)
        f.px(9, 3+oy, gold); f.px(11, 4+oy, gold)   # stars
        if facing != "up":
            f.rect(7, 8+oy, 6, 2, H(S["hair"]))      # white beard
    elif cls == "valkyrie":
        f.rect(6, 2+oy, 8, 3, gold)           # helm band
        f.rect(6, 2+oy, 8, 1, H("#ffffff"))
        # side wings
        f.rect(4, 1+oy, 2, 3, trim); f.px(3, 2+oy, trim)
        f.rect(14, 1+oy, 2, 3, trim); f.px(16, 2+oy, trim)
        if facing == "up":
            f.rect(8, 8+oy, 4, 5, H(S["hair"]))      # ponytail down back

# -------------------------------------------------------------- class weapon
def weapon(f, S, cls, facing, pose, oy):
    metal, gold = H(S["metal"]), H(S["gold"])
    atk = (pose == 3)
    if cls == "warrior":
        # shield (left), sword (right)
        f.rect(2, 11+oy, 3, 5, H(S["c2"])); f.rect(2, 11+oy, 3, 1, metal); f.px(3,13+oy,gold)
        if facing == "side":
            bx = 14 if not atk else 16
            f.rect(bx, 8+oy, 1, 7, metal); f.rect(bx-1, 7+oy, 3, 1, gold)
        else:
            bx = 16 if not atk else 16
            by = 6+oy if not atk else 9+oy
            f.rect(bx, by, 1, 8, metal); f.rect(bx-1, by+8, 3, 1, gold)
    elif cls == "elf":
        # bow
        if facing == "side":
            f.rect(15, 8+oy, 1, 8, H(S["trim"]))
            f.px(14, 7+oy, H(S["trim"])); f.px(14, 16+oy, H(S["trim"]))
            f.rect(13, 12+oy, 3, 1, H("#d8d8d8"))    # string/arrow
            if atk: f.rect(11, 12+oy, 5, 1, H("#d8d8d8"))
        else:
            f.rect(15, 7+oy, 1, 9, H(S["trim"]))
            f.px(14, 6+oy, H(S["trim"])); f.px(14, 16+oy, H(S["trim"]))
            f.rect(4, 4+oy, 1, 4, H(S["trim"]))      # quiver hint
    elif cls == "wizard":
        # staff with orb
        orb = H(S.get("orb","#8cf0ff"))
        sx = 15 if facing != "side" else 15
        f.rect(sx, 5+oy, 1, 13, H(S["boot"]))
        oc = orb if not atk else H("#ffffff")
        f.rect(sx-1, 3+oy, 3, 3, oc); f.px(sx, 4+oy, H("#ffffff"))
        if atk:
            f.rect(sx-2, 2+oy, 5, 1, orb); f.rect(sx, 1+oy, 1, 1, orb)
    elif cls == "valkyrie":
        # spear (right) + small shield (left)
        f.rect(3, 11+oy, 3, 4, H(S["c2"])); f.px(4,12+oy,gold)
        sx = 15 if facing != "side" else 15
        ty = 2+oy if not atk else 4+oy
        f.rect(sx, ty, 1, 16, metal)
        f.rect(sx-1, ty, 3, 2, gold)              # spear tip
        f.px(sx, ty-1, H("#ffffff"))

# --------------------------------------------------------------- frame build
def make_frame(cls, facing, pose):
    f = F()
    S = SPECS[cls]
    oy = -1 if pose in (1,2) else 0   # walk bob
    wide = cls in ("warrior","valkyrie")
    # back-layer weapon for up facing drawn first
    if facing == "up":
        weapon(f, S, cls, facing, pose, oy)
    legs(f, S, facing, pose, oy)
    torso(f, S, facing, oy, wide)
    arms(f, S, facing, pose, oy)
    head(f, S, facing, oy)
    headgear(f, S, cls, facing, oy)
    if facing != "up":
        weapon(f, S, cls, facing, pose, oy)
    f.outline()
    return f.im

def build(cls):
    sheet = Image.new("RGBA", (FW*N, FH), (0,0,0,0))
    order = [("down",0),("down",1),("down",2),("down",3),
             ("up",0),("up",1),("up",2),("up",3),
             ("side",0),("side",1),("side",2),("side",3)]
    for i,(fac,pose) in enumerate(order):
        sheet.alpha_composite(make_frame(cls, fac, pose), (i*FW, 0))
    path = os.path.join(OUT, cls+".png")
    sheet.save(path)
    print("wrote", cls+".png", sheet.size)

for c in SPECS: build(c)
print("DONE")
