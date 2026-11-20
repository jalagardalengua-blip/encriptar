/** Utilidades escalares. Equivalentes a `clamp/lerp/sstep` de TORERO (src/engine.js). */
export const TAU = Math.PI * 2;

export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolación de Hermite entre los bordes `edge0` y `edge1`. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Campana gaussiana centrada en `c` con anchura `w`. Adaptada de `ga` en GANADERIA-27 (js/mundo3d.js). */
export function gaussianBump(t: number, c: number, w: number): number {
  return Math.exp(-((t - c) * (t - c)) / (2 * w * w));
}
