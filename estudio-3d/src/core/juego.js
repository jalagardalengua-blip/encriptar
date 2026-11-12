// Preparar modelos para videojuegos: reducir triángulos, ajustar texturas, crear LODs
// y adaptar los nombres de las animaciones a cada motor.
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from '../../lib/addons/libs/meshopt_simplifier.module.js';

export const PLATAFORMAS = {
  movil: { nombre: 'Móvil', tris: 8000, tex: 1024 },
  pc: { nombre: 'PC / consola', tris: 40000, tex: 2048 },
  original: { nombre: 'Sin reducir', tris: Infinity, tex: Infinity },
};
export const MOTORES = { web: 'Three.js (juegos con Claude)', godot: 'Godot 4', unity: 'Unity', unreal: 'Unreal Engine' };
/** Proporción de triángulos de cada nivel de detalle (LOD0 = el modelo para jugar) */
export const NIVELES_LOD = [1, 0.4, 0.15];
const SIN_BUCLE = /^(Abrir_puertas|Subir_pala)$/;
export const esBucle = (nombre) => !SIN_BUCLE.test(nombre.replace(/[-_]loop$/, ''));

/** Datos de rendimiento de un modelo */
export function medir(objeto) {
  let tris = 0, mallas = 0, huesos = 0, maxTex = 0, memTex = 0;
  const mats = new Set(), texs = new Set();
  objeto.traverse((o) => {
    if (o.isBone) huesos++;
    if (!o.isMesh) return;
    mallas++;
    const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    tris += n / 3;
    for (const m of [o.material].flat()) {
      mats.add(m);
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) if (m[k]?.image) texs.add(m[k]);
    }
  });
  for (const t of texs) { const w = t.image.width || 0, h = t.image.height || 0; maxTex = Math.max(maxTex, w, h); memTex += w * h * 4 * 1.33; }
  // Llamadas de dibujo ≈ una por material de cada malla
  let dibujos = 0; objeto.traverse((o) => { if (o.isMesh) dibujos += Array.isArray(o.material) ? new Set(o.geometry.groups.map((g) => g.materialIndex)).size || 1 : 1; });
  return { tris: Math.round(tris), mallas, huesos, materiales: mats.size, texturas: texs.size, maxTex, memTexMB: memTex / 1048576, dibujos };
}

/** ¿Cabe en el presupuesto de la plataforma? */
export function veredicto(m, plataforma) {
  const p = PLATAFORMAS[plataforma];
  const avisos = [];
  if (m.tris > p.tris) avisos.push(`${m.tris.toLocaleString('es')} triángulos → se reducirán a ${p.tris.toLocaleString('es')}`);
  if (m.maxTex > p.tex) avisos.push(`texturas de ${m.maxTex}px → se reducirán a ${p.tex}px`);
  if (m.materiales > 1 && m.texturas === 0) avisos.push(`${m.materiales} materiales → se juntan en una paleta (${m.mallas} ${m.mallas === 1 ? 'llamada' : 'llamadas'} de dibujo)`);
  else if (m.dibujos > 8) avisos.push(`${m.dibujos} llamadas de dibujo (mejor menos de 8)`);
  if (m.huesos > 75 && plataforma === 'movil') avisos.push(`${m.huesos} huesos (en móvil, mejor menos de 75)`);
  return avisos;
}

const leer = (attr, i, k) => attr.isInterleavedBufferAttribute ? attr.data.array[i * attr.data.stride + attr.offset + k] : attr.array[i * attr.itemSize + k];

