// Construcción y exportación a GLB, compartida por la app web y la terminal.
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { crearAzar } from './azar.js';

/** Parámetros finales: valores por defecto + preset + cambios del usuario */
export function resolverParametros(gen, preset, cambios = {}) {
  const p = { semilla: 1, facetado: false };
  for (const d of gen.parametros) p[d.id] = d.def;
  if (preset && gen.presets?.[preset]) Object.assign(p, gen.presets[preset]);
  Object.assign(p, cambios);
  return p;
}

/** Construye el modelo y lo devuelve con sus animaciones */
export function construir(gen, params) {
  const azar = crearAzar(params.semilla ?? 1);
  const r = gen.construir(params, azar);
  delete r.objeto.userData.centros;
  r.objeto.userData.generador = gen.id;
  r.objeto.userData.parametros = { ...params };
  return r;
}

/** Exporta a GLB binario (ArrayBuffer) incluyendo esqueleto y animaciones */
export function exportarGLB(objeto, animaciones = []) {
  const exp = new GLTFExporter();
  return new Promise((ok, mal) => exp.parse(objeto, ok, mal, { binary: true, animations: animaciones, onlyVisible: true }));
}
