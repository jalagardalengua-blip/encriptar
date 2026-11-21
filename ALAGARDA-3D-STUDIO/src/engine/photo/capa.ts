import type { CapaToro } from '../procedural/domain';
import { maskBBox, rgbToLab } from './image';
import type { Mask, RGBAImage } from './types';

export interface CapaDetection {
  capa: CapaToro;
  calcetero: boolean;
  /** Datos medidos, para mostrarlos y depurar. */
  stats: { L: number; chroma: number; hue: number; light: number; dark: number; patchy: number };
}

/**
 * Deduce la capa a partir de los píxeles del toro (sin las patas ni la zona de las astas):
 * luminosidad y tono medios en CIELAB, proporción de pelo claro/oscuro y si lo claro
 * forma manchas grandes (berrendo) o va mezclado pelo a pelo (cárdeno, salinero).
 */
export function detectCapa(img: RGBAImage, mask: Mask): CapaDetection {
  const bb = maskBBox(mask);
  if (!bb) throw new Error('detectCapa(): máscara vacía');
  const W = img.width, H = img.height;
  const sx = W / mask.width, sy = H / mask.height;
  const bodyTop = bb.y0 + (bb.y1 - bb.y0) * 0.22, bodyBottom = bb.y0 + (bb.y1 - bb.y0) * 0.62;
  const legTop = bb.y0 + (bb.y1 - bb.y0) * 0.82;
  const isLight = (L: number) => L > 62;
  const isDark = (L: number) => L < 30;
  let n = 0, sL = 0, sa = 0, sb = 0, light = 0, dark = 0, patchHits = 0, legN = 0, legLight = 0;
  const lightMap = new Uint8Array(mask.width * mask.height);
  const bodyMap = new Uint8Array(mask.width * mask.height);
  for (let y = bb.y0; y < bb.y1; y++) {
    for (let x = bb.x0; x < bb.x1; x++) {
      const mi = y * mask.width + x;
      if (!mask.data[mi]) continue;
      const ii = (Math.min(H - 1, Math.floor(y * sy)) * W + Math.min(W - 1, Math.floor(x * sx))) * 4;
      const [L, A, B] = rgbToLab(img.data[ii]!, img.data[ii + 1]!, img.data[ii + 2]!);
      if (y > legTop) {
        legN++;
        if (isLight(L)) legLight++;
      }
      if (y < bodyTop || y > bodyBottom) continue;
      bodyMap[mi] = 1;
      n++; sL += L; sa += A; sb += B;
      if (isLight(L)) { light++; lightMap[mi] = 1; }
      if (isDark(L)) dark++;
    }
  }
  if (!n) throw new Error('detectCapa(): no hay cuerpo visible');
  // ¿lo claro forma manchas? fracción de píxeles claros rodeados casi sólo de claros
  const r = Math.max(2, Math.round((bb.x1 - bb.x0) / 60));
  for (let y = bb.y0; y < bb.y1; y++) {
    for (let x = bb.x0; x < bb.x1; x++) {
      const mi = y * mask.width + x;
      if (!lightMap[mi]) continue;
      let tot = 0, lit = 0;
      for (let dy = -r; dy <= r; dy += r) for (let dx = -r; dx <= r; dx += r) {
        const j = (y + dy) * mask.width + (x + dx);
        if (y + dy < 0 || y + dy >= mask.height || x + dx < 0 || x + dx >= mask.width || !bodyMap[j]) continue;
        tot++;
        if (lightMap[j]) lit++;
      }
      if (tot >= 6 && lit / tot > 0.85) patchHits++;
    }
  }
  const L = sL / n, a = sa / n, b = sb / n;
  const chroma = Math.hypot(a, b), hue = (Math.atan2(b, a) * 180) / Math.PI;
  const lightF = light / n, darkF = dark / n, patchy = light ? patchHits / light : 0;
  let capa: CapaToro;
  if (lightF > 0.7) capa = chroma > 14 ? 'jabonero' : 'ensabanado';
  else if (lightF > 0.15 && darkF > 0.15) capa = patchy > 0.55 ? 'berrendo' : chroma > 12 ? 'salinero' : 'cárdeno';
  else if (L < 24 && chroma < 12) capa = 'negro';
  else if (chroma > 22 && L > 30) capa = 'colorado';
  else if (chroma > 10) capa = L > 45 ? 'jabonero' : 'castaño';
  else capa = L < 40 ? 'negro' : 'cárdeno';
  const calcetero = lightF < 0.4 && legN > 20 && legLight / legN > 0.45;
  return { capa, calcetero, stats: { L, chroma, hue, light: lightF, dark: darkF, patchy } };
}
