"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tools/_townbundle.ts
var townbundle_exports = {};
__export(townbundle_exports, {
  C: () => C,
  THEME_ART: () => THEME_ART,
  Tile: () => Tile,
  art: () => spriteArt_exports,
  buildTown: () => buildTown,
  overworldArt: () => overworldArt_exports,
  townArt: () => townArt_exports
});
module.exports = __toCommonJS(townbundle_exports);

// src/core/constants.ts
var LEFT_PANEL_WIDTH = 200;
var HUD_PANEL_WIDTH = 220;
var GAME_WIDTH = 960;
var PLAY_AREA_WIDTH = GAME_WIDTH - LEFT_PANEL_WIDTH - HUD_PANEL_WIDTH;
var Tile = /* @__PURE__ */ ((Tile2) => {
  Tile2[Tile2["VOID"] = 0] = "VOID";
  Tile2[Tile2["FLOOR"] = 1] = "FLOOR";
  Tile2[Tile2["WALL"] = 2] = "WALL";
  Tile2[Tile2["DOOR"] = 3] = "DOOR";
  Tile2[Tile2["LOCKED_DOOR"] = 4] = "LOCKED_DOOR";
  Tile2[Tile2["WATER"] = 5] = "WATER";
  Tile2[Tile2["LAVA"] = 6] = "LAVA";
  Tile2[Tile2["EXIT"] = 7] = "EXIT";
  Tile2[Tile2["ICE"] = 8] = "ICE";
  Tile2[Tile2["POISON"] = 9] = "POISON";
  Tile2[Tile2["SPIKES"] = 10] = "SPIKES";
  Tile2[Tile2["GRASS"] = 11] = "GRASS";
  Tile2[Tile2["SAND"] = 12] = "SAND";
  Tile2[Tile2["MUD"] = 13] = "MUD";
  Tile2[Tile2["ROCK"] = 14] = "ROCK";
  return Tile2;
})(Tile || {});

// src/data/town.ts
var REALMS = [
  { id: "sunken_crypt", name: "Sunken Crypt" },
  { id: "molten_deep", name: "Molten Deep" },
  { id: "frozen_cathedral", name: "Frozen Cathedral" },
  { id: "toxic_undercroft", name: "Toxic Undercroft" },
  { id: "clockwork_vault", name: "Clockwork Vault" },
  { id: "blood_arena", name: "Blood Arena" },
  { id: "drowned_bog", name: "Drowned Bog" },
  { id: "storm_spire", name: "Storm Spire" },
  { id: "shadow_warren", name: "Shadow Warren" },
  { id: "undermaw_sanctum", name: "Sanctum of the Undermaw" }
];
function buildTown() {
  const W = 104;
  const H = 112;
  const tiles = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(2 /* WALL */));
  const decor = [];
  const spawns = [];
  const pickups = [];
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const setT = (x, y, t) => {
    if (inB(x, y)) tiles[y][x] = t;
  };
  const rect = (x0, y0, x1, y1, t) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t);
  };
  const roadSet = /* @__PURE__ */ new Set();
  const noFoliage = /* @__PURE__ */ new Set();
  const mark = (set, x, y) => set.add(`${x},${y}`);
  const deco = (x, y, key) => {
    decor.push({ x, y, key });
    mark(noFoliage, x, y);
  };
  rect(3, 3, W - 4, H - 4, 5 /* WATER */);
  rect(5, 5, W - 6, H - 6, 1 /* FLOOR */);
  const cx = Math.floor(W / 2);
  const RIVER_Y0 = 52;
  const RIVER_Y1 = 55;
  rect(5, RIVER_Y0, W - 6, RIVER_Y1, 5 /* WATER */);
  const WGATE_Y = 34;
  const EGATE_Y = 75;
  const plank = (x, y) => {
    decor.push({ x, y, key: "bridge-plank" });
    mark(noFoliage, x, y);
    mark(roadSet, x, y);
  };
  for (const bx of [cx - 1, cx, cx + 1]) {
    setT(bx, 3, 1 /* FLOOR */);
    setT(bx, 4, 1 /* FLOOR */);
    setT(bx, H - 5, 1 /* FLOOR */);
    setT(bx, H - 4, 1 /* FLOOR */);
    rect(bx, 0, bx, 2, 1 /* FLOOR */);
    rect(bx, H - 3, bx, H - 1, 1 /* FLOOR */);
    plank(bx, 3);
    plank(bx, 4);
    plank(bx, H - 5);
    plank(bx, H - 4);
  }
  for (const by of [WGATE_Y - 1, WGATE_Y, WGATE_Y + 1]) {
    setT(3, by, 1 /* FLOOR */);
    setT(4, by, 1 /* FLOOR */);
    rect(0, by, 2, by, 1 /* FLOOR */);
    plank(3, by);
    plank(4, by);
  }
  for (const by of [EGATE_Y - 1, EGATE_Y, EGATE_Y + 1]) {
    setT(W - 5, by, 1 /* FLOOR */);
    setT(W - 4, by, 1 /* FLOOR */);
    rect(W - 3, by, W - 1, by, 1 /* FLOOR */);
    plank(W - 5, by);
    plank(W - 4, by);
  }
  deco(cx, 1, "town-gate");
  deco(cx, H - 2, "town-gate");
  deco(1, WGATE_Y, "town-gate");
  deco(W - 2, EGATE_Y, "town-gate");
  spawns.push({ kind: "door", x: cx, y: 1, interiorId: "overworld", dir: "north", label: "North Road" });
  spawns.push({ kind: "door", x: cx, y: H - 2, interiorId: "overworld", dir: "south", label: "South Road" });
  spawns.push({ kind: "door", x: 1, y: WGATE_Y, interiorId: "overworld", dir: "west", label: "West Road" });
  spawns.push({ kind: "door", x: W - 2, y: EGATE_Y, interiorId: "overworld", dir: "east", label: "East Road" });
  const riverBridge = (x0) => {
    for (let x = x0; x <= x0 + 2; x++) {
      for (let y = RIVER_Y0; y <= RIVER_Y1; y++) {
        setT(x, y, 1 /* FLOOR */);
        plank(x, y);
      }
    }
    decor.push({ x: x0 - 1, y: RIVER_Y0, key: "chain" });
    decor.push({ x: x0 + 3, y: RIVER_Y0, key: "chain" });
    decor.push({ x: x0 - 1, y: RIVER_Y1, key: "chain" });
    decor.push({ x: x0 + 3, y: RIVER_Y1, key: "chain" });
  };
  riverBridge(cx - 1);
  riverBridge(22);
  riverBridge(80);
  const house = (x0, y0, x1, y1, roofKey) => {
    rect(x0, y0, x1, y1, 2 /* WALL */);
    const doorX = Math.floor((x0 + x1) / 2);
    for (let y = y0 + 2; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1;
        let key = "house-wall";
        if (y === y1) key = "house-base";
        else if (y === y0 + 2) key = "house-beam";
        else if (edge) key = "house-post";
        if ((y === y0 + 4 || y === y0 + 6) && y < y1 && !edge && (x - x0) % 2 === 1) key = "house-window";
        decor.push({ x, y, key });
      }
    }
    const eaveKey = roofKey.replace("roof", "eave");
    for (let x = x0; x <= x1; x++) {
      decor.push({ x, y: y0, key: roofKey });
      decor.push({ x, y: y0 + 1, key: eaveKey });
    }
    decor.push({ x: doorX, y: y1, key: "house-door" });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };
  house(16, 11, 26, 18, "house-roof-teak");
  decor.push({ x: 21, y: 14, key: "banner" });
  spawns.push({ kind: "door", x: 21, y: 18, interiorId: "interior_forge", label: "Brunda's Forge" });
  deco(28, 20, "crate");
  deco(30, 20, "barrel");
  deco(29, 22, "cart");
  house(33, 11, 43, 18, "house-roof-green");
  decor.push({ x: 38, y: 14, key: "banner" });
  spawns.push({ kind: "door", x: 38, y: 18, interiorId: "interior_apothecary", label: "The Green Vial" });
  deco(33, 20, "flower-bed");
  deco(43, 20, "flower-bed");
  house(48, 11, 60, 19, "house-roof-teak");
  decor.push({ x: 54, y: 14, key: "banner" });
  decor.push({ x: 50, y: 14, key: "weapon-rack" });
  decor.push({ x: 58, y: 14, key: "weapon-rack" });
  spawns.push({ kind: "door", x: 54, y: 19, interiorId: "interior_guild", label: "Fighters Guild" });
  deco(57, 22, "training-dummy");
  deco(61, 22, "training-dummy");
  deco(59, 21, "weapon-rack");
  house(64, 11, 76, 19, "house-roof-red");
  decor.push({ x: 70, y: 14, key: "banner" });
  spawns.push({ kind: "door", x: 70, y: 19, interiorId: "interior_tankard", label: "The Gilded Tankard" });
  deco(63, 21, "barrel");
  deco(77, 21, "barrel");
  house(82, 11, 92, 19, "house-roof-blue");
  decor.push({ x: 87, y: 14, key: "banner" });
  spawns.push({ kind: "merchant", shop: "home", x: 87, y: 21, label: "Your Lodge" });
  deco(90, 21, "chest");
  deco(83, 22, "flower-bed");
  deco(91, 22, "flower-bed");
  deco(89, 23, "town-bush");
  for (const bx of [15, 28, 32, 45, 63, 78, 81, 94]) deco(bx, 20, "brazier");
  const fcx = cx;
  const fcy = 33;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx / 27 + dy * dy / 17 <= 1) {
        setT(fcx + dx, fcy + dy, 5 /* WATER */);
        mark(noFoliage, fcx + dx, fcy + dy);
      }
    }
  for (const [px, py] of [
    [fcx - 6, fcy - 4],
    [fcx + 6, fcy - 4],
    [fcx - 6, fcy + 4],
    [fcx + 6, fcy + 4]
  ])
    deco(px, py, "pillar");
  decor.push({ x: fcx, y: fcy, key: "fountain" });
  deco(49, 26, "statue");
  deco(56, 26, "statue");
  for (const hx of [45, 46, 47, 48, 57, 58, 59, 60]) {
    deco(hx, 27, "hedge");
    deco(hx, 39, "hedge");
  }
  for (const [lx, ly] of [[43, 27], [62, 27], [43, 39], [62, 39]]) deco(lx, ly, "lamp-post");
  deco(46, 30, "flower-bed");
  deco(59, 30, "flower-bed");
  deco(46, 37, "flower-bed");
  deco(59, 37, "flower-bed");
  const roadTile = (x, y) => {
    if (!inB(x, y) || tiles[y][x] !== 1 /* FLOOR */) return;
    const k = `${x},${y}`;
    if (roadSet.has(k)) return;
    roadSet.add(k);
    decor.push({ x, y, key: "road" });
    mark(noFoliage, x, y);
  };
  for (let y = 5; y <= H - 6; y++) {
    roadTile(cx, y);
    roadTile(cx + 1, y);
  }
  for (let x = 5; x <= W - 6; x++) {
    roadTile(x, WGATE_Y - 1);
    roadTile(x, WGATE_Y);
    roadTile(x, EGATE_Y - 1);
    roadTile(x, EGATE_Y);
  }
  for (let y = 28; y <= 38; y++) for (let x = 44; x <= 61; x++) roadTile(x, y);
  const GATE_XS = [24, 39, 54, 69, 84];
  const court = (y, first) => {
    for (let i = 0; i < 5; i++) {
      const x = GATE_XS[i];
      const r = REALMS[first + i];
      for (let py = y - 2; py <= y + 2; py++) for (let px = x - 3; px <= x + 3; px++) roadTile(px, py);
      spawns.push({ kind: "portal", realmId: r.id, label: r.name, x, y });
      deco(x - 2, y - 1, "brazier");
      deco(x + 2, y - 1, "brazier");
      mark(noFoliage, x, y);
    }
    deco(GATE_XS[0] - 8, y, "lamp-post");
    deco(GATE_XS[4] + 8, y, "lamp-post");
  };
  court(45, 0);
  court(97, 5);
  spawns.push({ kind: "playerStart", x: 54, y: 58 });
  for (let y = 62; y <= 70; y++) for (let x = 16; x <= 38; x++) roadTile(x, y);
  deco(24, 59, "quest-board");
  deco(40, 30, "quest-board");
  deco(19, 61, "stall-red");
  deco(26, 61, "stall-blue");
  deco(33, 61, "stall-red");
  deco(16, 66, "stall-blue");
  deco(27, 66, "well");
  deco(36, 64, "cart");
  deco(37, 69, "crate");
  deco(39, 69, "barrel");
  deco(15, 70, "hay-bale");
  deco(21, 71, "barrel");
  deco(41, 62, "lamp-post");
  deco(14, 62, "lamp-post");
  house(62, 58, 72, 65, "house-roof-green");
  house(78, 58, 88, 65, "house-roof-blue");
  for (let fx = 62; fx <= 88; fx++) {
    if (fx >= 74 && fx <= 76) continue;
    deco(fx, 71, "fence-h");
  }
  for (let fy = 67; fy <= 70; fy++) {
    deco(61, fy, "fence-v");
    deco(89, fy, "fence-v");
  }
  deco(64, 68, "flower-bed");
  deco(68, 69, "flower-bed");
  deco(82, 68, "flower-bed");
  deco(86, 69, "flower-bed");
  deco(66, 67, "town-bush");
  deco(84, 67, "town-bush");
  deco(75, 69, "well");
  house(14, 80, 24, 87, "house-roof-teak");
  for (let fx = 28; fx <= 44; fx++) {
    if (fx !== 36 && fx !== 37) deco(fx, 80, "fence-h");
    deco(fx, 88, "fence-h");
  }
  for (let fy = 81; fy <= 87; fy++) {
    deco(27, fy, "fence-v");
    deco(45, fy, "fence-v");
  }
  for (const [hx, hy] of [[30, 83], [34, 85], [38, 82], [42, 85], [31, 87]]) deco(hx, hy, "hay-bale");
  deco(40, 87, "cart");
  deco(26, 79, "hay-bale");
  for (let py = 82; py <= 86; py++) for (let px = 79; px <= 85; px++) roadTile(px, py);
  deco(79, 82, "pillar");
  deco(85, 82, "pillar");
  deco(79, 86, "pillar");
  deco(85, 86, "pillar");
  deco(82, 83, "idol");
  decor.push({ x: 82, y: 81, key: "banner" });
  deco(80, 85, "flower-bed");
  deco(84, 85, "flower-bed");
  deco(77, 84, "lamp-post");
  deco(87, 84, "lamp-post");
  for (let x = 9; x <= W - 10; x += 7) {
    if (Math.abs(x - cx) > 4 && Math.abs(x - 23) > 3 && Math.abs(x - 81) > 3) {
      decor.push({ x, y: RIVER_Y0 - 1, key: "cattail" });
      decor.push({ x: x + 3, y: RIVER_Y1 + 1, key: "reeds" });
    }
  }
  for (const [lx, ly] of [[32, 53], [60, 54], [90, 53], [12, 54]])
    decor.push({ x: lx, y: ly, key: "lilypad" });
  deco(49, 50, "signpost");
  deco(56, 57, "signpost");
  for (const [lx, ly] of [[50, 8], [55, 22], [50, 48], [55, 60], [50, 80], [55, 92], [50, 104]])
    deco(lx, ly, "lamp-post");
  const foliageOk = (x, y) => inB(x, y) && tiles[y][x] === 1 /* FLOOR */ && !roadSet.has(`${x},${y}`) && !noFoliage.has(`${x},${y}`);
  const tree = (x, y) => {
    if (foliageOk(x, y)) decor.push({ x, y, key: "town-tree" });
  };
  const bush = (x, y) => {
    if (foliageOk(x, y)) decor.push({ x, y, key: "town-bush" });
  };
  for (let x = 8; x <= W - 9; x += 6) {
    tree(x, 7);
    tree(x + 3, H - 8);
  }
  for (let y = 10; y <= H - 11; y += 7) {
    tree(7, y);
    tree(W - 8, y);
  }
  for (const [tx, ty] of [
    [12, 26],
    [16, 28],
    [20, 26],
    [24, 28],
    [12, 31],
    [20, 31],
    [28, 27],
    [32, 29],
    [36, 26],
    [16, 41],
    [24, 40],
    [32, 41],
    [72, 26],
    [76, 29],
    [80, 26],
    [84, 29],
    [88, 26],
    [92, 29],
    [68, 40],
    [76, 41],
    [84, 40],
    [92, 41]
  ]) tree(tx, ty);
  for (let x = 11; x <= W - 11; x += 9) {
    tree(x, RIVER_Y0 - 3);
    tree(x + 4, RIVER_Y1 + 3);
  }
  for (const [bx, by] of [
    [fcx - 9, fcy],
    [fcx + 9, fcy],
    [30, 26],
    [74, 26],
    [14, 40],
    [90, 40],
    [12, 48],
    [92, 48],
    [46, 60],
    [58, 66],
    [20, 76],
    [50, 88],
    [70, 90],
    [90, 92],
    [34, 74],
    [66, 78]
  ]) {
    bush(bx, by);
  }
  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (!foliageOk(x, y)) continue;
      const h = (x * 13 + y * 29) % 23;
      if (h === 0) decor.push({ x, y, key: "grass-tuft" });
      else if (h === 11) decor.push({ x, y, key: "wildflowers" });
    }
  }
  const folk = [
    // Upper Hearthwatch
    [46, 33, "Crier Bom", "the booming town crier"],
    [58, 36, "Pib", "a wandering lute-player"],
    [40, 45, "Garrick", "an off-duty city watchman"],
    [70, 24, "Sella", "a chambermaid from the Tankard"],
    // Lower Hearthwatch
    [24, 64, "Old Maren", "a stooped flower-seller"],
    [31, 68, "Tomas", "a nervous merchant down on his luck"],
    [75, 67, "Hesh", "a hooded fortune-teller"],
    [82, 86, "Sister Vael", "a road-worn pilgrim of the light"],
    [30, 79, "Farmer Wen", "a sun-leathered farmhand"],
    [60, 97, "Warden Ost", "the keeper of the Deep Court gates"]
  ];
  folk.forEach(([x, y, label, role]) => spawns.push({ kind: "npc", x, y, label, npcRole: role }));
  for (const [x, y] of [
    [50, 58],
    [58, 58],
    [52, 61],
    [56, 61]
  ])
    pickups.push({ kind: "coin", x, y, coin: 30 });
  return {
    id: "town",
    name: "Hearthwatch",
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    decor,
    theme: "town",
    ambientColor: 1709584,
    town: true,
    subtitle: "Hearthwatch \u2014 the last free town above the Undermaw.",
    chapter: "Hearthwatch",
    story: "Welcome to Hearthwatch, the last free town above the Undermaw. Upper Hearthwatch holds the shops, the fountain plaza and the High Court gates (realms I\u2013V); cross the river Hearthrun to Lower Hearthwatch for the market, the farmstead and the Deep Court (realms VI\u2013X)."
  };
}
var TOWN = buildTown();

// src/rendering/spriteArt.ts
var spriteArt_exports = {};
__export(spriteArt_exports, {
  BOSS_FH: () => BOSS_FH,
  BOSS_FW: () => BOSS_FW,
  HERO_FH: () => HERO_FH,
  HERO_FW: () => HERO_FW,
  MON_FH: () => MON_FH,
  MON_FW: () => MON_FW,
  PX: () => PX,
  R: () => R,
  drawAltar: () => drawAltar,
  drawArrow: () => drawArrow,
  drawAura: () => drawAura,
  drawBanner: () => drawBanner,
  drawBloodStain: () => drawBloodStain,
  drawBogStump: () => drawBogStump,
  drawBolt: () => drawBolt,
  drawBoneArcher: () => drawBoneArcher,
  drawBonePile: () => drawBonePile,
  drawBones: () => drawBones,
  drawBoss: () => drawBoss,
  drawBrazier: () => drawBrazier,
  drawBrute: () => drawBrute,
  drawCandle: () => drawCandle,
  drawCattail: () => drawCattail,
  drawChest: () => drawChest,
  drawCog: () => drawCog,
  drawCoin: () => drawCoin,
  drawColossus: () => drawColossus,
  drawConstruct: () => drawConstruct,
  drawCrystal: () => drawCrystal,
  drawDeadTree: () => drawDeadTree,
  drawDemon: () => drawDemon,
  drawDoor: () => drawDoor,
  drawEdgeTint: () => drawEdgeTint,
  drawFire: () => drawFire,
  drawFloor: () => drawFloor,
  drawFood: () => drawFood,
  drawFrostBanner: () => drawFrostBanner,
  drawGauge: () => drawGauge,
  drawGem: () => drawGem,
  drawGenerator: () => drawGenerator,
  drawGhost: () => drawGhost,
  drawGlowDot: () => drawGlowDot,
  drawGravestone: () => drawGravestone,
  drawGrunt: () => drawGrunt,
  drawHitStar: () => drawHitStar,
  drawHumanoid: () => drawHumanoid,
  drawIce: () => drawIce,
  drawIcicle: () => drawIcicle,
  drawIconAmulet: () => drawIconAmulet,
  drawIconArmor: () => drawIconArmor,
  drawIconBoots: () => drawIconBoots,
  drawIconBow: () => drawIconBow,
  drawIconFish: () => drawIconFish,
  drawIconGloves: () => drawIconGloves,
  drawIconHelm: () => drawIconHelm,
  drawIconLegs: () => drawIconLegs,
  drawIconMace: () => drawIconMace,
  drawIconRing: () => drawIconRing,
  drawIconScroll: () => drawIconScroll,
  drawIconShield: () => drawIconShield,
  drawIconStaff: () => drawIconStaff,
  drawIconSword: () => drawIconSword,
  drawIdol: () => drawIdol,
  drawImp: () => drawImp,
  drawKey: () => drawKey,
  drawLava: () => drawLava,
  drawLavaCrack: () => drawLavaCrack,
  drawLilypad: () => drawLilypad,
  drawMagicBurst: () => drawMagicBurst,
  drawObsidian: () => drawObsidian,
  drawOoze: () => drawOoze,
  drawPillar: () => drawPillar,
  drawPipe: () => drawPipe,
  drawPoison: () => drawPoison,
  drawPortal: () => drawPortal,
  drawPotion: () => drawPotion,
  drawRadialLight: () => drawRadialLight,
  drawRing: () => drawRing,
  drawRubble: () => drawRubble,
  drawRuneCircle: () => drawRuneCircle,
  drawSanctumGlyph: () => drawSanctumGlyph,
  drawShadow: () => drawShadow,
  drawShrine: () => drawShrine,
  drawSkeletonServant: () => drawSkeletonServant,
  drawSkullPike: () => drawSkullPike,
  drawSkyCrystal: () => drawSkyCrystal,
  drawSlash: () => drawSlash,
  drawSpikes: () => drawSpikes,
  drawStalker: () => drawStalker,
  drawStormOrb: () => drawStormOrb,
  drawStormRod: () => drawStormRod,
  drawTorch: () => drawTorch,
  drawToxicMushroom: () => drawToxicMushroom,
  drawVignette: () => drawVignette,
  drawVines: () => drawVines,
  drawVoidRift: () => drawVoidRift,
  drawWall: () => drawWall,
  drawWallArt: () => drawWallArt,
  drawWallRoof: () => drawWallRoof,
  drawWater: () => drawWater,
  drawWeapon: () => drawWeapon,
  drawWeaponRack: () => drawWeaponRack,
  drawWisp: () => drawWisp,
  legShift: () => legShift,
  outlineRegion: () => outlineRegion,
  rng: () => rng,
  softShade: () => softShade
});

