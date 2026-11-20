import * as THREE from 'three';
import { TAU } from '../math/scalar';
import type { ProfilePoint } from '../math/curves';
import { GeometryBuilder, type VertexColorFn } from './builder';
import { fixWinding } from './normals';

export interface LatheOptions {
  /**
   * Perfil [radio, altura]. Normal de cada tramo = (-dy, dr) como en TORERO: recorriendo el perfil
   * de arriba abajo por el exterior la normal apunta hacia fuera; de abajo arriba, hacia el eje.
   */
  profile: readonly ProfilePoint[];
  segments: number;
  /** Normales suavizadas entre tramos (true) o aristas duras (false). */
  smooth?: boolean;
  phiStart?: number;
  phiLength?: number;
  /** Invierte las normales (superficies vistas desde dentro, p. ej. tendidos). */
  flip?: boolean;
  color?: VertexColorFn;
}

/**
 * Sólido de revolución. Adaptado de `lathe(prof, seg, opts)` de TORERO, que se usa
 * para patas, cuello del torero, barrera, tendidos y gradas de la plaza.
 * A diferencia de `THREE.LatheGeometry` permite aristas duras por tramo, arco parcial,
 * normales invertidas y color por vértice.
 */
export function latheGeometry({
  profile, segments, smooth = false, phiStart = 0, phiLength = TAU, flip = false, color,
}: LatheOptions): THREE.BufferGeometry {
  if (profile.length < 2) throw new Error('latheGeometry(): el perfil necesita al menos 2 puntos');
  if (segments < 3) throw new Error('latheGeometry(): al menos 3 segmentos');
  // normal 2D (radial, vertical) de cada tramo
  const seg: { nr: number; ny: number; len: number }[] = [];
  for (let k = 0; k < profile.length - 1; k++) {
    const a = profile[k]!, c = profile[k + 1]!;
    const dr = c[0] - a[0], dy = c[1] - a[1];
    const l = Math.hypot(dr, dy) || 1;
    // mismo convenio que TORERO: normal = (-dy, dr)
    seg.push({ nr: -dy / l, ny: dr / l, len: l });
  }
  type Row = { r: number; y: number; nr: number; ny: number; v: number };
  const rows: Row[] = [];
  let v = 0;
  if (smooth) {
    for (let k = 0; k < profile.length; k++) {
      const s0 = seg[Math.max(0, k - 1)]!, s1 = seg[Math.min(seg.length - 1, k)]!;
      const nr = (s0.nr + s1.nr) / 2, ny = (s0.ny + s1.ny) / 2;
      const l = Math.hypot(nr, ny) || 1;
      const p = profile[k]!;
      rows.push({ r: p[0], y: p[1], nr: nr / l, ny: ny / l, v });
      if (k < seg.length) v += seg[k]!.len;
    }
  } else {
    for (let k = 0; k < seg.length; k++) {
      const s = seg[k]!, p0 = profile[k]!, p1 = profile[k + 1]!;
      rows.push({ r: p0[0], y: p0[1], nr: s.nr, ny: s.ny, v });
      rows.push({ r: p1[0], y: p1[1], nr: s.nr, ny: s.ny, v: v + s.len });
      v += s.len;
    }
  }
  const b = new GeometryBuilder();
  const f = flip ? -1 : 1;
  for (const row of rows) {
    for (let i = 0; i <= segments; i++) {
      const ph = phiStart + (phiLength * i) / segments;
      const c = Math.cos(ph), s = Math.sin(ph);
      b.addVertex(row.r * c, row.y, row.r * s, row.nr * c * f, row.ny * f, row.nr * s * f, (phiLength * i) / segments, row.v, color);
    }
  }
  const W = segments + 1;
  const step = smooth ? 1 : 2;
  for (let r = 0; r < rows.length - 1; r += step) {
    const a = r * W, c = (r + 1) * W;
    // en el eje (radio 0) los vértices de una fila coinciden: se omiten los triángulos degenerados
    const axisA = Math.abs(rows[r]!.r) < 1e-9, axisC = Math.abs(rows[r + 1]!.r) < 1e-9;
    for (let i = 0; i < segments; i++) {
      if (!axisA) b.addTriangle(a + i, c + i, a + i + 1);
      if (!axisC) b.addTriangle(a + i + 1, c + i, c + i + 1);
    }
  }
  const g = b.build();
  fixWinding(g);
  return g;
}
