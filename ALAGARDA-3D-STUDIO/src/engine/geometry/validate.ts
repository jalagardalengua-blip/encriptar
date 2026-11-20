import type * as THREE from 'three';

export interface GeometryReport {
  vertexCount: number;
  triangleCount: number;
  hasNaN: boolean;
  indexOutOfRange: boolean;
  /** Normales cuya longitud se aleja de 1 más de 1e-3. */
  badNormals: number;
  /** Triángulos con área prácticamente nula. */
  degenerateTriangles: number;
}

/** Comprueba que una geometría generada es apta para render y exportación glTF. */
export function inspectGeometry(g: THREE.BufferGeometry): GeometryReport {
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const idx = g.getIndex();
  let hasNaN = false;
  for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i] as number)) { hasNaN = true; break; }
  let badNormals = 0;
  if (nrm) {
    for (let i = 0; i < nrm.count; i++) {
      const l = Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      if (!Number.isFinite(l) || Math.abs(l - 1) > 1e-3) badNormals++;
    }
  }
  let indexOutOfRange = false;
  let degenerate = 0;
  const triangleCount = idx ? idx.count / 3 : pos.count / 3;
  if (idx) {
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
      if (a >= pos.count || b >= pos.count || c >= pos.count) { indexOutOfRange = true; continue; }
      const ux = pos.getX(b) - pos.getX(a), uy = pos.getY(b) - pos.getY(a), uz = pos.getZ(b) - pos.getZ(a);
      const vx = pos.getX(c) - pos.getX(a), vy = pos.getY(c) - pos.getY(a), vz = pos.getZ(c) - pos.getZ(a);
      const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
      if (area < 1e-12) degenerate++;
    }
  }
  return { vertexCount: pos.count, triangleCount, hasNaN, indexOutOfRange, badNormals, degenerateTriangles: degenerate };
}
