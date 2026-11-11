// Auto-rig: pone un esqueleto y animaciones a cualquier malla (por ejemplo, un modelo realista
// generado por IA a partir de una foto, o un escaneo por fotogrametría).
//
// 1. Se orienta la malla (mirando a +Z, apoyada en y = 0) y se escala a su tamaño real.
// 2. Se miden patas, tronco, cabeza, entrepierna, brazos... y con eso se ajusta el esqueleto de un generador.
// 3. Cada vértice se asocia a los huesos más cercanos (con reglas de lado y altura) y se suavizan los pesos.
// 4. Si los brazos están en cruz (pose en T), la malla se lleva a la pose de reposo del generador.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _m = new THREE.Matrix4();

/** Saca las piezas de una escena glTF a coordenadas del mundo: [{ geo, material, nombre }] */
export function extraerPiezas(escena) {
  // Los esqueletos que traiga el archivo vuelven a su pose de reposo (aunque se estuviera reproduciendo una animación)
  escena.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); });
  escena.updateMatrixWorld(true);
  const piezas = [];
  escena.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    let g = o.geometry.clone();
    g.morphAttributes = {};
    if (o.isSkinnedMesh) { // se congela la pose actual
      o.skeleton.update();
      const pos = g.attributes.position, nueva = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, _v); nueva[i * 3] = _v.x; nueva[i * 3 + 1] = _v.y; nueva[i * 3 + 2] = _v.z; }
      g.setAttribute('position', new THREE.BufferAttribute(nueva, 3));
      g.deleteAttribute('normal');
    }
    for (const k of ['skinIndex', 'skinWeight', 'skinIndex1', 'skinWeight1']) if (g.attributes[k]) g.deleteAttribute(k);
    if (g.index === null && g.attributes.position.count > 3) { /* no indexada: vale igual */ }
    g.applyMatrix4(o.matrixWorld);
    if (!g.attributes.normal) g.computeVertexNormals();
    piezas.push({ geo: g, material: o.material, nombre: o.name || 'Malla' });
  });
  if (!piezas.length) throw new Error('El archivo no tiene ninguna malla.');
  return piezas;
}

/** Nube de puntos (submuestreada) de todas las piezas */
function nube(piezas, max = 60000) {
  const total = piezas.reduce((s, p) => s + p.geo.attributes.position.count, 0);
  const paso = Math.max(1, Math.floor(total / max)), pts = [];
  for (const p of piezas) { const a = p.geo.attributes.position; for (let i = 0; i < a.count; i += paso) pts.push(a.getX(i), a.getY(i), a.getZ(i)); }
  return new Float32Array(pts);
}
function caja(pts) {
  const b = new THREE.Box3();
  for (let i = 0; i < pts.length; i += 3) b.expandByPoint(_v.set(pts[i], pts[i + 1], pts[i + 2]));
  return b;
}
const filtrar = (pts, fn) => { const r = []; for (let i = 0; i < pts.length; i += 3) if (fn(pts[i], pts[i + 1], pts[i + 2])) r.push(pts[i], pts[i + 1], pts[i + 2]); return r; };
const media = (arr) => { const c = [0, 0, 0], n = arr.length / 3; for (let i = 0; i < arr.length; i += 3) { c[0] += arr[i]; c[1] += arr[i + 1]; c[2] += arr[i + 2]; } return n ? c.map((x) => x / n) : null; };

