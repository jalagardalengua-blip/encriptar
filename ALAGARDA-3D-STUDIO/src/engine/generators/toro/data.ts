import type { CapaToro, Encornadura, TipoBovino } from '../../procedural/domain';

type RGB = [number, number, number];

/**
 * Colores base de cada capa en espacio lineal. Valores de `CAPAS` en TORERO (src/assets.js:60)
 * y, para entrepelado y burraco, de `PELO` en GANADERIA-27 (js/juego.js:22) convertidos a lineal.
 * `sheen` es el color del brillo rasante del pelo.
 */
export const CAPAS: Record<CapaToro, { label: string; base: RGB; sheen: RGB }> = {
  negro: { label: 'Negro', base: [0.019, 0.017, 0.016], sheen: [0.32, 0.26, 0.22] },
  'castaño': { label: 'Castaño', base: [0.07, 0.03, 0.013], sheen: [0.5, 0.28, 0.15] },
  colorado: { label: 'Colorado', base: [0.13, 0.036, 0.015], sheen: [0.55, 0.26, 0.15] },
  'cárdeno': { label: 'Cárdeno', base: [0.2, 0.2, 0.2], sheen: [0.45, 0.45, 0.45] },
  berrendo: { label: 'Berrendo en negro', base: [0.7, 0.66, 0.6], sheen: [0.6, 0.55, 0.5] },
  jabonero: { label: 'Jabonero', base: [0.4, 0.28, 0.15], sheen: [0.75, 0.62, 0.45] },
  ensabanado: { label: 'Ensabanado', base: [0.62, 0.59, 0.53], sheen: [0.85, 0.82, 0.78] },
  salinero: { label: 'Salinero', base: [0.4, 0.2, 0.12], sheen: [0.6, 0.45, 0.4] },
  sardo: { label: 'Sardo', base: [0.2, 0.08, 0.04], sheen: [0.5, 0.35, 0.3] },
  chorreado: { label: 'Chorreado en verdugo', base: [0.07, 0.03, 0.013], sheen: [0.5, 0.28, 0.15] },
  entrepelado: { label: 'Entrepelado', base: [0.018, 0.017, 0.014], sheen: [0.4, 0.38, 0.35] },
  burraco: { label: 'Burraco', base: [0.2, 0.2, 0.2], sheen: [0.45, 0.45, 0.45] },
};

/**
 * Puntos de control de cada asta (lado derecho, espacio de la cabeza, metros).
 * Las siete primeras son `HORNS` de TORERO (src/assets.js:71). Cornipaso, cornigacho y lira
 * se han convertido desde los parámetros [abierto, alto, delante, punta] de GANADERIA-27
 * (js/juego.js:68 y `hornGeo` en js/mundo3d.js:47) al mismo origen.
 */
const B: RGB = [0.1, 0.13, 0.02];
function fromGanaderia(out: number, up: number, fwd: number, tip: number): RGB[] {
  const L = 1;
  const p: RGB[] = [
    [0, 0, 0],
    [out * 0.45 * L, up * 0.22 * L, fwd * 0.3 * L],
    [out * 0.85 * L, up * 0.6 * L, fwd * 0.7 * L],
    [out * L * (tip < 0 ? 1 + tip * 1.6 : 1), up * L * (tip > 0 ? 0.92 : 1), fwd * L - (tip > 0 ? tip * 0.6 * L : 0)],
  ];
  // escala de GANADERIA (cuerpo ~1,25× el de TORERO) y traslado al origen de TORERO
  return p.map(([x, y, z]) => [B[0] + x * 0.62, B[1] + y * 0.62, B[2] + z * 0.62]);
}

