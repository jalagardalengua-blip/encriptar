// Plaza Mayor de fiestas: «bous al carrer» en una plaza de pueblo
//  · Casas tradicionales: planta baja de sillería de granito, fachadas encaladas o de entramado de madera,
//    balcones de forja, galerías de madera, soportales con columnas de piedra y tejados de teja árabe.
//  · Plaza cubierta de arena, cadafales (tablados) de tubo pintado con peñas, escaleras de acero azules,
//    barrera con huecos de escape, refugio central amarillo con torre y farol, y fuente de granito.
//  · Toro animado (Quaternius «Ultimate Animated Animal Pack», CC0) con IA de embestida,
//    mozos que lo citan y se refugian, y público en los cadafales.
// Se integra en la ciudad como un distrito más (City.districtOf → 'plaza').
import * as THREE from 'three';
import { mulberry32, clamp, wrapAngle, damp, CITY } from './config.js';
import { Painter, tex, heightToNormal, makeNoise, textPanel, waterNormal, radial } from './textures.js';
import { Geo, makeWet } from './city.js';
import { ASSETS } from './assets.js';
import { SkinnedChar, hasCharacters } from './people.js';

// ---------------- Distribución (metros, relativa al centro de la manzana) ----------------
const R_OUT = 32;      // fachada exterior (a la calle)
const R_IN = 20;       // fachada interior (a la plaza)
const R_CAD = 17;      // frente de cadafales y barrera
const ARENA = 16.1;    // límite de movimiento del toro
const ALLEY = 3;       // media anchura de los callejones de acceso (norte y sur)
const GF = 3.3;        // altura de la planta baja (sobre el suelo 0,15)
const FH = 2.9;        // altura de planta
const DECK = 2.45;     // cota superior del tablado de los cadafales
const REF = { x: 3, z: 5.5, ring: 5.0, steps: [4.3, 3.5, 2.7], hs: [0.28, 0.56, 0.84], tower: 0.65 };
const FOUNT = { x: -7, z: -8, r: 2.35, step: 2.95 };
const SAND_Y = 0.21;   // cota media de la arena

// ---------------- Texturas PBR procedurales ----------------
const m2 = (p, ppm, x, y, w, h, prop) => p.fill(Math.round(x * ppm), Math.round(y * ppm), Math.max(1, Math.round(w * ppm)), Math.max(1, Math.round(h * ppm)), prop);
const shade = (hexc, k) => { const c = new THREE.Color(hexc); c.multiplyScalar(k); return '#' + c.getHexString(); };

// Fachada encalada con balconeras (4 vanos × 2 plantas = 11,2 × 5,8 m)
function calFacade(seed, S, { base = '#ece7dc', shutter = '#5a3b24', timber = false, lit = 0.35 } = {}) {
  const TW = 11.2, TH = 5.8; const W = Math.round(2048 * S), H = Math.round(W * TH / TW); const ppm = W / TW;
  const N = makeNoise(seed); const rnd = mulberry32(seed + 3);
  const p = new Painter(W, H, { base, rough: 0.93 });
  const bc = new THREE.Color(base); const br = bc.r * 255, bg = bc.g * 255, bb = bc.b * 255;
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u * 2, v, 6, 5), big = N.fbm(u * 2 + 0.31, v + 0.17, 2, 3), g = rnd();
    const dirt = Math.max(0, big - 0.52) * 1.6 + (v > 0.92 ? (v - 0.92) * 2.2 : 0); // manchas y zócalo sucio
    const k = 1 - dirt * 0.45 + (n - 0.5) * 0.09 + (g - 0.5) * 0.035;
    px[0] = clamp(br * k - dirt * 6, 0, 255); px[1] = clamp(bg * k - dirt * 8, 0, 255); px[2] = clamp(bb * k - dirt * 14, 0, 255);
  });
  p.pixels('height', (x, y, u, v, px) => { const n = N.fbm(u * 2 + 0.5, v + 0.5, 24, 3); const c = 128 + (n - 0.5) * 60; px[0] = px[1] = px[2] = c; });
  p.pixels('orm', (x, y, u, v, px) => { px[1] = 225 + (N.fbm(u * 2, v, 12, 2) - 0.5) * 50; });
  const ctx = p.layers.color.ctx;
  // churretes de lluvia bajo las ventanas
  for (let fl = 0; fl < 2; fl++) for (let b = 0; b < 4; b++) {
    const cx = 1.4 + b * 2.8, fb = (fl + 1) * 2.9;
    for (let k = 0; k < 6; k++) {
      const sx = (cx - 0.55 + rnd() * 1.1) * ppm, sy = (fb - 0.05) * ppm, len = (0.4 + rnd() * 1.4) * ppm;
      const gr = ctx.createLinearGradient(0, sy, 0, sy + len); gr.addColorStop(0, 'rgba(70,60,48,0.22)'); gr.addColorStop(1, 'rgba(70,60,48,0)');
      ctx.fillStyle = gr; ctx.fillRect(sx, sy, (0.03 + rnd() * 0.06) * ppm, len);
    }
  }
  // entramado de madera (vigas a la vista)
  if (timber) {
    const wood = (x, y, w, h) => { m2(p, ppm, x, y, w, h, { c: shade('#3b2a1c', 0.85 + rnd() * 0.3), r: 0.82, h: 0.72 }); };
    for (let fl = 0; fl <= 2; fl++) wood(0, fl * 2.9 - 0.09, TW, 0.18);
    for (let b = 0; b <= 4; b++) for (let fl = 0; fl < 2; fl++) wood(b * 2.8 - 0.08, fl * 2.9, 0.16, 2.9);
    for (let b = 0; b < 4; b++) for (let fl = 0; fl < 2; fl++) { wood(b * 2.8, fl * 2.9 + 1.75, 0.38, 0.12); wood(b * 2.8 + 2.42, fl * 2.9 + 1.75, 0.38, 0.12); }
  }
  // balconeras
  for (let fl = 0; fl < 2; fl++) for (let b = 0; b < 4; b++) {
    const cx = 1.4 + b * 2.8, fb = (fl + 1) * 2.9 - 0.05; const w = 1.05, h = 2.18; const x0 = cx - w / 2, y0 = fb - h;
    // contraventanas abiertas (lamas)
    const sc = shade(shutter, 0.85 + rnd() * 0.3);
    for (const sx of [x0 - 0.56, x0 + w + 0.06]) {
      m2(p, ppm, sx, y0, 0.5, h, { c: sc, r: 0.55, h: 0.62 });
      for (let l = 0.06; l < h - 0.04; l += 0.065) m2(p, ppm, sx + 0.04, y0 + l, 0.42, 0.022, { c: shade(sc, 0.62), h: 0.56 });
    }
    // recercado de piedra
    m2(p, ppm, x0 - 0.13, y0 - 0.16, w + 0.26, h + 0.16, { c: shade('#cfc8b9', 0.92 + rnd() * 0.12), r: 0.8, h: 0.66 });
    // carpintería y vidrio
    const on = rnd() < lit;
    m2(p, ppm, x0, y0, w, h, { c: '#4a3423', r: 0.6, h: 0.5 });
    for (let col = 0; col < 2; col++) for (let row = 0; row < 4; row++) {
      const gx = x0 + 0.07 + col * 0.47, gy = y0 + 0.07 + row * 0.52;
      const wc = on ? '#3d2f22' : '#1b2127';
      m2(p, ppm, gx, gy, 0.4, 0.45, { c: wc, r: 0.06, h: 0.38, e: on ? (rnd() < 0.5 ? '#ffcf8a' : '#f6b56a') : '#000' });
    }
    // cortina interior (variación)
    if (rnd() < 0.5) m2(p, ppm, x0 + 0.07, y0 + 0.07, w - 0.14, 0.5 + rnd() * 0.6, { c: on ? '#c9a57a' : shade('#d8d2c4', 0.4), r: 0.9, h: 0.4, e: on ? '#6e4a24' : '#000' });
  }
  const t = p.build({ normalStrength: 2.4 });
  return Object.assign(t, { tileW: TW, tileH: TH });
}

// Planta baja de sillería de granito con puertas y ventanas enrejadas (11,2 × 3,15 m)
function stoneGround(seed, S) {
  const TW = 11.2, TH = 3.15; const W = Math.round(2048 * S), H = Math.round(W * TH / TW); const ppm = W / TW;
  const N = makeNoise(seed); const rnd = mulberry32(seed + 9);
  const p = new Painter(W, H, { base: '#8f897e', rough: 0.9 });
  const ctx = p.layers.color.ctx, hctx = p.layers.height.ctx;
  // sillares irregulares
  let y = 0;
  while (y < TH - 0.05) {
    let rh = 0.28 + rnd() * 0.2; if (TH - (y + rh) < 0.22) rh = TH - y;
    let x = -rnd() * 0.5;
    while (x < TW) {
      const w = 0.45 + rnd() * 0.6; const k = 0.82 + rnd() * 0.32;
      const c = new THREE.Color().setRGB(0.6 * k, 0.575 * k, 0.53 * k * (0.95 + rnd() * 0.1));
      for (const ox of [0, TW]) {
        ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect((x + ox) * ppm + 2, y * ppm + 2, w * ppm - 4, rh * ppm - 4);
        const hv = 150 + rnd() * 40; hctx.fillStyle = `rgb(${hv},${hv},${hv})`; hctx.fillRect((x + ox) * ppm + 3, y * ppm + 3, w * ppm - 6, rh * ppm - 6);
        ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect((x - TW) * ppm + 2, y * ppm + 2, w * ppm - 4, rh * ppm - 4);
        hctx.fillRect((x - TW) * ppm + 3, y * ppm + 3, w * ppm - 6, rh * ppm - 6);
      }
      x += w;
    }
    y += rh;
  }
  // grano del granito y suciedad inferior
  p.pixels('color', (x, yy, u, v, px) => {
    const g = rnd(); const n = N.fbm(u * 3, v, 10, 4);
    let k = 1 + (n - 0.5) * 0.25 + (g > 0.97 ? -0.35 : g < 0.03 ? 0.25 : 0) - (v > 0.85 ? (v - 0.85) * 1.2 : 0);
    if (N.fbm(u * 3 + 3.3, v + 1.1, 4, 3) > 0.62) { px[1] *= 1.04; k *= 0.92; } // líquenes
    px[0] = clamp(px[0] * k, 0, 255); px[1] = clamp(px[1] * k, 0, 255); px[2] = clamp(px[2] * k, 0, 255);
  });
  p.pixels('height', (x, yy, u, v, px) => { const c = px[0] + (N.fbm(u * 3, v, 30, 3) - 0.5) * 40; px[0] = px[1] = px[2] = clamp(c, 0, 255); });
  // vanos: puerta (vanos 0 y 2) y ventanas enrejadas (1 y 3)
  for (let b = 0; b < 4; b++) {
    const cx = 1.4 + b * 2.8;
    if (b % 2 === 0) {
      const w = 1.2, h = 2.35; const x0 = cx - w / 2, y0 = TH - h;
      m2(p, ppm, x0 - 0.18, y0 - 0.22, w + 0.36, h + 0.22, { c: '#b3ab9b', r: 0.85, h: 0.75 });
      const wc = ['#4a2f1c', '#3b4a35', '#5a2a1e', '#2d3640'][(rnd() * 4) | 0];
      m2(p, ppm, x0, y0, w, h, { c: wc, r: 0.7, h: 0.42 });
      for (let k = 0; k < 8; k++) m2(p, ppm, x0 + k * 0.15, y0, 0.012, h, { c: shade(wc, 0.6), h: 0.36 });
      for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) m2(p, ppm, x0 + 0.12 + k * 0.3, y0 + 0.2 + j * 0.36, 0.03, 0.03, { c: '#1a1a1a', r: 0.4, m: 0.8, h: 0.55 });
      m2(p, ppm, cx + 0.38, y0 + 1.15, 0.08, 0.05, { c: '#9a8a5a', r: 0.3, m: 1, h: 0.55 });
    } else {
      const w = 0.9, h = 1.1; const x0 = cx - w / 2, y0 = TH - 1.0 - h;
      m2(p, ppm, x0 - 0.15, y0 - 0.15, w + 0.3, h + 0.3, { c: '#b9b1a1', r: 0.85, h: 0.75 });
      const on = rnd() < 0.4;
      m2(p, ppm, x0, y0, w, h, { c: on ? '#3b2e22' : '#161b20', r: 0.08, h: 0.35, e: on ? '#e8a95e' : '#000' });
      for (let k = 1; k < 6; k++) m2(p, ppm, x0 + k * w / 6 - 0.012, y0, 0.025, h, { c: '#151515', r: 0.45, m: 0.8, h: 0.62, e: '#000' });
      for (const yy of [0.25, 0.85]) m2(p, ppm, x0, y0 + yy, w, 0.025, { c: '#151515', r: 0.45, m: 0.8, h: 0.62, e: '#000' });
    }
  }
  const t = p.build({ normalStrength: 3 });
  return Object.assign(t, { tileW: TW, tileH: TH });
}

