import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crc32, createZip } from '../src/io/zip';

describe('zip', () => {
  it('CRC-32 estándar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('genera un ZIP que Python abre y verifica', () => {
    const data = new Uint8Array(5000).map((_, i) => (i * 7) & 255);
    const zip = createZip([{ name: 'toro-negro.glb', data }, { name: 'LÉEME.txt', data: new TextEncoder().encode('hola') }]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'));
    const file = path.join(dir, 'a.zip');
    fs.writeFileSync(file, zip);
    const out = execFileSync('python3', ['-I', '-c',
      'import sys,zipfile,hashlib;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(";".join(f"{i.filename}:{i.file_size}" for i in z.infolist()))', file]).toString().trim();
    expect(out).toBe('toro-negro.glb:5000;LÉEME.txt:4');
  });
});