/** Adivina hacia dónde mira el modelo original: '+z', '-z', '+x' o '-x' */
export function adivinarFrente(piezas, tipo) {
  const p = nube(piezas, 30000), b = caja(p), t = b.getSize(new THREE.Vector3()), H = t.y;
  if (tipo === 'humanoide') {
    // Los hombros marcan el eje ancho; los pies (dedos) apuntan hacia delante
    const pecho = filtrar(p, (x, y) => y > b.min.y + H * 0.7 && y < b.min.y + H * 0.8);
    const bp = caja(new Float32Array(pecho)), tp = bp.getSize(new THREE.Vector3());
    const ejeZ = tp.x >= tp.z; // si es más ancho en X, mira por Z
    const pies = filtrar(p, (x, y) => y < b.min.y + H * 0.05), todo = media(p), mp = media(pies);
    if (!mp) return '+z';
    return ejeZ ? (mp[2] >= todo[2] ? '+z' : '-z') : (mp[0] >= todo[0] ? '+x' : '-x');
  }
  // Animales: eje largo; la cabeza está en el extremo con el punto más alto
  const ejeZ = t.z >= t.x, k = ejeZ ? 2 : 0, min = ejeZ ? b.min.z : b.min.x, L = ejeZ ? t.z : t.x;
  let altoA = -1e9, altoB = -1e9;
  for (let i = 0; i < p.length; i += 3) {
    const u = (p[i + k] - min) / L;
    if (u < 0.18) altoA = Math.max(altoA, p[i + 1]); else if (u > 0.82) altoB = Math.max(altoB, p[i + 1]);
  }
  return ejeZ ? (altoB >= altoA ? '+z' : '-z') : (altoB >= altoA ? '+x' : '-x');
}

/** Gira para mirar a +Z, escala a la altura pedida, apoya en el suelo y centra */
export function normalizar(piezas, { mira = '+z', altura = 1 }) {
  const ang = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 }[mira] ?? 0;
  const rot = new THREE.Matrix4().makeRotationY(ang);
  for (const p of piezas) p.geo.applyMatrix4(rot);
  const b = caja(nube(piezas)), H = Math.max(1e-6, b.max.y - b.min.y), e = altura / H;
  const c = b.getCenter(new THREE.Vector3());
  const m = new THREE.Matrix4().makeScale(e, e, e).multiply(new THREE.Matrix4().makeTranslation(-c.x, -b.min.y, -c.z));
  for (const p of piezas) p.geo.applyMatrix4(m);
  return piezas;
}

/** Mide un cuadrúpedo y devuelve parámetros para el generador «cuadrupedo» (en su sistema: cuerpo centrado en z = 0) */
export function medirCuadrupedo(piezas) {
  const p = nube(piezas), b = caja(p), H = b.max.y, Ltot = b.max.z - b.min.z;
  // Pies: puntos bajos agrupados en 4 (k-medias)
  const bajos = filtrar(p, (x, y) => y < H * 0.12);
  const c = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => [sx * (b.max.x - b.min.x) / 4, (sz > 0 ? b.max.z - Ltot * 0.25 : b.min.z + Ltot * 0.25)]);
  for (let it = 0; it < 12; it++) {
    const s = c.map(() => [0, 0, 0]);
    for (let i = 0; i < bajos.length; i += 3) {
      let mejor = 0, dm = 1e18;
      c.forEach(([x, z], j) => { const d = (bajos[i] - x) ** 2 + (bajos[i + 2] - z) ** 2; if (d < dm) { dm = d; mejor = j; } });
      s[mejor][0] += bajos[i]; s[mejor][1] += bajos[i + 2]; s[mejor][2]++;
    }
    s.forEach(([x, z, n], j) => { if (n) c[j] = [x / n, z / n]; });
  }
  const zf = (c[0][1] + c[1][1]) / 2, zb = (c[2][1] + c[3][1]) / 2;
  const separacion = (Math.abs(c[0][0]) + Math.abs(c[1][0]) + Math.abs(c[2][0]) + Math.abs(c[3][0])) / 4;
  const zc = (zf + zb) / 2;
  const L = Math.max(0.1, (zf - zb) / 0.66);
  // Tronco: franja central
  const franja = filtrar(p, (x, y, z) => Math.abs(z - zc) < L * 0.1 && y > H * 0.15);
  const bf = caja(new Float32Array(franja.length ? franja : [0, H * 0.5, 0, 0, H * 0.9, 0]));
  const T = Math.max(0.05, bf.max.y - bf.min.y), Lg = Math.max(0.05, bf.min.y + T * 0.13);
  // Cabeza: el extremo delantero
  const cab = filtrar(p, (x, y, z) => z > b.max.z - Ltot * 0.12);
  const bc = caja(new Float32Array(cab)), mc = media(cab) || [0, H, b.max.z];
  const altoCab = Math.max(0.05, bc.max.y - bc.min.y);
  const cabeza = Math.max(0.3, Math.min(1.8, (altoCab / 2) / 0.17));
  const hl = 0.17 * cabeza * 1.1;
  const y0 = Lg + T * 0.45;
  const base = new THREE.Vector3(0, y0 + T * 0.18, L * 0.38);
  const objetivo = new THREE.Vector3(0, mc[1], mc[2] - zc - hl * 0.55);
  const v = objetivo.sub(base);
  return {
    desplazarZ: -zc,
    params: {
      tamano: 1, largo: L, altoPatas: Lg, grosor: T, ancho: Math.max(0.1, separacion / 0.3),
      largoCuello: Math.max(0.02, v.length() - T * 0.12), alzaCuello: Math.atan2(v.y, Math.max(0.01, v.z)), cabeza, largoCabeza: 1.1,
    },
  };
}

