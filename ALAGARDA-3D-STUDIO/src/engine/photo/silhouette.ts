import * as THREE from 'three';
import { maskBBox } from './image';
import type { Mask, PhotoView } from './types';

/** Rejilla normalizada donde se comparan siluetas (encuadre por caja envolvente). */
export const GRID_W = 160;
export const GRID_H = 100;

/** Proyecta un punto del espacio del modelo a la imagen (u a la derecha, v hacia arriba). */
export function projectPoint(x: number, y: number, z: number, view: PhotoView): [number, number] {
  const c = Math.cos(view.yaw), s = Math.sin(view.yaw);
  const xr = x * c + z * s, zr = -x * s + z * c;
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  const u = -zr * (view.mirror ? -1 : 1);
  const v = -xr * sp + y * cp;
  return [u, v];
}

/** Dirección hacia la cámara en el espacio del modelo (para saber qué caras ve la foto). */
export function viewDirection(view: PhotoView): THREE.Vector3 {
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  const c = Math.cos(view.yaw), s = Math.sin(view.yaw);
  // inversa del giro de `projectPoint` aplicada a (cos p, sin p, 0)
  return new THREE.Vector3(cp * c, sp, cp * s).normalize();
}

export interface Framing {
  uc: number;
  vc: number;
  scale: number;
}

/** Encuadre que lleva una caja (u, v) al centro de la rejilla, con margen. */
export function framingFor(u0: number, u1: number, v0: number, v1: number): Framing {
  const scale = Math.min((0.9 * GRID_H) / Math.max(1e-9, v1 - v0), (0.95 * GRID_W) / Math.max(1e-9, u1 - u0));
  return { uc: (u0 + u1) / 2, vc: (v0 + v1) / 2, scale };
}

export interface ProjectedModel {
  /** Triángulos proyectados: u0,v0,u1,v1,u2,v2 por triángulo. */
  tris: Float32Array;
  bbox: { u0: number; u1: number; v0: number; v1: number };
}

/** Proyecta todas las mallas visibles de un objeto con la vista dada. */
export function projectModel(root: THREE.Object3D, view: PhotoView): ProjectedModel {
  root.updateMatrixWorld(true);
  const chunks: Float32Array[] = [];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  const p = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute('position');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const [u, v] = projectPoint(p.x, p.y, p.z, view);
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
    const idx = g.getIndex();
    const n = idx ? idx.count : pos.count;
    const t = new Float32Array(n * 2);
    for (let k = 0; k < n; k++) {
      const vi = idx ? idx.getX(k) : k;
      t[k * 2] = uv[vi * 2]!;
      t[k * 2 + 1] = uv[vi * 2 + 1]!;
    }
    chunks.push(t);
  });
  const len = chunks.reduce((s, c) => s + c.length, 0);
  const tris = new Float32Array(len);
  let off = 0;
  for (const c of chunks) { tris.set(c, off); off += c.length; }
  return { tris, bbox: { u0, u1, v0, v1 } };
}

/** Rasteriza el modelo proyectado en la rejilla normalizada (1 = cubierto). */
export function rasterizeModel(pm: ProjectedModel, f: Framing = framingFor(pm.bbox.u0, pm.bbox.u1, pm.bbox.v0, pm.bbox.v1)): Uint8Array {
  const grid = new Uint8Array(GRID_W * GRID_H);
  const t = pm.tris;
  const gx = (u: number) => GRID_W / 2 + (u - f.uc) * f.scale;
  const gy = (v: number) => GRID_H / 2 - (v - f.vc) * f.scale;
  for (let k = 0; k < t.length; k += 6) {
    const ax = gx(t[k]!), ay = gy(t[k + 1]!), bx = gx(t[k + 2]!), by = gy(t[k + 3]!), cx = gx(t[k + 4]!), cy = gy(t[k + 5]!);
    const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(det) < 1e-12) continue;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(GRID_W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(GRID_H - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / det;
        const w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / det;
        if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) grid[y * GRID_W + x] = 1;
      }
    }
  }
  return grid;
}

export interface PhotoFraming {
  /** Caja del sujeto en píxeles de la máscara. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  framing: Framing;
}

/** Normaliza la máscara de la foto a la rejilla (mismo encuadre por caja que el modelo). */
export function normalizePhotoMask(m: Mask): { grid: Uint8Array; pf: PhotoFraming } | null {
  const bb = maskBBox(m);
  if (!bb) return null;
  // en la foto v = -y (y hacia abajo)
  const framing = framingFor(bb.x0, bb.x1, -bb.y1, -bb.y0);
  const grid = new Uint8Array(GRID_W * GRID_H);
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      let hits = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]] as const) {
        const u = framing.uc + (gx + ox - GRID_W / 2) / framing.scale;
        const v = framing.vc - (gy + oy - GRID_H / 2) / framing.scale;
        const x = Math.floor(u), y = Math.floor(-v);
        if (x >= 0 && y >= 0 && x < m.width && y < m.height && m.data[y * m.width + x]) hits++;
      }
      grid[gy * GRID_W + gx] = hits >= 2 ? 1 : 0;
    }
  }
  return { grid, pf: { x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, framing } };
}

/** Intersección sobre unión de dos rejillas. */
export function iou(a: Uint8Array, b: Uint8Array): number {
  let i = 0, u = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) i++;
    if (a[k] || b[k]) u++;
  }
  return u ? i / u : 0;
}

/** Distancia (en celdas) de cada celda al borde de la silueta objetivo, para penalizar errores lejanos. */
export function boundaryDistance(target: Uint8Array): Float32Array {
  const W = GRID_W, H = GRID_H, INF = 1e9;
  const d = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, v = target[i];
      const edge = (x > 0 && target[i - 1] !== v) || (x < W - 1 && target[i + 1] !== v) || (y > 0 && target[i - W] !== v) || (y < H - 1 && target[i + W] !== v);
      d[i] = edge ? 0 : INF;
    }
  }
  // transformada de distancia de chaflán en dos pasadas
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) d[i] = Math.min(d[i]!, d[i - 1]! + 1);
    if (y > 0) d[i] = Math.min(d[i]!, d[i - W]! + 1);
    if (x > 0 && y > 0) d[i] = Math.min(d[i]!, d[i - W - 1]! + 1.414);
    if (x < W - 1 && y > 0) d[i] = Math.min(d[i]!, d[i - W + 1]! + 1.414);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) d[i] = Math.min(d[i]!, d[i + 1]! + 1);
    if (y < H - 1) d[i] = Math.min(d[i]!, d[i + W]! + 1);
    if (x < W - 1 && y < H - 1) d[i] = Math.min(d[i]!, d[i + W + 1]! + 1.414);
    if (x > 0 && y < H - 1) d[i] = Math.min(d[i]!, d[i + W - 1]! + 1.414);
  }
  return d;
}

/** Error de silueta: celdas que no coinciden, pesadas por su distancia al borde correcto. */
export function silhouetteLoss(model: Uint8Array, target: Uint8Array, dist: Float32Array): number {
  let err = 0, union = 0;
  for (let k = 0; k < model.length; k++) {
    if (model[k] || target[k]) union++;
    if (model[k] !== target[k]) err += 1 + 0.35 * dist[k]!;
  }
  return union ? err / union : 1;
}
