// Carga y preparación de modelos 3D externos gratuitos (CC0):
//  · Vehículos: Kenney «Car Kit» (kenney.nl, CC0 1.0)
//  · Personas: Quaternius «Ultimate Animated Character Pack» (quaternius.com, CC0 1.0)
//  · Toro: Quaternius «Ultimate Animated Animal Pack» (quaternius.com, CC0 1.0)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const ASSETS = { cars: {}, people: {}, animals: {}, ok: false };

const CAR_FILES = ['police', 'sedan', 'suv', 'taxi', 'van', 'truck', 'ambulance'];
const PEOPLE_FILES = ['Worker_Male', 'Casual_Male', 'Casual_Female', 'Casual2_Male', 'Casual3_Female', 'Suit_Male'];
const ANIMAL_FILES = ['bull'];

// Convierte atributos cuantizados a Float32 y deja sólo los pedidos
function toFloat(g, keep) {
  const out = new THREE.BufferGeometry();
  for (const name of keep) {
    const a = g.getAttribute(name); if (!a) continue;
    const n = a.count, s = a.itemSize, arr = new Float32Array(n * s);
    for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) arr[i * s + k] = a.getComponent(i, k);
    out.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  if (g.index) out.setIndex(Array.from(g.index.array));
  return out;
}
const toNonIndexed = (g) => (g.index ? g.toNonIndexed() : g);

function colorize(g, c) {
  const n = g.getAttribute('position').count; const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}

// ---------------- Vehículos ----------------
// Las proporciones del kit son estilizadas: se reescala la carrocería a medidas reales
// (anchura 1,8 m, altura ~1,5 m, longitud según el modelo) y las ruedas de forma uniforme.
const CAR_DIMS = {
  police: { L: 4.75, W: 1.84, H: 1.5 }, sedan: { L: 4.6, W: 1.8, H: 1.45 }, suv: { L: 4.7, W: 1.92, H: 1.72 }, taxi: { L: 4.6, W: 1.8, H: 1.5 },
  van: { L: 5.1, W: 2.0, H: 2.1 }, truck: { L: 5.3, W: 2.0, H: 1.9 }, ambulance: { L: 5.6, W: 2.05, H: 2.5 },
};
const PHYS = { police: { mass: 1550, max: 56, acc: 9.5 }, sedan: { mass: 1450, max: 50, acc: 8 }, suv: { mass: 2000, max: 46, acc: 7 }, taxi: { mass: 1450, max: 48, acc: 7.5 }, van: { mass: 2300, max: 40, acc: 5.5 }, truck: { mass: 2600, max: 40, acc: 5.5 }, ambulance: { mass: 3200, max: 42, acc: 5.5 } };

function categorize(matName, nodeName) {
  const m = matName.toLowerCase();
  if (nodeName.startsWith('wheel')) return m.includes('tire') ? 'tire' : 'rim';
  if (m === 'window') return 'glass';
  if (m === 'lightfront') return 'head';
  if (m === 'lightback') return 'tail';
  if (m === 'lightblue' || m === 'lightred' || m === 'lightorange') return 'beacon';
  if (m.startsWith('paint')) return 'paint';
  return 'trim';
}

