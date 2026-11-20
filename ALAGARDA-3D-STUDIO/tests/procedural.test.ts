import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { primitivasGenerator, registry } from '../src/engine/generators';
import { inspectGeometry } from '../src/engine/geometry';
import { defaultValues, sanitizeValue, sanitizeValues, type ParamDef } from '../src/engine/procedural/params';
import { GeneratorRegistry, disposeObject, runGenerator } from '../src/engine/procedural/registry';

const positionsOf = (root: THREE.Object3D) => {
  const out: number[] = [];
  root.traverse((o) => { if (o instanceof THREE.Mesh) out.push(...(o.geometry.getAttribute('position').array as Float32Array)); });
  return out;
};

describe('parámetros', () => {
  const num: ParamDef = { key: 'a', label: 'A', type: 'number', min: 0, max: 1, step: 0.1, default: 0.5 };
  const en: ParamDef = { key: 'e', label: 'E', type: 'enum', options: [{ value: 'x', label: 'X' }], default: 'x' };
  const col: ParamDef = { key: 'c', label: 'C', type: 'color', default: '#000000' };
  it('sanea rangos, tipos y opciones', () => {
    expect(sanitizeValue(num, 5)).toBe(1);
    expect(sanitizeValue(num, 'nope')).toBe(0.5);
    expect(sanitizeValue(en, 'y')).toBe('x');
    expect(sanitizeValue(col, '#ABCDEF')).toBe('#abcdef');
    expect(sanitizeValue(col, 'red')).toBe('#000000');
    expect(sanitizeValues([num, en], { a: 0.2, zzz: 1 })).toEqual({ a: 0.2, e: 'x' });
  });
});

describe('registro', () => {
  it('rechaza duplicados', () => {
    const r = new GeneratorRegistry();
    r.register(primitivasGenerator);
    expect(() => r.register(primitivasGenerator)).toThrow();
  });
  it('el registro por defecto incluye el muestrario', () => {
    expect(registry.get('utilidad.primitivas')).toBe(primitivasGenerator);
    expect(registry.list('utilidad')).toHaveLength(1);
    expect(registry.list('toro')).toHaveLength(0);
  });
});

describe('muestrario de primitivas', () => {
  it('genera 4 piezas válidas con nombres', () => {
    const out = runGenerator(primitivasGenerator, defaultValues(primitivasGenerator.params));
    expect(out.parts.map((p) => p.name)).toEqual(['blob', 'lathe', 'tube', 'loft']);
    expect(out.stats.meshes).toBe(4);
    for (const p of out.parts) {
      const r = inspectGeometry((p.object as THREE.Mesh).geometry);
      expect(r.hasNaN).toBe(false);
      expect(r.indexOutOfRange).toBe(false);
    }
    expect(out.root.userData.generator.id).toBe('utilidad.primitivas');
    disposeObject(out.root);
  });
  it('es determinista: misma semilla ⇒ misma geometría; otra semilla ⇒ otra', () => {
    const v = { ...defaultValues(primitivasGenerator.params), ruido: 0.15 };
    const a = positionsOf(runGenerator(primitivasGenerator, { ...v, seed: 9 }).root);
    const b = positionsOf(runGenerator(primitivasGenerator, { ...v, seed: 9 }).root);
    const c = positionsOf(runGenerator(primitivasGenerator, { ...v, seed: 10 }).root);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it('el nivel de detalle cambia la resolución', () => {
    const v = { primitiva: 'blob' };
    const lo = runGenerator(primitivasGenerator, v, 'bajo').stats.vertices;
    const hi = runGenerator(primitivasGenerator, v, 'alto').stats.vertices;
    expect(hi).toBeGreaterThan(lo * 4);
  });
  it('cada parámetro del esquema influye en el resultado (no hay controles falsos)', () => {
    const base = defaultValues(primitivasGenerator.params);
    const ref = runGenerator(primitivasGenerator, base);
    const refPos = positionsOf(ref.root);
    const refMat = (ref.parts[0]!.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
    for (const def of primitivasGenerator.params) {
      let changed: unknown;
      switch (def.type) {
        case 'number': case 'integer': changed = def.default === def.max ? def.min : def.max; break;
        case 'enum': changed = def.options.find((o) => o.value !== def.default)!.value; break;
        case 'color': changed = '#123456'; break;
        case 'seed': changed = def.default + 1; break;
        case 'boolean': changed = !def.default; break;
      }
      const out = runGenerator(primitivasGenerator, { ...base, [def.key]: changed });
      const mat = (out.parts[0]!.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const differs = JSON.stringify(positionsOf(out.root)) !== JSON.stringify(refPos)
        || !mat.color.equals(refMat.color) || mat.roughness !== refMat.roughness;
      expect(differs, `el parámetro «${def.key}» no tiene efecto`).toBe(true);
    }
  });
});
