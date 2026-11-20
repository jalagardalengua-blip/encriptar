import * as THREE from 'three';

/**
 * Invierte los triángulos cuya normal geométrica se opone a una dirección guía
 * por vértice (`hint`, 3 valores por vértice). Adaptado de la primera parte de
 * `weldNormals(g, hint)` de TORERO: garantiza caras orientadas hacia fuera aunque
 * la deformación procedural sea agresiva.
 */
export function orientByHint(geometry: THREE.BufferGeometry, hint: ArrayLike<number>): void {
  const index = geometry.getIndex();
  if (!index) throw new Error('orientByHint() requiere geometría indexada');
  const pos = geometry.getAttribute('position');
  const idx = index.array as Uint16Array | Uint32Array;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t]!, ib = idx[t + 1]!, ic = idx[t + 2]!;
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib).sub(a);
    c.fromBufferAttribute(pos, ic).sub(a);
    const fn = b.cross(c);
    const hx = hint[ia * 3]! + hint[ib * 3]! + hint[ic * 3]!;
    const hy = hint[ia * 3 + 1]! + hint[ib * 3 + 1]! + hint[ic * 3 + 1]!;
    const hz = hint[ia * 3 + 2]! + hint[ib * 3 + 2]! + hint[ic * 3 + 2]!;
    if (fn.x * hx + fn.y * hy + fn.z * hz < 0) {
      idx[t + 1] = ic;
      idx[t + 2] = ib;
    }
  }
  index.needsUpdate = true;
}

/**
 * Invierte los triángulos cuya orientación contradice las normales ya almacenadas.
 * Equivale a `fixWinding` de TORERO.
 */
export function fixWinding(geometry: THREE.BufferGeometry): void {
  const normal = geometry.getAttribute('normal');
  orientByHint(geometry, normal.array as ArrayLike<number>);
}

/**
 * Recalcula normales suaves y las suelda entre vértices que comparten posición
 * (costuras de UV, polos). Adaptado de la segunda parte de `weldNormals` de TORERO.
 * Mantiene los vértices separados (y por tanto las UV), sólo unifica la normal.
 */
export function computeWeldedNormals(geometry: THREE.BufferGeometry, precision = 2e4): void {
  geometry.computeVertexNormals(); // normales ponderadas por área, por vértice
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * precision)},${Math.round(pos.getY(i) * precision)},${Math.round(pos.getZ(i) * precision)}`;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(i);
  }
  const acc = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    acc.set(0, 0, 0);
    for (const i of list) {
      acc.x += nrm.getX(i);
      acc.y += nrm.getY(i);
      acc.z += nrm.getZ(i);
    }
    if (acc.lengthSq() === 0) continue;
    acc.normalize();
    for (const i of list) nrm.setXYZ(i, acc.x, acc.y, acc.z);
  }
  nrm.needsUpdate = true;
}
