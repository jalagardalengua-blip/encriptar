#!/usr/bin/env python3
"""
HIERRO Y DIVISA · generador del paquete de producción.

Lee las escenas de 01_DIALOGUES/CHAPTER_XX/ESCENA_NNN.md y genera:
  - CHAPTER_XX/GUION_COMPLETO.md
  - CHAPTER_XX/VOCES/DIRECCION/<PERSONAJE>.txt          (versión para dirección)
  - CHAPTER_XX/VOCES/ELEVENLABS_V3/<PERSONAJE>.txt      (una intervención por línea, con etiquetas v3)
  - CHAPTER_XX/VOCES/ELEVENLABS_V2_TEXTO_PLANO/<PERSONAJE>.txt (sin etiquetas)
  - 04_PRODUCTION_TRACKER/VOICE_RECORDING_TRACKER.csv
  - 04_PRODUCTION_TRACKER/SCENE_INDEX.csv
  - 04_PRODUCTION_TRACKER/CHARACTER_APPEARANCES.csv

Y valida: formato de cada intervención, IDs únicos y correlativos, ausencia de
etiquetas de locutor o acotaciones en el texto a sintetizar, existencia de los
prompts de imagen y vídeo.

Uso:  python3 tools/build_production.py            (genera y valida)
      python3 tools/build_production.py --check    (solo valida)
"""
import csv
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIALOGUES = ROOT / "01_DIALOGUES"
IMAGES = ROOT / "02_IMAGE_PROMPTS"
VIDEOS = ROOT / "03_VIDEO_PROMPTS"
TRACKER = ROOT / "04_PRODUCTION_TRACKER"

SPEAKER_RE = re.compile(r"^\*\*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]+)\*\*(?:\s*\*\((.+)\)\*)?\s*$")
TEXT_RE = re.compile(r"^> (.+)$")
META_RE = re.compile(r"^`(C(\d\d)_E(\d{3})_L(\d{3})) · (.+)`$")
HEADER_ROW_RE = re.compile(r"^\| ([^|]+?) \| (.+) \|$")
TAG_RE = re.compile(r"\[[a-z ]+\]")
ALLOWED_TAGS = {
    "[sighs]", "[exhales]", "[short pause]", "[long pause]", "[whispers]",
    "[quietly]", "[laughs]", "[chuckles]", "[clears throat]", "[tired]",
    "[annoyed]", "[sarcastic]", "[sad]", "[serious]", "[warmly]", "[shouting]",
}

errors = []


def slug(name: str) -> str:
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "_", n.upper()).strip("_")


def parse_meta(raw: str) -> dict:
    meta = {}
    for part in raw.split(" · "):
        if ":" in part:
            k, v = part.split(":", 1)
            meta[k.strip().lower()] = v.strip()
    return meta


