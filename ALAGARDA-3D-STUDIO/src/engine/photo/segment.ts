import { createRng } from '../math/random';
import { downscale, resizeMask, rgbToLab } from './image';
import type { Mask, RGBAImage } from './types';

export interface SegmentOptions {
  /** Número de grupos de color (más grupos = separación más fina). */
  clusters?: number;
  /** Punto del sujeto en coordenadas normalizadas [0,1] (un toque sobre el toro). */
  seed?: { x: number; y: number } | null;
  /** Resolución de trabajo (lado mayor). */
  workSize?: number;
}

/**
 * Separa el sujeto del fondo sin IA:
 * 1) agrupa los colores en CIELAB con k-means;
 * 2) los grupos muy presentes en el borde de la foto son fondo (arena, cielo, campo);
 * 3) limpia la máscara (apertura/cierre), rellena huecos y se queda con la región tocada
 *    o, si no hay toque, con la mayor región cercana al centro.
 * Devuelve la máscara a la resolución de la imagen original.
 */
export function segmentSubject(img: RGBAImage, opts: SegmentOptions = {}): Mask {
  const k = Math.max(2, Math.min(10, opts.clusters ?? 6));
  const small = downscale(img, opts.workSize ?? 256);
  const { width: w, height: h } = small;
  const N = w * h;
  const lab = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [L, A, B] = rgbToLab(small.data[i * 4]!, small.data[i * 4 + 1]!, small.data[i * 4 + 2]!);
    lab[i * 3] = L;
    lab[i * 3 + 1] = A;
    lab[i * 3 + 2] = B;
  }
  const label = kmeans(lab, N, k);

  // proporción de cada grupo en el borde frente a la imagen completa
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const total = new Float64Array(k), border = new Float64Array(k);
  let borderN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = label[y * w + x]!;
      total[c]!++;
      if (x < band || y < band || x >= w - band || y >= h - band) {
        border[c]!++;
        borderN++;
      }
    }
  }
  const isBg = new Uint8Array(k);
  for (let c = 0; c < k; c++) {
    const bShare = border[c]! / borderN, share = total[c]! / N;
    if (bShare > 0.04 && bShare > share * 0.9) isBg[c] = 1;
  }
  // el toque manda: el grupo tocado nunca es fondo
  if (opts.seed) {
    const sx = Math.min(w - 1, Math.max(0, Math.floor(opts.seed.x * w))), sy = Math.min(h - 1, Math.max(0, Math.floor(opts.seed.y * h)));
    isBg[label[sy * w + sx]!] = 0;
  }
  let m: Uint8Array = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = isBg[label[i]!] ? 0 : 1;
  m = morph(m, w, h, 'open');
  m = morph(m, w, h, 'close');
  m = fillHoles(m, w, h);
  m = pickComponent(m, w, h, opts.seed ?? null);
  return resizeMask({ width: w, height: h, data: m }, img.width, img.height);
}

function kmeans(lab: Float32Array, N: number, k: number): Uint8Array {
  const rng = createRng(1234);
  const C = new Float32Array(k * 3);
  // k-means++ determinista
  const first = rng.int(0, N - 1);
  C.set(lab.subarray(first * 3, first * 3 + 3), 0);
  const d2 = new Float64Array(N).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const dx = lab[i * 3]! - C[(c - 1) * 3]!, dy = lab[i * 3 + 1]! - C[(c - 1) * 3 + 1]!, dz = lab[i * 3 + 2]! - C[(c - 1) * 3 + 2]!;
      d2[i] = Math.min(d2[i]!, dx * dx + dy * dy + dz * dz);
      sum += d2[i]!;
    }
    let r = rng.next() * sum, pick = 0;
    for (let i = 0; i < N; i++) {
      r -= d2[i]!;
      if (r <= 0) { pick = i; break; }
    }
    C.set(lab.subarray(pick * 3, pick * 3 + 3), c * 3);
  }
  const label = new Uint8Array(N);
  const acc = new Float64Array(k * 4);
  for (let it = 0; it < 14; it++) {
    acc.fill(0);
    for (let i = 0; i < N; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const dx = lab[i * 3]! - C[c * 3]!, dy = lab[i * 3 + 1]! - C[c * 3 + 1]!, dz = lab[i * 3 + 2]! - C[c * 3 + 2]!;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = c; }
      }
      label[i] = best;
      acc[best * 4]! += lab[i * 3]!;
      acc[best * 4 + 1]! += lab[i * 3 + 1]!;
      acc[best * 4 + 2]! += lab[i * 3 + 2]!;
      acc[best * 4 + 3]!++;
    }
    for (let c = 0; c < k; c++) {
      const n = acc[c * 4 + 3]!;
      if (n) for (let j = 0; j < 3; j++) C[c * 3 + j] = acc[c * 4 + j]! / n;
    }
  }
  return label;
}

