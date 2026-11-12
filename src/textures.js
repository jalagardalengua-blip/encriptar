// Texturas procedurales PBR generadas en canvas (color, ORM, normal, emisivo)
import * as THREE from 'three';
import { mulberry32 } from './config.js';

let ANISO = 8;
export function setAniso(a) { ANISO = a; }

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------- Ruido periódico (tileable) ----------
export function makeNoise(seed) {
  const r = mulberry32(seed);
  const P = 256;
  const g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const noise = (x, y, per) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per;
    const x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
    const a = g[(y0 & 255) * P + (x0 & 255)], b = g[(y0 & 255) * P + (x1 & 255)];
    const c = g[(y1 & 255) * P + (x0 & 255)], d = g[(y1 & 255) * P + (x1 & 255)];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (u, v, per, oct = 4) => {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let o = 0; o < oct; o++) {
      s += amp * noise(u * per * f, v * per * f, per * f);
      n += amp; amp *= 0.5; f *= 2;
    }
    return s / n;
  };
  return { noise, fbm };
}

// ---------- Pintor multicapa ----------
// color (sRGB), orm (R: máscara charcos / G: rugosidad / B: metalicidad), height, emissive
export class Painter {
  constructor(w, h, opts = {}) {
    this.w = w; this.h = h;
    this.layers = {};
    for (const name of ['color', 'orm', 'height', 'emissive']) {
      if (opts[name] === false) continue;
      const c = mk(w, h);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      this.layers[name] = { c, ctx };
    }
    this.fill(0, 0, w, h, { c: opts.base || '#808080', r: opts.rough ?? 0.8, m: opts.metal ?? 0, h: 0.5, e: '#000' });
  }
  fill(x, y, w, h, p) {
    const L = this.layers;
    if (p.c && L.color) { L.color.ctx.fillStyle = p.c; L.color.ctx.fillRect(x, y, w, h); }
    if ((p.r !== undefined || p.m !== undefined) && L.orm) {
      const rr = Math.round((p.r ?? 0.8) * 255), mm = Math.round((p.m ?? 0) * 255);
      L.orm.ctx.fillStyle = `rgb(${p.p ?? 0},${rr},${mm})`; L.orm.ctx.fillRect(x, y, w, h);
    }
    if (p.h !== undefined && L.height) { const v = Math.round(p.h * 255); L.height.ctx.fillStyle = `rgb(${v},${v},${v})`; L.height.ctx.fillRect(x, y, w, h); }
    if (p.e !== undefined && L.emissive) { L.emissive.ctx.fillStyle = p.e; L.emissive.ctx.fillRect(x, y, w, h); }
  }
  // Aplica función por píxel a una capa: fn(x,y,u,v,rgba)->void (modifica rgba)
  pixels(layer, fn) {
    const L = this.layers[layer]; if (!L) return;
    const img = L.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data; const px = [0, 0, 0, 0];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        px[0] = d[i]; px[1] = d[i + 1]; px[2] = d[i + 2]; px[3] = d[i + 3];
        fn(x, y, x / this.w, y / this.h, px);
        d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = px[3];
      }
    }
    L.ctx.putImageData(img, 0, 0);
  }
  build({ normalStrength = 2, repeat = [1, 1], emissive = true } = {}) {
    const out = {};
    const L = this.layers;
    if (L.color) out.map = tex(L.color.c, true, repeat);
    if (L.orm) out.orm = tex(L.orm.c, false, repeat);
    if (L.height) out.normalMap = tex(heightToNormal(L.height.c, normalStrength), false, repeat);
    if (L.emissive && emissive) out.emissiveMap = tex(L.emissive.c, true, repeat);
    return out;
  }
}

