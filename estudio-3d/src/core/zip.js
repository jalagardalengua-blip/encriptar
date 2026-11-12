// ZIP mínimo sin compresión (para entregar el .glb donde solo se permiten .zip).
const TABLA = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = TABLA[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** archivos: [{ nombre, datos: Uint8Array }] → Blob zip */
export function crearZip(archivos) {
  const partes = [], central = []; let offset = 0;
  const f = new Date(), hora = (f.getHours() << 11) | (f.getMinutes() << 5) | (f.getSeconds() >> 1), dia = ((f.getFullYear() - 1980) << 9) | ((f.getMonth() + 1) << 5) | f.getDate();
  for (const { nombre, datos } of archivos) {
    const n = new TextEncoder().encode(nombre), crc = crc32(datos);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(10, hora, true); loc.setUint16(12, dia, true);
    loc.setUint32(14, crc, true); loc.setUint32(18, datos.length, true); loc.setUint32(22, datos.length, true); loc.setUint16(26, n.length, true);
    partes.push(loc, n, datos);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(12, hora, true); cen.setUint16(14, dia, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, offset, true);
    central.push(cen, n);
    offset += 30 + n.length + datos.length;
  }
  const tam = central.reduce((s, p) => s + p.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tam, true); fin.setUint32(16, offset, true);
  return new Blob([...partes, ...central, fin], { type: 'application/zip' });
}
