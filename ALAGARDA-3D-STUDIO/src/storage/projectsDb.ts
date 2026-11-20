import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ParamValues } from '../engine/procedural/params';

/** Proyecto guardado: sólo parámetros, no geometría. El modelo se regenera al cargarlo. */
export interface StoredProject {
  id: string;
  name: string;
  generatorId: string;
  generatorVersion: string;
  values: ParamValues;
  createdAt: number;
  updatedAt: number;
}

interface StudioDB extends DBSchema {
  projects: {
    key: string;
    value: StoredProject;
    indexes: { 'by-updated': number };
  };
}

export const DB_NAME = 'alagarda-3d-studio';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null;

function db(): Promise<IDBPDatabase<StudioDB>> {
  dbPromise ??= openDB<StudioDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore('projects', { keyPath: 'id' });
      store.createIndex('by-updated', 'updatedAt');
    },
  });
  return dbPromise;
}

/** Cierra la conexión (usado en pruebas). */
export async function closeProjectsDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveProject(
  input: Omit<StoredProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<StoredProject> {
  const d = await db();
  const now = Date.now();
  const prev = input.id ? await d.get('projects', input.id) : undefined;
  const project: StoredProject = {
    id: input.id ?? newId(),
    name: input.name.trim() || 'Sin título',
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    values: { ...input.values },
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
  await d.put('projects', project);
  return project;
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  return (await db()).get('projects', id);
}

/** Proyectos ordenados del más reciente al más antiguo. */
export async function listProjects(): Promise<StoredProject[]> {
  const all = await (await db()).getAllFromIndex('projects', 'by-updated');
  return all.reverse();
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete('projects', id);
}