export const ENCORNADURAS: Record<Encornadura, { label: string; points: RGB[] }> = {
  veleto: { label: 'Veleto', points: [[0.1, 0.13, 0.02], [0.21, 0.15, 0.03], [0.31, 0.21, 0.09], [0.35, 0.32, 0.17], [0.3, 0.42, 0.24]] },
  cornidelantero: { label: 'Cornidelantero', points: [[0.1, 0.13, 0.02], [0.22, 0.14, 0.06], [0.32, 0.17, 0.16], [0.35, 0.24, 0.28], [0.29, 0.3, 0.38]] },
  corniabierto: { label: 'Corniabierto', points: [[0.1, 0.13, 0.02], [0.24, 0.14, 0.02], [0.38, 0.18, 0.07], [0.47, 0.27, 0.14], [0.46, 0.37, 0.2]] },
  cabestro: { label: 'De cabestro', points: [[0.1, 0.13, 0.02], [0.26, 0.14, 0.0], [0.44, 0.2, 0.02], [0.58, 0.33, 0.08], [0.62, 0.5, 0.12]] },
  brocho: { label: 'Brocho', points: [[0.1, 0.13, 0.02], [0.2, 0.17, 0.02], [0.26, 0.26, 0.06], [0.25, 0.36, 0.12], [0.18, 0.44, 0.14]] },
  playero: { label: 'Playero', points: [[0.1, 0.13, 0.02], [0.25, 0.16, 0], [0.4, 0.24, 0.02], [0.5, 0.36, 0.08], [0.55, 0.48, 0.12]] },
  cornivuelto: { label: 'Cornivuelto', points: [[0.1, 0.13, 0.02], [0.22, 0.16, 0.04], [0.32, 0.26, 0.08], [0.34, 0.38, 0.06], [0.28, 0.46, -0.02]] },
  cornipaso: { label: 'Cornipaso', points: fromGanaderia(0.3, 0.52, -0.08, 0.12) },
  cornigacho: { label: 'Cornigacho', points: fromGanaderia(0.38, 0.12, 0.3, 0) },
  lira: { label: 'En lira', points: fromGanaderia(0.3, 0.68, 0.1, 0.18) },
};

/** Ajustes anatómicos por tipo de res (GANADERIA-27, `makeBull` y `morf`). */
export const TIPOS: Record<TipoBovino, {
  label: string;
  escala: number;
  perimetro: number;
  morrillo: number;
  patas: number;
  cabeza: number;
  asta: number;
  macho: boolean;
  castrado: boolean;
}> = {
  toro: { label: 'Toro', escala: 1, perimetro: 1, morrillo: 1, patas: 1, cabeza: 1, asta: 1, macho: true, castrado: false },
  vaca: { label: 'Vaca brava', escala: 0.9, perimetro: 0.86, morrillo: 0.25, patas: 1, cabeza: 0.9, asta: 0.85, macho: false, castrado: false },
  becerro: { label: 'Becerro', escala: 0.58, perimetro: 0.9, morrillo: 0.2, patas: 1.12, cabeza: 1.22, asta: 0.28, macho: true, castrado: false },
  cabestro: { label: 'Cabestro', escala: 1.04, perimetro: 1.05, morrillo: 0.45, patas: 1, cabeza: 1.04, asta: 1.15, macho: true, castrado: true },
};

/** Color de las astas: [base, centro, punta] en lineal. */
export const COLOR_ASTA: Record<string, { label: string; c: [RGB, RGB, RGB] }> = {
  acaramelado: { label: 'Acaramelado', c: [[0.11, 0.09, 0.07], [0.4, 0.31, 0.2], [0.02, 0.018, 0.016]] },
  blanco: { label: 'Blanco', c: [[0.2, 0.18, 0.15], [0.58, 0.54, 0.46], [0.03, 0.028, 0.025]] },
  oscuro: { label: 'Oscuro (pitones negros)', c: [[0.16, 0.13, 0.1], [0.12, 0.1, 0.08], [0.02, 0.018, 0.016]] },
};

/** Proporciones por encaste: [longitud, alzada, morrillo, patas] (GANADERIA-27, `ENCMORF`). */
export const ENCASTES: Record<string, [number, number, number, number]> = {
  Domecq: [1, 1, 1, 1],
  Albaserrada: [0.96, 0.93, 1.05, 0.92],
  Miura: [1.14, 1.12, 0.88, 1.14],
  'Santa Coloma': [0.93, 0.92, 0.95, 0.95],
  Atanasio: [1.07, 1.05, 1.05, 1.04],
  Cuadri: [1.05, 1.03, 1.22, 0.98],
};
