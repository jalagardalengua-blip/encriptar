import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generadores, porId } from './generadores/index.js';
import { resolverParametros, construir, exportarGLB } from './core/exportar.js';

const $ = (id) => document.getElementById(id);
const guardar = (k, v) => { try { localStorage.setItem('estudio3d:' + k, JSON.stringify(v)); } catch {} };
const leer = (k, d) => { try { const v = localStorage.getItem('estudio3d:' + k); return v ? JSON.parse(v) : d; } catch { return d; } };

// ---------- Escena ----------
const mesa = $('mesa');
const render = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
render.toneMapping = THREE.ACESFilmicToneMapping; render.toneMappingExposure = 1.05;
mesa.prepend(render.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
const mandos = new OrbitControls(camara, render.domElement);
mandos.enableDamping = true; mandos.dampingFactor = 0.08;

escena.add(new THREE.HemisphereLight(0xf2f5ff, 0x8a7a5c, 1.35));
const sol = new THREE.DirectionalLight(0xfff1dc, 2.6);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
escena.add(sol, sol.target);
const relleno = new THREE.DirectionalLight(0xbfd4ff, 0.6); relleno.position.set(-4, 3, -5); escena.add(relleno);

const suelo = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
const rejilla = new THREE.GridHelper(1, 10, 0x000000, 0x000000);
rejilla.material.transparent = true; rejilla.material.opacity = 0.08; escena.add(rejilla);

let actual = null, mezclador = null, acciones = [], ayudaHuesos = null, verHuesos = false, verMalla = false;
const reloj = new THREE.Clock();

function encuadrar(obj) {
  const caja = new THREE.Box3().setFromObject(obj);
  const tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
  const r = Math.max(tam.x, tam.y, tam.z, 0.2);
  mandos.target.set(centro.x, centro.y * 0.95, centro.z);
  const dist = r * 0.68 / Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) / Math.min(1, camara.aspect * 0.9);
  camara.position.set(centro.x + dist * 0.62, centro.y + dist * 0.32, centro.z + dist * 0.85);
  camara.near = r / 100; camara.far = r * 100; camara.updateProjectionMatrix();
  mandos.update();
  const piso = Math.max(tam.x, tam.z) * 1.6 + 0.6;
  suelo.scale.setScalar(piso); rejilla.scale.setScalar(piso * 1.6);
  sol.position.set(centro.x + r * 2, r * 4, centro.z + r * 2.5);
  sol.target.position.copy(centro);
  const c = sol.shadow.camera; c.left = c.bottom = -r * 1.5; c.right = c.top = r * 1.5; c.near = 0.1; c.far = r * 12; c.updateProjectionMatrix();
}

function poner(obj, animaciones, info) {
  if (actual) { escena.remove(actual); actual.traverse((o) => { o.geometry?.dispose(); }); }
  if (ayudaHuesos) { escena.remove(ayudaHuesos); ayudaHuesos = null; }
  actual = obj; escena.add(obj);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  mezclador = new THREE.AnimationMixer(obj);
  acciones = animaciones.map((c) => mezclador.clipAction(c));
  if (obj.getObjectByProperty('type', 'Bone')) {
    ayudaHuesos = new THREE.SkeletonHelper(obj); ayudaHuesos.visible = verHuesos; escena.add(ayudaHuesos);
  }
  aplicarMalla();
  pintarAnims(animaciones);
  pintarFicha(obj, animaciones, info);
}

function aplicarMalla() {
  actual?.traverse((o) => { if (o.isMesh) [o.material].flat().forEach((m) => { m.wireframe = verMalla; }); });
}

function pintarFicha(obj, animaciones, info = '') {
  let tris = 0, mats = new Set(), huesos = 0;
  obj.traverse((o) => {
    if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; [o.material].flat().forEach((m) => mats.add(m)); }
    if (o.isBone) huesos++;
  });
  const t = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  $('ficha').innerHTML = (info ? `<b>${info}</b><br>` : '') +
    `<span>Triángulos</span> <b>${Math.round(tris).toLocaleString('es')}</b><br>` +
    `<span>Huesos</span> <b>${huesos}</b> · <span>Materiales</span> <b>${mats.size}</b><br>` +
    `<span>Animaciones</span> <b>${animaciones.length}</b><br>` +
    `<span>Tamaño</span> <b>${t.x.toFixed(2)} × ${t.y.toFixed(2)} × ${t.z.toFixed(2)} m</b>`;
}

