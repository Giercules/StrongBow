// Headless town QA renderer — composes the full Hearthwatch map (tiles + decor
// + spawn markers) exactly as buildTown() lays it out, so layout and art can be
// judged without booting the game. Build + run:
//   npx esbuild tools/_townbundle.ts --bundle --format=cjs --platform=node --outfile=tools/_townbundle.cjs && node tools/render_town.cjs
// Writes docs/town-map.png at 16px per tile.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { buildTown, art, townArt, overworldArt, C, THEME_ART, Tile } = require('./_townbundle.cjs');

const T = 16; // px per tile
const level = buildTown();
const { width: W, height: H, tiles, decor, spawns } = level;

const out = createCanvas(W * T, H * T);
const g = out.getContext('2d');
g.imageSmoothingEnabled = false;

// sprite cache: render each drawer once to its own canvas
const cache = new Map();
function sprite(key, w, h, draw, outline = true) {
  if (cache.has(key)) return cache.get(key);
  const cv = createCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  if (outline) art.outlineRegion(ctx, 0, 0, w, h);
  cache.set(key, cv);
  return cv;
}

const town = THEME_ART.town;
const DRAWERS = {
  // flat / building tiles drawn 1:1 (32px covering a 2x2-tile footprint feel)
  road: () => sprite('road', 32, 32, (c) => townArt.drawRoad(c, 0, 0, 7), false),
  'grass-tuft': () => sprite('grass-tuft', 32, 32, (c) => townArt.drawGrassTuft(c, 0, 0), false),
  'bridge-plank': () => sprite('bridge-plank', 32, 32, (c) => townArt.drawBridgePlank(c, 0, 0), false),
  chain: () => sprite('chain', 32, 32, (c) => townArt.drawChain(c, 0, 0), false),
  'town-gate': () => sprite('town-gate', 32, 32, (c) => townArt.drawTownGate(c, 0, 0)),
  'town-tree': () => sprite('town-tree', 32, 32, (c) => townArt.drawTownTree(c, 0, 0)),
  'town-bush': () => sprite('town-bush', 32, 32, (c) => townArt.drawTownBush(c, 0, 0)),
  banner: () => sprite('banner', 32, 32, (c) => art.drawBanner(c, 0, 0)),
  brazier: () => sprite('brazier', 32, 32, (c) => art.drawBrazier(c, 0, 0)),
  pillar: () => sprite('pillar', 32, 32, (c) => art.drawPillar(c, 0, 0)),
  'weapon-rack': () => sprite('weapon-rack', 32, 32, (c) => art.drawWeaponRack(c, 0, 0)),
  fountain: () => sprite('fountain', 64, 80, (c) => townArt.drawFountain(c, 0, 0)),
  'fountain-base': () => sprite('fountain-base', 200, 164, (c) => townArt.drawFountainBase(c, 0, 0), false),
  barrel: () => sprite('barrel', 32, 32, (c) => townArt.drawBarrel(c, 0, 0)),
  crate: () => sprite('crate', 32, 32, (c) => townArt.drawCrate(c, 0, 0)),
  'training-dummy': () => sprite('training-dummy', 32, 32, (c) => townArt.drawTrainingDummy(c, 0, 0)),
  signpost: () => sprite('signpost', 32, 32, (c) => overworldArt.drawSignpost(c, 0, 0)),
  reeds: () => sprite('reeds', 32, 32, (c) => overworldArt.drawReeds(c, 0, 0)),
  wildflowers: () => sprite('wildflowers', 32, 32, (c) => overworldArt.drawWildflowers(c, 0, 0), false),
  cattail: () => sprite('cattail', 32, 32, (c) => art.drawCattail(c, 0, 0)),
  // house facade tiles (1:1)
  'house-wall': () => sprite('house-wall', 32, 32, (c) => townArt.drawHouseWall(c, 0, 0), false),
  'house-post': () => sprite('house-post', 32, 32, (c) => townArt.drawHousePost(c, 0, 0), false),
  'house-beam': () => sprite('house-beam', 32, 32, (c) => townArt.drawHouseBeam(c, 0, 0), false),
  'house-base': () => sprite('house-base', 32, 32, (c) => townArt.drawHouseBase(c, 0, 0), false),
  'house-window': () => sprite('house-window', 32, 32, (c) => townArt.drawHouseWindow(c, 0, 0), false),
  'house-door': () => sprite('house-door', 32, 32, (c) => townArt.drawHouseDoor(c, 0, 0)),
  'house-roof-red': () => sprite('house-roof-red', 32, 32, (c) => townArt.drawHouseRoofRed(c, 0, 0)),
  'house-roof-blue': () => sprite('house-roof-blue', 32, 32, (c) => townArt.drawHouseRoofBlue(c, 0, 0)),
  'house-roof-green': () => sprite('house-roof-green', 32, 32, (c) => townArt.drawHouseRoofGreen(c, 0, 0)),
  'house-roof-teak': () => sprite('house-roof-teak', 32, 32, (c) => townArt.drawHouseRoofTeak(c, 0, 0)),
  'house-eave-red': () => sprite('house-eave-red', 32, 32, (c) => townArt.drawHouseEaveRed(c, 0, 0)),
  'house-eave-blue': () => sprite('house-eave-blue', 32, 32, (c) => townArt.drawHouseEaveBlue(c, 0, 0)),
  'house-eave-green': () => sprite('house-eave-green', 32, 32, (c) => townArt.drawHouseEaveGreen(c, 0, 0)),
  'house-eave-teak': () => sprite('house-eave-teak', 32, 32, (c) => townArt.drawHouseEaveTeak(c, 0, 0)),
};
// new-decor drawers are looked up dynamically so this tool keeps working as
// townArt grows: any decor key 'foo-bar' tries townArt.drawFooBar first.
function drawerFor(key) {
  if (DRAWERS[key]) return DRAWERS[key]();
  const fn = 'draw' + key.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase());
  if (typeof townArt[fn] === 'function') return sprite(key, 32, 32, (c) => townArt[fn](c, 0, 0));
  if (typeof art[fn] === 'function') return sprite(key, 32, 32, (c) => art[fn](c, 0, 0));
  if (typeof overworldArt[fn] === 'function') return sprite(key, 32, 32, (c) => overworldArt[fn](c, 0, 0));
  return null;
}

