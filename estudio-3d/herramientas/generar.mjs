#!/usr/bin/env node
// Genera modelos GLB desde la terminal (sin navegador).
//
//   node herramientas/generar.mjs --lista                       → generadores, presets y parámetros
//   node herramientas/generar.mjs cuadrupedo --preset vaca      → modelos/vaca.glb
//   node herramientas/generar.mjs humanoide --preset granjero --altura 1.9 --colorCamisa "#2255aa" --salida granjero_azul.glb
//   node herramientas/generar.mjs --todos modelos               → todos los presets de todos los generadores
import fs from 'node:fs';
import path from 'node:path';

// El exportador de three.js usa FileReader, que no existe en Node.
globalThis.FileReader ??= class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
};

// Lienzo mínimo para que el exportador pueda escribir texturas generadas (la paleta) como PNG.
if (typeof OffscreenCanvas === 'undefined') {
  const zlib = await import('node:zlib');
  const png = (w, h, rgba) => {
    const crudo = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { crudo[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(crudo, y * (w * 4 + 1) + 1); }
    const trozo = (tipo, datos) => { const t = Buffer.from(tipo, 'latin1'), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(datos.length); c.writeUInt32BE(zlib.crc32(Buffer.concat([t, datos])) >>> 0); return Buffer.concat([l, t, datos, c]); };
    const cab = Buffer.alloc(13); cab.writeUInt32BE(w, 0); cab.writeUInt32BE(h, 4); cab.set([8, 6, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', cab), trozo('IDAT', zlib.deflateSync(crudo)), trozo('IEND', Buffer.alloc(0))]);
  };
  globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { this.width = w; this.height = h; this.pixeles = null; }
    getContext() { const lienzo = this; return { translate() {}, scale() {}, putImageData(img) { lienzo.pixeles = img.data; }, drawImage() { throw new Error('Las imágenes solo se pueden exportar desde la app web.'); } }; }
    async convertToBlob() { return new Blob([png(this.width, this.height, this.pixeles || new Uint8ClampedArray(this.width * this.height * 4))], { type: 'image/png' }); }
  };
}

const { generadores, porId } = await import('../src/generadores/index.js');
const { resolverParametros, construir, exportarGLB } = await import('../src/core/exportar.js');
const { preparar, medir, leeme, NIVELES_LOD, PLATAFORMAS, MOTORES } = await import('../src/core/juego.js');

const args = process.argv.slice(2);
const opciones = {}; const sueltos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2), v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    opciones[k] = v;
  } else sueltos.push(args[i]);
}
const valor = (v, def) => {
  if (typeof def === 'number') return Number(v);
  if (typeof def === 'boolean') return v === true || ['true', 'si', 'sí', '1'].includes(String(v).toLowerCase());
  return String(v);
};

function info(objeto, animaciones, bytes) {
  let tris = 0, huesos = 0;
  objeto.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; if (o.isBone) huesos++; });
  return `${(bytes / 1024).toFixed(0)} KB · ${Math.round(tris)} triángulos · ${huesos} huesos · animaciones: ${animaciones.map((a) => a.name).join(', ') || 'ninguna'}`;
}

const juego = opciones.plataforma || opciones.motor || opciones.lods
  ? { plataforma: opciones.plataforma || 'pc', motor: opciones.motor || 'web', lods: !!opciones.lods } : null;
if (juego && !PLATAFORMAS[juego.plataforma]) { console.error(`Plataforma desconocida: ${juego.plataforma}. Usa: ${Object.keys(PLATAFORMAS).join(', ')}`); process.exit(1); }
if (juego && !MOTORES[juego.motor]) { console.error(`Motor desconocido: ${juego.motor}. Usa: ${Object.keys(MOTORES).join(', ')}`); process.exit(1); }

