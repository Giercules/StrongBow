/** Shared pixel-art helpers for offline sprite render scripts. */
const R = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const PX = (ctx, x, y, c) => R(ctx, x, y, 1, 1, c);

const blob = (ctx, x, y, w, h, c) => {
  R(ctx, x + 1, y, w - 2, h, c);
  R(ctx, x, y + 1, w, h - 2, c);
};

function outlineRegion(ctx, ox, oy, w, h, color = '#0a0a14') {
  const img = ctx.getImageData(ox, oy, w, h);
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
  ctx.putImageData(img, ox, oy);
}

function softShade(ctx, ox, oy, w, h) {
  const img = ctx.getImageData(ox, oy, w, h);
  const d = img.data;
  const a = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 40;
  const src = new Uint8ClampedArray(d);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (src[i + 3] <= 40) continue;
      let f = 0;
      if (!a(px, py - 1) || !a(px - 1, py)) f += 0.22;
      if (!a(px, py + 1) || !a(px + 1, py)) f -= 0.2;
      f -= (py / h) * 0.07;
      if (f !== 0) {
        d[i] = clamp(src[i] * (1 + f));
        d[i + 1] = clamp(src[i + 1] * (1 + f));
        d[i + 2] = clamp(src[i + 2] * (1 + f));
      }
    }
  }
  ctx.putImageData(img, ox, oy);
}

function finishFrame(ctx, ox, fw, fh) {
  softShade(ctx, ox, 0, fw, fh);
  outlineRegion(ctx, ox, 0, fw, fh);
}

function writePng(canvas, outPath) {
  const fs = require('fs');
  const buf = canvas.encodeSync ? canvas.encodeSync('png') : null;
  if (!buf) throw new Error('encodeSync unavailable');
  fs.writeFileSync(outPath, buf);
}

module.exports = { R, PX, blob, outlineRegion, softShade, finishFrame, writePng };