/** Reduce los triángulos de una geometría (respetando grupos de material, UV y pesos de piel) */
export function simplificar(geo, proporcion) {
  let g = geo.index ? geo.clone() : mergeVertices(geo.clone());
  if (!g.index) return g;
  const P = g.attributes.position, n = P.count, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = P.getX(i); pos[i * 3 + 1] = P.getY(i); pos[i * 3 + 2] = P.getZ(i); }
  const todo = Uint32Array.from(g.index.array);
  const grupos = g.groups.length ? g.groups : [{ start: 0, count: todo.length, materialIndex: 0 }];
  const partes = [], nuevos = [];
  let total = 0;
  for (const gr of grupos) {
    const sub = todo.slice(gr.start, gr.start + gr.count);
    const objetivo = Math.max(3, Math.floor((sub.length * proporcion) / 3) * 3);
    const flags = sub.length < todo.length * 0.9 ? ['Sparse'] : [];
    // Se sube el error permitido poco a poco, con un máximo que conserve la silueta (ojos, hocico, orejas...)
    let r;
    for (const error of [0.005, 0.012, 0.025, 0.04]) { [r] = MeshoptSimplifier.simplify(sub, pos, 3, objetivo, error, flags); if (r.length <= objetivo * 1.15) break; }
    partes.push(r); nuevos.push({ start: total, count: r.length, materialIndex: gr.materialIndex }); total += r.length;
  }
  // Quitar los vértices que ya no se usan
  const usado = new Int32Array(n).fill(-1); let m = 0;
  const indice = new Uint32Array(total); let k = 0;
  for (const r of partes) for (const i of r) { if (usado[i] < 0) usado[i] = m++; indice[k++] = usado[i]; }
  const res = new THREE.BufferGeometry();
  for (const [nombre, a] of Object.entries(g.attributes)) {
    const tam = a.itemSize, arr = new (a.isInterleavedBufferAttribute ? a.data.array.constructor : a.array.constructor)(m * tam);
    for (let i = 0; i < n; i++) if (usado[i] >= 0) for (let c = 0; c < tam; c++) arr[usado[i] * tam + c] = leer(a, i, c);
    res.setAttribute(nombre, new THREE.BufferAttribute(arr, tam, a.normalized));
  }
  res.setIndex(new THREE.BufferAttribute(m > 65535 ? indice : Uint16Array.from(indice), 1));
  if (geo.groups.length) for (const x of nuevos) res.addGroup(x.start, x.count, x.materialIndex);
  res.computeBoundingBox(); res.computeBoundingSphere();
  return res;
}

/** Copia de la textura con un tamaño máximo; JPEG si no necesita transparencia */
function ajustarTextura(tex, max, transparente, esColor) {
  if (!tex?.image) return tex;
  const img = tex.image, w = img.width, h = img.height;
  const t = tex.clone();
  t.userData = { ...tex.userData, mimeType: esColor && !transparente ? 'image/jpeg' : 'image/png' };
  if (Number.isFinite(max) && Math.max(w, h) > max && typeof document !== 'undefined') {
    const e = max / Math.max(w, h), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * e)); c.height = Math.max(1, Math.round(h * e));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    t.image = c; t.needsUpdate = true;
  }
  return t;
}

/**
 * Junta todos los materiales de color liso en uno solo con una textura de paleta
 * (color + rugosidad/metal + brillo propio). Una malla = una llamada de dibujo.
 */