export function tex(canvas, srgb, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = ANISO;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

export function heightToNormal(hc, strength) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = mk(w, h);
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ---------- Asfalto ----------
export function asphalt(seed = 1) {
  const S = 1024;
  const N = makeNoise(seed);
  const p = new Painter(S, S, { base: '#2b2b2d', rough: 0.9, emissive: false });
  const rnd = mulberry32(seed + 7);
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 8, 5);
    const big = N.fbm(u + 0.3, v + 0.7, 2, 3);
    const grain = rnd();
    let c = 36 + (n - 0.5) * 26 + (big - 0.5) * 18 + (grain > 0.93 ? 30 * rnd() : 0) - (grain < 0.04 ? 14 : 0);
    // manchas de aceite / reparaciones
    const patch = N.fbm(u + 3.1, v + 1.7, 3, 3);
    if (patch > 0.66) c -= 9;
    px[0] = clamp255(c); px[1] = clamp255(c + 1); px[2] = clamp255(c + 3);
  });
  p.pixels('orm', (x, y, u, v, px) => {
    const n = N.fbm(u + 5, v + 2, 8, 4);
    const puddle = N.fbm(u + 9.3, v + 4.4, 3, 4);
    px[0] = clamp255((puddle - 0.45) * 3.2 * 255);
    px[1] = clamp255((0.8 + (n - 0.5) * 0.25) * 255);
    px[2] = 0;
  });
  p.pixels('height', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 64, 3);
    const gr = rnd();
    const c = 128 + (n - 0.5) * 120 + (gr > 0.9 ? 40 : 0);
    px[0] = px[1] = px[2] = clamp255(c);
  });
  // grietas
  const hc = p.layers.height.ctx, cc = p.layers.color.ctx;
  for (let k = 0; k < 26; k++) {
    let x = rnd() * S, y = rnd() * S; const len = 20 + rnd() * 60;
    let a = rnd() * Math.PI * 2;
    hc.strokeStyle = 'rgb(40,40,40)'; cc.strokeStyle = 'rgba(15,15,15,0.7)';
    hc.lineWidth = cc.lineWidth = 1 + rnd() * 1.5;
    hc.beginPath(); cc.beginPath(); hc.moveTo(x, y); cc.moveTo(x, y);
    for (let s = 0; s < len; s++) { a += (rnd() - 0.5) * 0.8; x += Math.cos(a) * 3; y += Math.sin(a) * 3; hc.lineTo(x, y); cc.lineTo(x, y); }
    hc.stroke(); cc.stroke();
  }
  return p.build({ normalStrength: 3 });
}

// ---------- Marcas viales (segmento 16 x 72 m) ----------
export function roadMarkings(seed = 3) {
  const W = 256, H = 1152; // 16 px/m
  const c = mk(W, H); const ctx = c.getContext('2d');
  const N = makeNoise(seed);
  ctx.clearRect(0, 0, W, H);
  const mx = (m) => (m + 8) * 16; // metros -> px (x en [-8,8])
  const my = (m) => m * 16;       // y en [0,72]
  ctx.fillStyle = '#f2f2ee';
  // doble línea central continua
  ctx.fillRect(mx(-0.22), 0, 0.15 * 16, H);
  ctx.fillRect(mx(0.07), 0, 0.15 * 16, H);
  // separación de carriles (discontinua)
  for (const lx of [-4, 4]) for (let y = 4; y < 68; y += 9) ctx.fillRect(mx(lx - 0.075), my(y), 0.15 * 16, my(4.5));
  // bordes
  ctx.fillRect(mx(-7.75), 0, 0.15 * 16, H);
  ctx.fillRect(mx(7.6), 0, 0.15 * 16, H);
  // pasos de cebra (3 m) a ambos extremos + líneas de detención
  for (const yy of [0.6, 72 - 3.6]) for (let x = -7.3; x < 7.3; x += 1.0) ctx.fillRect(mx(x), my(yy), 0.5 * 16, my(3));
  // línea de detención (sentido +Y usa x<0 (derecha), se detiene al final; sentido -Y usa x>0, al inicio)
  ctx.fillRect(mx(-7.6), my(72 - 4.6), 7.3 * 16, 0.4 * 16);
  ctx.fillRect(mx(0.3), my(4.2), 7.3 * 16, 0.4 * 16);
  // flechas
  const arrow = (x, y, flip) => {
    ctx.save(); ctx.translate(mx(x), my(y)); if (flip) ctx.rotate(Math.PI);
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(14, -16); ctx.lineTo(5, -16); ctx.lineTo(5, 40); ctx.lineTo(-5, 40); ctx.lineTo(-5, -16); ctx.lineTo(-14, -16); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  arrow(-2, 60, true); arrow(-6, 60, true); arrow(2, 12, false); arrow(6, 12, false);
  // desgaste
  const img = ctx.getImageData(0, 0, W, H); const d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (!d[i + 3]) continue;
    const n = N.fbm(x / W, y / H, 12, 4);
    d[i + 3] = clamp255(d[i + 3] * (0.35 + n * 0.9));
  }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- Acera (baldosas) ----------
export function sidewalk(seed = 5) {
  const S = 512; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#9a968e', rough: 0.85, emissive: false });
  const tiles = 8; const ts = S / tiles;
  for (let ty = 0; ty < tiles; ty++) for (let tx = 0; tx < tiles; tx++) {
    const v = 140 + rnd() * 24 | 0;
    p.fill(tx * ts, ty * ts, ts, ts, { c: `rgb(${v},${v - 3},${v - 9})`, h: 0.6 + rnd() * 0.05, r: 0.8 + rnd() * 0.1 });
    // ligera textura granallada
    const hc = p.layers.height.ctx;
    for (let a = 0; a < 40; a++) { const g = 120 + rnd() * 80; hc.fillStyle = `rgb(${g},${g},${g})`; hc.fillRect(tx * ts + rnd() * ts, ty * ts + rnd() * ts, 2, 2); }
  }
  const hc = p.layers.height.ctx, cc = p.layers.color.ctx;
  hc.fillStyle = '#202020'; cc.fillStyle = 'rgba(60,58,55,0.9)';
  for (let k = 0; k <= tiles; k++) { hc.fillRect(k * ts - 1.5, 0, 3, S); hc.fillRect(0, k * ts - 1.5, S, 3); cc.fillRect(k * ts - 1, 0, 2, S); cc.fillRect(0, k * ts - 1, S, 2); }
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 6, 4); const k = 0.75 + n * 0.45;
    px[0] = clamp255(px[0] * k); px[1] = clamp255(px[1] * k); px[2] = clamp255(px[2] * k);
  });
  p.pixels('orm', (x, y, u, v, px) => { const pd = N.fbm(u + 2, v + 3, 3, 3); px[0] = clamp255((pd - 0.5) * 3 * 255); });
  return p.build({ normalStrength: 4 });
}

