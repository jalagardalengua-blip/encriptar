# HIERRO Y DIVISA · VOICE BIBLE

Documento de dirección de doblaje y de síntesis de voz.

---

## 1. Principios

1. **Ninguna voz imita a una persona real.** Todas las voces se crean con *Voice Design* (voces sintéticas generadas a partir de una descripción) o con actores contratados con cesión de derechos firmada. Está prohibido clonar a actores, toreros, presentadores o cualquier persona sin autorización escrita.
2. **Una voz por personaje, para toda la campaña.** Cuando se apruebe la voz de un personaje, su *Voice ID* se anota en la tabla del apartado 4 y no se cambia.
3. **El texto manda.** Si una línea no funciona dicha en voz alta, se corrige el guion (y su archivo de voz) antes de sintetizar; nunca se improvisa en la sesión.

## 2. Flujo de producción elegido

| Paso | Herramienta | Archivo de entrada |
|---|---|---|
| Diseño de voz | ElevenLabs · Voice Design | Apartado 4 de este documento |
| Síntesis principal | ElevenLabs · modelo **Eleven v3** (admite etiquetas de audio entre corchetes) | `01_DIALOGUES/CHAPTER_XX/VOCES/ELEVENLABS_V3/<PERSONAJE>.txt` |
| Síntesis alternativa | ElevenLabs · Multilingual v2 (sin etiquetas) | `01_DIALOGUES/CHAPTER_XX/VOCES/ELEVENLABS_V2_TEXTO_PLANO/<PERSONAJE>.txt` |
| Dirección / sesión con actor | Humano | `01_DIALOGUES/CHAPTER_XX/VOCES/DIRECCION/<PERSONAJE>.txt` |
| Seguimiento | Hoja de cálculo | `04_PRODUCTION_TRACKER/VOICE_RECORDING_TRACKER.csv` |
| Postproducción | DAW | Columna `fx` del tracker (teléfono, grabadora, exterior, etc.) |

### Formato de los archivos para ElevenLabs

- **Una intervención por línea.** La línea *n* del archivo corresponde a la intervención *n* del personaje en ese capítulo, en orden de aparición.
- El archivo **no contiene** identificadores, títulos, nombres de locutor, acotaciones ni comentarios: todo lo que hay en él se puede pronunciar.
- La correspondencia línea → identificador (`C01_E002_L004`) está en `VOICE_RECORDING_TRACKER.csv` (columna `linea_archivo`) y en el archivo de DIRECCIÓN.
- Para generar cada toma: copiar una línea completa del archivo v3 en ElevenLabs, con la voz del personaje, y exportar como `<ID>.wav` (por ejemplo `C01_E002_L004.wav`).

### Etiquetas de audio permitidas (Eleven v3)

Se usan en inglés, que es como mejor las interpreta el modelo, y con moderación (máximo dos por intervención).

| Etiqueta | Uso |
|---|---|
| `[sighs]` | suspiro |
| `[exhales]` | exhalación, soltar aire, humo |
| `[short pause]` / `[long pause]` | silencio interpretado dentro de la frase |
| `[whispers]` | susurro |
| `[quietly]` | volumen bajo sin llegar a susurro |
| `[laughs]` / `[chuckles]` | risa / risa breve contenida |
| `[clears throat]` | carraspeo |
| `[tired]` · `[annoyed]` · `[sarcastic]` · `[sad]` · `[serious]` · `[warmly]` · `[shouting]` | tono |

Las pausas también se marcan con puntuación natural: «…» para la suspensión y «—» para la interrupción.

### Interrupciones y solapamientos

Cuando un personaje corta a otro, la línea interrumpida termina en «—» y la siguiente empieza sin etiqueta. En la mezcla se solapan 150–300 ms (indicado en la columna `pausas` de DIRECCIÓN).

## 3. Interpretación del encargo sobre nombres

El texto que se sintetiza **no lleva etiquetas de locutor** («MANUEL:»). Los vocativos que forman parte de la frase («Ya sé a qué hora es, Manuel») sí se mantienen, porque son interpretación del personaje.

## 4. Fichas de voz

Cada ficha incluye la descripción para *Voice Design* (en inglés, que es el idioma en que la herramienta la procesa mejor) y los ajustes recomendados de partida.

