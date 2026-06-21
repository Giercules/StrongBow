#!/usr/bin/env python3
"""Generate the README cover atlas -> docs/sprite-atlas.png.

Self-contained (Pillow only). Renders the redesigned DnD heroes, all ten realm
wardens, the full themed bestiary, the item set and the world + town tiles in a
single titled sheet. Run:  python3 tools/gen_atlas.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "sprite-atlas.png")
W = 1000
OL = (10, 10, 20, 255)


def hx(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def F(sz, serif=False):
    base = "/usr/share/fonts/truetype/dejavu/"
    names = (["DejaVuSerif-Bold.ttf"] if serif else []) + ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]
    for n in names:
        p = base + n
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


FT = F(42, True)
FS = F(15)
FH = F(18, True)
FL = F(12)


def outline(im):
    w, h = im.size
    s = im.copy().load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            if s[x, y][3] > 40:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and s[nx, ny][3] > 40:
                    px[x, y] = OL
                    break
    return im


def C(sz=28):
    im = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def hero(robe, acc, plume, weapon, shield=False):
    im, d = C()
    r = hx(robe)
    a = hx(acc)
    d.rectangle([10, 21, 12, 26], fill=hx("#2a2018"))
    d.rectangle([15, 21, 17, 26], fill=hx("#2a2018"))
    d.rectangle([8, 11, 19, 22], fill=r)
    d.rectangle([8, 11, 19, 12], fill=a)
    d.rectangle([10, 4, 17, 11], fill=hx("#e6b88a"))
    d.rectangle([9, 3, 18, 6], fill=a)
    if plume:
        d.rectangle([12, 0, 14, 4], fill=hx(plume))
    d.point((11, 8), fill=OL)
    d.point((15, 8), fill=OL)
    if shield:
        d.rectangle([5, 12, 8, 19], fill=a)
        d.point((6, 15), fill=hx("#ffd24a"))
    if weapon == "sword":
        d.rectangle([20, 6, 21, 18], fill=hx("#cfd8ea"))
        d.rectangle([19, 17, 23, 18], fill=hx("#ffd24a"))
    elif weapon == "bow":
        d.arc([19, 5, 27, 22], 300, 60, fill=hx("#caa56a"))
        d.line([22, 5, 22, 22], fill=hx("#e8e8e8"))
    elif weapon == "staff":
        d.rectangle([21, 5, 22, 22], fill=hx("#6e4a24"))
        d.ellipse([18, 2, 25, 9], fill=hx("#8cf0ff"))
    elif weapon == "mace":
        d.rectangle([21, 11, 22, 22], fill=hx("#6e521f"))
        d.ellipse([18, 4, 25, 11], fill=hx("#cfd8ea"))
    return outline(im)


def mob(main, acc, eye, shape):
    im, d = C()
    m = hx(main)
    a = hx(acc)
    e = hx(eye)
    if shape == "blob":
        d.ellipse([6, 8, 21, 22], fill=m)
        d.ellipse([8, 9, 15, 16], fill=a)
        d.point((11, 13), fill=e)
        d.point((16, 13), fill=e)
    elif shape == "ghost":
        d.ellipse([6, 4, 21, 17], fill=m)
        d.rectangle([6, 11, 21, 19], fill=m)
        for k, x in enumerate(range(7, 21, 3)):
            d.rectangle([x, 18, x + 1, 18 + (4 if k % 2 else 2)], fill=m)
        d.point((11, 10), fill=e)
        d.point((16, 10), fill=e)
    elif shape == "horned":
        d.ellipse([6, 8, 21, 22], fill=m)
        d.polygon([(8, 9), (6, 2), (11, 8)], fill=a)
        d.polygon([(19, 9), (21, 2), (16, 8)], fill=a)
        d.point((11, 13), fill=e)
        d.point((16, 13), fill=e)
    elif shape == "skeleton":
        d.rectangle([9, 10, 18, 20], fill=hx("#e9e3c9"))
        for ry in range(11, 20, 2):
            d.line([9, ry, 18, ry], fill=hx("#9a9070"))
        d.ellipse([9, 4, 18, 13], fill=hx("#efe9cf"))
        d.point((11, 9), fill=OL)
        d.point((16, 9), fill=OL)
        d.line([20, 4, 20, 20], fill=a)
    elif shape == "hulk":
        d.ellipse([4, 9, 23, 24], fill=m)
        d.ellipse([7, 10, 14, 17], fill=a)
        d.rectangle([2, 11, 5, 22], fill=m)
        d.rectangle([22, 11, 25, 22], fill=m)
        d.point((11, 14), fill=e)
        d.point((16, 14), fill=e)
    else:  # flyer
        d.polygon([(2, 8), (9, 12), (2, 16)], fill=a)
        d.polygon([(26, 8), (19, 12), (26, 16)], fill=a)
        d.ellipse([9, 8, 19, 18], fill=m)
        d.point((12, 12), fill=e)
        d.point((16, 12), fill=e)
    return outline(im)


def boss(main, acc, eye):
    im, d = C(40)
    m = hx(main)
    a = hx(acc)
    e = hx(eye)
    d.polygon([(20, 5), (7, 38), (33, 38)], fill=m)
    d.ellipse([12, 4, 28, 21], fill=hx("#15101c"))
    d.ellipse([14, 6, 26, 18], fill=m)
    d.rectangle([15, 11, 18, 13], fill=e)
    d.rectangle([22, 11, 25, 13], fill=e)
    d.rectangle([6, 16, 9, 34], fill=m)
    d.rectangle([31, 16, 34, 34], fill=m)
    d.line([33, 3, 33, 37], fill=a, width=2)
    d.ellipse([29, 1, 38, 10], fill=a)
    d.ellipse([31, 3, 36, 8], fill=hx("#ffffff"))
    return outline(im)


TH = {
    "crypt": ("#6a4f9a", "#b58aff", "#3affd0"), "molten": ("#c4451c", "#ffae2a", "#fff0a0"),
    "frost": ("#3f6e98", "#cfeaff", "#bfefff"), "toxic": ("#3a5a30", "#9fd05a", "#d6ff5a"),
    "clockwork": ("#5a4a28", "#e6c264", "#fff0b0"), "arena": ("#6e5634", "#d8b87a", "#ffd24a"),
    "bog": ("#36482f", "#82a85a", "#b6ff7a"), "storm": ("#3f4670", "#b0c8ff", "#ffffff"),
    "shadow": ("#342648", "#8a6ab0", "#c7ffe0"), "sanctum": ("#726a52", "#ecdca6", "#fff0c0"),
}

HEROES = [
    ("Vanguard", hero("#2f6fd0", "#1c3f78", "#e04a3a", "sword", True)),
    ("Strider", hero("#2f8a3a", "#1c5a2a", None, "bow")),
    ("Arcanist", hero("#6a3cc0", "#34147a", None, "staff")),
    ("Warden", hero("#c79a2e", "#8a6a1e", None, "mace")),
]

MOBS = [
    ("Crypt Grunt", "crypt", "blob"), ("Wailing Shade", "crypt", "ghost"), ("Pit Demon", "molten", "horned"),
    ("Bone Archer", "crypt", "skeleton"), ("Crypt Brute", "crypt", "hulk"), ("Cinder Imp", "molten", "flyer"),
    ("Frost Shade", "frost", "ghost"), ("Rime Archer", "frost", "skeleton"), ("Plague Ooze", "toxic", "blob"),
    ("Spore Imp", "toxic", "flyer"), ("Gear Knight", "clockwork", "hulk"), ("Brass Sentinel", "clockwork", "hulk"),
    ("Gladiator", "arena", "horned"), ("Mire Lurker", "bog", "blob"), ("Storm Wisp", "storm", "ghost"),
    ("Sky Lancer", "storm", "skeleton"), ("Shadow Stalker", "shadow", "horned"), ("Void Imp", "shadow", "flyer"),
    ("Hollow Knight", "sanctum", "hulk"),
]

BOSSES = [
    ("Grave Warden", "crypt"), ("Molten Colossus", "molten"), ("Rime Cantor", "frost"), ("Rot Sovereign", "toxic"),
    ("Brass Magnus", "clockwork"), ("Arena Champion", "arena"), ("Mire Leviathan", "bog"), ("Tempest Herald", "storm"),
    ("Umbral Devourer", "shadow"), ("Hollow King", "sanctum"),
]


def ic_sword():
    im, d = C(); d.rectangle([13, 3, 14, 17], fill=hx("#cfd8ea")); d.rectangle([9, 17, 18, 18], fill=hx("#ffd24a")); d.rectangle([13, 19, 14, 24], fill=hx("#6e521f")); return outline(im)


def ic_bow():
    im, d = C(); d.arc([8, 3, 20, 25], 300, 60, fill=hx("#8a5a2a"), width=2); d.line([12, 4, 12, 24], fill=hx("#e8e8e8")); d.line([12, 14, 19, 14], fill=hx("#d8d8d8")); return outline(im)


def ic_staff():
    im, d = C(); d.rectangle([13, 8, 14, 24], fill=hx("#6e4a24")); d.ellipse([9, 3, 19, 13], fill=hx("#8cf0ff")); d.ellipse([11, 5, 15, 9], fill=hx("#ffffff")); return outline(im)


def ic_mace():
    im, d = C(); d.rectangle([13, 12, 14, 23], fill=hx("#6e521f")); d.ellipse([8, 4, 20, 16], fill=hx("#aab4c8")); d.ellipse([10, 6, 14, 10], fill=hx("#ffffff")); return outline(im)


def ic_armor():
    im, d = C(); d.rectangle([7, 7, 20, 19], fill=hx("#3f6e98")); d.rectangle([7, 7, 20, 9], fill=hx("#9fd0ff")); d.rectangle([5, 7, 8, 12], fill=hx("#3f6e98")); d.rectangle([19, 7, 22, 12], fill=hx("#3f6e98")); return outline(im)


def ic_ring():
    im, d = C(); d.ellipse([8, 9, 20, 21], outline=hx("#ffd24a"), width=3); d.ellipse([11, 3, 17, 9], fill=hx("#8cf0ff")); return outline(im)


def ic_amulet():
    im, d = C(); d.line([8, 6, 19, 6], fill=hx("#caa56a")); d.line([8, 6, 12, 14], fill=hx("#caa56a")); d.line([19, 6, 15, 14], fill=hx("#caa56a")); d.ellipse([9, 12, 18, 21], fill=hx("#b58aff")); return outline(im)


def ic_coin():
    im, d = C(); d.ellipse([6, 6, 22, 22], fill=hx("#c79a2e")); d.ellipse([8, 8, 20, 20], fill=hx("#ffd24a")); d.ellipse([10, 10, 14, 14], fill=hx("#fff0b0")); return outline(im)


def ic_gem():
    im, d = C(); d.polygon([(14, 5), (22, 13), (14, 23), (6, 13)], fill=hx("#2fd0c0")); d.polygon([(14, 5), (18, 11), (10, 11)], fill=hx("#7fffe8")); return outline(im)


def ic_ration():
    im, d = C(); d.ellipse([7, 9, 21, 22], fill=hx("#9c6a3c")); d.ellipse([8, 8, 20, 16], fill=hx("#c08a52")); return outline(im)


def ic_potion(col, hi):
    im, d = C(); d.rectangle([11, 4, 16, 7], fill=hx("#cfd8ea")); d.ellipse([7, 11, 21, 23], fill=hx(col)); d.rectangle([11, 7, 16, 14], fill=hx(col)); d.ellipse([10, 13, 13, 16], fill=hx(hi)); return outline(im)


def ic_key():
    im, d = C(); d.ellipse([6, 5, 15, 14], outline=hx("#ffd24a"), width=3); d.rectangle([10, 12, 12, 23], fill=hx("#ffd24a")); d.rectangle([12, 19, 16, 21], fill=hx("#ffd24a")); return outline(im)


def t_fill(bg):
    im, d = C(); d.rectangle([0, 0, 28, 28], fill=hx(bg)); return im, d


def tl_floor(p0="#3a3024", p1="#4a3e2e", p2="#5a4c38"):
    im, d = t_fill(p1)
    for x, y in [(2, 2), (16, 4), (8, 14), (20, 18), (4, 20), (14, 22)]:
        d.rectangle([x, y, x + 6, y + 4], fill=hx(p2))
    for x, y in [(12, 6), (22, 10), (2, 12)]:
        d.rectangle([x, y, x + 4, y + 3], fill=hx(p0))
    return im


def tl_wall():
    im, d = t_fill("#3f6e98")
    off = 0
    for j in range(0, 28, 7):
        d.line([0, j, 28, j], fill=hx("#0e2236")); d.line([0, j + 1, 28, j + 1], fill=hx("#6fa6cc"))
        for x in range(off, 28, 14):
            d.line([x, j, x, j + 7], fill=hx("#0e2236"))
        off = 7 - off
    return im


def tl_door(lock=False):
    im, d = t_fill("#241a10"); d.rectangle([3, 2, 24, 25], fill=hx("#6e4a24"))
    for x in range(5, 24, 6):
        d.line([x, 3, x, 24], fill=hx("#3a2a14"))
    if lock:
        d.ellipse([10, 11, 17, 18], fill=hx("#cfd8ea")); d.rectangle([10, 14, 17, 19], fill=hx("#aab4c8"))
    else:
        d.ellipse([18, 12, 22, 16], fill=hx("#ffd24a"))
    return im


def tl_water():
    im, d = t_fill("#2a4659")
    for x, y in [(3, 5), (15, 9), (8, 17), (19, 20), (5, 22)]:
        d.line([x, y, x + 6, y], fill=hx("#9fd0ff"))
    return im


def tl_lava():
    im, d = t_fill("#6e2414")
    for x, y in [(2, 4), (14, 8), (7, 16), (20, 19), (4, 22)]:
        d.rectangle([x, y, x + 7, y + 2], fill=hx("#ff8a1e"))
    return im


def tl_portal(tint="#b58aff"):
    im, d = t_fill("#10121c"); d.ellipse([3, 3, 25, 25], fill=hx("#2a1a4a")); d.ellipse([6, 6, 22, 22], outline=hx(tint), width=3); d.ellipse([10, 10, 18, 18], fill=hx("#e0c8ff")); d.ellipse([12, 12, 16, 16], fill=hx("#ffffff")); return im


def tl_torch():
    im, d = t_fill("#1a1d2e"); d.rectangle([13, 12, 15, 24], fill=hx("#6e4a24")); d.ellipse([10, 5, 18, 13], fill=hx("#ff7a1e")); d.ellipse([12, 5, 16, 10], fill=hx("#ffe27a")); return im


def tl_altar():
    im, d = t_fill("#161320"); d.rectangle([8, 18, 20, 24], fill=hx("#2a2240")); d.ellipse([7, 4, 21, 18], fill=hx("#1a1030")); d.ellipse([9, 6, 19, 16], outline=hx("#b58aff"), width=3); d.ellipse([12, 9, 16, 13], fill=hx("#e0c8ff")); return im


def tl_chest():
    im, d = t_fill("#1a1d2e"); d.rectangle([5, 12, 23, 23], fill=hx("#6e4a24")); d.rectangle([5, 8, 23, 13], fill=hx("#8a5e30")); d.line([5, 8, 23, 8], fill=hx("#ffd24a")); d.rectangle([13, 13, 15, 17], fill=hx("#ffd24a")); return im


def tl_shrine():
    im, d = t_fill("#141a26"); d.rectangle([9, 18, 19, 24], fill=hx("#2a4659")); d.rectangle([11, 10, 17, 19], fill=hx("#3f6e98")); d.ellipse([10, 5, 18, 13], fill=hx("#9fd0ff")); return im


def tl_bones():
    im, d = t_fill("#3a3024"); d.line([7, 13, 21, 13], fill=hx("#efe9cf")); d.line([7, 18, 21, 18], fill=hx("#cfc9af")); d.ellipse([5, 10, 9, 15], outline=hx("#efe9cf")); return im


def tl_fountain():
    im, d = t_fill("#5a4c38"); d.ellipse([2, 2, 26, 26], outline=hx("#6e5a40"), width=3); d.ellipse([6, 6, 22, 22], fill=hx("#2a4659")); d.ellipse([12, 12, 16, 16], fill=hx("#cfeaff")); return im


def tl_banner():
    im, d = t_fill("#1a1d2e"); d.rectangle([11, 2, 17, 22], fill=hx("#9a2a2a")); d.rectangle([11, 2, 17, 4], fill=hx("#ffd24a")); d.rectangle([13, 8, 15, 14], fill=hx("#ffd24a")); d.polygon([(11, 22), (17, 22), (14, 26)], fill=hx("#9a2a2a")); return im


ITEMS = [
    ("Sword", ic_sword()), ("Bow", ic_bow()), ("Staff", ic_staff()), ("Mace", ic_mace()), ("Armor", ic_armor()),
    ("Ring", ic_ring()), ("Amulet", ic_amulet()), ("Coin", ic_coin()), ("Gem", ic_gem()), ("Ration", ic_ration()),
    ("HP Potion", ic_potion("#d63a3a", "#ff8a8a")), ("MP Potion", ic_potion("#3a6ad6", "#8ab0ff")), ("Key", ic_key()),
]

TILES = [
    ("Floor", tl_floor()), ("Wall", tl_wall()), ("Door", tl_door()), ("Locked Door", tl_door(True)),
    ("Water", tl_water()), ("Lava", tl_lava()), ("Exit Portal", tl_portal()), ("Torch", tl_torch()),
    ("Altar", tl_altar()), ("Chest", tl_chest()), ("Shrine", tl_shrine()), ("Bones", tl_bones()),
    ("Town Cobbles", tl_floor("#241a10", "#5a4c38", "#6a5a42")), ("Fountain", tl_fountain()),
    ("Shop Banner", tl_banner()), ("Gate", tl_portal("#c79bff")),
]

canvas = Image.new("RGBA", (W, 2000), hx("#10131f"))
dr = ImageDraw.Draw(canvas)
for y in range(canvas.height):
    t = y / canvas.height
    c = tuple(int(a + (b - a) * t) for a, b in zip((20, 24, 42), (8, 9, 16)))
    dr.line([(0, y), (W, y)], fill=c + (255,))


def header(title, y):
    dr.rectangle([16, y, W - 16, y + 32], fill=hx("#1b2036"))
    dr.rectangle([16, y, 20, y + 32], fill=hx("#9a2a2a"))
    dr.text((30, y + 7), title, font=FH, fill=hx("#e0bd84"))
    return y + 44


def grid(entries, y, per, scale, box):
    cw = (W - 32) // per
    ch = box + 22
    for i, (label, im) in enumerate(entries):
        r = i // per
        cidx = i % per
        cx = 16 + cw * cidx + cw // 2
        cy = y + r * ch
        sp = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        canvas.alpha_composite(sp, (int(cx - sp.width // 2), int(cy + (box - sp.height) // 2)))
        tw = dr.textlength(label, font=FL)
        dr.text((cx - tw / 2, cy + box + 2), label, font=FL, fill=hx("#cdd6ee"))
    return y + ((len(entries) + per - 1) // per) * ch + 10


dr.text((28, 20), "STRONGBOW", font=FT, fill=hx("#ffd24a"))
dr.text((30, 70), "100% original procedural pixel art  -  ten themed realms  -  a living town hub", font=FS, fill=hx("#9aa6c8"))
y = 104
y = header("HEROES", y)
y = grid(HEROES, y, 4, 3, 92)
y = header("REALM WARDENS (BOSSES)", y)
y = grid([(n, boss(*TH[t])) for n, t in BOSSES], y, 5, 2, 96)
y = header("THE BESTIARY", y)
y = grid([(n, mob(*TH[t], sh)) for n, t, sh in MOBS], y, 7, 2, 62)
y = header("ITEMS & PICKUPS", y)
y = grid(ITEMS, y, 7, 2, 64)
y = header("WORLD & TOWN", y)
y = grid(TILES, y, 8, 2, 64)
out = canvas.crop((0, 0, W, y + 6))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out.save(OUT)
print("wrote", OUT, out.size)