// src/rendering/Palette.ts
var C = {
  // ---- Floors (warm dithered stone) ----
  floor0: "#2a1d12",
  floor1: "#3a2817",
  floor2: "#4a341f",
  floor3: "#5c4227",
  floorHi: "#6f5230",
  floorCrack: "#1c130b",
  floorMoss: "#3c4a26",
  // ---- Walls (cold lit brick) ----
  wallDark: "#0c1430",
  wallBase: "#1b2a55",
  wallMid: "#2c4080",
  wallLit: "#4a63b0",
  wallHi: "#7d96d8",
  wallTopDark: "#14224a",
  wallTopLit: "#5570c0",
  wallMortar: "#070b1c",
  // ---- Doors ----
  doorWood: "#5a3a1c",
  doorWoodHi: "#7a5128",
  doorIron: "#3a3f52",
  doorLock: "#e0b03a",
  doorLockDark: "#9a7320",
  // ---- Hazards ----
  waterDark: "#0e2940",
  waterMid: "#155074",
  waterHi: "#2f86b5",
  waterFoam: "#a9e3ff",
  lavaDark: "#5a1500",
  lavaMid: "#c43c06",
  lavaHi: "#ff8a1e",
  lavaWhite: "#ffd98a",
  iceDark: "#2a4a66",
  iceMid: "#6fb0d8",
  iceHi: "#bfe9ff",
  iceWhite: "#f2fbff",
  poisonDark: "#16331c",
  poisonMid: "#3f8a3a",
  poisonHi: "#8ce05a",
  poisonGas: "#b6f06a",
  spikeBase: "#1a2030",
  spikeSteel: "#8b94a8",
  spikeHi: "#dfe6ff",
  spikeBlood: "#a01818",
  // ---- Themed decor ----
  crystal: "#7fe4ff",
  crystalHi: "#dffaff",
  crystalDk: "#2f6f9a",
  cog: "#9a7b3a",
  cogHi: "#e6c264",
  cogDk: "#4a3812",
  vine: "#3f7a34",
  vineHi: "#7fce58",
  bloodDark: "#5a0e0e",
  bloodMid: "#9c1818",
  // ---- Exit portal ----
  portal0: "#1a0a3a",
  portal1: "#4a18a8",
  portal2: "#8a3cff",
  portal3: "#c79bff",
  portalCore: "#ffffff",
  // ---- Shadow / vignette ----
  shadow: "#000000",
  // ---- Gold / loot / coins ----
  coinDark: "#9a6e10",
  coinMid: "#e0a81e",
  coinHi: "#ffe27a",
  gem: "#39e0d0",
  // ---- FX ----
  magicCore: "#ffffff",
  magicHot: "#c79bff",
  magicMid: "#7a3cff",
  magicEdge: "#3a18a8",
  fireCore: "#fff2b0",
  fireMid: "#ff8a1e",
  fireEdge: "#c43c06",
  spark: "#ffe27a",
  heal: "#7cf08a",
  allyAura: "#5fe0a0",
  // ---- Torch ----
  torchWood: "#3a2614",
  torchFlame0: "#ffd98a",
  torchFlame1: "#ff8a1e",
  torchFlame2: "#c43c06",
  // ---- UI chrome ----
  hudBg: "#070a12",
  hudPanel: "#0d1322",
  hudPanel2: "#121a30",
  hudBorder: "#cfa64e",
  hudBorderDk: "#6e521f",
  ivy: "#2e6b34",
  ivyHi: "#48a052",
  ink: "#dfe6ff",
  inkDim: "#8a93bd",
  hpFull: "#37d65a",
  hpMid: "#e0c020",
  hpLow: "#e0392e",
  manaFill: "#3a8aff",
  xpFill: "#c79bff"
};
var DEFAULT_WALL = {
  base: C.wallBase,
  mortar: C.wallMortar,
  mid: C.wallMid,
  lit: C.wallLit,
  hi: C.wallHi,
  dark: C.wallDark,
  topLit: C.wallTopLit,
  topDark: C.wallTopDark
};
var DEFAULT_FLOOR = {
  f0: C.floor0,
  f1: C.floor1,
  f2: C.floor2,
  f3: C.floor3,
  hi: C.floorHi,
  crack: C.floorCrack,
  moss: C.floorMoss
};
var DEFAULT_FACE = {
  main: "#16234a",
  top: "#7d96d8",
  upper: "#2c4080",
  lower: "#1b2a55",
  line: "#070b1c"
};
var THEME_ART = {
  crypt: { wall: DEFAULT_WALL, floor: DEFAULT_FLOOR, face: DEFAULT_FACE },
  molten: {
    wall: { base: "#3a1410", mortar: "#1a0805", mid: "#5a1e10", lit: "#8a3416", hi: "#d6661e", dark: "#200a06", topLit: "#7a2a12", topDark: "#2a0e08" },
    floor: { f0: "#1c0e08", f1: "#2c1610", f2: "#3e2014", f3: "#52301a", hi: "#7a4520", crack: "#140805", moss: "#5a2a10" },
    face: { main: "#2a0e08", top: "#d6661e", upper: "#5a1e10", lower: "#3a1410", line: "#120504" }
  },
  frost: {
    wall: { base: "#2a4a6e", mortar: "#0e2236", mid: "#3f6e98", lit: "#6fa6cc", hi: "#cfeaff", dark: "#15324c", topLit: "#6f9ec8", topDark: "#244660" },
    floor: { f0: "#1c3346", f1: "#2a4659", f2: "#3a5a70", f3: "#4e7088", hi: "#87b3cf", crack: "#122636", moss: "#3a6a7a" },
    face: { main: "#1f3e58", top: "#cfeaff", upper: "#3f6e98", lower: "#2a4a6e", line: "#0c1e30" }
  },
  toxic: {
    wall: { base: "#243a22", mortar: "#0c1a0c", mid: "#3a5a30", lit: "#5e8a44", hi: "#9fd05a", dark: "#14240f", topLit: "#4e7a3a", topDark: "#1e3018" },
    floor: { f0: "#16240f", f1: "#23341a", f2: "#324326", f3: "#445a30", hi: "#6f8a3e", crack: "#0c1608", moss: "#6fae3a" },
    face: { main: "#1c3014", top: "#9fd05a", upper: "#3a5a30", lower: "#243a22", line: "#0a1408" }
  },
  clockwork: {
    wall: { base: "#3a3220", mortar: "#14100a", mid: "#5a4a28", lit: "#8a6e34", hi: "#e6c264", dark: "#221c10", topLit: "#7a5e2a", topDark: "#2a2214" },
    floor: { f0: "#20201f", f1: "#2c2c2b", f2: "#3a3a39", f3: "#4c4c4a", hi: "#7a7a70", crack: "#121211", moss: "#6a5a2a" },
    face: { main: "#2a2214", top: "#e6c264", upper: "#5a4a28", lower: "#3a3220", line: "#100c08" }
  },
  arena: {
    wall: { base: "#4a3a26", mortar: "#1c1208", mid: "#6e5634", lit: "#9c7e4c", hi: "#d8b87a", dark: "#2c2014", topLit: "#8a6e40", topDark: "#34281a" },
    floor: { f0: "#2e2418", f1: "#3e3020", f2: "#4e3e28", f3: "#604e32", hi: "#8a7048", crack: "#1c1208", moss: "#7a2a20" },
    face: { main: "#34281a", top: "#d8b87a", upper: "#6e5634", lower: "#4a3a26", line: "#160e06" }
  },
  bog: {
    wall: { base: "#243026", mortar: "#0a120c", mid: "#36482f", lit: "#50663c", hi: "#82a85a", dark: "#141d14", topLit: "#46603a", topDark: "#1c281c" },
    floor: { f0: "#16201a", f1: "#202c20", f2: "#2c3a28", f3: "#3a4a30", hi: "#5a6a3a", crack: "#0a1209", moss: "#4a7a38" },
    face: { main: "#1a281c", top: "#82a85a", upper: "#36482f", lower: "#243026", line: "#08120a" }
  },
  storm: {
    wall: { base: "#2a2e4a", mortar: "#0c0e1e", mid: "#3f4670", lit: "#6a72b0", hi: "#b0c8ff", dark: "#161830", topLit: "#5a64a0", topDark: "#20243e" },
    floor: { f0: "#1a1c30", f1: "#24263e", f2: "#30344e", f3: "#40445e", hi: "#6a72a0", crack: "#0e0e1c", moss: "#3a4a8a" },
    face: { main: "#1e2038", top: "#b0c8ff", upper: "#3f4670", lower: "#2a2e4a", line: "#0a0c18" }
  },
  shadow: {
    wall: { base: "#221a30", mortar: "#08060e", mid: "#342648", lit: "#4e3a68", hi: "#8a6ab0", dark: "#140e1e", topLit: "#44345e", topDark: "#1a1228" },
    floor: { f0: "#140e1c", f1: "#1e1628", f2: "#281e36", f3: "#342848", hi: "#4e3a68", crack: "#08060e", moss: "#3a2a5a" },
    face: { main: "#181024", top: "#8a6ab0", upper: "#342648", lower: "#221a30", line: "#060410" }
  },
  sanctum: {
    wall: { base: "#524a3a", mortar: "#1c180f", mid: "#726a52", lit: "#a89c78", hi: "#ecdca6", dark: "#322c20", topLit: "#8a7e5e", topDark: "#3a3426" },
    floor: { f0: "#2e2a20", f1: "#3e3a2c", f2: "#504a38", f3: "#645c46", hi: "#9a8e68", crack: "#1a160e", moss: "#b0962e" },
    face: { main: "#3a3426", top: "#ecdca6", upper: "#726a52", lower: "#524a3a", line: "#161208" }
  },
  // Town square — sunlit lawns of green grass (roads are stamped as decor on top).
  town: {
    wall: { base: "#5a4632", mortar: "#241a10", mid: "#6e5a40", lit: "#9c8050", hi: "#e0bd84", dark: "#34281a", topLit: "#8a7048", topDark: "#3a2c1c" },
    floor: { f0: "#2f4a26", f1: "#3a5a2e", f2: "#456a36", f3: "#527c40", hi: "#6fa050", crack: "#24401a", moss: "#7fb84a" },
    face: { main: "#34281a", top: "#e0bd84", upper: "#6e5a40", lower: "#5a4632", line: "#160e06" }
  }
};

