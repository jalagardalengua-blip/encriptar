#!/usr/bin/env python3
"""
HIERRO Y DIVISA · auditoría de continuidad del paquete de producción.

Comprueba, para los 12 capítulos:
  1. Cada escena tiene guion, prompt de imagen y prompt de vídeo.
  2. Cada prompt de vídeo apunta a su imagen y existe esa imagen.
  3. Cada personaje con voz tiene ficha en VOICE_BIBLE.md.
  4. Cada referencia de identidad citada en un prompt de imagen tiene ficha maestra.
  5. Ningún prompt contiene texto pendiente de rellenar.
  6. Los archivos de voz de ElevenLabs tienen tantas líneas como intervenciones.
Escribe 04_PRODUCTION_TRACKER/AUDIT_REPORT.md.
"""
import csv
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D, I, V, T = (ROOT / x for x in ("01_DIALOGUES", "02_IMAGE_PROMPTS", "03_VIDEO_PROMPTS", "04_PRODUCTION_TRACKER"))
VOICE_BIBLE = (ROOT / "00_BIBLE" / "VOICE_BIBLE.md").read_text(encoding="utf-8")


def norm(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()


def main():
    problems, rows = [], []
    voice_rows = list(csv.DictReader(open(T / "VOICE_RECORDING_TRACKER.csv", encoding="utf-8")))
    per_file = Counter(r["archivo_v3"] for r in voice_rows)
    for f, n in per_file.items():
        lines = (ROOT / f).read_text(encoding="utf-8").rstrip("\n").split("\n")
        if len(lines) != n:
            problems.append(f"{f}: {len(lines)} líneas para {n} intervenciones")
    vb = norm(VOICE_BIBLE)
    for spk in sorted({r["personaje"] for r in voice_rows}):
        key = norm(spk).replace("DON ", "").split()[-1]
        if key not in vb:
            problems.append(f"Voz sin ficha en VOICE_BIBLE: {spk}")
    sheets = {p.name.replace("_SHEET.txt", "") for p in (I / "00_CHARACTER_SHEETS").glob("*_SHEET.txt")}
    per_chapter = defaultdict(lambda: [0, 0, 0])
    for ch in sorted(D.glob("CHAPTER_*")):
        for sc in sorted(ch.glob("ESCENA_*.md")):
            num = sc.stem.split("_")[1]
            img = I / ch.name / f"ESCENA_{num}_IMAGE.txt"
            vid = V / ch.name / f"ESCENA_{num}_VIDEO.txt"
            per_chapter[ch.name][0] += 1
            if img.exists():
                per_chapter[ch.name][1] += 1
                t = img.read_text(encoding="utf-8")
                for ref in re.findall(r"00_CHARACTER_SHEETS/([A-Z0-9_]+)_SHEET\.txt", t):
                    if ref not in sheets:
                        problems.append(f"{img.name} ({ch.name}): falta la ficha {ref}")
                if re.search(r"TODO|PENDIENTE DE RELLENAR|\{\w+\}", t):
                    problems.append(f"{img.name} ({ch.name}): texto sin rellenar")
            else:
                problems.append(f"{ch.name}/ESCENA_{num}: falta prompt de imagen")
            if vid.exists():
                per_chapter[ch.name][2] += 1
                t = vid.read_text(encoding="utf-8")
                if f"02_IMAGE_PROMPTS/{ch.name}/ESCENA_{num}_IMAGE.txt" not in t:
                    problems.append(f"{vid.name} ({ch.name}): no apunta a su imagen")
                if re.search(r"^\d+: $|Duration \.|0s: exact reference frame — $", t, re.M):
                    problems.append(f"{vid.name} ({ch.name}): campos vacíos")
            else:
                problems.append(f"{ch.name}/ESCENA_{num}: falta prompt de vídeo")
    total = sum(v[0] for v in per_chapter.values())
    lines = ["# HIERRO Y DIVISA · AUDIT REPORT", "",
             "Generado por `tools/audit.py`. Todo lo listado existe como texto (guion, voz preparada, prompt). Ningún audio, imagen ni vídeo ha sido generado todavía.", "",
             "| Capítulo | Escenas | Prompts de imagen | Prompts de vídeo |", "|---|---|---|---|"]
    for ch, (s, i, v) in sorted(per_chapter.items()):
        lines.append(f"| {ch} | {s} | {i} | {v} |")
    lines += ["", f"**Total:** {total} escenas · {len(voice_rows)} intervenciones · {len({r['personaje'] for r in voice_rows})} voces · {len(sheets)} fichas maestras", ""]
    lines += ["## Problemas detectados", ""] + ([f"- {p}" for p in problems] if problems else ["Ninguno."])
    (T / "AUDIT_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[-max(3, len(problems) + 2):]))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