// Teja árabe (canal y cobija), 3 × 3 m
function roofTiles(seed, S) {
  const W = Math.round(1024 * S); const ppm = W / 3; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#a5552f', rough: 0.8, emissive: false });
  const colW = 0.2, rowH = 0.42; const cols = Math.round(3 / colW), rows = Math.round(3 / rowH);
  const tint = []; for (let i = 0; i < cols * rows; i++) tint.push([0.78 + rnd() * 0.32, rnd()]);
  p.pixels('color', (x, y, u, v, px) => {
    const cu = u * cols, rv = v * rows; const ci = Math.floor(cu), ri = Math.floor(rv + (ci % 2) * 0.5) % rows;
    const [k, hue] = tint[(ri * cols + ci) % tint.length];
    const n = N.fbm(u, v, 8, 4); const lich = N.fbm(u + 7.1, v + 2.3, 6, 3);
    let r = 168 * k, g = (82 + hue * 22) * k, b = (44 + hue * 10) * k;
    const f = 1 + (n - 0.5) * 0.35; r *= f; g *= f; b *= f;
    const ty = rv + (ci % 2) * 0.5 - Math.floor(rv + (ci % 2) * 0.5); if (ty > 0.9) { r *= 0.55; g *= 0.55; b *= 0.55; } // sombra del solape
    if (lich > 0.64) { const a = Math.min(1, (lich - 0.64) * 6); r = r * (1 - a) + 150 * a; g = g * (1 - a) + 145 * a; b = b * (1 - a) + 92 * a; } // líquenes
    if (rnd() > 0.985) { r *= 0.7; g *= 0.7; b *= 0.7; }
    px[0] = clamp(r, 0, 255); px[1] = clamp(g, 0, 255); px[2] = clamp(b, 0, 255);
  });
  p.pixels('height', (x, y, u, v, px) => {
    const cu = u * cols; const ci = Math.floor(cu); const t = cu - ci; const rv = v * rows + (ci % 2) * 0.5; const ty = rv - Math.floor(rv);
    const prof = ci % 2 === 0 ? 0.55 + 0.42 * Math.sin(Math.PI * t) : 0.42 - 0.3 * Math.sin(Math.PI * t);
    const c = (prof - ty * 0.12 + (N.fbm(u, v, 40, 2) - 0.5) * 0.05) * 255; px[0] = px[1] = px[2] = clamp(c, 0, 255);
  });
  p.pixels('orm', (x, y, u, v, px) => { px[1] = 190 + N.fbm(u, v, 6, 3) * 60; });
  return p.build({ normalStrength: 5 });
}

