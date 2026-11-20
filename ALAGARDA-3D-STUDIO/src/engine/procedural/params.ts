/**
 * Esquema de parámetros de un generador. La interfaz de usuario se construye
 * a partir de estas definiciones, de modo que cada control visible corresponde
 * a un parámetro que el generador usa de verdad.
 */
interface ParamBase {
  key: string;
  label: string;
  group?: string;
  description?: string;
}

export interface NumberParam extends ParamBase {
  type: 'number';
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface IntegerParam extends ParamBase {
  type: 'integer';
  min: number;
  max: number;
  default: number;
}

export interface BooleanParam extends ParamBase {
  type: 'boolean';
  default: boolean;
}

export interface EnumParam extends ParamBase {
  type: 'enum';
  options: readonly { value: string; label: string }[];
  default: string;
}

export interface ColorParam extends ParamBase {
  type: 'color';
  /** Color sRGB en formato `#rrggbb`. */
  default: string;
}

export interface SeedParam extends ParamBase {
  type: 'seed';
  default: number;
}

export type ParamDef = NumberParam | IntegerParam | BooleanParam | EnumParam | ColorParam | SeedParam;
export type ParamValue = number | boolean | string;
export type ParamValues = Record<string, ParamValue>;

const HEX = /^#[0-9a-f]{6}$/i;

/** Valores por defecto de un esquema. */
export function defaultValues(defs: readonly ParamDef[]): ParamValues {
  const out: ParamValues = {};
  for (const d of defs) out[d.key] = d.default;
  return out;
}

/** Ajusta un valor arbitrario a lo que admite su definición (rango, tipo, opciones). */
export function sanitizeValue(def: ParamDef, raw: unknown): ParamValue {
  switch (def.type) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return def.default;
      return Math.min(def.max, Math.max(def.min, n));
    }
    case 'integer': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return def.default;
      return Math.round(Math.min(def.max, Math.max(def.min, n)));
    }
    case 'seed': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? Math.abs(Math.trunc(n)) % 2147483647 : def.default;
    }
    case 'boolean':
      return typeof raw === 'boolean' ? raw : def.default;
    case 'enum':
      return typeof raw === 'string' && def.options.some((o) => o.value === raw) ? raw : def.default;
    case 'color':
      return typeof raw === 'string' && HEX.test(raw) ? raw.toLowerCase() : def.default;
  }
}

/** Completa y sanea un conjunto de valores (p. ej. leído de IndexedDB o de un archivo). */
export function sanitizeValues(defs: readonly ParamDef[], raw: Partial<Record<string, unknown>>): ParamValues {
  const out: ParamValues = {};
  for (const d of defs) out[d.key] = d.key in raw ? sanitizeValue(d, raw[d.key]) : d.default;
  return out;
}

/** Lectores tipados para usar dentro de los generadores. */
export const read = {
  number(values: ParamValues, key: string): number {
    const v = values[key];
    if (typeof v !== 'number') throw new Error(`Parámetro numérico ausente: ${key}`);
    return v;
  },
  boolean(values: ParamValues, key: string): boolean {
    const v = values[key];
    if (typeof v !== 'boolean') throw new Error(`Parámetro booleano ausente: ${key}`);
    return v;
  },
  string(values: ParamValues, key: string): string {
    const v = values[key];
    if (typeof v !== 'string') throw new Error(`Parámetro de texto ausente: ${key}`);
    return v;
  },
};
