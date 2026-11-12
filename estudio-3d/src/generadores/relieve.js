// Modelo 3D a partir de una imagen: separa la silueta del fondo, la «infla» como un globo
// y usa la propia imagen como textura por delante (y por detrás, en espejo).
// Sirve para objetos, dibujos, logotipos, cartas, personajes 2D, plantas, señales...
import * as THREE from 'three';
import { obtenerImagen, mascara } from '../core/imagenes.js';
import { crearMateriales, pivote } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo, TAU } from '../core/animacion.js';

export default {
  id: 'relieve',
  nombre: 'Desde una imagen',
  icono: '🖼️',
  categoria: 'Imagen',
  soloNavegador: true,
  descripcion: 'Convierte la silueta de una foto o dibujo en un modelo 3D con volumen y la imagen como textura. Animaciones: balanceo, girar, flotar y rebotar.',
  presets: { figura: {}, plano: { grosor: 0.08 }, globo: { grosor: 0.7 }, con_peana: { peana: true } },
  parametros: [
    { id: 'imagen', nombre: 'Imagen', tipo: 'imagen', def: 'ejemplo' },
    { id: 'altura', nombre: 'Altura (m)', tipo: 'rango', min: 0.05, max: 6, paso: 0.01, def: 1 },
    { id: 'grosor', nombre: 'Volumen', tipo: 'rango', min: 0.02, max: 1, paso: 0.01, def: 0.35 },
    { id: 'detalle', nombre: 'Detalle de la malla', tipo: 'rango', min: 32, max: 200, paso: 1, def: 110 },
    { id: 'quitarFondo', nombre: 'Quitar el fondo', tipo: 'si', def: true },
    { id: 'tolerancia', nombre: 'Tolerancia del fondo', tipo: 'rango', min: 0.01, max: 0.5, paso: 0.01, def: 0.08 },
    { id: 'suavizado', nombre: 'Suavizar el contorno', tipo: 'rango', min: 0, max: 6, paso: 0.5, def: 1.5 },
    { id: 'trasera', nombre: 'Parte de atrás', tipo: 'opcion', opciones: [['espejo', 'La misma imagen'], ['color', 'Un solo color']], def: 'espejo' },
    { id: 'peana', nombre: 'Peana para que se sostenga', tipo: 'si', def: false },
    { id: 'colorTrasero', nombre: 'Atrás y peana', tipo: 'color', def: '#6b5a48' },
    // Esqueleto a medida (lo diseña Claude): JSON [{nombre, padre, x, y, movimiento, fuerza}] con x, y en fracciones de la foto
    { id: 'esqueleto', nombre: 'Esqueleto a medida', tipo: 'oculto', def: '' },
  ],

  construir(p) {
    if (typeof document === 'undefined') throw new Error('El generador «relieve» funciona solo en la app web.');
    const img = obtenerImagen(p.imagen) || obtenerImagen('ejemplo');

    // 1. Máscara a resolución de trabajo
    const esc = Math.min(1, 360 / Math.max(img.width, img.height));
    const mc = document.createElement('canvas');
    mc.width = Math.max(8, Math.round(img.width * esc)); mc.height = Math.max(8, Math.round(img.height * esc));
    mc.getContext('2d').drawImage(img, 0, 0, mc.width, mc.height);
    const W = mc.width, H = mc.height;
    let m = mascara(mc, { quitarFondo: p.quitarFondo, tolerancia: p.tolerancia });
    if (p.suavizado > 0) m = desenfocar(m, W, H, Math.round(p.suavizado));
    const cob = (x, y) => { // cobertura bilineal
      x = Math.min(W - 1.001, Math.max(0, x)); y = Math.min(H - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0;
      return (m[i] * (1 - fx) + m[i + 1] * fx) * (1 - fy) + (m[i + W] * (1 - fx) + m[i + W + 1] * fx) * fy;
    };
    let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] >= 0.5) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    if (bx1 < 0) throw new Error('No se encontró ningún objeto en la imagen. Baja la tolerancia o desactiva «Quitar el fondo».');

    // 2. Rejilla de vértices
    const paso = Math.max(bx1 - bx0, by1 - by0) / p.detalle;
    const ox = bx0 - paso, oy = by0 - paso;
    const gw = Math.ceil((bx1 - bx0) / paso) + 3, gh = Math.ceil((by1 - by0) / paso) + 3;
    const N = gw * gh, dentro = new Uint8Array(N), c = new Float32Array(N);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const k = j * gw + i; c[k] = cob(ox + i * paso, oy + j * paso); dentro[k] = c[k] >= 0.5 ? 1 : 0; }
    // Distancia al borde (en celdas)
    const d = new Float32Array(N);
    for (let k = 0; k < N; k++) d[k] = dentro[k] ? 1e9 : 0;
    const D2 = Math.SQRT2;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const k = j * gw + i; if (!d[k]) continue; if (i > 0) d[k] = Math.min(d[k], d[k - 1] + 1); if (j > 0) { d[k] = Math.min(d[k], d[k - gw] + 1); if (i > 0) d[k] = Math.min(d[k], d[k - gw - 1] + D2); if (i < gw - 1) d[k] = Math.min(d[k], d[k - gw + 1] + D2); } }
    for (let j = gh - 1; j >= 0; j--) for (let i = gw - 1; i >= 0; i--) { const k = j * gw + i; if (!d[k]) continue; if (i < gw - 1) d[k] = Math.min(d[k], d[k + 1] + 1); if (j < gh - 1) { d[k] = Math.min(d[k], d[k + gw] + 1); if (i < gw - 1) d[k] = Math.min(d[k], d[k + gw + 1] + D2); if (i > 0) d[k] = Math.min(d[k], d[k + gw - 1] + D2); } }
    let dmax = 1; for (let k = 0; k < N; k++) if (dentro[k]) dmax = Math.max(dmax, d[k]);

    // 3. Posiciones: borde ajustado al contorno real, altura tipo «globo»
    const s = p.altura / (by1 - by0 + 1); // metros por píxel de la máscara
    const cx = (bx0 + bx1) / 2;
    const zMax = p.grosor * dmax * paso * s;
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), uu = new Float32Array(N), vv = new Float32Array(N);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i; if (!dentro[k]) continue;
      let mx = ox + i * paso, my = oy + j * paso, tx = mx, ty = my;
      const borde = !dentro[k - 1] || !dentro[k + 1] || !dentro[k - gw] || !dentro[k + gw];
      if (borde) {
        const gx = (c[k + 1] - c[k - 1]) / 2, gy = (c[k + gw] - c[k - gw]) / 2, g2 = gx * gx + gy * gy;
        if (g2 > 1e-6) {
          const t = Math.max(-0.7, Math.min(0.7, (c[k] - 0.5) / g2 * 1));
          mx -= gx * t * paso; my -= gy * t * paso;            // al contorno de 0.5
          const gl = Math.sqrt(g2); tx = mx + (gx / gl) * 1.5; ty = my + (gy / gl) * 1.5; // color de dentro
        }
      }
      const t = Math.min(1, d[k] / dmax);
      px[k] = (mx - cx) * s; py[k] = (by1 - my) * s; pz[k] = borde ? zMax * 0.05 + paso * s * 0.15 : zMax * Math.sqrt(t * (2 - t));
      uu[k] = tx / W; vv[k] = 1 - ty / H;
    }

    // Alisar las alturas (la distancia en rejilla deja escalones en los bordes diagonales)
    for (let it = 0; it < 4; it++) {
      const z2 = pz.slice();
      for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
        const k = j * gw + i; if (!dentro[k]) continue;
        let suma = 0, n = 0;
        for (const q of [k - 1, k + 1, k - gw, k + gw, k - gw - 1, k - gw + 1, k + gw - 1, k + gw + 1]) if (dentro[q]) { suma += pz[q]; n++; }
        if (n === 8) z2[k] = pz[k] * 0.4 + (suma / n) * 0.6;
      }
      pz.set(z2);
    }

    // 4. Triángulos: cara delantera, trasera y laterales que las unen
    const P = [], U = [], idF = new Int32Array(N).fill(-1), idB = new Int32Array(N).fill(-1);
    for (let k = 0; k < N; k++) if (dentro[k]) {
      idF[k] = P.length / 3; P.push(px[k], py[k], pz[k]); U.push(uu[k], vv[k]);
      idB[k] = P.length / 3; P.push(px[k], py[k], -pz[k]); U.push(uu[k], vv[k]);
    }
    const delante = [], detras = [], lados = [], aristas = new Map();
    const v3 = (i) => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const orientar = (a, b, c2, quiero) => { // devuelve [a,b,c] con la normal hacia «quiero»
      const n = v3(b).sub(v3(a)).cross(v3(c2).sub(v3(a)));
      return n.dot(quiero) >= 0 ? [a, b, c2] : [a, c2, b];
    };
    const Z = new THREE.Vector3(0, 0, 1), mZ = new THREE.Vector3(0, 0, -1);
    const tri = (ks) => {
      delante.push(...orientar(idF[ks[0]], idF[ks[1]], idF[ks[2]], Z));
      detras.push(...orientar(idB[ks[0]], idB[ks[1]], idB[ks[2]], mZ));
      for (let e = 0; e < 3; e++) {
        const a = ks[e], b = ks[(e + 1) % 3], clave = a < b ? a + ',' + b : b + ',' + a;
        const x = aristas.get(clave); if (x) x.n++; else aristas.set(clave, { a, b, otro: ks[(e + 2) % 3], n: 1 });
      }
    };
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const a = j * gw + i, b = a + 1, c2 = a + gw + 1, e = a + gw;
      const q = [a, b, c2, e].filter((k) => dentro[k]);
      if (q.length === 4) { if (Math.abs(d[a] - d[c2]) <= Math.abs(d[b] - d[e])) { tri([a, b, c2]); tri([a, c2, e]); } else { tri([a, b, e]); tri([b, c2, e]); } }
      else if (q.length === 3) tri(q);
    }
    for (const { a, b, otro, n } of aristas.values()) {
      if (n !== 1) continue;
      const mid = v3(idF[a]).add(v3(idF[b])).multiplyScalar(0.5);
      const fuera = mid.clone().sub(v3(idF[otro])).setZ(0);
      lados.push(...orientar(idF[a], idF[b], idB[b], fuera), ...orientar(idF[a], idB[b], idB[a], fuera));
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const color = p.trasera === 'color';
    g.setIndex([...delante, ...lados, ...detras]);
    g.addGroup(0, delante.length + lados.length, 0);
    g.addGroup(delante.length + lados.length, detras.length, color ? 1 : 0);
    g.computeVertexNormals();

    const tex = new THREE.CanvasTexture(img);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.name = 'Imagen';
    const frente = new THREE.MeshStandardMaterial({ name: 'imagen', map: tex, roughness: 0.75, metalness: 0 });
    const M = crearMateriales({ trasera: { color: p.colorTrasero, rugosidad: 0.8 } });
    // Esqueleto a medida (si Claude lo ha diseñado)
    let def = null;
    if (p.esqueleto) { try { def = JSON.parse(p.esqueleto); } catch { def = null; } }
    if (!Array.isArray(def) || !def.length) def = null;
    const materiales = color ? [frente, M.lista[0]] : frente;
    const malla = def ? new THREE.SkinnedMesh(g, materiales) : new THREE.Mesh(g, materiales);
    malla.name = 'Relieve_Malla'; malla.castShadow = malla.receiveShadow = true; malla.frustumCulled = false;
    let huesos = null;
    if (def) {
      const aModelo = (fx, fy) => new THREE.Vector3((fx * W - cx) * s, (by1 - fy * H) * s, 0);
      const raizH = new THREE.Bone(); raizH.name = 'Root';
      const info = new Map([['Root', { hueso: raizH, pos: new THREE.Vector3(), prof: 0, hijos: [] }]]);
      let pendientes = def.slice(), vueltas = 0;
      while (pendientes.length && vueltas++ < 50) {
        pendientes = pendientes.filter((h) => {
          const padre = info.get(h.padre) || (!h.padre || !def.some((x) => x.nombre === h.padre) ? info.get('Root') : null);
          if (!padre) return true;
          const b = new THREE.Bone(); b.name = h.nombre;
          const pos = aModelo(h.x, h.y); b.position.copy(pos).sub(padre.pos); padre.hueso.add(b);
          const reg = { hueso: b, pos, prof: padre.prof + 1, hijos: [], def: h, padre }; padre.hijos.push(reg); info.set(h.nombre, reg);
          return false;
        });
      }
      huesos = [...info.values()];
      // Pesos: cada vértice sigue a los huesos más cercanos (en el plano de la imagen)
      const seg = huesos.map((r) => {
        if (r.hueso === raizH) return null;
        let b;
        if (r.hijos.length === 1) b = r.hijos[0].pos.clone();
        else if (r.hijos.length > 1) b = r.pos.clone().add(r.hijos.reduce((acc, h) => acc.add(h.pos), new THREE.Vector3()).divideScalar(r.hijos.length).sub(r.pos).multiplyScalar(0.5));
        else b = r.pos.clone().add(r.pos.clone().sub(r.padre.pos).multiplyScalar(r.padre.hueso === raizH ? 0.3 : 0.6));
        return [r.pos, b];
      });
      const n = g.attributes.position.count, SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
      const eps2 = (p.altura * 0.01) ** 2, a2 = new THREE.Vector2(), b2 = new THREE.Vector2(), q = new THREE.Vector2(), d = new THREE.Vector2();
      for (let i = 0; i < n; i++) {
        q.set(g.attributes.position.getX(i), g.attributes.position.getY(i));
        const w = seg.map((sg, k) => {
          if (!sg) return [k, 0];
          a2.set(sg[0].x, sg[0].y); b2.set(sg[1].x, sg[1].y); d.subVectors(b2, a2);
          const L2 = d.lengthSq(), t = L2 ? Math.max(0, Math.min(1, q.clone().sub(a2).dot(d) / L2)) : 0;
          const d2 = q.distanceToSquared(a2.clone().addScaledVector(d, t));
          return [k, 1 / (d2 + eps2) ** 3];
        }).sort((x, y) => y[1] - x[1]).slice(0, 4);
        const tot = w.reduce((acc, x) => acc + x[1], 0) || 1;
        w.forEach(([k, x], j) => { SI[i * 4 + j] = k; SW[i * 4 + j] = x / tot; });
      }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
      malla.userData.raizHuesos = raizH;
    }

    const raiz = new THREE.Group(); raiz.name = 'Relieve';
    const figura = pivote('Figura'); raiz.add(figura);
    let alto = 0;
    if (p.peana) {
      alto = Math.max(0.02, p.altura * 0.04);
      const ancho = (bx1 - bx0) * s;
      const peana = new THREE.Mesh(F.cilindro(ancho * 0.42 + 0.05, ancho * 0.45 + 0.05, alto, { p: [0, alto / 2, 0], s: [1, 1, Math.max(0.35, Math.min(1, zMax * 3 / (ancho * 0.45 + 0.05)))] }, 32), M.lista[0]);
      peana.name = 'Peana'; peana.castShadow = peana.receiveShadow = true; raiz.add(peana);
      figura.position.y = alto * 0.6;
    }
    figura.add(malla);
    if (huesos) {
      figura.add(malla.userData.raizHuesos); delete malla.userData.raizHuesos;
      raiz.updateMatrixWorld(true);
      malla.bind(new THREE.Skeleton(huesos.map((r) => r.hueso)));
    }

    const animaciones = [
      clip('Balanceo', 2.4, raiz, (f, P2) => { P2.rot('Figura', 0.03 * onda(f, 1, 0.25), 0.15 * onda(f, 1, 0.1), 0.06 * onda(f)); }),
      clip('Girar', 3, raiz, (f, P2) => { P2.rot('Figura', 0, TAU * f); }),
      clip('Flotar', 3, raiz, (f, P2) => { P2.mov('Figura', 0, p.altura * 0.06 * (1 + onda(f))); P2.rot('Figura', 0, 0.25 * onda(f, 1, 0.2)); }),
      clip('Rebotar', 0.8, raiz, (f, P2) => {
        const salto = Math.max(0, Math.sin(Math.PI * Math.min(1, f / 0.7)));
        const aplasta = tramo(f, 0.7, 0.8, 0.85, 1);
        P2.mov('Figura', 0, p.altura * 0.25 * salto);
        P2.esc('Figura', 1 + 0.12 * aplasta, 1 - 0.15 * aplasta + 0.05 * salto, 1 + 0.12 * aplasta);
      }),
    ];
    if (huesos) {
      // Movimiento de cada parte según lo que decidió Claude
      const mover = (f, P2, amp) => {
        for (const r of huesos) {
          const h = r.def; if (!h) continue;
          const a = amp * Math.min(1, Math.max(0, +h.fuerza || 0.5));
          if (h.movimiento === 'balanceo') P2.rot(h.nombre, 0, 0, a * 0.5 * onda(f));
          else if (h.movimiento === 'ondular') P2.rot(h.nombre, 0, 0, a * 0.45 * onda(f, 1, -0.13 * r.prof));
          else if (h.movimiento === 'aletear') P2.rot(h.nombre, 0, a * 1.1 * onda(f, 2) * (r.pos.x >= 0 ? 1 : -1), 0);
          else if (h.movimiento === 'girar') P2.rot(h.nombre, 0, 0, -TAU * f);
          else if (h.movimiento === 'asentir') P2.rot(h.nombre, a * 0.35 * onda(f, 2), 0, 0);
        }
      };
      animaciones.unshift(clip('Animar', 3, raiz, (f, P2) => mover(f, P2, 1)), clip('Animar_rapido', 1.2, raiz, (f, P2) => mover(f, P2, 1.4)));
    }
    return { objeto: raiz, animaciones };
  },
};

function desenfocar(m, w, h, r) {
  const t = new Float32Array(w * h), o = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += m[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[y * w + x] = s / n; s += m[y * w + Math.min(w - 1, x + r + 1)] - m[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
