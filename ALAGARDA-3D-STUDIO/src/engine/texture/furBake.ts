import * as THREE from 'three';
import type { Rng } from '../math/random';
import {
  dilate, linearToSrgbByte, makeDataTexture, normalizeUVs, packAtlas, rasterizeUV, remapUVs, uvMetricSize,
} from './atlas';

export interface FurPiece<R extends string> {
  mesh: THREE.Mesh;
  region: R;
}

export interface FurBakeOptions<R extends string> {
  pieces: FurPiece<R>[];
  /** Matriz que lleva del espacio del mundo al espacio en que se evalúa el pelaje. */
  space: THREE.Matrix4;
  size: number;
  rng: Rng;
  /** Longitud media del pelo en metros. */
  hairLength: number;
  /** Color lineal del pelo en un punto. */
  color: (x: number, y: number, z: number, region: R, nx: number, ny: number, nz: number) => readonly [number, number, number];
}

export interface FurBakeResult {
  albedo: THREE.DataTexture;
  normal: THREE.DataTexture;
  texelsPerMeter: number;
  coverage: number;
}

/**
 * Hornea en un único atlas el color y el relieve del pelo de varias mallas:
 * 1) asigna a cada pieza un hueco proporcional a su superficie (densidad uniforme);
 * 2) rasteriza en UV y evalúa el patrón de capa en la posición 3D real de cada texel,
 *    así el dibujo es continuo entre piezas y no se deforma con la parametrización;
 * 3) dibuja mechones orientados según la caída del pelo (+V) para el albedo y el mapa normal.
 * Inspirado en las texturas procedurales de TORERO (`makeTextures`, `nrmFromH`, src/assets.js).
 */
export function bakeFur<R extends string>(o: FurBakeOptions<R>): FurBakeResult {
  const { pieces, size } = o;
  const mats = pieces.map((p) => new THREE.Matrix4().multiplyMatrices(o.space, p.mesh.matrixWorld));
  pieces.forEach((p) => normalizeUVs(p.mesh.geometry));
  const metrics = pieces.map((p, i) => uvMetricSize(p.mesh.geometry, mats[i]!));
  const layout = packAtlas(metrics.map((m) => ({ w: Math.max(m.su, 1e-3), h: Math.max(m.sv, 1e-3) })), size, 6);
  pieces.forEach((p, i) => remapUVs(p.mesh.geometry, layout.rects[i]!));

  const N = size * size;
  const mask = new Uint8Array(N);
  const owner = new Int16Array(N).fill(-1);
  const posBuf = new Float32Array(N * 3);
  const nrmBuf = new Float32Array(N * 3);
  pieces.forEach((p, i) => {
    rasterizeUV(p.mesh.geometry, mats[i]!, size, (t, x, y, z, nx, ny, nz) => {
      nrmBuf[t * 3] = nx;
      nrmBuf[t * 3 + 1] = ny;
      nrmBuf[t * 3 + 2] = nz;
      mask[t] = 1;
      owner[t] = i;
      posBuf[t * 3] = x;
      posBuf[t * 3 + 1] = y;
      posBuf[t * 3 + 2] = z;
    });
  });

  // --- mechones de pelo (campo de altura) ---
  const height = new Float32Array(N).fill(0.45);
  const lenT = Math.max(2, o.hairLength * layout.texelsPerMeter);
  const rng = o.rng;
  layout.rects.forEach((r) => {
    const x0 = r.x * size, y0 = r.y * size, w = r.w * size, h = r.h * size;
    const count = Math.round((w * h) / (lenT * 0.55));
    for (let k = 0; k < count; k++) {
      let px = x0 + rng.next() * w, py = y0 + rng.next() * h;
      const ang = Math.PI / 2 + (rng.next() - 0.5) * 0.5;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const L = lenT * (0.7 + rng.next() * 0.6);
      const h0 = 0.35 + rng.next() * 0.65;
      for (let s = 0; s < L; s++) {
        const ix = px | 0, iy = py | 0;
        if (ix < x0 || iy < y0 || ix >= x0 + w || iy >= y0 + h) break;
        height[iy * size + ix] = h0 * (1 - 0.6 * (s / L));
        px += dx;
        py += dy;
      }
    }
  });

  // --- albedo ---
  const albedo = new Uint8Array(N * 4);
  let covered = 0;
  for (let t = 0; t < N; t++) {
    if (!mask[t]) continue;
    covered++;
    const c = o.color(posBuf[t * 3]!, posBuf[t * 3 + 1]!, posBuf[t * 3 + 2]!, pieces[owner[t]!]!.region, nrmBuf[t * 3]!, nrmBuf[t * 3 + 1]!, nrmBuf[t * 3 + 2]!);
    const v = 0.86 + 0.28 * height[t]!;
    albedo[t * 4] = linearToSrgbByte(c[0] * v);
    albedo[t * 4 + 1] = linearToSrgbByte(c[1] * v);
    albedo[t * 4 + 2] = linearToSrgbByte(c[2] * v);
    albedo[t * 4 + 3] = 255;
  }

  // --- mapa normal desde la altura (convención OpenGL, Y arriba, como glTF) ---
  const normal = new Uint8Array(N * 4);
  // intensidad proporcional a la resolución: con pocos texeles por pelo el relieve sólo añadiría ruido
  const k = Math.min(1.6, 0.25 * lenT);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y * size + x;
      if (!mask[t]) continue;
      const hl = height[y * size + Math.max(0, x - 1)]!, hr = height[y * size + Math.min(size - 1, x + 1)]!;
      const hd = height[Math.max(0, y - 1) * size + x]!, hu = height[Math.min(size - 1, y + 1) * size + x]!;
      const nx = -(hr - hl) * k, ny = -(hu - hd) * k;
      const l = Math.hypot(nx, ny, 1);
      normal[t * 4] = Math.round((nx / l * 0.5 + 0.5) * 255);
      normal[t * 4 + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
      normal[t * 4 + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      normal[t * 4 + 3] = 255;
    }
  }

  dilate(albedo, mask, size, 8);
  dilate(normal, mask, size, 8);
  for (let t = 0; t < N; t++) {
    if (normal[t * 4 + 3] === 0) {
      normal[t * 4] = 128;
      normal[t * 4 + 1] = 128;
      normal[t * 4 + 2] = 255;
      normal[t * 4 + 3] = 255;
    }
    if (albedo[t * 4 + 3] === 0) albedo[t * 4 + 3] = 255;
  }

  return {
    albedo: makeDataTexture(albedo, size, true, 'pelo_color'),
    normal: makeDataTexture(normal, size, false, 'pelo_normal'),
    texelsPerMeter: layout.texelsPerMeter,
    coverage: covered / N,
  };
}
