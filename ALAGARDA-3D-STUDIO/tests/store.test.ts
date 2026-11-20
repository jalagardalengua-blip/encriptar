import { beforeEach, describe, expect, it } from 'vitest';
import { primitivasGenerator } from '../src/engine/generators';
import { defaultValues } from '../src/engine/procedural/params';
import { useStudio } from '../src/state/studioStore';

describe('estado del estudio', () => {
  beforeEach(() => useStudio.getState().selectGenerator(primitivasGenerator.id));

  it('arranca con los valores por defecto del generador', () => {
    expect(useStudio.getState().values).toEqual(defaultValues(primitivasGenerator.params));
  });
  it('sanea los valores al editarlos e ignora claves desconocidas', () => {
    const s = useStudio.getState();
    s.setParam('ruido', 99);
    s.setParam('inexistente', 1);
    expect(useStudio.getState().values.ruido).toBe(0.3);
    expect('inexistente' in useStudio.getState().values).toBe(false);
  });
  it('aplica presets y restablece', () => {
    const s = useStudio.getState();
    s.applyPreset('organico');
    expect(useStudio.getState().values.ruido).toBe(0.14);
    s.resetParams();
    expect(useStudio.getState().values.ruido).toBe(0.06);
  });
  it('editar un parámetro vuelve del modelo importado al generador', () => {
    const s = useStudio.getState();
    s.setImported('x.glb');
    expect(useStudio.getState().source).toBe('imported');
    s.setParam('ruido', 0.1);
    expect(useStudio.getState().source).toBe('generator');
  });
});
