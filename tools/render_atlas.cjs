const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { art, townArt, C, HERO_RAMPS, MONSTER_RAMPS } = require('./_artbundle.cjs');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const MAN = JSON.parse(fs.readFileSync(path.join(PUB, 'assets/manifest.json'), 'utf8'));
const OVERRIDE = {};
for (const s of MAN.sprites) OVERRIDE[s.key] = s;

for (const fnt of ['DejaVuSans-Bold.ttf', 'DejaVuSerif-Bold.ttf', 'DejaVuSans.ttf']) {
  const p = '/usr/share/fonts/truetype/dejavu/' + fnt;
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, fnt.replace('.ttf', ''));
}

// ---- render one procedural sprite to its own canvas (matches TextureFactory) ----
function proc(fw, fh, drawFn, shade) {
  const cv = createCanvas(fw, fh);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  if (shade) art.softShade(ctx, 0, 0, fw, fh);
  art.outlineRegion(ctx, 0, 0, fw, fh);
  return cv;
}
// ---- load an overridden PNG (crop frame 0 for spritesheets) ----
async function png(entry) {
  const img = await loadImage(path.join(PUB, entry.path));
  const fw = entry.kind === 'spritesheet' ? entry.frameWidth : img.width;
  const fh = entry.kind === 'spritesheet' ? entry.frameHeight : img.height;
  const cv = createCanvas(fw, fh);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
  return cv;
}

// override-aware sprite-sheet frame: use the manifest PNG (frame 0) if the key
// is overridden in-game, else render the procedural drawer — so the atlas always
// shows exactly what the engine displays.
async function sheetSprite(key, fw, fh, procFn, shade) {
  if (OVERRIDE[key]) return await png(OVERRIDE[key]);
  return proc(fw, fh, procFn, shade);
}
const heroDraw = (cls) => (ctx) => art.drawHumanoid(ctx, 0, cls, HERO_RAMPS[cls], 'down', 0);
const monDraw = (drawer, ramp) => (ctx) => art[drawer](ctx, 0, 0, MONSTER_RAMPS[ramp]);
const skelDraw = (ramp, role) => (ctx) => art.drawSkeletonServant(ctx, 0, 0, MONSTER_RAMPS[ramp], role);

