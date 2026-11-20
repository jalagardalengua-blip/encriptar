// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { primitivasGenerator } from '../src/engine/generators';
import { runGenerator } from '../src/engine/procedural/registry';
import { exportGLB, exportGLTFJson, importGLTF, safeFilename } from '../src/io/gltf';

describe('glTF', () => {
  it('exporta a GLB y vuelve a importarlo con las mismas piezas', async () => {
    const out = runGenerator(primitivasGenerator, {});
    const glb = await exportGLB(out.root);
    const magic = new TextDecoder().decode(new Uint8Array(glb, 0, 4));
    expect(magic).toBe('glTF');
    const scene = await importGLTF(glb);
    const names: string[] = [];
    let verts = 0;
    scene.traverse((o) => { if (o instanceof THREE.Mesh) { names.push(o.name); verts += o.geometry.getAttribute('position').count; } });
    expect(names.sort()).toEqual(['blob', 'lathe', 'loft', 'tube']);
    expect(verts).toBe(out.stats.vertices);
  });
  it('exporta glTF JSON válido', async () => {
    const json = JSON.parse(await exportGLTFJson(runGenerator(primitivasGenerator, { primitiva: 'blob' }).root));
    expect(json.asset.version).toBe('2.0');
    expect(json.meshes).toHaveLength(1);
  });
  it('nombres de archivo seguros', () => {
    expect(safeFilename('Toro «Jabonero» nº 7', 'glb')).toBe('toro-jabonero-n-7.glb');
    expect(safeFilename('***', 'glb')).toBe('modelo.glb');
  });
});