def parse_scene(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    title = lines[0].lstrip("# ").strip()
    header = {}
    for ln in lines[1:20]:
        m = HEADER_ROW_RE.match(ln)
        if m and m.group(1) not in ("Campo", "---"):
            header[m.group(1).strip()] = m.group(2).strip()
    scene_id = title.split(" · ")[0]
    interventions = []
    i = 0
    while i < len(lines):
        m = SPEAKER_RE.match(lines[i])
        if m and i + 2 < len(lines):
            t = TEXT_RE.match(lines[i + 1])
            mt = META_RE.match(lines[i + 2])
            if not t or not mt:
                errors.append(f"{path.name}:{i+1}: bloque de diálogo mal formado ({m.group(1)})")
                i += 1
                continue
            text = t.group(1).strip()
            meta = parse_meta(mt.group(5))
            interventions.append({
                "id": mt.group(1),
                "chapter": mt.group(2),
                "scene": mt.group(3),
                "line": int(mt.group(4)),
                "speaker": m.group(1).strip(),
                "acotacion": (m.group(2) or "").strip(),
                "text": text,
                "meta": meta,
                "src_line": i + 1,
            })
            i += 3
            continue
        i += 1
    return {"path": path, "title": title, "id": scene_id, "header": header,
            "interventions": interventions, "raw": "\n".join(lines)}


def validate_scene(sc: dict) -> None:
    expected = 1
    for iv in sc["interventions"]:
        if f"C{iv['chapter']}_E{iv['scene']}" != sc["id"]:
            errors.append(f"{iv['id']}: no pertenece a la escena {sc['id']}")
        if iv["line"] != expected:
            errors.append(f"{iv['id']}: numeración no correlativa (se esperaba L{expected:03d})")
        expected = iv["line"] + 1
        for key in ("emoción", "intención", "ritmo", "pausas"):
            if key not in iv["meta"]:
                errors.append(f"{iv['id']}: falta el campo «{key}»")
        txt = iv["text"]
        for tag in TAG_RE.findall(txt):
            if tag not in ALLOWED_TAGS:
                errors.append(f"{iv['id']}: etiqueta de audio no permitida {tag}")
        if re.match(r"\[(short|long) pause\]", txt):
            errors.append(f"{iv['id']}: empieza con una pausa (la pausa inicial va en montaje)")
        if len(TAG_RE.findall(txt)) > 2:
            errors.append(f"{iv['id']}: más de dos etiquetas de audio")
        if re.search(r"\([^)]*\)|\*|^[A-ZÁÉÍÓÚÑ ]{3,}:", txt):
            errors.append(f"{iv['id']}: el texto contiene acotaciones o etiqueta de locutor")


def plain(text: str) -> str:
    t = TAG_RE.sub("", text)
    return re.sub(r"\s{2,}", " ", t).strip()


def build_chapter(chdir: Path, scenes: list, write: bool) -> list:
    chap = chdir.name.split("_")[1]
    rows = []
    by_char = {}
    for sc in scenes:
        for iv in sc["interventions"]:
            by_char.setdefault(iv["speaker"], []).append((sc, iv))

    if write:
        voces = chdir / "VOCES"
        for sub in ("DIRECCION", "ELEVENLABS_V3", "ELEVENLABS_V2_TEXTO_PLANO"):
            d = voces / sub
            d.mkdir(parents=True, exist_ok=True)
            for old in d.glob("*.txt"):
                old.unlink()

    for speaker, items in by_char.items():
        fname = slug(speaker) + ".txt"
        direc = [
            f"HIERRO Y DIVISA · CAPÍTULO {chap} · {speaker}",
            "VERSIÓN PARA DIRECCIÓN (no sintetizar este archivo)",
            f"Intervenciones: {len(items)}",
            "Archivo de síntesis correspondiente: ../ELEVENLABS_V3/" + fname
            + " (la línea N de ese archivo es la intervención N de este)",
            "=" * 72, "",
        ]
        v3, v2 = [], []
        for n, (sc, iv) in enumerate(items, start=1):
            m = iv["meta"]
            direc += [
                f"[{n:03d}] {iv['id']}",
                f"Escena: {sc['title']}",
                f"Personaje: {speaker}",
            ]
            if iv["acotacion"]:
                direc.append(f"Acotación: {iv['acotacion']}")
            if "rama" in m:
                direc.append(f"Rama de elección: {m['rama']}")
            direc += [
                f"Emoción: {m.get('emoción', '')}",
                f"Intención: {m.get('intención', '')}",
                f"Ritmo: {m.get('ritmo', '')}",
                f"Pausas: {m.get('pausas', '')}",
                f"FX / procesado: {m.get('fx', '—')}",
                f"Texto: {iv['text']}",
                "-" * 72,
            ]
            v3.append(iv["text"])
            v2.append(plain(iv["text"]))
            rows.append({
                "id": iv["id"],
                "capitulo": chap,
                "escena": f"C{chap}_E{iv['scene']}",
                "personaje": speaker,
                "intervencion_personaje": n,
                "archivo_v3": f"01_DIALOGUES/{chdir.name}/VOCES/ELEVENLABS_V3/{fname}",
                "linea_archivo": n,
                "rama": m.get("rama", ""),
                "emocion": m.get("emoción", ""),
                "fx": m.get("fx", "—"),
                "texto": iv["text"],
                "archivo_audio": f"{iv['id']}_{slug(speaker)}_T01.wav",
                "estado": "PENDIENTE_SINTESIS",
                "voice_id": "",
                "toma_aprobada": "",
                "notas": "",
            })
        if write:
            (chdir / "VOCES" / "DIRECCION" / fname).write_text("\n".join(direc) + "\n", encoding="utf-8")
            (chdir / "VOCES" / "ELEVENLABS_V3" / fname).write_text("\n".join(v3) + "\n", encoding="utf-8")
            (chdir / "VOCES" / "ELEVENLABS_V2_TEXTO_PLANO" / fname).write_text("\n".join(v2) + "\n", encoding="utf-8")

    if write:
        cap = chdir / f"CAPITULO_{chap}.md"
        parts = [cap.read_text(encoding="utf-8")] if cap.exists() else []
        for sc in scenes:
            parts.append("\n\n---\n\n" + sc["raw"])
        (chdir / "GUION_COMPLETO.md").write_text("".join(parts) + "\n", encoding="utf-8")
    return rows


def main() -> int:
    write = "--check" not in sys.argv
    voice_rows, scene_rows, appear = [], [], {}
    seen_ids = set()
    for chdir in sorted(DIALOGUES.glob("CHAPTER_*")):
        scene_files = sorted(chdir.glob("ESCENA_*.md"))
        if not scene_files:
            continue
        chap = chdir.name.split("_")[1]
        scenes = [parse_scene(p) for p in scene_files]
        for sc in scenes:
            validate_scene(sc)
            for iv in sc["interventions"]:
                if iv["id"] in seen_ids:
                    errors.append(f"{iv['id']}: identificador duplicado")
                seen_ids.add(iv["id"])
            num = sc["id"].split("_E")[1]
            img = IMAGES / chdir.name / f"ESCENA_{num}_IMAGE.txt"
            vid = VIDEOS / chdir.name / f"ESCENA_{num}_VIDEO.txt"
            h = sc["header"]
            speakers = sorted({iv["speaker"] for iv in sc["interventions"]})
            scene_rows.append({
                "id": sc["id"],
                "capitulo": chap,
                "titulo": sc["title"].split(" · ", 1)[1] if " · " in sc["title"] else sc["title"],
                "mision": h.get("Misión", ""),
                "localizacion": h.get("Localización", ""),
                "hora": h.get("Hora del día", ""),
                "duracion_estimada": h.get("Duración estimada", ""),
                "personajes_presentes": h.get("Personajes presentes", ""),
                "personajes_con_voz": "; ".join(speakers),
                "intervenciones": len(sc["interventions"]),
                "guion": "OK",
                "prompt_imagen": "OK" if img.exists() else "PENDIENTE",
                "prompt_video": "OK" if vid.exists() else "PENDIENTE",
                "imagen_generada": "NO",
                "video_generado": "NO",
            })
            for iv in sc["interventions"]:
                key = (iv["speaker"], sc["id"])
                appear.setdefault(key, 0)
                appear[key] += 1
        voice_rows += build_chapter(chdir, scenes, write)

    if write:
        TRACKER.mkdir(exist_ok=True)
        with open(TRACKER / "VOICE_RECORDING_TRACKER.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(voice_rows[0].keys()))
            w.writeheader()
            w.writerows(voice_rows)
        with open(TRACKER / "SCENE_INDEX.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(scene_rows[0].keys()))
            w.writeheader()
            w.writerows(scene_rows)
        with open(TRACKER / "CHARACTER_APPEARANCES.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["personaje", "escena", "intervenciones", "en_pantalla"])
            for (spk, sid), n in sorted(appear.items(), key=lambda x: (x[0][1], x[0][0])):
                sc = next(s for s in scene_rows if s["id"] == sid)
                pres = sc["personajes_presentes"].upper()
                onscreen = "SOLO_VOZ" if re.search(re.escape(spk.split()[-1]) + r"[^·]*\((solo )?voz", pres, re.I) else "SI"
                w.writerow([spk, sid, n, onscreen])

    print(f"Escenas: {len(scene_rows)} · Intervenciones: {len(voice_rows)} · "
          f"Personajes con voz: {len({r['personaje'] for r in voice_rows})}")
    if errors:
        print(f"\n{len(errors)} ERROR(ES):")
        for e in errors:
            print("  - " + e)
        return 1
    print("Validación: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
