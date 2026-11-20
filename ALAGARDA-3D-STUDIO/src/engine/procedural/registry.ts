import * as THREE from 'three';
import { createNoise3 } from '../math/noise';
import { createRng } from '../math/random';
import { sanitizeValues } from './params';
import type { DetailLevel, GeneratorCategory, GeneratorOutput, GeneratorStats, ProceduralGenerator } from './types';

/** Registro de generadores disponibles. Las fases siguientes añaden toro, torero, caballo, plaza y escenarios. */
export class GeneratorRegistry {
  private readonly generators = new Map<string, ProceduralGenerator>();

  register(gen: ProceduralGenerator): void {
    if (this.generators.has(gen.id)) throw new Error(`Generador duplicado: ${gen.id}`);
    const keys = new Set<string>();
    for (const p of gen.params) {
      if (keys.has(p.key)) throw new Error(`Parámetro duplicado en ${gen.id}: ${p.key}`);
      keys.add(p.key);
    }
    this.generators.set(gen.id, gen);
  }

  get(id: string): ProceduralGenerator | undefined {
    return this.generators.get(id);
  }

  list(category?: GeneratorCategory): ProceduralGenerator[] {
    const all = [...this.generators.values()];
    return category ? all.filter((g) => g.category === category) : all;
  }
}

export function computeStats(root: THREE.Object3D): GeneratorStats {
  const stats: GeneratorStats = { meshes: 0, vertices: 0, triangles: 0 };
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      stats.meshes++;
      stats.vertices += g.getAttribute('position').count;
      stats.triangles += (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    }
  });
  return stats;
}

/** Ejecuta un generador saneando parámetros y creando el contexto determinista. */
export function runGenerator(gen: ProceduralGenerator, raw: Partial<Record<string, unknown>>, detail: DetailLevel = 'medio'): GeneratorOutput {
  const values = sanitizeValues(gen.params, raw);
  const seedValue = values.seed;
  const seed = typeof seedValue === 'number' ? seedValue : 1;
  const out = gen.generate(values, { rng: createRng(seed), noise: createNoise3(seed), detail });
  out.root.name ||= gen.id;
  out.root.userData.generator = { id: gen.id, version: gen.version, values };
  return out;
}

/** Libera geometrías, materiales y texturas de un modelo generado. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      (o.geometry as THREE.BufferGeometry).dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats as THREE.Material[]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    }
  });
}
