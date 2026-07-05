#!/usr/bin/env node
/**
 * Bake a procedural hero class into a 40×48 × 12-frame PNG for manifest override.
 * Matches TextureFactory.makeHeroSheet (drawHumanoid + softShade + outline).
 *
 * Usage: node tools/render_hero_sheet.cjs vanguard
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..');
const BUNDLE_TS = path.join(__dirname, '_artbundle.ts');
const BUNDLE_CJS = path.join(__dirname, '_artbundle.cjs');

function ensureBundle() {
  const stale =
    !fs.existsSync(BUNDLE_CJS) ||
    fs.statSync(BUNDLE_TS).mtimeMs > fs.statSync(BUNDLE_CJS).mtimeMs;
  if (stale) {
    execSync(
      `npx esbuild "${BUNDLE_TS}" --bundle --format=cjs --platform=node --outfile="${BUNDLE_CJS}"`,
      { cwd: ROOT, stdio: 'inherit' }
    );
  }
}

const FW = 40;
const FH = 48;
const N = 12;
const FACINGS = ['down', 'up', 'side'];

async function main() {
  const cls = process.argv[2];
  if (!cls) {
    console.error('Usage: node tools/render_hero_sheet.cjs <classId>');
    process.exit(1);
  }

  ensureBundle();
  const { art, HERO_RAMPS } = require(BUNDLE_CJS);
  const ramp = HERO_RAMPS[cls];
  if (!ramp) {
    console.error(`Unknown class "${cls}". Known: ${Object.keys(HERO_RAMPS).join(', ')}`);
    process.exit(1);
  }

  const out = path.join(ROOT, 'public', 'assets', 'sprites', `hero-${cls}-sheet.png`);
  const sheet = createCanvas(FW * N, FH);
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let frame = 0; frame < N; frame++) {
    const facing = FACINGS[Math.floor(frame / 4)];
    const pose = frame % 4;
    const ox = frame * FW;
    art.drawHumanoid(ctx, ox, cls, ramp, facing, pose);
    art.softShade(ctx, ox, 0, FW, FH);
    art.outlineRegion(ctx, ox, 0, FW, FH);
  }

  const buf = sheet.encodeSync ? sheet.encodeSync('png') : await sheet.encode('png');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, `${FW * N}x${FH}`, `(${cls} procedural bake)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});