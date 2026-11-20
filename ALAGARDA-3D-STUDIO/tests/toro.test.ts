import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { toroGenerator } from '../src/engine/generators';
import { inspectGeometry } from '../src/engine/geometry';
import { defaultValues } from '../src/engine/procedural/params';
import { disposeObject, runGenerator } from '../src/engine/procedural/registry';

const base = defaultValues(toroGenerator.params);
const gen = (v: Record<string, unknown> = {}) => runGenerator(toroGenerator, { ...base, ...v }, 'bajo');

/** Huella del resultado: geometría, colores por vértice, materiales y texturas. */
function fingerprint(root: THREE.Object3D): string {
  let h = 0;
  const add = (x: number) => { h = (Math.imul(h, 31) + Math.round(x * 1e4)) | 0; };
  const seen = new Set<THREE.Texture>();
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = o.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 7) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); add(v.x); add(v.y); add(v.z); }
    const col = o.geometry.getAttribute('color');
    if (col) for (let i = 0; i < col.count; i += 3) add(col.getX(i) + col.getY(i) * 3 + col.getZ(i) * 7);
    const m = o.material as THREE.MeshPhysicalMaterial;
    add(m.color.r + m.color.g * 3 + m.color.b * 7); add(m.roughness); add(m.sheen ?? 0); add(m.sheenColor?.r ?? 0);
    for (const t of [m.map, m.normalMap]) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      const d = (t as THREE.DataTexture).image.data as Uint8Array;
      let s = 0;
      for (let i = 0; i < d.length; i += 3) s = (Math.imul(s, 33) + d[i]!) | 0;
      add(s);
    }
  });
  return String(h);
}

describe('generador de toro', () => {
  it('genera todas las piezas con geometría limpia', () => {
    const out = gen();
    const names = out.parts.map((p) => p.name);
    for (const n of ['cuerpo', 'cuello', 'cabeza', 'morro', 'ojos', 'asta_izq', 'asta_der', 'rabo', 'borla', 'divisa', 'escroto',
      'brazo_ad_izq', 'cana_ad_izq', 'pezuna_ad_izq', 'brazo_tr_der', 'cana_tr_der', 'pezuna_tr_der']) {
      expect(names, n).toContain(n);
    }
    for (const p of out.parts) {
      const r = inspectGeometry((p.object as THREE.Mesh).geometry);
      expect(r.hasNaN, p.name).toBe(false);
      expect(r.indexOutOfRange, p.name).toBe(false);
    }
    disposeObject(out.root);
  });

  it('apoya las pezuñas en el suelo en todas las posturas y tipos', () => {
    for (const postura of ['parado', 'humillando', 'paso', 'alerta']) {
      for (const tipo of ['toro', 'vaca', 'becerro', 'cabestro']) {
        const out = gen({ postura, tipo });
        const box = new THREE.Box3().setFromObject(out.root);
        expect(box.min.y, `${tipo}/${postura}`).toBeCloseTo(0, 3);
        disposeObject(out.root);
      }
    }
  });

  it('tiene dimensiones realistas de toro de lidia', () => {
    const box = new THREE.Box3().setFromObject(gen().root);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(1.3); // hasta la punta de las astas
    expect(size.y).toBeLessThan(1.9);
    expect(size.z).toBeGreaterThan(2.2); // del morro al rabo
    expect(size.z).toBeLessThan(3.2);
    const calf = new THREE.Box3().setFromObject(gen({ tipo: 'becerro' }).root).getSize(new THREE.Vector3());
    expect(calf.z).toBeLessThan(size.z * 0.75);
  });

  it('cada tipo tiene sus rasgos (escroto, ubre, cencerro)', () => {
    const names = (tipo: string) => gen({ tipo }).parts.map((p) => p.name);
    expect(names('vaca')).toContain('ubre');
    expect(names('vaca')).not.toContain('escroto');
    expect(names('cabestro')).toContain('cencerro');
    expect(names('cabestro')).not.toContain('escroto');
  });

  it('hornea un atlas de pelo con color y relieve', () => {
    const out = gen();
    const mat = (out.parts.find((p) => p.name === 'cuerpo')!.object as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
    expect(mat.map).toBeInstanceOf(THREE.DataTexture);
    expect(mat.normalMap).toBeInstanceOf(THREE.DataTexture);
    expect((mat.map as THREE.DataTexture).image.width).toBe(512);
    expect(out.root.userData.atlas.coverage).toBeGreaterThan(0.3);
    // todas las piezas con pelo comparten el material (un solo atlas)
    const furMeshes = out.parts.filter((p) => ((p.object as THREE.Mesh).material as THREE.Material).name === 'pelo');
    expect(furMeshes.length).toBeGreaterThanOrEqual(14);
    // las UV de cada pieza caen dentro de [0,1]
    for (const p of furMeshes) {
      const uv = (p.object as THREE.Mesh).geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
        expect(uv.getX(i)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('un toro negro es oscuro y uno ensabanado claro', () => {
    const avg = (capa: string) => {
      const out = gen({ capa, polvo: 0 });
      const mat = (out.parts[0]!.object as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
      const d = (mat.map as THREE.DataTexture).image.data as Uint8Array;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i]! + d[i + 1]! + d[i + 2]!;
      return s / (d.length / 4) / 3;
    };
    expect(avg('negro')).toBeLessThan(60);
    expect(avg('ensabanado')).toBeGreaterThan(120);
  });

  it('es determinista por semilla', () => {
    expect(fingerprint(gen({ seed: 3 }).root)).toBe(fingerprint(gen({ seed: 3 }).root));
    expect(fingerprint(gen({ seed: 3 }).root)).not.toBe(fingerprint(gen({ seed: 4 }).root));
  });

  it('cada parámetro del esquema cambia el modelo (no hay controles falsos)', () => {
    const ref = fingerprint(gen().root);
    for (const def of toroGenerator.params) {
      let changed: unknown;
      switch (def.type) {
        case 'number': case 'integer': changed = def.default === def.max ? def.min : def.max; break;
        case 'enum': changed = def.options.find((o) => o.value !== def.default)!.value; break;
        case 'color': changed = '#123456'; break;
        case 'seed': changed = def.default + 1; break;
        case 'boolean': changed = !def.default; break;
      }
      const out = gen({ [def.key]: changed });
      expect(fingerprint(out.root), `el parámetro «${def.key}» no tiene efecto`).not.toBe(ref);
      disposeObject(out.root);
    }
  });

  it('todos los presets generan sin errores', () => {
    for (const p of toroGenerator.presets!) {
      const out = gen(p.values);
      expect(out.stats.meshes, p.id).toBeGreaterThan(20);
      disposeObject(out.root);
    }
  });
});
