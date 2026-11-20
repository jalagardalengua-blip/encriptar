import { describe, expect, it } from 'vitest';
import { catmullRomPoints, clamp, createNoise3, createRng, gaussianBump, mulberry32, piecewiseSmooth, smoothstep } from '../src/engine/math';

describe('rng', () => {
  it('es determinista por semilla', () => {
    const a = createRng(42), b = createRng(42);
    const sa = Array.from({ length: 20 }, () => a.next());
    const sb = Array.from({ length: 20 }, () => b.next());
    expect(sa).toEqual(sb);
    expect(createRng(43).next()).not.toBe(sa[0]);
  });
  it('reproduce el mulberry original de TORERO', () => {
    // implementación literal de TORERO/src/engine.js
    function mulberryTorero(s: number) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    const a = mulberry32(11), b = mulberryTorero(11);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });
  it('respeta los rangos', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = r.range(-2, 3);
      expect(x).toBeGreaterThanOrEqual(-2);
      expect(x).toBeLessThan(3);
      const n = r.int(1, 6);
      expect(Number.isInteger(n) && n >= 1 && n <= 6).toBe(true);
    }
    expect(() => r.pick([])).toThrow();
  });
});

describe('ruido', () => {
  it('determinista, acotado y dependiente de la semilla', () => {
    const n1 = createNoise3(5), n2 = createNoise3(5), n3 = createNoise3(6);
    let diff = 0;
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37, y = i * 0.11, z = i * 0.73;
      const v = n1.noise(x, y, z);
      expect(v).toBe(n2.noise(x, y, z));
      expect(Math.abs(v)).toBeLessThanOrEqual(1.01);
      diff += Math.abs(v - n3.noise(x, y, z));
    }
    expect(diff).toBeGreaterThan(1);
  });
  it('vale 0 en los nodos enteros (propiedad de Perlin)', () => {
    const n = createNoise3(1);
    expect(n.noise(3, 4, 5)).toBeCloseTo(0, 10);
  });
});

describe('curvas', () => {
  it('piecewiseSmooth interpola y satura en los extremos', () => {
    const pts = [[-1, 0.2], [0, 0.4], [1, 0.1]] as const;
    expect(piecewiseSmooth(-5, pts)).toBe(0.2);
    expect(piecewiseSmooth(0, pts)).toBe(0.4);
    expect(piecewiseSmooth(9, pts)).toBe(0.1);
    expect(piecewiseSmooth(-0.5, pts)).toBeCloseTo(0.3, 10);
  });
  it('Catmull-Rom pasa por los puntos de control', () => {
    const ctrl = [[0, 0, 0], [1, 2, 0], [3, 1, 1], [4, 4, 2]] as const;
    const pts = catmullRomPoints(ctrl, 4);
    pts.forEach((p, i) => p.forEach((v, a) => expect(v).toBeCloseTo(ctrl[i]![a]!, 10)));
  });
  it('escalares', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(gaussianBump(0.3, 0.3, 0.1)).toBe(1);
  });
});
