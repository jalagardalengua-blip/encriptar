import * as THREE from 'three';

/** Rectángulo en coordenadas normalizadas del atlas [0, 1]. */
export interface AtlasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasLayout {
  rects: AtlasRect[];
  /** Texeles por metro de superficie (igual para todas las piezas). */
  texelsPerMeter: number;
}

/** Normaliza el atributo `uv` de una geometría al rango [0, 1] en ambos ejes. */
export function normalizeUVs(g: THREE.BufferGeometry): void {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
    if (v < v0) v0 = v;
    if (v > v1) v1 = v;
  }
  const du = u1 - u0 || 1, dv = v1 - v0 || 1;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / du, (uv.getY(i) - v0) / dv);
  uv.needsUpdate = true;
}

/**
 * Tamaño en metros que abarca el rango UV [0,1] en cada eje, promediado por área.
 * Sirve para dar a cada pieza un hueco del atlas con densidad de texel uniforme.
 */
export function uvMetricSize(g: THREE.BufferGeometry, matrix: THREE.Matrix4): { su: number; sv: number; area: number } {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const idx = g.getIndex();
  if (!idx) throw new Error('uvMetricSize(): geometría no indexada');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), t = new THREE.Vector3();
  let su = 0, sv = 0, area = 0;
  for (let k = 0; k < idx.count; k += 3) {
    const i0 = idx.getX(k), i1 = idx.getX(k + 1), i2 = idx.getX(k + 2);
    a.fromBufferAttribute(pos, i0).applyMatrix4(matrix);
    b.fromBufferAttribute(pos, i1).applyMatrix4(matrix);
    c.fromBufferAttribute(pos, i2).applyMatrix4(matrix);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    const A = t.crossVectors(e1, e2).length() / 2;
    if (A < 1e-12) continue;
    const du1 = uv.getX(i1) - uv.getX(i0), dv1 = uv.getY(i1) - uv.getY(i0);
    const du2 = uv.getX(i2) - uv.getX(i0), dv2 = uv.getY(i2) - uv.getY(i0);
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue;
    const dPdu = t.copy(e1).multiplyScalar(dv2).addScaledVector(e2, -dv1).divideScalar(det).length();
    const dPdv = t.copy(e2).multiplyScalar(du1).addScaledVector(e1, -du2).divideScalar(det).length();
    su += dPdu * A;
    sv += dPdv * A;
    area += A;
  }
  return area > 0 ? { su: su / area, sv: sv / area, area } : { su: 0, sv: 0, area: 0 };
}

function shelfPack(sizes: { w: number; h: number }[], scale: number, pad: number): AtlasRect[] | null {
  const order = sizes.map((_, i) => i).sort((i, j) => sizes[j]!.h - sizes[i]!.h);
  const rects: AtlasRect[] = new Array(sizes.length);
  let x = pad, y = pad, shelfH = 0;
  for (const i of order) {
    const w = sizes[i]!.w * scale, h = sizes[i]!.h * scale;
    if (w + 2 * pad > 1 || h + 2 * pad > 1) return null;
    if (x + w + pad > 1) {
      x = pad;
      y += shelfH + pad;
      shelfH = 0;
    }
    if (y + h + pad > 1) return null;
    rects[i] = { x, y, w, h };
    x += w + pad;
    shelfH = Math.max(shelfH, h);
  }
  return rects;
}

/**
 * Empaqueta piezas (tamaño métrico de su rango UV) en un atlas cuadrado,
 * con la mayor escala común que quepa: la densidad de texel es la misma en todas.
 */
export function packAtlas(sizes: { w: number; h: number }[], atlasSize: number, padTexels = 6): AtlasLayout {
  const pad = padTexels / atlasSize;
  let lo = 0, hi = 1;
  while (shelfPack(sizes, hi, pad)) hi *= 2;
  for (let it = 0; it < 30; it++) {
    const mid = (lo + hi) / 2;
    if (shelfPack(sizes, mid, pad)) lo = mid;
    else hi = mid;
  }
  const rects = shelfPack(sizes, lo, pad);
  if (!rects) throw new Error('packAtlas(): no caben las piezas');
  return { rects, texelsPerMeter: lo * atlasSize };
}

