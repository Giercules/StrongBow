#!/usr/bin/env node
/**
 * Necromancer skeleton pets — bone_archer enemy base (22×22) + role gear overlays.
 * Implemented in gen_monsters.py to match the dungeon Bone Archer sprite exactly.
 */
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
execSync('python tools/gen_monsters.py --skels-only', { cwd: ROOT, stdio: 'inherit' });