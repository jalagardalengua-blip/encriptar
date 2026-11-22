# HIERRO Y DIVISA · PROGRESS

Última actualización: lote final (fases 1–6 completas para los 12 capítulos).

> Todo lo que figura como «OK» existe como **texto** en este repositorio: guiones, archivos de voz preparados para ElevenLabs, prompts de imagen y prompts de vídeo. **No se ha generado ningún audio, imagen ni vídeo.** `SCENE_INDEX.csv` (columnas `imagen_generada`, `video_generado`) y `VOICE_RECORDING_TRACKER.csv` (columna `estado`) lo reflejan.

## Estado por fase

| Paso | Contenido | Estado |
|---|---|---|
| 1 | Biblias (story, character, voice, visual continuity, world) | **OK** |
| 2 | Guiones y diálogos de los 12 capítulos | **OK** · 55 escenas · 1.162 intervenciones · ~13.600 palabras de diálogo |
| 3 | Voces separadas para ElevenLabs | **OK** · 21 voces · versión de dirección, v3 con etiquetas y v2 en texto plano |
| 4 | Prompts de imagen | **OK** · 55 prompts de escena + 37 fichas maestras de identidad |
| 5 | Prompts de vídeo | **OK** · 55 prompts, cada uno parte de su imagen |
| 6 | Auditoría de continuidad y paquete final | **OK** · `AUDIT_REPORT.md` sin problemas abiertos |

## Estado por capítulo

| Cap. | Título | Escenas | Intervenciones | Guion | Voces | Imagen | Vídeo |
|---|---|---|---|---|---|---|---|
| 01 | La Encomienda | 8 | 219 | OK | OK | OK | OK |
| 02 | Saneamiento | 7 | 246 | OK | OK | OK | OK |
| 03 | La tienta | 5 | 98 | OK | OK | OK | OK |
| 04 | Números rojos | 4 | 92 | OK | OK | OK | OK |
| 05 | La cinta | 5 | 66 | OK | OK | OK | OK |
| 06 | Encierro | 4 | 69 | OK | OK | OK | OK |
| 07 | La primera | 4 | 58 | OK | OK | OK | OK |
| 08 | El semental | 3 | 62 | OK | OK | OK | OK |
| 09 | Lo que no se dice | 4 | 73 | OK | OK | OK | OK |
| 10 | La Glorieta | 4 | 59 | OK | OK | OK | OK |
| 11 | El precio | 3 | 58 | OK | OK | OK | OK |
| 12 | Hierro y divisa | 4 | 62 | OK | OK | OK | OK |

Misiones principales: 30 (M01–M30), todas cubiertas por al menos una escena. Finales: 3 (C12_E002 A, C12_E003 B, C12_E004 C).

## Orden de fases (cómo se ha respetado)

1. Biblias → 2. Guiones y voces de los 12 capítulos → 3. Prompts de imagen de los 12 capítulos → 4. Prompts de vídeo de los 12 capítulos → 5. Auditoría.
La única excepción es el **piloto del capítulo 01**, producido en las tres fases al principio por mandato expreso de la primera tarea (ver STORY_BIBLE §12). En la auditoría final se ha regenerado con la biblia visual definitiva y se ha retirado la marca de piloto pendiente de revisión.
Los prompts de vídeo del capítulo 02, que se habían generado junto a sus imágenes, se retiraron y se volvieron a generar en la fase de vídeo.

## Control de calidad global

