import { create } from 'zustand';
import { registry } from '../engine/generators';
import { defaultValues, sanitizeValue, sanitizeValues, type ParamValue, type ParamValues } from '../engine/procedural/params';
import type { DetailLevel } from '../engine/procedural/types';
import type { Mask, PhotoView, RGBAImage } from '../engine/photo/types';

/** Foto de referencia de la sesión (no se guarda en los proyectos). */
export interface PhotoState {
  name: string;
  image: RGBAImage;
  mask: Mask | null;
  /** Vista ajustada; mientras sea null la foto no se proyecta. */
  view: PhotoView | null;
  iou: number | null;
}

export type SourceMode = 'generator' | 'imported';

export interface StudioState {
  generatorId: string;
  values: ParamValues;
  detail: DetailLevel;
  wireframe: boolean;
  showGrid: boolean;
  source: SourceMode;
  importedName: string | null;
  /** Proyecto de IndexedDB abierto actualmente (para sobrescribirlo al guardar). */
  projectId: string | null;
  projectName: string;
  status: { kind: 'info' | 'error'; text: string } | null;
  photo: PhotoState | null;

  selectGenerator(id: string): void;
  setParam(key: string, value: unknown): void;
  setValues(values: Partial<Record<string, unknown>>): void;
  applyPreset(presetId: string): void;
  resetParams(): void;
  setDetail(d: DetailLevel): void;
  toggleWireframe(): void;
  toggleGrid(): void;
  setImported(name: string): void;
  backToGenerator(): void;
  setProject(id: string | null, name: string): void;
  setStatus(kind: 'info' | 'error', text: string): void;
  clearStatus(): void;
  setPhoto(name: string, image: RGBAImage): void;
  setPhotoMask(mask: Mask): void;
  setPhotoFit(view: PhotoView, iou: number): void;
  clearPhoto(): void;
}

function requireGenerator(id: string) {
  const g = registry.get(id);
  if (!g) throw new Error(`Generador desconocido: ${id}`);
  return g;
}

const initial = registry.list()[0];
if (!initial) throw new Error('No hay generadores registrados');

export const useStudio = create<StudioState>((set, get) => ({
  generatorId: initial.id,
  values: defaultValues(initial.params),
  detail: 'medio',
  wireframe: false,
  showGrid: true,
  source: 'generator',
  importedName: null,
  projectId: null,
  projectName: 'Sin título',
  status: null,
  photo: null,

  selectGenerator(id) {
    const g = requireGenerator(id);
    set({ generatorId: id, values: defaultValues(g.params), source: 'generator', projectId: null });
  },
  setParam(key, value) {
    const g = requireGenerator(get().generatorId);
    const def = g.params.find((p) => p.key === key);
    if (!def) return;
    const v: ParamValue = sanitizeValue(def, value);
    set({ values: { ...get().values, [key]: v }, source: 'generator' });
  },
  setValues(values) {
    const g = requireGenerator(get().generatorId);
    set({ values: sanitizeValues(g.params, { ...get().values, ...values }), source: 'generator' });
  },
  applyPreset(presetId) {
    const g = requireGenerator(get().generatorId);
    const p = g.presets?.find((x) => x.id === presetId);
    if (p) get().setValues(p.values);
  },
  resetParams() {
    const g = requireGenerator(get().generatorId);
    set({ values: defaultValues(g.params), source: 'generator' });
  },
  setDetail: (detail) => set({ detail }),
  toggleWireframe: () => set({ wireframe: !get().wireframe }),
  toggleGrid: () => set({ showGrid: !get().showGrid }),
  setImported: (name) => set({ source: 'imported', importedName: name }),
  backToGenerator: () => set({ source: 'generator', importedName: null }),
  setProject: (projectId, projectName) => set({ projectId, projectName }),
  setStatus: (kind, text) => set({ status: { kind, text } }),
  clearStatus: () => set({ status: null }),
  setPhoto: (name, image) => set({ photo: { name, image, mask: null, view: null, iou: null } }),
  // un recorte nuevo invalida el ajuste anterior
  setPhotoMask: (mask) => { const p = get().photo; if (p) set({ photo: { ...p, mask, view: null, iou: null } }); },
  setPhotoFit: (view, iou) => { const p = get().photo; if (p) set({ photo: { ...p, view, iou } }); },
  clearPhoto: () => set({ photo: null }),
}));
