import { afterAll, describe, expect, it } from 'vitest';
import { closeProjectsDb, deleteProject, getProject, listProjects, saveProject } from '../src/storage/projectsDb';

afterAll(() => closeProjectsDb());

describe('proyectos en IndexedDB', () => {
  it('guarda, lista, actualiza y borra', async () => {
    const a = await saveProject({ name: 'Uno', generatorId: 'utilidad.primitivas', generatorVersion: '0.1.0', values: { ruido: 0.1 } });
    await new Promise((r) => setTimeout(r, 5));
    const b = await saveProject({ name: '  ', generatorId: 'utilidad.primitivas', generatorVersion: '0.1.0', values: {} });
    expect(b.name).toBe('Sin título');
    let list = await listProjects();
    expect(list.map((p) => p.id)).toEqual([b.id, a.id]);

    await new Promise((r) => setTimeout(r, 5));
    const a2 = await saveProject({ id: a.id, name: 'Uno bis', generatorId: 'utilidad.primitivas', generatorVersion: '0.1.0', values: { ruido: 0.2 } });
    expect(a2.createdAt).toBe(a.createdAt);
    expect(a2.updatedAt).toBeGreaterThan(a.updatedAt);
    expect((await getProject(a.id))?.values).toEqual({ ruido: 0.2 });
    list = await listProjects();
    expect(list[0]!.id).toBe(a.id);

    await deleteProject(b.id);
    expect(await getProject(b.id)).toBeUndefined();
    expect(await listProjects()).toHaveLength(1);
  });
});
