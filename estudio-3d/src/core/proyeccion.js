// «Piel de la foto»: proyecta la foto del usuario sobre el modelo con esqueleto para que tenga
// el pelaje, las manchas y los colores reales. Solo en el navegador.
import * as THREE from 'three';
import { mascara } from './imagenes.js';

/**
 * Recorta el objeto de la foto y rellena el fondo con los colores del borde del objeto
 * (así el fondo no se cuela en los bordes del modelo). Devuelve { canvas, cabeza }.
 * caja: [x0, y0, x1, y1] en fracciones (opcional, p. ej. la que da Claude) si no se puede quitar el fondo.
 */
export function prepararFoto(foto, { caja = null, tolerancia = 0.08 } = {}) {
  const esc = Math.min(1, 360 / Math.max(foto.width, foto.height));
  const pc = document.createElement('canvas');
  pc.width = Math.max(8, Math.round(foto.width * esc)); pc.height = Math.max(8, Math.round(foto.height * esc));
  pc.getContext('2d').drawImage(foto, 0, 0, pc.width, pc.height);
  const W = pc.width, H = pc.height;
  let m = mascara(pc, { quitarFondo: true, tolerancia });
  if (caja && caja.length === 4) { // fuera del recuadro que indicó Claude no hay animal
    const [a, b, c, d] = [caja[0] - 0.03, caja[1] - 0.03, caja[2] + 0.03, caja[3] + 0.03].map((v) => Math.min(1, Math.max(0, v)));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < a * W || x > c * W || y < b * H || y > d * H) m[y * W + x] = 0;
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] >= 0.5) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cobertura = n / (W * H);
  if (cobertura < 0.03 || cobertura > 0.92) { // no se pudo separar del fondo: caja de Claude o la foto entera
    const c = caja && caja.length === 4 ? caja : [0, 0, 1, 1];
    x0 = Math.round(c[0] * (W - 1)); y0 = Math.round(c[1] * (H - 1)); x1 = Math.round(c[2] * (W - 1)); y1 = Math.round(c[3] * (H - 1));
    m = new Float32Array(W * H).fill(1);
  }
  // Lado de la cabeza: el extremo cuya parte más alta está más arriba (cuello levantado)
  const alto = (desde, hasta) => { let t = H; for (let x = desde; x <= hasta; x++) for (let y = y0; y <= y1; y++) if (m[y * W + x] >= 0.5) { t = Math.min(t, y); break; } return t; };
  const ancho = x1 - x0, franja = Math.max(1, Math.round(ancho * 0.18));
  const cabeza = alto(x0, x0 + franja) <= alto(x1 - franja, x1) ? 'izquierda' : 'derecha';

  // Recorte a buena resolución
  const e2 = foto.width / W, cw = Math.max(2, Math.round((x1 - x0 + 1) * e2)), ch = Math.max(2, Math.round((y1 - y0 + 1) * e2));
  const lado = Math.min(1024, Math.max(cw, ch)), k = lado / Math.max(cw, ch);
  const out = document.createElement('canvas'); out.width = Math.max(2, Math.round(cw * k)); out.height = Math.max(2, Math.round(ch * k));
  const g = out.getContext('2d');
  g.drawImage(foto, x0 * e2, y0 * e2, cw, ch, 0, 0, out.width, out.height);
  // Relleno del fondo: se extienden los colores del objeto hacia fuera (en una copia pequeña)
  const sw = Math.max(8, Math.round(out.width / 4)), sh = Math.max(8, Math.round(out.height / 4));
  const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh;
  const sg = sc.getContext('2d'); sg.drawImage(out, 0, 0, sw, sh);
  const img = sg.getImageData(0, 0, sw, sh), d = img.data;
  let conocido = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const mx = Math.min(W - 1, Math.round(x0 + (x / sw) * (x1 - x0 + 1))), my = Math.min(H - 1, Math.round(y0 + (y / sh) * (y1 - y0 + 1)));
    conocido[y * sw + x] = m[my * W + mx] >= 0.5 ? 1 : 0;
  }
  // Se descarta el borde del objeto (mezclado con el fondo) para que no contagie su color
  const original = new Uint8Array(conocido);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = y * sw + x; if (!original[i]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= sw || Y >= sh || !original[Y * sw + X]) { conocido[i] = 0; break; } }
  }
  const nucleo = new Uint8Array(conocido); // objeto sin su borde: lo que se pinta con la foto original
  for (let it = 0; it < Math.max(sw, sh); it++) {
    const nuevo = new Uint8Array(conocido); let quedan = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = y * sw + x; if (conocido[i]) continue;
      let r = 0, gg = 0, b = 0, c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= sw || Y >= sh) continue;
        const j = Y * sw + X; if (!conocido[j]) continue;
        r += d[j * 4]; gg += d[j * 4 + 1]; b += d[j * 4 + 2]; c++;
      }
      if (c) { d[i * 4] = r / c; d[i * 4 + 1] = gg / c; d[i * 4 + 2] = b / c; d[i * 4 + 3] = 255; nuevo[i] = 1; } else quedan++;
    }
    conocido = nuevo; if (!quedan) break;
  }
  sg.putImageData(img, 0, 0);
  // Fondo relleno debajo, objeto original encima
  const objeto = document.createElement('canvas'); objeto.width = out.width; objeto.height = out.height;
  const og = objeto.getContext('2d'); og.drawImage(out, 0, 0);
  const od = og.getImageData(0, 0, out.width, out.height);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const sx = Math.min(sw - 1, Math.floor((x / out.width) * sw)), sy = Math.min(sh - 1, Math.floor((y / out.height) * sh));
    if (!nucleo[sy * sw + sx]) od.data[(y * out.width + x) * 4 + 3] = 0;
  }
  og.putImageData(od, 0, 0);
  g.clearRect(0, 0, out.width, out.height);
  g.imageSmoothingEnabled = true; g.drawImage(sc, 0, 0, out.width, out.height); g.drawImage(objeto, 0, 0);
  return { canvas: out, cabeza, mascara: original, mw: sw, mh: sh };
}

