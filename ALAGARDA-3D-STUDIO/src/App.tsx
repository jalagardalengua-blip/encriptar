import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { registry } from './engine/generators';
import { disposeObject, runGenerator } from './engine/procedural/registry';
import type { DetailLevel } from './engine/procedural/types';
import { downloadFile, exportGLB, importGLTFFile, safeFilename } from './io/gltf';
import { useStudio } from './state/studioStore';
import { saveProject, type StoredProject } from './storage/projectsDb';
import { ParamPanel } from './ui/ParamPanel';
import { ProjectsPanel } from './ui/ProjectsPanel';
import { ViewerCanvas } from './ui/ViewerCanvas';
import { isWebGL2Available, type Viewer } from './viewer/Viewer';

interface ModelInfo {
  meshes: number;
  vertices: number;
  triangles: number;
  size: [number, number, number];
}

function infoOf(root: THREE.Object3D): ModelInfo {
  const info: ModelInfo = { meshes: 0, vertices: 0, triangles: 0, size: [0, 0, 0] };
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      info.meshes++;
      info.vertices += g.getAttribute('position').count;
      info.triangles += (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) info.size = box.getSize(new THREE.Vector3()).toArray() as [number, number, number];
  return info;
}

const btn = 'rounded-md border border-edge px-2.5 py-1 text-sm md:px-3 md:py-1.5 hover:border-gold disabled:opacity-40 disabled:hover:border-edge';
const btnOn = 'border-gold text-gold';

