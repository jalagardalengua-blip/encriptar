import * as THREE from 'three';
import { TAU } from '../math/scalar';
import type { Vec3Tuple } from '../math/curves';
import { GeometryBuilder, type VertexColorFn } from './builder';
import { fixWinding } from './normals';

export interface TubeOptions {
  /** Puntos del eje (al menos 2). */
  path: readonly Vec3Tuple[];
  radialSegments: number;
  /** Radio en función del parámetro t ∈ [0, 1] a lo largo del eje. */
  radius: (t: number) => number;
  /** Cierra el extremo final con un abanico (astas, rabo). */
  capEnd?: boolean;
  color?: VertexColorFn;
}

/**
 * Tubo de radio variable con marcos de transporte paralelo. Adaptado de `tube(pts, rs, rad, col)`
 * de TORERO (astas, rabo, cintas de divisa) y de `hornGeo` de GANADERIA-27, que lo emulaba
 * escalando una `THREE.TubeGeometry`.
 */
export function tubeGeometry({ path, radialSegments, radius, capEnd = true, color }: TubeOptions): THREE.BufferGeometry {
  const n = path.length;
  if (n < 2) throw new Error('tubeGeometry(): el eje necesita al menos 2 puntos');
  if (radialSegments < 3) throw new Error('tubeGeometry(): al menos 3 segmentos radiales');
  const P = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const T0 = P[1]!.clone().sub(P[0]!).normalize();
  const N = Math.abs(T0.y) < 0.9
    ? new THREE.Vector3().crossVectors(T0, new THREE.Vector3(0, 1, 0)).normalize()
    : new THREE.Vector3().crossVectors(T0, new THREE.Vector3(1, 0, 0)).normalize();
  const B = new THREE.Vector3();
  const T = new THREE.Vector3();
  const d = new THREE.Vector3();
  const b = new GeometryBuilder();
  for (let k = 0; k < n; k++) {
    T.copy(P[Math.min(n - 1, k + 1)]!).sub(P[Math.max(0, k - 1)]!).normalize();
    B.crossVectors(T, N).normalize();
    N.crossVectors(B, T).normalize();
    const t = k / (n - 1);
    const r = radius(t);
    const c = P[k]!;
    for (let i = 0; i <= radialSegments; i++) {
      const a = (i / radialSegments) * TAU;
      d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      b.addVertex(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r, d.x, d.y, d.z, i / radialSegments, t, color);
    }
  }
  const W = radialSegments + 1;
  for (let k = 0; k < n - 1; k++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = k * W + i, c = a + W;
      b.addTriangle(a, c, a + 1);
      b.addTriangle(a + 1, c, c + 1);
    }
  }
  if (capEnd) {
    const e = P[n - 1]!;
    const te = P[n - 1]!.clone().sub(P[n - 2]!).normalize();
    const ci = b.addVertex(e.x, e.y, e.z, te.x, te.y, te.z, 0.5, 1, color);
    for (let i = 0; i < radialSegments; i++) b.addTriangle((n - 1) * W + i, (n - 1) * W + i + 1, ci);
  }
  const g = b.build();
  fixWinding(g);
  return g;
}
