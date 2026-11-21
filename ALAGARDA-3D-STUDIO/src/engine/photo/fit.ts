import { createNoise3 } from '../math/noise';
import { createRng } from '../math/random';
import { sanitizeValues, type ParamValues } from '../procedural/params';
import { disposeObject } from '../procedural/registry';
import { buildToroShape, poseToro, toroGenerator } from '../generators/toro';
import {
  boundaryDistance, GRID_H, GRID_W, iou, normalizePhotoMask, projectModel, rasterizeModel, silhouetteLoss,
} from './silhouette';
import type { Mask, PhotoView } from './types';

/** Parámetros continuos que se ajustan a la silueta, con su rango. */
const CONTINUOUS: { key: string; min: number; max: number; step: number }[] = [
  { key: 'longitud', min: 0.85, max: 1.2, step: 0.06 },
  { key: 'alzada', min: 0.88, max: 1.12, step: 0.05 },
  { key: 'patas', min: 0.88, max: 1.15, step: 0.05 },
  { key: 'morrillo', min: 0, max: 1.6, step: 0.3 },
  { key: 'perimetro', min: 0.85, max: 1.2, step: 0.06 },
  { key: 'papada', min: 0, max: 1.6, step: 0.4 },
  { key: 'largoAsta', min: 0.5, max: 1.5, step: 0.2 },
];
const VIEW_LIMITS = { yaw: 0.9, pitch: 0.45 };

export interface FitProgress {
  /** 0..1 */
  progress: number;
  stage: string;
  iou: number;
}

export interface FitResult {
  values: ParamValues;
  view: PhotoView;
  /** Coincidencia de siluetas (intersección / unión), 0..1. */
  iou: number;
  evaluations: number;
  /** Siluetas finales en la rejilla de comparación, para mostrarlas. */
  target: Uint8Array;
  model: Uint8Array;
  gridWidth: number;
  gridHeight: number;
}

