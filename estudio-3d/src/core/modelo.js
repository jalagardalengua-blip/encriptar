// Constructor de modelos con esqueleto.
//
//   const m = new Modelo('Vaca', { piel: { color: '#fff' }, ... });
//   m.hueso('Spine', 'Root', [0, 1, 0]);          // posición del hueso en el modelo
//   m.parte(formas.esfera(0.5), 'piel', 'Spine');  // pieza unida a un hueso
//   const objeto = m.construir({ facetado: false }); // Group con huesos + SkinnedMesh
//
// Los materiales pueden ser una clave fija o una función (centro, normal) => clave,
// que se evalúa por triángulo (sirve para manchas, cinturones, calcetines...).
import * as THREE from 'three';

/** Crea los materiales PBR a partir de una paleta { clave: { color, rugosidad, metal, emisivo } } */
export function crearMateriales(paleta) {
  const lista = [], indice = new Map();
  for (const [clave, d] of Object.entries(paleta)) {
    const mat = new THREE.MeshStandardMaterial({
      name: clave,
      color: new THREE.Color(d.color ?? '#cccccc'),
      roughness: d.rugosidad ?? 0.8,
      metalness: d.metal ?? 0,
    });
    if (d.emisivo) { mat.emissive = new THREE.Color(d.emisivo); mat.emissiveIntensity = d.intensidad ?? 1; }
    if (d.dobleCara) mat.side = THREE.DoubleSide;
    indice.set(clave, lista.length); lista.push(mat);
  }
  return { lista, indice };
}

const _c = new THREE.Vector3(), _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

/**
 * Une varias piezas en una sola geometría agrupada por material.
 * piezas: [{ geo, mat, pesos?: (i, v) => [[hueso, peso], ...] }]
 */
