// Personas: granjeros, aldeanos, personajes jugables...
import { Modelo } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, onda01, tramo, suave } from '../core/animacion.js';

const lerp = (a, b, t) => a + (b - a) * t;

export default {
  id: 'humanoide',
  nombre: 'Persona',
  icono: '🧑‍🌾',
  categoria: 'Personajes',
  descripcion: 'Personaje con esqueleto de 18 huesos y 7 animaciones (reposo, caminar, correr, saltar, saludar, recoger, sentarse).',
  presets: {
    granjero: { altura: 1.78, complexion: 0.6, sombrero: 'paja', peto: true, barba: true, pelo: 'corto', colorCamisa: '#c0392b', colorPantalon: '#3b5b8a', colorPelo: '#5a3a22' },
    granjera: { altura: 1.66, complexion: 0.35, sombrero: 'ninguno', peto: true, pelo: 'largo', colorPelo: '#8b5a2b', colorCamisa: '#f2e3c6', colorPantalon: '#4a6fa5', colorPiel: '#e8b896' },
    vaquero: { altura: 1.82, complexion: 0.55, sombrero: 'vaquero', peto: false, barba: true, colorCamisa: '#7a4a2a', colorPantalon: '#2f3e57', colorZapatos: '#4a2c17' },
    aldeano: { altura: 1.72, complexion: 0.7, sombrero: 'gorra', peto: false, colorCamisa: '#4e7d3a', colorPantalon: '#6b5440', colorGorra: '#2d6a9f' },
    nino: { altura: 1.25, proporcion: 0.55, complexion: 0.4, sombrero: 'gorra', colorCamisa: '#f1c40f', colorPantalon: '#2e86c1', colorGorra: '#e74c3c' },
    caricatura: { altura: 1.5, proporcion: 1, complexion: 0.5, sombrero: 'ninguno', pelo: 'corto', colorCamisa: '#8e44ad' },
  },
  parametros: [
    { id: 'altura', nombre: 'Altura (m)', tipo: 'rango', min: 0.9, max: 2.2, paso: 0.01, def: 1.75 },
    { id: 'proporcion', nombre: 'Estilo (realista → cabezón)', tipo: 'rango', min: 0, max: 1, paso: 0.01, def: 0.2 },
    { id: 'complexion', nombre: 'Complexión', tipo: 'rango', min: 0, max: 1, paso: 0.01, def: 0.5 },
    { id: 'pelo', nombre: 'Pelo', tipo: 'opcion', opciones: [['corto', 'Corto'], ['largo', 'Largo'], ['calvo', 'Sin pelo']], def: 'corto' },
    { id: 'barba', nombre: 'Barba', tipo: 'si', def: false },
    { id: 'sombrero', nombre: 'Sombrero', tipo: 'opcion', opciones: [['ninguno', 'Ninguno'], ['gorra', 'Gorra'], ['paja', 'Sombrero de paja'], ['vaquero', 'Sombrero vaquero']], def: 'ninguno' },
    { id: 'peto', nombre: 'Peto de trabajo', tipo: 'si', def: false },
    { id: 'mangaCorta', nombre: 'Manga corta', tipo: 'si', def: false },
    { id: 'colorPiel', nombre: 'Piel', tipo: 'color', def: '#d9a07a' },
    { id: 'colorPelo', nombre: 'Pelo', tipo: 'color', def: '#3b2716' },
    { id: 'colorCamisa', nombre: 'Camisa', tipo: 'color', def: '#3d7ab8' },
    { id: 'colorPantalon', nombre: 'Pantalón / peto', tipo: 'color', def: '#3f4a5c' },
    { id: 'colorZapatos', nombre: 'Calzado', tipo: 'color', def: '#3a2a1e' },
    { id: 'colorGorra', nombre: 'Gorra', tipo: 'color', def: '#c0392b' },
  ],

  construir(p, azar) {
    const H = p.altura, s = H / 1.75, cmp = p.complexion, pr = p.proporcion;
    const m = new Modelo('Persona', {
      piel: { color: p.colorPiel, rugosidad: 0.65 },
      pelo: { color: p.colorPelo, rugosidad: 0.9 },
      camisa: { color: p.colorCamisa, rugosidad: 0.85 },
      pantalon: { color: p.colorPantalon, rugosidad: 0.9 },
      zapatos: { color: p.colorZapatos, rugosidad: 0.6 },
      cinturon: { color: '#2b1d12', rugosidad: 0.5 },
      hebilla: { color: '#c9b37e', rugosidad: 0.3, metal: 1 },
      ojoBlanco: { color: '#f4f1ea', rugosidad: 0.3 },
      ojo: { color: '#1c1a19', rugosidad: 0.15 },
      boca: { color: '#7a3b33', rugosidad: 0.6 },
      gorra: { color: p.colorGorra, rugosidad: 0.85 },
      paja: { color: '#d8b56a', rugosidad: 0.95 },
      cinta: { color: '#7a2a1d', rugosidad: 0.8 },
      fieltro: { color: '#6b4a2d', rugosidad: 0.9 },
    });

    // Proporciones
    const rCab = H * lerp(0.064, 0.14, pr);
    const yTobillo = 0.075 * s;
    const yCadera = H * lerp(0.50, 0.33, pr);
    const largoCuello = H * lerp(0.045, 0.02, pr);
    const yCuello = H - 2.05 * rCab - largoCuello;
    const largoTorso = yCuello - yCadera;
    const yRodilla = lerp(yTobillo, yCadera, 0.5);
    const anchoHombro = (0.17 + 0.05 * cmp) * s * lerp(1, 0.85, pr);
    const anchoCadera = (0.085 + 0.03 * cmp) * s;
    const grosor = (0.75 + 0.5 * cmp);
    const yHombro = yCuello - 0.04 * s;
    const largoBrazo = largoTorso * lerp(1.0, 0.95, pr) + 0.04 * s;
    const yCodo = yHombro - largoBrazo * 0.52;
    const yMuneca = yHombro - largoBrazo;
    const yCabeza = yCuello + largoCuello;
    const cCab = yCabeza + rCab * 1.02;
    const rPierna = (0.055 + 0.02 * cmp) * s;
    const rBrazo = (0.04 + 0.015 * cmp) * s;

    // Esqueleto
    m.hueso('Hips', 'Root', [0, yCadera, 0]);
    m.hueso('Spine', 'Hips', [0, yCadera + largoTorso * 0.25, 0]);
    m.hueso('Chest', 'Spine', [0, yCadera + largoTorso * 0.55, 0]);
    m.hueso('Neck', 'Chest', [0, yCuello, 0]);
    m.hueso('Head', 'Neck', [0, yCabeza, 0]);
    m.simetrico((L, x) => {
      m.hueso(`UpperArm_${L}`, 'Chest', [x * anchoHombro, yHombro, 0]);
      m.hueso(`LowerArm_${L}`, `UpperArm_${L}`, [x * (anchoHombro + 0.03 * s), yCodo, 0]);
      m.hueso(`Hand_${L}`, `LowerArm_${L}`, [x * (anchoHombro + 0.05 * s), yMuneca, 0.01 * s]);
      m.hueso(`UpperLeg_${L}`, 'Hips', [x * anchoCadera, yCadera - 0.04 * s, 0]);
      m.hueso(`LowerLeg_${L}`, `UpperLeg_${L}`, [x * anchoCadera, yRodilla, 0.01 * s]);
      m.hueso(`Foot_${L}`, `LowerLeg_${L}`, [x * anchoCadera, yTobillo, 0]);
    });

    // Tronco
    const tronco = p.peto ? 'pantalon' : 'camisa';
    const anchoT = anchoHombro * 0.95 + 0.02 * s;
    m.parte(F.esfera(1, { p: [0, yCadera + 0.02 * s, 0], s: [anchoCadera + rPierna + 0.02 * s, 0.13 * s, 0.11 * s * grosor] }, 14), 'pantalon', 'Hips');
    m.parte(F.cilindro(anchoT * 0.82, anchoCadera + rPierna + 0.01 * s, largoTorso * 0.42, { p: [0, yCadera + largoTorso * 0.22, 0], s: [1, 1, 0.62 * grosor] }, 14), tronco, 'Spine', { suave: 0.06 * s });
    const cyP = yCadera + largoTorso * 0.68, ryP = largoTorso * 0.4, rzP = 0.118 * s * grosor;
    m.parte(F.esfera(1, { p: [0, cyP, 0], s: [anchoT, ryP, rzP] }, 16), 'camisa', 'Chest', { suave: 0.08 * s });
    if (p.peto) {
      // Peto: una pieza fina que se adapta a la curva del pecho
      const frente = (x, y) => rzP * Math.sqrt(Math.max(0.2, 1 - (x / anchoT) ** 2 - ((y - cyP) / ryP) ** 2));
      const yb0 = yCadera + largoTorso * 0.4, yb1 = yCadera + largoTorso * 0.8;
      m.parte(F.deformar(F.caja(anchoT * 1.0, yb1 - yb0, 1, { p: [0, (yb0 + yb1) / 2, 0] }, 10), (v) => {
        v.x *= 1 - 0.18 * (v.y - yb0) / (yb1 - yb0);
        v.z = frente(v.x, v.y) + (v.z > 0 ? 0.012 * s : -0.004 * s);
      }), 'pantalon', 'Chest');
      m.simetrico((L, x) => {
        const bx = x * anchoT * 0.36, by = yb1 - 0.03 * s;
        m.parte(F.barra([bx, by, frente(bx, by)], [x * anchoT * 0.52, yHombro + 0.035 * s, 0.01 * s], 0.017 * s, 0.017 * s, 5), 'pantalon', 'Chest');
        m.parte(F.barra([x * anchoT * 0.52, yHombro + 0.035 * s, 0.01 * s], [x * anchoT * 0.3, yCadera + largoTorso * 0.5, -rzP * 0.95], 0.017 * s, 0.017 * s, 5), 'pantalon', 'Chest');
        m.parte(F.esfera(0.016 * s, { p: [bx, by, frente(bx, by) + 0.012 * s], s: [1, 1, 0.5] }, 8), 'hebilla', 'Chest');
      });
    }
    m.parte(F.toro(1, 0.02 * s, { p: [0, yCadera + 0.09 * s, 0], r: [Math.PI / 2, 0, 0], s: [anchoCadera + rPierna + 0.015 * s, 0.11 * s * grosor + 0.005, 1] }, Math.PI * 2, 20), 'cinturon', 'Hips');
    m.parte(F.caja(0.05 * s, 0.035 * s, 0.01 * s, { p: [0, yCadera + 0.09 * s, 0.11 * s * grosor + 0.02 * s] }), 'hebilla', 'Hips');

    // Cuello y cabeza
    m.parte(F.cilindro(0.045 * s, 0.05 * s, largoCuello + 0.08 * s, { p: [0, yCuello + largoCuello / 2, 0] }), 'piel', 'Neck', { suave: 0.04 * s });
    const cabeza = F.esfera(rCab, { p: [0, cCab, 0], s: [0.92, 1.05, 0.98] }, 18);
    m.parte(cabeza, 'piel', 'Head');
    const zCara = rCab * 0.93;
    m.simetrico((L, x) => {
      const ox = x * rCab * 0.36, oy = cCab + rCab * 0.08;
      const zo = rCab * 0.98 * Math.sqrt(1 - (0.36 / 0.92) ** 2 - (0.08 / 1.05) ** 2);
      m.parte(F.esfera(rCab * 0.14, { p: [ox, oy, zo - rCab * 0.02], s: [1, 1.15, 0.4] }, 12), 'ojoBlanco', 'Head');
      m.parte(F.esfera(rCab * 0.075, { p: [ox, oy - rCab * 0.01, zo + rCab * 0.035], s: [1, 1.1, 0.45] }, 10), 'ojo', 'Head');
      m.parte(F.caja(rCab * 0.32, rCab * 0.06, rCab * 0.08, { p: [ox, oy + rCab * 0.24, zCara - 0.01], r: [0, 0, x * -0.12] }), 'pelo', 'Head');
      m.parte(F.esfera(rCab * 0.2, { p: [x * rCab * 0.93, cCab, 0], s: [0.45, 1, 0.75] }, 8), 'piel', 'Head');
    });
    m.parte(F.esfera(rCab * 0.15, { p: [0, cCab - rCab * 0.1, zCara + rCab * 0.06], s: [0.9, 1, 1.1] }, 8), 'piel', 'Head');
    m.parte(F.caja(rCab * 0.38, rCab * 0.06, rCab * 0.06, { p: [0, cCab - rCab * 0.42, zCara - rCab * 0.12] }), 'boca', 'Head');
    if (p.pelo !== 'calvo') {
      m.parte(F.casquete(rCab * 1.06, Math.PI * 0.52, { p: [0, cCab + rCab * 0.02, -rCab * 0.04], r: [-0.35, 0, 0], s: [0.95, 1, 1] }, 18), 'pelo', 'Head');
      if (p.pelo === 'largo') {
        m.parte(F.cajaRedonda(rCab * 1.8, rCab * 1.7, rCab * 0.5, rCab * 0.22, { p: [0, cCab - rCab * 0.6, -rCab * 0.62] }), 'pelo', 'Head');
      }
    }
    if (p.barba) {
      m.parte(F.casquete(rCab * 1.0, Math.PI * 0.45, { p: [0, cCab - rCab * 0.12, rCab * 0.05], r: [Math.PI + 0.5, 0, 0], s: [0.92, 0.9, 1] }, 14), 'pelo', 'Head');
    }
    const ySombrero = cCab + rCab * 0.55;
    if (p.sombrero === 'gorra') {
      m.parte(F.casquete(rCab * 1.1, Math.PI * 0.5, { p: [0, ySombrero - rCab * 0.25, 0], s: [0.95, 0.8, 1] }, 16), 'gorra', 'Head');
      m.parte(F.cilindro(rCab * 0.75, rCab * 0.75, 0.012 * s, { p: [0, ySombrero - rCab * 0.22, rCab * 0.9], s: [1, 1, 0.65] }, 14), 'gorra', 'Head');
    } else if (p.sombrero === 'paja') {
      m.parte(F.cilindro(rCab * 2.1, rCab * 2.2, 0.018 * s, { p: [0, ySombrero - rCab * 0.1, 0] }, 20), 'paja', 'Head');
      m.parte(F.cilindro(rCab * 0.85, rCab * 1.0, rCab * 0.7, { p: [0, ySombrero + rCab * 0.25, 0] }, 16), 'paja', 'Head');
      m.parte(F.cilindro(rCab * 1.01, rCab * 1.01, rCab * 0.18, { p: [0, ySombrero + rCab * 0.03, 0] }, 16), 'cinta', 'Head');
    } else if (p.sombrero === 'vaquero') {
      m.parte(F.deformar(F.cilindro(rCab * 1.9, rCab * 1.95, 0.016 * s, { p: [0, ySombrero - rCab * 0.1, 0] }, 24), (v) => { v.y += (Math.abs(v.x) / (rCab * 1.9)) ** 2 * rCab * 0.35; }), 'fieltro', 'Head');
      m.parte(F.deformar(F.cilindro(rCab * 0.8, rCab * 0.98, rCab * 0.8, { p: [0, ySombrero + rCab * 0.3, 0] }, 16), (v) => { if (v.y > ySombrero + rCab * 0.6) v.y -= Math.max(0, 1 - Math.abs(v.x) / (rCab * 0.5)) * rCab * 0.15; }), 'fieltro', 'Head');
      m.parte(F.cilindro(rCab * 1.0, rCab * 1.0, rCab * 0.16, { p: [0, ySombrero + rCab * 0.03, 0] }, 16), 'cinta', 'Head');
    }

    // Brazos y piernas
    m.simetrico((L, x) => {
      const [hx, hy, hz] = m.pos(`UpperArm_${L}`), [cx, cy, cz] = m.pos(`LowerArm_${L}`), [mx, my, mz] = m.pos(`Hand_${L}`);
      m.parte(F.esfera(rBrazo * 1.18, { p: [hx - x * rBrazo * 0.15, hy, hz] }, 12), 'camisa', `UpperArm_${L}`);
      m.parte(F.tubo([hx, hy, hz], [cx, cy, cz], rBrazo * 1.12), 'camisa', `UpperArm_${L}`);
      m.parte(F.tubo([cx, cy, cz], [mx, my, mz], rBrazo), p.mangaCorta ? 'piel' : 'camisa', `LowerArm_${L}`);
      if (p.mangaCorta) m.parte(F.cilindro(rBrazo * 1.25, rBrazo * 1.25, 0.05 * s, { p: [lerp(hx, cx, 0.75), lerp(hy, cy, 0.75), 0] }), 'camisa', `UpperArm_${L}`);
      m.parte(F.esfera(rBrazo * 1.3, { p: [mx + x * 0.005, my - rBrazo * 1.1, mz], s: [0.7, 1.15, 1] }, 10), 'piel', `Hand_${L}`);
      m.parte(F.capsula(rBrazo * 0.38, rBrazo * 0.6, { p: [mx - x * rBrazo * 0.2, my - rBrazo * 0.6, mz + rBrazo * 0.85], r: [0.6, 0, 0] }, 6), 'piel', `Hand_${L}`);

      const [ux, uy, uz] = m.pos(`UpperLeg_${L}`), [kx, ky, kz] = m.pos(`LowerLeg_${L}`), [fx, fy, fz] = m.pos(`Foot_${L}`);
      m.parte(F.tubo([ux, uy, uz], [kx, ky, kz], rPierna * 1.1), 'pantalon', `UpperLeg_${L}`);
      m.parte(F.tubo([kx, ky, kz], [fx, fy + 0.03 * s, fz], rPierna * 0.97), 'pantalon', `LowerLeg_${L}`);
      m.parte(F.cajaRedonda(rPierna * 1.9, 0.08 * s, 0.25 * s, 0.035 * s, { p: [fx, 0.04 * s, fz + 0.05 * s] }), 'zapatos', `Foot_${L}`);
      m.parte(F.cilindro(rPierna * 0.95, rPierna, 0.07 * s, { p: [fx, yTobillo + 0.02 * s, fz] }), 'zapatos', `Foot_${L}`);
    });

    const objeto = m.construir({ facetado: p.facetado });
    const dk = yCadera - yRodilla; // caída de cadera al sentarse

    // Animaciones (en el sitio, sin desplazar al personaje)
    const piernas = (pose, f, amp, rodilla, desfase = 0) => {
      for (const [L, d] of [['L', 0], ['R', 0.5]]) {
        const fase = f + d + desfase;
        const adelante = onda(fase);
        const vuelo = Math.max(0, Math.cos(Math.PI * 2 * fase));
        const k = 0.08 + rodilla * vuelo ** 1.4;
        pose.rot(`UpperLeg_${L}`, -amp * adelante - k * 0.3);
        pose.rot(`LowerLeg_${L}`, k);
        pose.rot(`Foot_${L}`, amp * adelante * 0.5 - k * 0.45 + 0.1 * Math.max(0, -adelante));
      }
    };
    const animaciones = [
      clip('Reposo', 3, objeto, (f, P) => {
        const r = onda(f);
        P.rot('Spine', 0.015 * r); P.rot('Chest', 0.02 * r);
        P.rot('Neck', -0.02 * r); P.rot('Head', 0.03 * onda(f, 1, 0.2), 0.12 * onda(f, 1, 0.1) * tramo(f, 0.2, 0.35, 0.6, 0.8));
        m.simetrico((L, x) => {
          P.rot(`UpperArm_${L}`, 0.03 * onda(f, 1, 0.25), 0, x * (0.07 + 0.015 * r));
          P.rot(`LowerArm_${L}`, -0.12 - 0.03 * r);
        });
        P.mov('Hips', 0, -0.004 * s * onda01(f));
      }),
      clip('Caminar', 1.1, objeto, (f, P) => {
        piernas(P, f, 0.42, 0.75);
        P.mov('Hips', 0, 0.025 * s * Math.cos(Math.PI * 4 * f) - 0.015 * s);
        P.rot('Hips', 0, 0.09 * onda(f)); P.rot('Chest', 0.04, -0.14 * onda(f)); P.rot('Spine', 0.03);
        P.rot('Head', -0.04, 0.05 * onda(f));
        m.simetrico((L, x) => {
          const d = L === 'L' ? 0 : 0.5;
          P.rot(`UpperArm_${L}`, 0.38 * onda(f + d), 0, x * 0.07);
          P.rot(`LowerArm_${L}`, -0.25 - 0.18 * Math.max(0, -onda(f + d)));
        });
      }),
      clip('Correr', 0.68, objeto, (f, P) => {
        piernas(P, f, 0.75, 1.5);
        P.mov('Hips', 0, 0.05 * s * Math.abs(Math.cos(Math.PI * 2 * f)) - 0.05 * s);
        P.rot('Spine', 0.2); P.rot('Hips', 0, 0.12 * onda(f));
        P.rot('Chest', 0.05, -0.2 * onda(f)); P.rot('Head', -0.2);
        m.simetrico((L, x) => {
          const d = L === 'L' ? 0 : 0.5;
          P.rot(`UpperArm_${L}`, 0.75 * onda(f + d) - 0.1, 0, x * 0.12);
          P.rot(`LowerArm_${L}`, -1.35);
          P.rot(`Hand_${L}`, -0.2);
        });
      }),
      clip('Saltar', 1.1, objeto, (f, P) => {
        const agachar = tramo(f, 0, 0.18, 0.22, 0.32) + tramo(f, 0.72, 0.8, 0.85, 1);
        const aire = tramo(f, 0.28, 0.36, 0.64, 0.74);
        const altura = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (f - 0.3) / 0.45))));
        P.mov('Hips', 0, -0.18 * s * agachar + 0.45 * s * altura);
        m.simetrico((L, x) => {
          P.rot(`UpperLeg_${L}`, -0.8 * agachar - 0.6 * aire);
          P.rot(`LowerLeg_${L}`, 1.4 * agachar + 1.0 * aire);
          P.rot(`Foot_${L}`, -0.6 * agachar + 0.4 * aire);
          P.rot(`UpperArm_${L}`, 0.7 * agachar - 2.4 * aire, 0, x * (0.1 + 0.25 * aire));
          P.rot(`LowerArm_${L}`, -0.3 - 0.3 * aire);
        });
        P.rot('Spine', 0.35 * agachar - 0.1 * aire); P.rot('Head', -0.2 * agachar + 0.15 * aire);
      }),
      clip('Saludar', 2, objeto, (f, P) => {
        const sube = tramo(f, 0, 0.15, 0.85, 1);
        P.rot('UpperArm_R', -0.2 * sube, 0, -2.5 * sube - 0.07);
        P.rot('LowerArm_R', 0, 0, (-0.35 + 0.45 * onda(f, 4)) * sube);
        P.rot('Hand_R', 0, 0, 0.2 * onda(f, 4, 0.1) * sube);
        P.rot('UpperArm_L', 0, 0, 0.07); P.rot('LowerArm_L', -0.15);
        P.rot('Head', -0.08 * sube, -0.15 * sube, 0.06 * sube);
        P.rot('Chest', 0, -0.08 * sube, 0.05 * sube);
      }),
      clip('Recoger', 1.8, objeto, (f, P) => {
        const b = tramo(f, 0.05, 0.4, 0.6, 0.95);
        P.mov('Hips', 0, -0.32 * s * b, -0.06 * s * b);
        m.simetrico((L, x) => {
          P.rot(`UpperLeg_${L}`, -1.0 * b, 0, x * 0.1 * b);
          P.rot(`LowerLeg_${L}`, 1.75 * b);
          P.rot(`Foot_${L}`, -0.75 * b);
          P.rot(`UpperArm_${L}`, -1.1 * b, 0, x * 0.1);
          P.rot(`LowerArm_${L}`, -0.4 * b);
        });
        P.rot('Spine', 0.5 * b); P.rot('Chest', 0.25 * b); P.rot('Head', 0.2 * b);
      }),
      clip('Sentarse', 3, objeto, (f, P) => {
        const r = onda(f);
        P.mov('Hips', 0, -dk + 0.01 * s, -0.04 * s);
        m.simetrico((L, x) => {
          P.rot(`UpperLeg_${L}`, -1.57, 0, x * 0.06);
          P.rot(`LowerLeg_${L}`, 1.57);
          P.rot(`UpperArm_${L}`, -0.45, 0, x * 0.1);
          P.rot(`LowerArm_${L}`, -0.7);
        });
        P.rot('Spine', 0.05 + 0.015 * r); P.rot('Head', 0.03 * r, 0.1 * onda(f, 1, 0.3));
      }),
    ];
    return { objeto, animaciones };
  },
};
