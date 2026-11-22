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


def expand(c: dict) -> dict:
    """Convierte el formato compacto (capítulos 02-12) al esquema completo."""
    chars = [dict(role=r, lock=l, wardrobe=w, pose=po, expression=ex) for (r, l, w, po, ex) in c.get("chars", [])]
    wardrobe_es = "; ".join(f"{x['lock']}: WARDROBE {x['wardrobe']}" if x["wardrobe"] else f"{x['lock']}: vestuario del LOCK" for x in chars) or "—"
    v = c["v"]
    enter = [dict(role="", lock=l, wardrobe=w, pose=po, expression=ex) for (l, w, po, ex) in v.get("enter", [])]
    return {
        "id": c["id"], "title": c["title"], "status": c.get("status", "PENDIENTE DE GENERAR"),
        "location_lock": c["loc"], "location_es": c["loc_es"],
        "time_weather_es": c["when_es"], "time_weather_en": c["when_en"],
        "visible_es": c["vis_es"], "wardrobe_es": wardrobe_es + (". " + c["ward_es"] if c.get("ward_es") else ""),
        "expression_es": c["expr_es"], "body_es": c["body_es"], "frozen_es": c["frozen_es"],
        "composition_es": c["comp_es"], "shot_es": c["shot_es"], "lighting_es": c["light_es"],
        "textures_es": c.get("tex_es", "Ver prompt."), "mood_es": c["mood_es"],
        "restrictions_es": c.get("restr_es", "Ver negativo estándar."),
        "shot": c["shot"], "moment": c["moment"], "characters": chars,
        "animals": c.get("animals", []), "animals_ref": c.get("animals_ref", []), "vehicles": c.get("vehicles", []),
        "setting_extra": c.get("extra", ""), "composition": c["comp"], "lighting": c["light"],
        "lens": c["lens"], "dof": c["dof"], "textures": c["tex"], "mood": c["mood"],
        "aspect": c.get("aspect", "2.39:1"), "negative_extra": c.get("neg", ""),
        "video": {
            "duration": v["dur"],
            "start_es": "El fotograma de referencia: " + c["frozen_es"],
            "development_es": v["dev_es"], "movement_es": v.get("move_es", "Ver desarrollo."),
            "faces_es": v.get("faces_es", "Coherentes con el guion; microexpresiones naturales."),
            "gestures_es": v.get("gest_es", "Mínimos y motivados."),
            "body_es": v.get("body_es", "Natural, a velocidad real."),
            "camera_es": v["cam_es"], "environment_es": v.get("env_es", "Ver prompt."),
            "lighting_es": v.get("light_es", "Igual que la imagen de referencia."),
            "continuity_es": v["cont_es"], "end_es": v["end_es"], "transition_es": v["trans_es"],
            "restrictions_es": v.get("restr_es", "Sin texto, sin cambios de identidad ni de vestuario."),
            "start_en": "exact reference frame — " + c["moment"],
            "development_en": v["dev_en"], "characters_en": v.get("chars_en", "natural real-time motion, contained gestures, discreet lip movement only when speaking."),
            "camera_en": v["cam_en"], "environment_en": v["env_en"],
            "lighting_en": v.get("light_en", "consistent with the reference frame"),
            "end_en": v["end_en"], "dialogue": v.get("dialog", []),
            **({"audio": v["audio"]} if v.get("audio") else {}),
            **({"enter_characters": enter} if enter else {}),
        },
    }


def load(chap: str):
    path = ROOT / "tools" / "visual_data" / f"ch{chap}.py"
    spec = importlib.util.spec_from_file_location(f"ch{chap}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return [expand(s) if "loc" in s else s for s in mod.SCENES]


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
