import * as THREE from 'three';
import { blobGeometry, latheGeometry, loftGeometry, tubeGeometry, type LoftKey } from '../geometry';
import { catmullRomPoints } from '../math/curves';
import { read, type ParamDef } from '../procedural/params';
import { computeStats } from '../procedural/registry';
import type { DetailLevel, GeneratedPart, ProceduralGenerator } from '../procedural/types';

const DETAIL_FACTOR: Record<DetailLevel, number> = { bajo: 0.5, medio: 1, alto: 2 };

const params: readonly ParamDef[] = [
  {
    key: 'primitiva', label: 'Primitiva', type: 'enum', default: 'todas',
    options: [
      { value: 'todas', label: 'Todas' },
      { value: 'blob', label: 'Esfera deformable' },
      { value: 'lathe', label: 'Revolución' },
      { value: 'tube', label: 'Tubo variable' },
      { value: 'loft', label: 'Barrido de secciones' },
    ],
  },
  { key: 'resolucion', label: 'Resolución', type: 'integer', min: 8, max: 96, default: 32, group: 'Malla' },
  { key: 'ruido', label: 'Ruido', type: 'number', min: 0, max: 0.3, step: 0.01, default: 0.06, group: 'Forma', description: 'Amplitud del desplazamiento por ruido de Perlin.' },
  { key: 'escalaRuido', label: 'Frecuencia del ruido', type: 'number', min: 0.5, max: 8, step: 0.1, default: 2.5, group: 'Forma' },
  { key: 'curvatura', label: 'Curvatura del tubo', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6, group: 'Forma' },
  { key: 'color', label: 'Color', type: 'color', default: '#c9a25a', group: 'Material' },
  { key: 'rugosidad', label: 'Rugosidad', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Material' },
  { key: 'seed', label: 'Semilla', type: 'seed', default: 1 },
];

/**
 * Generador de utilidad: muestra cada primitiva procedural del motor con parámetros reales.
 * Sirve para verificar visualmente y exportar a GLB las piezas base que usarán los
 * generadores de toro, torero, caballo y plaza.
 */
export const primitivasGenerator: ProceduralGenerator = {
  id: 'utilidad.primitivas',
  name: 'Muestrario de primitivas',
  category: 'utilidad',
  version: '0.1.0',
  description: 'Esfera deformable, sólido de revolución, tubo de radio variable y barrido de secciones.',
  params,
  presets: [
    { id: 'liso', label: 'Liso', values: { ruido: 0, resolucion: 48 } },
    { id: 'organico', label: 'Orgánico', values: { ruido: 0.14, escalaRuido: 3.2, resolucion: 64 } },
  ],
  generate(values, ctx) {
    const which = read.string(values, 'primitiva');
    const res = Math.max(6, Math.round(read.number(values, 'resolucion') * DETAIL_FACTOR[ctx.detail]));
    const amp = read.number(values, 'ruido');
    const freq = read.number(values, 'escalaRuido');
    const bend = read.number(values, 'curvatura');
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(read.string(values, 'color')),
      roughness: read.number(values, 'rugosidad'),
      metalness: 0,
    });
    const offset = ctx.rng.range(0, 100); // desplaza el campo de ruido según la semilla
    const n = (x: number, y: number, z: number) => ctx.noise.fbm(x * freq + offset, y * freq, z * freq, 3);

    const builders: Record<string, () => THREE.BufferGeometry> = {
      blob: () =>
        blobGeometry({
          widthSegments: res,
          heightSegments: Math.max(4, Math.round(res * 0.7)),
          deform: (x, y, z) => {
            const k = 1 + amp * n(x, y, z) * 2;
            return [x * 0.45 * k, y * 0.35 * k + 0.4, z * 0.6 * k];
          },
        }),
      lathe: () =>
        latheGeometry({
          // perfil de columna inspirado en las columnas de grada de la plaza de TORERO
          // recorrido de arriba abajo por el exterior: con el convenio de TORERO la normal queda hacia fuera
          profile: [[0, 1.16], [0.22, 1.16], [0.22, 1.08], [0.17, 1.0], [0.17 + amp * 0.3, 0.6], [0.17, 0.25], [0.24, 0.12], [0.24, 0], [0, 0]],
          segments: res,
          smooth: false,
        }),
      tube: () => {
        const ctrl = [[0, 0.05, 0], [0.2, 0.15 + bend * 0.05, 0.03], [0.32, 0.35 + bend * 0.1, 0.1 * bend], [0.35, 0.6, 0.2 * bend], [0.28 - 0.2 * bend, 0.85, 0.28 * bend]] as const;
        const pts = catmullRomPoints(ctrl, Math.max(8, Math.round(res * 0.6))).map(
          ([x, y, z]) => [x + amp * 0.3 * n(x, y, z), y, z] as [number, number, number],
        );
        return tubeGeometry({ path: pts, radialSegments: Math.max(6, Math.round(res / 3)), radius: (t) => 0.06 * Math.pow(1 - t, 0.85) + 0.004 });
      },
      loft: () => {
        const keys: LoftKey[] = [[0, 0.16, 0.11, 0], [0.18, 0.2, 0.13, 0.01], [0.42, 0.24, 0.15, 0.02], [0.62, 0.22, 0.13, 0], [0.74, 0.12, 0.08, 0]];
        const g = loftGeometry({ keys, segments: res, rows: Math.max(6, Math.round(res * 0.6)) });
        if (amp > 0) {
          const pos = g.getAttribute('position');
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const k = 1 + amp * n(x, y, z);
            pos.setXYZ(i, x * k, y, z * k);
          }
          g.computeVertexNormals();
        }
        return g;
      },
    };

    const order = which === 'todas' ? ['blob', 'lathe', 'tube', 'loft'] : [which];
    const root = new THREE.Group();
    root.name = 'Muestrario';
    const parts: GeneratedPart[] = [];
    const spacing = 1.2;
    order.forEach((key, i) => {
      const build = builders[key];
      if (!build) return;
      const mesh = new THREE.Mesh(build(), material);
      mesh.name = key;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.x = (i - (order.length - 1) / 2) * spacing;
      root.add(mesh);
      parts.push({ name: key, object: mesh });
    });
    return { root, parts, stats: computeStats(root) };
  },
};
