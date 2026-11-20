import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { dilate, linearToSrgbByte, packAtlas, rasterizeUV, uvMetricSize } from '../src/engine/texture/atlas';

describe('atlas', () => {
  it('empaqueta sin solapes, dentro del atlas y con densidad uniforme', () => {
    const sizes = [{ w: 2, h: 1 }, { w: 0.3, h: 0.9 }, { w: 0.5, h: 0.5 }, { w: 0.1, h: 0.4 }, { w: 1, h: 0.2 }];
    const { rects, texelsPerMeter } = packAtlas(sizes, 1024, 4);
    rects.forEach((r, i) => {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
      expect(r.w * 1024 / sizes[i]!.w).toBeCloseTo(texelsPerMeter, 6);
      for (let j = 0; j < i; j++) {
        const q = rects[j]!;
        const overlap = r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h;
        expect(overlap).toBe(false);
      }
    });
  });

  it('mide el tamaño métrico del rango UV', () => {
    const g = new THREE.PlaneGeometry(2, 0.5, 4, 4);
    const m = uvMetricSize(g, new THREE.Matrix4());
    expect(m.su).toBeCloseTo(2, 6);
    expect(m.sv).toBeCloseTo(0.5, 6);
    expect(m.area).toBeCloseTo(1, 6);
  });

  it('rasteriza cubriendo todo el rango UV de un plano e interpola la posición', () => {
    const g = new THREE.PlaneGeometry(1, 1, 3, 3);
    const size = 32;
    let n = 0;
    let maxErr = 0;
    rasterizeUV(g, new THREE.Matrix4(), size, (t, x, y) => {
      n++;
      const u = ((t % size) + 0.5) / size, v = (Math.floor(t / size) + 0.5) / size;
      maxErr = Math.max(maxErr, Math.abs(x - (u - 0.5)), Math.abs(y - (v - 0.5)));
    });
    expect(n).toBeGreaterThanOrEqual(size * size);
    expect(maxErr).toBeLessThan(1e-6);
  });

  it('rellena los bordes vacíos', () => {
    const size = 4, data = new Uint8Array(size * size * 4), mask = new Uint8Array(size * size);
    data.set([200, 100, 50, 255], 5 * 4);
    mask[5] = 1;
    dilate(data, mask, size, 6);
    for (let i = 0; i < size * size; i++) expect(data[i * 4]).toBe(200);
  });

  it('convierte lineal a sRGB', () => {
    expect(linearToSrgbByte(0)).toBe(0);
    expect(linearToSrgbByte(1)).toBe(255);
    expect(linearToSrgbByte(0.214)).toBeCloseTo(128, -1);
  });
});
