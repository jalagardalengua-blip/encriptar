#!/usr/bin/env python3
"""
HIERRO Y DIVISA · generador de prompts de imagen y vídeo.

Los datos de cada escena se escriben a mano en tools/visual_data/chXX.py.
Este script copia literalmente los bloques LOCK de 00_BIBLE/VISUAL_CONTINUITY_BIBLE.md
(personajes, vestuario, animales, vehículos, localizaciones, negativo) para que la
continuidad visual no dependa de reescribirlos en cada prompt.

Uso: python3 tools/build_visual_prompts.py 01        (genera imagen y vídeo del capítulo 01)
     python3 tools/build_visual_prompts.py 01 image  (solo imagen)
"""
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIBLE = (ROOT / "00_BIBLE" / "VISUAL_CONTINUITY_BIBLE.md").read_text(encoding="utf-8")


def lock(kind: str, name: str) -> str:
    m = re.search(rf"^{kind} LOCK — {re.escape(name)}: (.+)$", BIBLE, re.M)
    if not m:
        raise SystemExit(f"No existe {kind} LOCK — {name} en la biblia visual")
    return m.group(1).strip()


def wardrobe(code: str) -> str:
    m = re.search(rf"^\| `WARDROBE {re.escape(code)}` \| [^|]+ \| `(.+)` \|$", BIBLE, re.M)
    if not m:
        raise SystemExit(f"No existe WARDROBE {code} en la biblia visual")
    return m.group(1).strip()


NEGATIVE = re.search(r"### Bloque negativo estándar.*?```\n(.+?)\n```", BIBLE, re.S).group(1).strip()


def load(chap: str):
    path = ROOT / "tools" / "visual_data" / f"ch{chap}.py"
    spec = importlib.util.spec_from_file_location(f"ch{chap}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCENES


def char_block(c: dict) -> str:
    base = lock("CHARACTER", c["lock"])
    w = wardrobe(c["wardrobe"]) if c.get("wardrobe") else ""
    parts = [base]
    if w:
        parts.append(w)
    parts.append(c["pose"])
    parts.append(c["expression"])
    return ", ".join(parts)


def image_prompt(s: dict) -> str:
    chars = [f"{c['role']}: {char_block(c)}." for c in s["characters"]]
    animals = [f"Animal: {lock('ANIMAL', a)}." for a in s.get("animals", [])]
    vehicles = [f"Vehicle: {lock('VEHICLE', v)}." for v in s.get("vehicles", [])]
    loc = lock("LOCATION", s["location_lock"])
    p = [
        f"Cinematic film still from a contemporary Spanish drama feature, {s['shot']}. {s['moment']}",
        *chars, *animals, *vehicles,
        f"Setting: {loc}. {s.get('setting_extra', '')}".strip(),
        f"Time and weather: {s['time_weather_en']}.",
        f"Composition: {s['composition']}.",
        f"Lighting: {s['lighting']}.",
        f"Camera: {s['lens']}, {s['dof']}.",
        f"Textures: {s['textures']}.",
        f"Mood: {s['mood']}.",
        "Photorealistic, true-to-life skin texture, natural color grade of ochres, olive greens and granite greys, "
        f"subtle fine film grain. Aspect ratio {s['aspect']}.",
    ]
    return "\n".join(x for x in p if x)


def write_image(chap: str, s: dict) -> Path:
    num = s["id"].split("_E")[1]
    out = ROOT / "02_IMAGE_PROMPTS" / f"CHAPTER_{chap}" / f"ESCENA_{num}_IMAGE.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    refs = "\n".join(
        f"  - {c['lock']}: 02_IMAGE_PROMPTS/00_CHARACTER_SHEETS/{c['lock']}_SHEET.txt (vestuario {c.get('wardrobe') or 'del LOCK'})"
        for c in s["characters"]
    ) or "  - (sin personajes humanos)"
    arefs = "\n".join(f"  - {a}: 02_IMAGE_PROMPTS/00_CHARACTER_SHEETS/{a}_SHEET.txt" for a in s.get("animals_ref", []))
    neg = NEGATIVE + (", " + s["negative_extra"] if s.get("negative_extra") else "")
    body = f"""ID: {s['id']}_IMAGE
ESCENA: {s['id']} · {s['title']}
GUION: 01_DIALOGUES/CHAPTER_{chap}/ESCENA_{num}.md
VÍDEO ASOCIADO: 03_VIDEO_PROMPTS/CHAPTER_{chap}/ESCENA_{num}_VIDEO.txt (esta imagen es su fotograma inicial)
ESTADO: {s.get('status', 'PENDIENTE DE GENERAR')}
MODELO: prompt maestro independiente de plataforma (válido para modelos fotorrealistas de texto a imagen con referencia de personaje)

REFERENCIAS DE IDENTIDAD (cargar la imagen aprobada de cada ficha como referencia de personaje):
{refs}
{arefs}

---------------------------------------------------------------------------
FICHA DE PLANO
 1. Identificador ........... {s['id']}
 2. Localización ............ {s['location_es']}
 3. Hora y meteorología ..... {s['time_weather_es']}
 4. Personajes visibles ..... {s['visible_es']}
 5. Apariencia física ....... según CHARACTER LOCK (copiado literal en el prompt)
 6. Vestuario exacto ........ {s['wardrobe_es']}
 7. Expresión facial ........ {s['expression_es']}
 8. Posición corporal ....... {s['body_es']}
 9. Acción congelada ........ {s['frozen_es']}
10. Composición ............. {s['composition_es']}
11. Tipo de plano ........... {s['shot_es']}
12. Distancia focal ......... {s['lens']}
13. Iluminación ............. {s['lighting_es']}
14. Profundidad de campo .... {s['dof']}
15. Texturas y materiales ... {s['textures_es']}
16. Ambiente ................ {s['mood_es']}
17. Relación de aspecto ..... {s['aspect']}
18. Restricciones ........... {s['restrictions_es']}
---------------------------------------------------------------------------

=== PROMPT (copiar completo) ===
{image_prompt(s)}

=== NEGATIVE PROMPT (copiar) ===
{neg}
"""
    out.write_text(body, encoding="utf-8")
    return out


