// Pone esqueleto y animaciones a un modelo GLB que ya tengas (por ejemplo uno realista creado por IA
// a partir de una foto, o un escaneo). Usa el esqueleto y las animaciones de los otros generadores.
import * as THREE from 'three';
import { extraerPiezas, adivinarFrente, normalizar, medirCuadrupedo, medirHumanoide, enlazar } from '../core/autorig.js';
import { resolverParametros } from '../core/exportar.js';
import cuadrupedo from './cuadrupedo.js';
import humanoide from './humanoide.js';
import ave from './ave.js';

const mallas = new Map();
/** La app registra aquí la escena de un GLB cargado */
export function registrarMalla(clave, escena, nombre) { mallas.set(clave, { escena, nombre }); }
export function nombreMalla(clave) { return mallas.get(clave)?.nombre || (clave === 'ejemplo' ? 'Toro de ejemplo' : '—'); }

export default {
  id: 'esqueleto',
  nombre: 'Esqueleto para tu GLB',
  icono: '🦴',
  categoria: 'Imagen',
  soloNavegador: true,
  descripcion: 'Carga un modelo GLB realista (creado por IA a partir de una foto, escaneado o descargado) y el estudio le pone esqueleto y animaciones de animal, persona o ave.',
  presets: { animal: { tipo: 'cuadrupedo' }, persona: { tipo: 'humanoide', altura: 1.75 }, ave: { tipo: 'ave', altura: 0.5 } },
  parametros: [
    { id: 'malla', nombre: 'Modelo', tipo: 'malla', def: 'ejemplo' },
    { id: 'tipo', nombre: 'Esqueleto', tipo: 'opcion', opciones: [['cuadrupedo', 'Animal de 4 patas'], ['humanoide', 'Persona'], ['ave', 'Ave']], def: 'cuadrupedo' },
    { id: 'mira', nombre: 'Hacia dónde mira', tipo: 'opcion', opciones: [['auto', 'Detectar'], ['+z', 'Hacia mí (+Z)'], ['-z', 'De espaldas (−Z)'], ['+x', 'A la derecha (+X)'], ['-x', 'A la izquierda (−X)']], def: 'auto' },
    { id: 'altura', nombre: 'Altura real (m)', tipo: 'rango', min: 0.1, max: 4, paso: 0.01, def: 1.5 },
    { id: 'brazos', nombre: 'Brazos (persona)', tipo: 'opcion', opciones: [['auto', 'Detectar'], ['abajo', 'Caídos'], ['cruz', 'En cruz (pose T o A)']], def: 'auto' },
    { id: 'ajusteCadera', nombre: 'Ajuste de cadera / patas', tipo: 'rango', min: -0.3, max: 0.3, paso: 0.005, def: 0 },
    { id: 'ajusteCabeza', nombre: 'Ajuste de cabeza (adelante)', tipo: 'rango', min: -0.4, max: 0.4, paso: 0.005, def: 0 },
    { id: 'complexion', nombre: 'Anchura de hombros (persona)', tipo: 'rango', min: 0, max: 1, paso: 0.01, def: 0.5 },
    { id: 'cola', nombre: 'Cola (animal)', tipo: 'opcion', opciones: [['borla', 'Colgando'], ['larga', 'Hacia arriba'], ['corta', 'Corta'], ['crin', 'De caballo']], def: 'borla' },
    { id: 'sentarse', nombre: 'Incluir «Sentado» (perros, gatos)', tipo: 'si', def: false },
    { id: 'suavizado', nombre: 'Suavizado de la piel', tipo: 'rango', min: 0, max: 6, paso: 1, def: 2 },
  ],

  construir(p, azar) {
    if (typeof document === 'undefined') throw new Error('«esqueleto» funciona solo en la app web.');
    const entrada = mallas.get(p.malla);
    let piezas;
    if (entrada) piezas = extraerPiezas(entrada.escena);
    else { // ejemplo: la malla de un toro, sin esqueleto
      const t = cuadrupedo.construir(resolverParametros(cuadrupedo, 'toro', { patron: 'liso' }), azar).objeto;
      t.updateMatrixWorld(true);
      piezas = extraerPiezas(t);
    }
    const mira = p.mira === 'auto' ? (entrada ? adivinarFrente(piezas, p.tipo) : '+z') : p.mira;
    normalizar(piezas, { mira, altura: p.altura });

    let plantilla, animaciones, pose = null;
    if (p.tipo === 'cuadrupedo') {
      const { desplazarZ, params } = medirCuadrupedo(piezas);
      for (const pz of piezas) pz.geo.translate(0, 0, desplazarZ);
      params.altoPatas = Math.max(0.05, params.altoPatas + p.ajusteCadera);
      params.largoCuello = Math.max(0.02, params.largoCuello + p.ajusteCabeza);
      const r = cuadrupedo.construir(resolverParametros(cuadrupedo, 'vaca', { ...params, cola: p.cola, pie: p.sentarse ? 'zarpa' : 'pezuna', cuernos: 'ninguno', ubre: false }), azar);
      plantilla = r.objeto; animaciones = r.animaciones;
    } else if (p.tipo === 'humanoide') {
      const med = medirHumanoide(piezas);
      const yCad = med.entrepierna + 0.03 * med.H + p.ajusteCadera;
      const proporcion = Math.min(1, Math.max(0, (0.5 - yCad / med.H) / 0.17));
      const r = humanoide.construir(resolverParametros(humanoide, null, { altura: med.H, proporcion, complexion: p.complexion }), azar);
      plantilla = r.objeto; animaciones = r.animaciones;
      if (med.piernaX) for (const [S, sg] of [['L', 1], ['R', -1]]) { const u = plantilla.getObjectByName(`UpperLeg_${S}`); if (u) u.position.x = sg * Math.min(med.piernaX, med.H * 0.12); }
      const cruz = p.brazos === 'cruz' || (p.brazos === 'auto' && med.brazosAbiertos);
      if (cruz) {
        pose = {};
        plantilla.updateMatrixWorld(true);
        for (const S of ['L', 'R']) {
          const hom = plantilla.getObjectByName(`UpperArm_${S}`), mano = plantilla.getObjectByName(`Hand_${S}`);
          const a = hom.getWorldPosition(new THREE.Vector3()), b = mano.getWorldPosition(new THREE.Vector3());
          const m = med.manos[S]; if (!m) continue;
          pose[`UpperArm_${S}`] = new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(), new THREE.Vector3(...m).sub(a).normalize());
        }
      }
    } else {
      const base = ave.construir(resolverParametros(ave, 'gallina', {}), azar).objeto;
      const h1 = new THREE.Box3().setFromObject(base).getSize(new THREE.Vector3()).y;
      const r = ave.construir(resolverParametros(ave, 'gallina', { tamano: p.altura / h1 }), azar);
      plantilla = r.objeto; animaciones = r.animaciones;
    }
    if (p.ajusteCabeza && p.tipo !== 'cuadrupedo') {
      const cab = plantilla.getObjectByName('Head'); if (cab) cab.position.z += p.ajusteCabeza;
    }
    const objeto = enlazar(plantilla, piezas, { pose, suavizado: p.suavizado });
    objeto.name = (entrada?.nombre || 'Modelo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_') || 'Modelo';
    return { objeto, animaciones };
  },
};
