import type * as THREE from 'three';
import type { Noise3 } from '../math/noise';
import type { Rng } from '../math/random';
import type { PhotoInput } from '../photo/types';
import type { ParamDef, ParamValues } from './params';

/** Familias de generadores previstas. `utilidad` agrupa muestrarios y pruebas. */
export type GeneratorCategory = 'toro' | 'torero' | 'caballo' | 'plaza' | 'escenario' | 'utilidad';

/** Nivel de detalle solicitado: controla segmentos y resolución de texturas. */
export type DetailLevel = 'bajo' | 'medio' | 'alto';

export interface GeneratorContext {
  /** RNG determinista sembrado con el parámetro `seed` (o 1 si no existe). */
  rng: Rng;
  /** Ruido 3D sembrado con la misma semilla. */
  noise: Noise3;
  detail: DetailLevel;
  /** Entradas externas opcionales (p. ej. una foto ajustada para proyectarla como textura). */
  inputs?: GeneratorInputs;
}

export interface GeneratorInputs {
  photo?: PhotoInput;
}

/** Pieza con nombre del modelo generado (se conserva en el nodo glTF). */
export interface GeneratedPart {
  name: string;
  object: THREE.Object3D;
}

export interface GeneratorStats {
  meshes: number;
  vertices: number;
  triangles: number;
}

export interface GeneratorOutput {
  /** Raíz del modelo. Unidades en metros, Y hacia arriba, frente hacia +Z. */
  root: THREE.Group;
  parts: GeneratedPart[];
  stats: GeneratorStats;
}

export interface GeneratorPreset {
  id: string;
  label: string;
  values: Partial<ParamValues>;
}

/**
 * Contrato que cumple todo generador procedural de ALAGARDA 3D STUDIO.
 * `generate` debe ser una función pura respecto a (`values`, `ctx`): mismos
 * parámetros y semilla ⇒ misma geometría.
 */
export interface ProceduralGenerator {
  id: string;
  name: string;
  category: GeneratorCategory;
  /** Versión semántica del algoritmo; se guarda con cada proyecto. */
  version: string;
  description: string;
  params: readonly ParamDef[];
  presets?: readonly GeneratorPreset[];
  generate(values: ParamValues, ctx: GeneratorContext): GeneratorOutput;
}