/** Mide una persona: altura de la cadera (entrepierna) y si los brazos están en cruz */
export function medirHumanoide(piezas) {
  const p = nube(piezas), b = caja(p), H = b.max.y;
  const centro = filtrar(p, (x, y) => Math.abs(x) < H * 0.025 && y > H * 0.08 && y < H * 0.75);
  let entrepierna = H * 0.47;
  if (centro.length) { let m = 1e9; for (let i = 1; i < centro.length; i += 3) m = Math.min(m, centro[i]); entrepierna = m; }
  const tronco = filtrar(p, (x, y) => y > H * 0.6 && y < H * 0.88);
  let maxX = 0; for (let i = 0; i < tronco.length; i += 3) maxX = Math.max(maxX, Math.abs(tronco[i]));
  const manos = {};
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    let lim = 0; for (let i = 0; i < p.length; i += 3) if (p[i] * s > lim) lim = p[i] * s;
    manos[S] = media(filtrar(p, (x) => x * s > lim - H * 0.03));
  }
  const pies = filtrar(p, (x, y) => y < H * 0.08 && Math.abs(x) > H * 0.01);
  let sx = 0, n = 0; for (let i = 0; i < pies.length; i += 3) { sx += Math.abs(pies[i]); n++; }
  return { H, entrepierna, brazosAbiertos: maxX > H * 0.3, manos, piernaX: n ? sx / n : null };
}

/**
 * Asocia las piezas al esqueleto de «plantilla» (un objeto creado por un generador).
 * pose: { nombreHueso: Quaternion } — pose en la que está la malla (p. ej. brazos en cruz);
 * la malla se devuelve a la pose de reposo del generador.
 */