export function fusionar(piezas, materiales, { facetado = false, piel = false } = {}) {
  const cubos = materiales.lista.map(() => []);
  for (const pz of piezas) {
    const g = pz.geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position, nor = g.attributes.normal;
    const idx = g.index ? g.index.array : [...Array(pos.count).keys()];
    for (let t = 0; t < idx.length; t += 3) {
      let clave = pz.mat;
      if (typeof clave === 'function') {
        _a.fromBufferAttribute(pos, idx[t]); _b.fromBufferAttribute(pos, idx[t + 1]); _c.fromBufferAttribute(pos, idx[t + 2]);
        const centro = _a.clone().add(_b).add(_c).divideScalar(3);
        _n.fromBufferAttribute(nor, idx[t]).add(_d.fromBufferAttribute(nor, idx[t + 1])).add(_d.fromBufferAttribute(nor, idx[t + 2])).normalize();
        clave = clave(centro, _n.clone());
      }
      const m = materiales.indice.get(clave);
      if (m === undefined) throw new Error(`Material desconocido: «${clave}»`);
      cubos[m].push(pz, idx[t], idx[t + 1], idx[t + 2]);
    }
  }
  const P = [], N = [], SI = [], SW = [], I = [], grupos = [];
  for (let m = 0; m < cubos.length; m++) {
    const c = cubos[m]; if (!c.length) continue;
    const inicio = I.length, mapa = new Map();
    for (let k = 0; k < c.length; k += 4) {
      const pz = c[k];
      let mp = mapa.get(pz); if (!mp) { mp = new Map(); mapa.set(pz, mp); }
      for (let j = 1; j <= 3; j++) {
        const vi = c[k + j];
        let ni = mp.get(vi);
        if (ni === undefined) {
          ni = P.length / 3; mp.set(vi, ni);
          const pos = pz.geo.attributes.position, nor = pz.geo.attributes.normal;
          P.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
          _d.fromBufferAttribute(nor, vi);
          if (_d.lengthSq() < 1e-12) _d.set(0, 1, 0); else _d.normalize();
          N.push(_d.x, _d.y, _d.z);
          if (piel) {
            const w = pz.pesos(vi, _a.fromBufferAttribute(pos, vi));
            const s = [0, 0, 0, 0], p = [0, 0, 0, 0];
            let tot = 0;
            w.slice(0, 4).forEach(([h, peso], q) => { s[q] = h; p[q] = peso; tot += peso; });
            SI.push(...s); SW.push(...p.map((x) => x / (tot || 1)));
          }
        }
        I.push(ni);
      }
    }
    grupos.push([inicio, I.length - inicio, m]);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  if (piel) {
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  }
  g.setIndex(I);
  for (const [s, n, m] of grupos) g.addGroup(s, n, m);
  if (facetado) {
    const gr = g.groups.map((x) => ({ ...x }));
    g = g.toNonIndexed(); g.clearGroups();
    for (const x of gr) g.addGroup(x.start, x.count, x.materialIndex);
    g.computeVertexNormals();
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/** Quita de la geometría los materiales que no se usan y devuelve la lista final */
function compactar(g, lista) {
  const usados = [...new Set(g.groups.map((x) => x.materialIndex))].sort((a, b) => a - b);
  const mapa = new Map(usados.map((m, i) => [m, i]));
  for (const x of g.groups) x.materialIndex = mapa.get(x.materialIndex);
  const mats = usados.map((m) => lista[m]);
  return mats.length === 1 ? mats[0] : mats;
}

export class Modelo {
  constructor(nombre, paleta) {
    this.nombre = nombre;
    this.materiales = crearMateriales(paleta);
    this.huesos = new Map();
    this.orden = [];
    this.piezas = [];
    this.extras = [];
    const raiz = new THREE.Bone(); raiz.name = 'Root';
    this.huesos.set('Root', { hueso: raiz, pos: new THREE.Vector3(), padre: null, i: 0 });
    this.orden.push(raiz);
  }

  /** Crea un hueso en la posición indicada del modelo (en reposo), hijo de otro hueso. */
  hueso(nombre, padre, pos) {
    const p = this.huesos.get(padre);
    if (!p) throw new Error(`Hueso padre desconocido: ${padre}`);
    if (this.huesos.has(nombre)) throw new Error(`Hueso repetido: ${nombre}`);
    const h = new THREE.Bone(); h.name = nombre;
    const abs = new THREE.Vector3(...pos);
    h.position.copy(abs).sub(p.pos);
    p.hueso.add(h);
    this.huesos.set(nombre, { hueso: h, pos: abs, padre, i: this.orden.length });
    this.orden.push(h);
    return this;
  }

  /** Posición en reposo de un hueso, como [x,y,z] */
  pos(nombre) { return this.huesos.get(nombre).pos.toArray(); }

  /**
   * Añade una pieza unida a un hueso.
   * opciones.suave = distancia (m) cerca de la articulación en la que la pieza se mezcla
   * con el hueso padre, para que doble sin cortes.
   * opciones.mezcla = [otroHueso, función (v) => peso 0..1] para mezclas a medida.
   */
  parte(geo, mat, hueso, opciones = {}) {
    const h = this.huesos.get(hueso);
    if (!h) throw new Error(`Hueso desconocido: ${hueso}`);
    const padre = h.padre ? this.huesos.get(h.padre) : null;
    let pesos = () => [[h.i, 1]];
    if (opciones.suave && padre) {
      const r = opciones.suave;
      pesos = (i, v) => {
        const d = v.distanceTo(h.pos);
        if (d >= r) return [[h.i, 1]];
        const w = 0.5 + 0.5 * (d / r);
        return [[h.i, w], [padre.i, 1 - w]];
      };
    } else if (opciones.mezcla) {
      const [otro, fn] = opciones.mezcla;
      const o = this.huesos.get(otro);
      pesos = (i, v) => { const w = Math.min(1, Math.max(0, fn(v))); return [[o.i, w], [h.i, 1 - w]]; };
    }
    this.piezas.push({ geo, mat, pesos });
    return this;
  }

  /** Simetría: llama fn(lado, signo) para 'L' (+X, izquierda del personaje) y 'R' (−X) */
  simetrico(fn) { fn('L', 1); fn('R', -1); return this; }

  construir({ facetado = false } = {}) {
    const g = fusionar(this.piezas, this.materiales, { facetado, piel: true });
    // Centro de las piezas de cada hueso (lo usa el auto-rig para saber qué zona cubre cada hueso)
    const sumas = this.orden.map(() => [0, 0, 0, 0]), P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    for (let i = 0; i < P.count; i++) {
      let mejor = 0; for (let k = 1; k < 4; k++) if (SW.getComponent(i, k) > SW.getComponent(i, mejor)) mejor = k;
      const s = sumas[SI.getComponent(i, mejor)]; s[0] += P.getX(i); s[1] += P.getY(i); s[2] += P.getZ(i); s[3]++;
    }
    const centros = {};
    this.orden.forEach((h, i) => { const s = sumas[i]; if (s[3]) centros[h.name] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    const grupo = new THREE.Group(); grupo.name = this.nombre;
    const raiz = this.orden[0];
    grupo.add(raiz);
    const malla = new THREE.SkinnedMesh(g, null);
    malla.material = compactar(g, this.materiales.lista);
    malla.name = this.nombre + '_Malla';
    malla.castShadow = true; malla.receiveShadow = true;
    malla.frustumCulled = false;
    grupo.add(malla);
    grupo.updateMatrixWorld(true);
    const esqueleto = new THREE.Skeleton(this.orden);
    malla.bind(esqueleto);
    grupo.userData.huesos = this.orden.length;
    grupo.userData.centros = centros;
    return grupo;
  }
}

/**
 * Para objetos sin esqueleto (props, vehículos): une piezas en una malla con nombre.
 * Las piezas que se animan (ruedas, puertas, aspas) deben ser mallas separadas.
 */
export function malla(nombre, piezas, materiales, { facetado = false } = {}) {
  const g = fusionar(piezas.map(([geo, mat]) => ({ geo, mat })), materiales, { facetado });
  const m = new THREE.Mesh(g, compactar(g, materiales.lista));
  m.name = nombre; m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Nodo vacío con nombre (pivote para animar), colocado en p */
export function pivote(nombre, p = [0, 0, 0]) {
  const o = new THREE.Group(); o.name = nombre; o.position.set(...p); return o;
}