function prepareCar(name, gltf) {
  const root = gltf.scene; root.updateMatrixWorld(true);
  const dims = CAR_DIMS[name];
  // caja de la carrocería en unidades originales
  const box = new THREE.Box3(); const wheelNodes = [];
  root.traverse((o) => {
    if (o.isMesh && !/^wheel_(front|back)(left|right)/i.test(o.parent.name) && !/^wheel_(front|back)(left|right)/i.test(o.name)) box.expandByObject(o);
    if (/^wheel_(front|back)(left|right)/i.test(o.name) && !o.isMesh) wheelNodes.push(o);
  });
  if (!wheelNodes.length) root.traverse((o) => { if (/^wheel_(front|back)(left|right)/i.test(o.name) && o.isMesh && !wheelNodes.includes(o)) wheelNodes.push(o); });
  const size = box.getSize(new THREE.Vector3());
  const sx = dims.W / size.x, sy = dims.H / size.y, sz = dims.L / size.z;
  const flip = new THREE.Matrix4().makeRotationY(Math.PI); // el kit mira a -Z
  const S = new THREE.Matrix4().makeScale(sx, sy, sz);
  const off = new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const bodyM = new THREE.Matrix4().multiplyMatrices(flip, S).multiply(off);
  // ruedas
  const wRadOrig = 0.3; const wheelR = Math.min(0.42, Math.max(0.3, 0.36 * (dims.H / 1.5)));
  const ws = wheelR / wRadOrig;
  const parts = { paint: [], glass: [], trim: [], head: [], tail: [], beacon: [], tire: [], rim: [] };
  const wheels = []; let firstWN = null;
  const tmp = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const nodeName = (o.name.startsWith('wheel') ? o.name : o.parent?.name) || '';
    const isWheel = /^wheel_(front|back)(left|right)/i.test(nodeName);
    const cat = categorize(o.material.name || '', isWheel ? nodeName : '');
    if (cat === 'tire' || cat === 'rim') {
      // geometría de rueda centrada en su nodo (sólo la primera rueda)
      const wn = o.parent?.name?.startsWith('wheel') ? o.parent : o;
      if (!firstWN) firstWN = wn;
      if (wn !== firstWN) return;
      const g = toFloat(o.geometry, ['position', 'normal']);
      g.applyMatrix4(o.matrixWorld); // incluye la escala de descuantización
      const c = new THREE.Vector3().setFromMatrixPosition(wn.matrixWorld);
      g.translate(-c.x, -c.y, -c.z);
      g.applyMatrix4(new THREE.Matrix4().makeScale(ws, ws, ws));
      parts[cat].push(toNonIndexed(g));
      return;
    }
    const g = toFloat(o.geometry, ['position', 'normal']);
    g.applyMatrix4(o.matrixWorld); g.applyMatrix4(bodyM);
    const ng = toNonIndexed(g);
    if (cat === 'trim' || cat === 'beacon') colorize(ng, o.material.color || new THREE.Color(0.2, 0.2, 0.2));
    parts[cat].push(ng);
  });
  for (const wn of wheelNodes) {
    const p = new THREE.Vector3().setFromMatrixPosition(wn.matrixWorld).applyMatrix4(bodyM);
    wheels.push([p.x, wheelR, p.z]);
  }
  // matrículas (no vienen en el kit)
  const plate = [];
  for (const z of [dims.L / 2 + 0.005, -dims.L / 2 - 0.005]) { const b = new THREE.BoxGeometry(0.52, 0.12, 0.02).toNonIndexed(); b.deleteAttribute('uv'); b.translate(0, 0.42, z); plate.push(b); }
  const merge = (arr, color) => { if (!arr.length) return null; const g = mergeGeometries(arr.map((x) => { const y = x.clone(); if (!color) y.deleteAttribute('color'); return y; })); g.computeBoundingSphere(); return g; };
  const out = {
    paint: merge(parts.paint), glass: merge(parts.glass), trim: merge(parts.trim, true), head: merge(parts.head), tail: merge(parts.tail),
    beacon: merge(parts.beacon, true), plate: merge(plate), tire: merge(parts.tire), rim: merge(parts.rim), wheels,
  };
  // superficie lateral para rotulación
  let side = 0; const pa = out.paint.getAttribute('position');
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), z = pa.getZ(i); if (y > dims.H * 0.3 && y < dims.H * 0.55 && Math.abs(z) < dims.L * 0.25) side = Math.max(side, Math.abs(pa.getX(i))); }
  const zs = wheels.map((w) => w[2]); const wb = Math.max(...zs) - Math.min(...zs);
  out.spec = { ...PHYS[name], L: dims.L, W: dims.W, H: dims.H, wb: wb || dims.L * 0.6, r: wheelR, roofY: dims.H, sideX: side || dims.W / 2, glb: true, name };
  // altura del techo en la zona media (para el puente de luces)
  let roof = 0; for (let i = 0; i < pa.count; i++) if (Math.abs(pa.getZ(i)) < dims.L * 0.15) roof = Math.max(roof, pa.getY(i));
  out.spec.roofY = roof || dims.H;
  for (const k of ['paint', 'glass', 'trim', 'head', 'tail', 'plate', 'tire', 'rim']) if (!out[k]) { out[k] = new THREE.BoxGeometry(0.001, 0.001, 0.001).toNonIndexed(); out[k].deleteAttribute('uv'); if (k === 'trim') colorize(out[k], new THREE.Color(0, 0, 0)); }
  return out;
}

