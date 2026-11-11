// Tractor con ruedas, dirección y pala separadas como nodos con nombre para animarlas desde el juego.
import * as THREE from 'three';
import { crearMateriales, malla, pivote } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo, TAU } from '../core/animacion.js';

export default {
  id: 'tractor',
  nombre: 'Tractor',
  icono: '🚜',
  categoria: 'Vehículos',
  descripcion: 'Tractor con nodos para cada rueda, dirección, volante y pala. Animaciones: avanzar, girar, motor al ralentí y subir la pala.',
  presets: {
    rojo: {},
    verde: { colorCarroceria: '#2f7d32', colorLlantas: '#f2c230' },
    azul: { colorCarroceria: '#1f5fa8', colorLlantas: '#e8e8e8' },
    pequeno: { tamano: 0.75, cabina: false, pala: false, colorCarroceria: '#e57f1f' },
    con_pala: { pala: true, colorCarroceria: '#d9a21b', colorLlantas: '#2b2b2b' },
  },
  parametros: [
    { id: 'tamano', nombre: 'Escala general', tipo: 'rango', min: 0.4, max: 2, paso: 0.01, def: 1 },
    { id: 'ruedaTrasera', nombre: 'Radio rueda trasera (m)', tipo: 'rango', min: 0.4, max: 1.0, paso: 0.01, def: 0.7 },
    { id: 'ruedaDelantera', nombre: 'Radio rueda delantera (m)', tipo: 'rango', min: 0.25, max: 0.7, paso: 0.01, def: 0.42 },
    { id: 'largo', nombre: 'Largo (m)', tipo: 'rango', min: 2.2, max: 4.5, paso: 0.01, def: 3.2 },
    { id: 'cabina', nombre: 'Cabina cerrada', tipo: 'si', def: true },
    { id: 'pala', nombre: 'Pala delantera', tipo: 'si', def: false },
    { id: 'faros', nombre: 'Faros encendidos', tipo: 'si', def: true },
    { id: 'colorCarroceria', nombre: 'Carrocería', tipo: 'color', def: '#c62f24' },
    { id: 'colorLlantas', nombre: 'Llantas', tipo: 'color', def: '#f2f2ec' },
    { id: 'colorChasis', nombre: 'Chasis', tipo: 'color', def: '#2a2a2a' },
  ],

  construir(p) {
    const k = p.tamano, Rt = p.ruedaTrasera * k, Rd = p.ruedaDelantera * k, L = p.largo * k;
    const M = crearMateriales({
      carroceria: { color: p.colorCarroceria, rugosidad: 0.35, metal: 0.2 },
      chasis: { color: p.colorChasis, rugosidad: 0.6, metal: 0.5 },
      neumatico: { color: '#1b1b1b', rugosidad: 0.95 },
      llanta: { color: p.colorLlantas, rugosidad: 0.4, metal: 0.3 },
      cristal: { color: '#8fb3c9', rugosidad: 0.05, metal: 0.1 },
      metal: { color: '#b9bcbf', rugosidad: 0.3, metal: 1 },
      faro: { color: '#fff7d6', rugosidad: 0.1, emisivo: p.faros ? '#fff2c0' : '#000000', intensidad: p.faros ? 2 : 0 },
      piloto: { color: '#c21d12', rugosidad: 0.2, emisivo: '#7a0b06', intensidad: 0.6 },
      asiento: { color: '#2b2622', rugosidad: 0.8 },
    });
    const ff = { facetado: p.facetado };
    const raiz = new THREE.Group(); raiz.name = 'Tractor';
    const zT = -L * 0.3, zD = L * 0.36, anchoT = 0.95 * k, anchoD = 0.75 * k;
    const yEje = Rt, yCuerpo = Rt * 0.95;

    // Carrocería (nodo Chasis, se mueve con el motor)
    const chasis = pivote('Chasis'); raiz.add(chasis);
    const piezas = [
      [F.caja(0.5 * k, 0.25 * k, L * 0.95, { p: [0, Rd * 0.95, L * 0.05] }), 'chasis'],
      [F.cajaRedonda(0.62 * k, 0.6 * k, L * 0.5, 0.08 * k, { p: [0, yCuerpo + 0.12 * k, zD - L * 0.12] }), 'carroceria'],
      [F.cajaRedonda(0.66 * k, 0.12 * k, L * 0.52, 0.05 * k, { p: [0, yCuerpo + 0.45 * k, zD - L * 0.12] }), 'carroceria'],
      [F.caja(0.5 * k, 0.4 * k, 0.04 * k, { p: [0, yCuerpo + 0.12 * k, zD + L * 0.13 + 0.01] }), 'chasis'],
      [F.cajaRedonda(1.0 * k, 0.35 * k, 0.9 * k, 0.06 * k, { p: [0, yEje + 0.05 * k, zT] }), 'carroceria'],
      [F.cajaRedonda(0.5 * k, 0.12 * k, 0.45 * k, 0.04 * k, { p: [0, yEje + 0.3 * k, zT - 0.05 * k] }), 'asiento'],
      [F.cajaRedonda(0.5 * k, 0.45 * k, 0.1 * k, 0.04 * k, { p: [0, yEje + 0.55 * k, zT - 0.3 * k] }), 'asiento'],
      [F.cilindro(0.06 * k, 0.07 * k, 0.9 * k, { p: [0.22 * k, yCuerpo + 0.85 * k, zD - L * 0.05] }), 'chasis'],
      [F.cilindro(0.075 * k, 0.06 * k, 0.08 * k, { p: [0.22 * k, yCuerpo + 1.32 * k, zD - L * 0.05] }), 'metal'],
    ];
    // Guardabarros traseros
    for (const x of [-1, 1]) piezas.push([F.toro(Rt + 0.08 * k, 0.04 * k, { p: [x * (anchoT - 0.12 * k), yEje, zT], r: [0, Math.PI / 2, 0], s: [1, 1, 5] }, Math.PI * 0.95, 16), 'carroceria']);
    for (const x of [-1, 1]) {
      piezas.push([F.cilindro(0.08 * k, 0.08 * k, 0.05 * k, { p: [x * 0.2 * k, yCuerpo + 0.25 * k, zD + L * 0.13 + 0.03 * k], r: [Math.PI / 2, 0, 0] }, 12), 'faro']);
      piezas.push([F.caja(0.1 * k, 0.06 * k, 0.03 * k, { p: [x * 0.4 * k, yEje + 0.12 * k, zT - 0.47 * k] }), 'piloto']);
    }
    if (p.cabina) {
      const yb = yEje + 0.22 * k, yt = yEje + 1.55 * k, zc = zT - 0.05 * k;
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piezas.push([F.caja(0.06 * k, yt - yb, 0.06 * k, { p: [x * 0.48 * k, (yb + yt) / 2, zc + z * 0.45 * k] }), 'chasis']);
      piezas.push([F.cajaRedonda(1.1 * k, 0.08 * k, 1.05 * k, 0.03 * k, { p: [0, yt, zc] }), 'carroceria']);
      piezas.push([F.caja(0.92 * k, (yt - yb) * 0.6, 0.02 * k, { p: [0, yt - (yt - yb) * 0.33, zc + 0.45 * k] }), 'cristal']);
      piezas.push([F.caja(0.92 * k, (yt - yb) * 0.6, 0.02 * k, { p: [0, yt - (yt - yb) * 0.33, zc - 0.45 * k] }), 'cristal']);
      for (const x of [-1, 1]) piezas.push([F.caja(0.02 * k, (yt - yb) * 0.55, 0.85 * k, { p: [x * 0.48 * k, yt - (yt - yb) * 0.35, zc] }), 'cristal']);
      piezas.push([F.caja(0.12 * k, 0.05 * k, 0.04 * k, { p: [0.3 * k, yt + 0.06 * k, zc + 0.4 * k] }), 'faro'], [F.caja(0.12 * k, 0.05 * k, 0.04 * k, { p: [-0.3 * k, yt + 0.06 * k, zc + 0.4 * k] }), 'faro']);
    }
    chasis.add(malla('Carroceria', piezas, M, ff));
    // Volante
    const volante = pivote('Volante', [0, yEje + 0.75 * k, zT + 0.28 * k]); volante.rotation.x = -0.9;
    volante.add(malla('Volante_Malla', [[F.toro(0.16 * k, 0.018 * k, { r: [Math.PI / 2, 0, 0] }, TAU, 16), 'chasis'], [F.caja(0.3 * k, 0.02 * k, 0.02 * k), 'chasis']], M, ff));
    chasis.add(volante);
    chasis.add(malla('Columna', [[F.barra([0, yEje + 0.75 * k, zT + 0.28 * k], [0, yEje + 0.3 * k, zT + 0.55 * k], 0.025 * k), 'chasis']], M, ff));

    // Ruedas: pivote de dirección (solo delanteras) > rueda que gira sobre X
    const rueda = (nombre, R, ancho) => {
      const piezasR = [
        [F.cilindro(R, R, ancho, { r: [0, 0, Math.PI / 2] }, 24), 'neumatico'],
        [F.cilindro(R * 0.62, R * 0.62, ancho * 1.02, { r: [0, 0, Math.PI / 2] }, 20), 'llanta'],
        [F.cilindro(R * 0.18, R * 0.18, ancho * 1.12, { r: [0, 0, Math.PI / 2] }, 10), 'metal'],
      ];
      const tacos = Math.round(R * 34 / k);
      for (let i = 0; i < tacos; i++) {
        const a = (i / tacos) * TAU;
        for (const s of [-1, 1]) piezasR.push([F.caja(ancho * 0.45, R * 0.08, R * 0.16, { p: [s * ancho * 0.24, Math.cos(a) * R, Math.sin(a) * R], r: [-a, s * 0.35, 0] }), 'neumatico']);
      }
      return malla(nombre, piezasR, M, ff);
    };
    const ruedas = [];
    for (const [lado, x] of [['I', 1], ['D', -1]]) {
      const t = pivote(`Eje_T${lado}`, [x * anchoT, yEje, zT]);
      const r = rueda(`Rueda_T${lado}`, Rt, 0.42 * k); t.add(r); raiz.add(t); ruedas.push([r.name, Rt]);
      const dir = pivote(`Direccion_D${lado}`, [x * anchoD, Rd, zD]);
      const rd = rueda(`Rueda_D${lado}`, Rd, 0.26 * k); dir.add(rd); raiz.add(dir); ruedas.push([rd.name, Rd]);
    }
    // Pala
    if (p.pala) {
      const brazo = pivote('Pala', [0, yCuerpo + 0.1 * k, zD - L * 0.25]);
      const largoB = L * 0.55;
      brazo.add(malla('Pala_Malla', [
        [F.caja(0.08 * k, 0.12 * k, largoB, { p: [0.42 * k, -0.25 * k, largoB / 2], r: [0.35, 0, 0] }), 'carroceria'],
        [F.caja(0.08 * k, 0.12 * k, largoB, { p: [-0.42 * k, -0.25 * k, largoB / 2], r: [0.35, 0, 0] }), 'carroceria'],
        [F.caja(1.8 * k, 0.6 * k, 0.06 * k, { p: [0, -0.62 * k, largoB + 0.05 * k] }), 'chasis'],
        [F.caja(1.8 * k, 0.06 * k, 0.45 * k, { p: [0, -0.9 * k, largoB - 0.15 * k] }), 'chasis'],
      ], M, ff));
      chasis.add(brazo);
    }

    // Animaciones (nodos): las ruedas giran según su radio para avanzar 1 vuelta trasera
    const vueltaT = TAU;
    const animaciones = [
      clip('Avanzar', 2, raiz, (f, P) => {
        for (const [n, R] of ruedas) P.rot(n, vueltaT * f * (Rt / R));
        P.mov('Chasis', 0, 0.006 * k * onda(f, 12));
      }),
      clip('Girar', 3, raiz, (f, P) => {
        const g = 0.5 * onda(f);
        P.rot('Direccion_DI', 0, g); P.rot('Direccion_DD', 0, g);
        P.rot('Volante', 0, 0, -g * 4);
        for (const [n, R] of ruedas) P.rot(n, vueltaT * f * (Rt / R));
      }),
      clip('Ralenti', 1, raiz, (f, P) => {
        P.mov('Chasis', 0.002 * k * onda(f, 9), 0.005 * k * onda(f, 15));
        P.rot('Chasis', 0, 0, 0.003 * onda(f, 11));
      }),
    ];
    if (p.pala) animaciones.push(clip('Subir_pala', 3, raiz, (f, P) => { P.rot('Pala', -0.6 * tramo(f, 0.1, 0.4, 0.6, 0.9)); }));
    return { objeto: raiz, animaciones };
  },
};
