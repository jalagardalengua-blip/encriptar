import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { toroGenerator } from '../src/engine/generators';
import { detectCapa } from '../src/engine/photo/capa';
import { fitToroToMask } from '../src/engine/photo/fit';
import { paintMask, segmentSubject } from '../src/engine/photo/segment';
import { iou, normalizePhotoMask } from '../src/engine/photo/silhouette';
import type { Mask, RGBAImage } from '../src/engine/photo/types';
import { defaultValues } from '../src/engine/procedural/params';
import { runGenerator } from '../src/engine/procedural/registry';
import { syntheticPhoto } from './photoHelpers';

const maskIoU = (a: Mask, b: Mask) => {
  let i = 0, u = 0;
  for (let k = 0; k < a.data.length; k++) { if (a.data[k] && b.data[k]) i++; if (a.data[k] || b.data[k]) u++; }
  return i / u;
};

/** Pinta el cuerpo de la foto sintética con una función de color. */
function paintBody(img: RGBAImage, mask: Mask, f: (x: number, y: number) => [number, number, number]): RGBAImage {
  const data = new Uint8ClampedArray(img.data);
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    const i = y * mask.width + x;
    if (mask.data[i]) data.set([...f(x, y), 255], i * 4);
  }
  return { ...img, data };
}

describe('recorte del toro', () => {
  it('separa un toro oscuro del albero con más de 95 % de acierto', () => {
    const { image, mask } = syntheticPhoto({}, { yaw: 0.2, pitch: 0.1, mirror: false });
    const m = segmentSubject(image);
    expect(maskIoU(m, mask)).toBeGreaterThan(0.95);
  });
  it('el toque elige la región y el pincel corrige', () => {
    const { image, mask } = syntheticPhoto({}, { yaw: 0, pitch: 0.1, mirror: false });
    const bb = normalizePhotoMask(mask)!.pf;
    const m = segmentSubject(image, { seed: { x: (bb.x0 + bb.x1) / 2 / mask.width, y: (bb.y0 + bb.y1) / 2 / mask.height } });
    expect(maskIoU(m, mask)).toBeGreaterThan(0.95);
    paintMask(m, 5, 5, 4, 1);
    expect(m.data[5 * m.width + 5]).toBe(1);
    paintMask(m, 5, 5, 4, 0);
    expect(m.data[5 * m.width + 5]).toBe(0);
  });
});

describe('ajuste por silueta (análisis por síntesis)', () => {
  it('recupera orientación y proporciones de un toro conocido', async () => {
    const truth = { longitud: 1.12, alzada: 0.95, patas: 1.08, morrillo: 1.4, perimetro: 0.92, largoAsta: 1.3, encornadura: 'corniabierto' };
    const { image } = syntheticPhoto(truth, { yaw: 0.25, pitch: 0.1, mirror: true });
    const mask = segmentSubject(image);
    const stages: string[] = [];
    const r = await fitToroToMask(mask, { start: {}, onProgress: (p) => stages.push(p.stage) });
    expect(r.iou).toBeGreaterThan(0.9);
    expect(r.view.mirror).toBe(true);
    expect(Math.abs(r.view.yaw - 0.25)).toBeLessThan(0.2);
    expect(Math.abs((r.values.longitud as number) - 1.12)).toBeLessThan(0.07);
    expect(Math.abs((r.values.alzada as number) - 0.95)).toBeLessThan(0.07);
    expect(stages).toContain('Afinado');
    expect(stages.at(-1)).toBe('Listo');
  });
  it('mejora claramente la coincidencia respecto al toro por defecto', async () => {
    const { mask } = syntheticPhoto({ longitud: 0.88, alzada: 1.1, patas: 1.12, morrillo: 0.3, postura: 'humillando' }, { yaw: -0.3, pitch: 0.15, mirror: false });
    const r = await fitToroToMask(mask, { start: {} });
    const { mask: def } = syntheticPhoto({}, { yaw: 0, pitch: 0.08, mirror: false });
    const before = iou(normalizePhotoMask(def)!.grid, r.target);
    expect(r.iou).toBeGreaterThan(before + 0.05);
    expect(r.iou).toBeGreaterThan(0.88);
  });
  it('se puede cancelar', async () => {
    const { mask } = syntheticPhoto({}, { yaw: 0, pitch: 0.1, mirror: false });
    const ctrl = new AbortController();
    const p = fitToroToMask(mask, { start: {}, signal: ctrl.signal, onProgress: () => ctrl.abort() });
    await expect(p).rejects.toThrow('cancelado');
  });
  it('rechaza una máscara vacía', async () => {
    await expect(fitToroToMask({ width: 4, height: 4, data: new Uint8Array(16) }, { start: {} })).rejects.toThrow();
  });
});

describe('detección de la capa', () => {
  const { image, mask } = syntheticPhoto({}, { yaw: 0, pitch: 0.1, mirror: false });
  const cases: [string, (x: number, y: number) => [number, number, number]][] = [
    ['negro', () => [24, 21, 19]],
    ['ensabanado', () => [222, 216, 204]],
    ['colorado', () => [150, 62, 30]],
    ['castaño', () => [78, 42, 24]],
    ['cárdeno', (x, y) => ((x * 7 + y * 13) % 5 < 2 ? [200, 200, 198] : [22, 22, 22])],
    ['berrendo', (x) => (Math.floor(x / 60) % 2 ? [225, 220, 210] : [20, 18, 17])],
  ];
  for (const [capa, f] of cases) {
    it(capa, () => expect(detectCapa(paintBody(image, mask, f), mask).capa).toBe(capa));
  }
});

describe('foto como textura', () => {
  const view = { yaw: 0.1, pitch: 0.1, mirror: false };
  const { image, mask } = syntheticPhoto({}, view);
  const blue = paintBody(image, mask, () => [40, 70, 200]);
  const mean = (out: ReturnType<typeof runGenerator>) => {
    const mat = (out.parts.find((p) => p.name === 'cuerpo')!.object as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
    const d = (mat.map as THREE.DataTexture).image.data as Uint8Array;
    let r = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]!; b += d[i + 2]!; }
    return { r: r / (d.length / 4), b: b / (d.length / 4) };
  };
  const values = { ...defaultValues(toroGenerator.params), capa: 'negro', polvo: 0 };
  it('proyecta los colores de la foto sobre el pelaje', () => {
    const withPhoto = mean(runGenerator(toroGenerator, values, 'bajo', { photo: { image: blue, mask, view } }));
    const without = mean(runGenerator(toroGenerator, values, 'bajo'));
    expect(withPhoto.b).toBeGreaterThan(without.b + 25);
    expect(withPhoto.b).toBeGreaterThan(withPhoto.r);
  });
  it('se desactiva con «Usar la foto como textura»', () => {
    const off = mean(runGenerator(toroGenerator, { ...values, texturaFoto: false }, 'bajo', { photo: { image: blue, mask, view } }));
    const without = mean(runGenerator(toroGenerator, values, 'bajo'));
    expect(Math.abs(off.b - without.b)).toBeLessThan(1);
  });
});
