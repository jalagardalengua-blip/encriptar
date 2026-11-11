// Animales de cuatro patas: vacas, toros, terneros, cerdos, ovejas, cabras, caballos, burros, perros, gatos...
import * as THREE from 'three';
import { Modelo } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo, suave } from '../core/animacion.js';

const V = (...a) => new THREE.Vector3(...a);

export default {
  id: 'cuadrupedo',
  nombre: 'Animal de 4 patas',
  icono: '🐄',
  categoria: 'Animales',
  descripcion: 'Ganado y mascotas con esqueleto de 22 huesos y animaciones de reposo, caminar, trotar, galopar, comer y tumbarse (y sentarse en perros y gatos).',
  presets: {
    vaca: {},
    toro: { largo: 1.95, altoPatas: 0.78, grosor: 0.95, ancho: 0.78, largoCuello: 0.38, alzaCuello: 0.15, cabeza: 1.15, cuernos: 'largos', largoCuernos: 0.32, ubre: false, patron: 'liso', colorBase: '#3b2519', colorManchas: '#f0e8dc', colorHocico: '#5a3a2c' },
    ternero: { largo: 1.0, altoPatas: 0.58, grosor: 0.46, ancho: 0.36, largoCuello: 0.28, alzaCuello: 0.45, cabeza: 0.82, cuernos: 'ninguno', ubre: false, patron: 'manchas', colorBase: '#f1ebe2', colorManchas: '#7a4a2a', grosorPatas: 0.75 },
    cerdo: { largo: 1.15, altoPatas: 0.32, grosor: 0.62, ancho: 0.56, largoCuello: 0.06, alzaCuello: 0.05, inclinacion: 0.15, cabeza: 1.0, hocico: 'disco', largoHocico: 0.1, orejas: 'caidas', tamOrejas: 0.13, cuernos: 'ninguno', cola: 'rizada', ubre: false, patron: 'liso', colorBase: '#f0b3a8', colorHocico: '#e48f86', colorManchas: '#2b2523', grosorPatas: 0.9 },
    oveja: { largo: 1.0, altoPatas: 0.5, grosor: 0.58, ancho: 0.52, largoCuello: 0.25, alzaCuello: 0.55, cabeza: 0.72, largoHocico: 0.12, orejas: 'laterales', tamOrejas: 0.1, cuernos: 'ninguno', cola: 'corta', lana: true, ubre: false, patron: 'cabeza_patas', colorBase: '#f2ede2', colorManchas: '#2b2622', colorHocico: '#2b2622', grosorPatas: 0.6 },
    carnero: { largo: 1.1, altoPatas: 0.55, grosor: 0.64, ancho: 0.56, largoCuello: 0.25, alzaCuello: 0.5, cabeza: 0.8, largoHocico: 0.12, orejas: 'laterales', tamOrejas: 0.09, cuernos: 'espiral', largoCuernos: 0.22, cola: 'corta', lana: true, ubre: false, patron: 'liso', colorBase: '#e9e1cf', colorHocico: '#c9b9a0', grosorPatas: 0.65 },
    cabra: { largo: 0.95, altoPatas: 0.62, grosor: 0.48, ancho: 0.36, largoCuello: 0.34, alzaCuello: 0.8, cabeza: 0.72, largoHocico: 0.12, orejas: 'laterales', tamOrejas: 0.11, cuernos: 'curvos', largoCuernos: 0.2, cola: 'corta', perilla: true, ubre: false, patron: 'cinturon', colorBase: '#6b4a33', colorManchas: '#efe6d6', colorHocico: '#d9c3b0', colorCuernos: '#8f826e', grosorPatas: 0.55 },
    caballo: { largo: 1.65, altoPatas: 1.0, grosor: 0.7, ancho: 0.52, largoCuello: 0.75, alzaCuello: 0.9, inclinacion: 1.0, cabeza: 1.0, largoCabeza: 1.45, largoHocico: 0.2, orejas: 'punta', tamOrejas: 0.13, cuernos: 'ninguno', cola: 'crin', crin: true, ubre: false, patron: 'calcetines', colorBase: '#7b4a2a', colorManchas: '#f2ede6', colorCrin: '#2a1a12', colorHocico: '#3a2a22', grosorPatas: 0.75 },
    burro: { largo: 1.2, altoPatas: 0.72, grosor: 0.6, ancho: 0.45, largoCuello: 0.48, alzaCuello: 0.75, inclinacion: 0.9, cabeza: 0.95, largoCabeza: 1.3, largoHocico: 0.16, orejas: 'punta', tamOrejas: 0.27, cuernos: 'ninguno', cola: 'borla', crin: true, ubre: false, patron: 'liso', colorBase: '#8a8580', colorCrin: '#3a3633', colorHocico: '#e6e0d8', grosorPatas: 0.65 },
    perro: { largo: 0.72, altoPatas: 0.4, grosor: 0.38, ancho: 0.3, largoCuello: 0.22, alzaCuello: 0.8, inclinacion: 0.15, cabeza: 0.62, largoCabeza: 0.9, hocico: 'trufa', largoHocico: 0.13, orejas: 'caidas', tamOrejas: 0.1, cuernos: 'ninguno', cola: 'larga', pie: 'zarpa', ubre: false, patron: 'calcetines', colorBase: '#b9773a', colorManchas: '#f3ede4', colorHocico: '#1c1a19', colorPezunas: '#1c1a19', grosorPatas: 0.55 },
    gato: { largo: 0.46, altoPatas: 0.2, grosor: 0.25, ancho: 0.2, largoCuello: 0.1, alzaCuello: 0.7, inclinacion: 0, cabeza: 0.45, largoCabeza: 0.75, hocico: 'trufa', largoHocico: 0.04, orejas: 'punta', tamOrejas: 0.06, cuernos: 'ninguno', cola: 'larga', pie: 'zarpa', ubre: false, patron: 'calcetines', colorBase: '#e08a3a', colorManchas: '#f5efe6', colorHocico: '#e89a9a', colorPezunas: '#e89a9a', grosorPatas: 0.38 },
  },
  parametros: [
    { id: 'tamano', nombre: 'Escala general', tipo: 'rango', min: 0.3, max: 2, paso: 0.01, def: 1 },
    { id: 'largo', nombre: 'Largo del cuerpo (m)', tipo: 'rango', min: 0.3, max: 2.5, paso: 0.01, def: 1.7 },
    { id: 'altoPatas', nombre: 'Altura de las patas (m)', tipo: 'rango', min: 0.15, max: 1.3, paso: 0.01, def: 0.75 },
    { id: 'grosor', nombre: 'Altura del tronco (m)', tipo: 'rango', min: 0.15, max: 1.2, paso: 0.01, def: 0.8 },
    { id: 'ancho', nombre: 'Anchura (m)', tipo: 'rango', min: 0.12, max: 1.1, paso: 0.01, def: 0.62 },
    { id: 'grosorPatas', nombre: 'Grosor de las patas', tipo: 'rango', min: 0.2, max: 1.4, paso: 0.01, def: 0.85 },
    { id: 'largoCuello', nombre: 'Largo del cuello (m)', tipo: 'rango', min: 0.02, max: 1.0, paso: 0.01, def: 0.42 },
    { id: 'alzaCuello', nombre: 'Inclinación del cuello', tipo: 'rango', min: 0, max: 1.3, paso: 0.01, def: 0.35 },
    { id: 'inclinacion', nombre: 'Inclinación de la cabeza', tipo: 'rango', min: -0.3, max: 1.4, paso: 0.01, def: 0.55 },
    { id: 'cabeza', nombre: 'Tamaño de la cabeza', tipo: 'rango', min: 0.3, max: 1.6, paso: 0.01, def: 1 },
    { id: 'largoCabeza', nombre: 'Largo de la cabeza', tipo: 'rango', min: 0.6, max: 1.8, paso: 0.01, def: 1.1 },
    { id: 'hocico', nombre: 'Hocico', tipo: 'opcion', opciones: [['ancho', 'Ancho (vaca, caballo, oveja)'], ['disco', 'Disco (cerdo)'], ['trufa', 'Trufa (perro, gato)']], def: 'ancho' },
    { id: 'largoHocico', nombre: 'Largo del hocico (m)', tipo: 'rango', min: 0.02, max: 0.35, paso: 0.005, def: 0.2 },
    { id: 'orejas', nombre: 'Orejas', tipo: 'opcion', opciones: [['laterales', 'Laterales'], ['punta', 'De punta'], ['caidas', 'Caídas']], def: 'laterales' },
    { id: 'tamOrejas', nombre: 'Tamaño de orejas (m)', tipo: 'rango', min: 0.03, max: 0.35, paso: 0.005, def: 0.14 },
    { id: 'cuernos', nombre: 'Cuernos', tipo: 'opcion', opciones: [['ninguno', 'Sin cuernos'], ['cortos', 'Cortos'], ['largos', 'Largos (toro)'], ['curvos', 'Curvos (cabra)'], ['espiral', 'Espiral (carnero)']], def: 'cortos' },
    { id: 'largoCuernos', nombre: 'Largo de cuernos (m)', tipo: 'rango', min: 0.04, max: 0.6, paso: 0.01, def: 0.12 },
    { id: 'cola', nombre: 'Cola', tipo: 'opcion', opciones: [['borla', 'Con borla (vaca)'], ['crin', 'De crin (caballo)'], ['larga', 'Larga (perro, gato)'], ['corta', 'Corta (oveja, cabra)'], ['rizada', 'Rizada (cerdo)']], def: 'borla' },
    { id: 'pie', nombre: 'Pies', tipo: 'opcion', opciones: [['pezuna', 'Pezuñas'], ['zarpa', 'Zarpas']], def: 'pezuna' },
    { id: 'patron', nombre: 'Pelaje', tipo: 'opcion', opciones: [['liso', 'Liso'], ['manchas', 'Manchas'], ['cinturon', 'Cinturón'], ['calcetines', 'Calcetines'], ['cara_blanca', 'Cara blanca'], ['cabeza_patas', 'Cabeza y patas']], def: 'manchas' },
    { id: 'cantidadManchas', nombre: 'Cantidad de manchas', tipo: 'rango', min: 2, max: 30, paso: 1, def: 11 },
    { id: 'lana', nombre: 'Lana', tipo: 'si', def: false },
    { id: 'crin', nombre: 'Crin en el cuello', tipo: 'si', def: false },
    { id: 'ubre', nombre: 'Ubre', tipo: 'si', def: true },
    { id: 'perilla', nombre: 'Perilla', tipo: 'si', def: false },
    { id: 'colorBase', nombre: 'Pelaje', tipo: 'color', def: '#f5f2ed' },
    { id: 'colorManchas', nombre: 'Manchas', tipo: 'color', def: '#1e1c1b' },
    { id: 'colorHocico', nombre: 'Hocico', tipo: 'color', def: '#e3a29b' },
    { id: 'colorPezunas', nombre: 'Pezuñas / uñas', tipo: 'color', def: '#2e2622' },
    { id: 'colorCuernos', nombre: 'Cuernos', tipo: 'color', def: '#e8dcc0' },
    { id: 'colorCrin', nombre: 'Crin y borla', tipo: 'color', def: '#262220' },
  ],

  construir(p, azar) {
    const k = p.tamano;
    const L = p.largo * k, Lg = p.altoPatas * k, T = p.grosor * k, W = p.ancho * k;
    const Nl = p.largoCuello * k, a = p.alzaCuello, cab = p.cabeza * k;
    const rl = 0.092 * p.grosorPatas * k * Math.sqrt(p.grosor / 0.8);
    const m = new Modelo('Animal', {
      base: { color: p.colorBase, rugosidad: 0.9 },
      manchas: { color: p.colorManchas, rugosidad: 0.9 },
      hocico: { color: p.colorHocico, rugosidad: 0.6 },
      nariz: { color: '#1b1716', rugosidad: 0.35 },
      ojo: { color: '#141210', rugosidad: 0.12 },
      brillo: { color: '#ffffff', rugosidad: 0.2, emisivo: '#ffffff', intensidad: 0.3 },
      pezuna: { color: p.colorPezunas, rugosidad: 0.5 },
      cuerno: { color: p.colorCuernos, rugosidad: 0.45 },
      crin: { color: p.colorCrin, rugosidad: 0.95 },
      lana: { color: p.colorBase, rugosidad: 1 },
      ubre: { color: '#f0a9a2', rugosidad: 0.6 },
      orejaInt: { color: '#e9a3a0', rugosidad: 0.7 },
    });

    // ----- Esqueleto -----
    const y0 = Lg + T * 0.45;
    const zH = -L * 0.34, zC = L * 0.32;
    const baseCuello = V(0, y0 + T * 0.18, L * 0.38);
    const finCuello = baseCuello.clone().add(V(0, Math.sin(a), Math.cos(a)).multiplyScalar(Nl + T * 0.12));
    const inc = p.inclinacion;
    const dir = V(0, -Math.sin(inc), Math.cos(inc)); // hacia donde mira el hocico
    const hw = 0.15 * cab, hh = 0.17 * cab, hl = 0.17 * cab * p.largoCabeza;
    const centroCab = finCuello.clone().add(dir.clone().multiplyScalar(hl * 0.55)).add(V(0, hh * 0.15, 0));
    m.hueso('Spine', 'Root', [0, y0, 0]);
    m.hueso('Hips', 'Spine', [0, y0, zH * 0.6]);
    m.hueso('Chest', 'Spine', [0, y0, zC * 0.6]);
    m.hueso('Neck', 'Chest', baseCuello.toArray());
    m.hueso('Head', 'Neck', finCuello.toArray());
    const oreja = centroCab.clone().add(V(0, hh * 0.55, 0)).add(dir.clone().multiplyScalar(-hl * 0.35));
    m.simetrico((S, x) => m.hueso(`Ear_${S}`, 'Head', [x * hw * 0.8, oreja.y, oreja.z]));
    const colaBase = V(0, y0 + T * 0.32, -L * 0.5);
    let colaMedio, colaFin;
    if (p.cola === 'larga') { colaMedio = colaBase.clone().add(V(0, T * 0.35, -L * 0.18)); colaFin = colaMedio.clone().add(V(0, T * 0.45, -L * 0.12)); }
    else if (p.cola === 'crin') { colaMedio = colaBase.clone().add(V(0, -Lg * 0.3, -T * 0.25)); colaFin = colaMedio.clone().add(V(0, -Lg * 0.4, -T * 0.05)); }
    else if (p.cola === 'borla') { colaMedio = colaBase.clone().add(V(0, -Lg * 0.45, -T * 0.08)); colaFin = colaMedio.clone().add(V(0, -Lg * 0.35, 0)); }
    else { colaMedio = colaBase.clone().add(V(0, T * 0.04, -T * 0.12)); colaFin = colaMedio.clone().add(V(0, -T * 0.05, -T * 0.08)); }
    m.hueso('Tail_1', 'Hips', colaBase.toArray());
    m.hueso('Tail_2', 'Tail_1', colaMedio.toArray());
    const patas = [];
    m.simetrico((S, x) => {
      const xf = x * W * 0.3, xb = x * W * 0.3;
      m.hueso(`FrontUpper_${S}`, 'Chest', [xf, y0 - T * 0.12, L * 0.33]);
      m.hueso(`FrontLower_${S}`, `FrontUpper_${S}`, [xf, Lg * 0.52, L * 0.33 - Lg * 0.02]);
      m.hueso(`FrontFoot_${S}`, `FrontLower_${S}`, [xf, Lg * 0.07, L * 0.33]);
      m.hueso(`BackUpper_${S}`, 'Hips', [xb, y0 - T * 0.08, -L * 0.33]);
      m.hueso(`BackLower_${S}`, `BackUpper_${S}`, [xb, Lg * 0.45, -L * 0.33 - Lg * 0.1]);
      m.hueso(`BackFoot_${S}`, `BackLower_${S}`, [xb, Lg * 0.07, -L * 0.33 - Lg * 0.02]);
      patas.push(['Front', S, x], ['Back', S, x]);
    });

    // ----- Pelaje (material por triángulo) -----
    const manchas = [];
    const nM = Math.round(p.cantidadManchas);
    for (let i = 0; i < nM; i++) {
      const c = V(azar.entre(-1, 1) * W * 0.5, y0 + azar.entre(-0.5, 0.6) * T, azar.entre(-0.55, 0.62) * L);
      const r = T * azar.entre(0.18, 0.36);
      manchas.push([c, r]);
      for (let j = 0; j < 2; j++) manchas.push([c.clone().add(V(azar.entre(-1, 1), azar.entre(-1, 1), azar.entre(-1, 1)).multiplyScalar(r * 0.7)), r * azar.entre(0.5, 0.8)]);
    }
    if (p.patron === 'manchas' && azar() < 0.7) manchas.push([centroCab.clone().add(V(azar.entre(-1, 1) * hw, hh * 0.3, 0)), hh * azar.entre(0.5, 0.9)]);
    const zona = (zonaPieza) => (c) => {
      switch (p.patron) {
        case 'manchas': return manchas.some(([q, r]) => c.distanceToSquared(q) < r * r) ? 'manchas' : 'base';
        case 'cinturon': return zonaPieza === 'cuerpo' && Math.abs(c.z - L * 0.02) < L * 0.14 ? 'manchas' : 'base';
        case 'calcetines': return zonaPieza === 'pataBaja' || (zonaPieza === 'cabeza' && c.x * c.x < (hw * 0.25) ** 2 && c.z > centroCab.z) ? 'manchas' : 'base';
        case 'cara_blanca': return zonaPieza === 'cabeza' || (zonaPieza === 'cuerpo' && c.y < y0 - T * 0.3) ? 'manchas' : 'base';
        case 'cabeza_patas': return zonaPieza === 'cabeza' || zonaPieza === 'pataBaja' ? 'manchas' : 'base';
        default: return 'base';
      }
    };
    const pielCuerpo = p.lana ? 'lana' : zona('cuerpo');

    // ----- Tronco -----
    const tronco = F.deformar(F.capsula(T * 0.5, Math.max(0.01, L - T), { r: [Math.PI / 2, 0, 0], p: [0, y0, -L * 0.02], s: [W / T, 1, 1] }, 28), (v) => {
      const u = v.z / (L * 0.5);
      if (v.y < y0) v.y -= T * 0.08 * Math.max(0, 1 - u * u) * ((y0 - v.y) / (T * 0.5));
      if (v.y > y0) v.y -= T * 0.05 * Math.max(0, 1 - (u * 1.4) ** 2) * ((v.y - y0) / (T * 0.5));
    });
    m.parte(tronco, pielCuerpo, 'Spine');
    m.parte(F.esfera(1, { p: [0, y0 + T * 0.04, zH * 0.95], s: [W * 0.5, T * 0.5, L * 0.22] }, 26), pielCuerpo, 'Hips');
    m.parte(F.esfera(1, { p: [0, y0 + T * 0.02, zC * 0.95], s: [W * 0.5, T * 0.52, L * 0.22] }, 26), pielCuerpo, 'Chest');
    if (p.lana) {
      const pos = tronco.attributes.position, v = V();
      const n = Math.round(30 + 40 * (L * W) / 0.5);
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pos, azar.entero(0, pos.count - 1));
        if (v.y < y0 - T * 0.42) continue;
        const r = T * azar.entre(0.13, 0.2);
        const hueso = v.z < zH * 0.5 ? 'Hips' : v.z > zC * 0.5 ? 'Chest' : 'Spine';
        m.parte(F.esfera(r, { p: [v.x * 1.02, v.y, v.z] }, 8), 'lana', hueso);
      }
    }

    // ----- Cuello y cabeza -----
    const rCuello = Math.min(T * 0.3, hh * 1.05);
    m.parte(F.barra(baseCuello.clone().add(V(0, -T * 0.12, -T * 0.1)).toArray(), finCuello.toArray(), rCuello * 1.3, rCuello * 0.85, 12), zona('cuello'), 'Neck', { suave: Math.min(T * 0.3, Nl) });
    m.parte(F.esfera(rCuello * 0.86, { p: finCuello.toArray() }, 12), zona('cuello'), 'Neck');
    const rotCab = [inc, 0, 0];
    m.parte(F.esfera(1, { p: centroCab.toArray(), r: rotCab, s: [hw, hh, hl] }, 16), zona('cabeza'), 'Head');
    const sl = p.largoHocico * k, punta = centroCab.clone().add(dir.clone().multiplyScalar(hl * 0.75 + sl * 0.5));
    if (p.hocico === 'disco') {
      const c = centroCab.clone().add(dir.clone().multiplyScalar(hl * 0.85 + sl * 0.5)).add(V(0, -hh * 0.15, 0));
      const rs = hw * 0.62;
      m.parte(F.cilindro(rs, rs * 1.08, sl, { p: c.toArray(), r: [inc + Math.PI / 2, 0, 0] }, 14), 'hocico', 'Head');
      const cara = c.clone().add(dir.clone().multiplyScalar(sl * 0.5 + 0.002));
      m.simetrico((S, x) => m.parte(F.esfera(rs * 0.18, { p: cara.clone().add(V(x * rs * 0.35, 0, 0)).toArray(), r: rotCab, s: [1, 1.3, 0.4] }, 8), 'nariz', 'Head'));
    } else if (p.hocico === 'trufa') {
      const c = centroCab.clone().add(dir.clone().multiplyScalar(hl * 0.55 + sl * 0.5)).add(V(0, -hh * 0.25, 0));
      m.parte(F.capsula(hh * 0.42, sl, { p: c.toArray(), r: [inc + Math.PI / 2, 0, 0], s: [1.1, 1, 0.85] }, 12), zona('cabeza'), 'Head');
      m.parte(F.esfera(hh * 0.2, { p: c.clone().add(dir.clone().multiplyScalar(sl * 0.5 + hh * 0.36)).add(V(0, hh * 0.12, 0)).toArray(), s: [1.2, 0.85, 0.9] }, 10), p.colorHocico.toLowerCase() === p.colorBase.toLowerCase() ? 'nariz' : 'hocico', 'Head');
    } else {
      const c = centroCab.clone().add(dir.clone().multiplyScalar(hl * 0.62 + sl * 0.35)).add(V(0, -hh * 0.12, 0));
      m.parte(F.esfera(1, { p: c.toArray(), r: rotCab, s: [hw * 0.9, hh * 0.72, sl * 0.7 + hl * 0.2] }, 14), 'hocico', 'Head');
      const nar = c.clone().add(dir.clone().multiplyScalar(sl * 0.6 + hl * 0.15)).add(V(0, hh * 0.15, 0));
      m.simetrico((S, x) => m.parte(F.esfera(hh * 0.11, { p: nar.clone().add(V(x * hw * 0.42, 0, 0)).toArray(), r: rotCab, s: [1, 0.7, 0.5] }, 8), 'nariz', 'Head'));
    }
    if (p.perilla) m.parte(F.cono(hw * 0.25, hh * 0.9, { p: punta.clone().add(V(0, -hh * 0.75, -sl * 0.4)).toArray(), r: [Math.PI, 0, 0] }, 7), 'crin', 'Head');
    // Ojos a los lados de la cabeza
    m.simetrico((S, x) => {
      const ojo = centroCab.clone().add(V(x * hw * 0.82, hh * 0.32, 0)).add(dir.clone().multiplyScalar(hl * 0.2));
      m.parte(F.esfera(hh * 0.15, { p: ojo.toArray(), s: [0.6, 1, 1] }, 10), 'ojo', 'Head');
      m.parte(F.esfera(hh * 0.045, { p: ojo.clone().add(V(x * hh * 0.08, hh * 0.06, hh * 0.06)).toArray() }, 6), 'brillo', 'Head');
    });
    // Orejas
    const eo = p.tamOrejas * k;
    m.simetrico((S, x) => {
      const b = V(...m.pos(`Ear_${S}`));
      let c, s, r;
      if (p.orejas === 'punta') { c = b.clone().add(V(x * eo * 0.15, eo * 0.75, 0)); s = [eo * 0.38, eo, eo * 0.14]; r = [0.1, 0, -x * 0.25]; }
      else if (p.orejas === 'caidas') { c = b.clone().add(V(x * eo * 0.55, -eo * 0.35, eo * 0.25)); s = [eo * 0.16, eo, eo * 0.6]; r = [0.3, 0, x * 0.6]; }
      else { c = b.clone().add(V(x * eo * 0.85, -eo * 0.05, 0)); s = [eo, eo * 0.3, eo * 0.5]; r = [0, 0, -x * 0.25]; }
      m.parte(F.esfera(1, { p: c.toArray(), r, s }, 10), zona('cabeza'), `Ear_${S}`);
      if (p.orejas !== 'caidas') m.parte(F.esfera(1, { p: c.clone().add(V(0, p.orejas === 'punta' ? -eo * 0.05 : -eo * 0.04, s[2] * 0.55)).toArray(), r, s: [s[0] * 0.7, s[1] * 0.75, s[2] * 0.5] }, 10), 'orejaInt', `Ear_${S}`);
    });
    // Cuernos
    const lc = p.largoCuernos * k, rc = Math.max(0.012 * k, lc * 0.18);
    if (p.cuernos !== 'ninguno') m.simetrico((S, x) => {
      const base = centroCab.clone().add(V(x * hw * 0.55, hh * 0.78, 0)).add(dir.clone().multiplyScalar(-hl * 0.15));
      let pts = [];
      if (p.cuernos === 'cortos') pts = [base, base.clone().add(V(x * lc * 0.7, lc * 0.5, lc * 0.1)), base.clone().add(V(x * lc * 0.95, lc * 1.0, lc * 0.15))];
      else if (p.cuernos === 'largos') pts = [base, base.clone().add(V(x * lc * 0.8, lc * 0.05, 0)), base.clone().add(V(x * lc * 1.3, lc * 0.45, lc * 0.15)), base.clone().add(V(x * lc * 1.45, lc * 0.9, lc * 0.35))];
      else {
        const vueltas = p.cuernos === 'espiral' ? 4.2 : 1.5, n = p.cuernos === 'espiral' ? 12 : 6;
        for (let i = 0; i <= n; i++) {
          const t = i / n, th = t * vueltas, R = lc * (1 - 0.45 * t);
          pts.push(base.clone().add(V(x * (lc * 0.15 + lc * 0.5 * t), R * Math.sin(th), -R * (1 - Math.cos(th)))));
        }
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const r0 = rc * (1 - (i / (pts.length - 1)) * 0.8), r1 = rc * (1 - ((i + 1) / (pts.length - 1)) * 0.8);
        m.parte(F.barra(pts[i].toArray(), pts[i + 1].toArray(), r0, r1, 8), 'cuerno', 'Head');
        m.parte(F.esfera(r1, { p: pts[i + 1].toArray() }, 8), 'cuerno', 'Head');
      }
    });
    // Crin
    if (p.crin) {
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n, q = baseCuello.clone().lerp(finCuello, t).add(V(0, rCuello * (0.95 - 0.2 * t), -rCuello * 0.2));
        m.parte(F.esfera(1, { p: q.toArray(), r: [a - Math.PI / 2 + 0.3, 0, 0], s: [rCuello * 0.22, rCuello * 0.55, Nl / n * 1.4] }, 8), 'crin', 'Neck');
      }
      m.parte(F.esfera(1, { p: centroCab.clone().add(V(0, hh * 0.85, hl * 0.05)).toArray(), r: [inc, 0, 0], s: [hw * 0.3, hh * 0.25, hl * 0.4] }, 8), 'crin', 'Head');
    }

    // ----- Patas -----
    for (const [F_, S, x] of patas) {
      const up = V(...m.pos(`${F_}Upper_${S}`)), lo = V(...m.pos(`${F_}Lower_${S}`)), ft = V(...m.pos(`${F_}Foot_${S}`));
      const delantera = F_ === 'Front';
      m.parte(F.barra(up.toArray(), lo.toArray(), rl * (delantera ? 1.45 : 1.7), rl * 1.0, 10), zona('pata'), `${F_}Upper_${S}`);
      m.parte(F.esfera(1, { p: up.clone().add(V(0, -T * 0.1, delantera ? 0 : -rl * 0.4)).toArray(), s: [rl * 1.9, T * 0.32, delantera ? T * 0.2 : T * 0.26] }, 10), zona('pata'), `${F_}Upper_${S}`);
      m.parte(F.esfera(rl * 1.05, { p: lo.toArray() }, 10), zona('pata'), `${F_}Lower_${S}`);
      m.parte(F.barra(lo.toArray(), ft.toArray(), rl * 0.98, rl * 0.82, 10), zona('pataBaja'), `${F_}Lower_${S}`);
      if (p.pie === 'zarpa') {
        m.parte(F.esfera(1, { p: [ft.x, rl * 0.8, ft.z + rl * 0.5], s: [rl * 1.15, rl * 0.85, rl * 1.6] }, 10), zona('pataBaja'), `${F_}Foot_${S}`);
      } else {
        m.parte(F.cilindro(rl * 0.92, rl * 1.08, Lg * 0.1, { p: [ft.x, Lg * 0.05, ft.z + rl * 0.1] }, 10), 'pezuna', `${F_}Foot_${S}`);
        m.parte(F.esfera(rl * 0.86, { p: [ft.x, Lg * 0.1, ft.z] }, 10), zona('pataBaja'), `${F_}Foot_${S}`);
      }
    }
    if (p.ubre) {
      const c = V(0, y0 - T * 0.5, zH * 0.55);
      m.parte(F.esfera(1, { p: c.toArray(), s: [W * 0.22, T * 0.16, L * 0.1] }, 12), 'ubre', 'Hips');
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.parte(F.cilindro(T * 0.022, T * 0.03, T * 0.1, { p: [dx * W * 0.08, c.y - T * 0.17, c.z + dz * L * 0.04] }, 6), 'ubre', 'Hips');
    }

    // ----- Cola -----
    const rcola = Math.max(0.012 * k, T * 0.035);
    if (p.cola === 'rizada') m.parte(F.toro(T * 0.06, rcola * 0.9, { p: colaBase.clone().add(V(0, 0, -T * 0.06)).toArray(), r: [0, Math.PI / 2, 0] }, Math.PI * 1.6, 12), zona('cuerpo'), 'Tail_1');
    else if (p.cola === 'corta') m.parte(F.esfera(1, { p: colaMedio.toArray(), s: [T * 0.1, T * 0.14, T * 0.12] }, 10), p.lana ? 'lana' : zona('cuerpo'), 'Tail_1');
    else if (p.cola === 'crin') {
      m.parte(F.barra(colaBase.toArray(), colaMedio.toArray(), T * 0.1, T * 0.13, 10), 'crin', 'Tail_1');
      m.parte(F.barra(colaMedio.toArray(), colaFin.toArray(), T * 0.13, T * 0.04, 10), 'crin', 'Tail_2');
      m.parte(F.esfera(T * 0.1, { p: colaBase.toArray() }, 8), 'crin', 'Tail_1');
    } else {
      m.parte(F.tubo(colaBase.toArray(), colaMedio.toArray(), p.cola === 'larga' ? rcola * 1.4 : rcola), zona('cuerpo'), 'Tail_1');
      m.parte(F.tubo(colaMedio.toArray(), colaFin.toArray(), p.cola === 'larga' ? rcola * 1.1 : rcola * 0.9), zona('cuerpo'), 'Tail_2');
      if (p.cola === 'borla') m.parte(F.esfera(1, { p: colaFin.toArray(), s: [rcola * 2.4, Lg * 0.12, rcola * 2.4] }, 8), 'crin', 'Tail_2');
    }

    const objeto = m.construir({ facetado: p.facetado });

    // ----- Animaciones -----
    const zancada = (u, ciclo, A) => {
      u = ((u % 1) + 1) % 1;
      if (u < ciclo) return { ang: A * (1 - 2 * (u / ciclo)), alza: 0 };
      const t = (u - ciclo) / (1 - ciclo);
      return { ang: -A + 2 * A * suave(t), alza: Math.sin(Math.PI * t) };
    };
    const andar = (P, f, desfases, ciclo, A, flex) => {
      for (const [F_, S] of patas) {
        const { ang, alza } = zancada(f + desfases[F_ + S], ciclo, A);
        const delantera = F_ === 'Front';
        P.rot(`${F_}Upper_${S}`, -ang - (delantera ? 0.15 : -0.1) * alza);
        P.rot(`${F_}Lower_${S}`, (delantera ? 1.25 : 0.85) * flex * alza);
        P.rot(`${F_}Foot_${S}`, -(delantera ? 0.6 : 0.3) * flex * alza + ang * 0.4);
      }
    };
    const alcance = Nl + T * 0.12 + hl * 1.4 + sl;
    const angComer = Math.min(1.75, a + Math.asin(Math.min(0.98, Math.max(0, (baseCuello.y - 0.06 * k) / alcance))));
    const animaciones = [
      clip('Reposo', 4, objeto, (f, P) => {
        P.mov('Spine', 0, T * 0.008 * onda(f, 2));
        P.rot('Tail_1', 0, 0, 0.35 * onda(f, 2) * tramo(f, 0.05, 0.15, 0.5, 0.6)); P.rot('Tail_2', 0, 0, 0.25 * onda(f, 2, 0.15) * tramo(f, 0.05, 0.15, 0.5, 0.6));
        P.rot('Ear_L', 0, 0, 0.35 * tramo(f, 0.62, 0.65, 0.67, 0.72)); P.rot('Ear_R', 0, 0, -0.25 * tramo(f, 0.3, 0.33, 0.35, 0.4));
        P.rot('Neck', 0.04 * onda(f), 0.25 * tramo(f, 0.4, 0.55, 0.8, 0.95));
        P.rot('Head', 0, 0.12 * tramo(f, 0.45, 0.6, 0.8, 0.95), 0.08 * tramo(f, 0.45, 0.6, 0.8, 0.95));
      }),
      clip('Caminar', 1.3, objeto, (f, P) => {
        andar(P, f, { BackL: 0, FrontL: 0.25, BackR: 0.5, FrontR: 0.75 }, 0.65, 0.32, 1);
        P.mov('Spine', 0, -T * 0.015 * Math.abs(onda(f, 2)));
        P.rot('Spine', 0, 0, 0.025 * onda(f)); P.rot('Hips', 0, 0.04 * onda(f));
        P.rot('Neck', 0.06 * onda(f, 2, 0.1)); P.rot('Head', -0.03 * onda(f, 2, 0.1));
        P.rot('Tail_1', 0, 0, 0.12 * onda(f)); P.rot('Tail_2', 0, 0, 0.12 * onda(f, 1, 0.15));
      }),
      clip('Trotar', 0.7, objeto, (f, P) => {
        andar(P, f, { BackL: 0, FrontR: 0, BackR: 0.5, FrontL: 0.5 }, 0.5, 0.42, 1.2);
        P.mov('Spine', 0, T * 0.04 * Math.abs(onda(f, 1, 0.2)) - T * 0.02);
        P.rot('Neck', 0.07 * onda(f, 2)); P.rot('Tail_1', 0.2, 0, 0.1 * onda(f));
      }),
      clip('Galopar', 0.55, objeto, (f, P) => {
        andar(P, f, { BackL: 0, BackR: 0.1, FrontL: 0.48, FrontR: 0.58 }, 0.4, 0.6, 1.4);
        P.rot('Spine', 0.08 * onda(f, 1, 0.1)); P.rot('Hips', -0.12 * onda(f, 1, 0.3)); P.rot('Chest', 0.1 * onda(f, 1, 0.8));
        P.mov('Spine', 0, T * 0.08 * Math.max(0, onda(f, 1, 0.05)) - T * 0.02);
        P.rot('Neck', -0.12 * onda(f, 1, 0.1)); P.rot('Head', 0.08 * onda(f, 1, 0.1));
        P.rot('Ear_L', -0.3); P.rot('Ear_R', -0.3); P.rot('Tail_1', 0.45, 0, 0.1 * onda(f)); P.rot('Tail_2', 0.2 * onda(f, 1, 0.2));
      }),
      clip('Comer', 3.2, objeto, (f, P) => {
        const b = tramo(f, 0, 0.18, 0.82, 1);
        P.rot('Neck', angComer * b, 0.08 * onda(f) * b); P.rot('Head', 0.25 * b + 0.06 * Math.abs(onda(f, 6)) * b);
        P.rot('Chest', 0.04 * b); P.mov('Chest', 0, -T * 0.03 * b);
        for (const S of ['L', 'R']) { P.rot(`FrontUpper_${S}`, -0.06 * b); P.rot(`FrontLower_${S}`, 0.12 * b); P.rot(`FrontFoot_${S}`, -0.06 * b); }
        P.rot('Tail_1', 0, 0, 0.3 * onda(f, 3) * b);
      }),
      clip('Tumbado', 4, objeto, (f, P) => {
        const r = onda(f);
        P.mov('Spine', 0, -(Lg - T * 0.12) + T * 0.01 * r, 0); P.rot('Spine', 0, 0, 0.08);
        for (const S of ['L', 'R']) {
          P.rot(`FrontUpper_${S}`, -1.35); P.rot(`FrontLower_${S}`, 2.6); P.rot(`FrontFoot_${S}`, 0.3);
          P.rot(`BackUpper_${S}`, -1.25, 0, (S === 'L' ? 1 : -1) * 0.2); P.rot(`BackLower_${S}`, 2.4); P.rot(`BackFoot_${S}`, 0.3);
        }
        P.rot('Neck', -0.15 + 0.03 * r, 0.25 * onda(f, 1, 0.2)); P.rot('Tail_1', 0, 0.4, 0.1 * r);
      }),
    ];
    if (p.pie === 'zarpa') {
      animaciones.push(clip('Sentado', 3, objeto, (f, P) => {
        const r = onda(f), ang = 0.6;
        P.rot('Spine', -ang); P.mov('Spine', 0, -Lg * 0.36, -L * 0.18);
        for (const S of ['L', 'R']) {
          P.rot(`FrontUpper_${S}`, ang); P.rot(`FrontLower_${S}`, 0); P.rot(`FrontFoot_${S}`, 0);
          P.rot(`BackUpper_${S}`, -0.95); P.rot(`BackLower_${S}`, 2.3); P.rot(`BackFoot_${S}`, -0.75);
        }
        P.rot('Neck', ang * 0.4 + 0.03 * r); P.rot('Head', 0.15, 0.2 * onda(f, 1, 0.3));
        P.rot('Tail_1', 0.9, 0, 0.3 * onda(f, 2)); P.rot('Ear_L', 0, 0, 0.2 * tramo(f, 0.5, 0.55, 0.57, 0.62));
      }));
    }
    return { objeto, animaciones };
  },
};