// ---------- Césped ----------
export function grass(seed = 9) {
  const S = 512; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#3d5a2a', rough: 0.95, emissive: false });
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 8, 5), m = N.fbm(u + 4, v + 1, 2, 3); const g = rnd();
    px[0] = clamp255(48 + n * 40 + m * 30 + g * 12);
    px[1] = clamp255(70 + n * 55 + g * 25 - m * 10);
    px[2] = clamp255(28 + n * 18);
  });
  p.pixels('height', (x, y, u, v, px) => { const c = rnd() * 255; px[0] = px[1] = px[2] = c; });
  return p.build({ normalStrength: 1.5 });
}

// ---------- Fachadas ----------
// Cada fachada devuelve también el tamaño del tile en metros
const windowLit = (rnd) => {
  const warm = ['#ffcf8a', '#ffd9a6', '#ffe6c2', '#ffc070', '#fff0d8', '#cfe4ff', '#e8f0ff'];
  return warm[(rnd() * warm.length) | 0];
};

export function facadePlaster(seed = 11) {
  const S = 512, cols = 3, floors = 3; const tileW = 10.8, tileH = 9.3;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#ece6da', rough: 0.88 });
  const cw = S / cols, fh = S / floors; const pxm = S / tileH;
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 6, 5); const streak = N.fbm(u * 3, v * 0.3, 8, 3);
    const k = 0.86 + n * 0.18 - streak * 0.08;
    px[0] = clamp255(236 * k); px[1] = clamp255(230 * k); px[2] = clamp255(218 * k);
  });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + (N.fbm(u, v, 40, 3) - 0.5) * 90; px[0] = px[1] = px[2] = c; });
  for (let f = 0; f < floors; f++) {
    const y0 = S - (f + 1) * fh; // parte superior del piso
    // cornisa / forjado
    p.fill(0, y0 + fh - 0.22 * pxm, S, 0.22 * pxm, { c: 'rgba(205,198,185,1)', h: 0.75, r: 0.8 });
    for (let c = 0; c < cols; c++) {
      const x0 = c * cw;
      const ww = 1.35 * (S / tileW), wh = 1.65 * pxm;
      const wx = x0 + (cw - ww) / 2, wy = y0 + fh - 0.95 * pxm - wh;
      const balcony = rnd() < 0.45;
      if (balcony) {
        const bh = wh + 0.75 * pxm;
        p.fill(wx, wy, ww, bh, { c: '#2d3136', h: 0.15, r: 0.2 });
      }
      // marco
      p.fill(wx - 5, wy - 5, ww + 10, (balcony ? wh + 0.75 * pxm : wh) + 10, { c: '#f4f2ee', h: 0.62, r: 0.5 });
      // vidrio
      const gh = balcony ? wh + 0.7 * pxm : wh;
      p.fill(wx, wy, ww, gh, { c: '#1f2a33', h: 0.2, r: 0.06, m: 0.35, e: rnd() < 0.38 ? windowLit(rnd) : '#000' });
      // reflejo / cortinas
      const cc = p.layers.color.ctx; const g = cc.createLinearGradient(wx, wy, wx + ww, wy + gh);
      g.addColorStop(0, 'rgba(160,190,210,0.25)'); g.addColorStop(0.5, 'rgba(20,30,40,0)'); g.addColorStop(1, 'rgba(120,150,170,0.15)');
      cc.fillStyle = g; cc.fillRect(wx, wy, ww, gh);
      if (rnd() < 0.5) {
        const cur = ['#c9b79a', '#9e3b2e', '#e8e1d0', '#5c6b4e'][(rnd() * 4) | 0];
        cc.fillStyle = cur; cc.globalAlpha = 0.55; cc.fillRect(wx, wy, ww * (0.2 + rnd() * 0.25), gh); cc.globalAlpha = 1;
        const ec = p.layers.emissive.ctx; ec.globalAlpha = 0.5; ec.fillStyle = '#000'; ec.fillRect(wx, wy, ww * 0.3, gh); ec.globalAlpha = 1;
      }
      // persiana enrollable
      const sh = rnd() * gh * 0.8;
      if (sh > 6) {
        p.fill(wx, wy, ww, sh, { c: ['#8a7a5c', '#6b6f73', '#a58b65', '#556b52'][(rnd() * 4) | 0], h: 0.5, r: 0.7, m: 0, e: '#000' });
        const hc = p.layers.height.ctx; const ccc = p.layers.color.ctx;
        for (let s = wy; s < wy + sh; s += 5) { hc.fillStyle = 'rgb(90,90,90)'; hc.fillRect(wx, s, ww, 1.5); ccc.fillStyle = 'rgba(0,0,0,0.25)'; ccc.fillRect(wx, s, ww, 1.2); }
        p.fill(wx - 6, wy - 12, ww + 12, 12, { c: '#d9d3c7', h: 0.7, r: 0.7 });
      }
      // alféizar o balcón
      if (balcony) {
        const by = wy + gh;
        p.fill(wx - 18, by, ww + 36, 0.16 * pxm, { c: '#cfc8bb', h: 0.85, r: 0.75 });
        const hc = p.layers.height.ctx, cc2 = p.layers.color.ctx;
        cc2.fillStyle = '#1b1d20'; hc.fillStyle = 'rgb(220,220,220)';
        cc2.fillRect(wx - 18, by - 0.95 * pxm, ww + 36, 4); hc.fillRect(wx - 18, by - 0.95 * pxm, ww + 36, 4);
        for (let rx = wx - 16; rx < wx + ww + 18; rx += 9) { cc2.fillRect(rx, by - 0.95 * pxm, 2.5, 0.95 * pxm); hc.fillRect(rx, by - 0.95 * pxm, 2.5, 0.95 * pxm); }
        p.layers.emissive.ctx.fillStyle = '#000';
        for (let rx = wx - 16; rx < wx + ww + 18; rx += 9) p.layers.emissive.ctx.fillRect(rx, by - 0.95 * pxm, 2.5, 0.95 * pxm);
      } else {
        p.fill(wx - 8, wy + gh + 4, ww + 16, 10, { c: '#d6d0c4', h: 0.8, r: 0.75 });
      }
      // goteos de suciedad bajo ventana
      const cc3 = p.layers.color.ctx; const gg = cc3.createLinearGradient(0, wy + gh, 0, wy + gh + 60);
      gg.addColorStop(0, 'rgba(60,55,45,0.25)'); gg.addColorStop(1, 'rgba(60,55,45,0)');
      cc3.fillStyle = gg; cc3.fillRect(wx, wy + gh + 14, ww, 60);
    }
  }
  return { ...p.build({ normalStrength: 3 }), tileW, tileH };
}