function morph(m: Uint8Array, w: number, h: number, op: 'open' | 'close'): Uint8Array {
  const pass = (src: Uint8Array, erode: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = erode ? 1 : 0;
        for (let dy = -1; dy <= 1 && v === (erode ? 1 : 0); dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
            const s = src[yy * w + xx]!;
            if (erode && !s) { v = 0; break; }
            if (!erode && s) { v = 1; break; }
          }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  };
  return op === 'open' ? pass(pass(m, true), false) : pass(pass(m, false), true);
}

/** Rellena los huecos interiores (fondo no conectado con el borde). */
export function fillHoles(m: Uint8Array, w: number, h: number): Uint8Array {
  const reach = new Uint8Array(m.length);
  const stack: number[] = [];
  const push = (i: number) => { if (!m[i] && !reach[i]) { reach[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = m[i] || !reach[i] ? 1 : 0;
  return out;
}

/** Componentes conexas (4-vecindad). Devuelve etiqueta por píxel y tamaño de cada una. */
function components(m: Uint8Array, w: number, h: number): { lab: Int32Array; sizes: number[]; cx: number[]; cy: number[] } {
  const lab = new Int32Array(m.length).fill(-1);
  const sizes: number[] = [], cx: number[] = [], cy: number[] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s] !== -1) continue;
    const id = sizes.length;
    let n = 0, sx = 0, sy = 0;
    const stack = [s];
    lab[s] = id;
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i / w) | 0;
      n++; sx += x; sy += y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && m[j] && lab[j] === -1) { lab[j] = id; stack.push(j); }
      }
    }
    sizes.push(n); cx.push(sx / n); cy.push(sy / n);
  }
  return { lab, sizes, cx, cy };
}

function pickComponent(m: Uint8Array, w: number, h: number, seed: { x: number; y: number } | null): Uint8Array {
  const { lab, sizes, cx, cy } = components(m, w, h);
  if (!sizes.length) return m;
  let keep = -1;
  if (seed) {
    const sx = Math.min(w - 1, Math.floor(seed.x * w)), sy = Math.min(h - 1, Math.floor(seed.y * h));
    keep = lab[sy * w + sx]!;
  }
  if (keep < 0) {
    let best = -1;
    for (let i = 0; i < sizes.length; i++) {
      const dc = Math.hypot(cx[i]! / w - 0.5, cy[i]! / h - 0.5);
      const score = sizes[i]! * (1.2 - dc);
      if (score > best) { best = score; keep = i; }
    }
  }
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = lab[i] === keep ? 1 : 0;
  return out;
}

/** Pinta o borra un círculo en la máscara (corrección manual con el dedo o el ratón). */
export function paintMask(m: Mask, x: number, y: number, radius: number, value: 0 | 1): void {
  const r2 = radius * radius;
  for (let yy = Math.max(0, Math.floor(y - radius)); yy <= Math.min(m.height - 1, Math.ceil(y + radius)); yy++) {
    for (let xx = Math.max(0, Math.floor(x - radius)); xx <= Math.min(m.width - 1, Math.ceil(x + radius)); xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 <= r2) m.data[yy * m.width + xx] = value;
    }
  }
}
