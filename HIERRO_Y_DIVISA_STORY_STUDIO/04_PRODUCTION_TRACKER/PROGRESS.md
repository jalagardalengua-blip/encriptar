# HIERRO Y DIVISA · PROGRESS

Última actualización: lote 1 (biblias + capítulo 01, piloto vertical).

> Todo lo que figura como «OK» existe como **texto** en este repositorio (guiones, archivos de voz preparados, prompts). **No se ha generado ningún audio, imagen ni vídeo.** Las columnas `imagen_generada` y `video_generado` de `SCENE_INDEX.csv` y la columna `estado` de `VOICE_RECORDING_TRACKER.csv` lo reflejan.

## Estado por fase

| Paso | Contenido | Estado |
|---|---|---|
| 1 | Biblias (story, character, voice, visual continuity, world) | **OK** |
| 2 | Guiones y diálogos de los 12 capítulos | **1 / 12** (C01) |
| 3 | Voces separadas para ElevenLabs | **1 / 12** (C01) |
| 4 | Prompts de imagen | Fichas maestras OK · **C01 (piloto)** |
| 5 | Prompts de vídeo | **C01 (piloto)** |
| 6 | Auditoría de continuidad y paquete final | Pendiente |

## Estado por capítulo

| Cap. | Título | Escenas | Guion | Voces | Imagen | Vídeo | Notas |
|---|---|---|---|---|---|---|---|
| 01 | La Encomienda | 8 | OK | OK (219 intervenciones, 8 voces) | OK · PILOTO | OK · PILOTO | Ver control de calidad |
| 02 | Saneamiento | — | pendiente | pendiente | bloqueado (fase 2) | bloqueado (fase 3) | **Siguiente lote** |
| 03 | La tienta | — | pendiente | pendiente | bloqueado | bloqueado | |
| 04 | Números rojos | — | pendiente | pendiente | bloqueado | bloqueado | |
| 05 | La cinta | — | pendiente | pendiente | bloqueado | bloqueado | |
| 06 | Encierro | — | pendiente | pendiente | bloqueado | bloqueado | |
| 07 | La primera | — | pendiente | pendiente | bloqueado | bloqueado | |
| 08 | El semental | — | pendiente | pendiente | bloqueado | bloqueado | |
| 09 | Lo que no se dice | — | pendiente | pendiente | bloqueado | bloqueado | |
| 10 | La Glorieta | — | pendiente | pendiente | bloqueado | bloqueado | |
| 11 | El precio | — | pendiente | pendiente | bloqueado | bloqueado | |
| 12 | Hierro y divisa | — | pendiente | pendiente | bloqueado | bloqueado | |

«Bloqueado» = no se empieza hasta cerrar los diálogos de los 12 capítulos (orden innegociable). El capítulo 01 es la excepción documentada en `00_BIBLE/STORY_BIBLE.md` §12.

## Control de calidad · Capítulo 01

| Comprobación | Resultado |
|---|---|
| Todas las escenas tienen guion | Sí (8/8) |
| Diálogos completos, sin escenas resumidas | Sí. 219 intervenciones, ~2.000 palabras de diálogo, ramas A/B de E007 escritas completas |
| Todas las intervenciones identificadas (personaje, escena, nº, emoción, intención, ritmo, pausas) | Sí. Validado por `tools/build_production.py` (0 errores) |
| Archivos de voz separados por personaje | Sí: ALEJANDRO, MANUEL, RICARDO, LUCIA, DON_ERNESTO, CARMEN, PADRE_JULIAN, REMEDIOS |
| Textos preparados para ElevenLabs (sin etiquetas de locutor ni acotaciones; ≤ 2 etiquetas v3 por línea) | Sí. Versión v3 con etiquetas y versión v2 en texto plano |
| Cada escena tiene prompt de imagen | Sí (8/8) + 10 fichas maestras (7 personajes, 3 animales) |
| Cada escena tiene prompt de vídeo | Sí (8/8) |
| Cada vídeo parte de su imagen | Sí. El generador se niega a crear un vídeo sin su imagen; cada prompt de vídeo arranca del fotograma de referencia |
| Continuidad narrativa | Revisada: cronología 5–9 de marzo, 196 días hasta el 21 de septiembre (= «seis meses y doce días»), llamadas del miércoles/jueves coherentes entre E001, E004 y E006 |
| Continuidad visual | Revisada: vestuario por escena (A1 → A1B → A2 → A3; M1 → M1B → M2/M3), chaqueta de Ernesto desde E004, orientación de la luz en el cercado (oeste a la espalda, toro al este) |
| Contradicciones | Dos detectadas en el encargo y resueltas (STORY_BIBLE §12). Ninguna interna abierta |

### Correcciones hechas durante la revisión del C01
- E004 L003: tenía tres etiquetas de audio → reducida a dos.
- E001 L015 y E007 L015 empezaban con `[short pause]` (inútil al inicio de una toma) → la pausa pasa a montaje.
- E005 L005: Manuel usaba «Bueno», muletilla reservada a Ernesto → «Mira tú».
- E008: el toro estaba «recortado contra el cielo naranja» mirando al este → cielo rosa-violeta, coherente con la orientación del cercado.
- Biblia visual: añadidos `WARDROBE A1B`, `WARDROBE M1B` y `LOCATION LOCK — CAMINO ENCOMIENDA`; el sombrero y los zahones de Manuel pasan a indicarse por plano.

## Imágenes de referencia aprobadas

| Ficha | Imagen aprobada | Herramienta | Fecha |
|---|---|---|---|
| ALEJANDRO | — | — | — |
| MANUEL | — | — | — |
| RICARDO | — | — | — |
| LUCIA | — | — | — |
| JAVIER | — | — | — |
| CARMEN | — | — | — |
| ERNESTO | — | — | — |
| LUCERO / MORO / CANELA | — | — | — |

## Voces aprobadas (Voice ID de ElevenLabs)

Se rellenan en `00_BIBLE/VOICE_BIBLE.md` §4 y en la columna `voice_id` del tracker.

## Siguiente lote

1. Capítulo 02 «Saneamiento» completo (guion y voces): M04 Cerca rota · M05 La prueba · M06 Denuncia anónima.
2. Seguir con los capítulos 03–12, solo guion y voces.
3. Con los 12 guiones cerrados: prompts de imagen C02–C12, después vídeo, después auditoría (incluida la revisión del piloto C01).

## Cómo continuar desde aquí

```bash
cd HIERRO_Y_DIVISA_STORY_STUDIO
python3 tools/build_production.py              # regenera voces, GUION_COMPLETO y trackers; valida
python3 tools/build_visual_prompts.py 01       # regenera prompts de imagen y vídeo de un capítulo
```