export function facadeBrick(seed = 13) {
  const S = 512, cols = 4, floors = 3; const tileW = 14, tileH = 9.6;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#6e3b2c', rough: 0.9 });
  const pxm = S / tileH, pxmx = S / tileW;
  const bh = 0.075 * pxm * 1.0, bw = 0.24 * pxmx;
  for (let row = 0, y = 0; y < S; row++, y += bh) {
    const off = (row % 2) * bw * 0.5;
    for (let x = -bw; x < S + bw; x += bw) {
      const t = rnd();
      const r = 100 + t * 50, g = 48 + t * 22, b = 34 + t * 14;
      p.fill(x + off + 0.8, y + 0.8, bw - 1.6, bh - 1.6, { c: `rgb(${r | 0},${g | 0},${b | 0})`, h: 0.62 + rnd() * 0.06, r: 0.85 + rnd() * 0.1 });
    }
  }
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 5, 4); const k = 0.8 + n * 0.35; px[0] = clamp255(px[0] * k); px[1] = clamp255(px[1] * k); px[2] = clamp255(px[2] * k); });
  // mortero ya visible por los huecos (base). Ventanas
  const cw = S / cols, fh = S / floors;
  for (let f = 0; f < floors; f++) {
    const y0 = S - (f + 1) * fh;
    for (let c = 0; c < cols; c++) {
      const ww = 1.4 * pxmx, wh = 1.9 * pxm; const wx = c * cw + (cw - ww) / 2, wy = y0 + fh - 0.9 * pxm - wh;
      p.fill(wx - 6, wy - 10, ww + 12, 10, { c: '#bdb4a3', h: 0.8, r: 0.8 }); // dintel
      p.fill(wx - 8, wy + wh, ww + 16, 9, { c: '#c4bba9', h: 0.85, r: 0.8 }); // alféizar
      p.fill(wx, wy, ww, wh, { c: '#2a2e2c', h: 0.3, r: 0.4 });
      p.fill(wx + 3, wy + 3, ww - 6, wh - 6, { c: '#1d2730', h: 0.18, r: 0.05, m: 0.3, e: rnd() < 0.35 ? windowLit(rnd) : '#000' });
      // cruceta
      p.fill(wx + ww / 2 - 2, wy, 4, wh, { c: '#2a2e2c', h: 0.3, r: 0.4, e: '#000' });
      p.fill(wx, wy + wh * 0.38, ww, 4, { c: '#2a2e2c', h: 0.3, r: 0.4, e: '#000' });
    }
  }
  return { ...p.build({ normalStrength: 4 }), tileW, tileH };
}

