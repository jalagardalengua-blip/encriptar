// Aves de corral: gallinas, gallos, pollitos, patos, ocas...
import * as THREE from 'three';
import { Modelo } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo } from '../core/animacion.js';

const V = (...a) => new THREE.Vector3(...a);

export default {
  id: 'ave',
  nombre: 'Ave de corral',
  icono: '🐔',
  categoria: 'Animales',
  descripcion: 'Aves con esqueleto de 13 huesos y animaciones de reposo, caminar, correr, picotear, aletear y echarse.',
  presets: {
    gallina: {},
    gallo: { tamano: 1.15, cola: 'gallo', cresta: 1.6, barbillas: true, colorPlumas: '#b5441f', colorAlas: '#3c2a1c', colorCola: '#18302a', colorCuello: '#e3a23b', patas: 1.15 },
    pollito: { tamano: 0.35, cuerpo: 1.05, cabeza: 1.6, cuello: 0.4, cola: 'corta', cresta: 0, barbillas: false, colorPlumas: '#f6d34a', colorAlas: '#f0c53a', colorCola: '#f0c53a', colorCuello: '#f6d34a', colorPico: '#f08a24', colorPatas: '#f08a24' },
    pato: { tamano: 1.05, pico: 'plano', cuerpo: 1.05, cuello: 1.1, postura: 0.05, patas: 0.7, cola: 'corta', cresta: 0, barbillas: false, colorPlumas: '#f4f2ee', colorAlas: '#e7e3dc', colorCola: '#f4f2ee', colorCuello: '#f4f2ee', colorPico: '#f2a12e', colorPatas: '#f2a12e' },
    pato_real: { tamano: 1.0, pico: 'plano', cuerpo: 1.0, cuello: 1.1, postura: 0.05, patas: 0.65, cola: 'corta', cresta: 0, barbillas: false, colorPlumas: '#8a7a68', colorAlas: '#5f5245', colorCola: '#2e2a26', colorCuello: '#1f5b3a', colorPico: '#d9c23a', colorPatas: '#f08a24' },
    oca: { tamano: 1.5, pico: 'plano', cuerpo: 1.1, cuello: 2.0, postura: 0.15, patas: 0.85, cola: 'corta', cresta: 0, barbillas: false, colorPlumas: '#f6f4f0', colorAlas: '#e3dfd8', colorCola: '#f6f4f0', colorCuello: '#f6f4f0', colorPico: '#f08a24', colorPatas: '#f08a24' },
  },
  parametros: [
    { id: 'tamano', nombre: 'Escala general', tipo: 'rango', min: 0.2, max: 3, paso: 0.01, def: 1 },
    { id: 'cuerpo', nombre: 'Volumen del cuerpo', tipo: 'rango', min: 0.6, max: 1.5, paso: 0.01, def: 1 },
    { id: 'cabeza', nombre: 'Tamaño de la cabeza', tipo: 'rango', min: 0.6, max: 2, paso: 0.01, def: 1 },
    { id: 'cuello', nombre: 'Largo del cuello', tipo: 'rango', min: 0.3, max: 2.5, paso: 0.01, def: 1 },
    { id: 'patas', nombre: 'Largo de las patas', tipo: 'rango', min: 0.4, max: 2, paso: 0.01, def: 1 },
    { id: 'postura', nombre: 'Inclinación del cuerpo', tipo: 'rango', min: -0.3, max: 0.6, paso: 0.01, def: 0.25 },
    { id: 'pico', nombre: 'Pico', tipo: 'opcion', opciones: [['corto', 'Corto (gallina)'], ['plano', 'Plano (pato)']], def: 'corto' },
    { id: 'cola', nombre: 'Cola', tipo: 'opcion', opciones: [['abanico', 'Abanico (gallina)'], ['gallo', 'Plumas largas (gallo)'], ['corta', 'Corta']], def: 'abanico' },
    { id: 'cresta', nombre: 'Tamaño de la cresta', tipo: 'rango', min: 0, max: 2.5, paso: 0.05, def: 0.8 },
    { id: 'barbillas', nombre: 'Barbillas rojas', tipo: 'si', def: true },
    { id: 'colorPlumas', nombre: 'Plumas', tipo: 'color', def: '#a8642f' },
    { id: 'colorCuello', nombre: 'Cuello', tipo: 'color', def: '#c27a3a' },
    { id: 'colorAlas', nombre: 'Alas', tipo: 'color', def: '#7d4522' },
    { id: 'colorCola', nombre: 'Cola', tipo: 'color', def: '#4a2a17' },
    { id: 'colorPico', nombre: 'Pico', tipo: 'color', def: '#e9b44c' },
    { id: 'colorPatas', nombre: 'Patas', tipo: 'color', def: '#e8b04a' },
    { id: 'colorCresta', nombre: 'Cresta', tipo: 'color', def: '#d62a1e' },
  ],

  construir(p, azar) {
    const k = 0.2 * p.tamano;               // radio base del cuerpo (gallina ≈ 0.2 m)
    const R = k * p.cuerpo, Rc = k * 0.36 * p.cabeza;
    const hp = k * 1.15 * p.patas;          // altura de la cadera sobre el suelo
    const m = new Modelo('Ave', {
      plumas: { color: p.colorPlumas, rugosidad: 0.95 },
      cuello: { color: p.colorCuello, rugosidad: 0.95 },
      alas: { color: p.colorAlas, rugosidad: 0.9 },
      cola: { color: p.colorCola, rugosidad: 0.75 },
      pico: { color: p.colorPico, rugosidad: 0.45 },
      patas: { color: p.colorPatas, rugosidad: 0.55 },
      cresta: { color: p.colorCresta, rugosidad: 0.5 },
      ojo: { color: '#121010', rugosidad: 0.1 },
    });
    const yc = hp + R * 0.7;
    const inc = p.postura;
    const cuelloBase = V(0, yc + R * 0.45, R * 0.75);
    const cabeza = cuelloBase.clone().add(V(0, R * 0.75 * p.cuello, R * 0.15 * p.cuello));
    m.hueso('Body', 'Root', [0, yc, 0]);
    m.hueso('Neck', 'Body', cuelloBase.toArray());
    m.hueso('Head', 'Neck', cabeza.toArray());
    m.hueso('Tail', 'Body', [0, yc + R * 0.3, -R * 0.95]);
    m.simetrico((S, x) => {
      m.hueso(`Wing_${S}`, 'Body', [x * R * 0.72, yc + R * 0.35, R * 0.35]);
      m.hueso(`Thigh_${S}`, 'Body', [x * R * 0.35, yc - R * 0.35, R * 0.05]);
      m.hueso(`Shin_${S}`, `Thigh_${S}`, [x * R * 0.38, hp * 0.62, -R * 0.08]);
      m.hueso(`Foot_${S}`, `Shin_${S}`, [x * R * 0.38, k * 0.04, 0]);
    });

    // Cuerpo
    m.parte(F.esfera(1, { p: [0, yc, 0], r: [-inc, 0, 0], s: [R * 0.85, R * 0.82, R * 1.12] }, 20), 'plumas', 'Body');
    m.parte(F.esfera(1, { p: [0, yc + R * 0.05, R * 0.45], r: [-inc, 0, 0], s: [R * 0.72, R * 0.78, R * 0.7] }, 16), 'plumas', 'Body');
    // Cuello y cabeza
    m.parte(F.barra(cuelloBase.clone().add(V(0, -R * 0.2, -R * 0.1)).toArray(), cabeza.toArray(), R * 0.42, Rc * 0.75, 12), 'cuello', 'Neck', { suave: R * 0.3 });
    m.parte(F.esfera(Rc, { p: cabeza.clone().add(V(0, Rc * 0.3, Rc * 0.1)).toArray(), s: [0.9, 1, 1.05] }, 14), 'cuello', 'Head');
    const cc = cabeza.clone().add(V(0, Rc * 0.3, Rc * 0.1));
    if (p.pico === 'plano') {
      m.parte(F.esfera(1, { p: cc.clone().add(V(0, -Rc * 0.25, Rc * 1.15)).toArray(), r: [0.15, 0, 0], s: [Rc * 0.42, Rc * 0.16, Rc * 0.8] }, 12), 'pico', 'Head');
    } else {
      m.parte(F.cono(Rc * 0.3, Rc * 0.8, { p: cc.clone().add(V(0, -Rc * 0.1, Rc * 1.15)).toArray(), r: [Math.PI / 2 + 0.25, 0, 0], s: [1, 1, 0.75] }, 8), 'pico', 'Head');
    }
    m.simetrico((S, x) => m.parte(F.esfera(Rc * 0.16, { p: cc.clone().add(V(x * Rc * 0.75, Rc * 0.15, Rc * 0.45)).toArray(), s: [0.5, 1, 1] }, 8), 'ojo', 'Head'));
    if (p.cresta > 0) {
      const n = 4, cr = Rc * 0.28 * p.cresta;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        m.parte(F.esfera(cr * (1 - 0.25 * Math.abs(t - 0.4)), { p: cc.clone().add(V(0, Rc * 0.85 + cr * 0.5 * Math.sin(Math.PI * t), Rc * (0.55 - t * 1.0))).toArray(), s: [0.45, 1, 0.8] }, 8), 'cresta', 'Head');
      }
    }
    if (p.barbillas) m.simetrico((S, x) => m.parte(F.esfera(1, { p: cc.clone().add(V(x * Rc * 0.14, -Rc * 0.7, Rc * 0.75)).toArray(), s: [Rc * 0.13, Rc * 0.3, Rc * 0.16] }, 8), 'cresta', 'Head'));
    // Alas
    m.simetrico((S, x) => {
      const b = V(...m.pos(`Wing_${S}`));
      m.parte(F.esfera(1, { p: b.clone().add(V(x * R * 0.1, -R * 0.2, -R * 0.45)).toArray(), r: [-inc - 0.2, 0, x * 0.12], s: [R * 0.2, R * 0.55, R * 0.85] }, 14), 'alas', `Wing_${S}`);
    });
    // Cola
    const tb = V(...m.pos('Tail'));
    if (p.cola === 'abanico') {
      for (let i = -2; i <= 2; i++) m.parte(F.esfera(1, { p: tb.clone().add(V(i * R * 0.13, R * 0.3, -R * 0.15)).toArray(), r: [-0.6, 0, i * 0.18], s: [R * 0.12, R * 0.55, R * 0.25] }, 10), 'cola', 'Tail');
    } else if (p.cola === 'gallo') {
      for (let i = -2; i <= 2; i++) {
        const pts = []; const L = R * (1.5 + 0.25 * (2 - Math.abs(i)));
        for (let j = 0; j <= 6; j++) { const t = j / 6, th = t * 2.6; pts.push(tb.clone().add(V(i * R * 0.1, L * 0.55 * Math.sin(th), -L * 0.45 * (1 - Math.cos(th)) - R * 0.1))); }
        for (let j = 0; j < 6; j++) m.parte(F.barra(pts[j].toArray(), pts[j + 1].toArray(), R * 0.08 * (1 - j / 8), R * 0.08 * (1 - (j + 1) / 8), 6), 'cola', 'Tail');
      }
    } else {
      m.parte(F.cono(R * 0.35, R * 0.6, { p: tb.clone().add(V(0, R * 0.12, -R * 0.15)).toArray(), r: [-2.1, 0, 0], s: [1, 1, 0.45] }, 10), 'cola', 'Tail');
    }
    // Patas
    m.simetrico((S, x) => {
      const t = V(...m.pos(`Thigh_${S}`)), s = V(...m.pos(`Shin_${S}`)), f = V(...m.pos(`Foot_${S}`));
      m.parte(F.esfera(1, { p: t.clone().lerp(s, 0.4).toArray(), s: [R * 0.24, R * 0.4, R * 0.3] }, 10), 'plumas', `Thigh_${S}`);
      m.parte(F.barra(s.toArray(), f.toArray(), k * 0.045, k * 0.04, 6), 'patas', `Shin_${S}`);
      if (p.pico === 'plano') {
        m.parte(F.esfera(1, { p: [f.x, k * 0.02, f.z + k * 0.2], s: [k * 0.2, k * 0.025, k * 0.24] }, 10), 'patas', `Foot_${S}`);
      } else {
        for (const ang of [-0.45, 0, 0.45]) m.parte(F.tubo([f.x, k * 0.03, f.z], [f.x + Math.sin(ang) * k * 0.32, k * 0.02, f.z + Math.cos(ang) * k * 0.32], k * 0.025, 5), 'patas', `Foot_${S}`);
        m.parte(F.tubo([f.x, k * 0.03, f.z], [f.x, k * 0.03, f.z - k * 0.16], k * 0.022, 5), 'patas', `Foot_${S}`);
      }
    });

    const objeto = m.construir({ facetado: p.facetado });
    const piernas = (P, f, A, K) => m.simetrico((S, x) => {
      const u = f + (S === 'L' ? 0 : 0.5), a = Math.sin(Math.PI * 2 * u), alza = Math.max(0, Math.cos(Math.PI * 2 * u));
      P.rot(`Thigh_${S}`, -A * a - 0.2 * K * alza); P.rot(`Shin_${S}`, 0.9 * K * alza); P.rot(`Foot_${S}`, -0.5 * K * alza + 0.3 * A * a);
    });
    const animaciones = [
      clip('Reposo', 3, objeto, (f, P) => {
        const giro = f < 0.3 ? 0 : f < 0.55 ? 0.6 : f < 0.8 ? -0.5 : 0;
        P.rot('Head', 0, giro, giro * 0.2); P.rot('Neck', 0.04 * onda(f, 2));
        P.mov('Body', 0, -k * 0.01 * onda(f, 2)); P.rot('Tail', 0, 0, 0.12 * tramo(f, 0.6, 0.63, 0.66, 0.7));
      }),
      clip('Caminar', 0.8, objeto, (f, P) => {
        piernas(P, f, 0.45, 1);
        P.mov('Neck', 0, 0, R * 0.18 * onda(f, 2, 0.15)); P.rot('Body', 0, 0, 0.05 * onda(f)); P.rot('Body', 0, 0.06 * onda(f));
        P.mov('Body', 0, -k * 0.03 * Math.abs(onda(f)));
        P.rot('Tail', 0, 0, 0.08 * onda(f));
      }),
      clip('Correr', 0.42, objeto, (f, P) => {
        piernas(P, f, 0.75, 1.4);
        P.rot('Body', 0.3); P.rot('Neck', -0.4); P.mov('Body', 0, k * 0.06 * Math.abs(onda(f)) - k * 0.03);
        m.simetrico((S, x) => P.rot(`Wing_${S}`, 0, 0, x * (0.5 + 0.3 * onda(f, 2))));
      }),
      clip('Picotear', 1.6, objeto, (f, P) => {
        const b = tramo(f, 0.05, 0.25, 0.75, 0.95), pk = Math.max(0, onda(f, 3)) ** 3 * b;
        P.rot('Body', 0.45 * b); P.rot('Neck', 0.9 * b + 0.5 * pk); P.rot('Head', 0.3 * b + 0.3 * pk);
        P.rot('Tail', -0.2 * b);
        m.simetrico((S) => { P.rot(`Thigh_${S}`, -0.45 * b); P.rot(`Foot_${S}`, 0); });
      }),
      clip('Aletear', 0.9, objeto, (f, P) => {
        const sube = tramo(f, 0, 0.1, 0.9, 1), salto = Math.max(0, onda(f)) * sube;
        m.simetrico((S, x) => { P.rot(`Wing_${S}`, -0.3 * sube, 0, x * (1.2 + 0.7 * onda(f, 4)) * sube); P.rot(`Thigh_${S}`, -0.4 * salto); P.rot(`Shin_${S}`, 0.8 * salto); });
        P.mov('Root', 0, k * 0.5 * salto); P.rot('Body', -0.25 * sube); P.rot('Neck', -0.3 * sube); P.rot('Tail', 0.3 * sube);
      }),
      clip('Echada', 3, objeto, (f, P) => {
        P.mov('Body', 0, -(hp * 0.92 - R * 0.0) + k * 0.01 * onda(f));
        m.simetrico((S) => { P.rot(`Thigh_${S}`, -1.3); P.rot(`Shin_${S}`, 2.2); P.rot(`Foot_${S}`, -0.9); });
        P.rot('Neck', 0.25 + 0.03 * onda(f)); P.rot('Head', -0.2, 0.4 * tramo(f, 0.4, 0.5, 0.7, 0.8));
      }),
    ];
    return { objeto, animaciones };
  },
};
