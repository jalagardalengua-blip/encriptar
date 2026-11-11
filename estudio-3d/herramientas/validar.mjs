#!/usr/bin/env node
// Valida archivos GLB con el validador oficial de Khronos (gltf-validator).
//   node herramientas/validar.mjs modelos        → valida todos los .glb de la carpeta
import fs from 'node:fs';
import path from 'node:path';
import validator from 'gltf-validator';

const raiz = process.argv[2] || 'modelos';
const lista = (d) => fs.statSync(d).isDirectory() ? fs.readdirSync(d).flatMap((f) => lista(path.join(d, f))) : d.endsWith('.glb') ? [d] : [];
let fallos = 0;
for (const f of lista(raiz)) {
  const r = await validator.validateBytes(new Uint8Array(fs.readFileSync(f)), { maxIssues: 50 });
  const { numErrors, numWarnings } = r.issues;
  const a = r.info;
  console.log(`${numErrors ? '✗' : '✓'} ${f}  errores ${numErrors} · avisos ${numWarnings} · ${a.animationCount} animaciones · ${a.totalTriangleCount} triángulos · ${a.materialCount} materiales`);
  for (const m of r.issues.messages.filter((m) => m.severity <= 1)) console.log(`    [${m.severity === 0 ? 'error' : 'aviso'}] ${m.code}: ${m.message} (${m.pointer})`);
  if (numErrors) fallos++;
}
process.exit(fallos ? 1 : 0);
