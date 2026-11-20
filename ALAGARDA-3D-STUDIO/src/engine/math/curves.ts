import { lerp } from './scalar';

/** Punto de control de un perfil 1D: [x, y]. */
export type ProfilePoint = readonly [number, number];
export type Vec3Tuple = readonly [number, number, number];

/**
 * Curva suave por tramos: interpola `y` entre puntos de control ordenados por `x`
 * con suavizado de Hermite. Es la función `curve(x, pts)` de TORERO, base de todos
 * sus perfiles anatómicos (anchura, lomo y vientre del toro, etc.).
 */
export function piecewiseSmooth(x: number, pts: readonly ProfilePoint[]): number {
  if (pts.length === 0) throw new Error('piecewiseSmooth() necesita al menos un punto');
  const first = pts[0]!;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < pts.length; i++) {
    const b = pts[i]!;
    if (x <= b[0]) {
      const a = pts[i - 1]!;
      const t = (x - a[0]) / (b[0] - a[0]);
      return lerp(a[1], b[1], t * t * (3 - 2 * t));
    }
  }
  return pts[pts.length - 1]![1];
}

/**
 * Muestrea `n` puntos de una spline Catmull-Rom uniforme que pasa por los puntos de control.
 * Adaptada de `crPts` de TORERO (src/assets.js), usada allí para las astas.
 */
export function catmullRomPoints(ctrl: readonly Vec3Tuple[], n: number): [number, number, number][] {
  if (ctrl.length < 2) throw new Error('catmullRomPoints() necesita al menos 2 puntos de control');
  if (n < 2) throw new Error('catmullRomPoints() necesita n >= 2');
  const out: [number, number, number][] = [];
  const last = ctrl.length - 1;
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * last;
    const i = Math.min(last - 1, Math.floor(t));
    const f = t - i;
    const p0 = ctrl[Math.max(0, i - 1)]!;
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const p3 = ctrl[Math.min(last, i + 2)]!;
    const pt = [0, 1, 2].map(
      (a) =>
        0.5 *
        (2 * p1[a]! +
          (-p0[a]! + p2[a]!) * f +
          (2 * p0[a]! - 5 * p1[a]! + 4 * p2[a]! - p3[a]!) * f * f +
          (-p0[a]! + 3 * p1[a]! - 3 * p2[a]! + p3[a]!) * f * f * f),
    ) as [number, number, number];
    out.push(pt);
  }
  return out;
}
