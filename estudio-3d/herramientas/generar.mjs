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

const { generadores, porId } = await import('../src/generadores/index.js');
const { resolverParametros, construir, exportarGLB } = await import('../src/core/exportar.js');

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

async function generar(gen, preset, cambios, salida) {
  const p = resolverParametros(gen, preset, cambios);
  const { objeto, animaciones } = construir(gen, p);
  objeto.updateMatrixWorld(true);
  const glb = await exportarGLB(objeto, animaciones);
  fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
  fs.writeFileSync(salida, Buffer.from(glb));
  console.log(`✓ ${salida}  (${info(objeto, animaciones, glb.byteLength)})`);
}

if (opciones.lista || (!sueltos.length && !opciones.todos)) {
  for (const g of generadores) {
    console.log(`\n${g.icono}  ${g.id} — ${g.nombre}\n   ${g.descripcion}`);
    if (g.presets) console.log(`   presets: ${Object.keys(g.presets).join(', ')}`);
    for (const d of g.parametros) {
      const extra = d.tipo === 'rango' ? `${d.min}…${d.max}` : d.tipo === 'opcion' ? d.opciones.map((o) => o[0]).join(' | ') : d.tipo === 'si' ? 'true | false' : 'color #rrggbb';
      console.log(`   --${d.id.padEnd(16)} ${d.nombre} (${extra}; por defecto ${d.def})`);
    }
    console.log('   --semilla N  --facetado true');
  }
  console.log('\nUso: node herramientas/generar.mjs <generador> [--preset nombre] [--parametro valor ...] [--salida archivo.glb]');
  process.exit(0);
}

if (opciones.todos) {
  const dir = typeof opciones.todos === 'string' ? opciones.todos : 'modelos';
  for (const g of generadores) for (const pr of Object.keys(g.presets || { base: {} })) await generar(g, pr, {}, path.join(dir, g.id, `${pr}.glb`));
  process.exit(0);
}

const gen = porId(sueltos[0]);
if (!gen) { console.error(`No existe el generador «${sueltos[0]}». Usa --lista para verlos.`); process.exit(1); }
const preset = opciones.preset ?? null;
if (preset && !gen.presets?.[preset]) { console.error(`El generador ${gen.id} no tiene el preset «${preset}». Presets: ${Object.keys(gen.presets || {}).join(', ')}`); process.exit(1); }
const base = resolverParametros(gen, preset, {});
const cambios = {};
for (const [k, v] of Object.entries(opciones)) {
  if (['preset', 'salida'].includes(k)) continue;
  if (!(k in base)) { console.error(`Parámetro desconocido: --${k}. Usa --lista para ver los parámetros.`); process.exit(1); }
  cambios[k] = valor(v, base[k]);
}
await generar(gen, preset, cambios, opciones.salida || path.join('modelos', `${preset || gen.id}.glb`));