export default function App() {
  const [webgl] = useState(isWebGL2Available);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [tab, setTab] = useState<'params' | 'projects'>('params');
  const [imported, setImportedModel] = useState<{ group: THREE.Group; info: ModelInfo } | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = useStudio();
  const generator = registry.get(s.generatorId);

  // Los cambios de parámetros se aplican 250 ms después del último, para que arrastrar
  // un deslizador no regenere el modelo en cada paso.
  const [committed, setCommitted] = useState({ values: s.values, detail: s.detail });
  useEffect(() => {
    const t = setTimeout(() => setCommitted({ values: s.values, detail: s.detail }), 250);
    return () => clearTimeout(t);
  }, [s.values, s.detail]);
  const pending = committed.values !== s.values || committed.detail !== s.detail;

  // Generación: mismos parámetros ⇒ mismo modelo (función pura del motor).
  const output = useMemo(() => {
    if (!generator) return null;
    try {
      return { ok: true as const, out: runGenerator(generator, committed.values, committed.detail) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }, [generator, committed]);

  const generated = output?.ok ? output.out : null;
  const generatedInfo = useMemo(() => (generated ? infoOf(generated.root) : null), [generated]);

  useEffect(() => {
    if (!viewer || s.source !== 'generator' || !generated) return;
    viewer.setModel(generated.root, true);
    return () => disposeObject(generated.root);
  }, [viewer, generated, s.source]);

  useEffect(() => {
    if (!viewer || s.source !== 'imported' || !imported) return;
    viewer.setModel(imported.group, true);
  }, [viewer, imported, s.source]);

  useEffect(() => viewer?.setWireframe(s.wireframe), [viewer, s.wireframe, generated, imported]);
  useEffect(() => viewer?.setGridVisible(s.showGrid), [viewer, s.showGrid]);

  const onReady = useCallback((v: Viewer | null) => {
    // acceso para pruebas visuales automatizadas, sólo en desarrollo
    if (import.meta.env.DEV) (window as unknown as { __viewer?: Viewer | null }).__viewer = v;
    setViewer(v);
  }, []);

  const onExport = async () => {
    const model = viewer?.getModel();
    if (!model) return;
    setBusy(true);
    try {
      const glb = await exportGLB(model);
      const seed = s.values.seed;
      const name = s.source === 'imported'
        ? (s.importedName ?? 'importado').replace(/\.(glb|gltf)$/i, '')
        : s.projectId || s.projectName !== 'Sin título'
          ? s.projectName
          : `${generator?.name ?? 'modelo'}-${String(s.values.capa ?? '')}-${String(seed ?? '')}`;
      downloadFile(glb, safeFilename(name, 'glb'), 'model/gltf-binary');
      s.setStatus('info', `GLB exportado (${(glb.byteLength / 1024).toFixed(1)} KB)`);
    } catch (e) {
      s.setStatus('error', `Error al exportar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const group = await importGLTFFile(file);
      if (imported) disposeObject(imported.group);
      setImportedModel({ group, info: infoOf(group) });
      s.setImported(file.name);
      s.setStatus('info', `Importado: ${file.name}`);
    } catch (e) {
      s.setStatus('error', `No se pudo importar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSave = async () => {
    if (!generator) return;
    try {
      const p = await saveProject({
        ...(s.projectId ? { id: s.projectId } : {}),
        name: s.projectName,
        generatorId: generator.id,
        generatorVersion: generator.version,
        values: s.values,
      });
      s.setProject(p.id, p.name);
      setRevision((r) => r + 1);
      s.setStatus('info', `Proyecto «${p.name}» guardado en este navegador`);
    } catch (e) {
      s.setStatus('error', `No se pudo guardar: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onOpen = (p: StoredProject) => {
    const g = registry.get(p.generatorId);
    if (!g) {
      s.setStatus('error', `El proyecto usa un generador no disponible: ${p.generatorId}`);
      return;
    }
    s.selectGenerator(g.id);
    s.setValues(p.values);
    s.setProject(p.id, p.name);
    setTab('params');
    s.setStatus('info', g.version === p.generatorVersion ? `Abierto «${p.name}»` : `Abierto «${p.name}» (guardado con la versión ${p.generatorVersion}; actual ${g.version})`);
  };

  const info = s.source === 'imported' ? imported?.info : generatedInfo;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-edge bg-panel px-3 py-2">
        <h1 className="mr-2 text-sm font-bold tracking-[0.2em] text-gold">ALAGARDA 3D STUDIO</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btn} onClick={() => viewer?.frameModel()} disabled={!viewer}>Encuadrar</button>
          <button type="button" className={`${btn} ${s.wireframe ? btnOn : ''}`} aria-pressed={s.wireframe} onClick={s.toggleWireframe}>Alambre</button>
          <button type="button" className={`${btn} ${s.showGrid ? btnOn : ''}`} aria-pressed={s.showGrid} onClick={s.toggleGrid}>Rejilla</button>
          <label className="flex items-center">
            <select aria-label="Nivel de detalle" value={s.detail} onChange={(e) => s.setDetail(e.target.value as DetailLevel)} className="rounded-md border border-edge bg-ink px-2 py-1 text-sm text-neutral-100 md:py-1.5">
              <option value="bajo">Detalle bajo</option>
              <option value="medio">Detalle medio</option>
              <option value="alto">Detalle alto</option>
            </select>
          </label>
          <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={busy}>Importar glTF</button>
          <input ref={fileRef} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
          <button type="button" className={btn} onClick={() => void onExport()} disabled={busy || !viewer}>Exportar GLB</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="relative h-[55vh] flex-none md:h-auto md:flex-1">
          {webgl ? (
            <ViewerCanvas onReady={onReady} />
          ) : (
            <p className="p-6 text-sm text-red-300">Este navegador no admite WebGL2; el visor 3D no puede funcionar.</p>
          )}
          {output && !output.ok && s.source === 'generator' && (
            <p className="absolute left-3 top-3 rounded bg-red-900/80 px-3 py-2 text-sm">Error del generador: {output.error}</p>
          )}
          {pending && s.source === 'generator' && (
            <p className="pointer-events-none absolute right-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-gold">Generando…</p>
          )}
          {info && (
            <p className="pointer-events-none absolute bottom-2 left-3 rounded bg-black/50 px-2 py-1 font-mono text-[11px] text-neutral-300">
              {info.meshes} mallas · {info.vertices.toLocaleString()} vért. · {info.triangles.toLocaleString()} tri. · {info.size.map((v) => v.toFixed(2)).join(' × ')} m
            </p>
          )}
        </main>

        <aside className="flex min-h-0 flex-1 flex-col border-t border-edge bg-panel md:w-80 md:flex-none md:border-l md:border-t-0">
          <div className="flex border-b border-edge" role="tablist">
            {(['params', 'projects'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm ${tab === t ? 'border-b-2 border-gold text-gold' : 'text-neutral-400'}`}>
                {t === 'params' ? 'Parámetros' : 'Proyectos'}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {tab === 'params' ? (
              <>
                {s.source === 'imported' && (
                  <div className="rounded-md border border-gold/40 bg-gold/10 p-2 text-sm">
                    Mostrando modelo importado <b>{s.importedName}</b>.
                    <button type="button" className="ml-2 underline" onClick={s.backToGenerator}>Volver al generador</button>
                  </div>
                )}
                <label className="block space-y-1">
                  <span className="text-sm text-neutral-300">Generador</span>
                  <select value={s.generatorId} onChange={(e) => s.selectGenerator(e.target.value)} className="w-full rounded-md border border-edge bg-ink px-2 py-1.5 text-sm">
                    {registry.list().map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
                {generator && <p className="text-xs text-neutral-500">{generator.description} · v{generator.version}</p>}
                {generator?.presets && generator.presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {generator.presets.map((p) => (
                      <button key={p.id} type="button" className={btn} onClick={() => s.applyPreset(p.id)}>{p.label}</button>
                    ))}
                    <button type="button" className={btn} onClick={s.resetParams}>Restablecer</button>
                  </div>
                )}
                {generator && <ParamPanel generator={generator} values={s.values} onChange={s.setParam} />}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block space-y-1">
                    <span className="text-sm text-neutral-300">Nombre del proyecto</span>
                    <input value={s.projectName} onChange={(e) => s.setProject(s.projectId, e.target.value)} className="w-full rounded-md border border-edge bg-ink px-2 py-1.5 text-sm" />
                  </label>
                  <div className="flex gap-1.5">
                    <button type="button" className={btn} onClick={() => void onSave()}>{s.projectId ? 'Guardar cambios' : 'Guardar'}</button>
                    <button type="button" className={btn} onClick={() => { s.resetParams(); s.setProject(null, 'Sin título'); }}>Nuevo</button>
                  </div>
                </div>
                <ProjectsPanel onOpen={onOpen} revision={revision} />
              </>
            )}
          </div>
          {s.status && (
            <div role="status" className={`flex items-start gap-2 border-t border-edge px-3 py-2 text-xs ${s.status.kind === 'error' ? 'text-red-300' : 'text-neutral-300'}`}>
              <span className="flex-1">{s.status.text}</span>
              <button type="button" aria-label="Cerrar aviso" onClick={s.clearStatus} className="text-neutral-500 hover:text-neutral-200">✕</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