// ---------------- Animales ----------------
// Toro de lidia: se escala a 1,52 m de altura a la cruz (con la cabeza alta) y se le dan materiales PBR
function prepareAnimal(name, gltf) {
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y; const k = 1.52 / (h || 1);
  const mats = {
    Main: { color: 0x0b0a09, roughness: 0.58, sheen: true }, Main_Light: { color: 0x2a2620, roughness: 0.62 }, Muzzle: { color: 0x1a1512, roughness: 0.4 },
    Hooves: { color: 0x2a2018, roughness: 0.5 }, Horns: { color: 0xd8c9a2, roughness: 0.38 }, Eye_Black: { color: 0x050505, roughness: 0.1 }, Eye_White: { color: 0xb8b0a0, roughness: 0.2 },
  };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    // normales suavizadas (el modelo original es de sombreado plano)
    try {
      const g = toFloat(o.geometry, ['position', 'skinIndex', 'skinWeight']);
      const sm = mergeVertices(g, 1e-4); sm.computeVertexNormals();
      for (const gr of o.geometry.groups) sm.addGroup(gr.start, gr.count, gr.materialIndex);
      o.geometry = sm;
    } catch (e) { /* se conserva la geometría original */ }
    const conv = (m) => {
      const d = mats[m.name] || { color: m.color?.getHex() ?? 0x111111, roughness: 0.6 };
      const nm = d.sheen ? new THREE.MeshPhysicalMaterial({ color: d.color, roughness: d.roughness, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x3a332c) })
        : new THREE.MeshStandardMaterial({ color: d.color, roughness: d.roughness, metalness: 0 });
      nm.name = m.name; return nm;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
  const clips = {}; for (const a of gltf.animations) clips[a.name.split('|').pop()] = a;
  return { scene, scale: k, clips, name, footY: box.min.y };
}

// ---------------- Personas ----------------
function preparePerson(name, gltf) {
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const skinned = []; scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
  if (!skinned.length) return null;
  const skeleton = skinned[0].skeleton; const parent = skinned[0].parent;
  const segments = []; let start = 0; const geos = [];
  for (const sm of skinned) {
    const g = toNonIndexed(toFloat(sm.geometry, ['position', 'normal', 'skinIndex', 'skinWeight']));
    const c = sm.material.color ? sm.material.color.clone() : new THREE.Color(1, 1, 1);
    colorize(g, c);
    const n = g.getAttribute('position').count;
    segments.push({ name: sm.material.name, start, count: n, color: c }); start += n;
    geos.push(g);
  }
  const merged = mergeGeometries(geos);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(merged, mat);
  mesh.name = 'body'; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.bind(skeleton, skinned[0].bindMatrix);
  for (const sm of skinned) sm.parent.remove(sm);
  parent.add(mesh);
  // altura en pose de enlace -> escala a 1,76 m
  const box = new THREE.Box3().setFromBufferAttribute(merged.getAttribute('position'));
  const h = box.max.y - box.min.y; const k = 1.76 / (h || 1.76);
  const clips = {}; for (const a of gltf.animations) clips[a.name.split('|').pop()] = a;
  return { scene, segments, scale: k, clips, name, material: mat };
}

export async function loadAssets(onProgress = () => {}, base = './assets/') {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const files = [...CAR_FILES.map((n) => ['cars', n]), ...PEOPLE_FILES.map((n) => ['people', n]), ...ANIMAL_FILES.map((n) => ['animals', n])];
  let done = 0;
  const b64 = !!window.__ASSET_B64;
  const fetchB64 = async (url) => { const t = await (await fetch(url)).text(); const bin = atob(t.trim()); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return loader.parseAsync(u.buffer, ''); };
  const load = ([kind, n]) => (b64 ? fetchB64(`${base}${kind}/${n}.glb.txt`) : loader.loadAsync(`${base}${kind}/${n}.glb`)).then((g) => {
    done++; onProgress(done / files.length, `Modelos 3D: ${n.replace('_', ' ')}`);
    if (kind === 'cars') ASSETS.cars[n] = prepareCar(n, g); else if (kind === 'animals') ASSETS.animals[n] = prepareAnimal(n, g); else { const p = preparePerson(n, g); if (p) ASSETS.people[n] = p; }
  });
  try {
    await Promise.all(files.map(load));
    ASSETS.ok = Object.keys(ASSETS.cars).length > 0;
  } catch (e) {
    console.warn('No se pudieron cargar los modelos externos; se usan los procedurales', e);
    ASSETS.ok = false;
  }
  return ASSETS;
}
