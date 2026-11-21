import { createNoise3 } from '../src/engine/math/noise';
import { createRng } from '../src/engine/math/random';
import { buildToroShape, poseToro, toroGenerator } from '../src/engine/generators/toro';
import { sanitizeValues } from '../src/engine/procedural/params';
import { projectModel } from '../src/engine/photo/silhouette';
import type { Mask, PhotoView, RGBAImage } from '../src/engine/photo/types';

/**
 * «Fotografía» sintética de un toro con parámetros conocidos: silueta rasterizada a W×H,
 * con margen, toro negro sobre albero con ruido. Sirve de verdad de referencia.
 */
export function syntheticPhoto(values: Record<string, unknown>, view: PhotoView, W = 480, H = 320) {
  const v = sanitizeValues(toroGenerator.params, values);
  const seed = v.seed as number;
  const a = buildToroShape(v, createNoise3(seed), createRng(seed), 0.6);
  poseToro(a, String(v.postura));
  const pm = projectModel(a.root, view);
  const { u0, u1, v0, v1 } = pm.bbox;
  const s = Math.min((W * 0.7) / (u1 - u0), (H * 0.7) / (v1 - v0));
  const ox = W / 2 - ((u0 + u1) / 2) * s, oy = H / 2 + ((v0 + v1) / 2) * s;
  const mask: Mask = { width: W, height: H, data: new Uint8Array(W * H) };
  const t = pm.tris;
  for (let k = 0; k < t.length; k += 6) {
    const ax = ox + t[k]! * s, ay = oy - t[k + 1]! * s, bx = ox + t[k + 2]! * s, by = oy - t[k + 3]! * s, cx = ox + t[k + 4]! * s, cy = oy - t[k + 5]! * s;
    const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(det) < 1e-12) continue;
    for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(H - 1, Math.ceil(Math.max(ay, by, cy))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
        const w1 = ((x + 0.5 - ax) * (cy - ay) - (cx - ax) * (y + 0.5 - ay)) / det;
        const w2 = ((bx - ax) * (y + 0.5 - ay) - (x + 0.5 - ax) * (by - ay)) / det;
        if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) mask.data[y * W + x] = 1;
      }
    }
  }
  const rng = createRng(99);
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const n = rng.range(-12, 12);
    const c = mask.data[i] ? [22 + n * 0.5, 19 + n * 0.5, 17 + n * 0.5] : [196 + n, 150 + n, 92 + n];
    data.set([c[0]!, c[1]!, c[2]!, 255], i * 4);
  }
  const image: RGBAImage = { width: W, height: H, data };
  return { image, mask };
}