async function build() {
  const HEROES = [];
  for (const [n,c] of [['Vanguard','vanguard'],['Thief','thief'],['Arcanist','arcanist'],['Warden','warden'],['Necromancer','necromancer'],['Bard','bard'],['Druid','druid']])
    HEROES.push([n, await sheetSprite(`hero-${c}-sheet`, 40, 48, heroDraw(c), true)]);

  const BOSSES = [];
  for (const [n,r,d] of [['Grave Warden','grave_warden','drawBoss'],['Molten Colossus','molten_colossus','drawColossus'],
    ['Rime Cantor','rime_cantor','drawBoss'],['Rot Sovereign','rot_sovereign','drawBoss'],['Brass Magnus','brass_magnus','drawColossus'],
    ['Undying Champion','arena_champion','drawColossus'],['Mire Leviathan','mire_leviathan','drawColossus'],['Tempest Herald','tempest_herald','drawBoss'],
    ['Umbral Devourer','umbral_devourer','drawBoss'],['Hollow King','hollow_king','drawBoss']]) {
    const key = r === 'grave_warden' ? 'monster-boss-sheet' : `monster-${r}-sheet`;
    BOSSES.push([n, await sheetSprite(key, 80, 80, monDraw(d,r), true)]);
  }

  const MOBROWS = [['Crypt Grunt','grunt','drawGrunt'],['Wailing Shade','ghost','drawGhost'],['Pit Demon','demon','drawDemon'],
    ['Bone Archer','bone_archer','drawBoneArcher'],['Crypt Brute','brute','drawBrute'],['Cinder Imp','imp','drawImp'],
    ['Frost Shade','frost_shade','drawGhost'],['Rime Archer','rime_archer','drawBoneArcher'],['Plague Ooze','plague_ooze','drawOoze'],
    ['Spore Imp','spore_imp','drawImp'],['Gear Knight','gear_knight','drawBrute'],['Brass Sentinel','brass_sentinel','drawConstruct'],
    ['Gladiator','gladiator','drawGrunt'],['Mire Lurker','mire_lurker','drawDemon'],['Storm Wisp','storm_wisp','drawWisp'],
    ['Sky Lancer','sky_lancer','drawBoneArcher'],['Shadow Stalker','shadow_stalker','drawStalker'],['Void Imp','void_imp','drawImp'],
    ['Hollow Knight','hollow_knight','drawBrute']];
  const MOBS = [];
  for (const [n,r,d] of MOBROWS) MOBS.push([n, await sheetSprite(`monster-${r}-sheet`, 44, 44, monDraw(d,r), true)]);

  const SKELS = [['Tank','skel_tank','tank'],['Archer','skel_archer','archer'],['Mage','skel_mage','mage'],['Thief','skel_thief','thief']]
    .map(([n,r,role]) => [n, proc(44,44, skelDraw(r,role), true)]);

  // items: PNG override where present, else procedural
  const icon = async (label, key, procFn, w=16, h=16) =>
    [label, OVERRIDE[key] ? await png(OVERRIDE[key]) : proc(w, h, procFn, false)];
  const ITEMS = [
    await icon('Sword','icon-sword', art.drawIconSword), await icon('Bow','icon-bow', art.drawIconBow),
    await icon('Staff','icon-staff', art.drawIconStaff), await icon('Mace','icon-mace', art.drawIconMace),
    await icon('Armor','icon-armor', art.drawIconArmor), await icon('Shield','icon-shield', art.drawIconShield),
    await icon('Helm','icon-helm', art.drawIconHelm), await icon('Ring','icon-ring', art.drawIconRing),
    await icon('Amulet','icon-amulet', art.drawIconAmulet), await icon('Boots','icon-boots', art.drawIconBoots),
    await icon('Gloves','icon-gloves', art.drawIconGloves), await icon('Legs','icon-legs', art.drawIconLegs),
    ['Scroll', proc(16,16, art.drawIconScroll, false)],
    await icon('HP Potion','potion-red', (c)=>art.drawPotion(c, C.hpLow, '#ff8a7a')),
    await icon('MP Potion','potion-blue', (c)=>art.drawPotion(c, C.manaFill, '#9ac4ff')),
    await icon('Coin','coin-sheet', (c)=>art.drawCoin(c,0)), await icon('Gem','gem', art.drawGem),
    await icon('Key','key', art.drawKey), ['Ration', proc(16,16, art.drawFood, false)],
  ];

  const tile = async (label, key, procFn, w=16, h=16) =>
    [label, OVERRIDE[key] ? await png(OVERRIDE[key]) : proc(w, h, procFn, false)];
  const TILES = [
    await tile('Floor','floor-0', (c)=>art.drawFloor(c,0,0,1000)),
    await tile('Wall','wall', (c)=>art.drawWall(c,0,0,false)),
    await tile('Door','door', (c)=>art.drawDoor(c,0,0,false)),
    await tile('Chest','chest', (c)=>art.drawChest(c,0,0,false)),
    await tile('Water','water-sheet', (c)=>art.drawWater(c,0,0)),
    await tile('Lava','lava-sheet', (c)=>art.drawLava(c,0,0)),
    await tile('Spikes','spikes-sheet', (c)=>art.drawSpikes(c,0,0)),
    await tile('Exit Portal','portal-sheet', (c)=>art.drawPortal(c,0,0)),
    await tile('Torch','torch-sheet', (c)=>art.drawTorch(c,0,0)),
    await tile('Altar','generator-sheet', (c)=>art.drawGenerator(c,0,0), 24,24),
    await tile('Crystal','crystal', (c)=>art.drawCrystal(c,0,0), 32,32),
    await tile('Shrine','shrine', (c)=>art.drawShrine(c,0,0,false)),
    await tile('Bones','bones', (c)=>art.drawBones(c,0,0), 32,32),
    await tile('Pillar','pillar', (c)=>art.drawPillar(c,0,0), 32,32),
    ['Banner', proc(32,32, (c)=>art.drawBanner(c,0,0), false)],
    ['Fountain', proc(64,80, (c)=>townArt.drawFountain(c,0,0), false)],
  ];

  const INT = [
    ['House', proc(32,32, (c)=>townArt.drawHouseWindow(c,0,0), false)],
    ['Tavern Bar', proc(32,32, (c)=>townArt.drawTavernBar(c,0,0), false)],
    ['Table', proc(32,32, (c)=>townArt.drawTavernTable(c,0,0), false)],
    ['Hearth', proc(32,32, (c)=>townArt.drawHearth(c,0,0), false)],
    ['Barrel', proc(32,32, (c)=>townArt.drawBarrel(c,0,0), false)],
    ['Weapon Rack', proc(32,32, (c)=>art.drawWeaponRack(c,0,0), false)],
    ['Anvil', proc(32,32, (c)=>townArt.drawAnvil(c,0,0), false)],
    ['Cauldron', proc(32,32, (c)=>townArt.drawCauldron(c,0,0), false)],
  ];

  // ---------- compose ----------
  const W = 1000;
  const canvas = createCanvas(W, 2400);
  const dr = canvas.getContext('2d');
  dr.imageSmoothingEnabled = false;
  for (let y = 0; y < canvas.height; y++) {
    const t = y / canvas.height;
    const c0 = [20,24,42], c1 = [8,9,16];
    dr.fillStyle = `rgb(${c0.map((a,i)=>Math.round(a+(c1[i]-a)*t)).join(',')})`;
    dr.fillRect(0, y, W, 1);
  }
  const FT = 'bold 42px DejaVuSerif-Bold', FH = 'bold 18px DejaVuSerif-Bold', FL = '12px DejaVuSans';
  function header(title, y) {
    dr.fillStyle = '#1b2036'; dr.fillRect(16, y, W-32, 32);
    dr.fillStyle = '#9a2a2a'; dr.fillRect(16, y, 4, 32);
    dr.fillStyle = '#e0bd84'; dr.font = FH; dr.textBaseline = 'top'; dr.fillText(title, 30, y+8);
    return y + 44;
  }
  function grid(entries, y, per, box) {
    const cw = (W - 32) / per, ch = box + 22;
    for (let i = 0; i < entries.length; i++) {
      const [label, spr] = entries[i];
      const r = Math.floor(i/per), ci = i % per;
      const cx = 16 + cw*ci + cw/2, cy = y + r*ch;
      const sc = Math.max(1, Math.floor(Math.min(box / spr.width, box / spr.height)));
      const sw = spr.width*sc, sh = spr.height*sc;
      dr.drawImage(spr, Math.round(cx - sw/2), Math.round(cy + (box - sh)/2), sw, sh);
      dr.fillStyle = '#cdd6ee'; dr.font = FL;
      const tw = dr.measureText(label).width;
      dr.fillText(label, cx - tw/2, cy + box + 4);
    }
    return y + Math.ceil(entries.length/per)*ch + 10;
  }
  dr.fillStyle = '#ffd24a'; dr.font = FT; dr.textBaseline = 'top';
  dr.fillText('STRONGBOW', 28, 20);
  dr.fillStyle = '#9aa6c8'; dr.font = '15px DejaVuSans';
  dr.fillText("every sprite straight from the running game — exactly what you see in-game", 30, 74);
  let y = 104;
  y = header('HEROES', y);                 y = grid(HEROES, y, 5, 92);
  y = header('REALM WARDENS (BOSSES)', y);  y = grid(BOSSES, y, 5, 96);
  y = header('THE BESTIARY', y);            y = grid(MOBS, y, 7, 62);
  y = header('SKELETAL SERVANTS (NECROMANCER)', y); y = grid(SKELS, y, 4, 80);
  y = header('ITEMS & PICKUPS', y);         y = grid(ITEMS, y, 7, 60);
  y = header('WORLD & DUNGEON', y);         y = grid(TILES, y, 8, 64);
  y = header('TOWN BUILDINGS & INTERIORS', y); y = grid(INT, y, 8, 64);

  const out = createCanvas(W, y + 6);
  out.getContext('2d').drawImage(canvas, 0, 0);
  const buf = out.encodeSync ? out.encodeSync('png') : await out.encode('png');
  const dst = path.join(ROOT, 'docs/sprite-atlas.png');
  fs.writeFileSync(dst, buf);
  console.log('wrote', dst, out.width + 'x' + out.height);
}
build().catch((e) => { console.error(e); process.exit(1); });
