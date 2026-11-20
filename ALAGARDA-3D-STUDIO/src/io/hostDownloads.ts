/**
 * Descargas cuando la aplicación se publica como página de claude.ai: allí las descargas
 * pasan por la capacidad `downloads` del visor, que sólo admite ciertas extensiones
 * (no `.glb`), así que el GLB se entrega dentro de un `.zip`. Fuera de claude.ai no existe
 * `window.claude` y se usa la descarga normal del navegador.
 */
export interface HostDownloads {
  save(request: { filename: string; data: Blob | ArrayBuffer | ArrayBufferView | string }): Promise<{ status: 'saved' | 'delivered' }>;
}

interface ClaudeHost {
  use(name: 'downloads'): Promise<HostDownloads | null>;
}

let pending: Promise<HostDownloads | null> | null = null;

export function hostDownloads(): Promise<HostDownloads | null> {
  if (!pending) {
    const host = (globalThis as { claude?: ClaudeHost }).claude;
    pending = host && typeof host.use === 'function'
      ? host.use('downloads').catch(() => null)
      : Promise.resolve(null);
  }
  return pending;
}

/** Mensaje legible para los códigos de error de `downloads.save`. */
export function describeSaveError(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'declined': return 'Descarga cancelada';
    case 'rate_limited': return 'Hay otra descarga pendiente; inténtalo en unos segundos';
    case 'too_large': return 'El archivo es demasiado grande para este visor; baja el nivel de detalle';
    default: return `No se pudo descargar${code ? ` (${code})` : ''}`;
  }
}