// Arena de la plaza con huellas de pezuñas, pisadas, surcos y piedrecitas (5 × 5 m)
function sandTex(seed, S) {
  const W = Math.round(1024 * S); const ppm = W / 5; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#b39570', rough: 0.97, emissive: false });
  p.pixels('color', (x, y, u, v, px) => {
    const n = N.fbm(u, v, 6, 5), big = N.fbm(u + 0.4, v + 0.9, 2, 3), g = rnd();
    const k = 1 + (n - 0.5) * 0.22 + (big - 0.5) * 0.18 + (g - 0.5) * 0.12;
    px[0] = clamp(180 * k, 0, 255); px[1] = clamp(150 * k, 0, 255); px[2] = clamp(112 * k * (0.96 + (big - 0.5) * 0.1), 0, 255);
    if (g > 0.993) { const s = rnd() < 0.5 ? 0.55 : 1.25; px[0] *= s; px[1] *= s; px[2] *= s; }
  });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + (N.fbm(u, v, 16, 4) - 0.5) * 50 + (rnd() - 0.5) * 22; px[0] = px[1] = px[2] = clamp(c, 0, 255); });
  const hctx = p.layers.height.ctx, cctx = p.layers.color.ctx;
  const dent = (x, y, rx, ry, rot, depth, dark) => {
    for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
      hctx.save(); hctx.translate(x + ox, y + oy); hctx.rotate(rot); hctx.scale(rx, ry);
      const gr = hctx.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(0,0,0,${depth})`); gr.addColorStop(0.8, `rgba(0,0,0,${depth * 0.6})`); gr.addColorStop(1, 'rgba(255,255,255,0.18)');
      hctx.fillStyle = gr; hctx.beginPath(); hctx.arc(0, 0, 1, 0, 7); hctx.fill(); hctx.restore();
      cctx.save(); cctx.translate(x + ox, y + oy); cctx.rotate(rot); cctx.scale(rx, ry); cctx.fillStyle = `rgba(70,50,30,${dark})`; cctx.beginPath(); cctx.arc(0, 0, 1, 0, 7); cctx.fill(); cctx.restore();
    }
  };
  // pisadas
  for (let k = 0; k < 90; k++) { const a = rnd() * 6.28; dent(rnd() * W, rnd() * W, 0.05 * ppm, 0.12 * ppm, a, 0.2 + rnd() * 0.15, 0.04 + rnd() * 0.04); }
  // pezuñas (pares en media luna)
  for (let k = 0; k < 60; k++) {
    const x = rnd() * W, y = rnd() * W, a = rnd() * 6.28; const c = Math.cos(a), s = Math.sin(a);
    dent(x + c * 0.03 * ppm, y + s * 0.03 * ppm, 0.028 * ppm, 0.055 * ppm, a, 0.35, 0.07); dent(x - c * 0.03 * ppm, y - s * 0.03 * ppm, 0.028 * ppm, 0.055 * ppm, a, 0.35, 0.07);
  }
  // surcos de arrastre
  hctx.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    let x = rnd() * W, y = rnd() * W, a = rnd() * 6.28; hctx.strokeStyle = 'rgba(0,0,0,0.16)'; hctx.lineWidth = (0.04 + rnd() * 0.06) * ppm;
    hctx.beginPath(); hctx.moveTo(x, y); for (let j = 0; j < 30; j++) { a += (rnd() - 0.5) * 0.3; x += Math.cos(a) * 0.08 * ppm; y += Math.sin(a) * 0.08 * ppm; hctx.lineTo(x, y); } hctx.stroke();
  }
  return p.build({ normalStrength: 3.2 });
}

// Enlosado de granito irregular (4 × 4 m)
function pavingTex(seed, S) {
  const W = Math.round(1024 * S); const M = 4; const ppm = W / M; const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#5e5a53', rough: 0.85, emissive: false });
  const ctx = p.layers.color.ctx, h = p.layers.height.ctx, o = p.layers.orm.ctx;
  h.fillStyle = 'rgb(70,70,70)'; h.fillRect(0, 0, W, W); o.fillStyle = 'rgb(220,230,0)'; o.fillRect(0, 0, W, W);
  let y = 0;
  while (y < M - 0.01) {
    let rh = 0.45 + rnd() * 0.4; if (M - (y + rh) < 0.4) rh = M - y;
    let x = 0; const off = rnd() * M;
    while (x < M - 0.01) {
      let w = 0.6 + rnd() * 0.7; if (M - (x + w) < 0.5) w = M - x;
      const k = 0.88 + rnd() * 0.22; const c = new THREE.Color().setRGB(0.68 * k, 0.665 * k, 0.635 * k);
      const hv = 140 + rnd() * 30;
      for (const ox of [-M, 0]) {
        const X = ((x + off) % M + ox) * ppm; const pad = 0.012 * ppm;
        for (const OX of [X, X + M * ppm]) {
          ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(OX + pad, y * ppm + pad, w * ppm - 2 * pad, rh * ppm - 2 * pad);
          h.fillStyle = `rgb(${hv},${hv},${hv})`; h.fillRect(OX + pad * 1.5, y * ppm + pad * 1.5, w * ppm - 3 * pad, rh * ppm - 3 * pad);
          o.fillStyle = `rgb(${(rnd() * 120) | 0},${(185 + rnd() * 45) | 0},0)`; o.fillRect(OX + pad, y * ppm + pad, w * ppm - 2 * pad, rh * ppm - 2 * pad);
        }
      }
      x += w;
    }
    y += rh;
  }
  p.pixels('color', (x, yy, u, v, px) => {
    const g = rnd(); const n = N.fbm(u, v, 8, 4);
    const k = 1 + (n - 0.5) * 0.2 + (g > 0.975 ? -0.4 : g < 0.025 ? 0.22 : 0);
    px[0] = clamp(px[0] * k, 0, 255); px[1] = clamp(px[1] * k, 0, 255); px[2] = clamp(px[2] * k, 0, 255);
  });
  p.pixels('height', (x, yy, u, v, px) => { const c = px[0] + (N.fbm(u, v, 32, 3) - 0.5) * 30; px[0] = px[1] = px[2] = clamp(c, 0, 255); });
  return p.build({ normalStrength: 3.5 });
}

// Granito labrado (columnas, fuente, bordillos), 1,5 × 1,5 m
function graniteTex(seed, S) {
  const W = Math.round(512 * S); const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#a7a297', rough: 0.78, emissive: false });
  p.pixels('color', (x, y, u, v, px) => {
    const g = rnd(); const n = N.fbm(u, v, 4, 4); const w = N.fbm(u + 3, v + 1, 3, 3);
    const k = 1 + (n - 0.5) * 0.18 + (g > 0.94 ? -0.45 : g < 0.06 ? 0.2 : 0) - Math.max(0, w - 0.6) * 0.8;
    px[0] = clamp(167 * k, 0, 255); px[1] = clamp(162 * k, 0, 255); px[2] = clamp(151 * k, 0, 255);
  });
  p.pixels('height', (x, y, u, v, px) => { const c = 128 + (N.fbm(u, v, 24, 3) - 0.5) * 60 + (rnd() - 0.5) * 30; px[0] = px[1] = px[2] = clamp(c, 0, 255); });
  return p.build({ normalStrength: 2 });
}

// Pintura amarilla sobre hormigón, con desconchados (2 × 2 m)
function yellowPaint(seed, S) {
  const W = Math.round(512 * S); const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#e2bc3c', rough: 0.7, emissive: false });
  p.pixels('color', (x, y, u, v, px) => {
    const chip = N.fbm(u + 2, v + 5, 8, 4); const n = N.fbm(u, v, 4, 4); const g = rnd();
    if (chip > 0.76) { const k = 0.95 + (g - 0.5) * 0.2; px[0] = 150 * k; px[1] = 146 * k; px[2] = 136 * k; return; }
    const k = 1 + (n - 0.5) * 0.16 + (g - 0.5) * 0.04; px[0] = clamp(226 * k, 0, 255); px[1] = clamp(186 * k, 0, 255); px[2] = clamp(58 * k, 0, 255);
  });
  p.pixels('height', (x, y, u, v, px) => { const chip = N.fbm(u + 2, v + 5, 8, 4); const c = (chip > 0.76 ? 100 : 140) + (N.fbm(u, v, 30, 2) - 0.5) * 30; px[0] = px[1] = px[2] = c; });
  p.pixels('orm', (x, y, u, v, px) => { const chip = N.fbm(u + 2, v + 5, 8, 4); px[1] = chip > 0.76 ? 235 : 150 + N.fbm(u, v, 6, 2) * 50; });
  return p.build({ normalStrength: 2.5 });
}

// Madera envejecida (tablas), 1,5 × 1,5 m
function woodTex(seed, S) {
  const W = Math.round(512 * S); const N = makeNoise(seed); const rnd = mulberry32(seed);
  const p = new Painter(W, W, { base: '#5d4029', rough: 0.82, emissive: false });
  const planks = 10; const pk = []; for (let i = 0; i < planks; i++) pk.push(0.75 + rnd() * 0.45);
  p.pixels('color', (x, y, u, v, px) => {
    const i = Math.floor(u * planks); const t = u * planks - i; const k = pk[i];
    const grain = N.fbm(u * 0.5 + i * 0.13, v, 2, 3) * 0.5 + N.noise(u * planks * 3, v * 60, 60) * 0.5;
    let f = k * (0.85 + grain * 0.3); if (t < 0.04 || t > 0.96) f *= 0.45;
    px[0] = clamp(108 * f, 0, 255); px[1] = clamp(76 * f, 0, 255); px[2] = clamp(50 * f, 0, 255);
  });
  p.pixels('height', (x, y, u, v, px) => { const t = u * planks - Math.floor(u * planks); const c = (t < 0.04 || t > 0.96) ? 70 : 140 + (N.noise(u * planks * 3, v * 60, 60) - 0.5) * 50; px[0] = px[1] = px[2] = c; });
  return p.build({ normalStrength: 2 });
}

// ---------------- Utilidades de geometría ----------------
function quadN(G, a, b, c, d, uv, col, want) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * want[0] + ny * want[1] + nz * want[2] >= 0) G.quad(a, b, c, d, uv, col);
  else G.quad(a, d, c, b, [uv[0], uv[1], uv[6], uv[7], uv[4], uv[5], uv[2], uv[3]], col);
}
// pared vertical entre p0 y p1 con normal n
function wallN(G, p0, p1, y0, y1, tw, th, col, n, uOff = 0, vBase = y0) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const u0 = uOff, u1 = uOff + len / tw, v0 = (y0 - vBase) / th, v1 = (y1 - vBase) / th;
  quadN(G, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], [u0, v0, u1, v0, u1, v1, u0, v1], col, [n[0], 0, n[1]]);
}

// Cara de fachada: origen o (mundo), dirección a lo largo d, normal exterior n
class Face {
  constructor(ox, oz, nx, nz, len) { this.ox = ox; this.oz = oz; this.nx = nx; this.nz = nz; this.dx = nz; this.dz = -nx; this.len = len; }
  pt(s, t) { return [this.ox + this.dx * s + this.nx * t, this.oz + this.dz * s + this.nz * t]; }
  // caja alineada definida en coordenadas de cara
  box(G, s0, s1, t0, t1, y0, y1, col, sc = 1) {
    const a = this.pt(s0, t0), b = this.pt(s1, t1);
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
    G.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, sc, col);
  }
  rect(s0, s1, t0, t1) { const a = this.pt(s0, t0), b = this.pt(s1, t1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  yaw() { return Math.atan2(this.nx, this.nz); }
}

// ---------------- Personajes (animación directa) ----------------
function anim(ch, name, { loop = true, speed = 1, fade = 0.25 } = {}) {
  const act = ch.actions[name] || ch.actions.Idle; if (!act) return;
  act.timeScale = speed;
  if (ch.curName === name) return;
  ch.curName = name;
  act.reset(); act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); act.clampWhenFinished = !loop; act.enabled = true; act.setEffectiveWeight(1);
  if (ch.cur && ch.cur !== act) act.crossFadeFrom(ch.cur, fade, false);
  act.play(); ch.cur = act;
}
const SKIN = [0xf1c8a8, 0xe0ac87, 0xc68f69, 0x9c6b4a, 0xf4d3bb];
const HAIR = [0x2a1d14, 0x3b2a1e, 0x14100c, 0x6a4a2c, 0x8a6a48, 0xb8b0a5];
const SHIRT_CROWD = [0xd23a2a, 0xf2f2ee, 0x2b5aa8, 0x2f7a3a, 0xf0c419, 0xe07a1f, 0x1a1a1a, 0x8a2a6a, 0x5ab0d8, 0xffffff];
const PANTS = [0x2a3346, 0x1d1d1f, 0x5a4a38, 0x3b4f6b, 0xd8d2c4, 0x2f2f33];

// ---------------- Plaza ----------------
export class PlazaMayor {
  constructor(city, blk) {
    this.city = city; this.cx = blk.cx; this.cz = blk.cz; this.x = blk.cx; this.z = blk.cz;
    this.group = new THREE.Group(); this.group.name = 'plaza-mayor'; city.group.add(this.group);
    this.rnd = mulberry32(19620707);
    this.q = city.q; this.S = this.q.aniso <= 2 ? 0.5 : 1;
    this.obst = [];     // obstáculos para el toro: {type:'rect'|'circle', ...} en coordenadas locales
    this.escapes = [];  // refugios para los mozos: {path:[[x,z],[x,z]]} locales
    this.specSpots = []; // posiciones del público
    this.lanterns = [];
    this.build();
  }

  L(x, z) { return [this.cx + x, this.cz + z]; }

  build() {
    this.makeMaterials();
    this.G = {}; for (const k of Object.keys(this.M)) this.G[k] = new Geo();
    this.buildGround();
    this.buildHouses();
    this.buildCadafals();
    this.buildRefuge();
    this.buildFountain();
    this.buildStairs();
    this.buildDecor();
    for (const [k, g] of Object.entries(this.G)) {
      if (!g.n) continue;
      const mesh = new THREE.Mesh(g.build(), this.M[k]); mesh.name = 'plaza-' + k;
      mesh.castShadow = !['paving', 'glow', 'sand'].includes(k); mesh.receiveShadow = k !== 'glow';
      this.group.add(mesh);
    }
    this.G = null;
  }

  makeMaterials() {
    const S = this.S; const c = this.city;
    const T = this.T = {
      cal1: calFacade(101, S, { base: '#eeeae1', shutter: '#5a3b24', lit: 0.35 }),
      cal2: calFacade(202, S, { base: '#ecdcb8', shutter: '#38573a', lit: 0.3 }),
      cal3: calFacade(303, S, { base: '#f0ece4', shutter: '#4a3424', timber: true, lit: 0.4 }),
      stone: stoneGround(404, S), roof: roofTiles(505, S), sand: sandTex(606, S), paving: pavingTex(707, S),
      granite: graniteTex(808, S), yellow: yellowPaint(909, S), wood: woodTex(1001, S),
    };
    const std = (t, extra = {}) => new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.orm, roughness: 1, metalness: 0, vertexColors: true, ...extra });
    const M = this.M = {};
    for (const k of ['cal1', 'cal2', 'cal3']) { M[k] = std(T[k], { emissive: new THREE.Color(1, 1, 1), emissiveMap: T[k].emissiveMap, emissiveIntensity: 0 }); c.nightMats.push({ m: M[k], day: 0, night: 1.0 }); }
    M.stone = std(T.stone, { emissive: new THREE.Color(1, 1, 1), emissiveMap: T.stone.emissiveMap, emissiveIntensity: 0 }); c.nightMats.push({ m: M.stone, day: 0, night: 0.9 });
    M.roof = std(T.roof);
    M.sand = makeWet(std(T.sand)); M.sand.normalScale = new THREE.Vector2(1.2, 1.2);
    M.paving = makeWet(std(T.paving));
    M.granite = std(T.granite); M.graniteLathe = std(T.granite, { vertexColors: false, color: 0xd8d4cc, side: THREE.DoubleSide }); M.yellow = std(T.yellow); M.wood = std(T.wood);
    M.iron = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.75, vertexColors: true });
    M.paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.35, vertexColors: true });
    M.fabric = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true, side: THREE.DoubleSide });
    M.glow = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
    this.glowMat = M.glow;
  }

  // ---------- Suelo: enlosado y arena ----------
  buildGround() {
    const { cx, cz } = this; const Gp = this.G.paving;
    Gp.top(cx - 36, cz - 36, cx + 36, cz + 36, 0.157, 4, [1, 1, 1]);
    // arena con relieve suave (más acumulada junto a las barreras) y manchas de agua
    const n = 64, E = R_IN; const g = new THREE.PlaneGeometry(E * 2, E * 2, n, n); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, uv = g.attributes.uv; const N = makeNoise(4242); const col = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const edge = Math.max(Math.abs(x), Math.abs(z));
      const pile = edge > R_CAD - 1.5 && edge < R_CAD + 0.4 ? 0.05 : 0;
      const y = SAND_Y + (N.fbm(x / 40 + 0.5, z / 40 + 0.5, 4, 3) - 0.5) * 0.06 + pile - (edge > R_IN - 0.05 ? 0.012 : 0);
      pos.setY(i, y); uv.setXY(i, (cx + x) / 5, -(cz + z) / 5);
      const wet = N.fbm(x / 30 + 3.3, z / 30 + 7.1, 3, 3); const fd = Math.hypot(x - FOUNT.x, z - FOUNT.z);
      let k = 1 - Math.max(0, wet - 0.58) * 1.6 - (fd < 6 ? (6 - fd) / 6 * 0.28 : 0);
      if (edge > R_CAD - 0.2) k *= 0.92;
      col.push(k, k * 0.98, k * 0.95);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals(); g.translate(cx, 0, cz);
    const sand = new THREE.Mesh(g, this.M.sand); sand.receiveShadow = true; sand.name = 'plaza-arena'; this.group.add(sand);
  }

  // ---------- Casas ----------
  buildHouses() {
    const rnd = this.rnd; const { cx, cz } = this;
    const styles = ['cal1', 'cal1', 'cal2', 'cal3', 'cal1', 'cal2', 'cal3'];
    const tints = [[1, 1, 1], [1, 0.98, 0.95], [0.98, 0.96, 0.92], [1, 0.97, 0.9], [0.97, 0.97, 0.97]];
    const widths = [5.6, 8.4, 8.4, 11.2];
    // lados: n = normal hacia la plaza; los lotes N/S abarcan todo el lado, E/O sólo el tramo interior
    const sides = [
      { key: 'N', nx: 0, nz: 1, ranges: [[-R_OUT, -ALLEY], [ALLEY, R_OUT]] },
      { key: 'S', nx: 0, nz: -1, ranges: [[-R_OUT, -ALLEY], [ALLEY, R_OUT]] },
      { key: 'W', nx: 1, nz: 0, ranges: [[-R_IN, R_IN]] },
      { key: 'E', nx: -1, nz: 0, ranges: [[-R_IN, R_IN]] },
    ];
    for (const sd of sides) for (const [a0, a1] of sd.ranges) {
      let a = a0;
      while (a < a1 - 0.1) {
        let w = widths[(rnd() * widths.length) | 0]; if (a1 - (a + w) < 4.5) w = a1 - a;
        this.house(sd, a, a + w, styles[(rnd() * styles.length) | 0], tints[(rnd() * tints.length) | 0]);
        a += w;
      }
    }
    void cx; void cz;
  }

  // a0..a1: tramo a lo largo del eje paralelo a la fachada (x para N/S, z para E/O)
  house(sd, a0, a1, style, tint) {
    const rnd = this.rnd; const G = this.G; const { cx, cz } = this;
    const floors = rnd() < 0.3 ? 1 : rnd() < 0.85 ? 2 : 3;
    const H = 0.15 + GF + floors * FH;
    const ns = sd.nx !== 0; // fachada interior mirando a ±x (lados E/O)
    // caja del edificio en coordenadas mundo
    let x0, x1, z0, z1;
    if (!ns) { x0 = cx + a0; x1 = cx + a1; z0 = sd.nz > 0 ? cz - R_OUT : cz + R_IN; z1 = sd.nz > 0 ? cz - R_IN : cz + R_OUT; }
    else { z0 = cz + a0; z1 = cz + a1; x0 = sd.nx > 0 ? cx - R_OUT : cx + R_IN; x1 = sd.nx > 0 ? cx - R_IN : cx + R_OUT; }
    const arcade = sd.key === 'N' && rnd() < 0.85; // soportales en el lado norte
    const AD = 2.6;
    // caras: [p0, p1, normal, tipo]
    const faces = [
      { p0: [x0, z1], p1: [x1, z1], n: [0, 1] }, { p0: [x1, z0], p1: [x0, z0], n: [0, -1] },
      { p0: [x1, z1], p1: [x1, z0], n: [1, 0] }, { p0: [x0, z0], p1: [x0, z1], n: [-1, 0] },
    ];
    const isInner = (f) => f.n[0] === sd.nx && f.n[1] === sd.nz;
    const up = style; const uT = this.T[up], sT = this.T.stone;
    for (const f of faces) {
      let p0 = f.p0, p1 = f.p1;
      if (arcade && isInner(f)) {
        // planta baja retranqueada bajo los soportales
        const back = [p0[0] - f.n[0] * AD, p0[1] - f.n[1] * AD], back1 = [p1[0] - f.n[0] * AD, p1[1] - f.n[1] * AD];
        wallN(G.stone, back, back1, 0.15, GF + 0.15, sT.tileW, sT.tileH, [1, 1, 1], f.n, 0, 0.15);
        // techo de madera del soportal
        const c0 = [back[0], GF + 0.15, back[1]], c1 = [back1[0], GF + 0.15, back1[1]];
        quadN(G.wood, c0, c1, [p1[0], GF + 0.15, p1[1]], [p0[0], GF + 0.15, p0[1]], [0, 0, 6, 0, 6, 1.7, 0, 1.7], [0.8, 0.8, 0.8], [0, -1, 0]);
      } else wallN(G.stone, p0, p1, 0.15, GF + 0.15, sT.tileW, sT.tileH, [1, 1, 1], f.n, 0, 0.15);
      wallN(G[up], p0, p1, GF + 0.15, H, uT.tileW, uT.tileH, tint, f.n, 0, GF + 0.15);
      // zócalo
      const zc = [0.72, 0.7, 0.66];
      if (!(arcade && isInner(f))) { const ex = [f.n[0] * 0.04, f.n[1] * 0.04]; wallN(G.granite, [p0[0] + ex[0], p0[1] + ex[1]], [p1[0] + ex[0], p1[1] + ex[1]], 0.15, 0.55, 1.5, 1.5, zc, f.n); }
      // impostas (línea de forjado)
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const fc = new Face(p0[0], p0[1], f.n[0], f.n[1], len);
      fc.box(G.granite, 0, len, -0.02, 0.09, GF + 0.12, GF + 0.3, [0.85, 0.83, 0.79]);
    }
    // colisión
    if (arcade) {
      const back = sd.nz > 0 ? z1 - AD : z0 + AD;
      this.city.addCollider(x0, z0, x1, sd.nz > 0 ? back : z1, H);
      // columnas de granito con zapatas de madera
      const n = Math.max(2, Math.round((x1 - x0) / 3.2));
      for (let k = 0; k <= n; k++) {
        const x = x0 + 0.25 + (x1 - x0 - 0.5) * (k / n); const z = z1 - 0.3;
        if (x < cx - R_IN + 0.3 || x > cx + R_IN - 0.3) continue;
        this.G.granite.box(x, 0.15 + 0.15, z, 0.55, 0.3, 0.55, 1.5, [0.8, 0.78, 0.74]);
        this.column(x, z, 2.55);
        this.G.wood.box(x, 3.21, z, 0.9, 0.18, 0.4, 1.5, [0.75, 0.72, 0.7]);
        this.city.addCollider(x - 0.22, z - 0.22, x + 0.22, z + 0.22, GF, 'pole');
      }
      this.G.wood.box((x0 + x1) / 2, 3.375, z1 - 0.3, x1 - x0, 0.25, 0.32, 1.5, [0.7, 0.66, 0.62]);
      this.arcadeSpots = this.arcadeSpots || []; this.arcadeSpots.push([x0, x1, z1 - AD, z1]);
    } else this.city.addCollider(x0, z0, x1, z1, H);
    // tejado a dos aguas (cumbrera paralela a la fachada interior)
    this.roof(x0, z0, x1, z1, H, ns ? 'z' : 'x', style === 'cal3' ? 0.85 : 0.55);
    // chimenea
    if (rnd() < 0.5) { const fx = x0 + (x1 - x0) * (0.25 + rnd() * 0.5), fz = z0 + (z1 - z0) * (0.3 + rnd() * 0.4); this.G.granite.box(fx, H + 2.2, fz, 0.7, 2.6, 0.7, 1.5, [1.05, 1.03, 1.0]); this.G.roof.box(fx, H + 3.55, fz, 0.95, 0.14, 0.95, 3, [0.9, 0.9, 0.9]); }
    // balcones y galerías en la fachada interior (sólo tramo visible) y en la exterior
    const innerF = faces.find(isInner);
    const outerF = faces.find((f) => f.n[0] === -sd.nx && f.n[1] === -sd.nz);
    for (const [f, isIn] of [[innerF, true], [outerF, false]]) {
      const len = Math.hypot(f.p1[0] - f.p0[0], f.p1[1] - f.p0[1]);
      const fc = new Face(f.p0[0], f.p0[1], f.n[0], f.n[1], len);
      const vis = (s) => { const [x, z] = fc.pt(s, 0); return isIn ? Math.abs(x - cx) < R_IN - 0.4 && Math.abs(z - cz) < R_IN - 0.4 : true; };
      for (let fl = 0; fl < floors; fl++) {
        const yb = GF + 0.15 + fl * FH;
        if (style === 'cal3' && isIn && len > 5) this.gallery(fc, 0.15, len - 0.15, yb, vis);
        else for (let s = 1.4; s < len - 0.7; s += 2.8) { if (!vis(s)) continue; if (rnd() < (isIn ? 0.85 : 0.45)) this.balcony(fc, s, yb, rnd() < 0.3 ? 2.4 : 1.6); }
      }
      // farol de pared y macetas
      if (isIn) for (let s = 2.8; s < len - 1; s += 5.6) { if (!vis(s)) continue; if (rnd() < 0.55) this.lantern(fc, s, GF + 0.15 + 0.9 - (arcade ? 0 : 0.3), arcade ? 0.25 : 0); }
    }
  }

  column(x, z, h) {
    const g = new THREE.CylinderGeometry(0.17, 0.2, h, 14, 1); const G = this.G.granite;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv; const idx = g.index.array;
    const base = G.n;
    for (let i = 0; i < pos.count; i++) {
      G.pos.push(pos.getX(i) + x, pos.getY(i) + 0.45 + h / 2, pos.getZ(i) + z); G.nor.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      G.uv.push(uv.getX(i) * 0.8, uv.getY(i) * h / 1.5); G.col.push(0.86, 0.84, 0.8);
    }
    for (let i = 0; i < idx.length; i++) G.idx.push(base + idx[i]); G.n += pos.count;
    this.G.granite.box(x, 0.45 + h + 0.06, z, 0.48, 0.12, 0.48, 1.5, [0.85, 0.83, 0.79]);
  }

  roof(x0, z0, x1, z1, H, axis, ov) {
    const G = this.G.roof, W = this.G.wood; const pitch = 0.42; const g = 0.25;
    const col = [0.92 + this.rnd() * 0.1, 0.92, 0.92];
    if (axis === 'x') {
      const zm = (z0 + z1) / 2, rise = (z1 - z0) / 2 * pitch, yR = H + rise, yE = H - ov * pitch;
      const len = x1 - x0 + 2 * g, sl = Math.hypot((z1 - z0) / 2 + ov, rise + ov * pitch);
      quadN(G, [x0 - g, yE, z1 + ov], [x1 + g, yE, z1 + ov], [x1 + g, yR, zm], [x0 - g, yR, zm], [0, 0, len / 3, 0, len / 3, sl / 3, 0, sl / 3], col, [0, 1, 1]);
      quadN(G, [x1 + g, yE, z0 - ov], [x0 - g, yE, z0 - ov], [x0 - g, yR, zm], [x1 + g, yR, zm], [0, 0, len / 3, 0, len / 3, sl / 3, 0, sl / 3], col, [0, 1, -1]);
      // aleros (sofito de madera) y cumbrera
      quadN(W, [x0 - g, yE - 0.02, z1 + ov], [x1 + g, yE - 0.02, z1 + ov], [x1 + g, H, z1], [x0 - g, H, z1], [0, 0, len / 1.5, 0, len / 1.5, 0.5, 0, 0.5], [0.7, 0.7, 0.7], [0, -1, 0]);
      quadN(W, [x0 - g, yE - 0.02, z0 - ov], [x1 + g, yE - 0.02, z0 - ov], [x1 + g, H, z0], [x0 - g, H, z0], [0, 0, len / 1.5, 0, len / 1.5, 0.5, 0, 0.5], [0.7, 0.7, 0.7], [0, -1, 0]);
      W.box((x0 + x1) / 2, yE - 0.07, z1 + ov - 0.04, len, 0.14, 0.08, 1.5, [0.6, 0.6, 0.6]); W.box((x0 + x1) / 2, yE - 0.07, z0 - ov + 0.04, len, 0.14, 0.08, 1.5, [0.6, 0.6, 0.6]);
      G.box((x0 + x1) / 2, yR + 0.05, zm, len, 0.16, 0.32, 3, [0.85, 0.85, 0.85]);
      // hastiales
      const C = this.G.cal1; const uv = [0.22, 0, 0.28, 0, 0.25, 0.45, 0.25, 0.45];
      quadN(C, [x0, H, z0], [x0, H, z1], [x0, yR, zm], [x0, yR, zm], uv, [0.95, 0.94, 0.92], [-1, 0, 0]);
      quadN(C, [x1, H, z1], [x1, H, z0], [x1, yR, zm], [x1, yR, zm], uv, [0.95, 0.94, 0.92], [1, 0, 0]);
    } else {
      const xm = (x0 + x1) / 2, rise = (x1 - x0) / 2 * pitch, yR = H + rise, yE = H - ov * pitch;
      const len = z1 - z0 + 2 * g, sl = Math.hypot((x1 - x0) / 2 + ov, rise + ov * pitch);
      quadN(G, [x1 + ov, yE, z0 - g], [x1 + ov, yE, z1 + g], [xm, yR, z1 + g], [xm, yR, z0 - g], [0, 0, len / 3, 0, len / 3, sl / 3, 0, sl / 3], col, [1, 1, 0]);
      quadN(G, [x0 - ov, yE, z1 + g], [x0 - ov, yE, z0 - g], [xm, yR, z0 - g], [xm, yR, z1 + g], [0, 0, len / 3, 0, len / 3, sl / 3, 0, sl / 3], col, [-1, 1, 0]);
      quadN(W, [x1 + ov, yE - 0.02, z0 - g], [x1 + ov, yE - 0.02, z1 + g], [x1, H, z1 + g], [x1, H, z0 - g], [0, 0, len / 1.5, 0, len / 1.5, 0.5, 0, 0.5], [0.7, 0.7, 0.7], [0, -1, 0]);
      quadN(W, [x0 - ov, yE - 0.02, z0 - g], [x0 - ov, yE - 0.02, z1 + g], [x0, H, z1 + g], [x0, H, z0 - g], [0, 0, len / 1.5, 0, len / 1.5, 0.5, 0, 0.5], [0.7, 0.7, 0.7], [0, -1, 0]);
      W.box(x1 + ov - 0.04, yE - 0.07, (z0 + z1) / 2, 0.08, 0.14, len, 1.5, [0.6, 0.6, 0.6]); W.box(x0 - ov + 0.04, yE - 0.07, (z0 + z1) / 2, 0.08, 0.14, len, 1.5, [0.6, 0.6, 0.6]);
      G.box(xm, yR + 0.05, (z0 + z1) / 2, 0.32, 0.16, len, 3, [0.85, 0.85, 0.85]);
      const C = this.G.cal1; const uv = [0.22, 0, 0.28, 0, 0.25, 0.45, 0.25, 0.45];
      quadN(C, [x1, H, z0], [x0, H, z0], [xm, yR, z0], [xm, yR, z0], uv, [0.95, 0.94, 0.92], [0, 0, -1]);
      quadN(C, [x0, H, z1], [x1, H, z1], [xm, yR, z1], [xm, yR, z1], uv, [0.95, 0.94, 0.92], [0, 0, 1]);
    }
  }

  // balcón de forja con losa de piedra
  balcony(fc, s, yb, w) {
    const G = this.G; const d = 0.62; const ir = [0.09, 0.09, 0.1];
    fc.box(G.granite, s - w / 2, s + w / 2, 0, d, yb - 0.02, yb + 0.1, [0.82, 0.8, 0.76]);
    fc.box(G.iron, s - w / 2 + 0.02, s + w / 2 - 0.02, d - 0.04, d - 0.01, yb + 1.0, yb + 1.04, ir);
    fc.box(G.iron, s - w / 2 + 0.02, s + w / 2 - 0.02, d - 0.04, d - 0.01, yb + 0.16, yb + 0.19, ir);
    for (let k = 0; k <= Math.round(w / 0.12); k++) { const ss = s - w / 2 + 0.04 + k * ((w - 0.08) / Math.round(w / 0.12)); fc.box(G.iron, ss - 0.008, ss + 0.008, d - 0.035, d - 0.02, yb + 0.1, yb + 1.0, ir); }
    for (const e of [-1, 1]) { const ss = s + e * (w / 2 - 0.03); fc.box(G.iron, ss - 0.012, ss + 0.012, 0.02, d - 0.02, yb + 1.0, yb + 1.04, ir); for (let k = 1; k < 5; k++) fc.box(G.iron, ss - 0.008, ss + 0.008, k * d / 5 - 0.008, k * d / 5 + 0.008, yb + 0.1, yb + 1.0, ir); }
    // macetas con geranios
    if (this.rnd() < 0.45) for (let k = 0; k < 3; k++) {
      const ss = s - w / 2 + 0.3 + k * (w - 0.6) / 2; fc.box(G.paint, ss - 0.12, ss + 0.12, d - 0.2, d - 0.04, yb + 0.1, yb + 0.28, [0.55, 0.25, 0.14]);
      fc.box(G.fabric, ss - 0.16, ss + 0.16, d - 0.24, d + 0.02, yb + 0.28, yb + 0.48, this.rnd() < 0.6 ? [0.75, 0.05, 0.08] : [0.1, 0.32, 0.08]);
    }
  }

  // galería corrida de madera (casas de entramado)
  gallery(fc, s0, s1, yb, vis) {
    const G = this.G; const d = 0.95; const wc = [0.85, 0.8, 0.75];
    let a = s0; while (a < s1 && !vis(a)) a += 0.2; let b = s1; while (b > a && !vis(b)) b -= 0.2;
    if (b - a < 1) return;
    fc.box(G.wood, a, b, 0, d, yb - 0.04, yb + 0.1, wc);
    fc.box(G.wood, a, b, d - 0.1, d, yb + 0.98, yb + 1.06, wc);
    fc.box(G.wood, a, b, d - 0.09, d - 0.01, yb + 0.14, yb + 0.22, wc);
    for (let s = a + 0.05; s <= b; s += 0.16) fc.box(G.wood, s - 0.025, s + 0.025, d - 0.08, d - 0.03, yb + 0.22, yb + 0.98, wc);
    for (let s = a; s <= b + 0.01; s += 1.4) { fc.box(G.wood, s - 0.07, s + 0.07, d - 0.14, d, yb + 0.1, yb + FH - 0.05, wc); }
    // canes bajo la galería
    for (let s = a + 0.3; s < b; s += 0.7) fc.box(G.wood, s - 0.06, s + 0.06, 0, d - 0.05, yb - 0.2, yb - 0.04, [0.6, 0.55, 0.5]);
    // macetas
    for (let s = a + 0.6; s < b - 0.3; s += 1.1 + this.rnd()) if (this.rnd() < 0.5) fc.box(G.fabric, s - 0.18, s + 0.18, d - 0.02, d + 0.14, yb + 0.85, yb + 1.12, this.rnd() < 0.6 ? [0.78, 0.06, 0.1] : [0.9, 0.3, 0.5]);
  }

  lantern(fc, s, y, t) {
    const G = this.G; const ir = [0.06, 0.06, 0.065];
    fc.box(G.iron, s - 0.03, s + 0.03, t, t + 0.55, y + 0.62, y + 0.66, ir);
    fc.box(G.iron, s - 0.03, s + 0.03, t, t + 0.04, y + 0.3, y + 0.7, ir);
    fc.box(G.iron, s - 0.14, s + 0.14, t + 0.38, t + 0.66, y + 0.52, y + 0.6, ir);
    fc.box(G.glow, s - 0.1, s + 0.1, t + 0.42, t + 0.62, y + 0.2, y + 0.52, [1, 0.78, 0.45]);
    fc.box(G.iron, s - 0.13, s + 0.13, t + 0.39, t + 0.65, y + 0.16, y + 0.2, ir);
    const [x, z] = fc.pt(s, t + 0.52); this.lanterns.push({ x, z, y: y + 0.36 });
  }

  // ---------- Cadafales, barrera y público ----------
  buildCadafals() {
    const { cx, cz } = this; const rnd = this.rnd;
    const paints = [[0.12, 0.3, 0.75], [0.1, 0.45, 0.22], [0.72, 0.08, 0.06], [0.95, 0.72, 0.08], [0.92, 0.92, 0.9], [0.9, 0.35, 0.05], [0.25, 0.55, 0.85]];
    const names = ['PENYA EL BOU', 'LA TRONADA', 'ELS XICS', 'EL RACÓ', 'PENYA MIGJORN', 'LA CORDA', 'ELS DE SEMPRE', 'PENYA LA TRACA', 'EL CORRAL', 'LA SOGA', 'ELS BOUERS', 'PENYA EL TORIL'];
    const bannerCols = [['#c8102e', '#ffffff'], ['#ffffff', '#1d3f8f'], ['#f2c200', '#1a1a1a'], ['#0f5c2e', '#ffffff'], ['#1a1a1a', '#f2c200'], ['#ffffff', '#c8102e']];
    let ni = 0;
    // caras interiores (origen en la esquina, a lo largo de la fachada, normal hacia la plaza)
    const W = new Face(cx - R_IN, cz + R_IN, 1, 0, 2 * R_IN);   // oeste: d = (0,-1)
    const E = new Face(cx + R_IN, cz - R_IN, -1, 0, 2 * R_IN);  // este: d = (0, 1)
    const S = new Face(cx + R_IN, cz + R_IN, 0, -1, 2 * R_IN);  // sur: d = (-1,0)
    const Nf = new Face(cx - R_IN, cz - R_IN, 0, 1, 2 * R_IN);  // norte: d = (1,0)
    const modules = [];
    for (const [f, ranges] of [[W, [[R_IN - R_CAD, R_IN + R_CAD]]], [E, [[R_IN - R_CAD, R_IN + R_CAD]]], [S, [[0, R_IN - ALLEY], [R_IN + ALLEY, 2 * R_IN]]]]) {
      for (const [a0, a1] of ranges) {
        let a = a0;
        while (a < a1 - 0.5) { let w = 4 + ((rnd() * 3) | 0) * 1.5; if (a1 - (a + w) < 3) w = a1 - a; modules.push({ f, s0: a, s1: a + w }); a += w; }
      }
    }
    this.cadModules = modules;
    for (const m of modules) {
      const col = paints[(rnd() * paints.length) | 0];
      const banner = rnd() < 0.6 ? { text: names[ni++ % names.length], c: bannerCols[(rnd() * bannerCols.length) | 0] } : null;
      this.cadafal(m.f, m.s0, m.s1, col, banner, rnd() < 0.35);
    }
    // barrera de tubo en el lado norte (delante de los soportales) y en el callejón sur
    this.barrier(Nf, 0.3, 2 * R_IN - 0.3, [0.85, 0.12, 0.08]);
    this.barrier(S, R_IN - ALLEY, R_IN + ALLEY, [0.1, 0.3, 0.75]);
    // remates laterales de los callejones
    void cz;
  }

  cadafal(f, s0, s1, col, banner, awning) {
    const G = this.G; const t0 = 0.05, t1 = R_IN - R_CAD; const y0 = 0.15; const P = 0.09; const posts = [];
    for (let s = s0; s <= s1 + 0.01; s += (s1 - s0) / Math.max(1, Math.round((s1 - s0) / 2))) posts.push(s);
    const top = awning ? 5.0 : DECK + 1.05;
    for (const s of posts) for (const t of [t0 + P / 2, t1 - P / 2]) {
      const ss = clamp(s, s0 + P / 2, s1 - P / 2);
      f.box(G.paint, ss - P / 2, ss + P / 2, t - P / 2, t + P / 2, y0, t > 1 ? top : (awning ? 5.3 : top), col);
    }
    // tablado
    f.box(G.wood, s0, s1, t0, t1, DECK - 0.08, DECK, [0.9, 0.85, 0.8]);
    f.box(G.paint, s0, s1, t1 - 0.12, t1, DECK - 0.22, DECK - 0.08, col);
    // jaula inferior: barrotes con hueco de escape central
    const mid = (s0 + s1) / 2; const gap = 0.45;
    for (let s = s0 + 0.2; s < s1 - 0.1; s += 0.26) {
      if (Math.abs(s - mid) < gap) continue;
      f.box(G.paint, s - 0.03, s + 0.03, t1 - 0.08, t1 - 0.02, y0, DECK - 0.22, col);
    }
    for (const y of [0.45, 1.25, 2.0]) {
      f.box(G.paint, s0, mid - gap, t1 - 0.1, t1 - 0.03, y, y + 0.06, col); f.box(G.paint, mid + gap, s1, t1 - 0.1, t1 - 0.03, y, y + 0.06, col);
    }
    // colisión del frente (con hueco de escape)
    const [ax0, az0, ax1, az1] = f.rect(s0, mid - gap, t1 - 0.1, t1); this.city.addCollider(ax0, az0, ax1, az1, 2.3, 'barrier');
    const [bx0, bz0, bx1, bz1] = f.rect(mid + gap, s1, t1 - 0.1, t1); this.city.addCollider(bx0, bz0, bx1, bz1, 2.3, 'barrier');
    this.escapes.push({ out: this.toLocal(f.pt(mid, t1 + 0.9)), gate: this.toLocal(f.pt(mid, t1 - 0.05)), in: this.toLocal(f.pt(mid + (this.rnd() - 0.5) * 0.8, t1 - 1.2)) });
    // barandilla superior
    f.box(G.paint, s0, s1, t1 - 0.06, t1, DECK + 1.0, DECK + 1.06, col);
    f.box(G.paint, s0, s1, t1 - 0.06, t1, DECK + 0.5, DECK + 0.55, col);
    for (const s of [s0 + 0.03, s1 - 0.03]) f.box(G.paint, s - 0.03, s + 0.03, t0, t1, DECK + 1.0, DECK + 1.06, col);
    if (banner) {
      const tx = textPanel(banner.text, { w: 1024, h: 160, bg: banner.c[0], fg: banner.c[1], font: 'bold 96px Arial Black, Arial' });
      const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.75, side: THREE.DoubleSide });
      const wdt = Math.min(s1 - s0 - 0.3, 5.2);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wdt, 0.78), mat);
      const [x, z] = f.pt(mid, t1 + 0.02); mesh.position.set(x, DECK + 0.6, z); mesh.rotation.y = f.yaw(); mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh);
    }
    // toldo de lona
    if (awning) {
      const c = [[0.1, 0.5, 0.2], [0.85, 0.85, 0.82], [0.75, 0.1, 0.08], [0.15, 0.3, 0.7]][(this.rnd() * 4) | 0];
      const a = f.pt(s0, t0), b = f.pt(s1, t0), cc = f.pt(s1, t1 + 0.2), d = f.pt(s0, t1 + 0.2);
      quadN(G.fabric, [a[0], 5.35, a[1]], [b[0], 5.35, b[1]], [cc[0], 4.95, cc[1]], [d[0], 4.95, d[1]], [0, 0, 1, 0, 1, 1, 0, 1], c, [0, 1, 0]);
      for (let s = s0; s < s1; s += 0.5) { const p = f.pt(s, t1 + 0.2), q = f.pt(Math.min(s1, s + 0.5), t1 + 0.2); quadN(G.fabric, [p[0], 4.95, p[1]], [q[0], 4.95, q[1]], [(p[0] + q[0]) / 2, 4.7, (p[1] + q[1]) / 2], [(p[0] + q[0]) / 2, 4.7, (p[1] + q[1]) / 2], [0, 0, 1, 0, 0.5, 1, 0.5, 1], c, [f.nx, 0, f.nz]); }
    }
    // público: en el tablado y en la jaula
    for (let s = s0 + 0.5; s < s1 - 0.4; s += 0.75 + this.rnd() * 0.5) {
      if (this.rnd() < 0.8) this.specSpots.push({ p: f.pt(s, t1 - 0.45 - this.rnd() * 0.5), y: DECK, yaw: f.yaw() + (this.rnd() - 0.5) * 0.5, deck: true });
      if (this.rnd() < 0.3 && Math.abs(s - mid) > 0.6) this.specSpots.push({ p: f.pt(s, t1 - 0.5 - this.rnd() * 0.8), y: SAND_Y, yaw: f.yaw() + (this.rnd() - 0.5) * 0.6, deck: false });
    }
  }

  toLocal([x, z]) { return [x - this.cx, z - this.cz]; }

  barrier(f, s0, s1, col) {
    const G = this.G; const t = R_IN - R_CAD; const h = 1.45;
    const gaps = []; for (let s = s0 + 2.5; s < s1 - 1.5; s += 6) gaps.push(s);
    if (!gaps.length) gaps.push((s0 + s1) / 2);
    const segs = []; let a = s0; for (const g of gaps) { segs.push([a, g - 0.42]); a = g + 0.42; } segs.push([a, s1]);
    for (const [a0, a1] of segs) {
      if (a1 - a0 < 0.1) continue;
      for (const y of [0.4, 0.9, h]) f.box(G.paint, a0, a1, t - 0.05, t, y, y + 0.06, col);
      for (let s = a0; s <= a1 + 0.01; s += 1.5) { const ss = Math.min(s, a1 - 0.04); f.box(G.paint, ss - 0.04, ss + 0.04, t - 0.08, t + 0.02, 0.15, h + 0.06, col); }
      const [x0, z0, x1, z1] = f.rect(a0, a1, t - 0.08, t + 0.02); this.city.addCollider(x0, z0, x1, z1, h, 'barrier');
    }
    for (const g of gaps) this.escapes.push({ out: this.toLocal(f.pt(g, t + 0.9)), gate: this.toLocal(f.pt(g, t - 0.05)), in: this.toLocal(f.pt(g + (this.rnd() - 0.5), t - 1.3)) });
    // terraza de café detrás de la barrera norte
    if (f.nz > 0) {
      for (let s = s0 + 2; s < s1 - 2; s += 4.5) {
        if (this.rnd() < 0.3) continue;
        const [x, z] = f.pt(s, t - 1.5); this.table(x, z);
        if (this.rnd() < 0.6) { const [px, pz] = f.pt(s, t - 1.5); this.parasol(px, pz); }
      }
    }
  }

  table(x, z) {
    const G = this.G; const al = [0.75, 0.76, 0.78];
    G.iron.box(x, 0.88, z, 0.7, 0.03, 0.7, 1, al); G.iron.box(x, 0.52, z, 0.05, 0.72, 0.05, 1, al); G.iron.box(x, 0.17, z, 0.45, 0.03, 0.45, 1, al);
    for (const [dx, dz] of [[0.6, 0], [-0.6, 0], [0, 0.6]]) {
      const sx = x + dx, sz = z + dz; G.iron.box(sx, 0.6, sz, 0.42, 0.04, 0.42, 1, al);
      for (const [ex, ez] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) G.iron.box(sx + ex, 0.38, sz + ez, 0.025, 0.44, 0.025, 1, al);
      const bx = dx ? sx + Math.sign(dx) * 0.2 : sx, bz = dz ? sz + Math.sign(dz) * 0.2 : sz; G.iron.box(bx, 0.85, bz, dx ? 0.03 : 0.42, 0.45, dx ? 0.42 : 0.03, 1, al);
    }
    this.city.addCollider(x - 0.38, z - 0.38, x + 0.38, z + 0.38, 0.9, 'pole');
  }

  parasol(x, z) {
    const G = this.G; G.iron.box(x, 1.4, z, 0.05, 2.5, 0.05, 1, [0.85, 0.85, 0.85]);
    const r = 1.35, y = 2.6, n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      quadN(G.fabric, [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x, y + 0.45, z], [x, y + 0.45, z], [0, 0, 1, 0, 0.5, 1, 0.5, 1], [0.96, 0.95, 0.92], [0, 1, 0]);
      quadN(G.fabric, [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x + Math.cos(a1) * r, y - 0.18, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y - 0.18, z + Math.sin(a0) * r], [0, 0, 1, 0, 1, 1, 0, 1], [0.94, 0.93, 0.9], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]);
    }
  }

  // ---------- Refugio central amarillo con torre y farol ----------
  buildRefuge() {
    const G = this.G.yellow; const { cx, cz } = this; const X = cx + REF.x, Z = cz + REF.z; const Y = [1, 1, 1];
    const R = REF.ring, th = 0.28, h = 1.15, op = 0.85;
    // muro perimetral con 4 accesos y esquinas achaflanadas
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = nz, az = -nx; // a lo largo
      for (const sgn of [-1, 1]) {
        const a0 = op * sgn, a1 = (R - 1.0) * sgn;
        const p0 = [X + nx * R + ax * a0, Z + nz * R + az * a0], p1 = [X + nx * R + ax * a1, Z + nz * R + az * a1];
        const x0 = Math.min(p0[0], p1[0]) - (nx ? th / 2 : 0), x1 = Math.max(p0[0], p1[0]) + (nx ? th / 2 : 0);
        const z0 = Math.min(p0[1], p1[1]) - (nz ? th / 2 : 0), z1 = Math.max(p0[1], p1[1]) + (nz ? th / 2 : 0);
        G.box((x0 + x1) / 2, 0.15 + h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, 2, Y);
        this.G.granite.box((x0 + x1) / 2, 0.15 + h + 0.04, (z0 + z1) / 2, x1 - x0 + 0.06, 0.08, z1 - z0 + 0.06, 1.5, [0.9, 0.88, 0.84]);
        this.city.addCollider(x0, z0, x1, z1, h, 'barrier');
      }
    }
    // chaflanes (muro diagonal)
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const p0 = [X + sx * R, Z + sz * (R - 1.0)], p1 = [X + sx * (R - 1.0), Z + sz * R];
      const n = [sx, sz]; const nl = Math.hypot(n[0], n[1]); const nn = [n[0] / nl, n[1] / nl];
      const o = [nn[0] * th / 2, nn[1] * th / 2];
      wallN(G, [p0[0] + o[0], p0[1] + o[1]], [p1[0] + o[0], p1[1] + o[1]], 0.15, 0.15 + h, 2, 2, Y, nn);
      wallN(G, [p1[0] - o[0], p1[1] - o[1]], [p0[0] - o[0], p0[1] - o[1]], 0.15, 0.15 + h, 2, 2, Y, [-nn[0], -nn[1]]);
      quadN(G, [p0[0] + o[0], 0.15 + h, p0[1] + o[1]], [p1[0] + o[0], 0.15 + h, p1[1] + o[1]], [p1[0] - o[0], 0.15 + h, p1[1] - o[1]], [p0[0] - o[0], 0.15 + h, p0[1] - o[1]], [0, 0, 1, 0, 1, 0.2, 0, 0.2], Y, [0, 1, 0]);
      const cxm = (p0[0] + p1[0]) / 2, czm = (p0[1] + p1[1]) / 2; this.city.addCollider(cxm - 0.6, czm - 0.6, cxm + 0.6, czm + 0.6, h, 'barrier');
    }
    // gradas escalonadas
    REF.steps.forEach((s, i) => {
      const y = 0.15 + REF.hs[i];
      G.box(X, (0.15 + y) / 2, Z, s * 2, y - 0.15, s * 2, 2, i % 2 ? [0.96, 0.95, 0.93] : Y);
      this.G.granite.box(X, y + 0.02, Z, s * 2 + 0.04, 0.05, s * 2 + 0.04, 1.5, [0.88, 0.86, 0.82]);
    });
    // torre con cornisa y farol
    const T = REF.tower, y0 = 0.15 + REF.hs[2], ty = 4.6;
    G.box(X, (y0 + ty) / 2, Z, T * 2, ty - y0, T * 2, 2, Y);
    this.G.granite.box(X, ty + 0.1, Z, T * 2 + 0.3, 0.2, T * 2 + 0.3, 1.5, [0.9, 0.88, 0.84]);
    G.box(X, ty + 0.4, Z, T * 2 - 0.2, 0.4, T * 2 - 0.2, 2, Y);
    const I = this.G.iron, ir = [0.06, 0.06, 0.065];
    I.box(X, ty + 0.95, Z, 0.08, 0.7, 0.08, 1, ir);
    I.box(X, ty + 1.32, Z, 0.42, 0.06, 0.42, 1, ir);
    this.G.glow.box(X, ty + 1.62, Z, 0.32, 0.5, 0.32, 1, [1, 0.8, 0.5]);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) I.box(X + dx * 0.18, ty + 1.62, Z + dz * 0.18, 0.03, 0.56, 0.03, 1, ir);
    I.box(X, ty + 1.93, Z, 0.5, 0.06, 0.5, 1, ir); I.box(X, ty + 2.05, Z, 0.2, 0.18, 0.2, 1, ir);
    this.lanterns.push({ x: X, z: Z, y: ty + 1.62, big: true });
    this.city.addCollider(X - T, Z - T, X + T, Z + T, ty, 'pole');
    this.obst.push({ type: 'rect', x0: REF.x - R - 0.3, z0: REF.z - R - 0.3, x1: REF.x + R + 0.3, z1: REF.z + R + 0.3 });
    // accesos al refugio para los mozos
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      this.escapes.push({ out: [REF.x + nx * (R + 1.2), REF.z + nz * (R + 1.2)], gate: [REF.x + nx * R, REF.z + nz * R], in: [REF.x + nx * (R - 0.9) + nz * (this.rnd() - 0.5) * 2, REF.z + nz * (R - 0.9) + nx * (this.rnd() - 0.5) * 2], refuge: true });
    }
    // gente subida al refugio
    for (let k = 0; k < 7; k++) { const a = this.rnd() * Math.PI * 2, r = 2.2 + this.rnd() * 1.8; const lx = REF.x + Math.cos(a) * r, lz = REF.z + Math.sin(a) * r; this.specSpots.push({ p: this.L(lx, lz), y: this.groundAt(this.cx + lx, this.cz + lz), yaw: Math.atan2(Math.cos(a), Math.sin(a)) + (this.rnd() - 0.5), deck: false, refuge: true }); }
  }

  // ---------- Fuente de granito ----------
  buildFountain() {
    const { cx, cz } = this; const X = cx + FOUNT.x, Z = cz + FOUNT.z;
    const M = this.M.graniteLathe;
    const lathe = (pts, seg = 40) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 1.2); return g; };
    // grada, pilón, fuste, taza y remate
    const parts = [
      lathe([[0, 0.15], [FOUNT.step, 0.15], [FOUNT.step, 0.33], [FOUNT.r + 0.05, 0.33], [FOUNT.r + 0.05, 0.36]]),
      lathe([[FOUNT.r - 0.25, 0.42], [FOUNT.r - 0.25, 0.95], [FOUNT.r - 0.2, 1.0], [FOUNT.r + 0.02, 1.0], [FOUNT.r + 0.08, 0.95], [FOUNT.r + 0.08, 0.4], [FOUNT.r, 0.34]], 48),
      lathe([[0, 0.4], [0.42, 0.4], [0.42, 0.62], [0.3, 0.7], [0.24, 1.0], [0.21, 1.8], [0.26, 1.9], [0.3, 1.95]], 24),
      lathe([[0.25, 1.95], [0.7, 2.05], [0.88, 2.2], [0.9, 2.3], [0.8, 2.3], [0.72, 2.22], [0.2, 2.18]], 32),
      lathe([[0, 2.18], [0.16, 2.18], [0.14, 2.4], [0.2, 2.55], [0.22, 2.7], [0.15, 2.85], [0.06, 2.95], [0.09, 3.02], [0, 3.1]], 20),
    ];
    for (const g of parts) { const m = new THREE.Mesh(g, M); m.position.set(X, 0, Z); m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
    // agua
    const wn = waterNormal(77); wn.repeat.set(2, 2);
    this.fountainWater = new THREE.MeshStandardMaterial({ color: 0x23383a, roughness: 0.04, metalness: 0.1, normalMap: wn, normalScale: new THREE.Vector2(0.4, 0.4), transparent: true, opacity: 0.88, envMapIntensity: 1.5 });
    const w = new THREE.Mesh(new THREE.CircleGeometry(FOUNT.r - 0.27, 40), this.fountainWater); w.rotation.x = -Math.PI / 2; w.position.set(X, 0.86, Z); w.receiveShadow = true; this.group.add(w);
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.74, 24), this.fountainWater); w2.rotation.x = -Math.PI / 2; w2.position.set(X, 2.22, Z); this.group.add(w2);
    // caños de agua (cuatro chorros en arco)
    this.jetMat = new THREE.MeshStandardMaterial({ color: 0xdfeef0, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4; const c = Math.cos(a), s = Math.sin(a);
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(X + c * (0.86 + t * 0.55), 2.24 - t * t * 1.35, Z + s * (0.86 + t * 0.55))); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.022, 6), this.jetMat); this.group.add(m);
    }
    this.city.addCollider(X - FOUNT.r - 0.1, Z - FOUNT.r - 0.1, X + FOUNT.r + 0.1, Z + FOUNT.r + 0.1, 1.0, 'fountain');
    this.obst.push({ type: 'circle', x: FOUNT.x, z: FOUNT.z, r: FOUNT.step + 0.7 });
  }

  // ---------- Escaleras de acero azules hasta los cadafales ----------
  buildStairs() {
    const { cx, cz } = this; const stairs = [{ x: R_CAD, z: -9, dir: -1 }, { x: -R_CAD, z: 9, dir: 1 }];
    const blue = [0.1, 0.32, 0.72]; const G = this.G;
    for (const st of stairs) {
      const run = 5.6, w = 1.3, n = 12; const x1 = st.x, x0 = st.x + st.dir * run; // x1 en el cadafal, x0 en la arena
      const X = (a) => cx + a, Z = (b) => cz + b;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t; const y = 0.15 + (DECK - 0.15) * ((i + 1) / n) - 0.025;
        G.wood.box(X(x), y, Z(st.z), run / n + 0.05, 0.05, w, 1.5, [0.75, 0.7, 0.65]);
      }
      // largueros (zancas) con paneles publicitarios
      for (const side of [-1, 1]) {
        const zz = st.z + side * (w / 2 + 0.05);
        const a = [X(x0), 0.15, Z(zz)], b = [X(x1), DECK, Z(zz)];
        for (const dy of [0, 0.25]) quadN(G.paint, [a[0], a[1] + dy - 0.25, a[2]], [b[0], b[1] + dy - 0.25, b[2]], [b[0], b[1] + dy, b[2]], [a[0], a[1] + dy, a[2]], [0, 0, 1, 0, 1, 1, 0, 1], blue, [0, 0, side]);
        quadN(G.paint, [a[0], a[1] + 0.92, a[2]], [b[0], b[1] + 0.92, b[2]], [b[0], b[1] + 0.98, b[2]], [a[0], a[1] + 0.98, a[2]], [0, 0, 1, 0, 1, 1, 0, 1], blue, [0, 0, side]);
        for (let i = 0; i <= 4; i++) { const t = i / 4; const x = x0 + (x1 - x0) * t; G.paint.box(X(x), 0.15 + DECK * t + 0.5, Z(zz), 0.06, 1.0, 0.06, 1, blue); }
        // panel «FESTES 2026»
        const tx = textPanel(side < 0 ? 'FESTES PATRONALS 2026' : 'BOUS AL CARRER', { w: 1024, h: 128, bg: '#ffffff', fg: '#1d3f8f', font: 'bold 74px Arial' });
        const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 });
        const len = Math.hypot(run, DECK); const pm = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.8, 0.3), mat);
        pm.position.set(X((x0 + x1) / 2), (0.15 + DECK) / 2 + 0.55, Z(zz + side * 0.035)); pm.rotation.order = 'YXZ'; pm.rotation.y = side > 0 ? 0 : Math.PI; pm.rotation.z = Math.atan2(DECK, run) * (st.dir < 0 ? 1 : -1) * (side > 0 ? 1 : -1);
        this.group.add(pm);
      }
      const [ax0, ax1] = [Math.min(x0, x1), Math.max(x0, x1)];
      this.city.addCollider(X(ax0), Z(st.z - w / 2 - 0.1), X(ax1), Z(st.z + w / 2 + 0.1), DECK, 'barrier');
      this.obst.push({ type: 'rect', x0: ax0 - 0.4, z0: st.z - w / 2 - 0.6, x1: ax1 + 0.4, z1: st.z + w / 2 + 0.6 });
    }
  }

  // ---------- Decoración: banderines y charcos de luz ----------
  buildDecor() {
    const { cx, cz } = this; const rnd = this.rnd;
    const lines = [];
    for (const k of [-1.4, 0.2, 1.6]) { lines.push([[cx - R_IN, cz + k * 8], [cx + R_IN, cz + k * 8 + 2]]); lines.push([[cx + k * 8, cz - R_IN], [cx + k * 8 - 2, cz + R_IN]]); }
    const flags = [];
    for (const [a, b] of lines) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.floor(len / 0.34);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const sag = Math.sin(Math.PI * t) * 1.2; flags.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: 7.0 - sag, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2 }); }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.26, 0], 3)); fg.computeVertexNormals();
    const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
    const im = new THREE.InstancedMesh(fg, fm, flags.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1); const c = new THREE.Color();
    const fc = [0xc8102e, 0xf2c200, 0xffffff, 0x1d6f3a, 0x1d3f8f, 0xe06a10];
    flags.forEach((f, i) => { e.set((rnd() - 0.5) * 0.4, f.yaw, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(f.x, f.y, f.z), q, one); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(fc[i % fc.length])); });
    im.castShadow = true; this.group.add(im); this.flags = { im, list: flags };
    // cuerdas
    const cord = [];
    for (const [a, b] of lines) for (let i = 0; i < 24; i++) { const t0 = i / 24, t1 = (i + 1) / 24; const p = (t) => [a[0] + (b[0] - a[0]) * t, 7.02 - Math.sin(Math.PI * t) * 1.2, a[1] + (b[1] - a[1]) * t]; cord.push(...p(t0), ...p(t1)); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cord, 3));
    this.group.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x333333 })));
    // charcos de luz de los faroles
    const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
    this.decalMat = new THREE.MeshBasicMaterial({ map: radial('rgba(255,214,160,0.9)', 'rgba(255,214,160,0)', 128), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
    const dm = new THREE.InstancedMesh(dg, this.decalMat, this.lanterns.length);
    this.lanterns.forEach((l, i) => { const s = l.big ? 16 : 7; m4.compose(new THREE.Vector3(l.x, 0.2, l.z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s)); dm.setMatrixAt(i, m4); });
    dm.renderOrder = 2; this.group.add(dm); this.fxObjects = [dm];
  }

  // Altura del suelo transitable dentro de la plaza (null = fuera)
  groundAt(x, z) {
    const lx = x - this.cx, lz = z - this.cz;
    if (Math.abs(lx) > R_IN || Math.abs(lz) > R_IN) return null;
    const rx = Math.abs(lx - REF.x), rz = Math.abs(lz - REF.z); const m = Math.max(rx, rz);
    if (m < REF.ring) { for (let i = REF.steps.length - 1; i >= 0; i--) if (m < REF.steps[i]) return 0.15 + REF.hs[i] + 0.02; }
    return SAND_Y;
  }

  // ---------------- Vida: toro, mozos y público ----------------
  spawnLife() {
    if (this.life) return; this.life = true;
    const rnd = mulberry32(777);
    this.people = [];
    const skinned = hasCharacters();
    const q = this.q; const low = q.aniso <= 2;
    // público
    if (skinned) {
      const spots = this.specSpots.slice(); for (let i = spots.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
      const nSpec = Math.min(spots.length, low ? 14 : 34);
      const models = ['Casual_Male', 'Casual_Female', 'Casual2_Male', 'Casual3_Female', 'Casual_Male', 'Worker_Male', 'Casual_Female'];
      for (let i = 0; i < nSpec; i++) {
        const sp = spots[i]; const colors = this.colors(rnd);
        const ch = new SkinnedChar(models[(rnd() * models.length) | 0], colors, 0.92 + rnd() * 0.14);
        ch.root.position.set(sp.p[0], sp.y, sp.p[1]); ch.root.rotation.y = sp.yaw;
        ch.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.group.add(ch.root);
        this.people.push({ ch, kind: 'spec', t: rnd() * 5, cheer: 0, acc: 0, lod: i % 4 });
        ch.mixer.update(rnd() * 3);
      }
      // mozos en la arena
      const nRun = low ? 4 : 7;
      for (let i = 0; i < nRun; i++) {
        const colors = this.colors(rnd, true);
        const ch = new SkinnedChar(rnd() < 0.85 ? (rnd() < 0.5 ? 'Casual_Male' : 'Casual2_Male') : 'Casual_Female', colors, 0.95 + rnd() * 0.1);
        ch.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.group.add(ch.root);
        const p = { ch, kind: 'runner', x: (rnd() - 0.5) * 24, z: (rnd() - 0.5) * 24, h: rnd() * 6, state: 'wander', t: 0, tx: 0, tz: 0, speed: 0, acc: 0, lod: i % 2, path: null, hitT: 0 };
        this.pushOut(p, 0.4); this.pickWander(p, rnd); this.people.push(p);
      }
    }
    // toro
    const A = ASSETS.animals && ASSETS.animals.bull;
    if (A) {
      const root = new THREE.Group(); const inner = A.scene; inner.scale.setScalar(A.scale); inner.position.y = -A.footY * A.scale; root.add(inner);
      this.group.add(root);
      const mixer = new THREE.AnimationMixer(inner); const actions = {}; for (const [n, c] of Object.entries(A.clips)) actions[n] = mixer.clipAction(c);
      this.bull = { root, mixer, actions, x: 6, z: -4, h: 0, speed: 0, state: 'idle', t: 2, target: null, curName: null, hitDone: false, cur: null };
      anim(this.bull, 'Idle');
    }
    this.rndLife = rnd;
  }

  colors(rnd, runner = false) {
    const c = (a) => new THREE.Color(a[(rnd() * a.length) | 0]);
    const shirt = runner ? new THREE.Color([0xf4f4f0, 0xd42a1e, 0xf4f4f0, 0x1d3f8f][(rnd() * 4) | 0]) : c(SHIRT_CROWD);
    const pants = runner ? new THREE.Color([0xf0f0ea, 0x2a3346, 0x3b4f6b][(rnd() * 3) | 0]) : c(PANTS);
    return { Shirt: shirt, Pants: pants, Black: pants, Skin: c(SKIN), Hair: c(HAIR), Belt: new THREE.Color(runner ? 0xc8102e : 0x1a1410), Vest: shirt };
  }

  // ¿un punto local está dentro de la arena y fuera de los refugios?
  exposed(lx, lz) {
    if (Math.abs(lx) > R_CAD - 0.15 || Math.abs(lz) > R_CAD - 0.15) return false;
    if (Math.max(Math.abs(lx - REF.x), Math.abs(lz - REF.z)) < REF.ring - 0.1) return false;
    return true;
  }

  pushOut(p, r) {
    const lim = ARENA + 0.6 - r;
    p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
    for (const o of this.obst) {
      if (o.type === 'circle') { const dx = p.x - o.x, dz = p.z - o.z; const d = Math.hypot(dx, dz); if (d < o.r + r && d > 1e-3) { p.x = o.x + dx / d * (o.r + r); p.z = o.z + dz / d * (o.r + r); return true; } }
      else {
        const qx = clamp(p.x, o.x0, o.x1), qz = clamp(p.z, o.z0, o.z1); let dx = p.x - qx, dz = p.z - qz; const d = Math.hypot(dx, dz);
        if (d < r) {
          if (d < 1e-4) { const l = p.x - o.x0, rr = o.x1 - p.x, t = p.z - o.z0, b = o.z1 - p.z; const m = Math.min(l, rr, t, b); if (m === l) p.x = o.x0 - r; else if (m === rr) p.x = o.x1 + r; else if (m === t) p.z = o.z0 - r; else p.z = o.z1 + r; }
          else { p.x = qx + dx / d * r; p.z = qz + dz / d * r; }
          return true;
        }
      }
    }
    return false;
  }

  pickWander(p, rnd) {
    for (let k = 0; k < 12; k++) {
      const x = (rnd() - 0.5) * 28, z = (rnd() - 0.5) * 28; const t = { x, z };
      if (!this.pushOut(t, 0.6)) { p.tx = x; p.tz = z; return; }
    }
    p.tx = 0; p.tz = -12;
  }

  // vector de evitación de obstáculos para el toro
  steer(b, hx, hz) {
    let ax = 0, az = 0; const look = 3.2;
    const px = b.x + hx * look, pz = b.z + hz * look;
    for (const o of this.obst) {
      let ox, oz, r;
      if (o.type === 'circle') { ox = o.x; oz = o.z; r = o.r; } else { ox = clamp(px, o.x0, o.x1); oz = clamp(pz, o.z0, o.z1); r = 0; }
      const dx = px - ox, dz = pz - oz; const d = Math.hypot(dx, dz) - r;
      if (d < 2.2) { const k = (2.2 - Math.max(0, d)) / 2.2; const l = Math.hypot(dx, dz) || 1; ax += dx / l * k * 2; az += dz / l * k * 2; }
    }
    const lim = ARENA - 1.5;
    if (px > lim) ax -= (px - lim); if (px < -lim) ax += (-lim - px); if (pz > lim) az -= (pz - lim); if (pz < -lim) az += (-lim - pz);
    return [ax, az];
  }

  update(dt, ctx = {}) {
    const cam = ctx.cam; const night = ctx.night || 0;
    // faroles y agua
    const on = night > 0.35 ? 1 : 0;
    this.glowMat.color.setRGB(1, 0.85, 0.6).multiplyScalar(on ? 9 : 0.5);
    this.decalMat.opacity = on ? 0.28 : 0;
    if (this.fountainWater) { this.fountainWater.normalMap.offset.x += dt * 0.03; this.fountainWater.normalMap.offset.y += dt * 0.021; }
    const dCam = cam ? Math.hypot(cam.x - this.cx, cam.z - this.cz) : 0;
    if (dCam > 220) { this.group.visible = dCam < 2000; this.setLifeVisible(false); return; }
    this.group.visible = true;
    if (!this.life) this.spawnLife();
    this.setLifeVisible(dCam < 170);
    if (dCam > 170) return;
    const rnd = this.rndLife; const b = this.bull;
    // jugador expuesto en la arena
    const pl = ctx.player; let plL = null;
    if (pl) { const lx = pl.x - this.cx, lz = pl.z - this.cz; if (this.exposed(lx, lz)) plL = { x: lx, z: lz, player: true }; }
    const runners = this.people.filter((p) => p.kind === 'runner');
    if (b) this.updateBull(b, dt, rnd, runners, plL, ctx);
    // mozos
    for (const p of runners) this.updateRunner(p, dt, rnd, b, dCam);
    // público: anima cuando el toro embiste
    const excite = b && (b.state === 'charge' || b.state === 'attack') ? 1 : 0;
    for (const p of this.people) {
      if (p.kind !== 'spec') continue;
      p.t -= dt;
      if (p.t <= 0) { p.t = 1.5 + rnd() * 4; const cheer = excite ? rnd() < 0.7 : rnd() < 0.12; anim(p.ch, cheer ? 'Victory' : 'Idle', { speed: cheer ? 0.9 + rnd() * 0.4 : 0.8 + rnd() * 0.4, fade: 0.4 }); }
      if (excite && p.ch.curName === 'Idle' && rnd() < dt * 1.5) { anim(p.ch, 'Victory', { speed: 1 }); p.t = 1.5 + rnd() * 2; }
      this.tickAnim(p, dt, cam);
    }
    // sonido del público
    if (ctx.audio && ctx.audio.ctx && b) {
      const charging = b.state === 'charge';
      if (charging && !b.cheered && dCam < 80) { b.cheered = true; const a = ctx.audio; const v = clamp(1 - dCam / 80, 0, 1); a.oneShot(a.white, 'bandpass', 900, 0.6, 0.12 * v, 0.25, 1.6); a.oneShot(a.brown, 'lowpass', 600, 0.7, 0.4 * v, 0.3, 1.8); }
      if (!charging) b.cheered = false;
    }
  }

  setLifeVisible(v) {
    if (this.lifeVisible === v) return; this.lifeVisible = v;
    if (this.bull) this.bull.root.visible = v;
    for (const p of this.people || []) p.ch.root.visible = v;
  }

  tickAnim(p, dt, cam) {
    p.acc += dt;
    const pos = p.ch.root.position; const d2 = cam ? (pos.x - cam.x) ** 2 + (pos.z - cam.z) ** 2 : 0;
    const every = d2 < 40 * 40 ? 1 : d2 < 80 * 80 ? 2 : 4;
    this.frame = (this.frame || 0) + 1;
    if ((this.frame + p.lod) % every === 0) { p.ch.mixer.update(p.acc); p.acc = 0; }
    p.ch.body.castShadow = d2 < 45 * 45;
  }

  updateBull(b, dt, rnd, runners, plL, ctx) {
    b.t -= dt;
    const targets = runners.filter((r) => r.state !== 'safe' && r.state !== 'enter' && this.exposed(r.x, r.z)).map((r) => ({ x: r.x, z: r.z, r }));
    if (plL) targets.push(plL);
    const hx = Math.sin(b.h), hz = Math.cos(b.h);
    const near = (maxD, cone = -1) => {
      let best = null, bd = maxD;
      for (const t of targets) { const dx = t.x - b.x, dz = t.z - b.z; const d = Math.hypot(dx, dz); if (d < bd && (dx * hx + dz * hz) / (d || 1) > cone) { bd = d; best = t; } }
      return best;
    };
    let want = 0, turn = 1.2;
    if (b.state === 'idle' || b.state === 'walk') {
      const prey = near(plL ? 13 : 11, -0.2);
      const pChance = prey && prey.player ? 1.6 : 0.55;
      if (prey && rnd() < dt * pChance) { b.state = 'paw'; b.t = 0.9 + rnd() * 0.6; b.target = prey; anim(b, 'Idle_Headlow', { speed: 1.2 }); }
      else if (b.t <= 0) {
        if (b.state === 'idle') { b.state = 'walk'; b.t = 3 + rnd() * 4; const tt = { x: (rnd() - 0.5) * 26, z: (rnd() - 0.5) * 26 }; b.wx = tt.x; b.wz = tt.z; anim(b, 'Walk'); }
        else { b.state = 'idle'; b.t = 2 + rnd() * 3; anim(b, ['Idle', 'Idle_2', 'Idle_Headlow'][(rnd() * 3) | 0]); }
      }
      if (b.state === 'walk') {
        const dx = b.wx - b.x, dz = b.wz - b.z; const d = Math.hypot(dx, dz);
        if (d < 1.5) { b.state = 'idle'; b.t = 1.5 + rnd() * 2; anim(b, 'Idle'); } else { this.turnTo(b, Math.atan2(dx, dz), 1.4, dt); want = 1.5; }
      } else if (b.target === null) { const prey2 = near(20); if (prey2) this.turnTo(b, Math.atan2(prey2.x - b.x, prey2.z - b.z), 0.6, dt); }
    } else if (b.state === 'paw') {
      const t = b.target; if (t) this.turnTo(b, Math.atan2(t.x - b.x, t.z - b.z), 2.4, dt);
      if (b.t <= 0) { b.state = 'charge'; b.t = 3.6 + rnd(); anim(b, 'Gallop'); }
    } else if (b.state === 'charge') {
      let t = b.target;
      if (t && t.r) { if (!this.exposed(t.r.x, t.r.z) || t.r.state === 'safe') t = b.target = null; else { t.x = t.r.x; t.z = t.r.z; } }
      if (t && t.player) { if (plL) { t.x = plL.x; t.z = plL.z; } else t = b.target = null; }
      want = 8.6; turn = 1.5;
      if (t) {
        const dx = t.x - b.x, dz = t.z - b.z; const d = Math.hypot(dx, dz);
        this.turnTo(b, Math.atan2(dx, dz), turn, dt);
        if (d < 1.9 && (dx * hx + dz * hz) / (d || 1) > 0.5) { b.state = 'attack'; b.t = 1.0; b.hitDone = false; anim(b, 'Attack_Headbutt', { loop: false, speed: 1.3, fade: 0.12 }); }
      }
      if (b.t <= 0 || !t) { b.state = 'idle'; b.t = 2.2 + rnd() * 2; b.target = null; anim(b, rnd() < 0.5 ? 'Idle_Headlow' : 'Idle'); }
    } else if (b.state === 'attack') {
      want = 1.2;
      if (!b.hitDone && b.t < 0.7) {
        b.hitDone = true; const t = b.target;
        if (t) {
          const dx = t.x - b.x, dz = t.z - b.z; const d = Math.hypot(dx, dz);
          if (d < 2.6) {
            if (t.player) ctx.onPlayerHit?.(Math.sin(b.h), Math.cos(b.h));
            else if (t.r) { t.r.state = 'hit'; t.r.hitT = 1.1; t.r.vx = Math.sin(b.h) * 4.5; t.r.vz = Math.cos(b.h) * 4.5; anim(t.r.ch, 'RecieveHit', { loop: false, speed: 1.1, fade: 0.1 }); }
          }
        }
      }
      if (b.t <= 0) { b.state = 'idle'; b.t = 2 + rnd() * 2; b.target = null; anim(b, 'Idle_Headlow'); }
    } else if (b.state === 'bump') {
      if (b.t <= 0) { b.state = 'idle'; b.t = 1.5 + rnd(); anim(b, 'Idle'); }
    }
    // dinámica
    b.speed = damp(b.speed, want, want > b.speed ? 2.2 : 4, dt);
    const fx = Math.sin(b.h), fz = Math.cos(b.h);
    const [ax, az] = this.steer(b, fx, fz);
    if (ax || az) { const desired = Math.atan2(fx + ax, fz + az); this.turnTo(b, desired, 2.6, dt); }
    const px = b.x, pz = b.z;
    b.x += Math.sin(b.h) * b.speed * dt; b.z += Math.cos(b.h) * b.speed * dt;
    const bumped = this.pushOut(b, 1.0);
    if (bumped && b.state === 'charge' && b.speed > 5) { b.state = 'bump'; b.t = 1.2; b.target = null; b.speed = 0; anim(b, rnd() < 0.5 ? 'Idle_HitReact_Left' : 'Idle_HitReact_Right', { loop: false, fade: 0.1 }); ctx.onBullBump?.(this.cx + b.x, this.cz + b.z); }
    void px; void pz;
    // empujar a los mozos que estén pegados al toro
    for (const r of runners) { const dx = r.x - b.x, dz = r.z - b.z; const d = Math.hypot(dx, dz); if (d < 1.2 && d > 1e-3) { r.x = b.x + dx / d * 1.2; r.z = b.z + dz / d * 1.2; } }
    // animación
    if (b.curName === 'Gallop') b.actions.Gallop.timeScale = clamp(b.speed / 7, 0.6, 1.4);
    if (b.curName === 'Walk') b.actions.Walk.timeScale = clamp(b.speed / 1.5, 0.5, 1.3);
    b.root.position.set(this.cx + b.x, SAND_Y - 0.02, this.cz + b.z); b.root.rotation.y = b.h;
    b.mixer.update(dt);
  }

  turnTo(o, ang, rate, dt) { o.h += clamp(wrapAngle(ang - o.h), -rate * dt, rate * dt); }

  updateRunner(p, dt, rnd, b, dCam) {
    p.t -= dt;
    const bd = b ? Math.hypot(p.x - b.x, p.z - b.z) : 99;
    const threat = b && (b.state === 'charge' || b.state === 'paw') && (b.target && b.target.r === p || bd < 5.5);
    let sp = 0;
    if (p.state === 'hit') {
      p.hitT -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= 0.92; p.vz *= 0.92; this.pushOut(p, 0.35);
      if (p.hitT <= 0) this.flee(p);
    } else if (p.state === 'wander' || p.state === 'cite') {
      if (threat) this.flee(p);
      else if (p.state === 'wander') {
        const dx = p.tx - p.x, dz = p.tz - p.z; const d = Math.hypot(dx, dz);
        if (d < 0.6 || p.t <= 0) { p.t = 3 + rnd() * 5; if (b && bd < 11 && bd > 4 && rnd() < 0.5) { p.state = 'cite'; p.t = 2 + rnd() * 3; } else this.pickWander(p, rnd); }
        else { p.h = Math.atan2(dx, dz); sp = 1.4; }
        if (b && bd < 4) this.flee(p);
      } else {
        if (b) p.h += clamp(wrapAngle(Math.atan2(b.x - p.x, b.z - p.z) - p.h), -4 * dt, 4 * dt);
        if (p.t <= 0) { p.state = 'wander'; this.pickWander(p, rnd); }
      }
    } else if (p.state === 'flee' || p.state === 'enter' || p.state === 'leave') {
      const wp = p.path[0];
      const dx = wp[0] - p.x, dz = wp[1] - p.z; const d = Math.hypot(dx, dz);
      p.h = Math.atan2(dx, dz); sp = p.state === 'flee' ? 5.6 : p.state === 'enter' ? 2.2 : 1.6;
      if (d < 0.35) {
        p.path.shift();
        if (p.state === 'flee') p.state = 'enter';
        if (!p.path.length) { if (p.state === 'leave') { p.state = 'wander'; this.pickWander(p, rnd); } else { p.state = 'safe'; p.t = 3 + rnd() * 6; } }
      }
    } else if (p.state === 'safe') {
      if (b) p.h += clamp(wrapAngle(Math.atan2(b.x - p.x, b.z - p.z) - p.h), -3 * dt, 3 * dt);
      if (p.t <= 0 && (!b || bd > 6 || b.state === 'idle')) { p.state = 'leave'; p.path = [p.esc.gate, p.esc.out]; }
    }
    if (sp > 0) { p.x += Math.sin(p.h) * sp * dt; p.z += Math.cos(p.h) * sp * dt; if (p.state === 'wander' || p.state === 'flee') this.pushOutRunner(p); }
    p.speed = sp;
    // animación
    if (p.state === 'hit') { /* RecieveHit en curso */ } else if (sp > 3) anim(p.ch, 'Run', { speed: clamp(sp / 5.2, 0.8, 1.3), fade: 0.15 });
    else if (sp > 0.2) anim(p.ch, 'Walk', { speed: clamp(sp / 1.45, 0.7, 1.5) });
    else anim(p.ch, p.state === 'cite' ? 'Victory' : 'Idle', { speed: p.state === 'cite' ? 1.2 : 1 });
    const y = this.groundAt(this.cx + p.x, this.cz + p.z) ?? SAND_Y;
    p.ch.root.position.set(this.cx + p.x, y, this.cz + p.z); p.ch.root.rotation.y = p.h;
    this.tickAnim(p, dt, null);
    void dCam;
  }

  pushOutRunner(p) {
    // los mozos no atraviesan obstáculos (salvo por las puertas del refugio)
    const lim = R_CAD - 0.35; p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
    const rx = p.x - REF.x, rz = p.z - REF.z; const R = REF.ring + 0.4;
    if (Math.abs(rx) < R && Math.abs(rz) < R) { if (R - Math.abs(rx) < R - Math.abs(rz)) p.x = REF.x + Math.sign(rx) * R; else p.z = REF.z + Math.sign(rz) * R; }
    const fo = Math.hypot(p.x - FOUNT.x, p.z - FOUNT.z); if (fo < FOUNT.r + 0.45) { p.x = FOUNT.x + (p.x - FOUNT.x) / fo * (FOUNT.r + 0.45); p.z = FOUNT.z + (p.z - FOUNT.z) / fo * (FOUNT.r + 0.45); }
  }

  flee(p) {
    // refugio más cercano que no quede detrás del toro
    const b = this.bull; let best = null, bs = 1e9;
    for (const e of this.escapes) {
      const d = Math.hypot(e.out[0] - p.x, e.out[1] - p.z);
      let pen = 0; if (b) { const bd = Math.hypot(e.out[0] - b.x, e.out[1] - b.z); if (bd < d) pen = 12; }
      if (d + pen < bs) { bs = d + pen; best = e; }
    }
    p.esc = best; p.state = 'flee'; p.path = [best.out, best.gate, best.in];
  }
}

export function buildPlazaMayor(city, blk) { return new PlazaMayor(city, blk); }
export const PLAZA_NAME = 'Plaza Mayor · Bous al carrer';
void CITY;
