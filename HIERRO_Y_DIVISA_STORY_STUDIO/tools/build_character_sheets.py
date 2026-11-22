#!/usr/bin/env python3
"""
HIERRO Y DIVISA · fichas maestras de identidad (personajes y animales).

Genera 02_IMAGE_PROMPTS/00_CHARACTER_SHEETS/<NOMBRE>_SHEET.txt para cada
CHARACTER LOCK y ANIMAL LOCK de la biblia visual que todavía no tenga ficha.
Las fichas de los siete personajes principales y de Lucero, Moro y Canela se
escribieron a mano y no se sobrescriben.

Uso: python3 tools/build_character_sheets.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIBLE = (ROOT / "00_BIBLE" / "VISUAL_CONTINUITY_BIBLE.md").read_text(encoding="utf-8")
OUT = ROOT / "02_IMAGE_PROMPTS" / "00_CHARACTER_SHEETS"
NEG = re.search(r"### Bloque negativo estándar.*?```\n(.+?)\n```", BIBLE, re.S).group(1).strip()

HOME_VIDEO = {"PILAR", "ERNESTO_41", "MANUEL_38"}


def person(name: str, lock: str) -> str:
    note = ""
    if name in HOME_VIDEO:
        note = ("\nNOTA: este personaje solo aparece en cintas de vídeo doméstico (C05). La ficha se genera en fotografía "
                "normal para fijar la identidad; el tratamiento VHS se aplica en la escena.\n")
    return f"""ID: SHEET_{name}
TIPO: Ficha maestra visual de personaje secundario
FUENTE: 00_BIBLE/VISUAL_CONTINUITY_BIBLE.md · CHARACTER LOCK — {name}
USO: generar, aprobar una imagen y usarla como referencia de identidad en todas sus escenas.
ESTADO: PENDIENTE DE GENERAR
{note}
=== PROMPT 1 · RETRATO FRONTAL (copiar) ===
Cinematic reference portrait, {lock}, facing the camera straight on, head and shoulders, neutral expression held still, soft overcast daylight from a large window at 45 degrees camera left, plain mid-grey textured backdrop, 85 mm lens, f/4, sharp focus on the eyes, true-to-life skin texture, natural color, fine film grain. Aspect ratio 4:5.

=== PROMPT 2 · TRES VISTAS (copiar) ===
Character turnaround reference sheet on a plain mid-grey backdrop, the same person shown three times at equal scale: full body front view, three-quarter view and left profile, {lock}, standing relaxed, identical face, hair and clothing in all three views, soft even light, 50 mm lens, f/8, photographic realism. Aspect ratio 16:9.

=== NEGATIVE PROMPT ===
{NEG}
"""


def animal(name: str, lock: str) -> str:
    return f"""ID: SHEET_{name}
TIPO: Ficha maestra visual de animal
FUENTE: 00_BIBLE/VISUAL_CONTINUITY_BIBLE.md · ANIMAL LOCK — {name}
ESTADO: PENDIENTE DE GENERAR

=== PROMPT 1 · LATERAL COMPLETO (copiar) ===
Wildlife-style cinematic photograph, {lock}, standing in full left side view on a holm oak dehesa pasture in Salamanca, Spain, whole body visible with hooves, soft low morning sunlight, background of dark holm oaks and a granite drystone wall out of focus, 135 mm lens, f/4, anatomically correct, realistic coat and musculature, natural colors, fine film grain. Aspect ratio 16:9.

=== PROMPT 2 · TRES CUARTOS FRONTAL (copiar) ===
Cinematic photograph, {lock}, three-quarter front view, head raised looking toward the camera from 25 metres, golden late afternoon side light, 200 mm lens, shallow depth of field, anatomically correct, realistic, natural colors. Aspect ratio 2.39:1.

=== NEGATIVE PROMPT ===
{NEG}, extra legs, extra horns, fused limbs, wrong number of hooves, cartoon animal
"""


def main():
    made = []
    for kind, fn in (("CHARACTER", person), ("ANIMAL", animal)):
        for name, lock in re.findall(rf"^{kind} LOCK — ([A-Z0-9_]+): (.+)$", BIBLE, re.M):
            path = OUT / f"{name}_SHEET.txt"
            if path.exists():
                continue
            path.write_text(fn(name, lock.strip()), encoding="utf-8")
            made.append(path.name)
    print(f"Fichas nuevas: {len(made)}")
    for m in made:
        print("  " + m)


if __name__ == "__main__":
    main()