export function unificarMateriales(objeto) {
  const mallas = [], lisos = new Map();
  objeto.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [o.material].flat();
    if (!mats.every((m) => m.isMeshStandardMaterial && !m.map && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.emissiveMap && !m.alphaMap && !m.transparent)) return;
    mallas.push(o);
    for (const m of mats) if (!lisos.has(m)) lisos.set(m, lisos.size);
  });
  if (lisos.size < 2) return 0;
  const N = lisos.size, celda = 8, cols = Math.ceil(Math.sqrt(N));
  let lado = 1; while (lado < cols * celda) lado *= 2;
  const color = new Uint8Array(lado * lado * 4), mr = new Uint8Array(lado * lado * 4), em = new Uint8Array(lado * lado * 4);
  let conBrillo = false;
  const t = { r: 0, g: 0, b: 0 }, centro = [];
  for (const [m, i] of lisos) {
    const cx = (i % cols) * celda, cy = Math.floor(i / cols) * celda;
    centro[i] = [(cx + celda / 2) / lado, (cy + celda / 2) / lado];
    m.color.getRGB(t, THREE.SRGBColorSpace);
    const c = [t.r, t.g, t.b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
    m.emissive.getRGB(t, THREE.SRGBColorSpace);
    const e = [t.r, t.g, t.b].map((v) => Math.round(Math.min(1, v * m.emissiveIntensity) * 255));
    if (e.some((v) => v > 0)) conBrillo = true;
    for (let y = cy; y < cy + celda; y++) for (let x = cx; x < cx + celda; x++) {
      const k = (y * lado + x) * 4;
      color.set([...c, 255], k); mr.set([0, Math.round(m.roughness * 255), Math.round(m.metalness * 255), 255], k); em.set([...e, 255], k);
    }
  }
  const tex = (datos, nombre, srgb) => {
    const x = new THREE.DataTexture(datos, lado, lado, THREE.RGBAFormat);
    x.name = nombre; x.flipY = false; x.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    x.magFilter = THREE.NearestFilter; x.minFilter = THREE.NearestMipmapNearestFilter; x.userData.mimeType = 'image/png'; x.needsUpdate = true;
    return x;
  };
  const mrTex = tex(mr, 'rugosidad_metal', false);
  const paleta = new THREE.MeshStandardMaterial({ name: 'paleta', map: tex(color, 'paleta', true), roughnessMap: mrTex, metalnessMap: mrTex, roughness: 1, metalness: 1 });
  if (conBrillo) { paleta.emissiveMap = tex(em, 'brillo', true); paleta.emissive.setRGB(1, 1, 1); }
  for (const o of mallas) {
    const g = o.geometry, mats = [o.material].flat(), n = g.attributes.position.count, uv = new Float32Array(n * 2);
    const grupos = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : n, materialIndex: 0 }];
    const idx = g.index ? g.index.array : null;
    for (const gr of grupos) {
      const [u, v] = centro[lisos.get(mats[gr.materialIndex] ?? mats[0])];
      for (let i = gr.start; i < gr.start + gr.count; i++) { const k = idx ? idx[i] : i; uv[k * 2] = u; uv[k * 2 + 1] = v; }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.clearGroups();
    o.material = paleta;
  }
  return N;
}

/**
 * Devuelve una copia del modelo lista para el juego.
 * nivel: proporción extra de triángulos (1 = LOD0, 0.4 = LOD1...).
 */
