import { useEffect, useRef, useState } from 'react';
import { toroGenerator } from '../engine/generators';
import { detectCapa } from '../engine/photo/capa';
import { fitToroToMask, type FitResult } from '../engine/photo/fit';
import { downscale } from '../engine/photo/image';
import { paintMask, segmentSubject } from '../engine/photo/segment';
import type { RGBAImage } from '../engine/photo/types';
import { CAPAS } from '../engine/generators/toro/data';
import { useStudio } from '../state/studioStore';

const btn = 'rounded-md border border-edge px-2.5 py-1 text-sm hover:border-gold disabled:opacity-40';
type Tool = 'toque' | 'anadir' | 'quitar';

async function fileToImage(file: File): Promise<RGBAImage> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite leer la imagen');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const d = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: d.data };
}

/** Pestaña «Foto»: cargar una foto de un toro, recortarlo y ajustar el generador a ella. */
export function PhotoPanel() {
  const s = useStudio();
  const photo = s.photo;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<Tool>('toque');
  const [brush, setBrush] = useState(14);
  const [clusters, setClusters] = useState(6);
  const [seed, setSeed] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState<{ p: number; stage: string } | null>(null);
  const [result, setResult] = useState<(FitResult & { capa: string }) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const painting = useRef(false);
  const [maskRev, setMaskRev] = useState(0);

  // dibujar la foto con el recorte superpuesto
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !photo) return;
    const { image, mask } = photo;
    cv.width = image.width;
    cv.height = image.height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const id = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    if (mask) {
      for (let i = 0; i < mask.data.length; i++) {
        if (mask.data[i]) {
          id.data[i * 4] = id.data[i * 4]! * 0.55 + 212 * 0.45;
          id.data[i * 4 + 1] = id.data[i * 4 + 1]! * 0.55 + 166 * 0.45;
          id.data[i * 4 + 2] = id.data[i * 4 + 2]! * 0.55 + 74 * 0.45;
        } else {
          id.data[i * 4] = id.data[i * 4]! * 0.5;
          id.data[i * 4 + 1] = id.data[i * 4 + 1]! * 0.5;
          id.data[i * 4 + 2] = id.data[i * 4 + 2]! * 0.5;
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }, [photo, maskRev]);

  const resegment = (img: RGBAImage, sd: { x: number; y: number } | null, k: number) => {
    s.setPhotoMask(segmentSubject(img, { clusters: k, seed: sd }));
    setResult(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await fileToImage(file);
      s.setPhoto(file.name, img);
      setSeed(null);
      resegment(img, null, clusters);
      s.setStatus('info', 'Foto cargada. Revisa el recorte dorado: toca el toro si no está bien marcado.');
    } catch (e) {
      s.setStatus('error', `No se pudo abrir la foto: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toImageCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width), y: ((e.clientY - r.top) / r.height) };
  };
  const brushAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo?.mask) return;
    const p = toImageCoords(e);
    paintMask(photo.mask, p.x * photo.mask.width, p.y * photo.mask.height, (brush / 400) * photo.mask.width, tool === 'anadir' ? 1 : 0);
    setMaskRev((r) => r + 1);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    if (tool === 'toque') {
      const sd = toImageCoords(e);
      setSeed(sd);
      resegment(photo.image, sd, clusters);
      return;
    }
    painting.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    brushAt(e);
  };
  const onPointerUp = () => {
    if (painting.current && photo?.mask) {
      painting.current = false;
      s.setPhotoMask({ ...photo.mask, data: photo.mask.data.slice() });
      setResult(null);
    }
  };

  const runFit = async () => {
    if (!photo?.mask) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setProgress({ p: 0, stage: 'Preparando' });
    try {
      const start = s.generatorId === toroGenerator.id ? s.values : {};
      const fit = await fitToroToMask(photo.mask, {
        start,
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ p: p.progress, stage: p.stage }),
      });
      const det = detectCapa(downscale(photo.image, 512), photo.mask);
      if (s.generatorId !== toroGenerator.id) s.selectGenerator(toroGenerator.id);
      s.setValues({ ...fit.values, capa: det.capa, calcetero: det.calcetero, texturaFoto: true });
      s.setPhotoFit(fit.view, fit.iou);
      setResult({ ...fit, capa: det.capa });
      s.setStatus('info', `Toro ajustado a la foto: ${Math.round(fit.iou * 100)} % de coincidencia de silueta, capa ${CAPAS[det.capa].label.toLowerCase()}.`);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') s.setStatus('info', 'Ajuste cancelado');
      else s.setStatus('error', `No se pudo ajustar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const compareRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = compareRef.current;
    if (!cv || !result) return;
    cv.width = result.gridWidth;
    cv.height = result.gridHeight;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const id = ctx.createImageData(result.gridWidth, result.gridHeight);
    for (let i = 0; i < result.target.length; i++) {
      const t = result.target[i], m = result.model[i];
      const c = t && m ? [212, 166, 74] : t ? [90, 140, 220] : m ? [220, 80, 70] : [20, 23, 28];
      id.data.set([c[0]!, c[1]!, c[2]!, 255], i * 4);
    }
    ctx.putImageData(id, 0, 0);
  }, [result]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-300">
        Sube una foto de un toro, mejor de perfil y con el animal entero. El programa lo recorta, ajusta las proporciones,
        las astas, la postura y la capa del generador a la foto y proyecta la foto como textura.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={!!progress}>{photo ? 'Cambiar foto' : 'Subir foto'}</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        {photo && <button type="button" className={btn} onClick={() => { s.clearPhoto(); setResult(null); }} disabled={!!progress}>Quitar foto</button>}
      </div>

      {photo && (
        <>
          <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={(e) => painting.current && brushAt(e)} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            className="w-full touch-none rounded-md border border-edge" aria-label="Foto con el recorte del toro" />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Herramienta de recorte">
            {([['toque', 'Tocar el toro'], ['anadir', 'Pincel: añadir'], ['quitar', 'Pincel: quitar']] as const).map(([t, l]) => (
              <button key={t} type="button" role="radio" aria-checked={tool === t} onClick={() => setTool(t)}
                className={`${btn} ${tool === t ? 'border-gold text-gold' : ''}`}>{l}</button>
            ))}
          </div>
          {tool === 'toque' ? (
            <label className="block space-y-1 text-sm text-neutral-300">
              <span>Detalle del recorte ({clusters} grupos de color)</span>
              <input id="photo-clusters" type="range" min={3} max={9} value={clusters} className="w-full"
                onChange={(e) => { const k = Number(e.target.value); setClusters(k); resegment(photo.image, seed, k); }} />
            </label>
          ) : (
            <label className="block space-y-1 text-sm text-neutral-300">
              <span>Tamaño del pincel</span>
              <input id="photo-brush" type="range" min={4} max={40} value={brush} className="w-full" onChange={(e) => setBrush(Number(e.target.value))} />
            </label>
          )}

          {progress ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded bg-ink"><div className="h-full bg-gold transition-[width]" style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{progress.stage}… {Math.round(progress.p * 100)} %</span>
                <button type="button" className="underline" onClick={() => abortRef.current?.abort()}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${btn} w-full border-gold py-2 text-gold`} onClick={() => void runFit()} disabled={!photo.mask}>
              Ajustar el toro a la foto
            </button>
          )}

          {result && (
            <div className="space-y-1">
              <p className="text-sm">Coincidencia de silueta: <b className="text-gold">{Math.round(result.iou * 100)} %</b> · capa detectada: <b>{CAPAS[result.capa as keyof typeof CAPAS].label}</b></p>
              <canvas ref={compareRef} className="w-full rounded border border-edge [image-rendering:pixelated]" aria-label="Comparación de siluetas" />
              <p className="text-xs text-neutral-400">Dorado: coinciden · azul: sólo en la foto · rojo: sólo en el modelo.</p>
            </div>
          )}
          {photo.view && (
            <p className="text-xs text-neutral-500">La foto se usa como textura mientras «Usar la foto como textura» esté activado. No se guarda en los proyectos; el GLB exportado sí la lleva.</p>
          )}
        </>
      )}
    </div>
  );
}
