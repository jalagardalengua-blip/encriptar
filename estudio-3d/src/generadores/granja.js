// Objetos de escenario para una granja. Las partes que se mueven son nodos con nombre.
import * as THREE from 'three';
import { crearMateriales, malla, pivote } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo, TAU } from '../core/animacion.js';

export default {
  id: 'granja',
  nombre: 'Objetos de granja',
  icono: '🌳',
  categoria: 'Escenario',
  descripcion: 'Árboles, pinos, vallas, granero, molino, fardos, abrevadero, comedero y rocas. Árboles, granero y molino traen animación.',
  presets: {
    arbol: { tipo: 'arbol' },
    pino: { tipo: 'pino', color1: '#2f5d34', color2: '#5a3d26' },
    valla: { tipo: 'valla', color1: '#8a6142', tamano: 1 },
    granero: { tipo: 'granero', color1: '#a8322a', color2: '#f1ece2', tamano: 1 },
    molino: { tipo: 'molino', color1: '#c9c4bb', color2: '#7d2b22' },
    fardo: { tipo: 'fardo', color1: '#d9b75f' },
    abrevadero: { tipo: 'abrevadero', color1: '#8a8f94', color2: '#4f87b3' },
    comedero: { tipo: 'comedero', color1: '#7a5236', color2: '#d9b75f' },
    roca: { tipo: 'roca', color1: '#8c8a84' },
  },
  parametros: [
    { id: 'tipo', nombre: 'Objeto', tipo: 'opcion', opciones: [['arbol', 'Árbol frondoso'], ['pino', 'Pino'], ['valla', 'Tramo de valla'], ['granero', 'Granero'], ['molino', 'Molino de viento'], ['fardo', 'Fardo de heno'], ['abrevadero', 'Abrevadero'], ['comedero', 'Comedero'], ['roca', 'Roca']], def: 'arbol' },
    { id: 'tamano', nombre: 'Escala general', tipo: 'rango', min: 0.3, max: 3, paso: 0.01, def: 1 },
    { id: 'variacion', nombre: 'Irregularidad', tipo: 'rango', min: 0, max: 1, paso: 0.01, def: 0.5 },
    { id: 'tramos', nombre: 'Tramos (valla)', tipo: 'rango', min: 1, max: 8, paso: 1, def: 3 },
    { id: 'color1', nombre: 'Color principal', tipo: 'color', def: '#4f8a3c' },
    { id: 'color2', nombre: 'Color secundario', tipo: 'color', def: '#6b4a2f' },
  ],

  construir(p, azar) {
    const k = p.tamano, ir = p.variacion, ff = { facetado: p.facetado };
    const M = crearMateriales({
      c1: { color: p.color1, rugosidad: 0.85 },
      c2: { color: p.color2, rugosidad: 0.85 },
      c1o: { color: new THREE.Color(p.color1).multiplyScalar(0.78).getStyle(), rugosidad: 0.85 },
      madera: { color: '#7a5434', rugosidad: 0.9 },
      tejado: { color: '#4a4a4f', rugosidad: 0.7 },
      metal: { color: '#a7abb0', rugosidad: 0.35, metal: 1 },
      agua: { color: p.color2, rugosidad: 0.05, metal: 0.1 },
      heno: { color: '#d9b75f', rugosidad: 1 },
      oscuro: { color: '#2a2420', rugosidad: 0.9 },
    });
    const raiz = new THREE.Group(); raiz.name = p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1);
    const animaciones = [];
    const fase = azar() * 10;
    const rugoso = (g, amp) => {
      g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
      return F.deformar(g, (v) => { const n = Math.sin(v.x * 7.1 / k + fase) * Math.cos(v.z * 6.3 / k + fase) * Math.sin(v.y * 5.7 / k + 1.3); v.sub(c).multiplyScalar(1 + n * amp * ir).add(c); });
    };

    if (p.tipo === 'arbol' || p.tipo === 'pino') {
      const tronco = pivote('Tronco'); raiz.add(tronco);
      const copa = pivote('Copa', [0, (p.tipo === 'pino' ? 1.0 : 1.8) * k, 0]); tronco.add(copa);
      const alto = (p.tipo === 'pino' ? 1.2 : 2.0) * k;
      tronco.add(malla('Tronco_Malla', [[F.cilindro(0.12 * k, 0.2 * k, alto, { p: [0, alto / 2, 0] }, 9), p.tipo === 'pino' ? 'c2' : 'c2']], M, ff));
      const hojas = [];
      if (p.tipo === 'pino') {
        for (let i = 0; i < 4; i++) hojas.push([rugoso(F.cono((1.1 - i * 0.22) * k * azar.variar(0.1 * ir), 1.3 * k, { p: [0, (0.3 + i * 0.7) * k, 0], r: [0, azar() * 3, 0] }, 9), 0.06), i % 2 ? 'c1o' : 'c1']);
      } else {
        const n = 5 + Math.round(ir * 3);
        hojas.push([rugoso(F.esfera(1.0 * k, { p: [0, 0.4 * k, 0] }, 12), 0.12), 'c1']);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + azar() * 0.5, r = azar.entre(0.5, 0.85) * k;
          hojas.push([rugoso(F.esfera(azar.entre(0.55, 0.8) * k, { p: [Math.cos(a) * r, azar.entre(0.1, 0.9) * k, Math.sin(a) * r] }, 10), 0.12), i % 3 ? 'c1' : 'c1o']);
        }
      }
      copa.add(malla('Copa_Malla', hojas, M, ff));
      animaciones.push(clip('Viento', 4, raiz, (f, P) => {
        P.rot('Tronco', 0.02 * onda(f, 1, 0.2), 0, 0.03 * onda(f));
        P.rot('Copa', 0.03 * onda(f, 2, 0.1), 0.02 * onda(f, 1, 0.4), 0.04 * onda(f, 1, 0.15));
      }));
    } else if (p.tipo === 'valla') {
      const n = Math.round(p.tramos), largo = 2 * k, piezas = [];
      for (let i = 0; i <= n; i++) {
        const x = (i - n / 2) * largo;
        piezas.push([F.caja(0.12 * k, 1.15 * k, 0.12 * k, { p: [x, 0.57 * k, 0], r: [0, 0, (azar() - 0.5) * 0.06 * ir] }), 'c1']);
        piezas.push([F.caja(0.15 * k, 0.04 * k, 0.15 * k, { p: [x, 1.16 * k, 0] }), 'c1o']);
        if (i < n) for (const y of [0.45, 0.9]) piezas.push([F.caja(largo, 0.12 * k, 0.05 * k, { p: [x + largo / 2, y * k + (azar() - 0.5) * 0.05 * ir * k, 0.08 * k], r: [0, 0, (azar() - 0.5) * 0.04 * ir] }), 'c1']);
      }
      raiz.add(malla('Valla_Malla', piezas, M, ff));
    } else if (p.tipo === 'granero') {
      const an = 6 * k, fo = 8 * k, al = 3.5 * k, techo = 2.2 * k;
      const forma = new THREE.Shape([[-an / 2, 0], [an / 2, 0], [an / 2, al], [an * 0.32, al + techo * 0.65], [0, al + techo], [-an * 0.32, al + techo * 0.65], [-an / 2, al]].map(([x, y]) => new THREE.Vector2(x, y)));
      const cuerpo = new THREE.ExtrudeGeometry(forma, { depth: fo, bevelEnabled: false }); cuerpo.translate(0, 0, -fo / 2);
      for (const a of Object.keys(cuerpo.attributes)) if (a !== 'position' && a !== 'normal') cuerpo.deleteAttribute(a);
      const piezas = [[cuerpo, 'c1']];
      // Tejado a dos aguas quebrado
      const tej = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); return F.caja(l + 0.1 * k, 0.12 * k, fo + 0.5 * k, { p: [(x0 + x1) / 2, (y0 + y1) / 2 + 0.06 * k, 0], r: [0, 0, Math.atan2(dy, dx)] }); };
      piezas.push([tej(-an / 2 - 0.2 * k, al - 0.1 * k, -an * 0.32, al + techo * 0.65), 'tejado'], [tej(-an * 0.32, al + techo * 0.65, 0, al + techo), 'tejado'], [tej(0, al + techo, an * 0.32, al + techo * 0.65), 'tejado'], [tej(an * 0.32, al + techo * 0.65, an / 2 + 0.2 * k, al - 0.1 * k), 'tejado']);
      // Molduras blancas
      for (const z of [fo / 2 + 0.02 * k, -fo / 2 - 0.02 * k]) {
        piezas.push([F.caja(0.18 * k, al, 0.05 * k, { p: [-an / 2 + 0.09 * k, al / 2, z] }), 'c2'], [F.caja(0.18 * k, al, 0.05 * k, { p: [an / 2 - 0.09 * k, al / 2, z] }), 'c2']);
        piezas.push([F.caja(1.2 * k, 1.0 * k, 0.05 * k, { p: [0, al + techo * 0.4, z] }), 'c2'], [F.caja(1.0 * k, 0.8 * k, 0.06 * k, { p: [0, al + techo * 0.4, z] }), 'oscuro']);
      }
      piezas.push([F.caja(3.4 * k, 3.0 * k, 0.04 * k, { p: [0, 1.5 * k, fo / 2 + 0.005 * k] }), 'oscuro']);
      raiz.add(malla('Granero_Malla', piezas, M, ff));
      const puerta = (nombre, x, s) => {
        const pv = pivote(nombre, [x, 0, fo / 2 + 0.06 * k]);
        const w = 1.6 * k, h = 2.9 * k, c = s * w / 2;
        pv.add(malla(nombre + '_Malla', [
          [F.caja(w, h, 0.08 * k, { p: [-c, h / 2, 0] }), 'c1o'],
          [F.caja(w, 0.14 * k, 0.1 * k, { p: [-c, 0.07 * k, 0.01 * k] }), 'c2'], [F.caja(w, 0.14 * k, 0.1 * k, { p: [-c, h - 0.07 * k, 0.01 * k] }), 'c2'],
          [F.caja(0.14 * k, h, 0.1 * k, { p: [-s * 0.07 * k, h / 2, 0.01 * k] }), 'c2'], [F.caja(0.14 * k, h, 0.1 * k, { p: [-s * (w - 0.07 * k), h / 2, 0.01 * k] }), 'c2'],
          [F.caja(Math.hypot(w, h) - 0.2 * k, 0.12 * k, 0.1 * k, { p: [-c, h / 2, 0.02 * k], r: [0, 0, s * Math.atan2(h, w)] }), 'c2'],
        ], M, ff));
        raiz.add(pv);
      };
      puerta('Puerta_I', 1.6 * k, 1); puerta('Puerta_D', -1.6 * k, -1);
      animaciones.push(clip('Abrir_puertas', 2, raiz, (f, P) => { const a = tramo(f, 0, 0.4, 1, 1.01) * 1.9; P.rot('Puerta_I', 0, -a); P.rot('Puerta_D', 0, a); }));
    } else if (p.tipo === 'molino') {
      const al = 7 * k, piezas = [];
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piezas.push([F.barra([x * 1.1 * k, 0, z * 1.1 * k], [x * 0.25 * k, al, z * 0.25 * k], 0.06 * k, 0.05 * k, 6), 'c1']);
      for (let i = 1; i < 5; i++) {
        const y = (i / 5) * al, w = 1.1 * k - (0.85 * k * i) / 5;
        for (const [a, b] of [[[-w, -w], [w, -w]], [[w, -w], [w, w]], [[w, w], [-w, w]], [[-w, w], [-w, -w]]]) piezas.push([F.barra([a[0], y, a[1]], [b[0], y, b[1]], 0.03 * k, 0.03 * k, 5), 'c1']);
      }
      piezas.push([F.cajaRedonda(0.6 * k, 0.5 * k, 1.2 * k, 0.08 * k, { p: [0, al + 0.2 * k, 0] }), 'c2']);
      raiz.add(malla('Torre', piezas, M, ff));
      const aspas = pivote('Aspas', [0, al + 0.2 * k, 0.65 * k]);
      const pa = [[F.cilindro(0.18 * k, 0.18 * k, 0.25 * k, { r: [Math.PI / 2, 0, 0] }, 12), 'metal']];
      const n = 12;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pa.push([F.caja(0.28 * k, 1.5 * k, 0.03 * k, { p: [Math.sin(a) * 1.0 * k, Math.cos(a) * 1.0 * k, 0], r: [0.3, 0, -a] }), i % 2 ? 'c1' : 'c2']); }
      aspas.add(malla('Aspas_Malla', pa, M, ff));
      const cola = pivote('Veleta', [0, al + 0.2 * k, 0]);
      cola.add(malla('Veleta_Malla', [[F.barra([0, 0, 0], [0, 0, -1.6 * k], 0.04 * k), 'metal'], [F.caja(0.03 * k, 0.9 * k, 1.0 * k, { p: [0, 0.1 * k, -1.8 * k] }), 'c2']], M, ff));
      raiz.add(aspas, cola);
      animaciones.push(clip('Girar', 3, raiz, (f, P) => { P.rot('Aspas', 0, 0, -TAU * f); P.rot('Veleta', 0, 0.12 * onda(f)); }));
    } else if (p.tipo === 'fardo') {
      raiz.add(malla('Fardo', [
        [rugoso(F.cajaRedonda(1.1 * k, 0.5 * k, 0.6 * k, 0.06 * k), 0.03), 'heno'],
        [F.caja(0.03 * k, 0.52 * k, 0.62 * k, { p: [0.25 * k, 0, 0] }), 'oscuro'], [F.caja(0.03 * k, 0.52 * k, 0.62 * k, { p: [-0.25 * k, 0, 0] }), 'oscuro'],
      ].map(([g, m]) => [g.translate(0, 0.25 * k, 0), m]), M, ff));
    } else if (p.tipo === 'abrevadero') {
      const L = 2 * k;
      raiz.add(malla('Abrevadero', [
        [F.caja(L, 0.08 * k, 0.7 * k, { p: [0, 0.3 * k, 0] }), 'c1'],
        [F.caja(L, 0.5 * k, 0.06 * k, { p: [0, 0.55 * k, 0.32 * k] }), 'c1'], [F.caja(L, 0.5 * k, 0.06 * k, { p: [0, 0.55 * k, -0.32 * k] }), 'c1'],
        [F.caja(0.06 * k, 0.5 * k, 0.7 * k, { p: [L / 2, 0.55 * k, 0] }), 'c1'], [F.caja(0.06 * k, 0.5 * k, 0.7 * k, { p: [-L / 2, 0.55 * k, 0] }), 'c1'],
        [F.caja(L - 0.06 * k, 0.02 * k, 0.6 * k, { p: [0, 0.68 * k, 0] }), 'agua'],
        ...[-1, 1].flatMap((x) => [[F.caja(0.08 * k, 0.3 * k, 0.08 * k, { p: [x * L * 0.4, 0.15 * k, 0.25 * k] }), 'metal'], [F.caja(0.08 * k, 0.3 * k, 0.08 * k, { p: [x * L * 0.4, 0.15 * k, -0.25 * k] }), 'metal']]),
      ], M, ff));
    } else if (p.tipo === 'comedero') {
      const L = 1.6 * k, piezas = [];
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piezas.push([F.caja(0.08 * k, 1.1 * k, 0.08 * k, { p: [x * L / 2, 0.55 * k, z * 0.4 * k] }), 'c1']);
      piezas.push([F.caja(L, 0.06 * k, 0.9 * k, { p: [0, 0.35 * k, 0] }), 'c1'], [F.caja(L + 0.3 * k, 0.06 * k, 1.1 * k, { p: [0, 1.15 * k, 0] }), 'c1o']);
      for (let i = 0; i < 9; i++) piezas.push([F.barra([-L / 2 + (i + 0.5) * L / 9, 0.4 * k, 0.4 * k], [-L / 2 + (i + 0.5) * L / 9, 1.1 * k, 0.15 * k], 0.02 * k), 'c1']);
      piezas.push([rugoso(F.esfera(1, { p: [0, 0.6 * k, 0], s: [L * 0.45, 0.35 * k, 0.32 * k] }, 12), 0.15), 'heno']);
      raiz.add(malla('Comedero', piezas, M, ff));
    } else {
      const n = 1 + Math.round(ir * 3), piezas = [];
      for (let i = 0; i < n; i++) {
        const r = (i === 0 ? 0.6 : azar.entre(0.2, 0.4)) * k;
        piezas.push([rugoso(F.esfera(r, { p: [i === 0 ? 0 : azar.entre(-0.7, 0.7) * k, r * 0.55, i === 0 ? 0 : azar.entre(-0.6, 0.6) * k], s: [azar.variar(0.25), azar.entre(0.55, 0.8), azar.variar(0.25)] }, 8), 0.2), i % 2 ? 'c1o' : 'c1']);
      }
      raiz.add(malla('Roca', piezas, M, { facetado: true }));
    }
    return { objeto: raiz, animaciones };
  },
};