// ---- tiles ----
const floorCv = [];
for (let i = 0; i < 4; i++) floorCv.push(sprite('floor' + i, 16, 16, (c) => art.drawFloor(c, 0, 0, 1000 + i * 97, town.floor), false));
const waterCv = sprite('water', 16, 16, (c) => art.drawWater(c, 0, 0), false);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = tiles[y][x];
    if (t === Tile.WATER) g.drawImage(waterCv, x * T, y * T);
    else if (t === Tile.FLOOR) g.drawImage(floorCv[(x * 7 + y * 13) % 4], x * T, y * T);
    else { // wall / building block — dark mass (facades draw over it)
      g.fillStyle = '#241c12';
      g.fillRect(x * T, y * T, T, T);
    }
  }
}

// ---- decor (flat first, then upright sorted by y so overlap reads correctly) ----
const FLAT = new Set(['road', 'grass-tuft', 'bridge-plank', 'chain', 'wood-floor', 'rug', 'flower-bed', 'wildflowers']);
const BUILDING = new Set(Object.keys(DRAWERS).filter((k) => k.startsWith('house-')));
const flat = [], build = [], upright = [];
for (const d of decor) (FLAT.has(d.key) ? flat : BUILDING.has(d.key) ? build : upright).push(d);
upright.sort((a, b) => a.y - b.y);
const put = (d, scale) => {
  const cv = drawerFor(d.key);
  if (!cv) { console.warn('no drawer for', d.key); return; }
  const w = cv.width * scale, h = cv.height * scale;
  const cxp = d.x * T + T / 2, cyp = d.y * T + T / 2;
  if (d.key === 'fountain-base') g.drawImage(cv, Math.round(cxp - w / 2), Math.round(cyp - h / 2), w, h);
  else g.drawImage(cv, Math.round(cxp - w / 2), Math.round(cyp - h / 2), w, h);
};
for (const d of flat) put(d, 0.65);
for (const d of build) put(d, 1);
// fountain pool base renders under the fountain sprite
for (const d of upright) if (d.key === 'fountain') put({ ...d, key: 'fountain-base' }, 1);
for (const d of upright) put(d, d.key === 'fountain' ? 1 : 0.75);

// ---- spawn markers ----
g.font = 'bold 11px sans-serif';
g.textBaseline = 'bottom';
for (const sp of spawns) {
  const x = sp.x * T + T / 2, y = sp.y * T + T / 2;
  if (sp.kind === 'portal') {
    g.fillStyle = 'rgba(180,120,255,0.85)';
    g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe9a8';
    g.fillText(sp.label ?? 'portal', x - g.measureText(sp.label ?? 'portal').width / 2, y - 12);
  } else if (sp.kind === 'door') {
    g.fillStyle = '#7fd0ff';
    g.fillText(sp.label ?? 'door', x - g.measureText(sp.label ?? 'door').width / 2, y - 8);
  } else if (sp.kind === 'merchant') {
    g.fillStyle = '#ffce6a';
    g.fillText(sp.label ?? 'shop', x - g.measureText(sp.label ?? 'shop').width / 2, y - 8);
  } else if (sp.kind === 'npc') {
    g.fillStyle = 'rgba(120,255,160,0.9)';
    g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  } else if (sp.kind === 'playerStart') {
    g.strokeStyle = '#ff5a5a'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff9a8a';
    g.fillText('START', x - g.measureText('START').width / 2, y - 10);
  }
}

const dst = path.join(__dirname, '..', 'docs', 'town-map.png');
fs.writeFileSync(dst, out.encodeSync('png'));
console.log('wrote', dst, out.width + 'x' + out.height);