// src/rendering/spriteArt.ts
var HERO_FW = 40;
var HERO_FH = 48;
var MON_FW = 44;
var MON_FH = 44;
var BOSS_FW = 80;
var BOSS_FH = 80;
var R = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
var PX = (ctx, x, y, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
};
function outlineRegion(ctx, x, y, w, h, color = "#0a0a14") {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const a = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 40;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const todo = [];
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (d[i + 3] > 40) continue;
      if (a(px - 1, py) || a(px + 1, py) || a(px, py - 1) || a(px, py + 1)) todo.push(i);
    }
  }
  for (const i of todo) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, x, y);
}
function softShade(ctx, x, y, w, h) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const a = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 40;
  const src = new Uint8ClampedArray(d);
  const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (src[i + 3] <= 40) continue;
      let f = 0;
      if (!a(px, py - 1) || !a(px - 1, py)) f += 0.22;
      if (!a(px, py + 1) || !a(px + 1, py)) f -= 0.2;
      f -= py / h * 0.07;
      if (f !== 0) {
        d[i] = clamp(src[i] * (1 + f));
        d[i + 1] = clamp(src[i + 1] * (1 + f));
        d[i + 2] = clamp(src[i + 2] * (1 + f));
      }
    }
  }
  ctx.putImageData(img, x, y);
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = s * 1664525 + 1013904223 >>> 0;
    return s / 4294967296;
  };
}
function drawFloor(ctx, ox, oy, seed, fp = DEFAULT_FLOOR) {
  const r = rng(seed);
  R(ctx, ox, oy, 16, 16, fp.f1);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = r();
      if (n < 0.14) PX(ctx, ox + x, oy + y, fp.f0);
      else if (n < 0.26) PX(ctx, ox + x, oy + y, fp.f2);
      else if (n < 0.32) PX(ctx, ox + x, oy + y, fp.f3);
      else if (n < 0.345) PX(ctx, ox + x, oy + y, fp.hi);
    }
  }
  ctx.globalAlpha = 0.5;
  R(ctx, ox, oy, 16, 1, fp.f0);
  R(ctx, ox, oy, 1, 16, fp.f0);
  ctx.globalAlpha = 1;
  const deco = r();
  if (deco < 0.13) {
    const pcx = ox + 4 + Math.floor(r() * 7);
    const pcy = oy + 6 + Math.floor(r() * 5);
    ctx.fillStyle = "rgba(18,30,50,0.6)";
    ctx.beginPath();
    ctx.ellipse(pcx, pcy, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,32,52,0.4)";
    ctx.beginPath();
    ctx.ellipse(pcx, pcy + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, pcx - 1, pcy - 1, "#5f7ea6");
    PX(ctx, pcx + 1, pcy, "#48648a");
  } else if (deco < 0.27) {
    for (let i = 0; i < 6; i++) {
      const gx = ox + 2 + Math.floor(r() * 12);
      const gy = oy + 2 + Math.floor(r() * 12);
      PX(ctx, gx, gy, r() < 0.5 ? fp.f0 : fp.hi);
    }
  } else if (deco < 0.34) {
    ctx.globalAlpha = 0.6;
    R(ctx, ox + 8, oy + 1, 1, 14, fp.crack);
    R(ctx, ox + 1, oy + 8, 14, 1, fp.crack);
    ctx.globalAlpha = 0.3;
    R(ctx, ox + 9, oy + 1, 1, 14, fp.hi);
    ctx.globalAlpha = 1;
  } else if (deco < 0.5) {
    let cx = ox + 3 + Math.floor(r() * 9);
    let cy = oy + 3 + Math.floor(r() * 9);
    for (let i = 0; i < 5; i++) {
      PX(ctx, cx, cy, fp.crack);
      cx += r() < 0.5 ? 1 : 0;
      cy += r() < 0.5 ? 1 : -1;
    }
  } else if (deco < 0.62) {
    const mx = ox + 2 + Math.floor(r() * 11);
    const my = oy + 2 + Math.floor(r() * 11);
    PX(ctx, mx, my, fp.moss);
    PX(ctx, mx + 1, my, fp.moss);
    PX(ctx, mx, my + 1, fp.moss);
    PX(ctx, mx + 1, my + 1, fp.moss);
  }
}
function drawWall(ctx, ox, oy, cap, seed = 0, wp = DEFAULT_WALL) {
  const r = rng(seed * 2654435761 + 11);
  R(ctx, ox, oy, 16, 16, wp.base);
  const rows = [0, 4, 8, 12];
  for (let i = 0; i < rows.length; i++) {
    const ry = rows[i];
    const offset = i % 2 === 0 ? 0 : 8;
    R(ctx, ox, oy + ry, 16, 1, wp.mortar);
    for (let bx = 0; bx < 16; bx += 8) {
      const x = ox + (bx + offset) % 16;
      const v = r();
      const face = v < 0.34 ? wp.mid : v < 0.7 ? wp.base : wp.lit;
      R(ctx, x, oy + ry + 1, 7, 3, face);
      R(ctx, x, oy + ry + 1, 7, 1, wp.hi);
      R(ctx, x, oy + ry + 1, 1, 3, wp.lit);
      R(ctx, x, oy + ry + 3, 7, 1, wp.dark);
      R(ctx, x + 6, oy + ry + 1, 1, 3, wp.dark);
      R(ctx, x + 7, oy + ry + 1, 1, 3, wp.mortar);
      if (r() < 0.14) PX(ctx, x + 1 + Math.floor(r() * 4), oy + ry + 2, wp.mortar);
      else if (r() < 0.08) PX(ctx, x + 2 + Math.floor(r() * 3), oy + ry + 2, wp.dark);
    }
  }
  ctx.globalAlpha = 0.4;
  R(ctx, ox, oy + 14, 16, 2, wp.dark);
  ctx.globalAlpha = 1;
  if (cap) {
    R(ctx, ox, oy, 16, 3, wp.topLit);
    R(ctx, ox, oy, 16, 1, wp.hi);
    R(ctx, ox, oy + 3, 16, 1, wp.topDark);
    ctx.globalAlpha = 0.25;
    R(ctx, ox, oy + 4, 16, 2, wp.hi);
    ctx.globalAlpha = 1;
  }
}
function drawWallRoof(ctx, ox, oy, theme, seed) {
  const r = rng(seed * 8161 + 17);
  const dots = (color, n) => {
    for (let i = 0; i < n; i++) PX(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), color);
  };
  const blob = (color, n) => {
    for (let i = 0; i < n; i++) R(ctx, ox + 1 + Math.floor(r() * 13), oy + 1 + Math.floor(r() * 13), 2, 2, color);
  };
  switch (theme) {
    case "molten":
      blob("#7a1a06", 2);
      dots("#ff8a1e", 6);
      dots("#ffd98a", 2);
      break;
    case "frost":
      dots("#dff1ff", 7);
      dots("#bfe9ff", 4);
      blob("#eaf6ff", 2);
      break;
    case "toxic":
      blob("#3f8a3a", 3);
      dots("#8ce05a", 4);
      R(ctx, ox + 4 + Math.floor(r() * 8), oy + 8, 1, 4, "#6fae3a");
      break;
    case "clockwork":
      for (const [dx, dy] of [[3, 3], [12, 3], [3, 12], [12, 12]]) {
        PX(ctx, ox + dx, oy + dy, "#e6c264");
        PX(ctx, ox + dx, oy + dy + 1, "#7a5e2a");
      }
      ctx.globalAlpha = 0.5;
      R(ctx, ox, oy + 8, 16, 1, "#2a2214");
      ctx.globalAlpha = 1;
      break;
    case "arena":
      blob("#9c1818", 2);
      dots("#5a0e0e", 3);
      dots("#caa56a", 3);
      break;
    case "bog":
      blob("#3f7a34", 4);
      blob("#244d1e", 2);
      dots("#7fce58", 3);
      break;
    case "storm":
      dots("#b0c8ff", 5);
      dots("#ffffff", 2);
      if (r() < 0.5) {
        const x = ox + 4 + Math.floor(r() * 8);
        const y = oy + 4 + Math.floor(r() * 8);
        R(ctx, x - 1, y, 3, 1, "#cfe0ff");
        R(ctx, x, y - 1, 1, 3, "#cfe0ff");
      }
      break;
    case "shadow":
      blob("#0c0814", 3);
      dots("#8a6ab0", 3);
      break;
    case "sanctum":
      dots("#ffd24a", 3);
      dots("#ecdca6", 3);
      if (r() < 0.5) {
        const x = ox + 5 + Math.floor(r() * 6);
        const y = oy + 5 + Math.floor(r() * 6);
        R(ctx, x, y, 3, 1, "#e6c264");
        R(ctx, x + 1, y - 1, 1, 3, "#e6c264");
      }
      break;
    default:
      dots("#3a4566", 3);
      break;
  }
}
function drawWallArt(ctx, ox, oy, theme, seed) {
  const accents = {
    crypt: "#9ab0e8",
    molten: "#ff9a3a",
    frost: "#cfeaff",
    toxic: "#a8e05a",
    clockwork: "#f0cc66",
    arena: "#ff8a4a",
    bog: "#92b86a",
    storm: "#c0d4ff",
    shadow: "#c79bff",
    sanctum: "#ffe07a",
    town: "#e0bd84"
  };
  const col = accents[theme] ?? "#9ab0e8";
  const cx = ox + 8;
  const cy = oy + 7;
  const r = rng(seed * 2654435761 + 7);
  const motif = Math.floor(r() * 5);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(ox + 2, oy + 1, 12, 12);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(ox + 2, oy + 1, 12, 1);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(ox + 2, oy + 12, 12, 1);
  if (motif === 0) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    R(ctx, cx - 2, cy, 5, 1, col);
    R(ctx, cx, cy - 2, 1, 5, col);
    PX(ctx, cx, cy, "#ffffff");
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) PX(ctx, cx + dx, cy + dy, col);
  } else if (motif === 1) {
    for (const [dx, dy] of [[0, -4], [-2, -2], [2, -2], [-4, 0], [4, 0], [-2, 2], [2, 2], [0, 4]]) PX(ctx, cx + dx, cy + dy, col);
    R(ctx, cx - 1, cy - 1, 2, 2, col);
    PX(ctx, cx, cy, "#ffffff");
  } else if (motif === 2) {
    R(ctx, cx - 3, cy - 4, 7, 1, col);
    R(ctx, cx - 3, cy + 4, 7, 1, col);
    for (const bx of [-3, -1, 1, 3]) R(ctx, cx + bx, cy - 3, 1, 7, col);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cx - 2, cy - 3, 1, 7);
  } else if (motif === 3) {
    R(ctx, cx - 3, cy - 2, 6, 1, col);
    R(ctx, cx - 2, cy - 1, 1, 2, col);
    R(ctx, cx + 1, cy - 1, 1, 2, col);
    PX(ctx, cx - 2, cy - 1, "#ffffff");
    PX(ctx, cx + 1, cy - 1, "#ffffff");
    R(ctx, cx - 2, cy + 2, 4, 1, col);
    PX(ctx, cx - 2, cy + 3, col);
    PX(ctx, cx + 1, cy + 3, col);
  } else {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
    R(ctx, cx - 1, cy - 1, 2, 2, col);
    PX(ctx, cx, cy, "#ffffff");
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]]) PX(ctx, cx + dx, cy + dy, col);
  }
}
function drawDoor(ctx, ox, oy, locked) {
  R(ctx, ox, oy, 16, 16, C.wallDark);
  R(ctx, ox + 1, oy, 14, 16, C.wallMid);
  R(ctx, ox + 2, oy + 1, 12, 14, C.doorWood);
  for (let x = ox + 3; x < ox + 14; x += 4) R(ctx, x, oy + 1, 1, 14, C.doorWoodHi);
  R(ctx, ox + 2, oy + 4, 12, 2, C.doorIron);
  R(ctx, ox + 2, oy + 10, 12, 2, C.doorIron);
  for (let x = ox + 3; x < ox + 14; x += 3) {
    PX(ctx, x, oy + 4, C.wallHi);
    PX(ctx, x, oy + 10, C.wallHi);
  }
  if (locked) {
    R(ctx, ox + 6, oy + 6, 4, 5, C.doorLockDark);
    R(ctx, ox + 6, oy + 6, 4, 1, C.doorLock);
    PX(ctx, ox + 7, oy + 8, C.doorLock);
    PX(ctx, ox + 8, oy + 8, C.doorLock);
  } else {
    R(ctx, ox + 11, oy + 7, 2, 2, C.doorLock);
  }
}
function drawWater(ctx, ox, frame) {
  R(ctx, ox, 0, 16, 16, C.waterDark);
  const r = rng(11);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (r() < 0.18) PX(ctx, ox + x, y, C.waterMid);
  for (let i = 0; i < 3; i++) {
    const y = (i * 5 + frame * 2) % 16;
    ctx.globalAlpha = 0.8;
    R(ctx, ox + 1, y, 6, 1, C.waterHi);
    R(ctx, ox + 9, (y + 8) % 16, 5, 1, C.waterHi);
    ctx.globalAlpha = 1;
  }
  PX(ctx, ox + (frame * 3 + 2) % 14 + 1, (frame * 2 + 3) % 14, C.waterFoam);
}
function drawLava(ctx, ox, frame) {
  R(ctx, ox, 0, 16, 16, C.lavaDark);
  const r = rng(7);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (r() < 0.4) PX(ctx, ox + x, y, C.lavaMid);
    }
  const cracks = [
    [2, 3, 6],
    [9, 2, 5],
    [4, 9, 7],
    [10, 11, 4]
  ];
  for (const [cx, cy, len] of cracks) {
    for (let i = 0; i < len; i++) {
      const c = (i + frame) % 3 === 0 ? C.lavaWhite : C.lavaHi;
      PX(ctx, ox + cx + i, cy + (i + frame) % 2, c);
    }
  }
  const bx = (frame * 5 + 3) % 13;
  R(ctx, ox + bx, 12 - frame, 2, 2, C.lavaHi);
  PX(ctx, ox + bx, 12 - frame, C.lavaWhite);
}
function drawPortal(ctx, ox, frame) {
  R(ctx, ox, 0, 16, 16, "#101018");
  const cx = ox + 8;
  const cy = 8;
  const rings = [
    [7, "#6a6a7a"],
    [5.5, "#b4b4c4"],
    [4, "#e8e8f2"]
  ];
  for (const [rad, col] of rings) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad, rad - 1, frame / 6 * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + frame / 6 * Math.PI;
    const rad = 2 + (i + frame) % 5;
    PX(ctx, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), "#dfe0ee");
  }
  R(ctx, cx - 1, cy - 1, 2, 2, "#ffffff");
}
function drawIce(ctx, ox, oy, seed) {
  const r = rng(seed * 2246822519 + 3);
  ctx.globalAlpha = 0.82;
  R(ctx, ox, oy, 16, 16, C.iceMid);
  ctx.globalAlpha = 1;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const n = r();
      if (n < 0.12) PX(ctx, ox + x, oy + y, C.iceDark);
      else if (n < 0.2) PX(ctx, ox + x, oy + y, C.iceHi);
    }
  let cx = ox + 2 + Math.floor(r() * 6);
  let cy = oy + 2 + Math.floor(r() * 4);
  for (let i = 0; i < 9; i++) {
    PX(ctx, cx, cy, C.iceDark);
    PX(ctx, cx, cy + 1, C.iceWhite);
    cx += 1;
    cy += r() < 0.5 ? 1 : 0;
    if (cy > oy + 14) break;
  }
  ctx.globalAlpha = 0.5;
  R(ctx, ox + 1, oy + 1, 7, 1, C.iceWhite);
  R(ctx, ox + 1, oy + 1, 1, 6, C.iceWhite);
  ctx.globalAlpha = 1;
  PX(ctx, ox + 11, oy + 3, C.iceWhite);
  PX(ctx, ox + 4, oy + 11, C.iceHi);
}
function drawPoison(ctx, ox, frame) {
  R(ctx, ox, 0, 16, 16, C.poisonDark);
  const r = rng(29);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (r() < 0.34) PX(ctx, ox + x, y, C.poisonMid);
  for (let i = 0; i < 3; i++) {
    const y = (i * 5 + frame * 2) % 16;
    ctx.globalAlpha = 0.7;
    R(ctx, ox + 2, y, 5, 1, C.poisonHi);
    R(ctx, ox + 9, (y + 7) % 16, 4, 1, C.poisonHi);
    ctx.globalAlpha = 1;
  }
  const bubbles = [
    [4, 11, 0],
    [11, 8, 1],
    [7, 13, 2]
  ];
  for (const [bx, by, ph] of bubbles) {
    const f = (frame + ph) % 4;
    const yy = by - f * 2;
    if (f === 3) {
      PX(ctx, ox + bx - 1, yy, C.poisonGas);
      PX(ctx, ox + bx + 1, yy, C.poisonGas);
    } else {
      R(ctx, ox + bx, yy, 2, 2, C.poisonHi);
      PX(ctx, ox + bx, yy, C.poisonGas);
    }
  }
}
function drawSpikes(ctx, ox, frame) {
  R(ctx, ox, 0, 16, 16, C.spikeBase);
  R(ctx, ox + 1, 1, 14, 14, "#222a3c");
  PX(ctx, ox + 2, 2, "#0a0e18");
  PX(ctx, ox + 13, 2, "#0a0e18");
  PX(ctx, ox + 2, 13, "#0a0e18");
  PX(ctx, ox + 13, 13, "#0a0e18");
  const ext = [0, 3, 6, 8][frame % 4];
  if (ext === 0) {
    ctx.globalAlpha = 0.5;
    for (let x = 3; x < 14; x += 4) R(ctx, ox + x, 3, 1, 10, "#39435c");
    ctx.globalAlpha = 1;
    return;
  }
  const cols = [3, 7, 11];
  for (const c of cols) {
    const topY = 14 - ext;
    for (let i = 0; i < ext; i++) {
      const w = Math.max(1, Math.round(i / ext * 3));
      R(ctx, ox + c - (w >> 1) + 1, 14 - i, w, 1, C.spikeSteel);
    }
    PX(ctx, ox + c + 1, topY, C.spikeHi);
    if (frame === 3) PX(ctx, ox + c + 1, 14, C.spikeBlood);
  }
}
function drawTorch(ctx, ox, frame) {
  R(ctx, ox + 7, 9, 2, 6, "#544c44");
  R(ctx, ox + 6, 14, 4, 1, "#544c44");
  const sway = [0, 1, 0, -1][frame % 4];
  R(ctx, ox + 6 + sway, 6, 4, 4, "#b9b9c8");
  R(ctx, ox + 6 + sway, 4, 3, 4, "#e6e6f0");
  R(ctx, ox + 7 + sway, 2, 2, 3, "#ffffff");
  PX(ctx, ox + 7 + sway, 2, "#ffffff");
  PX(ctx, ox + 8 + sway, 0 + frame % 2, "#eaeaf2");
}
function drawGenerator(ctx, ox, frame) {
  const cx = ox + 12;
  const pulse = [0, 1, 2, 1][frame % 4];
  const rot = frame / 4 * Math.PI;
  R(ctx, cx - 8, 17, 16, 5, "#241f38");
  R(ctx, cx - 8, 17, 16, 1, "#4a4068");
  R(ctx, cx - 8, 21, 16, 1, "#120e20");
  R(ctx, cx - 8, 17, 1, 5, "#3a3056");
  R(ctx, cx + 7, 17, 1, 5, "#120e20");
  for (let i = -2; i <= 2; i++) PX(ctx, cx + i * 3, 19, i % 2 === 0 ? "#c79bff" : "#7fe4ff");
  R(ctx, cx - 11, 7, 3, 11, "#1c1830");
  R(ctx, cx - 11, 7, 1, 11, "#3a3056");
  R(ctx, cx + 8, 7, 3, 11, "#1c1830");
  R(ctx, cx + 10, 7, 1, 11, "#120e20");
  PX(ctx, cx - 10, 10, "#7fe4ff");
  PX(ctx, cx + 9, 10, "#7fe4ff");
  PX(ctx, cx - 10, 14, "#c79bff");
  PX(ctx, cx + 9, 14, "#c79bff");
  const ccy = 10;
  ctx.save();
  ctx.strokeStyle = "#4a18a8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 6 + pulse, 6 + pulse, rot, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#8a3cff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 4 + pulse * 0.5, 5 + pulse * 0.5, rot + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#c79bff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 2.5, 3.5, rot, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  R(ctx, cx - 1, ccy - 1, 2, 2, "#ffffff");
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + frame / 4 * Math.PI * 2;
    PX(ctx, Math.round(cx + Math.cos(a) * 8), Math.round(ccy + Math.sin(a) * 7), i % 2 ? "#7fe4ff" : "#c79bff");
  }
  PX(ctx, cx + [-2, 1, 0, 2][frame % 4], 4 - frame % 2, "#dffaff");
}
function drawChest(ctx, ox, oy, open) {
  R(ctx, ox + 2, oy + 7, 12, 7, C.doorWood);
  R(ctx, ox + 2, oy + 7, 12, 1, C.doorWoodHi);
  R(ctx, ox + 2, oy + 10, 12, 2, C.coinDark);
  R(ctx, ox + 7, oy + 7, 2, 7, C.coinDark);
  if (!open) {
    R(ctx, ox + 2, oy + 4, 12, 4, C.doorWoodHi);
    R(ctx, ox + 2, oy + 4, 12, 1, "#9a6a30");
    R(ctx, ox + 7, oy + 4, 2, 4, C.coinMid);
    PX(ctx, ox + 7, oy + 8, C.coinHi);
  } else {
    R(ctx, ox + 2, oy + 2, 12, 3, C.doorWood);
    R(ctx, ox + 4, oy + 6, 8, 3, C.coinHi);
    PX(ctx, ox + 5, oy + 6, C.portalCore);
    PX(ctx, ox + 9, oy + 7, C.portalCore);
  }
}
function drawShrine(ctx, ox, oy, lit) {
  R(ctx, ox + 4, oy + 11, 8, 4, C.wallMid);
  R(ctx, ox + 3, oy + 14, 10, 2, C.wallDark);
  R(ctx, ox + 5, oy + 5, 6, 7, C.wallLit);
  R(ctx, ox + 5, oy + 5, 6, 1, C.wallHi);
  R(ctx, ox + 5, oy + 4, 6, 2, C.wallDark);
  if (lit) {
    R(ctx, ox + 6, oy + 1, 4, 4, C.fireMid);
    R(ctx, ox + 7, oy, 2, 3, C.fireCore);
    PX(ctx, ox + 7, oy, C.portalCore);
  } else {
    R(ctx, ox + 6, oy + 3, 4, 1, C.coinDark);
  }
}
function drawPillar(ctx, ox, oy) {
  R(ctx, ox + 8, oy, 16, 32, C.wallBase);
  R(ctx, ox + 8, oy, 4, 32, C.wallLit);
  R(ctx, ox + 20, oy, 4, 32, C.wallDark);
  R(ctx, ox + 6, oy, 20, 4, C.wallMid);
  R(ctx, ox + 6, oy + 28, 20, 4, C.wallMid);
  R(ctx, ox + 8, oy, 16, 2, C.wallHi);
  R(ctx, ox + 12, oy + 6, 1, 20, "rgba(0,0,0,0.16)");
  R(ctx, ox + 19, oy + 6, 1, 20, "rgba(0,0,0,0.16)");
  R(ctx, ox + 15, oy + 6, 2, 20, "rgba(255,255,255,0.06)");
}
function drawBones(ctx, ox, oy) {
  const b = "#cdd2e0";
  const d = "#7d839a";
  R(ctx, ox + 6, oy + 22, 16, 2, b);
  R(ctx, ox + 5, oy + 21, 2, 4, b);
  R(ctx, ox + 21, oy + 21, 2, 4, b);
  R(ctx, ox + 8, oy + 27, 12, 2, b);
  R(ctx, ox + 20, oy + 24, 2, 2, d);
  R(ctx, ox + 12, oy + 15, 8, 7, b);
  R(ctx, ox + 12, oy + 15, 8, 1, "#eef0f6");
  R(ctx, ox + 14, oy + 18, 2, 2, "#202433");
  R(ctx, ox + 17, oy + 18, 2, 2, "#202433");
  R(ctx, ox + 15, oy + 21, 2, 1, d);
}
function drawRubble(ctx, ox, oy) {
  R(ctx, ox + 8, oy + 20, 9, 7, C.wallMid);
  R(ctx, ox + 16, oy + 22, 7, 5, C.wallDark);
  R(ctx, ox + 11, oy + 17, 5, 4, C.wallLit);
  R(ctx, ox + 8, oy + 20, 9, 1, C.wallHi);
  R(ctx, ox + 11, oy + 17, 5, 1, C.wallHi);
  PX(ctx, ox + 10, oy + 26, C.wallHi);
  PX(ctx, ox + 19, oy + 25, C.wallBase);
}
function drawBanner(ctx, ox, oy) {
  R(ctx, ox + 10, oy + 2, 12, 22, "#2b59b0");
  R(ctx, ox + 10, oy + 2, 12, 2, C.coinMid);
  R(ctx, ox + 10, oy + 2, 3, 22, "#3f72d0");
  R(ctx, ox + 19, oy + 2, 3, 22, "#1d3f86");
  R(ctx, ox + 14, oy + 6, 4, 10, C.coinHi);
  R(ctx, ox + 13, oy + 9, 6, 3, C.coinHi);
  R(ctx, ox + 10, oy + 24, 4, 4, C.hudBg);
  R(ctx, ox + 18, oy + 24, 4, 4, C.hudBg);
}
function drawCrystal(ctx, ox, oy) {
  R(ctx, ox + 18, oy + 10, 4, 18, C.crystalDk);
  R(ctx, ox + 18, oy + 8, 4, 4, C.crystal);
  R(ctx, ox + 10, oy + 12, 6, 16, C.crystal);
  R(ctx, ox + 10, oy + 12, 2, 16, C.crystalHi);
  R(ctx, ox + 12, oy + 6, 2, 8, C.crystal);
  R(ctx, ox + 12, oy + 6, 1, 8, C.crystalHi);
  PX(ctx, ox + 12, oy + 5, C.crystalHi);
  R(ctx, ox + 6, oy + 20, 4, 8, C.crystalDk);
  PX(ctx, ox + 6, oy + 19, C.crystal);
  ctx.globalAlpha = 0.6;
  R(ctx, ox + 4, oy + 26, 22, 3, C.iceHi);
  ctx.globalAlpha = 1;
}
function drawCog(ctx, ox, oy) {
  const cx = ox + 16;
  const cy = oy + 16;
  for (let a = 0; a < 10; a++) {
    const ang = a / 10 * Math.PI * 2;
    R(ctx, Math.round(cx + Math.cos(ang) * 12) - 2, Math.round(cy + Math.sin(ang) * 12) - 2, 4, 4, C.cog);
  }
  ctx.fillStyle = C.cog;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cogHi;
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cogDk;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, cx - 3, cy - 3, "#fff0c0");
}
function drawVines(ctx, ox, oy) {
  for (const [vx, len] of [[8, 22], [16, 28], [24, 18]]) {
    for (let i = 0; i < len; i += 2) {
      R(ctx, ox + vx + (i % 4 === 0 ? 0 : 2), oy + i, 2, 2, i % 6 === 0 ? C.vineHi : C.vine);
    }
    R(ctx, ox + vx - 2, oy + len - 2, 6, 4, C.vineHi);
    R(ctx, ox + vx - 1, oy + len - 1, 4, 2, C.vine);
  }
}
function drawBloodStain(ctx, ox, oy) {
  ctx.fillStyle = C.bloodDark;
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 18, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.bloodMid;
  ctx.beginPath();
  ctx.ellipse(ox + 14, oy + 16, 6, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, ox + 25, oy + 11, 2, 2, C.bloodMid);
  R(ctx, ox + 6, oy + 24, 2, 2, C.bloodDark);
  R(ctx, ox + 24, oy + 24, 2, 2, C.bloodDark);
  PX(ctx, ox + 13, oy + 15, "#c44");
}
function drawSkullPike(ctx, ox, oy) {
  const b = "#d8dce8";
  R(ctx, ox + 14, oy + 12, 4, 18, "#5a4a2a");
  R(ctx, ox + 14, oy + 12, 1, 18, "#7a6238");
  R(ctx, ox + 10, oy + 4, 12, 10, b);
  R(ctx, ox + 10, oy + 4, 12, 2, "#f2f4fa");
  R(ctx, ox + 12, oy + 14, 8, 4, b);
  R(ctx, ox + 12, oy + 8, 3, 3, "#202433");
  R(ctx, ox + 18, oy + 8, 3, 3, "#202433");
  R(ctx, ox + 15, oy + 12, 2, 2, "#202433");
  for (let i = 0; i < 3; i++) PX(ctx, ox + 13 + i * 3, oy + 17, "#5a5f70");
}
function drawBogStump(ctx, ox, oy) {
  R(ctx, ox + 8, oy + 14, 16, 14, "#3a2a1a");
  R(ctx, ox + 8, oy + 14, 16, 3, "#3f6a2e");
  R(ctx, ox + 8, oy + 14, 4, 14, "#4e3a22");
  R(ctx, ox + 20, oy + 14, 4, 14, "#241a10");
  PX(ctx, ox + 12, oy + 14, "#7fce58");
  PX(ctx, ox + 18, oy + 15, "#7fce58");
  R(ctx, ox + 12, oy + 18, 2, 8, "#241a10");
  R(ctx, ox + 18, oy + 18, 2, 8, "#241a10");
  R(ctx, ox + 4, oy + 26, 8, 2, "#2a1e12");
  R(ctx, ox + 20, oy + 26, 8, 2, "#2a1e12");
}
function drawLilypad(ctx, ox, oy) {
  ctx.fillStyle = "#2f6a34";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 18, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f8a3a";
  ctx.beginPath();
  ctx.ellipse(ox + 14, oy + 16, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, ox + 16, oy + 18, 8, 2, "#16331c");
  R(ctx, ox + 11, oy + 13, 5, 4, "#e8c0e0");
  R(ctx, ox + 12, oy + 14, 3, 2, "#fff0fa");
}
function drawStormRod(ctx, ox, oy) {
  R(ctx, ox + 14, oy + 8, 4, 22, "#8b94a8");
  R(ctx, ox + 14, oy + 8, 1, 22, "#cfe0ff");
  R(ctx, ox + 10, oy + 26, 12, 4, "#444b60");
  ctx.fillStyle = "#b0c8ff";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 5, 5, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 16, oy + 1, "#ffffff");
  PX(ctx, ox + 10, oy + 4, "#7fd0ff");
  PX(ctx, ox + 21, oy + 4, "#7fd0ff");
  R(ctx, ox + 15, oy + 10, 2, 4, "#eaf4ff");
}
function drawSkyCrystal(ctx, ox, oy) {
  R(ctx, ox + 14, oy + 6, 4, 20, "#6fb0d8");
  R(ctx, ox + 12, oy + 10, 8, 12, "#9fd8ff");
  R(ctx, ox + 14, oy + 8, 4, 16, "#cfeeff");
  R(ctx, ox + 15, oy + 8, 1, 14, "#ffffff");
  PX(ctx, ox + 16, oy + 9, "#ffffff");
  R(ctx, ox + 12, oy + 16, 2, 3, "#4a8ab0");
  R(ctx, ox + 18, oy + 18, 2, 3, "#4a8ab0");
}
function drawVoidRift(ctx, ox, oy) {
  ctx.fillStyle = "#0c0814";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 16, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#241636";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 16, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2456";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 16, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 16, oy + 9, "#8a6ab0");
  R(ctx, ox + 14, oy + 18, 2, 2, "#b58aff");
  PX(ctx, ox + 18, oy + 22, "#6a4f9a");
}
function drawSanctumGlyph(ctx, ox, oy) {
  const g = "#ecdca6";
  R(ctx, ox + 8, oy + 16, 16, 2, g);
  R(ctx, ox + 16, oy + 8, 2, 16, g);
  R(ctx, ox + 16, oy + 7, 2, 2, "#fff4cf");
  R(ctx, ox + 7, oy + 16, 2, 2, g);
  R(ctx, ox + 23, oy + 16, 2, 2, g);
  R(ctx, ox + 16, oy + 23, 2, 2, g);
  ctx.strokeStyle = "#b0962e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 7, 0, Math.PI * 2);
  ctx.stroke();
  PX(ctx, ox + 12, oy + 12, "#fff4cf");
  PX(ctx, ox + 20, oy + 20, "#fff4cf");
}
function drawBrazier(ctx, ox, oy) {
  R(ctx, ox + 12, oy + 18, 8, 10, "#7a5e2a");
  R(ctx, ox + 12, oy + 18, 2, 10, "#a07e36");
  R(ctx, ox + 10, oy + 26, 12, 2, "#4a3812");
  R(ctx, ox + 8, oy + 14, 16, 6, "#e6c264");
  R(ctx, ox + 8, oy + 14, 16, 2, "#fff0b0");
  R(ctx, ox + 8, oy + 18, 16, 2, "#a07e36");
  R(ctx, ox + 12, oy + 8, 8, 6, C.fireMid);
  R(ctx, ox + 14, oy + 4, 4, 6, C.fireCore);
  PX(ctx, ox + 16, oy + 2, "#fff2b0");
}
function drawGravestone(ctx, ox, oy) {
  R(ctx, ox + 10, oy + 6, 12, 22, "#6a7388");
  R(ctx, ox + 12, oy + 4, 8, 4, "#6a7388");
  R(ctx, ox + 10, oy + 6, 12, 2, "#9aa0b4");
  R(ctx, ox + 20, oy + 6, 2, 22, "#4a5168");
  R(ctx, ox + 14, oy + 12, 4, 10, "#3a3f52");
  R(ctx, ox + 12, oy + 14, 8, 2, "#3a3f52");
  R(ctx, ox + 6, oy + 26, 20, 4, "#2a1d12");
  PX(ctx, ox + 8, oy + 25, "#3c4a26");
  PX(ctx, ox + 20, oy + 24, "#3c4a26");
}
function drawCandle(ctx, ox, oy) {
  R(ctx, ox + 13, oy + 14, 6, 14, "#e0dcc0");
  R(ctx, ox + 13, oy + 14, 2, 14, "#ffffff");
  R(ctx, ox + 18, oy + 14, 1, 14, "#b8b49a");
  R(ctx, ox + 11, oy + 26, 10, 2, "#5a3a1c");
  R(ctx, ox + 14, oy + 8, 4, 6, C.fireMid);
  R(ctx, ox + 15, oy + 5, 2, 4, C.fireCore);
  PX(ctx, ox + 15, oy + 4, "#fff2b0");
}
function drawLavaCrack(ctx, ox, oy) {
  ctx.strokeStyle = "#ff8a1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox + 4, oy + 18);
  ctx.lineTo(ox + 12, oy + 12);
  ctx.lineTo(ox + 18, oy + 22);
  ctx.lineTo(ox + 28, oy + 16);
  ctx.stroke();
  ctx.strokeStyle = "#ffd98a";
  ctx.lineWidth = 1;
  ctx.stroke();
  R(ctx, ox + 11, oy + 11, 3, 3, "#fff2b0");
  R(ctx, ox + 17, oy + 21, 3, 3, "#fff2b0");
}
function drawObsidian(ctx, ox, oy) {
  R(ctx, ox + 8, oy + 14, 16, 14, "#1a1018");
  R(ctx, ox + 12, oy + 10, 8, 6, "#241624");
  R(ctx, ox + 8, oy + 14, 16, 2, "#3a2a3a");
  R(ctx, ox + 9, oy + 16, 3, 8, "#2e1e2e");
  PX(ctx, ox + 14, oy + 18, "#c4451c");
  R(ctx, ox + 17, oy + 21, 2, 2, "#ff8a1e");
  PX(ctx, ox + 12, oy + 24, "#c4451c");
}
function drawIcicle(ctx, ox, oy) {
  R(ctx, ox + 6, oy, 22, 2, "#cfeeff");
  for (const [x, len] of [[10, 14], [16, 20], [22, 12]]) {
    for (let i = 0; i < len; i++) {
      const w = Math.max(1, Math.round((1 - i / len) * 4));
      R(ctx, ox + x - (w >> 1), oy + i, w, 1, i < 4 ? "#eaf6ff" : "#9fd8ff");
    }
    PX(ctx, ox + x, oy + 2, "#ffffff");
  }
}
function drawFrostBanner(ctx, ox, oy) {
  R(ctx, ox + 10, oy + 2, 12, 24, "#3a6a9a");
  R(ctx, ox + 10, oy + 2, 12, 2, "#cfeaff");
  R(ctx, ox + 10, oy + 2, 3, 24, "#5a8ec0");
  R(ctx, ox + 19, oy + 2, 3, 24, "#2a527a");
  R(ctx, ox + 14, oy + 8, 4, 4, "#cfeaff");
  R(ctx, ox + 12, oy + 13, 8, 2, "#cfeaff");
  R(ctx, ox + 10, oy + 26, 3, 3, "#3a6a9a");
  R(ctx, ox + 16, oy + 26, 3, 3, "#3a6a9a");
  R(ctx, ox + 20, oy + 26, 2, 3, "#3a6a9a");
}
function drawToxicMushroom(ctx, ox, oy) {
  R(ctx, ox + 12, oy + 18, 4, 10, "#cfc0a0");
  R(ctx, ox + 12, oy + 18, 1, 10, "#e8dcc0");
  R(ctx, ox + 8, oy + 12, 12, 6, "#6a2c8a");
  R(ctx, ox + 8, oy + 12, 12, 2, "#9a4cc0");
  R(ctx, ox + 12, oy + 14, 3, 2, "#e0b0ff");
  R(ctx, ox + 17, oy + 16, 3, 2, "#e0b0ff");
  R(ctx, ox + 19, oy + 21, 4, 7, "#cfc0a0");
  R(ctx, ox + 17, oy + 17, 8, 5, "#7a3a9a");
  R(ctx, ox + 17, oy + 17, 8, 1, "#9a4cc0");
  R(ctx, ox + 8, oy + 26, 16, 2, "#3f8a3a");
}
function drawPipe(ctx, ox, oy) {
  R(ctx, ox + 4, oy + 12, 24, 8, "#5a4a28");
  R(ctx, ox + 4, oy + 12, 24, 2, "#8a6e34");
  R(ctx, ox + 4, oy + 18, 24, 2, "#2a2214");
  R(ctx, ox + 2, oy + 10, 6, 12, "#7a5e2a");
  R(ctx, ox + 24, oy + 10, 6, 12, "#7a5e2a");
  R(ctx, ox + 2, oy + 10, 6, 2, "#a07e36");
  R(ctx, ox + 24, oy + 10, 6, 2, "#a07e36");
  PX(ctx, ox + 6, oy + 14, "#e6c264");
  PX(ctx, ox + 26, oy + 14, "#e6c264");
}
function drawGauge(ctx, ox, oy) {
  ctx.fillStyle = "#2a2214";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e6c264";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#1a160c";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 7, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    PX(ctx, Math.round(ox + 16 + Math.cos(a) * 7), Math.round(oy + 16 + Math.sin(a) * 7), "#e6c264");
  }
  ctx.strokeStyle = "#ff5a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox + 16, oy + 16);
  ctx.lineTo(ox + 22, oy + 10);
  ctx.stroke();
  R(ctx, ox + 15, oy + 15, 2, 2, "#fff4cf");
}
function drawWeaponRack(ctx, ox, oy) {
  R(ctx, ox + 4, oy + 26, 24, 2, "#3a2614");
  R(ctx, ox + 4, oy + 4, 2, 24, "#5a3a1c");
  R(ctx, ox + 26, oy + 4, 2, 24, "#5a3a1c");
  R(ctx, ox + 4, oy + 4, 24, 2, "#5a3a1c");
  R(ctx, ox + 4, oy + 4, 24, 1, "#7a5128");
  R(ctx, ox + 10, oy + 6, 2, 18, "#b9c4dd");
  R(ctx, ox + 8, oy + 22, 6, 2, "#caa56a");
  R(ctx, ox + 17, oy + 5, 2, 21, "#caa56a");
  R(ctx, ox + 17, oy + 3, 2, 4, "#dfe6ff");
  R(ctx, ox + 22, oy + 8, 2, 16, "#8a5a30");
  R(ctx, ox + 21, oy + 7, 5, 4, "#b9c4dd");
}
function drawDeadTree(ctx, ox, oy) {
  R(ctx, ox + 14, oy + 12, 4, 16, "#2a1e12");
  R(ctx, ox + 14, oy + 12, 2, 16, "#3a2a18");
  R(ctx, ox + 8, oy + 10, 6, 2, "#2a1e12");
  R(ctx, ox + 6, oy + 6, 3, 4, "#2a1e12");
  R(ctx, ox + 18, oy + 8, 6, 2, "#2a1e12");
  R(ctx, ox + 22, oy + 4, 3, 4, "#2a1e12");
  R(ctx, ox + 15, oy + 4, 2, 8, "#2a1e12");
  PX(ctx, ox + 7, oy + 7, "#3f6a2e");
  PX(ctx, ox + 23, oy + 5, "#3f6a2e");
  R(ctx, ox + 11, oy + 26, 10, 2, "#16240f");
}
function drawCattail(ctx, ox, oy) {
  R(ctx, ox + 10, oy + 8, 2, 20, "#3f7a34");
  R(ctx, ox + 18, oy + 6, 2, 22, "#3f7a34");
  R(ctx, ox + 22, oy + 12, 2, 16, "#3f7a34");
  R(ctx, ox + 8, oy + 12, 4, 6, "#5a3a1c");
  R(ctx, ox + 16, oy + 10, 4, 6, "#5a3a1c");
  R(ctx, ox + 8, oy + 12, 2, 6, "#6e4a24");
  PX(ctx, ox + 10, oy + 6, "#7fce58");
  PX(ctx, ox + 18, oy + 4, "#7fce58");
}
function drawStormOrb(ctx, ox, oy) {
  ctx.fillStyle = "#3a4a90";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 14, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7f9aff";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cfe0ff";
  ctx.beginPath();
  ctx.arc(ox + 15, oy + 13, 2.4, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 16, oy + 14, "#ffffff");
  for (const [dx, dy] of [[-9, -4], [9, 4], [-7, 7], [7, -7]]) R(ctx, ox + 16 + dx, oy + 14 + dy, 2, 2, "#cfe0ff");
  R(ctx, ox + 12, oy + 26, 8, 2, "#2a2e4a");
}
function drawBonePile(ctx, ox, oy) {
  R(ctx, ox + 6, oy + 22, 20, 6, "#c9c2a6");
  R(ctx, ox + 6, oy + 22, 20, 2, "#efe9cf");
  R(ctx, ox + 12, oy + 16, 8, 8, "#efe9cf");
  R(ctx, ox + 14, oy + 20, 2, 2, "#3a3020");
  R(ctx, ox + 18, oy + 20, 2, 2, "#3a3020");
  R(ctx, ox + 8, oy + 18, 2, 6, "#c9c2a6");
  R(ctx, ox + 22, oy + 18, 2, 6, "#c9c2a6");
  R(ctx, ox + 10, oy + 25, 12, 1, "#9a957e");
  PX(ctx, ox + 16, oy + 26, "#8a6ab0");
}
function drawRuneCircle(ctx, ox, oy) {
  ctx.strokeStyle = "#8a6ab0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5a4080";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 6, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    R(ctx, Math.round(ox + 16 + Math.cos(a) * 10) - 1, Math.round(oy + 16 + Math.sin(a) * 10) - 1, 2, 2, "#c79bff");
  }
  R(ctx, ox + 14, oy + 14, 4, 4, "#b58aff");
  PX(ctx, ox + 15, oy + 15, "#e8d0ff");
}
function drawIdol(ctx, ox, oy) {
  R(ctx, ox + 10, oy + 24, 12, 4, "#7a5e2a");
  R(ctx, ox + 12, oy + 8, 8, 16, "#e6c264");
  R(ctx, ox + 12, oy + 8, 3, 16, "#fff4cf");
  R(ctx, ox + 18, oy + 8, 2, 16, "#a07e36");
  R(ctx, ox + 10, oy + 6, 12, 6, "#e6c264");
  R(ctx, ox + 10, oy + 6, 12, 1, "#fff4cf");
  R(ctx, ox + 13, oy + 9, 2, 2, "#3a2a10");
  R(ctx, ox + 17, oy + 9, 2, 2, "#3a2a10");
  R(ctx, ox + 14, oy + 15, 4, 4, "#fff4cf");
  PX(ctx, ox + 15, oy + 16, "#ffffff");
}
function drawAltar(ctx, ox, oy) {
  R(ctx, ox + 6, oy + 18, 20, 10, "#a89c78");
  R(ctx, ox + 6, oy + 18, 20, 2, "#ecdca6");
  R(ctx, ox + 22, oy + 18, 4, 10, "#7a6e50");
  R(ctx, ox + 8, oy + 26, 16, 2, "#3a3426");
  R(ctx, ox + 10, oy + 12, 12, 6, "#8a7e5e");
  R(ctx, ox + 10, oy + 12, 12, 1, "#b0a47e");
  R(ctx, ox + 13, oy + 14, 6, 3, "#ffd24a");
  PX(ctx, ox + 14, oy + 15, "#fff4cf");
  PX(ctx, ox + 17, oy + 15, "#fff4cf");
}
function drawCoin(ctx, ox, frame) {
  const widths = [8, 5, 2, 5];
  const w = widths[frame % 4];
  const x = ox + 8 - w / 2;
  R(ctx, x, 4, w, 8, C.coinMid);
  R(ctx, x, 4, w, 2, C.coinHi);
  R(ctx, x, 11, w, 1, C.coinDark);
  if (w >= 5) {
    R(ctx, ox + 7, 6, 2, 4, "#b8860f");
    PX(ctx, ox + 7, 6, C.coinHi);
    PX(ctx, ox + 8, 9, C.coinDark);
  }
}
function drawGem(ctx) {
  R(ctx, 7, 3, 2, 2, C.gem);
  R(ctx, 5, 5, 6, 3, C.gem);
  R(ctx, 6, 8, 4, 2, C.gem);
  R(ctx, 7, 10, 2, 1, C.gem);
  R(ctx, 7, 3, 1, 6, "#bafff6");
  R(ctx, 5, 5, 6, 1, "#7af0e4");
  R(ctx, 9, 6, 2, 3, "#1aa094");
  PX(ctx, 7, 5, "#ffffff");
}
function drawFood(ctx) {
  R(ctx, 4, 5, 6, 6, "#9c4e22");
  R(ctx, 4, 5, 6, 1, "#c87a3a");
  R(ctx, 4, 5, 1, 6, "#b8632a");
  R(ctx, 8, 5, 2, 6, "#6e3416");
  PX(ctx, 6, 7, "#c87a3a");
  PX(ctx, 5, 9, "#7a3a18");
  R(ctx, 9, 10, 4, 3, "#e7d8b0");
  R(ctx, 9, 10, 4, 1, "#fff3d0");
  PX(ctx, 12, 12, "#fff3d0");
}
function drawPotion(ctx, color, hi) {
  R(ctx, 6, 2, 4, 2, "#7a5a3a");
  R(ctx, 6, 2, 4, 1, "#9a7a52");
  R(ctx, 7, 4, 2, 1, "#cdd2e0");
  R(ctx, 4, 5, 8, 9, "#10141e");
  R(ctx, 5, 6, 6, 7, color);
  R(ctx, 5, 6, 2, 7, hi);
  R(ctx, 9, 6, 2, 7, "rgba(0,0,0,0.28)");
  R(ctx, 5, 9, 6, 1, hi);
  PX(ctx, 6, 7, "#ffffff");
  PX(ctx, 8, 11, hi);
  PX(ctx, 7, 12, hi);
}
function drawKey(ctx) {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(5, 7, 2.6, 0, Math.PI * 2);
  ctx.stroke();
  PX(ctx, 5, 7, C.portal0);
  PX(ctx, 4, 6, C.coinHi);
  R(ctx, 7, 6, 6, 2, C.coinMid);
  R(ctx, 7, 6, 6, 1, C.coinHi);
  R(ctx, 11, 8, 1, 3, C.coinMid);
  R(ctx, 9, 8, 1, 2, C.coinMid);
}
function drawIconSword(ctx) {
  R(ctx, 7, 1, 2, 10, "#cfd6e8");
  R(ctx, 7, 1, 1, 10, "#ffffff");
  R(ctx, 8, 2, 1, 8, "#9aa0b4");
  PX(ctx, 7, 1, "#ffffff");
  R(ctx, 5, 11, 6, 1, C.coinMid);
  PX(ctx, 5, 11, C.coinHi);
  PX(ctx, 10, 11, C.coinHi);
  R(ctx, 7, 12, 2, 3, "#5a3a1c");
  R(ctx, 6, 14, 4, 1, C.coinMid);
}
function drawIconBow(ctx) {
  ctx.strokeStyle = C.doorWoodHi;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6, 8, 6, -1.15, 1.15);
  ctx.stroke();
  PX(ctx, 8, 2, C.coinMid);
  PX(ctx, 8, 14, C.coinMid);
  R(ctx, 9, 3, 1, 11, "#e7e2d0");
  R(ctx, 3, 8, 10, 1, "#d8c090");
  R(ctx, 1, 7, 3, 3, "#cfd6ff");
  R(ctx, 12, 7, 1, 3, C.fireMid);
}
function drawIconStaff(ctx) {
  R(ctx, 7, 5, 2, 10, C.doorWood);
  R(ctx, 7, 5, 1, 10, C.doorWoodHi);
  ctx.fillStyle = C.magicMid;
  ctx.beginPath();
  ctx.arc(8, 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.magicHot;
  ctx.beginPath();
  ctx.arc(8, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, 7, 3, "#ffffff");
  PX(ctx, 4, 3, C.magicHot);
  PX(ctx, 12, 4, C.magicHot);
}
function drawIconMace(ctx) {
  R(ctx, 7, 8, 2, 7, C.doorWood);
  R(ctx, 7, 8, 1, 7, C.doorWoodHi);
  R(ctx, 5, 3, 6, 5, "#aeb6cc");
  R(ctx, 5, 3, 6, 1, "#ffffff");
  R(ctx, 9, 3, 2, 5, "#6e7488");
  R(ctx, 4, 4, 1, 3, "#aeb6cc");
  R(ctx, 11, 4, 1, 3, "#aeb6cc");
  PX(ctx, 6, 5, "#ffffff");
}
function drawIconArmor(ctx) {
  R(ctx, 4, 4, 8, 9, "#5a73c0");
  R(ctx, 4, 4, 8, 2, "#a9c4ff");
  R(ctx, 4, 4, 1, 9, "#a9c4ff");
  R(ctx, 11, 4, 1, 9, "#2a3b6a");
  R(ctx, 3, 4, 2, 3, "#7a8fd0");
  R(ctx, 11, 4, 2, 3, "#7a8fd0");
  R(ctx, 7, 6, 2, 6, "#2a3b6a");
  PX(ctx, 6, 6, "#cfe0ff");
  PX(ctx, 9, 6, "#cfe0ff");
  R(ctx, 5, 12, 6, 1, "#2a3b6a");
}
function drawIconRing(ctx) {
  ctx.strokeStyle = C.coinDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.stroke();
  R(ctx, 6, 2, 4, 4, C.gem);
  R(ctx, 6, 2, 4, 1, "#bafff6");
  PX(ctx, 7, 3, "#ffffff");
}
function drawIconAmulet(ctx) {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(8, 5, 4, 0.15, Math.PI - 0.15);
  ctx.stroke();
  R(ctx, 5, 8, 6, 5, C.magicMid);
  R(ctx, 5, 8, 6, 1, C.magicHot);
  R(ctx, 9, 8, 2, 5, C.magicEdge);
  PX(ctx, 7, 10, "#ffffff");
  PX(ctx, 6, 9, C.magicCore);
}
function drawIconShield(ctx) {
  const st = "#7d8aa8", hi = "#b9c4dd", dk = "#444f6e", rim = "#c9a24a";
  R(ctx, 3, 2, 10, 2, rim);
  R(ctx, 3, 4, 10, 3, st);
  R(ctx, 4, 7, 8, 3, st);
  R(ctx, 5, 10, 6, 2, st);
  R(ctx, 6, 12, 4, 1, st);
  R(ctx, 7, 13, 2, 1, st);
  R(ctx, 3, 4, 1, 5, hi);
  R(ctx, 12, 4, 1, 5, dk);
  R(ctx, 5, 9, 1, 2, hi);
  R(ctx, 11, 9, 1, 2, dk);
  R(ctx, 7, 4, 2, 7, rim);
  R(ctx, 5, 6, 6, 2, rim);
  PX(ctx, 8, 3, "#ffffff");
}
function drawIconHelm(ctx) {
  const st = "#9aa0b4", hi = "#d6dbe8", dk = "#5a6075";
  R(ctx, 4, 3, 8, 7, st);
  R(ctx, 4, 3, 8, 1, hi);
  R(ctx, 4, 3, 1, 7, hi);
  R(ctx, 11, 3, 1, 7, dk);
  R(ctx, 4, 5, 8, 1, dk);
  R(ctx, 5, 6, 6, 2, "#1a1c24");
  R(ctx, 6, 6, 1, 2, "#3a4256");
  R(ctx, 9, 6, 1, 2, "#3a4256");
  R(ctx, 4, 10, 8, 2, dk);
  R(ctx, 7, 1, 2, 2, "#c9a24a");
  PX(ctx, 8, 0, C.fireMid);
}
function drawIconLegs(ctx) {
  const st = "#9aa0b4", hi = "#d6dbe8", dk = "#5a6075";
  R(ctx, 4, 3, 3, 11, st);
  R(ctx, 9, 3, 3, 11, st);
  R(ctx, 4, 3, 1, 11, hi);
  R(ctx, 9, 3, 1, 11, hi);
  R(ctx, 6, 3, 1, 11, dk);
  R(ctx, 11, 3, 1, 11, dk);
  R(ctx, 4, 3, 3, 1, hi);
  R(ctx, 9, 3, 3, 1, hi);
  R(ctx, 4, 8, 3, 1, dk);
  R(ctx, 9, 8, 3, 1, dk);
  R(ctx, 4, 13, 3, 1, dk);
  R(ctx, 9, 13, 3, 1, dk);
}
function drawIconGloves(ctx) {
  const lth = "#7a5a34", hi = "#a07a48", dk = "#4e3a20", steel = "#b9c4dd";
  R(ctx, 5, 9, 6, 4, lth);
  R(ctx, 5, 9, 6, 1, hi);
  R(ctx, 5, 12, 6, 1, dk);
  R(ctx, 5, 4, 6, 5, lth);
  R(ctx, 5, 4, 6, 1, hi);
  R(ctx, 5, 3, 1, 3, lth);
  R(ctx, 7, 3, 1, 3, lth);
  R(ctx, 9, 3, 1, 3, lth);
  R(ctx, 11, 4, 1, 3, lth);
  R(ctx, 4, 6, 1, 3, lth);
  R(ctx, 5, 5, 6, 1, steel);
  PX(ctx, 6, 5, "#ffffff");
}
function drawIconBoots(ctx) {
  const lth = "#6a4a2a", hi = "#9a6e3e", dk = "#3e2a16", sole = "#241b12";
  R(ctx, 5, 2, 5, 8, lth);
  R(ctx, 5, 2, 1, 8, hi);
  R(ctx, 9, 2, 1, 8, dk);
  R(ctx, 3, 10, 9, 3, lth);
  R(ctx, 3, 10, 9, 1, hi);
  R(ctx, 3, 13, 10, 1, sole);
  R(ctx, 5, 5, 5, 1, dk);
  PX(ctx, 6, 3, "#caa46a");
}
function drawIconScroll(ctx) {
  const p = "#e8dcb0", pHi = "#f6efd0", pDk = "#bcaa78", rib = "#b03030";
  R(ctx, 4, 3, 8, 10, p);
  R(ctx, 4, 3, 8, 1, pHi);
  R(ctx, 3, 2, 10, 2, pDk);
  R(ctx, 3, 2, 10, 1, p);
  R(ctx, 3, 12, 10, 2, pDk);
  R(ctx, 3, 13, 10, 1, p);
  R(ctx, 6, 6, 4, 1, pDk);
  R(ctx, 6, 8, 5, 1, pDk);
  R(ctx, 6, 10, 3, 1, pDk);
  R(ctx, 7, 1, 2, 14, rib);
  PX(ctx, 7, 7, "#ff6a6a");
}
function drawMagicBurst(ctx, ox, frame) {
  const cx = ox + 16;
  const cy = 16;
  const rad = 3 + frame * 3;
  const alpha = 1 - frame * 0.18;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = C.magicMid;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.magicHot;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, rad - 2), 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + frame;
    PX(ctx, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), C.magicCore);
  }
  if (frame === 0) R(ctx, cx - 2, cy - 2, 4, 4, C.magicCore);
  ctx.globalAlpha = 1;
}
function drawSlash(ctx, ox, frame) {
  ctx.globalAlpha = 1 - frame * 0.3;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const a0 = -0.6 + frame * 0.5;
  ctx.arc(ox + 4, 12, 9 + frame, a0, a0 + 1.4);
  ctx.stroke();
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 4, 12, 7 + frame, a0, a0 + 1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawFire(ctx, ox, frame) {
  const cx = ox + 8;
  const h = 6 + frame * 2;
  ctx.globalAlpha = 1 - frame * 0.2;
  R(ctx, cx - 4, 14 - h, 8, h, C.fireEdge);
  R(ctx, cx - 3, 15 - h, 6, h, C.fireMid);
  R(ctx, cx - 1, 16 - h, 2, h - 1, C.fireCore);
  PX(ctx, cx, 16 - h, C.portalCore);
  ctx.globalAlpha = 1;
}
function drawShadow(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(12, 4, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(12, 4, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawAura(ctx, color) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(14, 14, 12, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(14, 14, 9, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawHitStar(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(7, 2, 2, 12);
  ctx.fillRect(2, 7, 12, 2);
  ctx.fillStyle = C.spark;
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(7, 7, 2, 2);
}
function drawRing(ctx, ox, frame, color) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1 - frame * 0.22;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(ox + 16, 24, 4 + frame * 4, 2 + frame * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawGlowDot(ctx, color) {
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
}
function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(0,0,0,0.18)");
  g.addColorStop(1, "rgba(3,4,9,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function drawEdgeTint(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.92);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.7, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(255,255,255,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function drawBoneArcher(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const draw = frame === 3;
  const D = "rgba(0,0,0,0.22)";
  R(ctx, cx - 6, 8 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 8 + bob, 12, 2, r.body1);
  R(ctx, cx + 4, 9 + bob, 2, 9, D);
  R(ctx, cx - 4, 12 + bob, 4, 4, r.detail);
  R(ctx, cx + 1, 12 + bob, 4, 4, r.detail);
  R(ctx, cx - 3, 13 + bob, 2, 2, r.eye);
  R(ctx, cx + 2, 13 + bob, 2, 2, r.eye);
  R(ctx, cx - 1, 16 + bob, 2, 2, D);
  R(ctx, cx - 4, 18 + bob, 8, 2, r.body1);
  for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 19 + bob, r.body2);
  R(ctx, cx - 1, 20 + bob, 2, 14, r.body0);
  R(ctx, cx - 8, 21 + bob, 16, 12, r.body1);
  R(ctx, cx - 8, 21 + bob, 16, 1, r.body2);
  R(ctx, cx + 6, 21 + bob, 2, 12, D);
  for (let i = 0; i < 4; i++) {
    R(ctx, cx - 7, 23 + bob + i * 3, 6, 2, r.detail);
    R(ctx, cx + 1, 23 + bob + i * 3, 6, 2, r.detail);
  }
  R(ctx, cx - 5, 34 + bob, 4, 6, r.body0);
  R(ctx, cx + 1, 34 + bob, 4, 6, r.body0);
  R(ctx, cx - 5, 34 + bob, 1, 6, r.body1);
  const bx = cx - 12;
  ctx.strokeStyle = r.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx + 4, 26 + bob, 12, 2, 4.28);
  ctx.stroke();
  R(ctx, bx + 1, 16 + bob, 1, 20, "#e6dfba");
  if (draw) {
    R(ctx, bx + 1, 25 + bob, 16, 2, "#e6dfba");
    R(ctx, bx + 16, 24 + bob, 3, 3, r.eye);
  } else R(ctx, bx + 1, 25 + bob, 8, 2, "#e6dfba");
}
function drawSkeletonServant(ctx, ox, frame, r, role) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const atk = frame === 3;
  const B = r.body2, BH = "#f6f1da", BD = r.body0, SH = "rgba(0,0,0,0.30)";
  const ac = r.accent;
  R(ctx, cx - 4, 32 + bob, 3, 8, B);
  R(ctx, cx + 1, 32 + bob, 3, 8, B);
  R(ctx, cx - 4, 32 + bob, 1, 8, BH);
  R(ctx, cx - 5, 39 + bob, 4, 2, B);
  R(ctx, cx + 1, 39 + bob, 4, 2, B);
  R(ctx, cx - 5, 29 + bob, 10, 3, B);
  R(ctx, cx - 5, 29 + bob, 10, 1, BH);
  R(ctx, cx - 1, 18 + bob, 2, 12, B);
  for (let i = 0; i < 4; i++) {
    R(ctx, cx - 6, 19 + bob + i * 3, 5, 1, B);
    R(ctx, cx + 1, 19 + bob + i * 3, 5, 1, B);
  }
  R(ctx, cx - 6, 18 + bob, 12, 1, BH);
  R(ctx, cx - 8, 18 + bob, 3, 2, B);
  R(ctx, cx + 5, 18 + bob, 3, 2, B);
  R(ctx, cx - 5, 7 + bob, 10, 9, B);
  R(ctx, cx - 5, 7 + bob, 10, 2, BH);
  R(ctx, cx + 3, 8 + bob, 2, 8, SH);
  R(ctx, cx - 4, 16 + bob, 8, 2, B);
  R(ctx, cx - 3, 11 + bob, 3, 3, "#120e0a");
  R(ctx, cx + 1, 11 + bob, 3, 3, "#120e0a");
  PX(ctx, cx - 2, 12 + bob, r.eye);
  PX(ctx, cx + 2, 12 + bob, r.eye);
  R(ctx, cx - 1, 14 + bob, 2, 1, SH);
  for (let i = 0; i < 3; i++) PX(ctx, cx - 3 + i * 3, 17 + bob, BD);
  if (role === "tank") {
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.arc(cx - 9, 26 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BH;
    ctx.beginPath();
    ctx.arc(cx - 9, 26 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = r.detail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - 9, 26 + bob, 8, 0, Math.PI * 2);
    ctx.stroke();
    R(ctx, cx - 6, 5 + bob, 12, 4, ac);
    R(ctx, cx - 6, 5 + bob, 12, 1, BH);
    R(ctx, cx, 3 + bob, 1, 4, ac);
    R(ctx, cx + 6, 20 + bob, 2, 9, B);
  } else if (role === "archer") {
    const bx = cx - 12;
    ctx.strokeStyle = ac;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx + 4, 26 + bob, 12, 2, 4.28);
    ctx.stroke();
    R(ctx, bx + 1, 16 + bob, 1, 20, BH);
    if (atk) {
      R(ctx, bx + 1, 25 + bob, 16, 1, BH);
      R(ctx, bx + 15, 24 + bob, 3, 3, r.eye);
    }
    R(ctx, cx + 6, 20 + bob, 2, 9, B);
  } else if (role === "mage") {
    R(ctx, cx - 6, 5 + bob, 12, 6, ac);
    R(ctx, cx - 6, 5 + bob, 12, 1, BH);
    R(ctx, cx - 6, 8 + bob, 2, 4, ac);
    R(ctx, cx + 4, 8 + bob, 2, 4, ac);
    const sx = cx + 8;
    R(ctx, sx, 8 + bob, 2, 28, "#3a3056");
    R(ctx, sx, 8 + bob, 1, 28, "#5a4f7a");
    const oc = atk ? "#eafff0" : ac;
    ctx.fillStyle = "#16331f";
    ctx.beginPath();
    ctx.arc(sx + 1, 7 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = oc;
    ctx.beginPath();
    ctx.arc(sx + 1, 7 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, sx, 6 + bob, "#ffffff");
  } else {
    R(ctx, cx - 6, 5 + bob, 12, 5, "#2a3328");
    R(ctx, cx - 6, 5 + bob, 12, 1, ac);
    const dx = cx + 7 + (atk ? 2 : 0);
    R(ctx, dx, 16 + bob, 2, 7, "#dfe6ff");
    R(ctx, dx - 1, 22 + bob, 4, 1, ac);
    R(ctx, dx, 23 + bob, 2, 3, "#5a3a1c");
    R(ctx, cx - 8, 20 + bob, 2, 8, B);
  }
}
function drawBrute(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  const D = "rgba(0,0,0,0.26)";
  R(ctx, cx - 14, 16 + bob, 28, 20, r.body1);
  R(ctx, cx - 14, 16 + bob, 28, 3, r.body2);
  R(ctx, cx - 14, 16 + bob, 4, 20, r.body2);
  R(ctx, cx + 10, 16 + bob, 4, 20, D);
  R(ctx, cx - 8, 22 + bob, 16, 10, r.detail);
  R(ctx, cx - 8, 22 + bob, 16, 2, r.accent);
  for (const sx of [-6, 0, 6]) {
    PX(ctx, cx + sx, 24 + bob, r.accent);
    PX(ctx, cx + sx, 30 + bob, r.accent);
  }
  R(ctx, cx - 6, 8 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 8 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 12 + bob, 4, 3, r.eye);
  R(ctx, cx + 1, 12 + bob, 4, 3, r.eye);
  R(ctx, cx - 9, 5 + bob, 3, 4, r.detail);
  R(ctx, cx + 6, 5 + bob, 3, 4, r.detail);
  R(ctx, cx - 4, 16 + bob, 8, 2, r.body0);
  R(ctx, cx - 18 - lunge, 24 + bob, 6, 10, r.body1);
  R(ctx, cx + 12 + lunge, 24 + bob, 6, 10, r.body1);
  R(ctx, cx - 18 - lunge, 32 + bob, 6, 4, r.accent);
  R(ctx, cx + 12 + lunge, 32 + bob, 6, 4, r.accent);
  R(ctx, cx - 8, 36 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 36 + bob, 6, 6, r.body0);
  if (frame === 3) R(ctx, cx - 4, 20 + bob, 8, 2, "#ffffff");
}
function drawImp(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const wing = frame % 2 === 0 ? 4 : 0;
  for (const s of [-1, 1]) {
    const wx = cx + s * (8 + wing);
    R(ctx, wx - (s < 0 ? 6 : 0), 14 + bob, 6, 10, r.body0);
    R(ctx, wx - (s < 0 ? 6 : -4), 13 + bob, 2, 12, r.detail);
    PX(ctx, wx + (s < 0 ? -6 : 6), 12 + bob, r.detail);
  }
  R(ctx, cx - 6, 18 + bob, 12, 12, r.body1);
  R(ctx, cx - 6, 18 + bob, 12, 2, r.body2);
  R(ctx, cx + 4, 18 + bob, 2, 12, "rgba(0,0,0,0.22)");
  R(ctx, cx - 4, 22 + bob, 8, 6, r.accent);
  R(ctx, cx - 6, 9 + bob, 12, 9, r.body2);
  R(ctx, cx - 6, 9 + bob, 12, 1, r.body1);
  R(ctx, cx - 7, 5 + bob, 3, 5, r.detail);
  R(ctx, cx + 4, 5 + bob, 3, 5, r.detail);
  R(ctx, cx - 4, 12 + bob, 3, 2, r.eye);
  R(ctx, cx + 2, 12 + bob, 3, 2, r.eye);
  PX(ctx, cx - 3, 12 + bob, "#ffffff");
  PX(ctx, cx + 3, 12 + bob, "#ffffff");
  R(ctx, cx - 3, 16 + bob, 6, 1, r.detail);
  R(ctx, cx + 5, 28 + bob, 6, 2, r.body0);
  R(ctx, cx + 10, 26 + bob, 2, 3, r.accent);
  R(ctx, cx - 4, 30 + bob, 3, 5, r.body0);
  R(ctx, cx + 2, 30 + bob, 3, 5, r.body0);
}
function drawColossus(ctx, ox, frame, r) {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -4, 0][frame % 4];
  const cast = frame === 3;
  const D = "rgba(0,0,0,0.3)";
  R(ctx, cx - 18, 60 + bob, 12, 16, r.body0);
  R(ctx, cx + 6, 60 + bob, 12, 16, r.body0);
  R(ctx, cx - 18, 60 + bob, 3, 16, r.body1);
  R(ctx, cx - 24, 24 + bob, 48, 40, r.body1);
  R(ctx, cx - 24, 24 + bob, 48, 4, r.body2);
  R(ctx, cx - 24, 24 + bob, 6, 40, r.body2);
  R(ctx, cx + 18, 24 + bob, 6, 40, D);
  for (let i = 0; i < 6; i++) R(ctx, cx - 18 + i * 6, 32 + bob + i % 2 * 8, 3, 12, r.accent);
  R(ctx, cx - 12, 44 + bob, 24, 4, C.fireCore);
  R(ctx, cx - 12, 44 + bob, 24, 1, "#fff4cf");
  R(ctx, cx - 32, 28 + bob, 10, 20, r.body0);
  R(ctx, cx + 22, 28 + bob, 10, 20, r.body0);
  R(ctx, cx - 32, 46 + bob, 10, 6, r.accent);
  R(ctx, cx + 22, 46 + bob, 10, 6, r.accent);
  R(ctx, cx - 10, 8 + bob, 20, 18, r.body2);
  R(ctx, cx - 10, 8 + bob, 20, 2, "#ffffff");
  R(ctx, cx - 8, 14 + bob, 6, 6, r.detail);
  R(ctx, cx + 2, 14 + bob, 6, 6, r.detail);
  R(ctx, cx - 8, 14 + bob, 6, 4, r.eye);
  R(ctx, cx + 2, 14 + bob, 6, 4, r.eye);
  R(ctx, cx - 6, 22 + bob, 12, 3, C.fireCore);
  for (let i = 0; i < 5; i++) PX(ctx, cx - 5 + i * 2.5, 23 + bob, r.body2);
  if (cast) {
    for (let i = 0; i < 7; i++) R(ctx, cx - 10 + i * 3, 2 + bob, 2, 6, C.fireCore);
    R(ctx, cx - 30, 36 + bob, 8, 8, r.accent);
    R(ctx, cx + 22, 36 + bob, 8, 8, r.accent);
  }
}
function drawOoze(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const squish = [0, 2, 4, 2][frame % 4];
  const w = 26 + squish;
  const h = 26 - squish;
  const top = 38 - h;
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx - 2, top + h / 2 - 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, top + h - 3, w / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, cx - 8, top + 3, 6, 4, r.accent);
  R(ctx, cx - 7, top + h / 2, 5, 5, r.eye);
  R(ctx, cx + 2, top + h / 2, 5, 5, r.eye);
  PX(ctx, cx - 6, top + h / 2 + 1, r.detail);
  PX(ctx, cx + 3, top + h / 2 + 1, r.detail);
  for (const dx of [-9, -3, 5, 9]) PX(ctx, cx + dx, top + h - 1, r.body0);
  if (frame === 3) R(ctx, cx - 2, top - 4, 4, 6, r.accent);
}
function drawConstruct(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const fire = frame === 3;
  const D = "rgba(0,0,0,0.28)";
  R(ctx, cx - 8, 34 + bob, 6, 8, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 8, r.body0);
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 20, 2, r.body2);
  R(ctx, cx - 10, 16 + bob, 2, 18, r.body2);
  R(ctx, cx + 8, 16 + bob, 2, 18, D);
  for (const c of [[-8, 18], [6, 18], [-8, 30], [6, 30]]) {
    R(ctx, cx + c[0], bob + c[1], 2, 2, r.accent);
  }
  R(ctx, cx - 4, 22 + bob, 8, 6, r.eye);
  R(ctx, cx - 2, 24 + bob, 4, 2, "#ffffff");
  R(ctx, cx - 6, 6 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 6 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 10 + bob, 8, 2, r.eye);
  R(ctx, cx - 14, 18 + bob, 4, 12, r.body1);
  R(ctx, cx + 10, 18 + bob, 4, 12, r.body1);
  if (fire) R(ctx, cx + 14, 22 + bob, 6, 2, r.eye);
}
function drawWisp(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const cy = 18 + bob;
  for (const [rad, col] of [[12, r.body0], [9, r.body1], [6, r.body2]]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad, rad, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  R(ctx, cx - 2, cy - 2, 4, 4, r.eye);
  PX(ctx, cx - 1, cy - 1, "#ffffff");
  for (const [dx, dy] of [[-12, -6], [12, 4], [-10, 8], [10, -8], [0, -13]]) {
    R(ctx, cx + dx, cy + dy, 2, 2, r.accent);
  }
  R(ctx, cx - 2, cy + 10, 4, 8, r.body1);
  if (frame === 3) {
    R(ctx, cx - 2, cy - 16, 4, 6, r.eye);
    R(ctx, cx - 14, cy, 6, 2, r.accent);
  }
}
function drawStalker(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, 24 + bob, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, 30 + bob, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx, 14 + bob, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, cx - 4, 12 + bob, 3, 2, r.eye);
  R(ctx, cx + 2, 12 + bob, 3, 2, r.eye);
  PX(ctx, cx - 3, 12 + bob, "#ffffff");
  PX(ctx, cx + 3, 12 + bob, "#ffffff");
  R(ctx, cx - 13 - lunge, 22 + bob, 4, 9, r.accent);
  R(ctx, cx + 9 + lunge, 22 + bob, 4, 9, r.accent);
  R(ctx, cx - 14 - lunge, 30 + bob, 3, 3, r.accent);
  R(ctx, cx + 11 + lunge, 30 + bob, 3, 3, r.accent);
  R(ctx, cx - 5, 36 + bob, 3, 6, r.body0);
  R(ctx, cx + 2, 36 + bob, 3, 6, r.body0);
  for (const [dx, dy] of [[-10, 18], [10, 22], [0, 6]]) PX(ctx, cx + dx, dy + bob, r.detail);
}
function drawRadialLight(ctx, w, h, inner = "rgba(255,206,130,0.95)", outer = "rgba(255,150,40,0)") {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, "rgba(255,176,80,0.35)");
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function drawIconFish(ctx) {
  const body = "#7fb8d8", hi = "#cfeaff", dk = "#3a6a8a", fin = "#5a94b8";
  R(ctx, 3, 6, 8, 4, body);
  R(ctx, 4, 5, 6, 1, hi);
  R(ctx, 4, 10, 6, 1, dk);
  PX(ctx, 2, 7, body);
  PX(ctx, 2, 8, body);
  R(ctx, 11, 5, 2, 2, fin);
  R(ctx, 11, 9, 2, 2, fin);
  PX(ctx, 12, 7, fin);
  PX(ctx, 12, 8, fin);
  PX(ctx, 6, 4, fin);
  PX(ctx, 7, 4, fin);
  PX(ctx, 6, 11, fin);
  PX(ctx, 4, 7, "#0a0a14");
  PX(ctx, 6, 7, dk);
  PX(ctx, 5, 6, "#ffffff");
}
function drawArrow(ctx, ox = 0) {
  R(ctx, ox + 2, 2, 8, 2, "#8a5a28");
  R(ctx, ox + 2, 2, 8, 1, "#b5894a");
  R(ctx, ox + 9, 1, 3, 4, "#cfd6e8");
  PX(ctx, ox + 12, 2, "#ffffff");
  PX(ctx, ox + 12, 3, "#ffffff");
  R(ctx, ox + 0, 1, 2, 4, "#c43c2a");
  PX(ctx, ox + 1, 0, "#e05a3a");
  PX(ctx, ox + 1, 5, "#e05a3a");
}
function drawBolt(ctx) {
  const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#c79bff");
  g.addColorStop(1, "rgba(80,40,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 10, 10);
  R(ctx, 4, 4, 2, 2, "#ffffff");
}
function legShift(pose) {
  if (pose === 1) return [-2, 2];
  if (pose === 2) return [2, -2];
  return [0, 0];
}
function drawWeapon(ctx, ox, cls, ramp, facing, pose) {
  const attack = pose === 3;
  const cx = ox + HERO_FW / 2;
  if (cls === "vanguard") {
    const hx = (facing === "side" ? cx + 12 : cx + 10) + (attack ? 1 : 0);
    const len = attack ? 26 : 20;
    const top = attack ? 4 : 9;
    R(ctx, hx, top, 5, len, ramp.trim);
    R(ctx, hx, top, 2, len, ramp.trimHi);
    R(ctx, hx + 4, top, 1, len, "#4a4a5a");
    R(ctx, hx + 2, top + 1, 1, len - 2, "#c8ccd8");
    PX(ctx, hx + 2, top - 1, "#ffffff");
    R(ctx, hx - 2, top + len, 9, 2, C.coinMid);
    R(ctx, hx - 2, top + len, 9, 1, C.coinHi);
    R(ctx, hx + 1, top + len + 2, 3, 5, ramp.cloth1);
    R(ctx, hx + 1, top + len + 2, 1, 5, ramp.cloth2);
    R(ctx, hx, top + len + 7, 5, 2, C.coinMid);
    PX(ctx, hx + 2, top + len + 8, C.coinHi);
  } else if (cls === "thief") {
    const hx = cx + (attack ? 11 : 9);
    const top = attack ? 18 : 23;
    const len = attack ? 17 : 11;
    R(ctx, hx, top, 2, len, "#cfd6e8");
    R(ctx, hx, top, 1, len, "#ffffff");
    PX(ctx, hx, top - 1, "#ffffff");
    R(ctx, hx - 2, top + len, 6, 2, ramp.trim);
    R(ctx, hx, top + len + 2, 2, 4, "#241a10");
    if (attack) {
      R(ctx, hx - 1, top - 4, 4, 4, "#cfe0ff");
      PX(ctx, hx, top - 5, "#ffffff");
    }
  } else if (cls === "arcanist") {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 12, 3, 30, C.doorWood);
    R(ctx, hx, 12, 1, 30, C.doorWoodHi);
    const oc = attack ? C.magicCore : C.magicMid;
    ctx.fillStyle = oc;
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.magicHot;
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 2.6, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, hx, 8, "#ffffff");
    if (attack) {
      PX(ctx, hx - 4, 4, C.magicHot);
      PX(ctx, hx + 6, 5, C.magicHot);
      PX(ctx, hx + 1, 2, "#ffffff");
    }
  } else if (cls === "necromancer") {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 7, 3, 35, "#2a2440");
    R(ctx, hx, 7, 1, 35, "#4a3f6a");
    R(ctx, hx - 3, 6, 2, 6, "#3a3358");
    R(ctx, hx + 4, 6, 2, 6, "#3a3358");
    PX(ctx, hx - 3, 5, "#6a5f96");
    PX(ctx, hx + 5, 5, "#6a5f96");
    const orb = attack ? "#b6ffd0" : "#6ee0a0";
    ctx.fillStyle = "#14331e";
    ctx.beginPath();
    ctx.arc(hx + 1, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(hx + 1, 6, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eafff0";
    ctx.beginPath();
    ctx.arc(hx, 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    R(ctx, hx, 21, 3, 3, "#cfc9af");
    PX(ctx, hx, 22, "#1a1410");
    PX(ctx, hx + 2, 22, "#1a1410");
    if (attack) {
      PX(ctx, hx - 4, 2, orb);
      PX(ctx, hx + 6, 3, orb);
      PX(ctx, hx + 1, 0, "#ffffff");
    }
  } else if (cls === "bard") {
    const hx = cx + (attack ? 12 : 10);
    const top = attack ? 12 : 18;
    const len = attack ? 22 : 16;
    R(ctx, hx, top, 2, len, "#cfd6e8");
    R(ctx, hx, top, 1, len, "#ffffff");
    PX(ctx, hx, top - 1, "#ffffff");
    R(ctx, hx - 2, top + len, 6, 2, ramp.trim);
    PX(ctx, hx - 2, top + len - 1, ramp.trimHi);
    PX(ctx, hx + 3, top + len - 1, ramp.trimHi);
    R(ctx, hx, top + len + 2, 2, 4, "#3a1622");
    PX(ctx, hx + 1, top + len + 6, ramp.trim);
    if (attack) {
      PX(ctx, hx - 1, top - 3, "#eaf0ff");
      PX(ctx, hx + 2, top - 2, "#eaf0ff");
    }
  } else if (cls === "druid") {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 12, 3, 30, "#5a4426");
    R(ctx, hx, 12, 1, 30, "#7e6238");
    PX(ctx, hx - 1, 18, "#5a4426");
    PX(ctx, hx + 3, 26, "#5a4426");
    const orb = attack ? "#b6ff8a" : "#7fce58";
    ctx.fillStyle = "#1e3312";
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eaffd0";
    ctx.beginPath();
    ctx.arc(hx, 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, hx - 3, 6, "#4a8a3a");
    PX(ctx, hx - 4, 5, "#7fce58");
    PX(ctx, hx + 5, 7, "#4a8a3a");
    PX(ctx, hx + 6, 6, "#7fce58");
    if (attack) {
      PX(ctx, hx - 3, 3, orb);
      PX(ctx, hx + 5, 2, orb);
      PX(ctx, hx + 1, 1, "#ffffff");
    }
  } else {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 16, 3, 22, C.doorWood);
    R(ctx, hx, 16, 1, 22, C.doorWoodHi);
    R(ctx, hx - 2, 9, 7, 7, ramp.trim);
    R(ctx, hx - 2, 9, 7, 2, ramp.trimHi);
    R(ctx, hx - 3, 11, 1, 3, ramp.trim);
    R(ctx, hx + 5, 11, 1, 3, ramp.trim);
    PX(ctx, hx + 1, 12, "#ffffff");
  }
}
function drawHeroBack(ctx, ox, cls, ramp, facing, pose) {
  const cx = ox + HERO_FW / 2;
  const bob = pose === 1 ? -2 : 0;
  const sway = pose === 1 ? -1 : pose === 3 ? 1 : 0;
  const tTop = 19 + bob;
  if (cls === "vanguard") {
    R(ctx, cx - 12, tTop - 1, 5, 18 + sway, ramp.cloth0);
    R(ctx, cx - 12, tTop - 1, 2, 18 + sway, "rgba(255,255,255,0.10)");
    for (let i = 0; i < 6; i++) PX(ctx, cx - 12 + i % 3, tTop + 2 + i * 2, "rgba(230,220,200,0.28)");
    PX(ctx, cx - 10 + sway, tTop + 17 + sway, ramp.cloth0);
    PX(ctx, cx - 8 - sway, tTop + 18 + sway, ramp.cloth0);
    if (facing === "up") {
      R(ctx, cx - 6, tTop + 1, 12, 12, ramp.trim);
      R(ctx, cx - 6, tTop + 1, 12, 2, ramp.trimHi);
      R(ctx, cx - 4, tTop + 3, 8, 8, ramp.cloth1);
      R(ctx, cx - 1, tTop + 5, 2, 4, ramp.trimHi);
    }
  } else if (cls === "thief") {
    R(ctx, cx - 10, tTop, 4, 14 + sway, ramp.cloth0);
    R(ctx, cx + 6, tTop, 4, 13 - sway, ramp.cloth0);
    PX(ctx, cx - 9 + sway, tTop + 14 + sway, ramp.cloth0);
    PX(ctx, cx + 8 - sway, tTop + 13 - sway, ramp.cloth0);
  } else if (cls === "necromancer") {
    R(ctx, cx - 11, tTop - 1, 22, 19, "rgba(24,18,42,0.9)");
    R(ctx, cx - 11, tTop - 1, 22, 2, "rgba(89,67,128,0.8)");
    for (let i = 0; i < 5; i++) {
      const tx = cx - 10 + i * 5 + (i % 2 === 0 ? sway : -sway);
      R(ctx, tx, tTop + 18, 2, 4 + i % 3, "rgba(24,18,42,0.85)");
    }
  } else if (cls === "warden") {
    R(ctx, cx - 12, tTop - 2, 24, 6, ramp.cloth0);
    R(ctx, cx - 12, tTop - 2, 24, 1, "rgba(255,255,255,0.14)");
    for (let i = 0; i < 8; i++) PX(ctx, cx - 11 + i * 3, tTop + 3 + i % 2, "rgba(235,228,205,0.30)");
  } else if (cls === "bard") {
    R(ctx, cx + 4, tTop + 4, 8, 10, "#7e5228");
    R(ctx, cx + 5, tTop + 5, 6, 8, "#a8763c");
    R(ctx, cx + 6, tTop + 7, 3, 3, "#3a2410");
    R(ctx, cx - 6 - sway, tTop - 4, 10, 2, "#5a3a1c");
    R(ctx, cx - 6 - sway, tTop - 4, 10, 1, "#7a5128");
    R(ctx, cx - 8 - sway, tTop - 6, 3, 4, "#5a3a1c");
    PX(ctx, cx - 7 - sway, tTop - 7, ramp.trim);
    for (let i = 0; i < 4; i++) PX(ctx, cx - 2 + i * 2, tTop - 3 + Math.floor(i / 2) + 2, "rgba(255,233,168,0.6)");
    for (let i = 0; i < 6; i++) PX(ctx, cx - 4 + i, tTop + 1 + i, ramp.trim);
  } else if (cls === "druid") {
    R(ctx, cx - 12, tTop - 2, 24, 6, ramp.cloth0);
    R(ctx, cx - 12, tTop - 2, 24, 1, "rgba(255,255,255,0.10)");
    for (let i = 0; i < 8; i++) PX(ctx, cx - 11 + i * 3, tTop + 3 + i % 2, "rgba(127,206,88,0.45)");
    PX(ctx, cx - 10 + sway, tTop + 5, "#7fce58");
    PX(ctx, cx + 9 - sway, tTop + 5, "#4a8a3a");
  }
}
function drawHeroFlair(ctx, ox, cls, ramp, facing, pose) {
  const cx = ox + HERO_FW / 2;
  const bob = pose === 1 ? -2 : 0;
  const sway = pose === 1 ? -1 : pose === 3 ? 1 : 0;
  const hTop = 8 + bob;
  const tTop = 19 + bob;
  const hx0 = cx - 6;
  const hw = 12;
  if (cls === "vanguard") {
    R(ctx, hx0 - 1, hTop + 1, hw + 2, 1, ramp.trim);
    PX(ctx, hx0 - 1, hTop + 1, ramp.trimHi);
    R(ctx, hx0 - 2, hTop + 4, 1, 6, ramp.hair);
    R(ctx, hx0 + hw + 1, hTop + 4, 1, 6, ramp.hair);
    PX(ctx, hx0 - 2, hTop + 10, C.coinMid);
    PX(ctx, hx0 + hw + 1, hTop + 10, C.coinMid);
    if (facing !== "up") {
      for (let i = 0; i < 7; i++) PX(ctx, cx - 6 + i * 2, tTop + 2 + i, ramp.trim);
      PX(ctx, cx - 6, tTop + 2, ramp.trimHi);
    }
  } else if (cls === "thief") {
    if (facing !== "up") {
      R(ctx, hx0 + 1, hTop + 7, hw - 2, 2, ramp.cloth0);
      R(ctx, hx0 + 1, hTop + 7, hw - 2, 1, "rgba(255,255,255,0.08)");
    }
    R(ctx, cx - 7, 35 + bob, 2, 6, ramp.cloth0);
    PX(ctx, cx - 6, 36 + bob, "#cfd6e8");
  } else if (cls === "arcanist") {
    R(ctx, hx0 + 3, hTop - 8, 3, 3, ramp.cloth2);
    PX(ctx, hx0 + 4 + sway, hTop - 9, ramp.cloth2);
    PX(ctx, hx0 + 6, hTop - 4, C.coinHi);
    const runeY = tTop + 22;
    for (let i = 0; i < 3; i++) PX(ctx, cx - 6 + i * 5 + sway, runeY, i === pose % 3 ? C.magicHot : C.magicMid);
    R(ctx, cx - 8, tTop + 12, 4, 5, "#5a3a1e");
    R(ctx, cx - 7, tTop + 13, 2, 3, "#e8e2cc");
  } else if (cls === "warden") {
    PX(ctx, hx0 - 2, hTop - 4, "#d8cfb4");
    PX(ctx, hx0 - 3, hTop - 5, "#d8cfb4");
    PX(ctx, hx0 + hw + 1, hTop - 4, "#d8cfb4");
    PX(ctx, hx0 + hw + 2, hTop - 5, "#d8cfb4");
    if (facing !== "up") {
      PX(ctx, cx - 1, tTop + 5, "#fff4c0");
      PX(ctx, cx + 1, tTop + 5, "#fff4c0");
      PX(ctx, cx, tTop + 4, "#fffbe2");
      PX(ctx, cx, tTop + 6, "#fffbe2");
    }
  } else if (cls === "necromancer") {
    for (let i = 0; i < 4; i++) {
      const bx = hx0 - 1 + i * 4;
      R(ctx, bx, hTop - 5 - i % 2, 2, 3 + i % 2, "#cfc9af");
      PX(ctx, bx, hTop - 6 - i % 2, "#efe9d2");
    }
    const wx = cx + (facing === "side" ? -11 : 10) + sway;
    const wy = hTop + 2 - sway;
    PX(ctx, wx, wy, "#8affd0");
    PX(ctx, wx + 1, wy + 1, "rgba(138,255,208,0.55)");
    PX(ctx, wx - 1, wy + 1, "rgba(138,255,208,0.35)");
    if (facing !== "up") for (let i = 0; i < 3; i++) R(ctx, cx - 3, tTop + 4 + i * 3, 6, 1, "rgba(207,201,175,0.5)");
  } else if (cls === "bard") {
    if (facing !== "up") {
      for (let i = 0; i < 3; i++) PX(ctx, cx, tTop + 3 + i * 3, ramp.trimHi);
      for (let i = 0; i < 7; i++) PX(ctx, cx - 6 + i * 2, tTop + 9 + Math.floor(i / 2) - i % 2, ramp.trim);
    }
    const nx = cx + (facing === "side" ? -10 : 11) + sway;
    PX(ctx, nx, hTop + 1 - sway, "#ffe9a8");
    PX(ctx, nx + 1, hTop - sway, "rgba(255,233,168,0.6)");
    PX(ctx, nx - 1, hTop + 4 + sway, "rgba(255,233,168,0.4)");
  } else if (cls === "druid") {
    if (facing !== "up") {
      for (let i = 0; i < 7; i++) PX(ctx, cx - 6 + i * 2, tTop + 11 + i % 2, "#4a8a3a");
      PX(ctx, cx, tTop + 11, "#7fce58");
      PX(ctx, cx + 1, tTop + 12, "#b6ff8a");
    }
    const fx = cx + (facing === "side" ? -10 : 10) - sway;
    PX(ctx, fx, hTop + 3 + sway, "rgba(182,255,138,0.8)");
    PX(ctx, fx + 2, hTop + 6 - sway, "rgba(182,255,138,0.45)");
  }
  R(ctx, hx0 - 1, hTop - (cls === "arcanist" ? 6 : cls === "necromancer" ? 3 : 2), hw + 2, 1, "rgba(255,255,255,0.22)");
}
function drawHumanoid(ctx, ox, cls, ramp, facing, pose) {
  const cx = ox + HERO_FW / 2;
  const bob = pose === 1 ? -2 : 0;
  const [ll, rl] = legShift(pose);
  const robe = cls === "arcanist" || cls === "warden" || cls === "necromancer" || cls === "druid";
  const sway = pose === 1 ? -1 : pose === 3 ? 1 : 0;
  const SH = "rgba(0,0,0,0.18)";
  const SHd = "rgba(0,0,0,0.32)";
  const hTop = 8 + bob;
  const tTop = 19 + bob;
  const legTop = 33 + bob;
  if (facing === "up") drawWeapon(ctx, ox, cls, ramp, facing, pose);
  drawHeroBack(ctx, ox, cls, ramp, facing, pose);
  const side = facing === "side";
  const tw = side ? 12 : 14;
  const tx = cx - tw / 2;
  const bw = tw + 2;
  const bx = cx - bw / 2;
  const liftL = pose === 1 ? 2 : 0;
  const liftR = pose === 2 ? 2 : 0;
  const armSwingL = pose === 1 ? 1 : pose === 2 ? -1 : 0;
  const armSwingR = pose === 3 ? -2 : -armSwingL;
  if (robe) {
    const rw = side ? 16 : 18;
    const rx = cx - rw / 2;
    R(ctx, rx + 1, tTop, rw - 2, 2, ramp.cloth0);
    R(ctx, rx, tTop + 2, rw, 15, ramp.cloth0);
    R(ctx, rx - 1, tTop + 17, rw + 2, 6, ramp.cloth0);
    R(ctx, rx, tTop + 23, rw, 2, ramp.cloth0);
    R(ctx, rx, tTop + 2, 3, 20, ramp.cloth1);
    R(ctx, rx + rw - 2, tTop + 2, 2, 20, SHd);
    R(ctx, rx - 1, tTop + 21, rw + 2, 2, ramp.trim);
    PX(ctx, rx - 1, tTop + 21, ramp.trimHi);
    R(ctx, cx - 3, tTop + 4, 1, 16, SH);
    R(ctx, cx + 2, tTop + 4, 1, 16, SH);
  } else {
    R(ctx, bx + 1, tTop, bw - 2, 1, ramp.cloth0);
    R(ctx, bx, tTop + 1, bw, 13, ramp.cloth0);
    R(ctx, bx + 1, tTop + 14, bw - 2, 8, ramp.cloth0);
    R(ctx, bx, tTop + 1, 3, 13, ramp.cloth1);
    R(ctx, bx + bw - 2, tTop + 1, 2, 13, SHd);
    PX(ctx, cx - 6 + sway, tTop + 22, ramp.cloth0);
    PX(ctx, cx - 2 + sway, tTop + 23, ramp.cloth1);
    PX(ctx, cx + 2 + sway, tTop + 22, ramp.cloth0);
  }
  if (robe) {
    const lx = cx - 5 + (side ? ll : 0);
    const rx = cx + 1 + (side ? rl : 0);
    R(ctx, lx, legTop + 6 - liftL, 4, 4, ramp.cloth0);
    R(ctx, rx, legTop + 6 - liftR, 4, 4, ramp.cloth0);
    R(ctx, lx, legTop + 8 - liftL, side ? 5 : 4, 2, "#0a0a12");
    R(ctx, rx, legTop + 8 - liftR, side ? 5 : 4, 2, "#0a0a12");
  } else {
    const legC = cls === "vanguard" ? ramp.skin : ramp.cloth1;
    const legHi = cls === "vanguard" ? ramp.skinHi : ramp.cloth2;
    const lx = cx - 6 + (side ? ll : 0);
    const rx = cx + 2 + (side ? rl : 0);
    R(ctx, rx, legTop - liftR, 4, 8, legC);
    R(ctx, rx, legTop - liftR, 1, 8, legHi);
    R(ctx, rx + 3, legTop - liftR, 1, 8, SH);
    if (side) R(ctx, rx, legTop - liftR, 4, 8, "rgba(0,0,0,0.16)");
    R(ctx, lx, legTop - liftL, 4, 8, legC);
    R(ctx, lx, legTop - liftL, 1, 8, legHi);
    R(ctx, lx + 3, legTop - liftL, 1, 8, SH);
    const bootC = cls === "vanguard" ? ramp.cloth1 : ramp.trim;
    const bootHi = cls === "vanguard" ? ramp.cloth2 : ramp.trimHi;
    R(ctx, rx, legTop + 7 - liftR, 5, 3, bootC);
    R(ctx, rx, legTop + 7 - liftR, 5, 1, bootHi);
    R(ctx, lx - (side ? 0 : 1), legTop + 7 - liftL, 5, 3, bootC);
    R(ctx, lx - (side ? 0 : 1), legTop + 7 - liftL, 5, 1, bootHi);
  }
  if (cls === "vanguard") {
    R(ctx, tx, tTop, tw, 14, ramp.skin);
    R(ctx, tx, tTop, tw, 2, ramp.skinHi);
    R(ctx, tx, tTop, 3, 14, ramp.skinHi);
    R(ctx, tx + tw - 3, tTop, 3, 14, SHd);
    R(ctx, cx - 1, tTop + 2, 1, 8, SHd);
    R(ctx, tx + 2, tTop + 4, 4, 1, SHd);
    R(ctx, cx + 1, tTop + 4, 4, 1, SHd);
    R(ctx, tx + 3, tTop + 8, 8, 1, "rgba(0,0,0,0.2)");
    R(ctx, tx + 3, tTop + 10, 8, 1, "rgba(0,0,0,0.2)");
    for (let i = 0; i < tw; i++) R(ctx, tx + i, tTop + 1 + Math.floor(i / 2), 1, 2, ramp.trim);
    R(ctx, tx, tTop + 11, tw, 3, ramp.cloth1);
    R(ctx, tx, tTop + 11, tw, 1, ramp.cloth2);
    R(ctx, cx - 2, tTop + 11, 4, 3, C.coinMid);
    PX(ctx, cx, tTop + 12, C.coinHi);
  } else if (cls === "thief") {
    R(ctx, tx, tTop, tw, 14, ramp.cloth1);
    R(ctx, tx, tTop, tw, 2, ramp.cloth2);
    R(ctx, tx, tTop, 3, 14, ramp.cloth2);
    R(ctx, tx + tw - 3, tTop, 3, 14, ramp.cloth0);
    R(ctx, tx + 2, tTop + 2, tw - 4, 1, ramp.trim);
    for (let i = 0; i < tw; i++) R(ctx, tx + i, tTop + 3 + Math.floor(i / 2), 1, 2, ramp.cloth0);
    R(ctx, tx, tTop + 10, tw, 2, ramp.trim);
    R(ctx, cx - 1, tTop + 10, 2, 2, C.coinMid);
  } else {
    R(ctx, tx, tTop, tw, 14, ramp.cloth1);
    R(ctx, tx, tTop, tw, 2, ramp.cloth2);
    R(ctx, tx, tTop, 3, 14, ramp.cloth2);
    R(ctx, tx + tw - 3, tTop, 3, 14, ramp.cloth0);
    if (cls === "warden") {
      R(ctx, tx + 2, tTop + 2, tw - 4, 11, ramp.cloth2);
      R(ctx, cx - 1, tTop + 3, 2, 7, ramp.trim);
      R(ctx, cx - 3, tTop + 5, 6, 2, ramp.trim);
      PX(ctx, cx, tTop + 5, ramp.trimHi);
    } else {
      R(ctx, tx, tTop + 10, tw, 2, ramp.trim);
      PX(ctx, cx, tTop + 6, C.magicCore);
      PX(ctx, cx - 3, tTop + 7, ramp.trim);
      PX(ctx, cx + 3, tTop + 7, ramp.trim);
    }
  }
  PX(ctx, tx, tTop, ramp.cloth0);
  PX(ctx, tx + 1, tTop, ramp.cloth0);
  PX(ctx, tx + tw - 2, tTop, ramp.cloth0);
  PX(ctx, tx + tw - 1, tTop, ramp.cloth0);
  PX(ctx, tx, tTop + 1, ramp.cloth0);
  PX(ctx, tx + tw - 1, tTop + 1, ramp.cloth0);
  PX(ctx, tx, tTop + 13, ramp.cloth0);
  PX(ctx, tx + tw - 1, tTop + 13, ramp.cloth0);
  if (cls === "vanguard") {
    R(ctx, bx - 3, tTop - 1, 4, 5, ramp.cloth1);
    R(ctx, bx - 3, tTop - 1, 4, 1, ramp.cloth2);
    R(ctx, bx + bw - 1, tTop - 1, 4, 5, ramp.cloth1);
    R(ctx, bx + bw - 1, tTop - 1, 4, 1, ramp.cloth2);
  }
  if (robe) {
    const rw = side ? 16 : 18;
    const rx = cx - rw / 2;
    const sL = tTop + 1 + armSwingL;
    const sR = tTop + 1 + armSwingR;
    if (!side) {
      R(ctx, rx - 2, sL, 4, 11, ramp.cloth1);
      R(ctx, rx - 2, sL, 1, 11, ramp.cloth2);
      R(ctx, rx - 2, sL, 4, 1, ramp.cloth2);
      R(ctx, rx - 1, sL + 10, 3, 2, ramp.skin);
    }
    R(ctx, rx + rw - 2, sR, 4, 11, ramp.cloth1);
    R(ctx, rx + rw + 1, sR, 1, 11, ramp.cloth0);
    R(ctx, rx + rw - 2, sR, 4, 1, ramp.cloth2);
    R(ctx, rx + rw - 2, sR + 10, 3, 2, ramp.skin);
  } else {
    const armC = cls === "vanguard" ? ramp.skin : ramp.cloth1;
    const armHi = cls === "vanguard" ? ramp.skinHi : ramp.cloth2;
    const sL = tTop + 1 + armSwingL;
    const sR = tTop + 1 + armSwingR;
    if (!side) {
      R(ctx, bx - 2, sL + 1, 3, 9, armC);
      R(ctx, bx - 2, sL, 2, 1, armC);
      R(ctx, bx - 2, sL + 1, 1, 9, armHi);
      R(ctx, bx - 2, sL + 9, 3, 2, ramp.skin);
      if (cls === "vanguard") R(ctx, bx - 2, sL + 7, 3, 1, ramp.trim);
      else R(ctx, bx - 2, sL + 8, 3, 1, ramp.cloth0);
    }
    R(ctx, bx + bw - 1, sR + 1, 3, 9, armC);
    R(ctx, bx + bw - 1, sR, 2, 1, armC);
    R(ctx, bx + bw + 1, sR + 1, 1, 9, SH);
    R(ctx, bx + bw - 1, sR + 9, 3, 2, ramp.skin);
    if (cls === "vanguard") R(ctx, bx + bw - 1, sR + 7, 3, 1, ramp.trim);
    else R(ctx, bx + bw - 1, sR + 8, 3, 1, ramp.cloth0);
  }
  const hw = 12;
  const hx0 = cx - 6;
  R(ctx, cx - 2, hTop + 8, 4, 4, ramp.skin);
  R(ctx, cx - 2, hTop + 11, 4, 1, SHd);
  R(ctx, hx0 + 1, hTop, hw - 2, 10, ramp.skin);
  R(ctx, hx0, hTop + 1, hw, 8, ramp.skin);
  R(ctx, hx0 + 1, hTop, hw - 2, 1, ramp.skinHi);
  R(ctx, hx0, hTop + 1, 2, 7, ramp.skinHi);
  R(ctx, hx0 + hw - 2, hTop + 2, 2, 7, SH);
  R(ctx, hx0 + 2, hTop + 9, hw - 4, 1, SH);
  if (side) {
    R(ctx, hx0 + hw, hTop + 5, 1, 2, ramp.skin);
    PX(ctx, hx0 + hw, hTop + 6, SH);
  }
  if (cls === "vanguard") {
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 4, ramp.hair);
    R(ctx, hx0 - 1, hTop, 2, 9, ramp.hair);
    R(ctx, hx0 + hw - 1, hTop, 2, 9, ramp.hair);
    R(ctx, hx0, hTop + 2, hw, 2, C.hpLow);
    R(ctx, hx0, hTop + 2, hw, 1, "#ff8a7a");
  } else if (cls === "thief") {
    R(ctx, hx0 - 1, hTop - 3, hw + 2, 3, ramp.hair);
    R(ctx, hx0 - 2, hTop - 1, 2, 7, ramp.hair);
    R(ctx, hx0 + hw, hTop - 1, 2, 7, ramp.hair);
    R(ctx, hx0 - 2, hTop + 6, 1, 3, ramp.hair);
    R(ctx, hx0 + hw + 1, hTop + 6, 1, 3, ramp.hair);
    R(ctx, hx0 - 1, hTop - 3, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 + 1, hTop + 1, hw - 2, 1, ramp.hair);
    R(ctx, hx0 + 1, hTop + 2, hw - 2, 2, ramp.skinHi);
  } else if (cls === "arcanist") {
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 3, ramp.cloth2);
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 + 1, hTop - 5, hw - 2, 5, ramp.cloth2);
    R(ctx, hx0 + 2, hTop - 6, hw - 5, 2, ramp.cloth2);
    R(ctx, hx0 + 1, hTop - 5, 2, 5, ramp.cloth1);
    PX(ctx, hx0 + 3, hTop - 5, C.magicCore);
    R(ctx, hx0, hTop + 2, hw, 1, ramp.trim);
    R(ctx, hx0, hTop + 7, hw, 5, ramp.hair);
    R(ctx, hx0 + 2, hTop + 11, hw - 4, 3, ramp.hair);
    R(ctx, hx0, hTop + 7, hw, 1, "#ffffff");
  } else if (cls === "warden") {
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 5, ramp.cloth2);
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 - 2, hTop, 2, 9, ramp.cloth1);
    R(ctx, hx0 + hw, hTop, 2, 9, ramp.cloth1);
    R(ctx, hx0, hTop - 4, hw, 1, "#fff4c0");
    PX(ctx, hx0 - 1, hTop - 3, "#fff4c0");
    PX(ctx, hx0 + hw, hTop - 3, "#fff4c0");
  } else if (cls === "bard") {
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 3, ramp.hair);
    R(ctx, hx0 - 2, hTop + 1, 2, 6, ramp.hair);
    R(ctx, hx0 + hw, hTop + 1, 2, 6, ramp.hair);
    R(ctx, hx0 - 1, hTop - 3, hw + 2, 3, ramp.cloth1);
    R(ctx, hx0, hTop - 4, hw - 2, 2, ramp.cloth2);
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 1, ramp.trim);
    PX(ctx, hx0 + hw - 2, hTop - 2, ramp.trimHi);
    PX(ctx, hx0 - 1, hTop - 5, "#efe6c8");
    PX(ctx, hx0 - 2, hTop - 6, "#efe6c8");
    PX(ctx, hx0 - 3, hTop - 7, "#ffffff");
    PX(ctx, hx0 - 4, hTop - 7, "rgba(239,230,200,0.7)");
  } else if (cls === "druid") {
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 5, ramp.cloth1);
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 - 2, hTop, 2, 9, ramp.cloth1);
    R(ctx, hx0 + hw, hTop, 2, 9, ramp.cloth1);
    PX(ctx, hx0 - 1, hTop - 4, "#d8cfb4");
    PX(ctx, hx0 - 2, hTop - 5, "#d8cfb4");
    PX(ctx, hx0 - 1, hTop - 6, "#efe9d2");
    PX(ctx, hx0 - 3, hTop - 6, "#d8cfb4");
    PX(ctx, hx0 + hw, hTop - 4, "#d8cfb4");
    PX(ctx, hx0 + hw + 1, hTop - 5, "#d8cfb4");
    PX(ctx, hx0 + hw, hTop - 6, "#efe9d2");
    PX(ctx, hx0 + hw + 2, hTop - 6, "#d8cfb4");
    PX(ctx, cx, hTop - 3, "#7fce58");
    PX(ctx, cx + 1, hTop - 4, "#b6ff8a");
  } else {
    R(ctx, hx0 - 2, hTop - 3, hw + 4, 6, ramp.cloth0);
    R(ctx, hx0 - 2, hTop - 3, hw + 4, 1, ramp.cloth2);
    R(ctx, hx0 - 2, hTop - 2, hw + 4, 1, ramp.cloth1);
    R(ctx, hx0 - 2, hTop, 2, 12, ramp.cloth0);
    R(ctx, hx0 + hw, hTop, 2, 12, ramp.cloth0);
    R(ctx, hx0, hTop + 1, 1, 9, ramp.cloth1);
    R(ctx, hx0 + hw - 1, hTop + 1, 1, 9, ramp.cloth1);
    R(ctx, hx0 + 1, hTop + 2, hw - 2, 8, "#0a0a12");
    if (facing === "side") {
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, "#8affd0");
      PX(ctx, hx0 + hw - 4, hTop + 5, "#dfffe6");
      R(ctx, hx0 + hw - 1, hTop + 6, 2, 2, ramp.skin);
      R(ctx, hx0 + hw - 3, hTop + 9, 3, 1, SH);
    } else if (facing !== "up") {
      R(ctx, hx0 + 2, hTop + 5, 2, 2, "#8affd0");
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, "#8affd0");
      PX(ctx, hx0 + 2, hTop + 5, "#dfffe6");
      PX(ctx, hx0 + hw - 4, hTop + 5, "#dfffe6");
    }
  }
  if (cls !== "arcanist" && cls !== "necromancer") {
    const eye = cls === "thief" ? "#c08aff" : cls === "druid" ? "#7a5a22" : cls === "bard" ? "#2a6b46" : "#2a3b6a";
    if (facing === "down") {
      R(ctx, hx0 + 2, hTop + 5, 2, 2, "#ffffff");
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, "#ffffff");
      PX(ctx, hx0 + 3, hTop + 6, eye);
      PX(ctx, hx0 + hw - 3, hTop + 6, eye);
      R(ctx, hx0 + 2, hTop + 4, 2, 1, ramp.hair);
      R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, ramp.hair);
      PX(ctx, cx, hTop + 7, SHd);
      R(ctx, hx0 + 4, hTop + 8, 2, 1, SHd);
    } else if (facing === "side") {
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, "#ffffff");
      PX(ctx, hx0 + hw - 3, hTop + 6, eye);
      R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, ramp.hair);
      R(ctx, hx0 + hw - 1, hTop + 6, 2, 2, ramp.skinHi);
      R(ctx, hx0 + hw - 3, hTop + 9, 3, 1, SH);
    } else {
      R(ctx, hx0 + 1, hTop + 4, hw - 2, 6, cls === "warden" || cls === "druid" ? ramp.cloth1 : ramp.hair);
    }
  } else if (cls === "arcanist" && facing !== "up") {
    PX(ctx, hx0 + 3, hTop + 5, "#cfe0ff");
    PX(ctx, hx0 + hw - 4, hTop + 5, "#cfe0ff");
    R(ctx, hx0 + 2, hTop + 4, 2, 1, "#e8e8ee");
    R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, "#e8e8ee");
  }
  drawHeroFlair(ctx, ox, cls, ramp, facing, pose);
  if (facing !== "up") drawWeapon(ctx, ox, cls, ramp, facing, pose);
}
function drawGrunt(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  const D = "rgba(0,0,0,0.24)";
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 20, 2, r.body2);
  R(ctx, cx - 10, 16 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 16 + bob, 4, 18, D);
  R(ctx, cx - 4, 22 + bob, 8, 8, r.accent);
  R(ctx, cx - 4, 22 + bob, 8, 1, r.detail);
  R(ctx, cx - 10, 10 + bob, 5, 6, r.detail);
  R(ctx, cx + 6, 10 + bob, 5, 6, r.detail);
  PX(ctx, cx - 10, 8 + bob, r.body0);
  PX(ctx, cx + 9, 8 + bob, r.body0);
  R(ctx, cx - 6, 12 + bob, 12, 8, r.body1);
  R(ctx, cx - 6, 12 + bob, 12, 1, r.body2);
  R(ctx, cx - 4, 14 + bob, 4, 4, r.eye);
  R(ctx, cx + 1, 14 + bob, 4, 4, r.eye);
  PX(ctx, cx - 3, 15 + bob, "#ffffff");
  PX(ctx, cx + 2, 15 + bob, "#ffffff");
  if (frame === 3) {
    R(ctx, cx - 4, 19 + bob, 8, 2, "#1a0a0a");
    for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 20 + bob, "#ffffff");
  }
  R(ctx, cx - 8, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 6, r.body0);
  R(ctx, cx - 12 - lunge, 20 + bob, 4, 9, r.body1);
  R(ctx, cx + 8 + lunge, 20 + bob, 4, 9, r.body1);
  R(ctx, cx - 12 - lunge, 28 + bob, 4, 2, r.accent);
  R(ctx, cx + 8 + lunge, 28 + bob, 4, 2, r.accent);
}
function drawGhost(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = [0, -2, -4, -2][frame % 4];
  ctx.globalAlpha = 0.92;
  R(ctx, cx - 10, 12 + bob, 20, 18, r.body1);
  R(ctx, cx - 8, 8 + bob, 16, 6, r.body1);
  R(ctx, cx - 6, 6 + bob, 12, 4, r.body2);
  R(ctx, cx - 10, 12 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 12 + bob, 4, 18, "rgba(0,0,0,0.2)");
  R(ctx, cx - 5, 12 + bob, 10, 8, "rgba(0,0,0,0.45)");
  R(ctx, cx - 5, 14 + bob, 4, 3, r.detail);
  R(ctx, cx + 1, 14 + bob, 4, 3, r.detail);
  R(ctx, cx - 4, 14 + bob, 2, 2, r.eye);
  R(ctx, cx + 2, 14 + bob, 2, 2, r.eye);
  PX(ctx, cx - 5, 9 + bob, r.accent);
  const phase = frame % 4;
  for (let i = 0; i < 6; i++) {
    const wob = (i + phase) % 2 * 4;
    R(ctx, cx - 10 + i * 4, 30 + bob - wob, 4, 6 + wob, r.body1);
  }
  ctx.globalAlpha = 1;
}
function drawDemon(ctx, ox, frame, r) {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const wing = frame === 3 ? 4 : frame === 1 ? 2 : 0;
  const D = "rgba(0,0,0,0.24)";
  for (const s of [-1, 1]) {
    const wx = cx + s * (10 + wing);
    R(ctx, wx - (s < 0 ? 6 : 0), 12 + bob, 6, 12, r.body0);
    R(ctx, wx - (s < 0 ? 6 : -4), 11 + bob, 2, 14, r.detail);
  }
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 16 + bob, 4, 18, D);
  R(ctx, cx - 4, 22 + bob, 8, 8, r.accent);
  R(ctx, cx - 1, 25 + bob, 3, 3, C.fireCore);
  R(ctx, cx - 10, 8 + bob, 4, 7, r.detail);
  R(ctx, cx + 6, 8 + bob, 4, 7, r.detail);
  PX(ctx, cx - 11, 6 + bob, r.detail);
  PX(ctx, cx + 10, 6 + bob, r.detail);
  R(ctx, cx - 6, 11 + bob, 12, 8, r.body2);
  R(ctx, cx - 6, 11 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 14 + bob, 4, 3, r.eye);
  R(ctx, cx + 1, 14 + bob, 4, 3, r.eye);
  PX(ctx, cx - 3, 15 + bob, "#fff");
  PX(ctx, cx + 2, 15 + bob, "#fff");
  R(ctx, cx - 8, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 8, 30 + bob, 6, 2, r.body0);
  R(ctx, cx + 13, 28 + bob, 2, 3, r.accent);
  if (frame === 3) {
    R(ctx, cx - 4, 19 + bob, 8, 2, "#1a0000");
    for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 20 + bob, "#fff");
  }
}
function drawBoss(ctx, ox, frame, r) {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -4, 0][frame % 4];
  const cast = frame === 3;
  const D = "rgba(0,0,0,0.3)";
  R(ctx, cx - 24, 24 + bob, 48, 44, r.body0);
  R(ctx, cx - 24, 24 + bob, 4, 44, r.body1);
  R(ctx, cx + 20, 24 + bob, 4, 44, D);
  for (let i = 0; i < 7; i++) {
    const h = i % 2 * 6;
    R(ctx, cx - 24 + i * 7, 64 + bob - h, 6, 8 + h, r.body0);
  }
  R(ctx, cx - 14, 28 + bob, 28, 28, r.body1);
  R(ctx, cx - 14, 28 + bob, 28, 2, r.body2);
  for (let i = 0; i < 4; i++) R(ctx, cx - 12, 34 + bob + i * 4, 24, 2, r.detail);
  R(ctx, cx - 6, 36 + bob, 12, 12, r.accent);
  R(ctx, cx - 3, 40 + bob, 6, 4, C.portalCore);
  R(ctx, cx - 22, 26 + bob, 10, 8, r.body0);
  R(ctx, cx + 12, 26 + bob, 10, 8, r.body0);
  R(ctx, cx - 22, 22 + bob, 4, 6, r.detail);
  R(ctx, cx + 18, 22 + bob, 4, 6, r.detail);
  R(ctx, cx - 10, 8 + bob, 20, 18, "#d8dce8");
  R(ctx, cx - 10, 8 + bob, 20, 2, "#ffffff");
  R(ctx, cx - 8, 14 + bob, 6, 6, r.detail);
  R(ctx, cx + 2, 14 + bob, 6, 6, r.detail);
  R(ctx, cx - 8, 14 + bob, 6, 4, r.eye);
  R(ctx, cx + 2, 14 + bob, 6, 4, r.eye);
  R(ctx, cx - 6, 22 + bob, 12, 3, "#9aa0b4");
  for (let i = 0; i < 6; i++) PX(ctx, cx - 5 + i * 2, 23 + bob, r.detail);
  R(ctx, cx - 10, 4 + bob, 20, 4, C.coinMid);
  R(ctx, cx - 10, 2 + bob, 2, 4, C.coinHi);
  R(ctx, cx - 2, 0 + bob, 4, 4, C.coinHi);
  R(ctx, cx + 8, 2 + bob, 2, 4, C.coinHi);
  PX(ctx, cx, 2 + bob, C.gem);
  const ay = cast ? 10 : 18;
  R(ctx, cx + 18, ay + bob, 4, 28, r.body1);
  R(ctx, cx + 14, ay - 4 + bob, 12, 4, "#aeb6cc");
  R(ctx, cx + 24, ay - 8 + bob, 4, 8, "#dfe6ff");
  if (cast) {
    R(ctx, cx - 28, 32 + bob, 8, 8, r.accent);
    R(ctx, cx - 26, 34 + bob, 4, 4, C.portalCore);
  }
}