### ALEJANDRO (23)
- **Registro:** barítono ligero, joven. Timbre limpio con algo de aspereza cuando está cansado.
- **Acento:** castellano peninsular, Salamanca, con el ritmo rápido de Madrid. Nada de seseo ni de rasgos latinoamericanos.
- **Rango emocional:** sarcasmo, rabia contenida, ternura que se le escapa, euforia.
- **Voice Design:** *"Young Spanish man from Castile, 23 years old, light baritone, clear and slightly husky voice, natural Peninsular Spanish accent from Salamanca with a fast Madrid rhythm, informal and ironic delivery, close microphone, no theatricality."*
- **Ajustes iniciales:** Stability 0.40 · Similarity 0.80 · Style 0.30 · Speaker boost activado.
- **Voice ID:** _pendiente_

### MANUEL (61)
- **Registro:** barítono grave, voz gastada por el tabaco y el aire libre. Arrastra levemente las vocales finales.
- **Acento:** charro rural de Salamanca. Frases cortas, cadencia lenta.
- **Rango emocional:** ironía, autoridad tranquila, ternura seca, culpa.
- **Voice Design:** *"Spanish man in his early sixties from rural Salamanca, deep and weathered baritone, smoker's rasp, slow and dry delivery, rural Castilian Peninsular Spanish accent, laconic, warm underneath, never theatrical."*
- **Ajustes iniciales:** Stability 0.55 · Similarity 0.80 · Style 0.20.
- **Voice ID:** _pendiente_

### RICARDO VALCÁRCEL (52)
- **Registro:** barítono medio, muy controlado, dicción perfecta.
- **Acento:** madrileño culto, sin rasgos castizos.
- **Rango emocional:** cordialidad, ironía elegante, frialdad. Nunca grita.
- **Voice Design:** *"Spanish businessman in his early fifties from Madrid, smooth mid baritone, impeccable diction, calm and measured, educated Peninsular Spanish accent, polite and cold, slight smile in the voice."*
- **Ajustes iniciales:** Stability 0.65 · Similarity 0.85 · Style 0.15.
- **Voice ID:** _pendiente_

### LUCÍA (29)
- **Registro:** mezzosoprano, voz firme, ligeramente grave para su edad.
- **Acento:** salmantino urbano, peninsular estándar.
- **Rango emocional:** eficiencia, sequedad, humor negro, vulnerabilidad breve.
- **Voice Design:** *"Spanish woman, 29 years old, from Salamanca city, firm mezzo voice slightly low for her age, quick and precise Peninsular Spanish delivery, dry humour, confident, natural and unpolished."*
- **Ajustes iniciales:** Stability 0.45 · Similarity 0.80 · Style 0.30.
- **Voice ID:** _pendiente_

### JAVIER ROMERO (26)
- **Registro:** tenor ligero, voz brillante y rápida.
- **Acento:** andaluz de Sevilla (Triana): aspiración de /s/ final, seseo moderado, cadencia musical.
- **Rango emocional:** chispa, chulería simpática, miedo verdadero en voz baja.
- **Voice Design:** *"Young Andalusian man from Seville, 26 years old, bright light tenor, fast musical rhythm, Seville accent with aspirated s and moderate seseo, charismatic and playful, Peninsular Spanish."*
- **Ajustes iniciales:** Stability 0.35 · Similarity 0.80 · Style 0.45.
- **Voice ID:** _pendiente_

### CARMEN OLMEDO (47)
- **Registro:** contralto, voz con cuerpo, muy articulada.
- **Acento:** castellano con leve deje valenciano en la entonación.
- **Rango emocional:** firmeza, persuasión, impaciencia educada, calidez profesional.
- **Voice Design:** *"Spanish woman in her late forties, warm contralto with authority, very articulate and fast, standard Peninsular Spanish with a light Valencian intonation, persuasive businesswoman, friendly but firm."*
- **Ajustes iniciales:** Stability 0.55 · Similarity 0.80 · Style 0.25.
- **Voice ID:** _pendiente_

### DON ERNESTO (64)
- **Registro:** bajo-barítono, voz ancha, grave, algo ronca. En las grabaciones de marzo, leve fatiga y temblor apenas perceptible (Parkinson inicial, no subrayar).
- **Acento:** charro rotundo de Salamanca.
- **Rango emocional:** autoridad, ironía sobre sí mismo, ternura escondida.
- **Voice Design:** *"Spanish man aged 64 from rural Salamanca, broad deep bass-baritone, slightly hoarse, slow and authoritative, rural Castilian Peninsular Spanish accent, self-ironic, recorded on a small handheld voice recorder."*
- **Ajustes iniciales:** Stability 0.55 · Similarity 0.80 · Style 0.25.
- **FX fijo:** grabadora digital (filtro paso banda 250 Hz–6 kHz, ruido de manipulación, clic de inicio y fin).
- **Voice ID:** _pendiente_

