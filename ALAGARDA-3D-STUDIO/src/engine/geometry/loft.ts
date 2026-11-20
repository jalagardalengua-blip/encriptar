import * as THREE from 'three';
import { TAU, lerp } from '../math/scalar';
import { piecewiseSmooth, type ProfilePoint } from '../math/curves';
import { GeometryBuilder, type VertexColorFn } from './builder';
import { computeWeldedNormals, orientByHint } from './normals';

/** Sección clave: [altura y, semieje X, semieje Z, desplazamiento del centro en Z]. */
export type LoftKey = readonly [number, number, number, number];

export interface LoftOptions {
  keys: readonly LoftKey[];
  /** Segmentos alrededor de cada sección. */
  segments: number;
  /** Secciones intermedias entre la primera y la última clave. */
  rows?: number;
  /** Tapas en los extremos. */
  caps?: boolean;
  color?: VertexColorFn;
}

/**
 * Barrido de secciones elípticas a lo largo de Y con interpolación suave.
 * Adaptado de `loft(keys, seg, col, rows)` de TORERO, con el que se modelan pelvis,
 * torso y cabeza de los personajes humanos.
 */
export function loftGeometry({ keys, segments, rows = 24, caps = true, color }: LoftOptions): THREE.BufferGeometry {
  if (keys.length < 2) throw new Error('loftGeometry(): al menos 2 secciones clave');
  if (segments < 3 || rows < 1) throw new Error('loftGeometry(): resolución insuficiente');
  const channel = (k: 1 | 2 | 3): ProfilePoint[] => keys.map((q) => [q[0], q[k]] as const);
  const RX = channel(1), RZ = channel(2), CZ = channel(3);
  const y0 = keys[0]![0], y1 = keys[keys.length - 1]![0];
  const b = new GeometryBuilder();
  const hint: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const y = lerp(y0, y1, r / rows);
    const rx = Math.max(5e-4, piecewiseSmooth(y, RX));
    const rz = Math.max(5e-4, piecewiseSmooth(y, RZ));
    const cz = piecewiseSmooth(y, CZ);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * TAU;
      const hx = Math.cos(a), hz = Math.sin(a);
      b.addVertex(hx * rx, y, hz * rz + cz, hx, 0, hz, i / segments, r / rows, color);
      hint.push(hx, r === 0 ? -1 : r === rows ? 1 : 0, hz);
    }
  }
  const W = segments + 1;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < segments; i++) {
      const a = r * W + i, c = a + W;
      b.addTriangle(a, c, a + 1);
      b.addTriangle(a + 1, c, c + 1);
    }
  }
  if (caps) {
    for (const [r, s] of [[0, -1], [rows, 1]] as const) {
      const y = lerp(y0, y1, r / rows);
      const ci = b.addVertex(0, y, piecewiseSmooth(y, CZ), 0, s, 0, 0.5, r / rows, color);
      hint.push(0, s, 0);
      for (let i = 0; i < segments; i++) b.addTriangle(r * W + i, r * W + i + 1, ci);
    }
  }
  const g = b.build();
  orientByHint(g, hint);
  computeWeldedNormals(g);
  return g;
}