let animActiva = -1, velocidad = 1;
function pintarAnims(animaciones) {
  const cont = $('anims'); cont.innerHTML = '';
  if (!animaciones.length) { cont.hidden = true; return; }
  cont.hidden = false;
  const quieto = document.createElement('button');
  quieto.className = 'chip'; quieto.type = 'button'; quieto.textContent = 'Pose de reposo';
  quieto.onclick = () => activar(-1); cont.append(quieto);
  animaciones.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = c.name; b.onclick = () => activar(i);
    cont.append(b);
  });
  const l = document.createElement('label');
  l.innerHTML = 'Velocidad <input id="vel" type="range" min="0.1" max="2" step="0.05" value="' + velocidad + '">';
  cont.append(l);
  l.querySelector('input').oninput = (e) => { velocidad = +e.target.value; };
  const previa = animaciones.findIndex((c) => c.name === nombreAnimActiva);
  activar(previa >= 0 ? previa : 0);
}
let nombreAnimActiva = null;
function activar(i) {
  acciones.forEach((a) => a.stop());
  animActiva = i;
  if (i >= 0) { acciones[i].reset().play(); nombreAnimActiva = acciones[i].getClip().name; } else nombreAnimActiva = null;
  [...$('anims').querySelectorAll('.chip')].forEach((b, k) => b.classList.toggle('activa', k - 1 === i));
}

function redimensionar() {
  const w = mesa.clientWidth, h = mesa.clientHeight;
  render.setSize(w, h, false); camara.aspect = w / Math.max(1, h); camara.updateProjectionMatrix();
}
new ResizeObserver(redimensionar).observe(mesa);
render.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.1);
  mezclador?.update(dt * velocidad);
  mandos.update();
  render.render(escena, camara);
});

// ---------- Panel ----------
const estado = leer('estado', { gen: generadores[0].id, preset: null, cambios: {} });
let gen = porId(estado.gen) || generadores[0];
let preset = estado.preset, cambios = estado.cambios || {};
if (preset === null && gen.presets) preset = Object.keys(gen.presets)[0];

function pintarGeneradores() {
  const c = $('generadores'); c.innerHTML = '';
  for (const g of generadores) {
    const b = document.createElement('button');
    b.className = 'gen'; b.type = 'button'; b.setAttribute('aria-pressed', g === gen);
    b.innerHTML = `<span class="ico" aria-hidden="true">${g.icono}</span><span class="nom">${g.nombre}</span>`;
    b.onclick = () => { gen = g; cambios = {}; preset = g.presets ? Object.keys(g.presets)[0] : null; nombreAnimActiva = null; todo(); };
    c.append(b);
  }
  $('desc').textContent = gen.descripcion || '';
}

function pintarPresets() {
  const c = $('presets'); c.innerHTML = '';
  $('secPresets').hidden = !gen.presets;
  for (const [k] of Object.entries(gen.presets || {})) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.setAttribute('aria-pressed', k === preset);
    b.textContent = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
    b.onclick = () => { preset = k; cambios = {}; todo(); };
    c.append(b);
  }
}