| Comprobación | Resultado |
|---|---|
| Todas las escenas tienen guion completo (no resumido) | Sí, 55/55 |
| Todas las intervenciones identificadas (personaje, escena, nº, emoción, intención, ritmo, pausas) | Sí. `tools/build_production.py`: 0 errores |
| Archivos de voz separados y con tantas líneas como intervenciones | Sí. `tools/audit.py` lo comprueba archivo a archivo |
| Textos para ElevenLabs sin etiquetas de locutor ni acotaciones, ≤ 2 etiquetas v3, ninguna toma empieza con pausa | Sí |
| Cada personaje con voz tiene ficha en VOICE_BIBLE | Sí, 21/21 |
| Cada escena tiene prompt de imagen y de vídeo | Sí, 55/55 y 55/55 |
| Cada vídeo parte de su imagen | Sí (el generador no crea un vídeo sin imagen; la auditoría lo verifica) |
| Cada referencia de identidad tiene ficha maestra | Sí, 37 fichas |
| Continuidad visual (vestuario, animales, vehículos, localizaciones) | Bloques `LOCK` únicos en la biblia visual, copiados literalmente por el generador |

## Correcciones de continuidad hechas durante la producción

- **Calendario:** el 21 de septiembre cae en domingo; la firma pasa al viernes 19 (último día hábil). Fechas de todos los capítulos ajustadas en STORY_BIBLE §5.
- **Moro:** con 12 años no pudo criarlo Pilar (murió hace 17). Ahora es hijo de la Paloma, la yegua que crio Pilar (C05_E001).
- **Edades en las cintas:** Ernesto 41 y Manuel 38 en el herradero de hace 23 años (antes «45»).
- **Manuel y la opción:** en el flashback (C09_E003) Ernesto deja escapar «he vendido la finca»; Manuel lo reconoce en C09_E002 («quise creerme que nada»), coherente con su «Eso no» de C01_E007.
- **Lucero en la prueba de tuberculina:** eliminado para no resolver antes de tiempo el misterio de la cojera.
- **Barquero:** dos manchas claras en la frente como Lucero (no «lucero blanco»).
- **Cifras finales:** 640 − 180 = 460 ha para el FINAL B; Meseta (1,1 M€) + ingresos de campaña (~0,2 M€) cubren la deuda de 1,14 M€; el aval de Carmen queda como colchón. STORY_BIBLE §9 reescrito en consecuencia.
- **Vestuario:** añadidos A1B, M1B, A4–A8, M4–M5, L2–L3, R3–R4, J1–J4, C1–C2, E1 y el LOCK `ALEJANDRO_FINAL_C` (afeitado, pelo corto) para no contradecir el LOCK base.

## Observaciones para la siguiente etapa

- Los capítulos 01 y 02 tienen escenas más largas (25–35 intervenciones) porque contienen tutoriales y presentaciones; a partir del 03 las escenas son más concentradas (12–25 intervenciones). Si dirección quiere más minutos de cinemática en los capítulos centrales, el punto natural para ampliar son C08 (3 escenas) y C11 (3 escenas).
- Hay líneas de grabación que se reproducen dos veces (C09_E004 L007–L008 = C09_E003 L021–L022): se sintetizan una vez y se reutiliza la toma (indicado en la columna `fx`).
- Las variantes de imagen por rama (`_RAMA_A` del pitón en C07_E003, `_RAMA_C08A` del cercado vacío en C11_E003) están indicadas en los prompts; se generan solo si se producen esas ramas.

## Imágenes de referencia aprobadas

| Ficha | Imagen aprobada | Herramienta | Fecha |
|---|---|---|---|
| (37 fichas en `02_IMAGE_PROMPTS/00_CHARACTER_SHEETS/`) | — | — | — |

## Voces aprobadas (Voice ID de ElevenLabs)

Se rellenan en `00_BIBLE/VOICE_BIBLE.md` §4 y en la columna `voice_id` del tracker.

## Cómo regenerar el paquete

```bash
cd HIERRO_Y_DIVISA_STORY_STUDIO
python3 tools/build_production.py               # voces, GUION_COMPLETO, trackers; valida
python3 tools/build_character_sheets.py         # fichas de identidad que falten
for c in 01 02 03 04 05 06 07 08 09 10 11 12; do python3 tools/build_visual_prompts.py $c image; done
for c in 01 02 03 04 05 06 07 08 09 10 11 12; do python3 tools/build_visual_prompts.py $c video; done
python3 tools/audit.py                          # informe de auditoría
```