export function facadeGlass(seed = 17) {
  const S = 512, cols = 4, floors = 4; const tileW = 12, tileH = 14.4;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#4d555c', rough: 0.35, metal: 0.85 });
  const cw = S / cols, fh = S / floors; const pxm = S / tileH;
  for (let f = 0; f < floors; f++) {
    const y0 = S - (f + 1) * fh;
    const lit = rnd() < 0.55;
    for (let c = 0; c < cols; c++) {
      const tone = 0.85 + rnd() * 0.3;
      const col = `rgb(${(30 * tone) | 0},${(46 * tone) | 0},${(58 * tone) | 0})`;
      const e = lit && rnd() < 0.8 ? (rnd() < 0.7 ? '#dfe8ff' : '#fff1d6') : '#000';
      p.fill(c * cw + 3, y0 + 3, cw - 6, fh - 0.9 * pxm, { c: col, h: 0.45, r: 0.04, m: 0.95, e });
      // spandrel
      p.fill(c * cw + 3, y0 + fh - 0.9 * pxm, cw - 6, 0.9 * pxm - 3, { c: '#141a20', h: 0.45, r: 0.12, m: 0.9, e: '#000' });
      if (e !== '#000') { // luminarias de techo
        const ec = p.layers.emissive.ctx; ec.fillStyle = 'rgba(255,255,255,0.9)';
        for (let lx = c * cw + 14; lx < (c + 1) * cw - 10; lx += 28) ec.fillRect(lx, y0 + 8, 16, 3);
        ec.fillStyle = 'rgba(0,0,0,0.45)'; if (rnd() < 0.5) ec.fillRect(c * cw + rnd() * cw * 0.6, y0 + fh * 0.3, cw * 0.25, fh * 0.5);
      }
    }
  }
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 3, 3); const k = 0.9 + n * 0.2; px[0] = clamp255(px[0] * k); px[1] = clamp255(px[1] * k); px[2] = clamp255(px[2] * k); });
  return { ...p.build({ normalStrength: 2 }), tileW, tileH };
}

