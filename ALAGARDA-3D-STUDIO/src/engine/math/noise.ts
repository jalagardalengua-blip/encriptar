import { createRng } from './random';
import { lerp } from './scalar';

/**
 * Ruido de Perlin 3D mejorado con permutación sembrada.
 * Adaptado de `noise3` / `fbm3` de TORERO (src/engine.js), que usaba una
 * tabla global con semilla fija; aquí cada instancia tiene su propia semilla.
 */
export interface Noise3 {
  /** Valor aproximado en [-1, 1]. */
  noise(x: number, y: number, z: number): number;
  /** Suma fractal (fBm) de `octaves` capas. */
  fbm(x: number, y: number, z: number, octaves?: number): number;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function grad(h: number, x: number, y: number, z: number): number {
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -v : v);
}

export function createNoise3(seed = 11): Noise3 {
  const rng = createRng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const t = p[i]!;
    p[i] = p[j]!;
    p[j] = t;
  }
  const P = new Uint8Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255]!;

  const noise = (x: number, y: number, z: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = P[X]! + Y;
    const AA = P[A]! + Z;
    const AB = P[A + 1]! + Z;
    const B = P[X + 1]! + Y;
    const BA = P[B]! + Z;
    const BB = P[B + 1]! + Z;
    return lerp(
      lerp(
        lerp(grad(P[AA]! & 15, x, y, z), grad(P[BA]! & 15, x - 1, y, z), u),
        lerp(grad(P[AB]! & 15, x, y - 1, z), grad(P[BB]! & 15, x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(grad(P[AA + 1]! & 15, x, y, z - 1), grad(P[BA + 1]! & 15, x - 1, y, z - 1), u),
        lerp(grad(P[AB + 1]! & 15, x, y - 1, z - 1), grad(P[BB + 1]! & 15, x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    );
  };

  const fbm = (x: number, y: number, z: number, octaves = 4): number => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq, z * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };

  return { noise, fbm };
}
