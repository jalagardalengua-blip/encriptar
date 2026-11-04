// Configuración global de POLICE: LIFE ON DUTY (demo técnica web)
export const CITY = {
  N: 8,            // intersecciones por lado (7x7 manzanas)
  BLOCK: 72,       // tamaño de manzana incluida la acera (m)
  ROAD: 16,        // ancho de calzada (2 carriles por sentido)
  SIDEWALK: 4,
  CURB: 0.15,
};
CITY.PITCH = CITY.BLOCK + CITY.ROAD;            // 88 m entre ejes de calle
CITY.HALF = ((CITY.N - 1) * CITY.PITCH) / 2;     // 308 m
CITY.LANE_IN = 2.2;   // carril interior (circulación)
CITY.LANE_OUT = 6.0;  // carril exterior
CITY.PARK = 6.7;      // estacionamiento

export const nodeCoord = (i) => i * CITY.PITCH - CITY.HALF;
export const coordNode = (x) => Math.round((x + CITY.HALF) / CITY.PITCH);
export const clampNode = (i) => Math.max(0, Math.min(CITY.N - 1, i));

// Direcciones: 0:+X (este) 1:+Z (sur) 2:-X (oeste) 3:-Z (norte)
export const DIRS = [
  [1, 0], [0, 1], [-1, 0], [0, -1],
];
// Vector a la derecha del sentido de marcha (circulación por la derecha)
export const rightOf = (d) => {
  const [dx, dz] = DIRS[d];
  return [-dz, dx];
};

export const QUALITY = {
  bajo:   { label: 'Bajo',   pixelRatio: 1.0,  shadowSize: 1024, ao: false, smaa: false, bloom: true, traffic: 22, peds: 36, aniso: 2,  rain: 2000, cones: false },
  medio:  { label: 'Medio',  pixelRatio: 1.0,  shadowSize: 2048, ao: false, smaa: true,  bloom: true, traffic: 30, peds: 56, aniso: 4,  rain: 5000, cones: true },
  alto:   { label: 'Alto',   pixelRatio: 1.25, shadowSize: 2048, ao: true,  smaa: true,  bloom: true, traffic: 38, peds: 72, aniso: 8,  rain: 8000, cones: true },
  ultra:  { label: 'Ultra',  pixelRatio: 2.0,  shadowSize: 4096, ao: true,  smaa: true,  bloom: true, traffic: 46, peds: 90, aniso: 16, rain: 12000, cones: true },
};

export function defaultQuality() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
  if (mobile) return 'bajo';
  return 'alto';
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RANKS = [
  { xp: 0, name: 'Agente en prácticas' },
  { xp: 600, name: 'Agente' },
  { xp: 1600, name: 'Agente experimentado' },
  { xp: 3200, name: 'Investigador/a' },
  { xp: 5400, name: 'Especialista' },
  { xp: 8500, name: 'Supervisor/a' },
  { xp: 13000, name: 'Mando' },
];

export const CITY_NAME = 'VALMORA';

export const STREETS_X = ['Calle del Puerto', 'Calle Alcalá Vieja', 'Calle Mayor', 'Calle de la Luna', 'Calle del Prado', 'Calle San Telmo', 'Calle de los Olmos', 'Ronda Norte'];
export const STREETS_Z = ['Av. de Poniente', 'Av. de la Marina', 'Av. Constitución', 'Paseo Central', 'Av. de Levante', 'Av. Industrial', 'Av. del Ferrocarril', 'Ronda Este'];
// Nota: STREETS_X recorren el eje X (z constante); índice por j. STREETS_Z recorren el eje Z (x constante); índice por i.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