export function facadeOffice(seed = 19) {
  const S = 512, cols = 4, floors = 4; const tileW = 12, tileH = 13.6;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#b9b5ad', rough: 0.85 });
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 6, 5); const k = 0.82 + n * 0.3; px[0] = clamp255(185 * k); px[1] = clamp255(181 * k); px[2] = clamp255(173 * k); });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + (N.fbm(u, v, 50, 3) - 0.5) * 70; px[0] = px[1] = px[2] = c; });
  const fh = S / floors, pxm = S / tileH;
  for (let f = 0; f < floors; f++) {
    const y0 = S - (f + 1) * fh;
    const wy = y0 + 0.5 * pxm, wh = fh - 1.6 * pxm;
    p.fill(0, wy, S, wh, { c: '#26313a', h: 0.25, r: 0.05, m: 0.6 });
    const ec = p.layers.emissive.ctx;
    for (let c = 0; c < cols * 2; c++) {
      const x0 = c * S / (cols * 2);
      if (rnd() < 0.45) { ec.fillStyle = windowLit(rnd); ec.fillRect(x0, wy, S / (cols * 2), wh); }
      p.fill(x0 - 2, wy, 4, wh, { c: '#3c4146', h: 0.4, r: 0.4, m: 0.7, e: '#000' });
    }
    p.fill(0, wy + wh, S, 6, { c: '#9c978e', h: 0.7, r: 0.8 });
  }
  return { ...p.build({ normalStrength: 2.5 }), tileW, tileH };
}

export function facadeIndustrial(seed = 23) {
  const S = 512; const tileW = 8, tileH = 8;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#a9adb0', rough: 0.55, metal: 0.6 });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + Math.sin(u * Math.PI * 2 * 40) * 100; px[0] = px[1] = px[2] = c; });
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 5, 5); const rust = N.fbm(u * 6, v * 0.6, 6, 3);
    const k = 0.8 + n * 0.3; let r = 200 * k, g = 204 * k, b = 206 * k;
    if (rust > 0.6) { const t = (rust - 0.6) * 2.5; r = r * (1 - t) + 120 * t; g = g * (1 - t) + 70 * t; b = b * (1 - t) + 40 * t; }
    const dirt = Math.pow(v, 3) * 0.4; r *= 1 - dirt; g *= 1 - dirt; b *= 1 - dirt;
    px[0] = clamp255(r); px[1] = clamp255(g); px[2] = clamp255(b);
  });
  // claraboyas
  const pxm = S / tileH;
  p.fill(0, 0.6 * pxm, S, 0.8 * pxm, { c: '#5d6d75', r: 0.15, m: 0.2, h: 0.3, e: '#000' });
  for (let x = 0; x < S; x += 64) p.fill(x, 0.6 * pxm, 4, 0.8 * pxm, { c: '#30363a', h: 0.4 });
  const ec = p.layers.emissive.ctx; if (rnd() < 2) { ec.fillStyle = 'rgba(255,220,170,0.35)'; ec.fillRect(0, 0.6 * pxm, S, 0.8 * pxm); }
  return { ...p.build({ normalStrength: 3 }), tileW, tileH };
}

