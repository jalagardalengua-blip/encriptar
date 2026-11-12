// Imágenes cargadas por el usuario (solo en el navegador). Los generadores las piden por clave.

const imagenes = new Map();

/** Guarda un canvas con la imagen (se reduce a 1024 px como máximo) */
export function registrarImagen(clave, fuente) {
  const max = 1024, w0 = fuente.width, h0 = fuente.height;
  const esc = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * esc)); c.height = Math.max(1, Math.round(h0 * esc));
  c.getContext('2d').drawImage(fuente, 0, 0, c.width, c.height);
  imagenes.set(clave, c);
  return c;
}

export function obtenerImagen(clave) {
  if (!imagenes.has(clave) && clave === 'ejemplo' && typeof document !== 'undefined') imagenes.set('ejemplo', dibujarEjemplo());
  return imagenes.get(clave) || null;
}

/** Abre un archivo de imagen (File/Blob) y lo devuelve como canvas */
export async function leerArchivo(archivo) {
  const bmp = await createImageBitmap(archivo);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.();
  return c;
}

/** Imagen de ejemplo: un girasol dibujado por código, sobre fondo blanco */
function dibujarEjemplo() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#3f7d2c'; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256, 620); g.quadraticCurveTo(236, 450, 256, 260); g.stroke();
  g.fillStyle = '#4f9a35';
  for (const [x, y, r] of [[200, 470, -0.7], [312, 410, 0.7]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.ellipse(0, 0, 70, 30, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.fillStyle = '#f5c02a';
  for (let i = 0; i < 16; i++) { g.save(); g.translate(256, 220); g.rotate((i / 16) * Math.PI * 2); g.beginPath(); g.ellipse(0, -118, 34, 72, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.fillStyle = '#e8a01c';
  for (let i = 0; i < 16; i++) { g.save(); g.translate(256, 220); g.rotate(((i + 0.5) / 16) * Math.PI * 2); g.beginPath(); g.ellipse(0, -100, 26, 56, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  const rad = g.createRadialGradient(240, 205, 10, 256, 220, 90);
  rad.addColorStop(0, '#6b3f1d'); rad.addColorStop(1, '#3a2010');
  g.fillStyle = rad; g.beginPath(); g.arc(256, 220, 86, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a5a2b';
  for (let i = 0; i < 70; i++) { const a = i * 2.4, r = Math.sqrt(i) * 9.5; g.beginPath(); g.arc(256 + Math.cos(a) * r, 220 + Math.sin(a) * r, 3.2, 0, Math.PI * 2); g.fill(); }
  return c;
}

/**
 * Separa el objeto del fondo. Devuelve una máscara Float32Array (1 = objeto) del tamaño del canvas.
 * Si la imagen tiene transparencia se usa; si no, se rellena desde los bordes con el color del fondo.
 */
export function mascara(canvas, { quitarFondo = true, tolerancia = 0.25 } = {}) {
  const w = canvas.width, h = canvas.height;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const m = new Float32Array(w * h);
  let transparentes = 0;
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 200) transparentes++;
  if (transparentes > w * h * 0.02) {
    for (let i = 0; i < w * h; i++) m[i] = px[i * 4 + 3] / 255;
    return limpiar(m, w, h);
  }
  if (!quitarFondo) return m.fill(1);
  // Colores del fondo: hasta 4 grupos de los píxeles del borde (cielo y prado, pared y suelo...)
  const borde = [];
  for (let x = 0; x < w; x++) borde.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) borde.push(y * w, y * w + w - 1);
  // Inicio tipo k-means++: cada centro nuevo es el color del borde más distinto a los ya elegidos
  const col = (i) => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
  let centros = [col(borde[0])];
  while (centros.length < 4) {
    let lejos = -1, dl = -1;
    for (let k = 0; k < borde.length; k += 3) { const c = col(borde[k]); const d = Math.min(...centros.map((q) => (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2)); if (d > dl) { dl = d; lejos = borde[k]; } }
    if (dl < 100) break;
    centros.push(col(lejos));
  }
  for (let it = 0; it < 8; it++) {
    const s = centros.map(() => [0, 0, 0, 0]);
    for (const i of borde) {
      let mejor = 0, dm = 1e9;
      centros.forEach((c, k) => { const d = (px[i * 4] - c[0]) ** 2 + (px[i * 4 + 1] - c[1]) ** 2 + (px[i * 4 + 2] - c[2]) ** 2; if (d < dm) { dm = d; mejor = k; } });
      const t = s[mejor]; t[0] += px[i * 4]; t[1] += px[i * 4 + 1]; t[2] += px[i * 4 + 2]; t[3]++;
    }
    centros = s.filter((t) => t[3] > borde.length * 0.04).map((t) => [t[0] / t[3], t[1] / t[3], t[2] / t[3]]);
    if (!centros.length) centros = [[px[0], px[1], px[2]]];
  }
  // Un píxel es fondo si ningún canal se aleja de alguno de esos colores más que la tolerancia
  const lim = tolerancia * 255;
  const fondo = (i) => centros.some((c) => Math.abs(px[i * 4] - c[0]) < lim && Math.abs(px[i * 4 + 1] - c[1]) < lim && Math.abs(px[i * 4 + 2] - c[2]) < lim);
  const visto = new Uint8Array(w * h), cola = [];
  for (const i of borde) if (!visto[i] && fondo(i)) { visto[i] = 1; cola.push(i); }
  while (cola.length) {
    const i = cola.pop(), x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && !visto[j] && fondo(j)) { visto[j] = 1; cola.push(j); }
    }
  }
  for (let i = 0; i < w * h; i++) m[i] = visto[i] ? 0 : 1;
  return limpiar(m, w, h);
}

// Quita motas sueltas: conserva las piezas de al menos un 3 % del tamaño de la mayor
function limpiar(m, w, h) {
  const etiqueta = new Int32Array(w * h).fill(-1), tam = [];
  for (let i = 0; i < w * h; i++) {
    if (m[i] < 0.5 || etiqueta[i] >= 0) continue;
    const n = tam.length; let t = 0; const cola = [i]; etiqueta[i] = n;
    while (cola.length) {
      const k = cola.pop(); t++;
      const x = k % w, y = (k / w) | 0;
      for (const j of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (j >= 0 && etiqueta[j] < 0 && m[j] >= 0.5) { etiqueta[j] = n; cola.push(j); }
      }
    }
    tam.push(t);
  }
  if (!tam.length) return m;
  const minimo = Math.max(...tam) * 0.03;
  for (let i = 0; i < w * h; i++) if (m[i] >= 0.5 && tam[etiqueta[i]] < minimo) m[i] = 0;
  return m;
}

/** Colores principales del objeto (sin el fondo), de más a menos abundante */
export function paleta(canvas, cuantos = 6, opciones) {
  const w = canvas.width, h = canvas.height;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const m = mascara(canvas, opciones);
  const cajas = new Map();
  const paso = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)));
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) {
    const i = y * w + x; if (m[i] < 0.5) continue;
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const c = cajas.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    c.n++; c.r += r; c.g += g; c.b += b; cajas.set(k, c);
  }
  const lista = [...cajas.values()].sort((a, b) => b.n - a.n).map((c) => [c.r / c.n, c.g / c.n, c.b / c.n, c.n]);
  const elegidos = [];
  for (const c of lista) {
    if (elegidos.every((e) => (e[0] - c[0]) ** 2 + (e[1] - c[1]) ** 2 + (e[2] - c[2]) ** 2 > 45 ** 2)) elegidos.push(c);
    if (elegidos.length >= cuantos) break;
  }
  return elegidos.map(([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
}