export async function preparar(objeto, animaciones, { plataforma = 'pc', motor = 'web', nivel = 1, paleta = true } = {}) {
  await MeshoptSimplifier.ready;
  const perfil = PLATAFORMAS[plataforma] || PLATAFORMAS.pc;
  const copia = clonarEsqueleto(objeto);
  copia.updateMatrixWorld(true);
  const { tris } = medir(copia);
  const objetivo = Math.min(tris, perfil.tris) * nivel;
  const proporcion = objetivo / Math.max(1, tris);
  const cache = new Map();
  copia.traverse((o) => {
    if (!o.isMesh) return;
    if (proporcion < 0.97) o.geometry = simplificar(o.geometry, proporcion);
    o.material = [o.material].flat().map((m) => {
      if (cache.has(m)) return cache.get(m);
      const c = m.clone(), trans = m.transparent || m.alphaTest > 0;
      for (const k of ['map', 'emissiveMap']) if (m[k]) c[k] = ajustarTextura(m[k], perfil.tex, trans, true);
      for (const k of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) c[k] = ajustarTextura(m[k], perfil.tex, trans, false);
      cache.set(m, c); return c;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  if (paleta) unificarMateriales(copia);
  let anims = animaciones.map((c) => reducirClaves(c));
  if (motor === 'godot') anims = anims.map((c) => { if (esBucle(c.name)) c.name = c.name + '-loop'; return c; });
  return { objeto: copia, animaciones: anims };
}

/**
 * Quita fotogramas clave que se pueden calcular interpolando entre sus vecinos
 * (el movimiento no cambia de forma apreciable y el archivo pesa mucho menos).
 */
export function reducirClaves(clip, tolerancia = 0.0015) {
  const pistas = clip.tracks.map((t) => {
    const n = t.times.length, d = t.getValueSize(), T = t.times, V = t.values;
    if (n <= 2) return t.clone();
    const quedan = [0];
    let a = 0;
    for (let i = 1; i < n - 1; i++) {
      // ¿Todos los puntos entre «a» e «i+1» se aproximan con una recta?
      const b = i + 1; let ok = true;
      for (let j = a + 1; j < b && ok; j++) {
        const f = (T[j] - T[a]) / (T[b] - T[a]);
        for (let c = 0; c < d; c++) { const est = V[a * d + c] + (V[b * d + c] - V[a * d + c]) * f; if (Math.abs(est - V[j * d + c]) > tolerancia) { ok = false; break; } }
      }
      if (!ok) { quedan.push(i); a = i; }
    }
    quedan.push(n - 1);
    const tiempos = new Float32Array(quedan.map((i) => T[i]));
    const valores = new Float32Array(quedan.length * d);
    quedan.forEach((i, k) => { for (let c = 0; c < d; c++) valores[k * d + c] = V[i * d + c]; });
    return new t.constructor(t.name, tiempos, valores, t.getInterpolation?.());
  });
  return new THREE.AnimationClip(clip.name, clip.duration, pistas);
}

/** Texto LEEME con los datos del modelo y cómo usarlo en el motor elegido */
export function leeme(nombre, datos, { plataforma, motor, lods, animaciones }) {
  const filas = datos.map((d) => `  ${d.archivo.padEnd(28)} ${String(d.tris).padStart(8)} triángulos   ${(d.bytes / 1024).toFixed(0).padStart(6)} KB`).join('\n');
  const anims = animaciones.map((a) => `  - ${a.name}  (${a.duration.toFixed(2)} s${esBucle(a.name) ? ', en bucle' : ', una vez'})`).join('\n') || '  (ninguna)';
  const m = datos[0];
  const usos = {
    godot: `GODOT 4
  1. Copia la carpeta al proyecto. Godot importa los .glb solo.
  2. Las animaciones que terminan en «-loop» ya se importan en bucle.
  3. Arrastra ${nombre}.glb a la escena y reproduce:  $${nombre}/AnimationPlayer.play("Caminar-loop")
  4. LODs: Godot genera LODs automáticos al importar (Mesh > Generate LODs). Los archivos _LOD1 y _LOD2
     sirven si prefieres los nuestros con un VisibilityRange en cada uno.`,
    unity: `UNITY
  1. Instala glTFast (Window > Package Manager > + > Add package by name: com.unity.cloud.gltfast).
  2. Copia la carpeta a Assets/. Cada .glb aparece como prefab con sus clips de animación.
  3. LODs: crea un objeto vacío con un componente «LOD Group» y arrastra ${nombre}.glb, _LOD1 y _LOD2 a LOD 0, 1 y 2.
  4. Para personas puedes configurar el Rig como Humanoid: los huesos tienen nombres estándar (Hips, Spine, Head, UpperArm_L...).`,
    unreal: `UNREAL ENGINE 5
  1. Activa el plugin «glTF Importer» (Edit > Plugins) y reinicia.
  2. Arrastra ${nombre}.glb al Content Browser: crea Skeletal Mesh, Skeleton y una Animation Sequence por animación.
     Unreal pasa de metros a centímetros solo.
  3. LODs: abre el Skeletal Mesh > LOD Settings > Import LOD y elige _LOD1 y _LOD2.
  4. Marca «Loop» en las animaciones de caminar, correr, reposo... al usarlas en el Animation Blueprint.`,
    web: `THREE.JS (el motor de los juegos que hace Claude)
  Usa cargar-modelo.js (incluido en el paquete):
    import { cargarModelo } from './cargar-modelo.js';
    const vaca = await cargarModelo('${nombre}', { escena });   // carga LOD0/1/2, sombras y animaciones
    vaca.animar('Caminar');                                     // en el bucle del juego: vaca.update(delta)
  O a mano:
  const gltf = await new GLTFLoader().loadAsync('${nombre}.glb');
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Caminar')).play();
  // en cada fotograma: mixer.update(delta)
  // LODs: const lod = new THREE.LOD(); lod.addLevel(lod0, 0); lod.addLevel(lod1, 15); lod.addLevel(lod2, 40);
  // Varios personajes con el mismo archivo: SkeletonUtils.clone(gltf.scene)`,
  };
  return `${nombre} — preparado para videojuegos con el Estudio de Modelos 3D
Plataforma: ${PLATAFORMAS[plataforma].nombre}   Motor: ${MOTORES[motor]}

ARCHIVOS
${filas}

DATOS (LOD0)
  Huesos: ${m.huesos}   Materiales: ${m.materiales}   Llamadas de dibujo: ${m.dibujos}
  Texturas: ${m.texturas}${m.texturas ? ` (máx. ${m.maxTex}px, ~${m.memTexMB.toFixed(1)} MB en GPU)` : ''}
  Escala: metros. El modelo mira hacia +Z y apoya en el suelo (y = 0).
  Animaciones «en el sitio»: el juego mueve el personaje y reproduce Caminar/Correr a la vez.

ANIMACIONES
${anims}

${usos[motor]}
${lods ? '' : '\n(Paquete sin LODs.)'}
`;
}

/** Cargador para juegos con Three.js: LODs, sombras, animaciones con fundido y varias copias del mismo modelo */
export const CARGADOR_THREE = `// cargar-modelo.js — generado por el Estudio de Modelos 3D (Three.js r150 o superior)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const cargador = new GLTFLoader();
const cache = new Map();
const leer = (url) => { if (!cache.has(url)) cache.set(url, cargador.loadAsync(url).catch(() => null)); return cache.get(url); };

/**
 * Carga «nombre.glb» (y, si existen, «nombre_LOD1.glb» y «nombre_LOD2.glb»).
 * Devuelve { objeto, animar(nombre, fundido), update(delta), mixer }. Llamar varias veces da copias independientes.
 */
export async function cargarModelo(base, { escena = null, ruta = './', distancias = [0, 15, 40], sombras = true } = {}) {
  const [l0, l1, l2] = await Promise.all([leer(ruta + base + '.glb'), leer(ruta + base + '_LOD1.glb'), leer(ruta + base + '_LOD2.glb')]);
  if (!l0) throw new Error('No se encontró ' + ruta + base + '.glb');
  const niveles = [l0, l1, l2].filter(Boolean).map((g) => clone(g.scene));
  for (const n of niveles) n.traverse((o) => { if (o.isMesh) { o.castShadow = sombras; o.receiveShadow = sombras; } });
  const objeto = niveles.length > 1 ? new THREE.LOD() : niveles[0];
  if (niveles.length > 1) niveles.forEach((n, i) => objeto.addLevel(n, distancias[i] ?? i * 20));
  const mixers = niveles.map((n) => new THREE.AnimationMixer(n));
  const clips = l0.animations;
  let actuales = [];
  const animar = (nombre, fundido = 0.25) => {
    const clip = clips.find((c) => c.name === nombre || c.name === nombre + '-loop');
    if (!clip) { console.warn('Animación desconocida:', nombre, clips.map((c) => c.name)); return; }
    const nuevas = mixers.map((m) => m.clipAction(clip));
    nuevas.forEach((a, i) => { a.reset().play(); if (actuales[i] && actuales[i] !== a) actuales[i].crossFadeTo(a, fundido, false); });
    actuales = nuevas;
  };
  if (escena) escena.add(objeto);
  return { objeto, animar, update: (dt) => mixers.forEach((m) => m.update(dt)), mixer: mixers[0], animaciones: clips.map((c) => c.name) };
}
`;