// Planta baja comercial: 12 m x 4.5 m (3 locales)
export function storefront(seed = 29) {
  const S = 512; const tileW = 12, tileH = 4.5;
  const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#d4cfc4', rough: 0.7 });
  const pxx = S / tileW, pxy = S / tileH;
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 5, 4); const k = 0.85 + n * 0.25; px[0] = clamp255(px[0] * k); px[1] = clamp255(px[1] * k); px[2] = clamp255(px[2] * k); });
  for (let s = 0; s < 3; s++) {
    const x0 = s * 4 * pxx;
    // pilastras de piedra
    p.fill(x0, 0, 0.35 * pxx, S, { c: '#bfb8aa', h: 0.75, r: 0.6 });
    // rótulo/fascia
    p.fill(x0 + 0.35 * pxx, 0, 3.65 * pxx, 0.9 * pxy, { c: '#2b2e33', h: 0.55, r: 0.4, m: 0.3 });
    const closed = rnd() < 0.25;
    const gx = x0 + 0.5 * pxx, gy = 1.05 * pxy, gw = 3.35 * pxx, gh = S - gy - 0.25 * pxy;
    if (closed) {
      p.fill(gx, gy, gw, gh, { c: '#8f9396', h: 0.5, r: 0.45, m: 0.7, e: '#000' });
      const hc = p.layers.height.ctx, cc = p.layers.color.ctx;
      for (let yy = gy; yy < gy + gh; yy += 6) { hc.fillStyle = 'rgb(60,60,60)'; hc.fillRect(gx, yy, gw, 2); cc.fillStyle = 'rgba(0,0,0,0.25)'; cc.fillRect(gx, yy, gw, 2); }
      // grafiti
      cc.globalAlpha = 0.7; cc.fillStyle = ['#d23c6c', '#2bb3a3', '#e9c23a'][(rnd() * 3) | 0]; cc.font = 'bold 54px sans-serif'; cc.fillText(['ZEK', 'R0X', 'VLM', 'KAOS'][(rnd() * 4) | 0], gx + 30, gy + gh * 0.6); cc.globalAlpha = 1;
    } else {
      const interior = ['#ffe2b8', '#e9f4ff', '#fff3e0', '#ffd6a0', '#d8f0ff'][(rnd() * 5) | 0];
      p.fill(gx, gy, gw, gh, { c: '#3a4148', h: 0.25, r: 0.04, m: 0.3, e: interior });
      // estanterías/productos
      const cc = p.layers.color.ctx, ec = p.layers.emissive.ctx;
      for (let k = 0; k < 40; k++) {
        const bx = gx + rnd() * gw, by = gy + gh * (0.35 + rnd() * 0.6), bw = 6 + rnd() * 18, bh = 6 + rnd() * 26;
        const col = `hsl(${rnd() * 360},${40 + rnd() * 40}%,${30 + rnd() * 40}%)`;
        cc.fillStyle = col; cc.globalAlpha = 0.6; cc.fillRect(bx, by, bw, bh); cc.globalAlpha = 1;
        ec.fillStyle = 'rgba(0,0,0,0.5)'; ec.fillRect(bx, by, bw, bh);
      }
      // puerta
      p.fill(gx + gw * 0.62, gy, 2.5, gh, { c: '#1d1f22', h: 0.4, e: '#000' });
      p.fill(gx + gw * 0.62 + 0.95 * pxx, gy, 2.5, gh, { c: '#1d1f22', h: 0.4, e: '#000' });
      p.fill(gx, gy, gw, 4, { c: '#1d1f22', h: 0.4, e: '#000' });
    }
    p.fill(x0, S - 0.25 * pxy, 4 * pxx, 0.25 * pxy, { c: '#9a958b', h: 0.7, r: 0.8, e: '#000' });
  }
  return { ...p.build({ normalStrength: 2 }), tileW, tileH };
}

export function roof(seed = 31) {
  const S = 512; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(S, S, { base: '#6c6a66', rough: 0.95, emissive: false });
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 8, 5); const g = rnd(); const c = 80 + n * 60 + g * 30; px[0] = clamp255(c); px[1] = clamp255(c - 2); px[2] = clamp255(c - 6); });
  p.pixels('height', (x, y, u, v, px) => { const c = rnd() * 255; px[0] = px[1] = px[2] = c; });
  return p.build({ normalStrength: 2 });
}

export function concrete(seed = 37) {
  const S = 512; const N = makeNoise(seed);
  const p = new Painter(S, S, { base: '#a8a59f', rough: 0.9, emissive: false });
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 6, 5); const c = 140 + n * 70; px[0] = clamp255(c); px[1] = clamp255(c - 2); px[2] = clamp255(c - 5); });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + (N.fbm(u, v, 48, 3) - 0.5) * 100; px[0] = px[1] = px[2] = c; });
  // juntas de encofrado
  p.fill(0, 0, S, 3, { h: 0.2, c: '#76726c' }); p.fill(0, 0, 3, S, { h: 0.2, c: '#76726c' });
  return p.build({ normalStrength: 2.5 });
}

export function containerTex(seed = 41) {
  const S = 256; const N = makeNoise(seed);
  const p = new Painter(S, S, { base: '#ffffff', rough: 0.6, metal: 0.5, emissive: false });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + ((Math.floor(u * 24) % 2) ? 90 : -90); px[0] = px[1] = px[2] = c; });
  p.pixels('color', (x, y, u, v, px) => { const n = N.fbm(u, v, 4, 4); const r2 = N.fbm(u * 5, v, 8, 3); const k = 0.7 + n * 0.35 - (r2 > 0.62 ? 0.25 : 0); px[0] = px[1] = px[2] = clamp255(255 * k); });
  return p.build({ normalStrength: 3 });
}

