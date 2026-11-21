# HIERRO Y DIVISA · Cinematic Story Studio

Biblioteca de producción del modo historia **EL PRECIO DE UN HIERRO**: guiones, voces preparadas para ElevenLabs, prompts de imagen y prompts de vídeo, lista para alimentar las herramientas de generación y, después, Unity 6.

Estado actual: ver [`04_PRODUCTION_TRACKER/PROGRESS.md`](04_PRODUCTION_TRACKER/PROGRESS.md).

## Estructura

```
00_BIBLE/                 Biblias: historia, personajes, voces, continuidad visual, mundo
01_DIALOGUES/CHAPTER_XX/  CAPITULO_XX.md · ESCENA_NNN.md · GUION_COMPLETO.md (generado)
                          VOCES/DIRECCION/            versión para dirección (emoción, intención, ritmo, pausas)
                          VOCES/ELEVENLABS_V3/        una intervención por línea, con etiquetas de audio v3
                          VOCES/ELEVENLABS_V2_TEXTO_PLANO/  igual, sin etiquetas
02_IMAGE_PROMPTS/         00_CHARACTER_SHEETS/ (fichas maestras) · CHAPTER_XX/ESCENA_NNN_IMAGE.txt
03_VIDEO_PROMPTS/         CHAPTER_XX/ESCENA_NNN_VIDEO.txt (cada uno parte de su imagen)
04_PRODUCTION_TRACKER/    PROGRESS.md · SCENE_INDEX.csv · CHARACTER_APPEARANCES.csv · VOICE_RECORDING_TRACKER.csv
tools/                    build_production.py · build_visual_prompts.py · visual_data/chXX.py
```

## Flujo de trabajo

1. **Guion.** Las escenas se escriben a mano en `ESCENA_NNN.md`. Cada intervención sigue este formato exacto:

   ```
   **MANUEL** *(acotación opcional)*
   > Texto que se pronuncia, con etiquetas v3 opcionales como [sighs].
   `C01_E001_L003 · Emoción: … · Intención: … · Ritmo: … · Pausas: … · FX: …`
   ```

2. **Voces y trackers.** `python3 tools/build_production.py` separa las voces por personaje, genera `GUION_COMPLETO.md` y los CSV, y valida formato, numeración y texto sintetizable. Los archivos de voz **no se editan a mano**: se corrige la escena y se regenera.

3. **Síntesis.** Para cada personaje: crear su voz en ElevenLabs con la descripción de `VOICE_BIBLE.md`, abrir `ELEVENLABS_V3/<PERSONAJE>.txt` y generar una toma por línea. La línea *n* corresponde a la fila con `linea_archivo = n` de ese personaje en `VOICE_RECORDING_TRACKER.csv`, que da el nombre del archivo de audio.

4. **Imagen.** Generar primero las fichas de `02_IMAGE_PROMPTS/00_CHARACTER_SHEETS/`, aprobar una imagen por personaje y usarla como referencia de identidad en todas las escenas.

5. **Vídeo.** Cargar la imagen aprobada de la escena como fotograma inicial y usar el prompt de `03_VIDEO_PROMPTS`. El vídeo se genera sin voz; el diálogo se monta con las pistas de ElevenLabs.

Los prompts visuales se generan desde `tools/visual_data/chXX.py` con `python3 tools/build_visual_prompts.py XX`, que copia literalmente los bloques `LOCK` de `00_BIBLE/VISUAL_CONTINUITY_BIBLE.md`. Para cambiar el aspecto de un personaje se cambia la biblia y se regenera.

## Normas

- Ninguna voz imita a una persona real; se usan voces diseñadas o actores con cesión de derechos.
- Sin marcas comerciales, texto, subtítulos ni logotipos en imagen o vídeo.
- Nada se marca como generado si solo existe su prompt.