def write_video(chap: str, s: dict) -> Path:
    num = s["id"].split("_E")[1]
    v = s["video"]
    out = ROOT / "03_VIDEO_PROMPTS" / f"CHAPTER_{chap}" / f"ESCENA_{num}_VIDEO.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    img = ROOT / "02_IMAGE_PROMPTS" / f"CHAPTER_{chap}" / f"ESCENA_{num}_IMAGE.txt"
    if not img.exists():
        raise SystemExit(f"No se puede crear el vídeo {s['id']}: falta su prompt de imagen")
    dialog = "\n".join(f"  {d}" for d in v["dialogue"]) if v.get("dialogue") else "  Sin diálogo en este plano."
    prompt = "\n".join([
        f"Image-to-video. Start exactly from the provided reference frame ({s['id']}_IMAGE) with no change of identity, wardrobe, framing or lighting at frame one.",
        f"Duration {v['duration']}.",
        f"0s: {v['start_en']}",
        v["development_en"],
        f"Characters: {v['characters_en']}",
        *[f"Character entering the shot (not in the first frame): {char_block(c)}." for c in v.get("enter_characters", [])],
        f"Camera: {v['camera_en']}",
        f"Environment motion: {v['environment_en']}",
        f"Lighting stays {v['lighting_en']}.",
        f"Final moment: {v['end_en']}",
        "Natural human motion at real-time speed, subtle believable facial micro-expressions, consistent faces and clothing for the whole clip, "
        "physically correct animal motion, no text, no subtitles, no logos, no watermark.",
    ])
    vneg = ("identity change, face morphing, changing clothes, extra people appearing, objects appearing from nowhere, "
            "sudden camera jumps, random zooms, jitter, warped hands, extra fingers, rubbery limbs, impossible body motion, "
            "exaggerated gestures, mouthing words out of sync, animal with extra legs or horns, text, subtitles, logo, watermark, slow motion")
    body = f"""ID: {s['id']}_VIDEO
ESCENA: {s['id']} · {s['title']}
IMAGEN DE REFERENCIA (fotograma inicial obligatorio): 02_IMAGE_PROMPTS/CHAPTER_{chap}/ESCENA_{num}_IMAGE.txt
GUION: 01_DIALOGUES/CHAPTER_{chap}/ESCENA_{num}.md
ESTADO: {s.get('status', 'PENDIENTE DE GENERAR')}
MODELO: prompt maestro independiente de plataforma para imagen-a-vídeo

---------------------------------------------------------------------------
FICHA DE PLANO
 1. Identificador ........... {s['id']}
 2. Imagen de referencia .... {s['id']}_IMAGE (generada y aprobada)
 3. Duración ................ {v['duration']}
 4. Acción inicial .......... {v['start_es']}
 5. Desarrollo .............. {v['development_es']}
 6. Movimiento de personajes  {v['movement_es']}
 7. Expresiones faciales .... {v['faces_es']}
 8. Gestos .................. {v['gestures_es']}
 9. Movimiento corporal ..... {v['body_es']}
10. Movimiento de cámara .... {v['camera_es']}
11. Movimiento ambiental .... {v['environment_es']}
12. Iluminación ............. {v['lighting_es']}
13. Continuidad ............. {v['continuity_es']}
14. Acción final ............ {v['end_es']}
15. Transición .............. {v['transition_es']}
16. Restricciones ........... {v['restrictions_es']}
---------------------------------------------------------------------------

DIÁLOGO EN ESTE PLANO (quién habla y cuándo):
{dialog}
AUDIO: {v.get('audio', 'Generar el vídeo SIN voz. El diálogo se monta después con las pistas de ElevenLabs. Si el modelo genera audio, desactivarlo o descartarlo.')}

=== PROMPT (copiar completo) ===
{prompt}

=== NEGATIVE PROMPT (copiar) ===
{vneg}
"""
    out.write_text(body, encoding="utf-8")
    return out


def main():
    chap = sys.argv[1] if len(sys.argv) > 1 else "01"
    what = sys.argv[2] if len(sys.argv) > 2 else "all"
    scenes = load(chap)
    for s in scenes:
        if what in ("all", "image"):
            print(write_image(chap, s).relative_to(ROOT))
        if what in ("all", "video"):
            print(write_video(chap, s).relative_to(ROOT))


if __name__ == "__main__":
    main()
