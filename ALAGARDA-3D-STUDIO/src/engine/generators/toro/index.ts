import * as THREE from 'three';
import { createRng } from '../../math/random';
import { lerp, smoothstep } from '../../math/scalar';
import type { CapaToro, Encornadura, TipoBovino } from '../../procedural/domain';
import type { Noise3 } from '../../math/noise';
import type { Rng } from '../../math/random';
import { read, type ParamDef, type ParamValues } from '../../procedural/params';
import { computeStats } from '../../procedural/registry';
import type { DetailLevel, GeneratedPart, ProceduralGenerator } from '../../procedural/types';
import { computeSafeTangents } from '../../geometry/normals';
import { bakeFur } from '../../texture/furBake';
import { buildAnatomy, type Anatomy } from './anatomy';
import { createCoat } from './coat';
import { createPhotoProjector } from '../../photo/projector';
import { CAPAS, COLOR_ASTA, ENCASTES, ENCORNADURAS, TIPOS } from './data';

const RES: Record<DetailLevel, number> = { bajo: 0.5, medio: 1, alto: 1.5 };
const ATLAS: Record<DetailLevel, number> = { bajo: 512, medio: 1024, alto: 2048 };

const opts = <K extends string>(rec: Record<K, { label: string }>) =>
  (Object.keys(rec) as K[]).map((value) => ({ value, label: rec[value].label }));

const params: readonly ParamDef[] = [
  { key: 'tipo', label: 'Tipo de res', type: 'enum', default: 'toro', options: opts(TIPOS) },
  { key: 'encaste', label: 'Encaste', type: 'enum', default: 'Domecq', options: Object.keys(ENCASTES).map((k) => ({ value: k, label: k })), description: 'Proporciones típicas del encaste (GANADERIA-27).' },
  { key: 'capa', label: 'Capa', type: 'enum', default: 'negro', group: 'Pelaje', options: opts(CAPAS) },
  { key: 'lucero', label: 'Lucero (estrella en la frente)', type: 'boolean', default: false, group: 'Pelaje' },
  { key: 'bragado', label: 'Bragado (vientre blanco)', type: 'boolean', default: false, group: 'Pelaje' },
  { key: 'calcetero', label: 'Calcetero (cabos blancos)', type: 'boolean', default: false, group: 'Pelaje' },
  { key: 'rabicano', label: 'Rabicano (pelos blancos en el rabo)', type: 'boolean', default: false, group: 'Pelaje' },
  { key: 'pelo', label: 'Longitud del pelo (cm)', type: 'number', min: 0.6, max: 3, step: 0.1, default: 1.4, group: 'Pelaje' },
  { key: 'brillo', label: 'Brillo del pelo', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5, group: 'Pelaje' },
  { key: 'polvo', label: 'Polvo de albero', type: 'number', min: 0, max: 1, step: 0.05, default: 0.15, group: 'Pelaje' },
  { key: 'encornadura', label: 'Encornadura', type: 'enum', default: 'veleto', group: 'Astas', options: opts(ENCORNADURAS) },
  { key: 'largoAsta', label: 'Largo de las astas', type: 'number', min: 0.5, max: 1.5, step: 0.01, default: 1, group: 'Astas' },
  { key: 'grosorAsta', label: 'Grosor en la cepa (m)', type: 'number', min: 0.03, max: 0.065, step: 0.001, default: 0.048, group: 'Astas' },
  { key: 'colorAsta', label: 'Color de las astas', type: 'enum', default: 'acaramelado', group: 'Astas', options: opts(COLOR_ASTA) },
  { key: 'tamano', label: 'Tamaño', type: 'number', min: 0.8, max: 1.15, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'longitud', label: 'Longitud', type: 'number', min: 0.85, max: 1.2, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'alzada', label: 'Alzada', type: 'number', min: 0.88, max: 1.12, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'morrillo', label: 'Morrillo', type: 'number', min: 0, max: 1.6, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'perimetro', label: 'Perímetro torácico', type: 'number', min: 0.85, max: 1.2, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'papada', label: 'Papada', type: 'number', min: 0, max: 1.6, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'patas', label: 'Largo de las patas', type: 'number', min: 0.88, max: 1.15, step: 0.01, default: 1, group: 'Morfología' },
  { key: 'postura', label: 'Postura', type: 'enum', default: 'parado', group: 'Postura', options: [
    { value: 'parado', label: 'Parado' }, { value: 'humillando', label: 'Humillando (cabeza baja)' }, { value: 'paso', label: 'Al paso' }, { value: 'alerta', label: 'Alerta (cabeza alta)' },
  ] },
  { key: 'divisa', label: 'Divisa', type: 'boolean', default: true, group: 'Divisa' },
  { key: 'divisa1', label: 'Color 1', type: 'color', default: '#1d6b3a', group: 'Divisa' },
  { key: 'divisa2', label: 'Color 2', type: 'color', default: '#c8102e', group: 'Divisa' },
  { key: 'texturaFoto', label: 'Usar la foto como textura', type: 'boolean', default: true, group: 'Foto', description: 'Sólo tiene efecto cuando hay una foto ajustada (pestaña Foto).' },
  { key: 'seed', label: 'Semilla', type: 'seed', default: 7 },
];