export function enlazar(plantilla, piezas, { pose = null, suavizado = 2 } = {}) {
  const malla0 = []; plantilla.traverse((o) => { if (o.isSkinnedMesh) malla0.push(o); });
  const esqueleto = malla0[0].skeleton, huesos = esqueleto.bones;
  for (const m of malla0) m.parent.remove(m);
  plantilla.updateMatrixWorld(true);
  const reposo = huesos.map((h) => h.matrixWorld.clone());
  const centros = plantilla.userData.centros || {};
  delete plantilla.userData.centros;
  if (pose) { for (const [n, q] of Object.entries(pose)) { const h = huesos.find((x) => x.name === n); if (h) h.quaternion.copy(q); } plantilla.updateMatrixWorld(true); }

  // Segmentos de cada hueso en la pose de la malla
  const H = new THREE.Box3().setFromPoints(huesos.map((h) => h.getWorldPosition(new THREE.Vector3()))).getSize(new THREE.Vector3()).y || 1;
  const seg = huesos.map((h) => {
    const a = h.getWorldPosition(new THREE.Vector3());
    const hijos = h.children.filter((x) => x.isBone);
    let bb;
    const padre = h.parent?.isBone ? h.parent.getWorldPosition(new THREE.Vector3()) : a.clone().add(new THREE.Vector3(0, -0.1, 0));
    const i = huesos.indexOf(h);
    if (hijos.length !== 1 && centros[h.name]) {
      // El segmento llega al otro lado de la zona que cubren sus piezas (llevado a la pose actual)
      const c = new THREE.Vector3(...centros[h.name]).applyMatrix4(h.matrixWorld.clone().multiply(reposo[i].clone().invert()));
      bb = a.clone().add(c.sub(a).multiplyScalar(hijos.length ? 1 : 1.8));
    } else if (hijos.length === 1) bb = hijos[0].getWorldPosition(new THREE.Vector3());
    else if (hijos.length === 0) bb = a.clone().add(a.clone().sub(padre).multiplyScalar(0.5));
    else bb = a.clone();
    const n = h.name;
    const lado = /_L$/.test(n) ? 1 : /_R$/.test(n) ? -1 : 0;
    const pierna = /(Upper|Lower|Foot)_|UpperLeg|LowerLeg|Thigh|Shin/.test(n) && !/Arm/.test(n);
    const brazo = /UpperArm|LowerArm|Hand/.test(n);
    return { a, b: bb, lado, pierna, brazo, oreja: /^Ear_/.test(n), raiz: n === 'Root', ycima: a.y, hombroX: Math.abs(a.x) };
  });
  // Altura de la parte alta de cada extremidad (para no pegar la barriga a las patas)
  huesos.forEach((h, i) => { if (seg[i].pierna) { let t = h; while (t.parent?.isBone && seg[huesos.indexOf(t.parent)]?.pierna) t = t.parent; seg[i].ycima = seg[huesos.indexOf(t)].a.y; } });
  huesos.forEach((h, i) => { if (seg[i].brazo) { let t = h; while (t.parent?.isBone && seg[huesos.indexOf(t.parent)]?.brazo) t = t.parent; seg[i].hombroX = Math.abs(seg[huesos.indexOf(t)].a.x); } });

  const nH = huesos.length, eps2 = (0.012 * H) ** 2, ab = new THREE.Vector3(), ap = new THREE.Vector3();
  const resultado = [];
  for (const pz of piezas) {
    const g = pz.geo, pos = g.attributes.position, n = pos.count;
    // Vértices que comparten posición (costuras de UV) reciben los mismos pesos
    const id = new Int32Array(n), mapa = new Map(), unicos = [];
    const q = 1e5 / H;
    for (let i = 0; i < n; i++) {
      const k = `${Math.round(pos.getX(i) * q)},${Math.round(pos.getY(i) * q)},${Math.round(pos.getZ(i) * q)}`;
      let u = mapa.get(k); if (u === undefined) { u = unicos.length; mapa.set(k, u); unicos.push(i); }
      id[i] = u;
    }
    const U = unicos.length, W = new Float32Array(U * nH);
    for (let u = 0; u < U; u++) {
      const i = unicos[u]; _v.fromBufferAttribute(pos, i);
      for (let b = 0; b < nH; b++) {
        const s = seg[b]; if (s.raiz) continue;
        if (s.lado && _v.x * s.lado < -0.02 * H) continue;
        ab.subVectors(s.b, s.a); ap.subVectors(_v, s.a);
        const L2 = ab.lengthSq(), t = L2 > 0 ? Math.max(0, Math.min(1, ap.dot(ab) / L2)) : 0;
        let d2 = ap.sub(ab.multiplyScalar(t)).lengthSq();
        if (s.pierna && _v.y > s.ycima + 0.02 * H) d2 *= 9;
        if (s.brazo && Math.abs(_v.x) < s.hombroX * 0.9) d2 *= 16;
        if (s.oreja) d2 *= 3;
        W[u * nH + b] = 1 / (d2 + eps2) ** 3;
      }
      let tot = 0; for (let b = 0; b < nH; b++) tot += W[u * nH + b];
      for (let b = 0; b < nH; b++) W[u * nH + b] /= tot || 1;
    }
    // Suavizado de pesos entre vértices vecinos
    if (suavizado > 0) {
      const idx = g.index ? g.index.array : [...Array(n).keys()];
      const vec = Array.from({ length: U }, () => new Map());
      const r2 = (0.035 * H) ** 2, pa = new THREE.Vector3(), pb = new THREE.Vector3();
      const unir = (a, b) => { if (a === b || vec[a].has(b)) return; pa.fromBufferAttribute(pos, unicos[a]); pb.fromBufferAttribute(pos, unicos[b]); const f = Math.exp(-pa.distanceToSquared(pb) / r2); if (f > 0.02) { vec[a].set(b, f); vec[b].set(a, f); } };
      for (let t = 0; t < idx.length; t += 3) { const a = id[idx[t]], b = id[idx[t + 1]], c = id[idx[t + 2]]; unir(a, b); unir(b, c); unir(a, c); }
      const W2 = new Float32Array(W.length);
      for (let it = 0; it < suavizado; it++) {
        for (let u = 0; u < U; u++) {
          let tot = 1; for (const f of vec[u].values()) tot += f;
          for (let b = 0; b < nH; b++) { let s = W[u * nH + b]; for (const [w, f] of vec[u]) s += W[w * nH + b] * f; W2[u * nH + b] = s / tot; }
        }
        W.set(W2);
      }
    }
    // Nunca pesos del lado contrario (el suavizado podría haberlos pasado por la entrepierna)
    for (let u = 0; u < U; u++) { const x = pos.getX(unicos[u]); for (let b = 0; b < nH; b++) if (seg[b].lado && x * seg[b].lado < -0.02 * H) W[u * nH + b] = 0; }
    // Los 4 huesos con más peso
    const SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
    const SIu = new Uint16Array(U * 4), SWu = new Float32Array(U * 4);
    for (let u = 0; u < U; u++) {
      const orden = [...Array(nH).keys()].sort((a, b) => W[u * nH + b] - W[u * nH + a]).slice(0, 4);
      let tot = 0; for (const b of orden) tot += W[u * nH + b];
      orden.forEach((b, k) => { SIu[u * 4 + k] = b; SWu[u * 4 + k] = W[u * nH + b] / (tot || 1); });
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { SI[i * 4 + k] = SIu[id[i] * 4 + k]; SW[i * 4 + k] = SWu[id[i] * 4 + k]; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
    resultado.push(pz);
  }

  // Si la malla estaba en otra pose, se lleva a la de reposo: M = reposo · pose⁻¹
  if (pose) {
    const M = huesos.map((h, i) => reposo[i].clone().multiply(h.matrixWorld.clone().invert()));
    const N = M.map((m) => new THREE.Matrix3().getNormalMatrix(m));
    for (const pz of resultado) {
      const g = pz.geo, pos = g.attributes.position, nor = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      const o = new THREE.Vector3(), t = new THREE.Vector3(), no = new THREE.Vector3(), tn = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i); o.set(0, 0, 0); no.set(0, 0, 0);
        for (let k = 0; k < 4; k++) {
          const w = SW.getComponent(i, k); if (!w) continue; const b = SI.getComponent(i, k);
          o.addScaledVector(t.copy(_v).applyMatrix4(M[b]), w);
          if (nor) no.addScaledVector(tn.fromBufferAttribute(nor, i).applyMatrix3(N[b]), w);
        }
        pos.setXYZ(i, o.x, o.y, o.z); if (nor) { no.normalize(); nor.setXYZ(i, no.x, no.y, no.z); }
      }
      pos.needsUpdate = true;
    }
    for (const h of huesos) h.quaternion.identity();
    plantilla.updateMatrixWorld(true);
  }

  const nuevoEsqueleto = new THREE.Skeleton(huesos);
  for (const pz of resultado) {
    pz.geo.computeBoundingBox(); pz.geo.computeBoundingSphere();
    const sm = new THREE.SkinnedMesh(pz.geo, pz.material);
    sm.name = pz.nombre; sm.castShadow = sm.receiveShadow = true; sm.frustumCulled = false;
    plantilla.add(sm); sm.bind(nuevoEsqueleto);
  }
  return plantilla;
}
