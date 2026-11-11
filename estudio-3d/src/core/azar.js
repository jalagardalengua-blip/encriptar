// Números aleatorios reproducibles: la misma semilla da siempre el mismo modelo.

export function crearAzar(semilla = 1) {
  let s = (Math.floor(semilla) * 2654435761) >>> 0 || 1;
  const azar = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Número entre a y b */
  azar.entre = (a, b) => a + (b - a) * azar();
  /** Entero entre a y b (ambos incluidos) */
  azar.entero = (a, b) => Math.floor(azar.entre(a, b + 1));
  /** Elemento al azar de una lista */
  azar.elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  /** Variación ±v alrededor de 1 */
  azar.variar = (v) => 1 + (azar() * 2 - 1) * v;
  return azar;
}