/**
 * Proyecta la foto sobre el modelo. vista: 'lateral' (animales, aves) o 'frontal' (personas).
 * cabeza: en qué lado de la foto está la cabeza ('izquierda' | 'derecha'), solo en vista lateral.
 */
export function proyectar(objeto, foto, { vista = 'lateral', cabeza = 'derecha' } = {}) {
  objeto.updateMatrixWorld(true);
  const caja = new THREE.Box3(), v = new THREE.Vector3();
  const mallas = []; objeto.traverse((o) => { if (o.isMesh) mallas.push(o); });
  for (const o of mallas) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) caja.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); }
  const t = caja.getSize(new THREE.Vector3());
  const tex = new THREE.CanvasTexture(foto); tex.colorSpace = THREE.SRGBColorSpace; tex.name = 'foto'; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ name: 'piel_foto', map: tex, roughness: 0.82, metalness: 0 });
  for (const o of mallas) {
    const g = o.geometry, p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      let u = vista === 'frontal' ? (v.x - caja.min.x) / (t.x || 1) : (v.z - caja.min.z) / (t.z || 1);
      if (vista !== 'frontal' && cabeza === 'izquierda') u = 1 - u;
      uv[i * 2] = Math.min(1, Math.max(0, u)); uv[i * 2 + 1] = Math.min(1, Math.max(0, (v.y - caja.min.y) / (t.y || 1)));
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.clearGroups();
    o.material = mat;
  }
  return objeto;
}

/**
 * Ajusta la silueta del modelo (vista lateral) a la de la foto: el lomo, el cuello, la cabeza y la cola
 * suben o bajan para seguir el contorno superior real. Se hace en la pose de reposo, antes de animar.
 */
export function ajustarSilueta(objeto, prep, { cabeza = 'derecha', fuerza = 1 } = {}) {
  objeto.updateMatrixWorld(true);
  const mallas = []; objeto.traverse((o) => { if (o.isMesh) mallas.push(o); });
  const caja = new THREE.Box3(), v = new THREE.Vector3();
  for (const o of mallas) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) caja.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); }
  const t = caja.getSize(new THREE.Vector3()), B = 48;
  const uDe = (z) => { const u = (z - caja.min.z) / (t.z || 1); return cabeza === 'izquierda' ? 1 - u : u; };
  // Contorno superior de la foto (en metros del modelo) por columnas
  const { mascara: m, mw, mh } = prep, fotoTop = new Float32Array(B).fill(NaN);
  for (let b = 0; b < B; b++) {
    const x0 = Math.floor((b / B) * mw), x1 = Math.max(x0 + 1, Math.floor(((b + 1) / B) * mw));
    let top = mh;
    for (let x = x0; x < x1; x++) for (let y = 0; y < mh; y++) if (m[y * mw + x]) { top = Math.min(top, y); break; }
    if (top < mh) fotoTop[b] = caja.min.y + (1 - top / mh) * t.y;
  }
  // Contorno superior del modelo y centro de cada columna
  const modTop = new Float32Array(B).fill(-Infinity), modBot = new Float32Array(B).fill(Infinity);
  for (const o of mallas) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); const b = Math.min(B - 1, Math.max(0, Math.floor(uDe(v.z) * B))); modTop[b] = Math.max(modTop[b], v.y); modBot[b] = Math.min(modBot[b], v.y); } }
  const yc = caja.min.y + t.y * 0.45;
  let esc = new Float32Array(B).fill(1);
  for (let b = 0; b < B; b++) {
    if (!Number.isFinite(fotoTop[b]) || !Number.isFinite(modTop[b]) || modTop[b] - yc < t.y * 0.04) continue;
    esc[b] = Math.min(1.6, Math.max(0.55, (fotoTop[b] - yc) / (modTop[b] - yc)));
  }
  // Suavizado entre columnas vecinas
  for (let it = 0; it < 3; it++) { const e = esc.slice(); for (let b = 0; b < B; b++) e[b] = (esc[Math.max(0, b - 1)] + 2 * esc[b] + esc[Math.min(B - 1, b + 1)]) / 4; esc = e; }
  const inv = new THREE.Matrix4();
  for (const o of mallas) {
    const p = o.geometry.attributes.position; inv.copy(o.matrixWorld).invert();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.y <= yc) continue;
      const f = uDe(v.z) * B - 0.5, b0 = Math.min(B - 1, Math.max(0, Math.floor(f))), b1 = Math.min(B - 1, b0 + 1), w = Math.min(1, Math.max(0, f - b0));
      const s = 1 + ((esc[b0] * (1 - w) + esc[b1] * w) - 1) * fuerza;
      v.y = yc + (v.y - yc) * s;
      v.applyMatrix4(inv); p.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true; o.geometry.computeVertexNormals(); o.geometry.computeBoundingSphere();
    const nor = o.geometry.attributes.normal;
    for (let i = 0; i < nor.count; i++) { v.fromBufferAttribute(nor, i); if (v.lengthSq() < 1e-12) v.set(0, 1, 0); else v.normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  }
  return objeto;
}