/** Lleva las UV normalizadas de una geometría al rectángulo asignado del atlas. */
export function remapUVs(g: THREE.BufferGeometry, r: AtlasRect): void {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r.x + uv.getX(i) * r.w, r.y + uv.getY(i) * r.h);
  uv.needsUpdate = true;
}

/**
 * Rasteriza los triángulos de una malla en el espacio UV del atlas y llama a `texel`
 * con la posición 3D interpolada (en el espacio de `matrix`) de cada texel cubierto.
 */
export function rasterizeUV(
  g: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  size: number,
  texel: (index: number, x: number, y: number, z: number) => void,
): void {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const idx = g.getIndex();
  if (!idx) throw new Error('rasterizeUV(): geometría no indexada');
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] as const;
  const U = [0, 0, 0], V = [0, 0, 0];
  for (let k = 0; k < idx.count; k += 3) {
    for (let j = 0; j < 3; j++) {
      const vi = idx.getX(k + j);
      P[j]!.fromBufferAttribute(pos, vi).applyMatrix4(matrix);
      U[j] = uv.getX(vi) * size;
      V[j] = uv.getY(vi) * size;
    }
    const [u0, u1, u2] = U as [number, number, number];
    const [v0, v1, v2] = V as [number, number, number];
    const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (Math.abs(det) < 1e-9) continue;
    const minX = Math.max(0, Math.floor(Math.min(u0, u1, u2))), maxX = Math.min(size - 1, Math.ceil(Math.max(u0, u1, u2)));
    const minY = Math.max(0, Math.floor(Math.min(v0, v1, v2))), maxY = Math.min(size - 1, Math.ceil(Math.max(v0, v1, v2)));
    const eps = -1e-3;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w1 = ((px - u0) * (v2 - v0) - (u2 - u0) * (py - v0)) / det;
        const w2 = ((u1 - u0) * (py - v0) - (px - u0) * (v1 - v0)) / det;
        const w0 = 1 - w1 - w2;
        if (w0 < eps || w1 < eps || w2 < eps) continue;
        texel(
          y * size + x,
          P[0].x * w0 + P[1].x * w1 + P[2].x * w2,
          P[0].y * w0 + P[1].y * w1 + P[2].y * w2,
          P[0].z * w0 + P[1].z * w1 + P[2].z * w2,
        );
      }
    }
  }
}

/**
 * Extiende los texeles válidos hacia los vacíos (relleno de bordes) para que el
 * filtrado y los mipmaps no muestren costuras oscuras en los límites de cada pieza.
 */
export function dilate(data: Uint8Array, mask: Uint8Array, size: number, iterations: number): void {
  const m = mask.slice();
  for (let it = 0; it < iterations; it++) {
    const add: number[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (m[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const j = ny * size + nx;
          if (!m[j]) continue;
          r += data[j * 4]!;
          g += data[j * 4 + 1]!;
          b += data[j * 4 + 2]!;
          n++;
        }
        if (n) {
          data[i * 4] = r / n;
          data[i * 4 + 1] = g / n;
          data[i * 4 + 2] = b / n;
          data[i * 4 + 3] = 255;
          add.push(i);
        }
      }
    }
    for (const i of add) m[i] = 1;
  }
}

export function linearToSrgbByte(c: number): number {
  const v = c <= 0 ? 0 : c >= 1 ? 1 : c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

/** Crea una DataTexture RGBA apta para render y exportación glTF. */
export function makeDataTexture(data: Uint8Array, size: number, srgb: boolean, name: string): THREE.DataTexture {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.name = name;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
