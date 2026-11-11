// Formas básicas listas para usar en los generadores.
// Todas devuelven un BufferGeometry con posición y normales (sin UV), colocado en
// coordenadas del modelo (metros, Y arriba, el modelo mira hacia +Z).
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const ARRIBA = new THREE.Vector3(0, 1, 0);

function limpiar(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.index) {
    const n = g.attributes.position.count;
    g.setIndex([...Array(n).keys()]);
  }
  return g;
}

/**
 * Coloca una geometría: p = posición [x,y,z], r = rotación en radianes [x,y,z],
 * s = escala (número o [x,y,z]).
 */
export function colocar(g, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const esc = Array.isArray(s) ? s : [s, s, s];
  _m.compose(_v.set(...p), _q.setFromEuler(_e.set(r[0], r[1], r[2])), new THREE.Vector3(...esc));
  g.applyMatrix4(_m);
  return g;
}

export const caja = (an, al, pr, o, segs = 1) => colocar(limpiar(new THREE.BoxGeometry(an, al, pr, segs, segs, 1)), o);

/** Caja con bordes redondeados (ancho, alto, profundo, radio del borde) */
export function cajaRedonda(an, al, pr, radio = 0.05, o) {
  const g = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  const pos = g.attributes.position;
  const mitad = new THREE.Vector3(an / 2, al / 2, pr / 2);
  const interior = mitad.clone().subScalar(radio).max(new THREE.Vector3(0, 0, 0));
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiply(new THREE.Vector3(an, al, pr));
    c.copy(v).clamp(interior.clone().negate(), interior);
    const d = v.clone().sub(c);
    if (d.lengthSq() > 0) d.setLength(radio);
    v.copy(c).add(d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  limpiar(g);
  g.computeVertexNormals();
  return colocar(mergeVertices(g), o);
}

/** Esfera (o elipsoide si s es [x,y,z]). segs controla lo redonda que es. */
export const esfera = (radio, o, segs = 12) =>
  colocar(limpiar(new THREE.SphereGeometry(radio, segs, Math.max(4, Math.round(segs * 0.7)))), o);

/** Casquete esférico: parte superior de una esfera (abertura en radianes desde el polo). */
export const casquete = (radio, abertura, o, segs = 12) =>
  colocar(limpiar(new THREE.SphereGeometry(radio, segs, Math.max(3, Math.round(segs * 0.5)), 0, Math.PI * 2, 0, abertura)), o);

export const cilindro = (rArriba, rAbajo, alto, o, segs = 10) =>
  colocar(limpiar(new THREE.CylinderGeometry(rArriba, rAbajo, alto, segs)), o);

export const cono = (radio, alto, o, segs = 8) =>
  colocar(limpiar(new THREE.ConeGeometry(radio, alto, segs)), o);

/** Perfil de cápsula subdividido también a lo largo (evita triángulos largos en piezas estiradas) */
function geoCapsula(radio, largo, segs) {
  const n = Math.max(3, Math.round(segs / 3)), tramos = Math.max(1, Math.round(segs * largo / (radio * 4 + 1e-6))), pts = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * radio, -largo / 2 + Math.sin(a) * radio)); }
  for (let i = 1; i < tramos; i++) pts.push(new THREE.Vector2(radio, -largo / 2 + (i / tramos) * largo));
  for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * radio, largo / 2 + Math.sin(a) * radio)); }
  pts[0].x = pts[pts.length - 1].x = 0;
  return limpiar(new THREE.LatheGeometry(pts, segs));
}

export const capsula = (radio, largo, o, segs = 10) => colocar(geoCapsula(radio, Math.max(0.0001, largo), segs), o);

export const toro = (radio, grosor, o, arco = Math.PI * 2, segs = 16) =>
  colocar(limpiar(new THREE.TorusGeometry(radio, grosor, 6, segs, arco)), o);

/** Pieza de revolución a partir de un perfil [[radio, altura], ...] */
export const torno = (perfil, o, segs = 12) =>
  colocar(limpiar(new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x, y)), segs)), o);

function orientar(g, a, b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const largo = dir.length();
  _q.setFromUnitVectors(ARRIBA, dir.normalize());
  _m.compose(A.add(B).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(_m);
  return largo;
}

/** Cápsula que va del punto a al punto b (ideal para brazos, piernas, cuellos...). */
export function tubo(a, b, radio, segs = 10, radioFinal) {
  const largo = new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
  let g;
  if (radioFinal === undefined) g = geoCapsula(radio, Math.max(0.0001, largo), segs);
  else {
    g = limpiar(new THREE.CylinderGeometry(radioFinal, radio, largo, segs));
  }
  orientar(g, a, b);
  return g;
}

/** Cilindro (sin tapas redondeadas) entre dos puntos, con radio inicial y final. */
export function barra(a, b, radio, radioFinal = radio, segs = 8) {
  const largo = new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
  const g = limpiar(new THREE.CylinderGeometry(radioFinal, radio, largo, segs));
  orientar(g, a, b);
  return g;
}

/** Deforma cada vértice con una función (v: Vector3) => void. Útil para dar irregularidad. */
export function deformar(g, fn) {
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); fn(v, i); pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Une vértices duplicados (misma posición) para que las normales queden suaves.
function mergeVertices(g, tol = 1e-4) {
  const pos = g.attributes.position;
  const idx = g.index.array;
  const mapa = new Map(), nuevos = [], remap = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) / tol)},${Math.round(pos.getY(i) / tol)},${Math.round(pos.getZ(i) / tol)}`;
    if (!mapa.has(k)) { mapa.set(k, nuevos.length / 3); nuevos.push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    remap[i] = mapa.get(k);
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(nuevos, 3));
  const ni = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = remap[idx[i]], b = remap[idx[i + 1]], c = remap[idx[i + 2]];
    if (a !== b && b !== c && a !== c) ni.push(a, b, c);
  }
  r.setIndex(ni);
  r.computeVertexNormals();
  return r;
}
