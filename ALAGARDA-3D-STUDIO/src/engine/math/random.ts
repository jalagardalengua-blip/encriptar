/**
 * Generador pseudoaleatorio determinista (mulberry32).
 * Mismo algoritmo que `mulberry` en TORERO y GANADERIA-27: con la misma semilla
 * se obtiene exactamente la misma secuencia, requisito para que un modelo
 * procedural sea reproducible a partir de sus parámetros.
 */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Número en [min, max). */
  range(min: number, max: number): number;
  /** Entero en [min, max] (ambos incluidos). */
  int(min: number, max: number): number;
  /** Elemento aleatorio de una lista no vacía. */
  pick<T>(items: readonly T[]): T;
  /** Normal estándar (Box-Muller). */
  gaussian(): number;
  /** Semilla con la que se creó. */
  readonly seed: number;
}

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    seed,
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() sobre una lista vacía');
      return items[Math.floor(next() * items.length)] as T;
    },
    gaussian: () => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
