import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { blobGeometry, inspectGeometry, latheGeometry, loftGeometry, tubeGeometry } from '../src/engine/geometry';
import { catmullRomPoints } from '../src/engine/math';
import { signedVolume } from './helpers';

function expectClean(g: THREE.BufferGeometry) {
  const r = inspectGeometry(g);
  expect(r.hasNaN).toBe(false);
  expect(r.indexOutOfRange).toBe(false);
  expect(r.badNormals).toBe(0);
  expect(r.degenerateTriangles).toBe(0);
  expect(r.triangleCount).toBeGreaterThan(0);
  return r;
}

describe('blobGeometry', () => {
  it('esfera unitaria cerrada, orientada hacia fuera, con volumen ≈ 4π/3', () => {
    const g = blobGeometry({ widthSegments: 64, heightSegments: 48 });
    expectClean(g);
    expect(signedVolume(g)).toBeCloseTo((4 / 3) * Math.PI, 1);
  });
  it('mantiene la orientación aunque la deformación refleje la malla', () => {
    const g = blobGeometry({ widthSegments: 24, heightSegments: 16, deform: (x, y, z) => [-x * 2, y, z * 0.5] });
    expectClean(g);
    expect(signedVolume(g)).toBeGreaterThan(0);
  });
  it('suelda las normales en la costura de UV', () => {
    const g = blobGeometry({ widthSegments: 16, heightSegments: 8 });
    const n = g.getAttribute('normal');
    const W = 17; // vértices por fila
    const row = 4;
    const a = row * W, b = row * W + 16; // primer y último vértice de la fila (misma posición)
    expect(n.getX(a)).toBeCloseTo(n.getX(b), 6);
    expect(n.getZ(a)).toBeCloseTo(n.getZ(b), 6);
  });
  it('genera color por vértice cuando se pide', () => {
    const g = blobGeometry({ widthSegments: 8, heightSegments: 6, color: () => [1, 0, 0] });
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
  });
});

describe('latheGeometry', () => {
  it('cilindro cerrado: normales hacia fuera y volumen ≈ π r² h', () => {
    const g = latheGeometry({ profile: [[0, 1], [1, 1], [1, 0], [0, 0]], segments: 96 });
    expectClean(g);
    expect(signedVolume(g)).toBeCloseTo(Math.PI, 2);
    // un vértice del lateral: la normal apunta en la dirección radial
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      if (Math.abs(r - 1) < 1e-6 && p.getY(i) > 0.01 && p.getY(i) < 0.99) {
        expect(n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i)).toBeGreaterThan(0);
      }
    }
  });
  it('flip invierte las normales', () => {
    const a = latheGeometry({ profile: [[2, 0], [2, 1]], segments: 8 });
    const b = latheGeometry({ profile: [[2, 0], [2, 1]], segments: 8, flip: true });
    expect(a.getAttribute('normal').getX(0)).toBeCloseTo(-b.getAttribute('normal').getX(0), 10);
  });
  it('rechaza perfiles inválidos', () => {
    expect(() => latheGeometry({ profile: [[1, 0]], segments: 8 })).toThrow();
  });
});

describe('tubeGeometry', () => {
  it('tubo curvo de radio variable sin defectos', () => {
    const path = catmullRomPoints([[0, 0, 0], [0.2, 0.2, 0.05], [0.3, 0.5, 0.2], [0.2, 0.8, 0.3]], 24);
    const g = tubeGeometry({ path, radialSegments: 10, radius: (t) => 0.05 * (1 - t) + 0.003 });
    const r = expectClean(g);
    expect(r.vertexCount).toBe(24 * 11 + 1);
  });
  it('tubo recto: radio exacto y tapa final en el extremo', () => {
    const path: [number, number, number][] = Array.from({ length: 10 }, (_, i) => [0, i / 9, 0]);
    const g = tubeGeometry({ path, radialSegments: 32, radius: () => 0.1 });
    expectClean(g);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count - 1; i++) expect(Math.hypot(p.getX(i), p.getZ(i))).toBeCloseTo(0.1, 6);
    const last = p.count - 1;
    expect([p.getX(last), p.getY(last), p.getZ(last)]).toEqual([0, 1, 0]);
    const open = tubeGeometry({ path, radialSegments: 32, radius: () => 0.1, capEnd: false });
    expect(open.getAttribute('position').count).toBe(p.count - 1);
  });
});

describe('loftGeometry', () => {
  it('barrido elíptico cerrado y orientado hacia fuera', () => {
    const g = loftGeometry({ keys: [[0, 0.2, 0.1, 0], [0.5, 0.3, 0.15, 0.02], [1, 0.1, 0.08, 0]], segments: 32, rows: 20 });
    expectClean(g);
    expect(signedVolume(g)).toBeGreaterThan(0);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 6);
  });
});