async function generar(gen, preset, cambios, salida) {
  const p = resolverParametros(gen, preset, cambios);
  const { objeto, animaciones } = construir(gen, p);
  objeto.updateMatrixWorld(true);
  fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
  if (!juego) {
    const glb = await exportarGLB(objeto, animaciones);
    fs.writeFileSync(salida, Buffer.from(glb));
    console.log(`✓ ${salida}  (${info(objeto, animaciones, glb.byteLength)})`);
    return;
  }
  const niveles = juego.lods ? NIVELES_LOD : [1], datos = [];
  let anims0 = animaciones;
  for (let i = 0; i < niveles.length; i++) {
    const r = await preparar(objeto, animaciones, { ...juego, nivel: niveles[i] });
    if (!i) anims0 = r.animaciones;
    const glb = await exportarGLB(r.objeto, r.animaciones);
    const archivo = i ? salida.replace(/\.glb$/, `_LOD${i}.glb`) : salida;
    fs.writeFileSync(archivo, Buffer.from(glb));
    datos.push({ archivo: path.basename(archivo), bytes: glb.byteLength, ...medir(r.objeto) });
    console.log(`✓ ${archivo}  (${info(r.objeto, r.animaciones, glb.byteLength)})`);
  }
  if (juego.lods) {
    const leer = path.join(path.dirname(salida), 'LEEME_' + path.basename(salida, '.glb') + '.txt');
    fs.writeFileSync(leer, leeme(path.basename(salida, '.glb'), datos, { ...juego, animaciones: anims0 }));
    console.log(`✓ ${leer}`);
  }
}

if (opciones.lista || (!sueltos.length && !opciones.todos)) {
  for (const g of generadores) {
    console.log(`\n${g.icono}  ${g.id} — ${g.nombre}${g.soloNavegador ? '  (solo en la app web)' : ''}\n   ${g.descripcion}`);
    if (g.presets) console.log(`   presets: ${Object.keys(g.presets).join(', ')}`);
    for (const d of g.parametros) {
      const extra = d.tipo === 'rango' ? `${d.min}…${d.max}` : d.tipo === 'opcion' ? d.opciones.map((o) => o[0]).join(' | ') : d.tipo === 'si' ? 'true | false' : 'color #rrggbb';
      console.log(`   --${d.id.padEnd(16)} ${d.nombre} (${extra}; por defecto ${d.def})`);
    }
    console.log('   --semilla N  --facetado true');
  }
  console.log('\nUso: node herramientas/generar.mjs <generador> [--preset nombre] [--parametro valor ...] [--salida archivo.glb]');
  console.log('Para juegos: --plataforma movil|pc|original  --motor godot|unity|unreal|web  --lods (añade _LOD1, _LOD2 y una guía)');
  process.exit(0);
}

if (opciones.todos) {
  const dir = typeof opciones.todos === 'string' ? opciones.todos : 'modelos';
  for (const g of generadores.filter((x) => !x.soloNavegador)) for (const pr of Object.keys(g.presets || { base: {} })) await generar(g, pr, {}, path.join(dir, g.id, `${pr}.glb`));
  process.exit(0);
}

const gen = porId(sueltos[0]);
if (!gen) { console.error(`No existe el generador «${sueltos[0]}». Usa --lista para verlos.`); process.exit(1); }
const preset = opciones.preset ?? null;
if (preset && !gen.presets?.[preset]) { console.error(`El generador ${gen.id} no tiene el preset «${preset}». Presets: ${Object.keys(gen.presets || {}).join(', ')}`); process.exit(1); }
const base = resolverParametros(gen, preset, {});
const cambios = {};
for (const [k, v] of Object.entries(opciones)) {
  if (['preset', 'salida', 'plataforma', 'motor', 'lods'].includes(k)) continue;
  if (!(k in base)) { console.error(`Parámetro desconocido: --${k}. Usa --lista para ver los parámetros.`); process.exit(1); }
  cambios[k] = valor(v, base[k]);
}
await generar(gen, preset, cambios, opciones.salida || path.join('modelos', `${preset || gen.id}.glb`));
