import type { Noise3 } from '../../math/noise';
import { lerp, smoothstep } from '../../math/scalar';
import type { CapaToro, ParticularidadesToro } from '../../procedural/domain';
import { CAPAS } from './data';

/** Zonas del pelaje: cada malla con pelo pertenece a una. */
export type Region = 'cuerpo' | 'cuello' | 'cabeza' | 'oreja' | 'testuz' | 'brazo' | 'cana' | 'rabo' | 'escroto' | 'ubre';

/** Puntos anatómicos en el espacio del toro (metros, suelo en y = 0, frente hacia +z). */
export interface Landmarks {
  forehead: [number, number, number];
  muzzle: [number, number, number];
  bellyY: number;
  rumpZ: number;
}

export interface CoatOptions {
  capa: CapaToro;
  noise: Noise3;
  /** Desplazamiento del campo de ruido derivado de la semilla. */
  offset: number;
  particularidades: ParticularidadesToro;
  /** 0..1: polvo de albero en patas y vientre. */
  polvo: number;
  landmarks: Landmarks;
}

type RGB = [number, number, number];
const BLACK: RGB = [0.02, 0.018, 0.017];
const WHITE: RGB = [0.72, 0.68, 0.62];
const ALBERO: RGB = [0.42, 0.27, 0.13];

function mix(out: RGB, c: readonly number[], t: number): void {
  out[0] = lerp(out[0], c[0]!, t);
  out[1] = lerp(out[1], c[1]!, t);
  out[2] = lerp(out[2], c[2]!, t);
}

/**
 * Color lineal del pelo en un punto. Adaptación de `coat()` de TORERO (src/assets.js:62), que
 * evaluaba los patrones en coordenadas de la esfera unitaria; aquí se evalúan en metros y se
 * añaden las particularidades de GANADERIA-27 (lucero, bragado, calcetero, rabicano),
 * oscurecimiento de cabos, hocico y polvo de albero.
 */