type RGB = readonly [number, number, number];

function physical(name: string, p: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial(p);
  m.name = name;
  return m;
}

function setVertexColors(g: THREE.BufferGeometry, f: (i: number) => RGB): void {
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = f(i);
    arr[i * 3] = c[0];
    arr[i * 3 + 1] = c[1];
    arr[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function groundY(objs: THREE.Object3D[]): number {
  const box = new THREE.Box3();
  for (const o of objs) box.expandByObject(o);
  return box.min.y;
}

function applyPose(a: Anatomy, postura: string): void {
  switch (postura) {
    case 'humillando':
      a.neck.rotation.x += 0.55;
      a.head.rotation.x += 0.25;
      for (const l of a.legs) if (l.front) { l.hip.rotation.x = -0.12; l.knee.rotation.x = 0.06; }
      a.tail.rotation.x = -0.25;
      break;
    case 'paso':
      a.neck.rotation.x += 0.12;
      for (const l of a.legs) {
        const fwd = (l.front ? 1 : -1) * l.side > 0;
        if (l.front) {
          l.hip.rotation.x = fwd ? -0.32 : 0.16;
          l.knee.rotation.x = fwd ? 0.55 : 0;
          l.hoof.rotation.x = fwd ? -0.35 : 0.1;
        } else {
          l.hip.rotation.x = fwd ? -0.5 : -0.05;
          l.knee.rotation.x = fwd ? 0.75 : 0.45;
        }
      }
      a.tail.rotation.z = 0.12;
      break;
    case 'alerta':
      a.neck.rotation.x -= 0.32;
      a.head.rotation.x -= 0.12;
      a.tail.rotation.x = -0.15;
      break;
    default:
      break;
  }
}

/**
 * Construye la anatomía en postura neutra con las pezuñas en el suelo, sin materiales ni texturas.
 * Es la parte barata del generador: el ajuste a una foto la llama cientos de veces.
 */
export function buildToroShape(values: ParamValues, noise: Noise3, rng: Rng, res: number): Anatomy {
  const num = (k: string) => read.number(values, k);
  const enc = ENCASTES[read.string(values, 'encaste')] ?? ENCASTES.Domecq!;
  const a = buildAnatomy({
    tipo: read.string(values, 'tipo') as TipoBovino,
    morf: {
      longitud: num('longitud') * enc[0],
      alzada: num('alzada') * enc[1],
      morrillo: num('morrillo') * enc[2],
      perimetro: num('perimetro'),
      papada: num('papada'),
      patas: num('patas') * enc[3],
    },
    encornadura: read.string(values, 'encornadura') as Encornadura,
    largoAsta: num('largoAsta'),
    grosorAsta: num('grosorAsta'),
    divisa: read.boolean(values, 'divisa'),
    noise,
    rng,
    res,
  });
  a.root.updateMatrixWorld(true);
  a.body.position.y -= groundY(a.hooves);
  a.root.updateMatrixWorld(true);
  return a;
}

/** Aplica la postura y vuelve a apoyar las pezuñas en el suelo. */
export function poseToro(a: Anatomy, postura: string): void {
  applyPose(a, postura);
  a.root.updateMatrixWorld(true);
  a.body.position.y -= groundY(a.hooves);
  a.root.updateMatrixWorld(true);
}

/**
 * Generador de toro de lidia (y vaca, becerro y cabestro).
 * Geometría: `buildBull` de TORERO. Morfología, encastes y particularidades: GANADERIA-27.
 * Texturas: atlas de pelaje horneado (color por capa en 3D + mechones + mapa normal).
 */
export const toroGenerator: ProceduralGenerator = {
  id: 'toro.bravo',
  name: 'Toro de lidia',
  category: 'toro',
  version: '1.0.0',
  description: 'Toro, vaca, becerro o cabestro con capa, encornadura, morfología por encaste, particularidades y texturas de pelo horneadas.',
  params,
  presets: [
    { id: 'domecq', label: 'Negro Domecq', values: { tipo: 'toro', encaste: 'Domecq', capa: 'negro', encornadura: 'veleto', divisa: true } },
    { id: 'albaserrada', label: 'Cárdeno Albaserrada', values: { tipo: 'toro', encaste: 'Albaserrada', capa: 'cárdeno', encornadura: 'cornidelantero', colorAsta: 'oscuro' } },
    { id: 'miura', label: 'Miura', values: { tipo: 'toro', encaste: 'Miura', capa: 'colorado', encornadura: 'corniabierto', largoAsta: 1.12, lucero: false } },
    { id: 'jabonero', label: 'Jabonero', values: { tipo: 'toro', capa: 'jabonero', encornadura: 'playero', colorAsta: 'blanco' } },
    { id: 'berrendo', label: 'Berrendo en negro', values: { tipo: 'toro', encaste: 'Atanasio', capa: 'berrendo', calcetero: true } },
    { id: 'vaca', label: 'Vaca brava', values: { tipo: 'vaca', capa: 'castaño', encornadura: 'lira', divisa: false } },
    { id: 'becerro', label: 'Becerro', values: { tipo: 'becerro', capa: 'negro', divisa: false, polvo: 0.1 } },
    { id: 'cabestro', label: 'Cabestro', values: { tipo: 'cabestro', capa: 'berrendo', encornadura: 'cabestro', divisa: false, colorAsta: 'blanco' } },
  ],
  generate(values, ctx) {
    const num = (k: string) => read.number(values, k);
    const tipo = read.string(values, 'tipo') as TipoBovino;
    const capa = read.string(values, 'capa') as CapaToro;
    const T = TIPOS[tipo];
    const a = buildToroShape(values, ctx.noise, ctx.rng, RES[ctx.detail]);
    const photo = read.boolean(values, 'texturaFoto') ? ctx.inputs?.photo : undefined;
    // con foto, el pelaje se hornea ya en la postura final para que coincida con la imagen
    if (photo) poseToro(a, read.string(values, 'postura'));

    const particularidades = {
      lucero: read.boolean(values, 'lucero'),
      bragado: read.boolean(values, 'bragado'),
      calcetero: read.boolean(values, 'calcetero'),
      rabicano: read.boolean(values, 'rabicano'),
    };
    const coat = createCoat({
      capa,
      noise: ctx.noise,
      offset: ctx.rng.range(0, 200),
      particularidades,
      polvo: num('polvo'),
      landmarks: {
        forehead: a.head.localToWorld(a.headPoints.forehead.clone()).toArray() as [number, number, number],
        muzzle: a.head.localToWorld(a.headPoints.muzzle.clone()).toArray() as [number, number, number],
        bellyY: a.body.position.y + a.bellyLocalY,
        rumpZ: a.rumpLocalZ,
      },
    });

    const photoSampler = photo ? createPhotoProjector(photo, a.root) : null;

    // ---------- pelaje horneado ----------
    const bake = bakeFur({
      pieces: a.fur,
      space: new THREE.Matrix4(),
      size: ATLAS[ctx.detail],
      rng: createRng((ctx.rng.seed ^ 0x9e3779b9) >>> 0),
      hairLength: num('pelo') / 100,
      color: photoSampler
        ? (x, y, z, region, nx, ny, nz) => {
          const c = coat(x, y, z, region);
          const p = photoSampler(x, y, z, nx, ny, nz);
          if (!p) return c;
          return [lerp(c[0], p.rgb[0], p.weight), lerp(c[1], p.rgb[1], p.weight), lerp(c[2], p.rgb[2], p.weight)] as const;
        }
        : coat,
    });
    const brillo = num('brillo');
    const sh = CAPAS[capa].sheen;
    const furMat = physical('pelo', {
      map: bake.albedo,
      normalMap: bake.normal,
      // atlas en la convención glTF (verde = +V) con tangentes explícitas: GLTFExporter
      // lo escribe tal cual y Blender u otros motores lo interpretan igual
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: lerp(0.9, 0.62, brillo),
      metalness: 0,
      sheen: 1,
      sheenRoughness: lerp(0.7, 0.45, brillo),
      sheenColor: new THREE.Color(sh[0] * lerp(0.12, 0.4, brillo), sh[1] * lerp(0.12, 0.4, brillo), sh[2] * lerp(0.12, 0.4, brillo)),
      specularIntensity: lerp(0.25, 0.6, brillo),
    });
    for (const f of a.fur) {
      computeSafeTangents(f.mesh.geometry);
      f.mesh.material = furMat;
    }

    // ---------- astas ----------
    const ca = COLOR_ASTA[read.string(values, 'colorAsta')]!.c;
    const hornMat = physical('asta', { vertexColors: true, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    for (const h of a.horns) {
      const g = h.geometry;
      const rings = g.userData.rings as number;
      const nv = g.getAttribute('position').count;
      const W = Math.round((nv - 1) / rings);
      setVertexColors(g, (i) => {
        const k = Math.min(rings - 1, Math.floor(i / W));
        const t = i === nv - 1 ? 1 : k / (rings - 1);
        const ang = (i % W) / (W - 1);
        let c = mixRGB(ca[0], ca[1], smoothstep(0, 0.4, t));
        c = mixRGB(c, ca[2], smoothstep(0.55, 0.93, t));
        const streak = 1 + 0.1 * ctx.noise.noise(ang * 9, t * 3, h.name.length) + 0.05 * Math.sin(t * 90) * (1 - smoothstep(0, 0.28, t));
        return [c[0] * streak, c[1] * streak, c[2] * streak];
      });
      h.material = hornMat;
    }

    a.eyes.material = physical('ojo', { color: new THREE.Color(0.025, 0.014, 0.009), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 });
    a.nose.material = physical('morro', {
      color: capa === 'ensabanado' || capa === 'jabonero' ? new THREE.Color(0.09, 0.06, 0.055) : new THREE.Color(0.022, 0.019, 0.018),
      roughness: 0.58, specularIntensity: 0.45,
    });
    const hoofMat = physical('pezuna', {
      color: particularidades.calcetero ? new THREE.Color(0.2, 0.16, 0.11) : new THREE.Color(0.012, 0.011, 0.01),
      roughness: 0.62, specularIntensity: 0.5,
    });
    for (const h of a.hooves) h.material = hoofMat;

    const tailDark: RGB = capa === 'ensabanado' ? [0.7, 0.67, 0.6] : capa === 'jabonero' ? [0.32, 0.22, 0.12] : [0.016, 0.014, 0.013];
    setVertexColors(a.switchHair.geometry, (i) => {
      const v = 0.8 + 0.4 * (((i * 2654435761) >>> 0) / 4294967296);
      const c = particularidades.rabicano && i % 5 === 0 ? [0.6, 0.58, 0.55] as RGB : tailDark;
      return [c[0] * v, c[1] * v, c[2] * v];
    });
    a.switchHair.material = physical('borla', { vertexColors: true, roughness: 0.6, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0.25, 0.22, 0.2) });

    if (a.divisa) {
      const c1 = new THREE.Color(read.string(values, 'divisa1'));
      const c2 = new THREE.Color(read.string(values, 'divisa2'));
      const lado = a.divisa.geometry.getAttribute('_lado');
      setVertexColors(a.divisa.geometry, (i) => {
        const l = lado.getX(i);
        return l === 0 ? [c1.r, c1.g, c1.b] : l === 1 ? [c2.r, c2.g, c2.b] : [0.55, 0.5, 0.42];
      });
      a.divisa.geometry.deleteAttribute('_lado');
      a.divisa.material = physical('divisa', { vertexColors: true, roughness: 0.45, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(1, 1, 1) });
    }
    for (const e of a.extras) {
      e.material = e.name === 'cencerro'
        ? physical('laton', { color: new THREE.Color(0.62, 0.43, 0.18), metalness: 1, roughness: 0.35 })
        : e.name === 'collar'
          ? physical('cuero', { color: new THREE.Color(0.08, 0.04, 0.02), roughness: 0.7 })
          : physical('piel', { color: new THREE.Color(0.42, 0.2, 0.17), roughness: 0.5, sheen: 0.4 });
    }

    // ---------- postura y escala ----------
    if (!photo) poseToro(a, read.string(values, 'postura'));
    a.root.scale.setScalar(num('tamano') * T.escala);
    a.root.updateMatrixWorld(true);

    const parts: GeneratedPart[] = [];
    a.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) parts.push({ name: obj.name, object: obj });
    });
    a.root.userData.atlas = { size: ATLAS[ctx.detail], texelsPerMeter: Math.round(bake.texelsPerMeter), coverage: bake.coverage };
    return { root: a.root, parts, stats: computeStats(a.root) };
  },
};
