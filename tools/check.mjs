// Comprobación previa a la publicación: sintaxis de JS e integridad de rutas (sensible a mayúsculas)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let errors = 0;
const fail = (m) => { console.error('✗ ' + m); errors++; };
const exists = (p) => { // existencia con mayúsculas exactas
  const parts = path.relative(root, p).split(path.sep); let cur = root;
  for (const part of parts) { if (!fs.existsSync(cur) || !fs.readdirSync(cur).includes(part)) return false; cur = path.join(cur, part); }
  return true;
};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

// 1. importmap de index.html
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const resolveSpec = (spec, from) => {
  if (spec.startsWith('.')) return path.resolve(path.dirname(from), spec);
  for (const [k, v] of Object.entries(map)) { if (spec === k) return path.join(root, v); if (k.endsWith('/') && spec.startsWith(k)) return path.join(root, v, spec.slice(k.length)); }
  return null;
};
for (const v of Object.values(map)) if (!v.endsWith('/') && !exists(path.join(root, v))) fail(`importmap: falta ${v}`);
for (const m of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) if (!exists(path.join(root, m[1]))) fail(`index.html: falta ${m[1]}`);

// 2. sintaxis e imports de todos los módulos alcanzables
const seen = new Set(); const queue = [path.join(root, 'src/main.js')];
while (queue.length) {
  const f = queue.pop(); if (seen.has(f)) continue; seen.add(f);
  if (!exists(f)) { fail(`módulo inexistente: ${path.relative(root, f)}`); continue; }
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail(`sintaxis en ${path.relative(root, f)}:\n${e.stderr}`); }
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = m[1] || m[2]; const r = resolveSpec(spec, f);
    if (!r) { fail(`${path.relative(root, f)}: import no resoluble «${spec}»`); continue; }
    queue.push(r);
  }
}
// 3. modelos referenciados por assets.js
const assetsSrc = fs.readFileSync(path.join(root, 'src/assets.js'), 'utf8');
const list = (name) => JSON.parse(assetsSrc.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
for (const n of list('CAR_FILES')) if (!exists(path.join(root, 'assets/cars', n + '.glb'))) fail(`falta assets/cars/${n}.glb`);
for (const n of list('PEOPLE_FILES')) if (!exists(path.join(root, 'assets/people', n + '.glb'))) fail(`falta assets/people/${n}.glb`);
// 4. manifiesto
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const i of man.icons) if (!exists(path.join(root, i.src))) fail(`manifiesto: falta ${i.src}`);
// 5. tamaño de archivos (límite de GitHub: 100 MB)
for (const f of walk(root).filter((f) => !f.includes(`${path.sep}.git${path.sep}`) && !f.includes('node_modules'))) if (fs.statSync(f).size > 95e6) fail(`archivo demasiado grande: ${path.relative(root, f)}`);

console.log(errors ? `\n${errors} error(es)` : `✓ ${seen.size} módulos y todos los recursos verificados`);
process.exit(errors ? 1 : 0);
