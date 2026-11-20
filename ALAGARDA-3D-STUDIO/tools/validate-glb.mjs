// Valida un archivo .glb/.gltf con el validador oficial de Khronos (gltf-validator).
// Uso: npm run validate:glb -- ruta/al/modelo.glb
import fs from 'node:fs';
import validator from 'gltf-validator';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run validate:glb -- ruta/al/modelo.glb');
  process.exit(2);
}
const report = await validator.validateBytes(new Uint8Array(fs.readFileSync(file)));
const { numErrors, numWarnings, numInfos, messages } = report.issues;
for (const m of messages) if (m.severity < 2) console.log(`${m.severity === 0 ? 'ERROR' : 'AVISO'} ${m.code} ${m.pointer ?? ''}: ${m.message}`);
const i = report.info;
console.log(`glTF ${i.version} · ${i.totalVertexCount} vértices · ${i.totalTriangleCount} triángulos · ${i.materialCount} materiales · extensiones: ${(i.extensionsUsed ?? []).join(', ') || 'ninguna'}`);
console.log(`Errores: ${numErrors} · Avisos: ${numWarnings} · Info: ${numInfos}`);
process.exit(numErrors > 0 ? 1 : 0);