export function createCoat(o: CoatOptions) {
  const { noise: N, offset: s, capa, particularidades: pa, landmarks: L } = o;
  const C = CAPAS[capa];
  const n3 = (x: number, y: number, z: number, f: number) => N.noise(x * f + s, y * f, z * f - s);
  const fb = (x: number, y: number, z: number, f: number, oct = 3) => N.fbm(x * f + s, y * f - s, z * f, oct);
  const extremidadesOscuras = capa === 'castaño' || capa === 'colorado' || capa === 'jabonero' || capa === 'salinero' || capa === 'chorreado';
  const out: RGB = [0, 0, 0];
  const mixed: RGB = [0, 0, 0];
  /** Capa entrecana: proporción local de pelos claros variable por zonas, menor en cabos y cabeza. */
  const entrecano = (x: number, y: number, z: number, region: Region, claro: number, dark: RGB, light: RGB): RGB => {
    let p = claro + 0.22 * fb(x, y, z, 2.5, 3);
    if (region === 'cana' || region === 'cabeza' || region === 'oreja') p -= 0.18;
    const hair = 0.5 + 0.5 * n3(x, y, z, 170) + 0.25 * n3(x, y, z, 23);
    const t = smoothstep(p + 0.08, p - 0.08, hair);
    mixed[0] = lerp(dark[0], light[0], t);
    mixed[1] = lerp(dark[1], light[1], t);
    mixed[2] = lerp(dark[2], light[2], t);
    return mixed;
  };

  return function coat(x: number, y: number, z: number, region: Region): RGB {
    let c: readonly number[] = C.base;
    switch (capa) {
      case 'cárdeno': {
        // mezcla fina de pelos negros y blancos: de cerca se ven los pelos, de lejos se lee gris
        c = entrecano(x, y, z, region, 0.32, BLACK, [0.36, 0.36, 0.35]);
        break;
      }
      case 'berrendo': {
        const n = fb(x, y, z, 1.8) + n3(x, y, z, 14) * 0.04;
        c = n > 0.04 ? BLACK : WHITE;
        break;
      }
      case 'salinero': {
        c = entrecano(x, y, z, region, 0.42, [0.16, 0.042, 0.017], [0.42, 0.34, 0.28]);
        break;
      }
      case 'sardo': {
        const n = fb(x, y, z, 2.4), n2 = n3(x, y, z, 9);
        c = n > 0.12 ? BLACK : n > -0.12 ? (n2 > 0 ? [0.3, 0.08, 0.03] : [0.2, 0.06, 0.025]) : WHITE;
        break;
      }
      case 'chorreado': {
        const st = Math.sin(z * 24 + n3(x, y, z, 3) * 5 + y * 3);
        c = st > 0.35 ? [0.025, 0.018, 0.014] : C.base;
        break;
      }
      case 'burraco': {
        const n = fb(x, y, z, 1.8);
        if (n > 0.04) {
          c = entrecano(x, y, z, region, 0.3, BLACK, [0.36, 0.36, 0.35]);
        } else c = WHITE;
        break;
      }
      default:
        break;
    }
    out[0] = c[0]!;
    out[1] = c[1]!;
    out[2] = c[2]!;

    // entrepelado: pelos blancos sueltos sobre fondo negro
    if (capa === 'entrepelado' && n3(x, y, z, 95) > 0.42) mix(out, [0.5, 0.49, 0.46], 0.45);

    // variación suave del tono (zonas más claras/oscuras del pelaje)
    const v = 1 + 0.16 * fb(x, y, z, 4, 2);
    out[0] *= v;
    out[1] *= v;
    out[2] *= v;

    // cabos (patas bajas, cabeza) más oscuros en capas rojizas y claras
    if (extremidadesOscuras) {
      if (region === 'cana') mix(out, [out[0] * 0.35, out[1] * 0.35, out[2] * 0.35], smoothstep(0.55, 0.2, y));
      if (region === 'cabeza' || region === 'oreja' || region === 'testuz') mix(out, [out[0] * 0.55, out[1] * 0.55, out[2] * 0.55], 0.6);
    }

    // hocico y contorno de la boca
    if (region === 'cabeza') {
      const d = Math.hypot(x - L.muzzle[0], y - L.muzzle[1], z - L.muzzle[2]);
      mix(out, [0.035, 0.03, 0.028], smoothstep(0.17, 0.08, d));
    }

    if (pa.lucero && (region === 'cabeza' || region === 'testuz')) {
      const d = Math.hypot(x - L.forehead[0], y - L.forehead[1], z - L.forehead[2]);
      if (d < 0.05 * (1 + 0.35 * n3(x, y, z, 40))) mix(out, [0.8, 0.78, 0.72], 1);
    }
    if (pa.bragado && (region === 'cuerpo' || region === 'escroto' || region === 'ubre')) {
      const t = smoothstep(L.bellyY + 0.12, L.bellyY + 0.02, y + 0.03 * n3(x, y, z, 12)) * smoothstep(0.75, 0.45, Math.abs(z));
      mix(out, [0.78, 0.75, 0.69], t > 0.5 ? 1 : 0);
    }
    if (pa.calcetero && region === 'cana' && y < 0.3 + 0.04 * n3(x, y, z, 10)) mix(out, [0.8, 0.77, 0.7], 1);
    if (pa.rabicano && (region === 'rabo' || (region === 'cuerpo' && z < L.rumpZ + 0.3)) && n3(x, y, z, 110) > 0.38) {
      mix(out, [0.7, 0.68, 0.64], 0.6);
    }

    // polvo de albero en las patas y bajos
    if (o.polvo > 0) {
      const t = o.polvo * smoothstep(0.45, 0.04, y) * (0.5 + 0.5 * n3(x, y, z, 7));
      mix(out, ALBERO, Math.min(0.7, t * 0.8));
    }
    return out;
  };
}