export interface FitOptions {
  /** Valores de partida (se conservan los no ajustados: capa, divisa…). */
  start: Partial<ParamValues>;
  /** Se prueban todas las posturas y encornaduras (más lento, más fiel). */
  explore?: boolean;
  maxEvaluations?: number;
  onProgress?: (p: FitProgress) => void;
  signal?: AbortSignal;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Ajusta el generador de toro a la silueta de una foto por análisis por síntesis:
 * genera la forma, la proyecta con una cámara ortográfica, la compara con la máscara
 * de la foto y mejora parámetros y cámara por descenso coordenado con pasos decrecientes.
 */
export async function fitToroToMask(mask: Mask, o: FitOptions): Promise<FitResult> {
  const norm = normalizePhotoMask(mask);
  if (!norm) throw new Error('La máscara está vacía: marca el toro en la foto');
  const target = norm.grid;
  const dist = boundaryDistance(target);
  const maxEval = o.maxEvaluations ?? 320;
  let evals = 0;

  // la divisa no se ve en la silueta: se quita durante el ajuste y se respeta al final
  const original = sanitizeValues(toroGenerator.params, o.start);
  const base: ParamValues = { ...original, encaste: 'Domecq', divisa: false };
  const seed = typeof base.seed === 'number' ? base.seed : 1;

  const silhouette = (values: ParamValues, view: PhotoView): Uint8Array => {
    const a = buildToroShape(values, createNoise3(seed), createRng(seed), 0.45);
    poseToro(a, String(values.postura));
    const grid = rasterizeModel(projectModel(a.root, view));
    disposeObject(a.root);
    return grid;
  };
  const score = (values: ParamValues, view: PhotoView) => {
    evals++;
    return silhouetteLoss(silhouette(values, view), target, dist);
  };

  let best = { values: base, view: { yaw: 0, pitch: 0.08, mirror: false } as PhotoView, loss: Infinity };
  const report = async (stage: string) => {
    o.onProgress?.({ progress: Math.min(1, evals / maxEval), stage, iou: 0 });
    await tick();
    if (o.signal?.aborted) throw new DOMException('Ajuste cancelado', 'AbortError');
  };

  // 1) orientación y postura: de qué lado mira y cuánto gira
  const posturas = o.explore === false ? [String(base.postura)] : ['parado', 'paso', 'humillando', 'alerta'];
  for (const mirror of [false, true]) {
    for (const yaw of [-0.6, -0.3, 0, 0.3, 0.6]) {
      for (const postura of posturas) {
        const v = { ...best.values, postura };
        const view = { yaw, pitch: 0.08, mirror };
        const l = score(v, view);
        if (l < best.loss) best = { values: v, view, loss: l };
      }
      await report('Orientación');
    }
  }

  // 2) descenso coordenado sobre proporciones y cámara
  const steps = new Map<string, number>(CONTINUOUS.map((c) => [c.key, c.step]));
  let yawStep = 0.15, pitchStep = 0.1;
  const descend = async (rounds: number, stage: string) => {
    for (let r = 0; r < rounds && evals < maxEval; r++) {
      let improved = false;
      for (const c of CONTINUOUS) {
        const st = steps.get(c.key)!;
        for (const dir of [1, -1]) {
          const cur = best.values[c.key] as number;
          const nv = Math.min(c.max, Math.max(c.min, cur + dir * st));
          if (nv === cur) continue;
          const v = { ...best.values, [c.key]: nv };
          const l = score(v, best.view);
          if (l < best.loss - 1e-6) { best = { ...best, values: v, loss: l }; improved = true; break; }
        }
      }
      for (const [k, st, lim] of [['yaw', yawStep, VIEW_LIMITS.yaw], ['pitch', pitchStep, VIEW_LIMITS.pitch]] as const) {
        for (const dir of [1, -1]) {
          const view = { ...best.view, [k]: Math.max(-lim, Math.min(lim, best.view[k] + dir * st)) };
          const l = score(best.values, view);
          if (l < best.loss - 1e-6) { best = { ...best, view, loss: l }; improved = true; break; }
        }
      }
      if (!improved) {
        for (const [k, v] of steps) steps.set(k, v * 0.5);
        yawStep *= 0.5;
        pitchStep *= 0.5;
      }
      await report(stage);
    }
  };
  await descend(10, 'Proporciones');

  // 3) encornadura y postura con las proporciones ya ajustadas
  if (o.explore !== false) {
    const opts = (key: string) => {
      const d = toroGenerator.params.find((p) => p.key === key);
      return d && d.type === 'enum' ? d.options.map((x) => x.value) : [];
    };
    for (const key of ['encornadura', 'postura']) {
      for (const value of opts(key)) {
        if (value === best.values[key] || value === 'cabestro') continue;
        const v = { ...best.values, [key]: value };
        const l = score(v, best.view);
        if (l < best.loss) best = { ...best, values: v, loss: l };
      }
      await report('Astas y postura');
    }
  }

  // 4) afinado final
  for (const [k, v] of steps) steps.set(k, Math.max(v, 0.02));
  yawStep = Math.max(yawStep, 0.05);
  pitchStep = Math.max(pitchStep, 0.04);
  await descend(12, 'Afinado');

  const model = silhouette(best.values, best.view);
  const result: FitResult = {
    values: { ...best.values, encaste: 'Domecq', divisa: original.divisa! },
    view: best.view,
    iou: iou(model, target),
    evaluations: evals,
    target,
    model,
    gridWidth: GRID_W,
    gridHeight: GRID_H,
  };
  o.onProgress?.({ progress: 1, stage: 'Listo', iou: result.iou });
  return result;
}

/** Silueta del modelo con unos valores y una vista (para pruebas y vistas previas). */
export function toroSilhouette(values: Partial<ParamValues>, view: PhotoView): Uint8Array {
  const v = sanitizeValues(toroGenerator.params, values);
  const seed = typeof v.seed === 'number' ? v.seed : 1;
  const a = buildToroShape(v, createNoise3(seed), createRng(seed), 0.45);
  poseToro(a, String(v.postura));
  const grid = rasterizeModel(projectModel(a.root, view));
  disposeObject(a.root);
  return grid;
}