// Atlas de rótulos comerciales (2 x 8)
export const SIGN_NAMES = ['FARMACIA', 'CAFÉ LUNA', 'PANADERÍA', 'BAR EL FARO', 'ÓPTICA SOL', 'FERRETERÍA', 'LIBRERÍA', 'FRUTERÍA', 'PIZZERÍA', 'MODA ALBA', 'BANCO VALMORA', 'TELEFONÍA', 'CERVECERÍA', 'ESTANCO', 'GIMNASIO', 'HOSTAL'];
export function signAtlas() {
  const W = 1024, H = 1024; const c = mk(W, H); const ctx = c.getContext('2d');
  const palettes = [['#0c6b3f', '#ffffff'], ['#1a1a1a', '#ffcc66'], ['#7a1d1d', '#ffe9c2'], ['#0f2a4a', '#9fe3ff'], ['#2a1235', '#ff7ad9'], ['#f2efe6', '#1b1b1b'], ['#1d3b2a', '#c9ffb3'], ['#3a2a10', '#ffd27a']];
  for (let i = 0; i < 16; i++) {
    const x = (i % 2) * 512, y = Math.floor(i / 2) * 128;
    const [bg, fg] = palettes[i % palettes.length];
    ctx.fillStyle = bg; ctx.fillRect(x, y, 512, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 6; ctx.strokeRect(x + 6, y + 6, 500, 116);
    ctx.fillStyle = fg; ctx.font = 'bold 68px "Arial Narrow", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = fg; ctx.shadowBlur = 14;
    ctx.fillText(SIGN_NAMES[i], x + 256, y + 68); ctx.shadowBlur = 0;
    if (SIGN_NAMES[i] === 'FARMACIA') { ctx.fillStyle = '#2bff7a'; ctx.fillRect(x + 20, y + 44, 40, 40); }
  }
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function textPanel(text, { w = 1024, h = 256, bg = '#0b3d91', fg = '#ffffff', font = 'bold 150px Arial', border = null } = {}) {
  const c = mk(w, h); const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 6);
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Decal de luz (charco de luz de farola) y sombra de contacto
export function radial(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', S = 128, power = 1) {
  const c = mk(S, S); const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner);
  if (power !== 1) g.addColorStop(0.4, inner.replace(/[\d.]+\)$/, `${0.5})`));
  g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function smokeSprite() {
  const S = 128; const c = mk(S, S); const ctx = c.getContext('2d'); const N = makeNoise(77);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x / S - 0.5, dy = y / S - 0.5; const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const n = N.fbm(x / S, y / S, 4, 4);
    const a = Math.max(0, 1 - r) ** 1.5 * (0.5 + n);
    const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = clamp255(a * 255);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Rotulación del coche patrulla (lateral)
export function policeLivery(cityName) {
  const W = 1024, H = 256; const c = mk(W, H); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // franja de damero tipo battenberg (azul/blanco reflectante) - diseño genérico
  const sq = 32;
  for (let x = 0; x < W; x += sq) for (let r = 0; r < 2; r++) {
    ctx.fillStyle = ((x / sq + r) % 2) ? '#0a3fa8' : '#e9eef7';
    ctx.fillRect(x, 150 + r * sq, sq, sq);
  }
  ctx.fillStyle = '#0a3fa8'; ctx.font = 'bold 104px Arial Black, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('POLICÍA', W / 2, 128);
  ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#16233d'; ctx.fillText(`AYUNTAMIENTO DE ${cityName}  ·  112`, W / 2, 245);
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function plateTex(text = '4821 KMV') {
  const W = 256, H = 56; const c = mk(W, H); const ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f5f0'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1240a8'; ctx.fillRect(0, 0, 30, H);
  ctx.fillStyle = '#ffd400'; ctx.font = 'bold 12px Arial'; ctx.fillText('E', 10, 46);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  ctx.fillStyle = '#111'; ctx.font = 'bold 40px "Arial Narrow", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 143, 30);
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function waterNormal(seed = 51) {
  const S = 512; const N = makeNoise(seed);
  const p = new Painter(S, S, { color: false, orm: false, emissive: false });
  p.pixels('height', (x, y, u, v, px) => { const n = N.fbm(u, v, 8, 5); const c = n * 255; px[0] = px[1] = px[2] = c; });
  return tex(heightToNormal(p.layers.height.c, 4), false, [1, 1]);
}

export function rubber() {
  const S = 256; const p = new Painter(S, S, { base: '#161616', rough: 0.92, emissive: false });
  p.pixels('height', (x, y, u, v, px) => { const c = ((Math.floor(v * 32) + (Math.floor(u * 6) % 2)) % 2) ? 200 : 60; px[0] = px[1] = px[2] = c; });
  return p.build({ normalStrength: 2 });
}