function control(d, valor) {
  const fila = document.createElement('div'); fila.className = 'param';
  const id = 'p_' + d.id;
  const lab = `<label for="${id}">${d.nombre}</label>`;
  if (d.tipo === 'rango') {
    fila.innerHTML = `${lab}<output id="${id}_o">${(+valor).toFixed(d.paso < 0.1 ? 2 : 1)}</output><input id="${id}" type="range" min="${d.min}" max="${d.max}" step="${d.paso}" value="${valor}">`;
    const inp = fila.querySelector('input');
    inp.oninput = () => { fila.querySelector('output').textContent = (+inp.value).toFixed(d.paso < 0.1 ? 2 : 1); cambiar(d.id, +inp.value); };
  } else if (d.tipo === 'color') {
    fila.innerHTML = `${lab}<input id="${id}" type="color" value="${valor}">`;
    fila.querySelector('input').oninput = (e) => cambiar(d.id, e.target.value);
  } else if (d.tipo === 'opcion') {
    fila.innerHTML = `${lab}<select id="${id}">${d.opciones.map(([v, t]) => `<option value="${v}"${v === valor ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    fila.querySelector('select').onchange = (e) => cambiar(d.id, e.target.value);
  } else if (d.tipo === 'si') {
    fila.innerHTML = `${lab}<input id="${id}" type="checkbox"${valor ? ' checked' : ''}>`;
    fila.querySelector('input').onchange = (e) => cambiar(d.id, e.target.checked);
  } else if (d.tipo === 'numero') {
    fila.innerHTML = `${lab}<input id="${id}" type="number" value="${valor}" step="1">`;
    fila.querySelector('input').onchange = (e) => cambiar(d.id, Math.round(+e.target.value) || 1);
  }
  return fila;
}

function pintarParametros() {
  const p = resolverParametros(gen, preset, cambios);
  const forma = $('params'), colores = $('colores'), comunes = $('comunes');
  forma.innerHTML = colores.innerHTML = comunes.innerHTML = '';
  for (const d of gen.parametros) (d.tipo === 'color' ? colores : forma).append(control(d, p[d.id]));
  comunes.append(control({ id: 'facetado', nombre: 'Estilo facetado (low poly)', tipo: 'si' }, p.facetado));
  comunes.append(control({ id: 'semilla', nombre: 'Semilla de variación', tipo: 'numero' }, p.semilla));
}

let pendiente = 0;
function cambiar(k, v) {
  cambios[k] = v; guardarEstado();
  cancelAnimationFrame(pendiente); pendiente = requestAnimationFrame(reconstruir);
}
function guardarEstado() { guardar('estado', { gen: gen.id, preset, cambios }); }

function parametrosActuales() { return resolverParametros(gen, preset, cambios); }

let primera = true;
function reconstruir() {
  try {
    const p = parametrosActuales();
    const { objeto, animaciones } = construir(gen, p);
    poner(objeto, animaciones);
    if (primera || encuadrarSiguiente) { encuadrar(objeto); primera = false; encuadrarSiguiente = false; }
    pintarComando(p);
  } catch (e) {
    console.error(e);
    $('ficha').innerHTML = `<span class="error">No se pudo construir el modelo: ${e.message}</span>`;
  }
}
let encuadrarSiguiente = false;

function pintarComando(p) {
  const base = resolverParametros(gen, preset, {});
  const extra = Object.entries(p).filter(([k, v]) => base[k] !== v).map(([k, v]) => ` --${k} ${typeof v === 'string' && /[\s#]/.test(v) ? `"${v}"` : v}`).join('');
  const nombre = (preset || gen.id).replace(/[^a-z0-9_-]/gi, '_');
  $('cmd').textContent = `node herramientas/generar.mjs ${gen.id}${preset ? ' --preset ' + preset : ''}${extra} --salida modelos/${nombre}.glb`;
}

function todo() {
  guardarEstado(); pintarGeneradores(); pintarPresets(); pintarParametros(); encuadrarSiguiente = true; reconstruir();
}

// ---------- Acciones ----------
function aviso(t) { const x = $('toast'); x.textContent = t; x.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(() => x.classList.remove('ver'), 2600); }

$('semilla').onclick = () => {
  const p = parametrosActuales(); cambios.semilla = (p.semilla || 1) + 1; pintarParametros(); guardarEstado(); reconstruir();
};
$('verHuesos').onclick = (e) => { verHuesos = !verHuesos; e.target.setAttribute('aria-pressed', verHuesos); if (ayudaHuesos) ayudaHuesos.visible = verHuesos; };
$('verMalla').onclick = (e) => { verMalla = !verMalla; e.target.setAttribute('aria-pressed', verMalla); aplicarMalla(); };
$('centrar').onclick = () => actual && encuadrar(actual);
$('copiar').onclick = async () => {
  const t = $('cmd').textContent;
  try { await navigator.clipboard.writeText(t); aviso('Comando copiado'); }
  catch { const r = document.createRange(); r.selectNodeContents($('cmd')); getSelection().removeAllRanges(); getSelection().addRange(r); aviso('Selecciona y copia el comando'); }
};

/** Guardar el archivo: usa la capacidad de descarga del visor si existe, si no un enlace normal */
async function descargar(nombre, datos) {
  const blob = new Blob([datos], { type: 'model/gltf-binary' });
  const claude = window.claude;
  if (claude?.use) {
    try {
      const desc = await claude.use('download');
      if (desc?.save) { await desc.save({ filename: nombre, data: blob, mimeType: 'model/gltf-binary' }); return true; }
    } catch (e) { console.warn('Descarga del visor no disponible', e); }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

$('exportar').onclick = async () => {
  const b = $('exportar'); b.disabled = true; b.textContent = 'Exportando…';
  try {
    const p = parametrosActuales();
    const { objeto, animaciones } = construir(gen, p); // modelo limpio, en pose de reposo
    const glb = await exportarGLB(objeto, animaciones);
    const nombre = `${(preset || gen.id).replace(/[^a-z0-9_-]/gi, '_')}_${p.semilla}.glb`;
    await descargar(nombre, glb);
    aviso(`${nombre} · ${(glb.byteLength / 1024).toFixed(0)} KB`);
  } catch (e) { console.error(e); aviso('No se pudo exportar: ' + e.message); }
  b.disabled = false; b.textContent = 'Descargar .glb';
};

$('abrir').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const gltf = await new GLTFLoader().parseAsync(await f.arrayBuffer(), '');
    poner(gltf.scene, gltf.animations, f.name); encuadrar(gltf.scene);
    aviso('Archivo abierto: ' + f.name);
  } catch (err) { aviso('No se pudo abrir: ' + err.message); }
  e.target.value = '';
};

todo();
window.__estudio = { pose(i, t) { activar(i); const a = acciones[i]; a.time = t * a.getClip().duration; a.paused = true; mezclador.update(0); }, elegir(id, pr, cb = {}) { gen = porId(id); preset = pr; cambios = cb; todo(); }, escena, camara, mandos, get actual() { return actual; }, activar };
