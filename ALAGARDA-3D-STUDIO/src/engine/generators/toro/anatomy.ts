import * as THREE from 'three';
import { blobGeometry, latheGeometry, tubeGeometry } from '../../geometry';
import { catmullRomPoints, piecewiseSmooth as curve, type ProfilePoint } from '../../math/curves';
import type { Noise3 } from '../../math/noise';
import type { Rng } from '../../math/random';
import { smoothstep } from '../../math/scalar';
import type { Encornadura, TipoBovino } from '../../procedural/domain';
import type { Region } from './coat';
import { ENCORNADURAS, TIPOS } from './data';

export interface Morfologia {
  longitud: number;
  alzada: number;
  morrillo: number;
  perimetro: number;
  papada: number;
  patas: number;
}

export interface AnatomyOptions {
  tipo: TipoBovino;
  morf: Morfologia;
  encornadura: Encornadura;
  largoAsta: number;
  grosorAsta: number;
  divisa: boolean;
  noise: Noise3;
  rng: Rng;
  /** Multiplicador de segmentos según el nivel de detalle. */
  res: number;
}

export interface Leg {
  name: string;
  hip: THREE.Group;
  knee: THREE.Group;
  hoof: THREE.Group;
  front: boolean;
  side: number;
}

export interface Anatomy {
  root: THREE.Group;
  body: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: Leg[];
  fur: { mesh: THREE.Mesh; region: Region }[];
  horns: THREE.Mesh[];
  eyes: THREE.Mesh;
  nose: THREE.Mesh;
  hooves: THREE.Mesh[];
  switchHair: THREE.Mesh;
  divisa: THREE.Mesh | null;
  extras: THREE.Mesh[];
  /** Puntos de referencia en espacio local de la cabeza. */
  headPoints: { forehead: THREE.Vector3; muzzle: THREE.Vector3 };
  /** Altura del vientre respecto al nodo del cuerpo. */
  bellyLocalY: number;
  rumpLocalZ: number;
}

const placeholder = new THREE.MeshBasicMaterial();