// src/rendering/townArt.ts
var townArt_exports = {};
__export(townArt_exports, {
  drawAnvil: () => drawAnvil,
  drawBarrel: () => drawBarrel,
  drawBird: () => drawBird,
  drawBridgePlank: () => drawBridgePlank,
  drawButterfly: () => drawButterfly,
  drawCart: () => drawCart,
  drawCauldron: () => drawCauldron,
  drawChain: () => drawChain,
  drawCrate: () => drawCrate,
  drawDog: () => drawDog,
  drawFenceH: () => drawFenceH,
  drawFenceV: () => drawFenceV,
  drawFlowerBed: () => drawFlowerBed,
  drawFountain: () => drawFountain,
  drawFountainBase: () => drawFountainBase,
  drawGrassTuft: () => drawGrassTuft,
  drawGuildWall: () => drawGuildWall,
  drawHayBale: () => drawHayBale,
  drawHearth: () => drawHearth,
  drawHedge: () => drawHedge,
  drawHouseBase: () => drawHouseBase,
  drawHouseBeam: () => drawHouseBeam,
  drawHouseDoor: () => drawHouseDoor,
  drawHouseEaveBlue: () => drawHouseEaveBlue,
  drawHouseEaveGreen: () => drawHouseEaveGreen,
  drawHouseEaveRed: () => drawHouseEaveRed,
  drawHouseEaveTeak: () => drawHouseEaveTeak,
  drawHousePost: () => drawHousePost,
  drawHouseRoofBlue: () => drawHouseRoofBlue,
  drawHouseRoofGreen: () => drawHouseRoofGreen,
  drawHouseRoofRed: () => drawHouseRoofRed,
  drawHouseRoofTeak: () => drawHouseRoofTeak,
  drawHouseWall: () => drawHouseWall,
  drawHouseWindow: () => drawHouseWindow,
  drawLampPost: () => drawLampPost,
  drawQuestBoard: () => drawQuestBoard,
  drawRipple: () => drawRipple,
  drawRoad: () => drawRoad,
  drawRug: () => drawRug,
  drawShelf: () => drawShelf,
  drawStallBlue: () => drawStallBlue,
  drawStallRed: () => drawStallRed,
  drawStatue: () => drawStatue,
  drawTavernBar: () => drawTavernBar,
  drawTavernStool: () => drawTavernStool,
  drawTavernTable: () => drawTavernTable,
  drawTavernWall: () => drawTavernWall,
  drawTownBush: () => drawTownBush,
  drawTownGate: () => drawTownGate,
  drawTownTree: () => drawTownTree,
  drawTownsfolk: () => drawTownsfolk,
  drawTrainingDummy: () => drawTrainingDummy,
  drawWell: () => drawWell,
  drawWoodFloor: () => drawWoodFloor
});
function R2(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function PX2(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
function drawGrassTuft(ctx, ox, oy) {
  const g0 = "#3f6a2e", g1 = "#5a9a3e", g2 = "#7fc45a";
  for (const [x, h] of [[8, 8], [13, 12], [18, 10], [23, 8], [27, 6]]) {
    R2(ctx, ox + x, oy + 26 - h, 2, h, g0);
    R2(ctx, ox + x, oy + 26 - h, 1, h, g1);
    PX2(ctx, ox + x, oy + 26 - h, g2);
  }
  R2(ctx, ox + 12, oy + 24, 12, 2, g1);
}
function drawRoad(ctx, ox, oy, seed = 0) {
  R2(ctx, ox, oy, 32, 32, "#6a5a42");
  const stones = ["#7a6a4e", "#5c4c38", "#857258", "#6f5e46"];
  let s = seed * 2654435761;
  const rnd = () => {
    s = s * 1103515245 + 12345 & 2147483647;
    return s / 2147483647;
  };
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      R2(ctx, ox + gx * 4, oy + gy * 4, 4, 4, stones[Math.floor(rnd() * stones.length)]);
      R2(ctx, ox + gx * 4, oy + gy * 4, 4, 1, "#4a3c2c");
      R2(ctx, ox + gx * 4, oy + gy * 4, 1, 4, "#4a3c2c");
    }
  }
}
function drawTownTree(ctx, ox, oy) {
  R2(ctx, ox + 14, oy + 18, 4, 12, "#4a3320");
  R2(ctx, ox + 14, oy + 18, 2, 12, "#5e442a");
  R2(ctx, ox + 6, oy + 6, 20, 12, "#2f5a26");
  R2(ctx, ox + 8, oy + 4, 16, 14, "#3f7a34");
  R2(ctx, ox + 10, oy + 4, 12, 6, "#5aa044");
  R2(ctx, ox + 8, oy + 4, 4, 12, "#4a8a3a");
  R2(ctx, ox + 20, oy + 6, 4, 10, "#2a4a1e");
  PX2(ctx, ox + 12, oy + 6, "#7fc45a");
  PX2(ctx, ox + 18, oy + 8, "#7fc45a");
  PX2(ctx, ox + 11, oy + 13, "#2a4a1e");
  PX2(ctx, ox + 22, oy + 12, "#2a4a1e");
}
function drawTownBush(ctx, ox, oy) {
  R2(ctx, ox + 6, oy + 16, 20, 10, "#2f5a26");
  R2(ctx, ox + 8, oy + 14, 16, 10, "#3f7a34");
  R2(ctx, ox + 10, oy + 14, 10, 4, "#5aa044");
  R2(ctx, ox + 8, oy + 14, 3, 10, "#4a8a3a");
  PX2(ctx, ox + 12, oy + 16, "#7fc45a");
  PX2(ctx, ox + 20, oy + 18, "#7fc45a");
  R2(ctx, ox + 16, oy + 20, 2, 2, "#d2452f");
  R2(ctx, ox + 10, oy + 22, 2, 2, "#d2452f");
}
function drawBridgePlank(ctx, ox, oy) {
  R2(ctx, ox, oy, 32, 32, "#6e4a24");
  for (let i = 0; i < 8; i++) {
    R2(ctx, ox, oy + i * 4, 32, 1, "#3a2410");
    R2(ctx, ox + 1, oy + i * 4 + 1, 30, 1, "#82592c");
  }
  R2(ctx, ox, oy, 2, 32, "#4a3018");
  R2(ctx, ox + 30, oy, 2, 32, "#4a3018");
}
function drawChain(ctx, ox, oy) {
  const steel = "#9aa0b4", dark = "#5a6072", hi = "#dfe6ff";
  for (let i = 0; i < 3; i++) {
    const x = ox + 4 + i * 10;
    ctx.strokeStyle = steel;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, oy + 12, 6, 8);
    R2(ctx, x + 1, oy + 12, 4, 2, hi);
    R2(ctx, x + 2, oy + 18, 2, 2, dark);
    R2(ctx, x + 6, oy + 14, 4, 2, steel);
  }
}
function drawTownGate(ctx, ox, oy) {
  R2(ctx, ox + 2, oy + 4, 6, 24, "#6e5a40");
  R2(ctx, ox + 24, oy + 4, 6, 24, "#6e5a40");
  R2(ctx, ox + 2, oy + 4, 6, 2, "#9c8050");
  R2(ctx, ox + 24, oy + 4, 6, 2, "#9c8050");
  R2(ctx, ox + 2, oy + 2, 28, 4, "#5a3a1c");
  R2(ctx, ox + 2, oy + 2, 28, 1, "#7a5128");
  R2(ctx, ox + 12, oy + 8, 8, 6, "#3a2410");
  R2(ctx, ox + 13, oy + 9, 6, 1, "#e0bd84");
  PX2(ctx, ox + 15, oy + 11, "#e0bd84");
}
function pitchedRoof(ctx, ox, oy, base, hi, dk, part) {
  const grad = ctx.createLinearGradient(0, oy, 0, oy + 32);
  grad.addColorStop(0, part === "ridge" ? hi : base);
  grad.addColorStop(part === "ridge" ? 0.3 : 0.6, base);
  grad.addColorStop(1, dk);
  ctx.fillStyle = grad;
  ctx.fillRect(ox, oy, 32, 32);
  if (part === "ridge") {
    R2(ctx, ox, oy, 32, 3, hi);
    R2(ctx, ox, oy + 3, 32, 1, dk);
  }
  for (let ry = part === "ridge" ? 7 : 2; ry < 32; ry += 5) {
    R2(ctx, ox, oy + ry, 32, 1, dk);
    R2(ctx, ox, oy + ry + 1, 32, 1, hi);
    const off = ((oy + ry) / 5 | 0) % 2 ? 4 : 0;
    for (let sx = off; sx < 32; sx += 8) R2(ctx, ox + sx, oy + ry, 1, 4, dk);
  }
  R2(ctx, ox, oy, 2, 32, hi);
  R2(ctx, ox + 30, oy, 2, 32, dk);
  if (part === "eave") {
    R2(ctx, ox, oy + 26, 32, 3, dk);
    R2(ctx, ox, oy + 26, 32, 1, hi);
    R2(ctx, ox, oy + 29, 32, 3, "rgba(18,11,6,0.5)");
  }
}
function drawHouseRoofRed(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#9c3a2a", "#c85a3e", "#5a1e14", "ridge");
}
function drawHouseRoofBlue(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#34507a", "#4f72a8", "#1e2f4a", "ridge");
}
function drawHouseRoofGreen(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#3a6a3a", "#56965a", "#1e3a1e", "ridge");
}
function drawHouseRoofTeak(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#6e4a24", "#8a6132", "#3a2410", "ridge");
}
function drawHouseEaveRed(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#9c3a2a", "#c85a3e", "#5a1e14", "eave");
}
function drawHouseEaveBlue(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#34507a", "#4f72a8", "#1e2f4a", "eave");
}
function drawHouseEaveGreen(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#3a6a3a", "#56965a", "#1e3a1e", "eave");
}
function drawHouseEaveTeak(ctx, ox, oy) {
  pitchedRoof(ctx, ox, oy, "#6e4a24", "#8a6132", "#3a2410", "eave");
}
function drawHouseDoor(ctx, ox, oy) {
  drawHouseWall(ctx, ox, oy);
  R2(ctx, ox + 8, oy + 4, 16, 26, "#8a8276");
  R2(ctx, ox + 8, oy + 4, 16, 2, "#a8a092");
  R2(ctx, ox + 8, oy + 4, 2, 26, "#9a9286");
  R2(ctx, ox + 22, oy + 4, 2, 26, "#5f584e");
  R2(ctx, ox + 10, oy + 7, 12, 23, "#241a0e");
  R2(ctx, ox + 11, oy + 8, 10, 22, "#5a3a1c");
  R2(ctx, ox + 11, oy + 8, 3, 22, "#6e4a24");
  for (const px of [13, 16, 19]) R2(ctx, ox + px, oy + 8, 1, 22, "#3a2410");
  R2(ctx, ox + 11, oy + 8, 10, 1, "#7a5128");
  R2(ctx, ox + 11, oy + 12, 10, 2, "#3a3f4a");
  R2(ctx, ox + 11, oy + 23, 10, 2, "#3a3f4a");
  R2(ctx, ox + 11, oy + 12, 10, 1, "#5a626e");
  ctx.strokeStyle = "#cfa64e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 18, oy + 20, 2, 0, Math.PI * 2);
  ctx.stroke();
}
function drawHouseWall(ctx, ox, oy) {
  R2(ctx, ox, oy, 32, 32, "#cdbb95");
  for (const [x, y, c] of [
    [6, 5, "#c2af86"],
    [14, 11, "#d8c79e"],
    [23, 7, "#c2af86"],
    [10, 20, "#d8c79e"],
    [19, 25, "#c2af86"],
    [27, 17, "#d8c79e"],
    [4, 28, "#c2af86"],
    [29, 3, "#c2af86"]
  ]) PX2(ctx, ox + x, oy + y, c);
}
function drawHousePost(ctx, ox, oy) {
  drawHouseWall(ctx, ox, oy);
  R2(ctx, ox + 12, oy, 9, 32, "#6e4a24");
  R2(ctx, ox + 12, oy, 2, 32, "#8a6132");
  R2(ctx, ox + 19, oy, 2, 32, "#42301a");
  PX2(ctx, ox + 16, oy + 7, "#3a2410");
  PX2(ctx, ox + 16, oy + 24, "#3a2410");
}
function drawHouseBeam(ctx, ox, oy) {
  drawHouseWall(ctx, ox, oy);
  R2(ctx, ox, oy, 32, 1, "rgba(18,11,6,0.5)");
  R2(ctx, ox, oy + 1, 32, 6, "#6e4a24");
  R2(ctx, ox, oy + 1, 32, 1, "#8a6132");
  R2(ctx, ox, oy + 6, 32, 1, "#42301a");
}
function drawHouseBase(ctx, ox, oy) {
  drawHouseWall(ctx, ox, oy);
  R2(ctx, ox, oy + 18, 32, 14, "#8a8276");
  R2(ctx, ox, oy + 18, 32, 1, "#a8a092");
  for (let i = 0; i < 32; i += 8) R2(ctx, ox + i, oy + 18, 1, 14, "#5f584e");
  R2(ctx, ox, oy + 25, 32, 1, "#5f584e");
  R2(ctx, ox + 4, oy + 21, 5, 3, "#7a7268");
  R2(ctx, ox + 20, oy + 27, 6, 3, "#7a7268");
}
function drawHouseWindow(ctx, ox, oy) {
  drawHouseWall(ctx, ox, oy);
  const fr = "#3a2712", wood = "#6e4a24", glassHi = "#6a90b8";
  R2(ctx, ox + 3, oy + 6, 3, 16, wood);
  R2(ctx, ox + 26, oy + 6, 3, 16, wood);
  R2(ctx, ox + 3, oy + 6, 1, 16, "#8a6132");
  R2(ctx, ox + 26, oy + 6, 1, 16, "#8a6132");
  R2(ctx, ox + 6, oy + 5, 20, 17, fr);
  const g = ctx.createLinearGradient(0, oy + 7, 0, oy + 20);
  g.addColorStop(0, "#3a5a7a");
  g.addColorStop(1, "#ffd98a");
  ctx.fillStyle = g;
  ctx.fillRect(ox + 8, oy + 7, 16, 13);
  R2(ctx, ox + 8, oy + 7, 7, 5, glassHi);
  R2(ctx, ox + 15, oy + 7, 2, 13, fr);
  R2(ctx, ox + 8, oy + 12, 16, 2, fr);
  R2(ctx, ox + 4, oy + 21, 24, 2, "#8a6132");
  R2(ctx, ox + 4, oy + 21, 24, 1, "#a8843e");
  R2(ctx, ox + 5, oy + 23, 22, 3, "#5a3a1c");
  R2(ctx, ox + 7, oy + 22, 3, 2, "#c8506a");
  R2(ctx, ox + 13, oy + 22, 3, 2, "#e0b24e");
  R2(ctx, ox + 19, oy + 22, 3, 2, "#6aa0e0");
  PX2(ctx, ox + 10, oy + 9, "#eaf4ff");
}
function drawWoodFloor(ctx, ox, oy) {
  const tones = ["#6e4a28", "#754f2b", "#67451f", "#714c29"];
  for (let i = 0; i < 32; i += 8) {
    R2(ctx, ox, oy + i, 32, 8, tones[i / 8 % tones.length]);
    R2(ctx, ox, oy + i, 32, 1, "#422c15");
    R2(ctx, ox, oy + i + 1, 32, 1, "#875c30");
  }
  R2(ctx, ox + 15, oy, 1, 16, "#3a2410");
  R2(ctx, ox + 7, oy + 16, 1, 16, "#3a2410");
  R2(ctx, ox + 23, oy + 16, 1, 16, "#3a2410");
  for (const [x, y] of [[5, 3], [21, 5], [12, 11], [27, 13], [3, 19], [18, 22], [9, 27], [25, 29]]) {
    PX2(ctx, ox + x, oy + y, "#5a3c20");
  }
  PX2(ctx, ox + 13, oy + 4, "#8a6034");
  PX2(ctx, ox + 29, oy + 20, "#8a6034");
}
function drawTavernWall(ctx, ox, oy) {
  R2(ctx, ox, oy, 32, 32, "#4a3826");
  R2(ctx, ox, oy, 32, 15, "#c2a074");
  R2(ctx, ox, oy, 32, 2, "#d8c0a0");
  R2(ctx, ox, oy, 32, 1, "rgba(255,255,255,0.16)");
  PX2(ctx, ox + 6, oy + 5, "#b28f62");
  PX2(ctx, ox + 20, oy + 9, "#d0b48a");
  PX2(ctx, ox + 27, oy + 4, "#b28f62");
  R2(ctx, ox, oy + 13, 32, 2, "#3a2a18");
  R2(ctx, ox, oy + 13, 32, 1, "#6e4a24");
  for (let i = 0; i < 32; i += 8) {
    R2(ctx, ox + i, oy + 15, 1, 17, "#2e2013");
    R2(ctx, ox + i + 1, oy + 15, 1, 17, "#5a4632");
  }
  R2(ctx, ox, oy + 30, 32, 2, "#241a10");
}
function drawTavernBar(ctx, ox, oy) {
  R2(ctx, ox, oy + 5, 32, 19, "#5a3a1c");
  R2(ctx, ox, oy + 4, 32, 4, "#8a6132");
  R2(ctx, ox, oy + 4, 32, 1, "#b08a52");
  R2(ctx, ox, oy + 8, 32, 1, "#2e1d0e");
  for (let x = 0; x < 32; x += 8) R2(ctx, ox + x, oy + 10, 1, 14, "#3a2410");
  R2(ctx, ox, oy + 24, 32, 3, "#2e1d0e");
  R2(ctx, ox + 5, oy + 1, 3, 4, "#caa56a");
  R2(ctx, ox + 21, oy + 1, 3, 4, "#caa56a");
}
function drawTavernTable(ctx, ox, oy) {
  ctx.fillStyle = "#3a2410";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 18, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6e4a24";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 16, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a6132";
  ctx.beginPath();
  ctx.ellipse(ox + 14, oy + 14, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  R2(ctx, ox + 11, oy + 13, 3, 3, "#caa56a");
  ctx.fillStyle = "#cdbfa0";
  ctx.beginPath();
  ctx.ellipse(ox + 19, oy + 17, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawTavernStool(ctx, ox, oy) {
  ctx.fillStyle = "#3a2410";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 17, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6e4a24";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 15, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  R2(ctx, ox + 12, oy + 17, 1, 6, "#3a2410");
  R2(ctx, ox + 19, oy + 17, 1, 6, "#3a2410");
}
function drawHearth(ctx, ox, oy) {
  R2(ctx, ox + 1, oy + 3, 30, 27, "#7a7268");
  R2(ctx, ox + 1, oy + 3, 30, 2, "#9a9286");
  R2(ctx, ox, oy + 1, 32, 4, "#5f584e");
  R2(ctx, ox + 7, oy + 12, 18, 18, "#150f0a");
  R2(ctx, ox + 10, oy + 20, 12, 10, "#d2541c");
  R2(ctx, ox + 13, oy + 22, 6, 8, "#ffb02a");
  PX2(ctx, ox + 16, oy + 18, "#fff2b0");
  for (let i = 4; i < 30; i += 8) R2(ctx, ox + i, oy + 5, 1, 7, "#5f584e");
}
function drawBarrel(ctx, ox, oy) {
  R2(ctx, ox + 9, oy + 4, 14, 24, "#6e4a24");
  R2(ctx, ox + 8, oy + 8, 16, 16, "#6e4a24");
  R2(ctx, ox + 11, oy + 4, 3, 24, "#8a6132");
  R2(ctx, ox + 8, oy + 9, 16, 2, "#2e1d0e");
  R2(ctx, ox + 8, oy + 16, 16, 2, "#2e1d0e");
  R2(ctx, ox + 8, oy + 23, 16, 2, "#2e1d0e");
  ctx.fillStyle = "#5a3a1c";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 5, 7, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawRug(ctx, ox, oy) {
  R2(ctx, ox + 1, oy + 6, 30, 20, "#7a2326");
  R2(ctx, ox + 1, oy + 6, 30, 2, "#cfa64e");
  R2(ctx, ox + 1, oy + 24, 30, 2, "#cfa64e");
  R2(ctx, ox + 4, oy + 9, 24, 14, "#9a343a");
  ctx.fillStyle = "#cfa64e";
  ctx.beginPath();
  ctx.moveTo(ox + 16, oy + 10);
  ctx.lineTo(ox + 24, oy + 16);
  ctx.lineTo(ox + 16, oy + 22);
  ctx.lineTo(ox + 8, oy + 16);
  ctx.closePath();
  ctx.fill();
  R2(ctx, ox + 14, oy + 14, 4, 4, "#7a2326");
}
function drawShelf(ctx, ox, oy) {
  R2(ctx, ox + 1, oy + 6, 30, 3, "#5a3a1c");
  R2(ctx, ox + 1, oy + 18, 30, 3, "#5a3a1c");
  const bot = ["#3a6a3a", "#7a2326", "#34507a", "#caa882", "#5a3a7a"];
  for (let i = 0; i < 5; i++) {
    R2(ctx, ox + 3 + i * 6, oy + 2, 3, 4, bot[i]);
    R2(ctx, ox + 3 + i * 6, oy + 13, 3, 5, bot[(i + 2) % 5]);
  }
}
function drawGuildWall(ctx, ox, oy) {
  R2(ctx, ox, oy, 32, 32, "#63656f");
  for (let ry = 0; ry < 32; ry += 8) {
    const off = ry / 8 % 2 ? 8 : 0;
    for (let sx = -off; sx < 32; sx += 16) {
      R2(ctx, ox + sx, oy + ry, 16, 8, "#6a6c78");
      R2(ctx, ox + sx, oy + ry, 16, 1, "#888a96");
      R2(ctx, ox + sx, oy + ry, 1, 8, "#7a7c88");
      R2(ctx, ox + sx, oy + ry + 7, 16, 1, "#45474f");
      R2(ctx, ox + sx + 15, oy + ry, 1, 8, "#45474f");
    }
  }
  for (let ry = 0; ry <= 32; ry += 8) R2(ctx, ox, oy + ry, 32, 1, "#3f414b");
  R2(ctx, ox, oy + 14, 32, 2, "#5a3a1c");
  R2(ctx, ox, oy + 14, 32, 1, "#6e4a24");
  PX2(ctx, ox + 7, oy + 5, "#9a9ca8");
  PX2(ctx, ox + 22, oy + 19, "#9a9ca8");
}
function drawTrainingDummy(ctx, ox, oy) {
  R2(ctx, ox + 15, oy + 18, 3, 12, "#5a3a1c");
  R2(ctx, ox + 13, oy + 28, 7, 2, "#3a2410");
  R2(ctx, ox + 8, oy + 11, 16, 2, "#5a3a1c");
  R2(ctx, ox + 11, oy + 8, 10, 11, "#b8923a");
  R2(ctx, ox + 11, oy + 8, 10, 1, "#d2ac52");
  R2(ctx, ox + 11, oy + 12, 10, 1, "#6e4a24");
  R2(ctx, ox + 11, oy + 15, 10, 1, "#6e4a24");
  ctx.fillStyle = "#caa84a";
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 5, 4, 0, Math.PI * 2);
  ctx.fill();
  PX2(ctx, ox + 14, oy + 14, "#3a2410");
}
function drawAnvil(ctx, ox, oy) {
  R2(ctx, ox + 10, oy + 22, 12, 8, "#3a2410");
  R2(ctx, ox + 10, oy + 22, 12, 1, "#5a3a1c");
  R2(ctx, ox + 9, oy + 16, 14, 5, "#3a3f4a");
  R2(ctx, ox + 7, oy + 13, 20, 4, "#4a515e");
  R2(ctx, ox + 7, oy + 13, 20, 1, "#6a727e");
  R2(ctx, ox + 4, oy + 13, 5, 2, "#4a515e");
  R2(ctx, ox + 12, oy + 21, 8, 1, "#2a2e36");
}
function drawCrate(ctx, ox, oy) {
  R2(ctx, ox + 2, oy + 4, 28, 26, "#6e4a24");
  R2(ctx, ox + 2, oy + 4, 28, 2, "#8a6132");
  R2(ctx, ox + 2, oy + 4, 3, 26, "#5a3a1c");
  R2(ctx, ox + 27, oy + 4, 3, 26, "#42301a");
  R2(ctx, ox + 2, oy + 27, 28, 3, "#42301a");
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 4, oy + 6);
  ctx.lineTo(ox + 28, oy + 28);
  ctx.moveTo(ox + 28, oy + 6);
  ctx.lineTo(ox + 4, oy + 28);
  ctx.stroke();
  PX2(ctx, ox + 6, oy + 8, "#8a6132");
  PX2(ctx, ox + 24, oy + 22, "#5a3a1c");
}
function drawCauldron(ctx, ox, oy) {
  R2(ctx, ox + 9, oy + 26, 3, 5, "#26262c");
  R2(ctx, ox + 20, oy + 26, 3, 5, "#26262c");
  ctx.fillStyle = "#1c1c22";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 18, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2e2e36";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 12, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a7a3a";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 12, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7fd06a";
  ctx.beginPath();
  ctx.ellipse(ox + 14, oy + 11, 4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  PX2(ctx, ox + 12, oy + 11, "#caffb0");
  PX2(ctx, ox + 19, oy + 12, "#caffb0");
  R2(ctx, ox + 4, oy + 16, 4, 2, "#3a3a42");
  R2(ctx, ox + 24, oy + 16, 4, 2, "#3a3a42");
}
function drawButterfly(ctx) {
  R2(ctx, 8, 6, 1, 5, "#2a2018");
  R2(ctx, 4, 5, 4, 3, "#ff9a3a");
  R2(ctx, 9, 5, 4, 3, "#ff9a3a");
  R2(ctx, 4, 8, 3, 3, "#ffcf5a");
  R2(ctx, 10, 8, 3, 3, "#ffcf5a");
  PX2(ctx, 5, 6, "#fff4cf");
  PX2(ctx, 11, 6, "#fff4cf");
  PX2(ctx, 8, 5, "#1a120c");
}
function drawBird(ctx) {
  R2(ctx, 6, 7, 5, 3, "#6e4a2a");
  R2(ctx, 6, 7, 5, 1, "#8a6132");
  R2(ctx, 10, 6, 2, 2, "#6e4a2a");
  PX2(ctx, 11, 6, "#000000");
  PX2(ctx, 12, 7, "#e0a81e");
  R2(ctx, 4, 9, 3, 1, "#3a2410");
  R2(ctx, 7, 6, 3, 1, "#8a6132");
}
function drawDog(ctx) {
  const body = "#8a6a42";
  const hi = "#a8865a";
  const dk = "#5a4226";
  R2(ctx, 4, 8, 8, 4, body);
  R2(ctx, 4, 8, 8, 1, hi);
  R2(ctx, 11, 6, 3, 3, body);
  R2(ctx, 13, 7, 1, 2, dk);
  PX2(ctx, 12, 7, "#000000");
  R2(ctx, 11, 5, 1, 2, dk);
  R2(ctx, 5, 11, 1, 3, dk);
  R2(ctx, 7, 11, 1, 3, dk);
  R2(ctx, 9, 11, 1, 3, dk);
  R2(ctx, 11, 11, 1, 3, dk);
  R2(ctx, 3, 8, 1, 3, body);
  PX2(ctx, 3, 7, hi);
}
var TF_SKIN = ["#caa07a", "#b07a4e", "#d8b48c", "#9a6e4a", "#c89a6a", "#9a6e4a", "#caa07a"];
var TF_ROBE = ["#7a5a3a", "#3a6a3a", "#cfc4a0", "#465566", "#5a3a7a", "#42305a", "#8a6a3a"];
var TF_ROBE_HI = ["#9a7a52", "#56965a", "#e8e0c0", "#6a7688", "#7a5a9a", "#5a4080", "#a8865a"];
function drawTownsfolk(ctx, ox, oy, variant) {
  const v = (variant % 7 + 7) % 7;
  const cx = ox + 14;
  const skin = TF_SKIN[v];
  const robe = TF_ROBE[v];
  const robeHi = TF_ROBE_HI[v];
  const SH = "rgba(0,0,0,0.18)";
  R2(ctx, cx - 4, oy + 26, 3, 6, "#3a2c1c");
  R2(ctx, cx + 1, oy + 26, 3, 6, "#3a2c1c");
  R2(ctx, cx - 4, oy + 31, 3, 2, "#1a120a");
  R2(ctx, cx + 1, oy + 31, 3, 2, "#1a120a");
  R2(ctx, cx - 6, oy + 14, 12, 14, robe);
  R2(ctx, cx - 6, oy + 14, 12, 2, robeHi);
  R2(ctx, cx - 6, oy + 14, 2, 14, robeHi);
  R2(ctx, cx + 4, oy + 14, 2, 14, SH);
  R2(ctx, cx - 8, oy + 15, 2, 9, robe);
  R2(ctx, cx + 6, oy + 15, 2, 9, robe);
  R2(ctx, cx - 8, oy + 23, 2, 2, skin);
  R2(ctx, cx + 6, oy + 23, 2, 2, skin);
  R2(ctx, cx - 4, oy + 5, 8, 9, skin);
  R2(ctx, cx - 4, oy + 5, 8, 1, "#e6c89a");
  R2(ctx, cx + 2, oy + 6, 1, 7, SH);
  PX2(ctx, cx - 2, oy + 9, "#2a1c10");
  PX2(ctx, cx + 1, oy + 9, "#2a1c10");
  if (v === 0) {
    R2(ctx, cx - 5, oy + 3, 10, 3, "#8a8a92");
    R2(ctx, cx - 6, oy + 13, 13, 2, "#8a8a92");
    R2(ctx, cx + 6, oy + 22, 4, 4, "#5a3a1c");
    PX2(ctx, cx + 6, oy + 22, "#e0457a");
    PX2(ctx, cx + 8, oy + 22, "#ffd24a");
    PX2(ctx, cx + 9, oy + 21, "#7a5aff");
  } else if (v === 1) {
    R2(ctx, cx - 5, oy + 2, 10, 3, "#243a24");
    R2(ctx, cx - 7, oy + 4, 14, 2, "#243a24");
    R2(ctx, cx + 6, oy + 17, 2, 7, "#e8e0c0");
  } else if (v === 2) {
    R2(ctx, cx - 5, oy + 3, 10, 6, robeHi);
    R2(ctx, cx - 5, oy + 3, 10, 1, "#fff4cf");
    R2(ctx, cx - 6, oy + 6, 1, 6, robe);
    R2(ctx, cx + 5, oy + 6, 1, 6, robe);
    R2(ctx, cx - 10, oy + 6, 2, 22, "#5a3a1c");
    PX2(ctx, cx - 10, oy + 5, "#cfa64e");
  } else if (v === 3) {
    R2(ctx, cx - 4, oy + 3, 8, 3, "#8b94a8");
    R2(ctx, cx - 4, oy + 3, 8, 1, "#dfe6ff");
    R2(ctx, cx - 5, oy + 5, 1, 3, "#8b94a8");
    R2(ctx, cx + 4, oy + 5, 1, 3, "#8b94a8");
    R2(ctx, cx + 9, oy + 1, 2, 28, "#6e4a24");
    R2(ctx, cx + 8, oy, 4, 4, "#cfd6ff");
  } else if (v === 4) {
    R2(ctx, cx - 5, oy + 2, 10, 3, "#7a2a4a");
    PX2(ctx, cx + 5, oy, "#ffd24a");
    PX2(ctx, cx + 5, oy + 1, "#ffd24a");
    R2(ctx, cx - 12, oy + 16, 6, 8, "#8a5a2a");
    R2(ctx, cx - 12, oy + 16, 6, 1, "#b07a3a");
    R2(ctx, cx - 8, oy + 11, 1, 6, "#6e4a24");
  } else if (v === 5) {
    R2(ctx, cx - 6, oy + 2, 12, 9, robe);
    R2(ctx, cx - 4, oy + 8, 8, 4, "rgba(0,0,0,0.55)");
    PX2(ctx, cx - 2, oy + 10, "#c79bff");
    PX2(ctx, cx + 1, oy + 10, "#c79bff");
  } else {
    R2(ctx, cx - 4, oy + 4, 8, 2, "#6a4a2a");
    R2(ctx, cx - 4, oy + 4, 1, 4, "#6a4a2a");
    R2(ctx, cx + 3, oy + 4, 1, 4, "#6a4a2a");
    R2(ctx, cx - 5, oy + 17, 10, 9, "#b89a6a");
    R2(ctx, cx - 5, oy + 17, 10, 1, "#cdb488");
    R2(ctx, cx + 3, oy + 20, 3, 3, "#7a5a2a");
    PX2(ctx, cx + 4, oy + 21, "#ffd24a");
  }
}
function drawFountain(ctx, ox, oy) {
  const st = "#9a9286", stHi = "#c4bcae", stDk = "#6a6258", stSh = "#4e463e";
  const w0 = "#1f6a9a", w1 = "#2f86b5", wHi = "#7fc8e8", wLt = "#bfe9ff", sp = "#dffaff";
  const gold = "#cfa64e";
  const ell = (cx, cy, rx, ry, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  ell(ox + 32, oy + 76, 27, 5, "rgba(0,0,0,0.28)");
  ell(ox + 32, oy + 64, 26, 12, st);
  ell(ox + 32, oy + 62, 26, 10, stHi);
  ell(ox + 32, oy + 66, 24, 9, st);
  R2(ctx, ox + 6, oy + 64, 52, 8, st);
  R2(ctx, ox + 6, oy + 70, 52, 4, stDk);
  ell(ox + 32, oy + 60, 24, 8, gold);
  ell(ox + 32, oy + 61, 22, 7, w0);
  ell(ox + 32, oy + 60, 20, 6, w1);
  ell(ox + 30, oy + 59, 14, 4, wHi);
  R2(ctx, ox + 18, oy + 62, 12, 1, wLt);
  R2(ctx, ox + 36, oy + 64, 12, 1, wLt);
  PX2(ctx, ox + 24, oy + 60, "#ffffff");
  PX2(ctx, ox + 41, oy + 61, "#ffffff");
  R2(ctx, ox + 6, oy + 64, 3, 8, stHi);
  R2(ctx, ox + 55, oy + 64, 3, 8, stSh);
  R2(ctx, ox + 24, oy + 50, 16, 6, st);
  R2(ctx, ox + 24, oy + 50, 16, 1, stHi);
  R2(ctx, ox + 26, oy + 36, 12, 15, st);
  R2(ctx, ox + 26, oy + 36, 4, 15, stHi);
  R2(ctx, ox + 34, oy + 36, 4, 15, stDk);
  R2(ctx, ox + 25, oy + 40, 14, 2, gold);
  R2(ctx, ox + 27, oy + 45, 10, 1, stSh);
  ell(ox + 32, oy + 34, 18, 6, st);
  ell(ox + 32, oy + 33, 18, 5, gold);
  R2(ctx, ox + 16, oy + 34, 32, 4, st);
  R2(ctx, ox + 16, oy + 36, 32, 2, stDk);
  ell(ox + 32, oy + 33, 15, 4, w0);
  ell(ox + 32, oy + 32, 13, 3, w1);
  ell(ox + 31, oy + 32, 8, 2, wHi);
  PX2(ctx, ox + 27, oy + 32, "#ffffff");
  PX2(ctx, ox + 37, oy + 33, wLt);
  R2(ctx, ox + 29, oy + 22, 6, 11, st);
  R2(ctx, ox + 29, oy + 22, 2, 11, stHi);
  ell(ox + 32, oy + 20, 8, 3, st);
  ell(ox + 32, oy + 19, 8, 2, gold);
  ell(ox + 32, oy + 19, 6, 2, w1);
  ell(ox + 32, oy + 12, 5, 5, sp);
  ell(ox + 32, oy + 12, 3, 3, wHi);
  PX2(ctx, ox + 32, oy + 8, "#ffffff");
  PX2(ctx, ox + 26, oy + 9, wLt);
  PX2(ctx, ox + 38, oy + 9, wLt);
  PX2(ctx, ox + 23, oy + 13, sp);
  PX2(ctx, ox + 41, oy + 13, sp);
  PX2(ctx, ox + 21, oy + 18, wLt);
  PX2(ctx, ox + 43, oy + 18, wLt);
  R2(ctx, ox + 23, oy + 22, 1, 10, sp);
  R2(ctx, ox + 40, oy + 22, 1, 10, sp);
  R2(ctx, ox + 17, oy + 37, 1, 20, wLt);
  R2(ctx, ox + 46, oy + 37, 1, 20, wLt);
  PX2(ctx, ox + 9, oy + 70, "#5a7a3a");
  PX2(ctx, ox + 54, oy + 71, "#5a7a3a");
}
function drawFountainBase(ctx, ox, oy) {
  const W = 200, H = 164, cx = 100, cy = 84;
  const cem = [184, 176, 162], cemHi = [216, 210, 198], cemDk = [143, 136, 123];
  const stn = [154, 146, 134], stnHi = [198, 190, 176], stnDk = [102, 95, 85];
  const gold = [207, 166, 78], goldHi = [240, 210, 138];
  const aspect = 1.3;
  const RW = 70, RR = 85, RA = 98;
  const hx = (v, f) => {
    const c = (i) => Math.max(0, Math.min(255, Math.round(v[i] * f)));
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = (y - cy) * aspect;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r >= RA) continue;
      const ang = Math.atan2(dy, dx);
      const lit = 0.5 + 0.5 * Math.cos(ang + 2.2);
      if (r < RW) {
        if (r > RW - 6) {
          const a = (r - (RW - 6)) / 6 * 0.4;
          ctx.fillStyle = `rgba(8,34,52,${a.toFixed(3)})`;
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
        continue;
      }
      let col;
      if (r < RR) {
        const t = (ang + Math.PI) / (Math.PI * 2) * 18;
        const seam = t % 1 < 0.08 || t % 1 > 0.92;
        if (r < RW + 3) {
          col = hx(seam ? gold : goldHi, 0.96);
        } else {
          let base = stn;
          let f = 0.78 + lit * 0.36;
          if (seam) f *= 0.66;
          if (dy < 0 && r > RR - 4) base = stnHi;
          col = hx(base, f);
        }
      } else {
        let base = cem;
        let f = 0.84 + lit * 0.24;
        if (Math.abs(r - (RR + (RA - RR) * 0.55)) < 1.2) {
          base = cemDk;
          f = 0.92;
        } else if (r > RA - 2) f *= 0.7;
        else if (dy < 0 && r < RR + 5) base = cemHi;
        col = hx(base, f);
      }
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}
function drawRipple(ctx, ox, oy) {
  const cx = 20, cy = 20, rx = 17, ry = 12;
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const d = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.86);
      if (d < 0.14) {
        const a = (1 - d / 0.14) * 0.9;
        ctx.fillStyle = `rgba(207,236,255,${a.toFixed(3)})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
}
function drawFenceH(ctx, ox, oy) {
  const wood = "#6e4a24", hi = "#9a6c38", dk = "#3a2410";
  R2(ctx, ox, oy + 14, 32, 3, wood);
  R2(ctx, ox, oy + 14, 32, 1, hi);
  R2(ctx, ox, oy + 21, 32, 3, wood);
  R2(ctx, ox, oy + 21, 32, 1, hi);
  for (const px of [3, 15, 27]) {
    R2(ctx, ox + px, oy + 10, 3, 18, wood);
    R2(ctx, ox + px, oy + 10, 1, 18, hi);
    R2(ctx, ox + px, oy + 9, 3, 2, dk);
    R2(ctx, ox + px + 2, oy + 12, 1, 16, dk);
  }
}
function drawFenceV(ctx, ox, oy) {
  const wood = "#6e4a24", hi = "#9a6c38", dk = "#3a2410";
  R2(ctx, ox + 14, oy, 3, 32, wood);
  R2(ctx, ox + 14, oy, 1, 32, hi);
  for (const py of [2, 14, 26]) {
    R2(ctx, ox + 12, oy + py, 7, 4, wood);
    R2(ctx, ox + 12, oy + py, 7, 1, hi);
    R2(ctx, ox + 12, oy + py + 3, 7, 1, dk);
  }
}
function drawHedge(ctx, ox, oy) {
  const g0 = "#24481c", g1 = "#37662a", g2 = "#4d8a38", g3 = "#6ab04a";
  R2(ctx, ox, oy + 12, 32, 16, g1);
  R2(ctx, ox, oy + 10, 32, 4, g2);
  R2(ctx, ox, oy + 24, 32, 4, g0);
  for (let i = 0; i < 10; i++) {
    const x = (i * 13 + 5) % 30;
    PX2(ctx, ox + x, oy + 11 + i * 7 % 4, g3);
    PX2(ctx, ox + (i * 11 + 9) % 30, oy + 17 + i * 5 % 7, i % 3 ? g2 : g0);
  }
}
function drawLampPost(ctx, ox, oy) {
  const iron = "#2c2f3a", ironHi = "#565c70", glass = "#ffd98a", flame = "#fff2c0";
  R2(ctx, ox + 15, oy + 8, 3, 22, iron);
  R2(ctx, ox + 15, oy + 8, 1, 22, ironHi);
  R2(ctx, ox + 12, oy + 28, 9, 3, iron);
  R2(ctx, ox + 12, oy + 28, 9, 1, ironHi);
  R2(ctx, ox + 13, oy + 2, 7, 8, iron);
  R2(ctx, ox + 14, oy + 3, 5, 6, glass);
  R2(ctx, ox + 15, oy + 4, 3, 3, flame);
  PX2(ctx, ox + 16, oy + 4, "#ffffff");
  R2(ctx, ox + 14, oy, 5, 2, iron);
  PX2(ctx, ox + 12, oy + 5, glass);
  PX2(ctx, ox + 20, oy + 6, glass);
}
function stall(ctx, ox, oy, c0, c1) {
  const wood = "#6e4a24", woodHi = "#9a6c38", dk = "#3a2410";
  R2(ctx, ox + 4, oy + 12, 2, 16, dk);
  R2(ctx, ox + 26, oy + 12, 2, 16, dk);
  R2(ctx, ox + 2, oy + 20, 28, 8, wood);
  R2(ctx, ox + 2, oy + 20, 28, 2, woodHi);
  R2(ctx, ox + 2, oy + 27, 28, 1, dk);
  R2(ctx, ox + 6, oy + 17, 5, 4, "#d2452f");
  PX2(ctx, ox + 7, oy + 17, "#ff7a5a");
  R2(ctx, ox + 14, oy + 16, 6, 5, "#c9a94e");
  PX2(ctx, ox + 15, oy + 16, "#eed37a");
  R2(ctx, ox + 23, oy + 17, 4, 4, "#7fb84a");
  for (let i = 0; i < 8; i++) R2(ctx, ox + i * 4, oy + 6, 4, 6, i % 2 ? c0 : c1);
  R2(ctx, ox, oy + 4, 32, 3, c0);
  R2(ctx, ox, oy + 4, 32, 1, "#ffffff");
  R2(ctx, ox, oy + 11, 32, 1, dk);
  for (let i = 0; i < 8; i++) PX2(ctx, ox + i * 4 + 1, oy + 12, i % 2 ? c0 : c1);
}
function drawStallRed(ctx, ox, oy) {
  stall(ctx, ox, oy, "#b83a2e", "#efe6c8");
}
function drawStallBlue(ctx, ox, oy) {
  stall(ctx, ox, oy, "#2e5a9a", "#efe6c8");
}
function drawWell(ctx, ox, oy) {
  const stn = "#8a8274", stnHi = "#b6ae9e", stnDk = "#57503f";
  const wood = "#6e4a24", woodHi = "#9a6c38";
  R2(ctx, ox + 6, oy + 20, 20, 8, stn);
  R2(ctx, ox + 6, oy + 20, 20, 2, stnHi);
  R2(ctx, ox + 6, oy + 26, 20, 2, stnDk);
  for (const sx of [9, 14, 19, 24]) R2(ctx, ox + sx, oy + 22, 1, 4, stnDk);
  R2(ctx, ox + 9, oy + 22, 14, 2, "#0e2940");
  PX2(ctx, ox + 12, oy + 22, "#2f86b5");
  R2(ctx, ox + 7, oy + 6, 2, 15, wood);
  R2(ctx, ox + 23, oy + 6, 2, 15, wood);
  R2(ctx, ox + 4, oy + 4, 24, 3, "#7a3a28");
  R2(ctx, ox + 6, oy + 2, 20, 3, "#9a4a32");
  R2(ctx, ox + 10, oy, 12, 3, "#b85a3a");
  R2(ctx, ox + 4, oy + 6, 24, 1, "#3a2410");
  R2(ctx, ox + 9, oy + 9, 14, 2, woodHi);
  R2(ctx, ox + 15, oy + 11, 1, 7, "#cfc9af");
  R2(ctx, ox + 13, oy + 18, 5, 4, wood);
  R2(ctx, ox + 13, oy + 18, 5, 1, woodHi);
}
function drawCart(ctx, ox, oy) {
  const wood = "#6e4a24", woodHi = "#9a6c38", dk = "#3a2410";
  R2(ctx, ox + 4, oy + 14, 22, 8, wood);
  R2(ctx, ox + 4, oy + 14, 22, 2, woodHi);
  R2(ctx, ox + 4, oy + 21, 22, 1, dk);
  R2(ctx, ox + 3, oy + 12, 2, 10, dk);
  R2(ctx, ox + 26, oy + 15, 5, 2, wood);
  PX2(ctx, ox + 30, oy + 15, woodHi);
  R2(ctx, ox + 7, oy + 9, 6, 6, "#c9b083");
  R2(ctx, ox + 7, oy + 9, 6, 1, "#e2cda2");
  PX2(ctx, ox + 9, oy + 8, "#8a734e");
  R2(ctx, ox + 15, oy + 10, 6, 5, "#b09a6e");
  PX2(ctx, ox + 17, oy + 9, "#8a734e");
  ctx.fillStyle = dk;
  ctx.beginPath();
  ctx.arc(ox + 15, oy + 24, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.arc(ox + 15, oy + 24, 4, 0, Math.PI * 2);
  ctx.fill();
  R2(ctx, ox + 14, oy + 20, 1, 8, dk);
  R2(ctx, ox + 11, oy + 23, 8, 1, dk);
  PX2(ctx, ox + 15, oy + 24, "#cfa64e");
}
function drawHayBale(ctx, ox, oy) {
  const hay = "#c9a94e", hayHi = "#eed37a", hayDk = "#8a6e2a";
  R2(ctx, ox + 5, oy + 12, 22, 14, hay);
  R2(ctx, ox + 5, oy + 12, 22, 3, hayHi);
  R2(ctx, ox + 5, oy + 23, 22, 3, hayDk);
  for (let i = 0; i < 8; i++) PX2(ctx, ox + 6 + i * 3, oy + 15 + i % 3 * 3, i % 2 ? hayHi : hayDk);
  R2(ctx, ox + 10, oy + 12, 2, 14, "#6e4a24");
  R2(ctx, ox + 20, oy + 12, 2, 14, "#6e4a24");
  PX2(ctx, ox + 8, oy + 10, hayHi);
  PX2(ctx, ox + 24, oy + 11, hay);
}
function drawFlowerBed(ctx, ox, oy) {
  R2(ctx, ox + 4, oy + 8, 24, 18, "#3a2a18");
  R2(ctx, ox + 4, oy + 8, 24, 2, "#4e3a22");
  for (let i = 0; i < 6; i++) {
    const fx = ox + 6 + i % 3 * 8 + (i > 2 ? 3 : 0);
    const fy = oy + 11 + Math.floor(i / 3) * 7;
    const col = ["#e0574a", "#e8c93e", "#c07be0"][i % 3];
    R2(ctx, fx, fy + 3, 1, 3, "#4a8a3a");
    R2(ctx, fx - 1, fy, 3, 3, col);
    PX2(ctx, fx, fy + 1, "#fff2c0");
  }
}
function drawQuestBoard(ctx, ox, oy) {
  const wood = "#6e4a24", woodHi = "#9a6c38", dk = "#3a2410";
  R2(ctx, ox + 4, oy + 8, 3, 22, wood);
  R2(ctx, ox + 25, oy + 8, 3, 22, wood);
  R2(ctx, ox + 4, oy + 8, 1, 22, woodHi);
  R2(ctx, ox + 25, oy + 8, 1, 22, woodHi);
  R2(ctx, ox + 2, oy + 9, 28, 14, "#5a3a1c");
  R2(ctx, ox + 3, oy + 10, 26, 12, "#7a5128");
  R2(ctx, ox + 2, oy + 22, 28, 1, dk);
  R2(ctx, ox + 1, oy + 6, 30, 3, "#7a3a28");
  R2(ctx, ox + 3, oy + 4, 26, 3, "#9a4a32");
  R2(ctx, ox + 1, oy + 8, 30, 1, dk);
  R2(ctx, ox + 5, oy + 12, 6, 8, "#e8e2cc");
  R2(ctx, ox + 13, oy + 11, 7, 9, "#efe6c8");
  R2(ctx, ox + 22, oy + 13, 6, 7, "#e2d8b8");
  PX2(ctx, ox + 7, oy + 11, "#b83a2e");
  PX2(ctx, ox + 16, oy + 10, "#2e5a9a");
  PX2(ctx, ox + 24, oy + 12, "#b83a2e");
  for (const [lx, ly, lw] of [[6, 14, 4], [6, 16, 3], [14, 13, 5], [14, 15, 4], [14, 17, 5], [23, 15, 4]])
    R2(ctx, ox + lx, oy + ly, lw, 1, "#8a734e");
}
function drawStatue(ctx, ox, oy) {
  const stn = "#9a9486", stnHi = "#c8c2b2", stnDk = "#5e594c";
  R2(ctx, ox + 8, oy + 24, 16, 6, stn);
  R2(ctx, ox + 8, oy + 24, 16, 1, stnHi);
  R2(ctx, ox + 8, oy + 29, 16, 1, stnDk);
  R2(ctx, ox + 10, oy + 22, 12, 2, stnDk);
  R2(ctx, ox + 13, oy + 16, 6, 6, stn);
  R2(ctx, ox + 12, oy + 9, 8, 8, stn);
  R2(ctx, ox + 12, oy + 9, 3, 8, stnHi);
  R2(ctx, ox + 13, oy + 4, 5, 5, stn);
  R2(ctx, ox + 13, oy + 4, 5, 1, stnHi);
  R2(ctx, ox + 19, oy + 8, 3, 2, stn);
  R2(ctx, ox + 21, oy + 1, 2, 9, stnHi);
  PX2(ctx, ox + 21, oy, "#ffffff");
  R2(ctx, ox + 10, oy + 10, 3, 6, stnDk);
  PX2(ctx, ox + 9, oy + 26, "#5a7a3a");
  PX2(ctx, ox + 22, oy + 27, "#5a7a3a");
  PX2(ctx, ox + 14, oy + 12, stnDk);
}

// src/rendering/overworldArt.ts
var overworldArt_exports = {};
__export(overworldArt_exports, {
  drawBoar: () => drawBoar,
  drawBoulder: () => drawBoulder,
  drawCaveEntrance: () => drawCaveEntrance,
  drawCrow: () => drawCrow,
  drawDeer: () => drawDeer,
  drawDesertTree: () => drawDesertTree,
  drawFox: () => drawFox,
  drawFrog: () => drawFrog,
  drawGnarledOak: () => drawGnarledOak,
  drawGrassGround: () => drawGrassGround,
  drawMudGround: () => drawMudGround,
  drawObelisk: () => drawObelisk,
  drawPine: () => drawPine,
  drawRabbit: () => drawRabbit,
  drawReeds: () => drawReeds,
  drawRockGround: () => drawRockGround,
  drawRuinPillar: () => drawRuinPillar,
  drawSandGround: () => drawSandGround,
  drawSignpost: () => drawSignpost,
  drawStandingStone: () => drawStandingStone,
  drawSwampCypress: () => drawSwampCypress,
  drawWildflowers: () => drawWildflowers
});
function R3(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function PX3(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
function rng2(seed) {
  let s = seed * 2654435761 >>> 0;
  return () => {
    s = s * 1103515245 + 12345 & 2147483647;
    return s / 2147483647;
  };
}
function drawGrassGround(ctx, ox, oy, seed = 0) {
  R3(ctx, ox, oy, 16, 16, "#3a5a2c");
  const r = rng2(seed + 11);
  const shades = ["#456a32", "#33502a", "#4f7838", "#2e4a26"];
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX3(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  for (let i = 0; i < 3; i++) {
    const x = ox + 2 + Math.floor(r() * 12), y = oy + 6 + Math.floor(r() * 8);
    R3(ctx, x, y - 2, 1, 2, "#5f9a44");
  }
}
function drawSandGround(ctx, ox, oy, seed = 0) {
  R3(ctx, ox, oy, 16, 16, "#c9aa6a");
  const r = rng2(seed + 23);
  const shades = ["#d8bd80", "#bb9858", "#cdb070", "#a8854c"];
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX3(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  for (let y = 3; y < 16; y += 5) {
    const off = Math.floor(r() * 4);
    R3(ctx, ox + off, oy + y, 10, 1, "#b59556");
  }
}
function drawMudGround(ctx, ox, oy, seed = 0) {
  R3(ctx, ox, oy, 16, 16, "#3f3a2a");
  const r = rng2(seed + 31);
  const shades = ["#4a4430", "#332f22", "#514a33", "#2a2719"];
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX3(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  for (let i = 0; i < 2; i++) {
    const x = ox + 2 + Math.floor(r() * 9), y = oy + 2 + Math.floor(r() * 9);
    R3(ctx, x, y, 4, 2, "#3b4a36");
    PX3(ctx, x + 1, y, "#54684a");
  }
}
function drawRockGround(ctx, ox, oy, seed = 0) {
  R3(ctx, ox, oy, 16, 16, "#5b5852");
  const r = rng2(seed + 47);
  const shades = ["#6a665e", "#4c4943", "#736f66", "#403d38"];
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX3(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  for (let i = 0; i < 3; i++) {
    const x = ox + Math.floor(r() * 14), y = oy + Math.floor(r() * 14);
    R3(ctx, x, y, 2, 1, "#383530");
  }
}
function drawPine(ctx, ox, oy) {
  R3(ctx, ox + 14, oy + 22, 4, 9, "#3a2a1a");
  R3(ctx, ox + 15, oy + 22, 2, 9, "#4a3622");
  const g0 = "#243f22", g1 = "#2f5230", g2 = "#1c3019";
  for (let i = 0; i < 4; i++) {
    const w = 20 - i * 3;
    const y = oy + 4 + i * 5;
    ctx.fillStyle = i % 2 === 0 ? g0 : g1;
    ctx.beginPath();
    ctx.moveTo(ox + 16, y);
    ctx.lineTo(ox + 16 - w / 2, y + 7);
    ctx.lineTo(ox + 16 + w / 2, y + 7);
    ctx.closePath();
    ctx.fill();
  }
  PX3(ctx, ox + 16, oy + 3, "#3f6a38");
  R3(ctx, ox + 10, oy + 25, 12, 2, g2);
}
function drawGnarledOak(ctx, ox, oy) {
  R3(ctx, ox + 13, oy + 16, 5, 15, "#3b2a1b");
  R3(ctx, ox + 14, oy + 16, 2, 15, "#4d3826");
  R3(ctx, ox + 9, oy + 18, 5, 3, "#3b2a1b");
  R3(ctx, ox + 18, oy + 20, 5, 3, "#3b2a1b");
  const c0 = "#2c4a26", c1 = "#3a6230", c2 = "#22381e";
  R3(ctx, ox + 5, oy + 6, 22, 12, c0);
  R3(ctx, ox + 7, oy + 4, 18, 12, c1);
  R3(ctx, ox + 9, oy + 3, 8, 5, "#46743a");
  R3(ctx, ox + 4, oy + 9, 5, 7, c2);
  R3(ctx, ox + 23, oy + 8, 5, 8, c2);
  PX3(ctx, ox + 11, oy + 6, "#5a8c46");
  PX3(ctx, ox + 20, oy + 9, "#5a8c46");
}
function drawSwampCypress(ctx, ox, oy) {
  R3(ctx, ox + 14, oy + 10, 4, 21, "#5a5240");
  R3(ctx, ox + 15, oy + 10, 1, 21, "#6e6650");
  R3(ctx, ox + 11, oy + 28, 2, 3, "#4a4334");
  R3(ctx, ox + 19, oy + 28, 2, 3, "#4a4334");
  R3(ctx, ox + 7, oy + 4, 18, 9, "#3d4a30");
  R3(ctx, ox + 9, oy + 2, 14, 8, "#4a5a38");
  for (let i = 0; i < 5; i++) {
    const x = ox + 8 + i * 4;
    R3(ctx, x, oy + 11, 1, 5 + i % 3 * 2, "#6f7a52");
  }
}
function drawDesertTree(ctx, ox, oy) {
  R3(ctx, ox + 14, oy + 14, 4, 17, "#6a5236");
  R3(ctx, ox + 15, oy + 14, 1, 17, "#806a48");
  R3(ctx, ox + 10, oy + 15, 5, 2, "#6a5236");
  R3(ctx, ox + 17, oy + 13, 6, 2, "#6a5236");
  R3(ctx, ox + 6, oy + 8, 20, 5, "#5f6a3a");
  R3(ctx, ox + 8, oy + 6, 16, 4, "#6f7a44");
  PX3(ctx, ox + 12, oy + 7, "#869154");
  PX3(ctx, ox + 19, oy + 8, "#869154");
}
function drawBoulder(ctx, ox, oy) {
  const a = "#6b675e", b = "#54504a", c = "#7d7970", d = "#403d38";
  R3(ctx, ox + 6, oy + 14, 20, 13, b);
  R3(ctx, ox + 8, oy + 11, 16, 6, a);
  R3(ctx, ox + 11, oy + 9, 10, 4, c);
  R3(ctx, ox + 6, oy + 24, 20, 3, d);
  PX3(ctx, ox + 12, oy + 12, c);
  R3(ctx, ox + 16, oy + 16, 6, 1, d);
  R3(ctx, ox + 8, oy + 22, 5, 2, "#3f5a2e");
}
function drawReeds(ctx, ox, oy) {
  const g0 = "#5a6a36", g1 = "#46532a", g2 = "#7a8a4a";
  for (const [x, h] of [[8, 16], [12, 20], [16, 14], [20, 18], [24, 12]]) {
    R3(ctx, ox + x, oy + 30 - h, 2, h, g0);
    R3(ctx, ox + x, oy + 30 - h, 1, h, g1);
    R3(ctx, ox + x, oy + 30 - h, 1, 3, g2);
  }
  R3(ctx, ox + 6, oy + 28, 22, 2, "#3a4626");
}
function drawWildflowers(ctx, ox, oy) {
  R3(ctx, ox + 6, oy + 12, 4, 4, "#436a32");
  R3(ctx, ox + 14, oy + 14, 4, 3, "#436a32");
  R3(ctx, ox + 20, oy + 11, 4, 4, "#436a32");
  PX3(ctx, ox + 7, oy + 11, "#e6d24a");
  PX3(ctx, ox + 8, oy + 11, "#e6d24a");
  PX3(ctx, ox + 15, oy + 13, "#d57ad0");
  PX3(ctx, ox + 21, oy + 10, "#9ac2ff");
  PX3(ctx, ox + 22, oy + 10, "#9ac2ff");
}
function drawObelisk(ctx, ox, oy) {
  R3(ctx, ox + 11, oy + 4, 10, 40, "#2b2730");
  R3(ctx, ox + 12, oy + 4, 8, 40, "#3a3543");
  R3(ctx, ox + 13, oy + 4, 2, 40, "#4a4456");
  ctx.fillStyle = "#1e1b24";
  ctx.beginPath();
  ctx.moveTo(ox + 11, oy + 4);
  ctx.lineTo(ox + 16, oy);
  ctx.lineTo(ox + 21, oy + 4);
  ctx.closePath();
  ctx.fill();
  PX3(ctx, ox + 15, oy + 12, "#a85cff");
  PX3(ctx, ox + 15, oy + 13, "#a85cff");
  PX3(ctx, ox + 16, oy + 20, "#bb78ff");
  PX3(ctx, ox + 14, oy + 28, "#a85cff");
  R3(ctx, ox + 8, oy + 44, 16, 4, "#2a2620");
}
function drawRuinPillar(ctx, ox, oy) {
  const a = "#9a8f76", b = "#7d735c", c = "#b6ab90";
  R3(ctx, ox + 10, oy + 6, 12, 22, b);
  R3(ctx, ox + 11, oy + 6, 9, 22, a);
  R3(ctx, ox + 12, oy + 6, 2, 22, c);
  for (let x = ox + 12; x < ox + 21; x += 3) R3(ctx, x, oy + 8, 1, 18, "#6b6250");
  ctx.fillStyle = "#6b6250";
  ctx.beginPath();
  ctx.moveTo(ox + 10, oy + 6);
  ctx.lineTo(ox + 14, oy + 2);
  ctx.lineTo(ox + 22, oy + 6);
  ctx.closePath();
  ctx.fill();
  R3(ctx, ox + 7, oy + 27, 18, 4, "#6b6250");
  R3(ctx, ox + 5, oy + 29, 22, 2, "#564e3f");
}
function drawStandingStone(ctx, ox, oy) {
  const a = "#6f6a60", b = "#565149", c = "#827c70";
  R3(ctx, ox + 9, oy + 8, 13, 22, b);
  R3(ctx, ox + 10, oy + 7, 10, 23, a);
  R3(ctx, ox + 12, oy + 6, 5, 24, c);
  R3(ctx, ox + 6, oy + 28, 20, 3, "#403c34");
  PX3(ctx, ox + 14, oy + 15, "#8fa0c0");
  PX3(ctx, ox + 15, oy + 16, "#8fa0c0");
  PX3(ctx, ox + 14, oy + 17, "#8fa0c0");
}
function drawSignpost(ctx, ox, oy) {
  R3(ctx, ox + 14, oy + 8, 3, 22, "#5a4730");
  R3(ctx, ox + 15, oy + 8, 1, 22, "#6e5840");
  R3(ctx, ox + 4, oy + 10, 14, 5, "#7a6242");
  R3(ctx, ox + 4, oy + 10, 14, 1, "#92774f");
  R3(ctx, ox + 16, oy + 17, 12, 5, "#7a6242");
  R3(ctx, ox + 16, oy + 17, 12, 1, "#92774f");
  R3(ctx, ox + 6, oy + 12, 9, 1, "#4a3a26");
  R3(ctx, ox + 18, oy + 19, 8, 1, "#4a3a26");
}
function drawCaveEntrance(ctx, ox, oy) {
  const rock = "#4f4a43", rockLo = "#383531";
  R3(ctx, ox + 3, oy + 8, 26, 22, rock);
  R3(ctx, ox + 3, oy + 28, 26, 3, rockLo);
  R3(ctx, ox + 6, oy + 8, 20, 2, "#6a655c");
  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.moveTo(ox + 9, oy + 30);
  ctx.lineTo(ox + 11, oy + 16);
  ctx.lineTo(ox + 16, oy + 12);
  ctx.lineTo(ox + 21, oy + 16);
  ctx.lineTo(ox + 23, oy + 30);
  ctx.closePath();
  ctx.fill();
  PX3(ctx, ox + 16, oy + 26, "#1c1c22");
  R3(ctx, ox + 5, oy + 29, 3, 2, "#5a554c");
  R3(ctx, ox + 24, oy + 28, 3, 3, "#5a554c");
}
function drawDeer(ctx, ox, oy) {
  const body = "#8a6440", dark = "#6e4e30", light = "#a07a4e";
  R3(ctx, ox + 4, oy + 8, 10, 5, body);
  R3(ctx, ox + 4, oy + 8, 10, 1, light);
  R3(ctx, ox + 12, oy + 5, 4, 4, body);
  R3(ctx, ox + 15, oy + 4, 3, 2, body);
  PX3(ctx, ox + 13, oy + 2, dark);
  PX3(ctx, ox + 14, oy + 1, dark);
  PX3(ctx, ox + 15, oy + 2, dark);
  R3(ctx, ox + 5, oy + 13, 1, 3, dark);
  R3(ctx, ox + 8, oy + 13, 1, 3, dark);
  R3(ctx, ox + 11, oy + 13, 1, 3, dark);
  R3(ctx, ox + 13, oy + 13, 1, 3, dark);
  PX3(ctx, ox + 7, oy + 9, light);
  PX3(ctx, ox + 9, oy + 10, light);
}
function drawRabbit(ctx, ox, oy) {
  const fur = "#9a8f7e", dark = "#7a7062", hi = "#b6ac9a";
  R3(ctx, ox + 5, oy + 9, 6, 4, fur);
  R3(ctx, ox + 5, oy + 9, 6, 1, hi);
  R3(ctx, ox + 10, oy + 7, 3, 3, fur);
  R3(ctx, ox + 9, oy + 4, 1, 4, dark);
  R3(ctx, ox + 11, oy + 4, 1, 4, dark);
  PX3(ctx, ox + 4, oy + 10, hi);
  R3(ctx, ox + 6, oy + 12, 1, 2, dark);
  R3(ctx, ox + 9, oy + 12, 1, 2, dark);
  PX3(ctx, ox + 12, oy + 8, "#1a1a1a");
}
function drawFox(ctx, ox, oy) {
  const fur = "#b5662e", dark = "#8a4a1e", white = "#e6ddd0";
  R3(ctx, ox + 3, oy + 8, 9, 4, fur);
  R3(ctx, ox + 11, oy + 6, 3, 3, fur);
  PX3(ctx, ox + 11, oy + 5, dark);
  PX3(ctx, ox + 13, oy + 5, dark);
  R3(ctx, ox + 13, oy + 8, 2, 1, white);
  R3(ctx, ox + 2, oy + 8, 3, 2, dark);
  PX3(ctx, ox + 1, oy + 9, white);
  R3(ctx, ox + 5, oy + 12, 1, 2, dark);
  R3(ctx, ox + 9, oy + 12, 1, 2, dark);
  PX3(ctx, ox + 13, oy + 7, "#161616");
}
function drawFrog(ctx, ox, oy) {
  const g = "#4f7a36", gd = "#3a5a28", gh = "#69a048";
  R3(ctx, ox + 5, oy + 9, 7, 4, g);
  R3(ctx, ox + 5, oy + 9, 7, 1, gh);
  R3(ctx, ox + 5, oy + 7, 2, 2, g);
  R3(ctx, ox + 10, oy + 7, 2, 2, g);
  PX3(ctx, ox + 5, oy + 7, "#e8d24a");
  PX3(ctx, ox + 11, oy + 7, "#e8d24a");
  R3(ctx, ox + 4, oy + 12, 2, 1, gd);
  R3(ctx, ox + 11, oy + 12, 2, 1, gd);
  PX3(ctx, ox + 8, oy + 11, gd);
}
function drawBoar(ctx, ox, oy) {
  const body = "#4a4038", dark = "#332c26", bristle = "#5e544a";
  R3(ctx, ox + 3, oy + 7, 11, 6, body);
  R3(ctx, ox + 3, oy + 7, 11, 1, bristle);
  R3(ctx, ox + 12, oy + 8, 4, 4, body);
  R3(ctx, ox + 15, oy + 10, 2, 2, dark);
  PX3(ctx, ox + 16, oy + 9, "#d8d2c4");
  R3(ctx, ox + 5, oy + 13, 2, 3, dark);
  R3(ctx, ox + 8, oy + 13, 2, 3, dark);
  R3(ctx, ox + 11, oy + 13, 2, 3, dark);
  PX3(ctx, ox + 14, oy + 9, "#141414");
}
function drawCrow(ctx, ox, oy) {
  const b = "#1c1c24", hi = "#3a3a48";
  R3(ctx, ox + 5, oy + 7, 7, 3, b);
  R3(ctx, ox + 11, oy + 6, 3, 2, b);
  PX3(ctx, ox + 14, oy + 6, "#caa23a");
  R3(ctx, ox + 6, oy + 6, 4, 1, hi);
  R3(ctx, ox + 4, oy + 8, 2, 1, b);
  PX3(ctx, ox + 12, oy + 6, "#caa23a");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  C,
  THEME_ART,
  Tile,
  art,
  buildTown,
  overworldArt,
  townArt
});
