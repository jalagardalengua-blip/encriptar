import { useCallback, useEffect, useState } from 'react';
import { deleteProject, listProjects, type StoredProject } from '../storage/projectsDb';

interface Props {
  onOpen(project: StoredProject): void;
  /** Cambia cada vez que se guarda un proyecto, para refrescar la lista. */
  revision: number;
}

/** Lista de proyectos guardados en IndexedDB, con abrir y borrar. */
export function ProjectsPanel({ onOpen, revision }: Props) {
  const [items, setItems] = useState<StoredProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // confirmación en la propia página (los diálogos del navegador no existen en todos los visores)
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listProjects().then(setItems, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  if (error) return <p className="text-sm text-red-400">No se pudo abrir el almacenamiento local: {error}</p>;
  if (!items) return <p className="text-sm text-neutral-400">Cargando…</p>;
  if (items.length === 0) return <p className="text-sm text-neutral-400">Todavía no hay proyectos guardados en este navegador.</p>;
  return (
    <ul className="divide-y divide-edge">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{p.name}</p>
            <p className="text-xs text-neutral-500">{new Date(p.updatedAt).toLocaleString()}</p>
          </div>
          {confirming === p.id ? (
            <>
              <span className="text-xs text-neutral-400">¿Borrar?</span>
              <button type="button" onClick={() => { setConfirming(null); deleteProject(p.id).then(refresh, (e: unknown) => setError(String(e))); }}
                className="rounded-md border border-red-400 px-2.5 py-1 text-sm text-red-300">Sí, borrar</button>
              <button type="button" onClick={() => setConfirming(null)} className="rounded-md border border-edge px-2.5 py-1 text-sm hover:border-gold">No</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onOpen(p)} className="rounded-md border border-edge px-2.5 py-1 text-sm hover:border-gold">Abrir</button>
              <button type="button" aria-label={`Borrar ${p.name}`} onClick={() => setConfirming(p.id)}
                className="rounded-md border border-edge px-2.5 py-1 text-sm text-red-300 hover:border-red-400">Borrar</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