### SECUNDARIOS

| Personaje | Voice Design | Ajustes |
|---|---|---|
| PADRE JULIÁN (70) | *"Elderly Spanish priest from Salamanca, 70, grave tired baritone, warm and slow, Peninsular Spanish, outdoor funeral."* | Stab 0.60 · Style 0.15 |
| REMEDIOS (66) | *"Spanish woman aged 66 from a village in Salamanca, sharp and quick, affectionate, rural Castilian accent, slightly nasal."* | Stab 0.45 · Style 0.35 |
| SARGENTO BENÍTEZ (45) | *"Spanish Civil Guard sergeant aged 45 from Jaén, Andalusia, phlegmatic mid baritone, slow eastern Andalusian accent, calm authority, dry humour."* | Stab 0.60 · Style 0.20 |
| INSPECTORA ARRANZ (52) | *"Spanish woman aged 52 from Valladolid, official veterinarian, dry and precise mezzo, tired bureaucratic tone, standard Castilian Peninsular accent."* | Stab 0.65 · Style 0.15 |
| PACO LERMA (58) | *"Old Madrid bullfighting manager, 58, raspy smoker's baritone, castizo Madrid accent, sly and warm."* | Stab 0.50 · Style 0.30 |
| EL RUBIO (44) | *"Rural Salamanca ranch foreman, 44, rough low baritone, terse and defensive, Castilian accent."* | Stab 0.55 · Style 0.25 |
| ÍÑIGO SALAZAR (38) | *"Madrid corporate lawyer, 38, neutral clipped tenor, cold and exact."* | Stab 0.70 · Style 0.10 |
| PILAR (31) | *"Young Spanish mother from Salamanca, 31, bright clear soprano, laughing easily, home video recording from the early 2000s."* · FX: cinta VHS | Stab 0.40 · Style 0.40 |
| ORTEGA (50) | *"Spanish bank branch manager, 50, soft uneasy tenor, polite office voice, standard Peninsular accent."* | Stab 0.60 · Style 0.15 |
| DANI (24) | *"Young Madrid delivery rider, 24, fast casual baritone, working-class Madrid slang, friendly."* | Stab 0.40 · Style 0.40 |
| ALCALDE GASPAR (63) | *"Village mayor from rural Salamanca, 63, booming jovial baritone, speech-making tone."* | Stab 0.50 · Style 0.35 |
| MARTA IBARRA (41) | *"Spanish executive woman, 41, from Bilbao, brisk confident alto, efficient corporate tone, Peninsular Spanish with a light Basque intonation."* | Stab 0.60 · Style 0.20 |
| NOTARIO BENAVIDES (60) | *"Spanish notary, 60, monotone formal baritone, slow and precise reading voice."* | Stab 0.75 · Style 0.05 |
| TOÑO (19) | *"Shy 19-year-old farm worker from rural Salamanca, soft low voice, few words."* | Stab 0.50 · Style 0.20 |

## 5. Diccionario de pronunciación

Cargar en ElevenLabs como *Pronunciation Dictionary* (alias) si el modelo duda.

| Palabra | Pronunciación | Nota |
|---|---|---|
| Peñacorva | pe-ña-KOR-ba | llana |
| La Encomienda | la en-ko-MIEN-da | — |
| Valcárcel | bal-KAR-zel | con zeta |
| cárdeno | KAR-de-no | esdrújula |
| mayoral | ma-yo-RAL | — |
| tienta | TIEN-ta | — |
| becerra | be-ZE-rra | con zeta |
| Vega-Villar | BE-ga bi-YAR | — |
| La Glorieta | la glo-RIE-ta | plaza de Salamanca |
| Lumbrales | lum-BRA-les | pueblo |

## 6. Convenciones de nombre de archivo de audio

`<CAPITULO>_<ESCENA>_<LINEA>_<PERSONAJE>_T<toma>.wav` → `C01_E002_L004_MANUEL_T01.wav`
48 kHz · 24 bit · mono · −23 LUFS integrados por línea antes de mezcla.
