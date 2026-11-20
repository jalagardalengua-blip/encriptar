import * as THREE from 'three';
import { TAU } from '../math/scalar';
import { GeometryBuilder, type VertexColorFn } from './builder';
import { computeWeldedNormals, orientByHint } from './normals';

/** Deformación de un punto de la esfera unitaria (eje largo = Z) a su posición final. */
export type BlobDeform = (x: number, y: number, z: number) => readonly [number, number, number];

export interface BlobOptions {
  widthSegments: number;
  heightSegments: number;
  deform?: BlobDeform;
  color?: VertexColorFn;
}

/**
 * Esfera deformable. Adaptada de `blob(ws, hs, fn, col)` de TORERO, la primitiva con la que
 * se esculpen cuerpo, cuello y cabeza del toro, y de `bodyGeo(P)` de GANADERIA-27,
 * que hace lo mismo sobre `THREE.SphereGeometry`.
 * Los polos están sobre el eje Z, igual que en el original, para que la deformación
 * por perfiles a lo largo del cuerpo (z ∈ [-1, 1]) se pueda trasladar sin cambios.
 */
export function blobGeometry({ widthSegments, heightSegments, deform, color }: BlobOptions): THREE.BufferGeometry {
  if (widthSegments < 3 || heightSegments < 2) throw new Error('blobGeometry(): segmentos insuficientes');
  const b = new GeometryBuilder();
  const hint: number[] = [];
  for (let j = 0; j <= heightSegments; j++) {
    const th = (j / heightSegments) * Math.PI;
    for (let i = 0; i <= widthSegments; i++) {
      const ph = (i / widthSegments) * TAU;
      const ux = Math.sin(th) * Math.cos(ph);
      const uy = Math.sin(th) * Math.sin(ph);
      const uz = Math.cos(th);
      const p = deform ? deform(ux, uy, uz) : ([ux, uy, uz] as const);
      b.addVertex(p[0], p[1], p[2], ux, uy, uz, i / widthSegments, j / heightSegments, color);
      hint.push(ux, uy, uz);
    }
  }
  const W = widthSegments + 1;
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < widthSegments; i++) {
      const a = j * W + i;
      const c = a + W;
      if (j > 0) b.addTriangle(a, c, a + 1);
      if (j < heightSegments - 1) b.addTriangle(a + 1, c, c + 1);
    }
  }
  const g = b.build();
  orientByHint(g, hint);
  computeWeldedNormals(g);
  return g;
}
