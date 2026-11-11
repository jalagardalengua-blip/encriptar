// Creación de animaciones por código.
//
//   clip('Caminar', 1.0, objeto, (f, pose) => {
//     const s = onda(f);                  // f va de 0 a 1 durante el ciclo
//     pose.rot('UpperLeg_L', -0.5 * s, 0, 0);   // giro respecto al reposo (radianes)
//     pose.mov('Hips', 0, 0.02 * s, 0);         // desplazamiento respecto al reposo (m)
//   });
//
// Funciona igual con huesos (personajes) que con nodos con nombre (ruedas, puertas...).
import * as THREE from 'three';

export const TAU = Math.PI * 2;
/** Seno de un ciclo: onda(f, veces, desfase) — desfase en fracciones de ciclo */
export const onda = (f, veces = 1, desfase = 0) => Math.sin(TAU * (f * veces + desfase));
export const onda01 = (f, veces = 1, desfase = 0) => 0.5 - 0.5 * Math.cos(TAU * (f * veces + desfase));
export const suave = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const mezclar = (a, b, t) => a + (b - a) * t;
/** Curva de 0 → 1 → 0 entre las fracciones a, b (subida) y c, d (bajada) */
export const tramo = (f, a, b, c, d) => (f < a || f > d ? 0 : f < b ? suave((f - a) / (b - a)) : f <= c ? 1 : 1 - suave((f - c) / (d - c)));

const _e = new THREE.Euler(), _q = new THREE.Quaternion();

/**
 * Crea un AnimationClip muestreando fn a fps fotogramas por segundo.
 * objeto: el modelo (se buscan huesos o nodos por nombre dentro de él).
 */
export function clip(nombre, duracion, objeto, fn, { fps = 30 } = {}) {
  const frames = Math.max(2, Math.round(duracion * fps));
  const nodos = new Map();
  objeto.traverse((o) => { if (o.name) nodos.set(o.name, o); });
  const datos = [];
  const tocadosR = new Set(), tocadosP = new Set(), tocadosS = new Set();
  for (let i = 0; i <= frames; i++) {
    const f = i / frames;
    const r = new Map(), p = new Map(), s = new Map();
    const pose = {
      rot(n, x = 0, y = 0, z = 0) { const o = r.get(n) || [0, 0, 0]; r.set(n, [o[0] + x, o[1] + y, o[2] + z]); tocadosR.add(n); },
      mov(n, x = 0, y = 0, z = 0) { const o = p.get(n) || [0, 0, 0]; p.set(n, [o[0] + x, o[1] + y, o[2] + z]); tocadosP.add(n); },
      esc(n, x = 1, y = x, z = x) { s.set(n, [x, y, z]); tocadosS.add(n); },
    };
    fn(f, pose, f * duracion);
    datos.push({ r, p, s });
  }
  const tiempos = datos.map((_, i) => (i / frames) * duracion);
  const pistas = [];
  for (const n of tocadosR) {
    const o = nodos.get(n); if (!o) throw new Error(`Animación «${nombre}»: no existe «${n}»`);
    const vals = []; const prev = new THREE.Quaternion();
    datos.forEach((d, i) => {
      const e = d.r.get(n) || [0, 0, 0];
      _q.setFromEuler(_e.set(e[0], e[1], e[2], 'XYZ')).premultiply(o.quaternion);
      if (i > 0 && prev.dot(_q) < 0) _q.set(-_q.x, -_q.y, -_q.z, -_q.w);
      prev.copy(_q); vals.push(_q.x, _q.y, _q.z, _q.w);
    });
    pistas.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, tiempos, vals));
  }
  for (const n of tocadosP) {
    const o = nodos.get(n); if (!o) throw new Error(`Animación «${nombre}»: no existe «${n}»`);
    const vals = [];
    datos.forEach((d) => { const v = d.p.get(n) || [0, 0, 0]; vals.push(o.position.x + v[0], o.position.y + v[1], o.position.z + v[2]); });
    pistas.push(new THREE.VectorKeyframeTrack(`${n}.position`, tiempos, vals));
  }
  for (const n of tocadosS) {
    const o = nodos.get(n); if (!o) throw new Error(`Animación «${nombre}»: no existe «${n}»`);
    const vals = [];
    datos.forEach((d) => { const v = d.s.get(n) || [1, 1, 1]; vals.push(o.scale.x * v[0], o.scale.y * v[1], o.scale.z * v[2]); });
    pistas.push(new THREE.VectorKeyframeTrack(`${n}.scale`, tiempos, vals));
  }
  const c = new THREE.AnimationClip(nombre, duracion, pistas);
  return c;
}
