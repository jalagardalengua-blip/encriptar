import type * as THREE from 'three';
import { smoothstep } from '../math/scalar';
import { maskBBox, srgbToLinear } from './image';
import { framingFor, GRID_H, GRID_W, normalizePhotoMask, projectModel, viewDirection } from './silhouette';
import type { PhotoInput } from './types';

export interface PhotoSample {
  rgb: [number, number, number];
  /** Confianza 0..1 (orientación hacia la cámara y distancia al borde del recorte). */
  weight: number;
}

/**
 * Proyecta la foto sobre el modelo ya ajustado: para un punto de la superficie (y su normal)
 * devuelve el color de la foto en ese punto. Las caras que la foto no ve toman el color del
 * lado visible por simetría. Se compensa la iluminación de la foto (zonas en sombra o con
 * brillo) para que el visor no la aplique dos veces.
 */
export function createPhotoProjector(photo: PhotoInput, root: THREE.Object3D) {
  const { image, mask, view } = photo;
  const norm = normalizePhotoMask(mask);
  const bb = maskBBox(mask);
  if (!norm || !bb) return null;
  const pm = projectModel(root, view);
  const fm = framingFor(pm.bbox.u0, pm.bbox.u1, pm.bbox.v0, pm.bbox.v1);
  const fp = norm.pf.framing;
  const sx = image.width / mask.width, sy = image.height / mask.height;
  const W = mask.width, H = mask.height;

  // distancia al borde del recorte (en píxeles de máscara), para no tomar color del fondo
  const inside = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) inside[i] = mask.data[i] ? 1e6 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!inside[i]) continue;
    inside[i] = Math.min(inside[i]!, x > 0 ? inside[i - 1]! + 1 : 1, y > 0 ? inside[i - W]! + 1 : 1);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (!inside[i]) continue;
    inside[i] = Math.min(inside[i]!, x < W - 1 ? inside[i + 1]! + 1 : 1, y < H - 1 ? inside[i + W]! + 1 : 1);
  }
  const edge = Math.max(2, Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.012);

  // luminancia media local dentro del recorte (imagen integral) para quitar la iluminación de la foto
  const lum = new Float64Array((W + 1) * (H + 1)), cnt = new Float64Array((W + 1) * (H + 1));
  let sumL = 0, sumN = 0;
  for (let y = 0; y < H; y++) {
    let rowL = 0, rowN = 0;
    for (let x = 0; x < W; x++) {
      const m = mask.data[y * W + x] ? 1 : 0;
      const ii = (Math.min(image.height - 1, Math.floor(y * sy)) * image.width + Math.min(image.width - 1, Math.floor(x * sx))) * 4;
      const l = m * (0.2126 * srgbToLinear(image.data[ii]!) + 0.7152 * srgbToLinear(image.data[ii + 1]!) + 0.0722 * srgbToLinear(image.data[ii + 2]!));
      rowL += l; rowN += m; sumL += l; sumN += m;
      lum[(y + 1) * (W + 1) + x + 1] = lum[y * (W + 1) + x + 1]! + rowL;
      cnt[(y + 1) * (W + 1) + x + 1] = cnt[y * (W + 1) + x + 1]! + rowN;
    }
  }
  const meanL = sumL / Math.max(1, sumN);
  const R = Math.max(3, Math.round((bb.y1 - bb.y0) / 7));
  const localL = (x: number, y: number) => {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(W, x + R + 1), y1 = Math.min(H, y + R + 1);
    const at = (a: Float64Array, xx: number, yy: number) => a[yy * (W + 1) + xx]!;
    const s = at(lum, x1, y1) - at(lum, x0, y1) - at(lum, x1, y0) + at(lum, x0, y0);
    const n = at(cnt, x1, y1) - at(cnt, x0, y1) - at(cnt, x1, y0) + at(cnt, x0, y0);
    return n > 0 ? s / n : meanL;
  };

  const dir = viewDirection(view);
  const toPixel = (x: number, y: number, z: number): [number, number] => {
    // modelo → rejilla normalizada → foto
    const c = Math.cos(view.yaw), s = Math.sin(view.yaw);
    const xr = x * c + z * s, zr = -x * s + z * c;
    const u = -zr * (view.mirror ? -1 : 1);
    const v = -xr * Math.sin(view.pitch) + y * Math.cos(view.pitch);
    const gx = GRID_W / 2 + (u - fm.uc) * fm.scale, gy = GRID_H / 2 - (v - fm.vc) * fm.scale;
    const up = fp.uc + (gx - GRID_W / 2) / fp.scale, vp = fp.vc - (gy - GRID_H / 2) / fp.scale;
    return [up, -vp];
  };

  const out: PhotoSample = { rgb: [0, 0, 0], weight: 0 };
  return function sample(x: number, y: number, z: number, nx: number, ny: number, nz: number): PhotoSample | null {
    let facing = nx * dir.x + ny * dir.y + nz * dir.z;
    if (facing < 0.1) {
      // cara oculta: se usa el punto simétrico del lado que se ve
      x = -x;
      nx = -nx;
      facing = nx * dir.x + ny * dir.y + nz * dir.z;
      if (facing < 0.1) return null;
    }
    const [px, py] = toPixel(x, y, z);
    const mx = Math.floor(px), my = Math.floor(py);
    if (mx < 0 || my < 0 || mx >= W || my >= H || !mask.data[my * W + mx]) return null;
    const w = smoothstep(0.1, 0.4, facing) * smoothstep(0, edge, inside[my * W + mx]!);
    if (w <= 0) return null;
    // muestreo bilineal en la imagen
    const fx = Math.min(image.width - 1.001, Math.max(0, px * sx - 0.5)), fy = Math.min(image.height - 1.001, Math.max(0, py * sy - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const gain = Math.min(2.5, Math.max(0.5, Math.pow(meanL / Math.max(1e-4, localL(mx, my)), 0.7)));
    for (let ch = 0; ch < 3; ch++) {
      const p = (xx: number, yy: number) => srgbToLinear(image.data[(yy * image.width + xx) * 4 + ch]!);
      const top = p(x0, y0) * (1 - tx) + p(x0 + 1, y0) * tx;
      const bot = p(x0, y0 + 1) * (1 - tx) + p(x0 + 1, y0 + 1) * tx;
      out.rgb[ch] = Math.min(1, (top * (1 - ty) + bot * ty) * gain);
    }
    out.weight = w;
    return out;
  };
}
