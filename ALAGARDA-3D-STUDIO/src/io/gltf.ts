import type * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Exporta un objeto a GLB binario (glTF 2.0). */
export async function exportGLB(object: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, { binary: true, onlyVisible: true });
  if (!(result instanceof ArrayBuffer)) throw new Error('GLTFExporter no devolvió un GLB binario');
  return result;
}

/** Exporta un objeto a glTF JSON (texto). */
export async function exportGLTFJson(object: THREE.Object3D): Promise<string> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, { binary: false, onlyVisible: true });
  if (result instanceof ArrayBuffer) throw new Error('Se esperaba glTF JSON');
  return JSON.stringify(result);
}

/** Importa un .glb o .gltf autocontenido (con buffers embebidos). */
export async function importGLTF(data: ArrayBuffer | string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(data, '');
  return gltf.scene;
}

/** Lee un archivo elegido por el usuario y lo importa. */
export async function importGLTFFile(file: File): Promise<THREE.Group> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.glb')) return importGLTF(await file.arrayBuffer());
  if (lower.endsWith('.gltf')) return importGLTF(await file.text());
  throw new Error('Formato no admitido: usa .glb o .gltf');
}

/** Descarga un buffer como archivo desde el navegador. */
export function downloadFile(data: ArrayBuffer | string, filename: string, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nombre de archivo seguro a partir de un texto libre. */
export function safeFilename(name: string, ext: string): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${base || 'modelo'}.${ext}`;
}
