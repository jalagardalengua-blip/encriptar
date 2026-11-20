import { useEffect, useRef } from 'react';
import { Viewer } from '../viewer/Viewer';

interface Props {
  onReady(viewer: Viewer | null): void;
}

/** Monta el visor Three.js en un contenedor y lo libera al desmontarse. */
export function ViewerCanvas({ onReady }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const viewer = new Viewer(el);
    onReady(viewer);
    return () => {
      onReady(null);
      viewer.dispose();
    };
  }, [onReady]);
  return <div ref={ref} className="absolute inset-0" aria-label="Visor 3D" role="img" />;
}