function node(parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function mesh(parent: THREE.Object3D, name: string, geo: THREE.BufferGeometry): THREE.Mesh {
  const m = new THREE.Mesh(geo, placeholder);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const seg = (n: number, res: number, min = 6) => Math.max(min, Math.round(n * res));

/**
 * Construye la anatomía del bovino en postura neutra (sin materiales).
 * Port de `buildBull` (TORERO, src/assets.js:73) a Three.js, con perfiles modulados por la
 * morfología de GANADERIA-27 (`morf`/`bprof`) y detalles añadidos: morro con ollares, papada,
 * espolones, testuz rizado, borla del rabo con mechones, escroto o ubre y anillos en la cepa del asta.
 */
export function buildAnatomy(o: AnatomyOptions): Anatomy {
  const T = TIPOS[o.tipo];
  const m = o.morf;
  const L = m.longitud;
  const A = m.alzada;
  const G = m.perimetro * T.perimetro;
  const Mo = m.morrillo * T.morrillo;
  const pap = m.papada * (T.macho && !T.castrado ? 1 : 0.55);
  const legS = m.patas * T.patas;
  const nz = o.noise;
  const r = o.res;
  const fur: Anatomy['fur'] = [];
  const extras: THREE.Mesh[] = [];

  const root = new THREE.Group();
  root.name = 'Toro';
  const body = node(root, 'cuerpo_nodo', 0, 0.95, 0);

  // ---------- cuerpo esculpido ----------
  const topP: ProfilePoint[] = [[-1, 0.22], [-0.86, 0.34], [-0.6, 0.38], [-0.2, 0.34], [0.2, 0.38], [0.5, 0.38 + 0.17 * Mo], [0.78, 0.38 + 0.14 * Mo], [1, 0.32]];
  const botP: ProfilePoint[] = [[-1, 0.16], [-0.8, 0.32], [-0.4, 0.36], [0, 0.43], [0.45, 0.5], [0.75, 0.46], [1, 0.28]];
  const widP: ProfilePoint[] = [[-1, 0.17], [-0.75, 0.34], [-0.45, 0.31], [0, 0.4], [0.45, 0.37], [0.8, 0.33], [1, 0.2]];
  const bodyDeform = (x: number, y: number, z: number): [number, number, number] => {
    const top = curve(z, topP) * A, bot = curve(z, botP) * G * A, wid = curve(z, widP) * G;
    const X = x * wid, Y = y > 0 ? y * top : y * bot;
    const Z = (z < 0 ? -Math.pow(-z, 0.82) * 1.04 : z * 1.06) * L;
    // relieves: escápula, muslo, costillar y ruido orgánico
    const sc = Math.exp(-((Math.abs(x) - 0.75) ** 2 + (y - 0.25) ** 2 + (z - 0.45) ** 2) / 0.06) * 0.035;
    const th = Math.exp(-((Math.abs(x) - 0.72) ** 2 + (y + 0.15) ** 2 + (z + 0.7) ** 2) / 0.07) * 0.06;
    const arm = Math.exp(-((Math.abs(x) - 0.7) ** 2 + (y + 0.35) ** 2 + (z - 0.55) ** 2) / 0.05) * 0.03;
    const rib = Math.abs(x) > 0.6 && y < 0.3 && y > -0.6 ? Math.max(0, Math.sin(z * 26)) * 0.004 * smoothstep(0.6, 0.95, Math.abs(x)) * smoothstep(-0.55, 0.2, z) * smoothstep(0.6, 0.2, z) : 0;
    const nn = nz.noise(x * 3, y * 3, z * 3) * 0.012;
    const k = 1 + (sc + th + arm + rib + nn) / Math.max(0.2, Math.hypot(X, Y));
    return [X * k, Y * k, Z];
  };
  const bodyMesh = mesh(body, 'cuerpo', blobGeometry({ widthSegments: seg(96, r, 24), heightSegments: seg(64, r, 16), deform: bodyDeform }));
  fur.push({ mesh: bodyMesh, region: 'cuerpo' });
  const bellyLocalY = -curve(0, botP) * G * A;
  const rumpLocalZ = -1.04 * L;

  // ---------- cuello y morrillo ----------
  const neck = node(body, 'cuello_nodo', 0, 0.2 * A, 0.7 * L);
  neck.rotation.x = 0.1;
  const neckDeform = (x: number, y: number, z: number): [number, number, number] => {
    const w = curve(z, [[-1, 0.25], [0, 0.23], [1, 0.16]]) * G;
    const tp = curve(z, [[-1, 0.26 + 0.06 * Mo], [0, 0.24], [1, 0.15]]) * A;
    const bt = curve(z, [[-1, 0.3], [-0.2, T.castrado ? 0.36 : 0.33], [0.4, 0.27], [1, 0.16]]) * A;
    const Z = z * 0.32 + 0.18;
    let Y = (y > 0 ? y * tp : y * bt) - Z * 0.25;
    // papada: pliegue de piel bajo el cuello
    if (y < 0) Y -= pap * 0.07 * Math.exp(-(((z - 0.05) / 0.45) ** 2)) * Math.pow(-y, 3) * (1 - 0.6 * x * x);
    return [x * w, Y, Z];
  };
  fur.push({ mesh: mesh(neck, 'cuello', blobGeometry({ widthSegments: seg(56, r, 16), heightSegments: seg(40, r, 12), deform: neckDeform })), region: 'cuello' });

  // ---------- cabeza ----------
  const head = node(neck, 'cabeza_nodo', 0, -0.12, 0.46);
  head.scale.setScalar(T.cabeza);
  const HR = new THREE.Matrix4().makeRotationX(0.85);
  const headDeform = (x: number, y: number, z: number): [number, number, number] => {
    const w = curve(z, [[-1, 0.14], [-0.5, 0.16], [0.2, 0.125], [0.7, 0.1], [0.92, 0.105], [1, 0.09]]);
    const ht = curve(z, [[-1, 0.12], [-0.3, 0.13], [0.5, 0.1], [1, 0.085]]);
    const hb = curve(z, [[-1, 0.12], [0, 0.13], [0.6, 0.11], [1, 0.095]]);
    let Y = y > 0 ? y * ht : y * hb;
    if (y > 0) Y *= 1 - 0.18 * Math.pow(Math.max(0, y), 6);
    // arcos superciliares y cuencas de los ojos
    const brow = Math.exp(-(((Math.abs(x) - 0.75) / 0.18) ** 2 + ((y - 0.45) / 0.25) ** 2 + ((z + 0.2) / 0.2) ** 2)) * 0.01;
    return [x * w * (1 + brow * 8), Y + brow, z * 0.22 + 0.12];
  };
  const headGeo = blobGeometry({ widthSegments: seg(56, r, 16), heightSegments: seg(40, r, 12), deform: headDeform });
  headGeo.applyMatrix4(HR);
  fur.push({ mesh: mesh(head, 'cabeza', headGeo), region: 'cabeza' });

  for (const s of [1, -1]) {
    const ear = blobGeometry({
      widthSegments: seg(20, r, 8), heightSegments: seg(14, r, 6),
      deform: (x, y, z) => [x * 0.09, y * 0.022 + 0.018 * (1 - x * x) * (y > 0 ? -0.6 : 1), z * 0.045],
    });
    ear.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, s * 0.2, s * 0.1)).setPosition(s * 0.18, 0.07, -0.06));
    ear.applyMatrix4(HR);
    fur.push({ mesh: mesh(head, s > 0 ? 'oreja_izq' : 'oreja_der', ear), region: 'oreja' });
  }
  const tuft = blobGeometry({
    widthSegments: seg(28, r, 10), heightSegments: seg(18, r, 8),
    deform: (x, y, z) => {
      const k = 1 + nz.noise(x * 7, y * 7, z * 7) * 0.45 + nz.noise(x * 15, y * 15, z * 15) * 0.15;
      return [x * 0.075 * k, y * 0.04 * k, z * 0.065 * k];
    },
  });
  tuft.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.115, -0.07));
  tuft.applyMatrix4(HR);
  fur.push({ mesh: mesh(head, 'testuz', tuft), region: 'testuz' });

  const eyes = new THREE.Group();
  for (const s of [1, -1]) {
    const e = blobGeometry({ widthSegments: 16, heightSegments: 12, deform: (x, y, z) => [x * 0.022, y * 0.019, z * 0.02] });
    e.applyMatrix4(new THREE.Matrix4().makeTranslation(s * 0.121, 0.05, 0.03));
    e.applyMatrix4(HR);
    eyes.add(new THREE.Mesh(e));
  }
  const eyeGeo = mergeChildren(eyes);
  const eyesMesh = mesh(head, 'ojos', eyeGeo);

  // morro húmedo con ollares
  const noseGeo = blobGeometry({
    widthSegments: seg(28, r, 12), heightSegments: seg(20, r, 8),
    deform: (x, y, z) => {
      let X = x * 0.072, Z = z * 0.05;
      const Y = y * 0.056;
      for (const s of [1, -1]) {
        const d = Math.hypot(x - s * 0.42, y + 0.05, z - 0.85);
        if (d < 0.35) Z -= 0.018 * (1 - d / 0.35) ** 2;
      }
      if (z > 0) X *= 1 - 0.1 * z;
      return [X, Y, Z];
    },
  });
  noseGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.01, 0.298));
  noseGeo.applyMatrix4(HR);
  const noseMesh = mesh(head, 'morro', noseGeo);

  const forehead = new THREE.Vector3(0, 0.118, 0.06).applyMatrix4(HR);
  const muzzle = new THREE.Vector3(0, -0.01, 0.32).applyMatrix4(HR);

  // ---------- astas ----------
  const horns: THREE.Mesh[] = [];
  const hp = ENCORNADURAS[o.encornadura].points;
  const base = hp[0]!;
  const hl = o.largoAsta * T.asta;
  const thick = o.grosorAsta * (o.tipo === 'becerro' ? 0.6 : 1);
  for (const s of [1, -1]) {
    const ctrl = hp.map((p) => [s * (base[0] + (p[0] - base[0]) * hl), base[1] + (p[1] - base[1]) * hl, base[2] + (p[2] - base[2]) * hl] as const);
    const path = catmullRomPoints(ctrl, seg(28, r, 10));
    const g = tubeGeometry({
      path, radialSegments: seg(16, r, 8),
      radius: (t) => (thick * Math.pow(1 - t, 0.85) + 0.003) * (1 + 0.05 * Math.sin(t * 90) * (1 - smoothstep(0, 0.28, t))),
    });
    g.userData.rings = path.length;
    horns.push(mesh(head, s > 0 ? 'asta_izq' : 'asta_der', g));
  }

  // ---------- patas ----------
  const legs: Leg[] = [];
  const hooves: THREE.Mesh[] = [];
  const mkLeg = (x: number, y: number, z: number, front: boolean, side: number) => {
    const name = `${front ? 'ad' : 'tr'}_${side > 0 ? 'izq' : 'der'}`;
    const hip = node(body, `cadera_${name}`, x * G, y * A, z * L);
    const up: ProfilePoint[] = front
      ? [[0, 0.2], [0.1, 0.16], [0.125, 0.02], [0.115, -0.12], [0.088, -0.27], [0.07, -0.37], [0.076, -0.41], [0, -0.45]]
      : [[0, 0.2], [0.1, 0.16], [0.13, 0.02], [0.13, -0.1], [0.105, -0.28], [0.072, -0.45], [0.078, -0.5], [0, -0.54]];
    const ug = latheGeometry({ profile: up.map(([rr, yy]) => [rr * Math.sqrt(G), yy * legS] as const), segments: seg(28, r, 10), smooth: true });
    ug.applyMatrix4(new THREE.Matrix4().makeScale(0.88, 1, 1).setPosition(0, 0, front ? 0 : 0.03));
    fur.push({ mesh: mesh(hip, `brazo_${name}`, ug), region: 'brazo' });
    const knee = node(hip, `rodilla_${name}`, 0, -(front ? 0.42 : 0.5) * legS, 0);
    const lo: ProfilePoint[] = [[0, 0.06], [0.06, 0.05], [0.07, 0.01], [0.062, -0.03], [0.05, -0.12], [0.046, -0.22], [0.056, -0.27], [0.05, -0.31], [0, -0.34]];
    const lg = latheGeometry({ profile: lo.map(([rr, yy]) => [rr, yy * legS] as const), segments: seg(22, r, 8), smooth: true });
    lg.applyMatrix4(new THREE.Matrix4().makeScale(0.82, 1, 1));
    fur.push({ mesh: mesh(knee, `cana_${name}`, lg), region: 'cana' });
    const hoof = node(knee, `pezuna_${name}_nodo`, 0, -(front ? 0.31 : 0.34) * legS, 0);
    const claws = new THREE.Group();
    for (const c of [-1, 1]) {
      const cg = blobGeometry({
        widthSegments: 16, heightSegments: 12,
        deform: (xx, yy, zz) => [xx * 0.03 * (1 - 0.25 * yy), yy * 0.05, (zz * 0.07 + 0.025) * (yy < 0 ? 1.1 : 1) * (1 - 0.3 * Math.max(0, yy))],
      });
      cg.applyMatrix4(new THREE.Matrix4().makeTranslation(c * 0.031, -0.05, 0.02));
      claws.add(new THREE.Mesh(cg));
      // espolones (pezuñas accesorias en la parte trasera)
      const dc = blobGeometry({ widthSegments: 10, heightSegments: 8, deform: (xx, yy, zz) => [xx * 0.013, yy * 0.018, zz * 0.015] });
      dc.applyMatrix4(new THREE.Matrix4().makeTranslation(c * 0.03, 0.06, -0.045));
      claws.add(new THREE.Mesh(dc));
    }
    hooves.push(mesh(hoof, `pezuna_${name}`, mergeChildren(claws)));
    legs.push({ name, hip, knee, hoof, front, side });
  };
  mkLeg(-0.165, -0.12, 0.58, true, -1);
  mkLeg(0.165, -0.12, 0.58, true, 1);
  mkLeg(-0.15, -0.06, -0.7, false, -1);
  mkLeg(0.15, -0.06, -0.7, false, 1);
  // postura de reposo de los corvejones (TORERO: a0 = -0,25, k0 = 0,55)
  for (const l of legs) if (!l.front) {
    l.hip.rotation.x = -0.12;
    l.knee.rotation.x = 0.32;
    l.hoof.rotation.x = -0.2;
  }

  // ---------- rabo y borla ----------
  const tail = node(body, 'rabo_nodo', 0, 0.26 * A, rumpLocalZ + 0.04);
  const tailPath = catmullRomPoints([[0, 0, 0], [0, -0.12, -0.08], [0, -0.38, -0.1], [0, -0.66, -0.07]], seg(18, r, 8));
  fur.push({ mesh: mesh(tail, 'rabo', tubeGeometry({ path: tailPath, radialSegments: seg(12, r, 6), radius: (t) => 0.036 - 0.018 * t })), region: 'rabo' });
  const strands = new THREE.Group();
  const nStr = seg(46, r, 20);
  for (let i = 0; i < nStr; i++) {
    const a = o.rng.range(0, Math.PI * 2), rr = o.rng.range(0, 0.018);
    const len = o.rng.range(0.2, 0.34);
    const sx = Math.cos(a) * rr, sz = -0.07 + Math.sin(a) * rr;
    const sway = o.rng.range(-0.04, 0.04), curl = o.rng.range(-0.03, 0.03);
    const pts = Array.from({ length: 7 }, (_, k) => {
      const t = k / 6;
      return [sx * (1 + t * 2.2) + curl * Math.sin(t * 4), -0.58 - t * len, sz + (sz + 0.07) * t * 2 + sway * t * t] as [number, number, number];
    });
    strands.add(new THREE.Mesh(tubeGeometry({ path: pts, radialSegments: 4, radius: (t) => 0.006 * (1 - t) + 0.0012 })));
  }
  const switchHair = mesh(tail, 'borla', mergeChildren(strands));

  // ---------- sexo ----------
  if (T.macho && !T.castrado) {
    const sc = blobGeometry({ widthSegments: seg(20, r, 8), heightSegments: seg(16, r, 6), deform: (x, y, z) => [x * 0.065 * (1 - 0.3 * y), y * 0.11, z * 0.07 * (1 - 0.25 * y)] });
    sc.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -curve(-0.55, botP) * G * A * 0.835 - 0.07, -0.6 * L));
    fur.push({ mesh: mesh(body, 'escroto', sc), region: 'escroto' });
  }
  if (T.macho) {
    const sh = blobGeometry({ widthSegments: seg(16, r, 8), heightSegments: seg(12, r, 6), deform: (x, y, z) => [x * 0.035, y * 0.04, z * 0.13] });
    sh.applyMatrix4(new THREE.Matrix4().makeTranslation(0, bellyLocalY + 0.015, 0.02 * L));
    fur.push({ mesh: mesh(body, 'prepucio', sh), region: 'cuerpo' });
  } else {
    const ud = blobGeometry({ widthSegments: seg(24, r, 10), heightSegments: seg(18, r, 8), deform: (x, y, z) => [x * 0.11, y * 0.08, z * 0.13] });
    ud.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -curve(-0.55, botP) * G * A * 0.835 - 0.02, -0.55 * L));
    fur.push({ mesh: mesh(body, 'ubre', ud), region: 'ubre' });
    const teats = new THREE.Group();
    for (const tx of [-0.045, 0.045]) for (const tz of [-0.05, 0.05]) {
      const t = latheGeometry({ profile: [[0, 0], [0.012, -0.005], [0.01, -0.04], [0, -0.045]], segments: 10, smooth: true });
      t.applyMatrix4(new THREE.Matrix4().makeTranslation(tx, -curve(-0.55, botP) * G * A * 0.835 - 0.08, -0.55 * L + tz));
      teats.add(new THREE.Mesh(t));
    }
    extras.push(mesh(body, 'pezones', mergeChildren(teats)));
  }

  // ---------- cencerro del cabestro ----------
  if (o.tipo === 'cabestro') {
    const collar = new THREE.TorusGeometry(0.2, 0.018, 8, 40);
    collar.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.5).setPosition(0, -0.05, 0.12));
    extras.push(mesh(neck, 'collar', collar));
    const bell = latheGeometry({ profile: [[0, 0.06], [0.03, 0.06], [0.06, 0.0], [0.08, -0.14], [0.085, -0.15], [0, -0.15]], segments: 24, smooth: false });
    bell.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.27, 0.04));
    extras.push(mesh(neck, 'cencerro', bell));
  }

  // ---------- divisa ----------
  let divisa: THREE.Mesh | null = null;
  if (o.divisa) {
    const ribbons = new THREE.Group();
    const zA = 0.45;
    // la sección del elipsoide a la altura z mide sqrt(1 - z²) veces el perfil
    const topY = curve(zA, topP) * A * Math.sqrt(1 - zA * zA);
    const wA = curve(zA, widP) * G * Math.sqrt(1 - zA * zA);
    for (const [i, s] of [[0, -1], [1, 1]] as const) {
      // cinta que baja por el costado siguiendo la sección del cuerpo, 1,5 cm por fuera
      const ctrl: [number, number, number][] = [];
      for (let k = 0; k <= 6; k++) {
        const phi = 0.12 + (k / 6) * 1.25;
        const rr = 1.04 + 0.04 * k / 6;
        ctrl.push([s * Math.sin(phi) * wA * rr + 0.015 * s, Math.cos(phi) * topY * rr, -0.03 * k - 0.02 * i]);
      }
      const pts = catmullRomPoints(ctrl, 22);
      const g = tubeGeometry({ path: pts, radialSegments: 6, radius: (t) => 0.011 * (1 - 0.25 * t) });
      g.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, 1).setPosition(0, 0, zA * L * 1.06));
      const colors = new Float32Array(g.getAttribute('position').count * 3).fill(i);
      g.setAttribute('_lado', new THREE.BufferAttribute(colors, 3));
      ribbons.add(new THREE.Mesh(g));
    }
    const harpoon = latheGeometry({ profile: [[0, 0.05], [0.006, 0.04], [0.006, -0.03], [0, -0.03]], segments: 8, smooth: true });
    harpoon.applyMatrix4(new THREE.Matrix4().makeTranslation(0, topY + 0.03, zA * L * 1.06));
    harpoon.setAttribute('_lado', new THREE.BufferAttribute(new Float32Array(harpoon.getAttribute('position').count * 3).fill(2), 3));
    ribbons.add(new THREE.Mesh(harpoon));
    divisa = mesh(body, 'divisa', mergeChildren(ribbons, ['_lado']));
  }

  return {
    root, body, neck, head, tail, legs, fur, horns, eyes: eyesMesh, nose: noseMesh, hooves, switchHair, divisa, extras,
    headPoints: { forehead, muzzle }, bellyLocalY, rumpLocalZ,
  };
}

/** Une las geometrías de los hijos de un grupo (aplicando sus matrices) en una sola. */
function mergeChildren(group: THREE.Group, extraAttrs: string[] = []): THREE.BufferGeometry {
  const parts = group.children.map((c) => {
    const g = (c as THREE.Mesh).geometry;
    c.updateMatrix();
    return g.clone().applyMatrix4(c.matrix);
  });
  const attrs = ['position', 'normal', 'uv', ...extraAttrs];
  const out = new THREE.BufferGeometry();
  let vtx = 0;
  const idx: number[] = [];
  for (const g of parts) {
    for (const i of g.getIndex()!.array) idx.push(i + vtx);
    vtx += g.getAttribute('position').count;
  }
  for (const a of attrs) {
    const size = parts[0]!.getAttribute(a).itemSize;
    const arr = new Float32Array(vtx * size);
    let off = 0;
    for (const g of parts) {
      const src = g.getAttribute(a).array as Float32Array;
      arr.set(src, off);
      off += src.length;
    }
    out.setAttribute(a, new THREE.BufferAttribute(arr, size));
  }
  out.setIndex(idx);
  parts.forEach((g) => g.dispose());
  group.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
  return out;
}

