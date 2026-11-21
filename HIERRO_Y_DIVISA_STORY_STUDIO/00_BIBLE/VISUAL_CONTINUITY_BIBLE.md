# HIERRO Y DIVISA · VISUAL CONTINUITY BIBLE

Fuente única de verdad para imagen y vídeo. Todo prompt de imagen o de vídeo copia **literalmente** los bloques `CHARACTER LOCK` y `LOCATION LOCK` de este documento. Si un dato cambia aquí, se regeneran los prompts afectados.

---

## 1. Lenguaje visual global

| Elemento | Norma |
|---|---|
| Referencia | Fotograma de largometraje rodado en cine digital de gran formato; color natural, piel real, nada de aspecto «render» ni de ilustración. |
| Relación de aspecto | **2.39:1** para cinemáticas. **16:9** para planos de interfaz/plantillas de Unity (se indica en cada prompt). Móvil: recorte seguro central 16:9 dentro del 2.39:1. |
| Óptica | Anamórfica suave en exteriores amplios; esférica 35–50 mm en interiores y diálogos. Sin ojo de pez, sin gran angular extremo en rostros. |
| Paleta | Ocres, verdes de encina, grises de granito, cielos blancos de invierno. El verde botella de la divisa aparece como acento (cintas, puertas del cercado, chaqueta de Ernesto). |
| Grano | Grano fino de película, visible en sombras. |
| Iluminación | Motivada siempre: sol, ventana, fuego, faros, fluorescente de nave. |
| Prohibido en imagen | texto legible, rótulos, logotipos, marcas de coches, marcas de agua, subtítulos, interfaz, matrículas legibles, personas sonriendo a cámara, poses de catálogo. |

### Bloque negativo estándar (`NEGATIVE LOCK`)
```
text, letters, captions, subtitles, logo, watermark, brand names, readable license plates, cartoon, illustration, 3d render look, CGI plastic skin, oversaturated colors, HDR halos, extra fingers, deformed hands, distorted face, asymmetrical eyes, duplicated people, bull with extra horns or legs, malformed animal anatomy, modern logos on vehicles, smiling at camera, posed stock photo, beauty filter, lens flare overload, fisheye distortion
```

---

## 2. Fichas maestras de personaje

Cada ficha tiene: descripción física fija, `CHARACTER LOCK` (texto exacto para prompts), y vestuario por capítulo (los códigos `WARDROBE` también se copian literalmente).

### ALEJANDRO GALVÁN
- 23 años. 1,80 m. Complexión delgada y fibrosa, hombros rectos.
- Piel clara-oliva con moreno de invierno pálido (vive en Madrid desde hace cuatro años).
- Pelo castaño oscuro, corto en los laterales, más largo y desordenado arriba (5 cm), sin gomina.
- Barba de cuatro días, irregular en las mejillas.
- Ojos castaño oscuro, cejas rectas y espesas. **Cicatriz fina vertical de 1 cm en la ceja izquierda** (una becerra, a los 12).
- Nariz recta, mandíbula marcada. Ojeras visibles en C01.
- Accesorios fijos: reloj digital negro de silicona en la muñeca izquierda. Sin anillos ni cadenas.

```
CHARACTER LOCK — ALEJANDRO: a 23-year-old Spanish man, lean athletic build, 1.80 m, light olive skin with pale winter tan, short dark brown hair faded on the sides and longer messy on top, uneven four-day stubble, dark brown eyes, thick straight eyebrows, a thin 1 cm vertical scar through his left eyebrow, straight nose, defined jaw, tired eyes with visible dark circles, black silicone digital watch on his left wrist
```

| Código | Uso | Descripción para prompt |
|---|---|---|
| `WARDROBE A1` | C01 E001–E003 (entierro) | `wearing a slightly oversized cheap black suit, white shirt with the top button undone, no tie, black leather shoes dusty at the toes` |
| `WARDROBE A1B` | C01 E004 (hasta ponerse la chaqueta) | `wearing black suit trousers and a white shirt with the sleeves rolled to the forearm and the top button undone, no jacket, black leather shoes dusty at the toes` |
| `WARDROBE A2` | C01 E004 (final)–E006 | `wearing black suit trousers, white shirt with sleeves rolled to the forearm and top button undone, and his late father's faded olive-green waxed cotton field jacket, too wide in the shoulders, corduroy collar worn brown, black leather shoes muddy` |
| `WARDROBE A3` | C01 E007–E008 | `wearing faded blue jeans, a grey crew-neck sweater, his late father's faded olive-green waxed cotton field jacket too wide in the shoulders with a worn brown corduroy collar, and old brown leather work boots` |

### MANUEL CORRALES
- 61 años. 1,72 m. Corpulento, ancho de pecho, algo de barriga, espalda ligeramente encorvada.
- Piel curtida, morena rojiza, arrugas profundas en frente y comisuras, manchas de sol.
- Pelo blanco-gris corto. **Bigote gris espeso**, sin barba, afeitado del día.
- Ojos azul grisáceo, pequeños, entrecerrados por el sol.
- Manos grandes, nudillos gruesos. **Le falta la última falange del anular izquierdo.**
- Accesorios fijos: alianza de oro en el anular derecho (viudo); cigarrillo de liar a menudo apagado en la comisura.

```
CHARACTER LOCK — MANUEL: a 61-year-old Spanish cattle foreman, stocky barrel-chested build, 1.72 m, slightly stooped, deeply weathered reddish-tan skin with deep forehead wrinkles and sun spots, short white-grey hair, thick grey moustache and no beard, small pale blue-grey eyes narrowed by the sun, large calloused hands with the tip of the left ring finger missing, gold wedding band on his right ring finger
```

| Código | Uso | Descripción |
|---|---|---|
| `WARDROBE M1` | C01 E002 | `wearing an old dark grey wool suit shiny at the elbows, white shirt, thin black tie loosened, black shoes, a brown felt short-brim hat in his hands` |
| `WARDROBE M1B` | C01 E003 | `wearing an old dark grey wool suit shiny at the elbows, white shirt open at the collar with no tie, black shoes, a brown felt short-brim hat` |
| `WARDROBE M2` | C01 E004 (final), E005, E007, E008 (campo). El sombrero de ala corta y los zahones se indican en la pose de cada plano. | `wearing a brown-and-cream checked flannel shirt, a dark brown sheepskin-lined leather vest, brown corduroy trousers and brown leather boots` |
| `WARDROBE M3` | C01 E006 (cocina, noche) | `wearing a brown-and-cream checked flannel shirt with sleeves rolled up, brown corduroy trousers, no hat, grey wool socks and old leather slippers` |

### RICARDO VALCÁRCEL
- 52 años. 1,85 m. Delgado, postura erguida, gestos lentos.
- Piel bronceada de golf y caza, cuidada.
- Pelo gris plata peinado hacia atrás, abundante, con corte reciente.
- Afeitado perfecto. Ojos verde grisáceo. Cejas oscuras todavía.
- Sonrisa de labios cerrados.
- Accesorios fijos: reloj de acero de esfera blanca y correa de piel marrón (sin marca visible); gafas de sol de montura fina de acero; alianza de oro blanco.

```
CHARACTER LOCK — RICARDO: a 52-year-old elegant Spanish businessman, tall and slim, 1.85 m, upright posture, cared-for golf tan, thick silver-grey hair combed back, perfectly clean-shaven, grey-green eyes, dark eyebrows, thin closed-lip smile, steel dress watch with white dial and brown leather strap, white gold wedding band
```

| Código | Uso | Descripción |
|---|---|---|
| `WARDROBE R1` | C01 E002 (entierro) | `wearing a tailored charcoal wool suit, white shirt, black silk tie, black dress shoes, long navy cashmere overcoat open, thin steel-framed sunglasses in his hand` |
| `WARDROBE R2` | C01 E007 | `wearing a navy blazer, open-collar light blue shirt, beige chinos, brown suede ankle boots, a dark olive quilted country vest, holding a slim tan leather document folder` |

### LUCÍA FERRER
- 29 años. 1,68 m. Atlética, fuerte de brazos.
- Piel clara con pecas en nariz y pómulos, mejillas enrojecidas por el frío.
- Pelo castaño cobrizo hasta media espalda, **siempre recogido en coleta baja**, mechones sueltos.
- Ojos verde avellana. Sin maquillaje.
- Accesorios fijos: aros pequeños de plata; reloj analógico de acero con correa de nailon verde; fonendoscopio cuando trabaja.

```
CHARACTER LOCK — LUCIA: a 29-year-old Spanish veterinarian, athletic build, 1.68 m, fair skin with freckles across nose and cheekbones, cheeks reddened by cold, long copper-auburn hair always tied in a low practical ponytail with loose strands, hazel-green eyes, no makeup, small silver hoop earrings, steel analog watch with green nylon strap
```

| Código | Uso | Descripción |
|---|---|---|
| `WARDROBE L1` | C01 E005 | `wearing a dark navy work coverall with sleeves pushed up, a dark green softshell vest over it, black rubber knee boots, long blue disposable veterinary gloves to the shoulder when working` |

### JAVIER ROMERO (primera aparición C03)
- 26 años. 1,74 m. Fibroso, cintura estrecha, cuello largo.
- Piel morena aceitunada. Pelo negro rizado corto. Afeitado.
- Ojos negros grandes. Sonrisa amplia con un incisivo ligeramente montado.
- Cicatriz de cornada de 12 cm en el muslo izquierdo (visible solo en C11).
```
CHARACTER LOCK — JAVIER: a 26-year-old Andalusian bullfighter, wiry slim build, 1.74 m, narrow waist, long neck, olive-tan skin, short tight black curly hair, clean-shaven, large black eyes, wide smile with one slightly overlapping front tooth
```

### CARMEN OLMEDO (primera aparición en persona C04)
- 47 años. 1,66 m. Complexión media.
- Pelo castaño oscuro con mechas, media melena lisa a la altura de la mandíbula.
- Ojos castaños, gafas de pasta negra de vista.
```
CHARACTER LOCK — CARMEN: a 47-year-old Spanish bullfighting impresario, medium build, 1.66 m, dark brown chin-length straight bob with subtle caramel highlights, brown eyes, black rectangular acetate prescription glasses, minimal gold jewellery
```

### DON ERNESTO GALVÁN
- 64 años (fotografías recientes). 1,84 m. Muy ancho de espalda.
- Piel curtida. Pelo blanco espeso. **Barba blanca corta y cuidada.** Cejas blancas espesas.
- Ojos castaño oscuro (los de Alejandro).
- Vestuario icónico: **la chaqueta encerada verde oliva** (la misma que hereda Alejandro), gorra plana de tweed marrón, camisa de cuadros azul.
```
CHARACTER LOCK — ERNESTO: a 64-year-old Spanish bull breeder, tall and very broad-shouldered, 1.84 m, weathered tanned skin, thick white hair, short neatly trimmed white beard, bushy white eyebrows, dark brown eyes, wearing an olive-green waxed cotton field jacket with brown corduroy collar, a brown tweed flat cap and a blue checked shirt
```

---

## 3. Animales

```
ANIMAL LOCK — LUCERO: a massive Spanish fighting bull (toro bravo) seed bull, 560 kg, dark cárdeno coat (charcoal black with fine grey-white flecking), two small pale spots on the forehead, thick forward-curving horns that are pale ivory at the base and dark at the tips, deep chest, powerful neck hump (morrillo), calm fixed stare
ANIMAL LOCK — MORO: a dapple-grey Spanish horse (PRE cross), 1.60 m, black leather headstall, Spanish vaquera saddle with box stirrups
ANIMAL LOCK — CANELA: an old chestnut mare, 17 years old, white star on the forehead, white sock on the left hind leg, slightly sway-backed
ANIMAL LOCK — TORTOLA: a light cárdeno (grey-flecked) Spanish fighting cow with lyre-shaped horns, ear tag number 112 not readable
ANIMAL LOCK — VACAS: Spanish fighting cows, mostly cárdeno grey-flecked and some black, lyre-shaped thin horns, lean bodies, alert heads
ANIMAL LOCK — CABESTROS: large tame oxen, red-and-white and black-and-white pied coats, long horns, large iron cowbells on wide leather collars
```

---

## 4. Vehículos (sin logotipos ni marcas)

```
VEHICLE LOCK — COCHE ALEJANDRO: a 2012 dark grey five-door compact hatchback, generic design with no badges, a small dent on the rear left wing, dusty, cheap phone holder on the dashboard vent
VEHICLE LOCK — TODOTERRENO MANUEL: a boxy 1990s short-wheelbase off-road vehicle, faded olive-green paint, white steel roof, spare wheel on the rear door, mud on the lower panels, no badges
VEHICLE LOCK — PICKUP LUCIA: a white double-cab pickup truck with a white aluminium veterinary storage module in the bed, mud splashes, no badges
VEHICLE LOCK — SUV RICARDO: a large black luxury SUV with tinted rear windows, spotless, no badges
```

---

## 5. Localizaciones (`LOCATION LOCK`)

```
LOCATION LOCK — CARRETERA COMARCAL: a narrow two-lane rural road in western Salamanca, Spain, worn asphalt with faded white edge lines, granite drystone walls on both sides, holm oak dehesa stretching to the horizon, patches of low fog between the trees, wooden electricity poles
LOCATION LOCK — CEMENTERIO PEÑACORVA: a small Castilian village cemetery on a hill, whitewashed inner walls of granite rubble masonry, rows of white burial niches (nichos) four high, dark tall cypress trees, gravel path, rusted iron gate, granite church bell gable with stork nests visible in the distance
LOCATION LOCK — CAMINO ENCOMIENDA: a 4.5 km unpaved ranch track of compacted ochre earth and gravel with muddy puddles in the wheel ruts, running between granite drystone walls and centuries-old holm oaks with dark rounded crowns, open green winter pasture beyond, a few black Iberian pigs foraging under the trees of the neighbouring estate
LOCATION LOCK — PORTADA ENCOMIENDA: a ranch entrance of two square granite pillars joined by a wrought-iron arch whose centre holds a forged brand made of the intertwined letters E and G above an upward-facing crescent moon, a double iron gate painted bottle green with peeling paint, a cattle grid, a dirt track lined with ancient holm oaks behind
LOCATION LOCK — CASERIO ENCOMIENDA: a two-storey granite farmhouse with a Spanish clay tile roof, a front porch with four rough granite columns and a long stone bench, a bare grapevine pergola, a gravel yard, whitewashed stables to the left, holm oak dehesa behind
LOCATION LOCK — DESPACHO ERNESTO: a cluttered rural office in a granite farmhouse, thick walls, one deep window with wooden shutters, a heavy dark oak desk covered in unopened envelopes and old ledgers, a mounted head of a grey bull above a stone fireplace, framed black-and-white photographs of bulls and men on horseback, a worn leather armchair, a cork board with veterinary papers, a small silver handheld digital voice recorder on the desk
LOCATION LOCK — PRADO ALTO: a gentle slope of green winter pasture in a holm oak dehesa, granite boulders breaking the grass, a large shallow pond reflecting the sky, low drystone walls, cows grazing in the distance
LOCATION LOCK — COCINA ENCOMIENDA: a large farmhouse kitchen, granite walls partly whitewashed, a huge hooded fireplace with a low fire, a long oak table for twelve with only two places set at one end, copper pans hanging, a single warm pendant lamp, a window showing the dark night
LOCATION LOCK — CERCADO LUCERO: a six-hectare bull paddock enclosed by a 1.60 m granite drystone wall topped with three strands of wire, a bottle-green metal gate, a granite water trough, a single huge holm oak in the centre of the pasture
```

### Plano de La Encomienda (orientación para planos y continuidad de miradas)
- La portada mira al **norte**. El caserío tiene el porche orientado al **sur-oeste**: atardeceres de frente desde el porche.
- El cercado de Lucero queda al **este** del caserío: al atardecer el sol queda a la espalda de quien mira hacia el toro desde la puerta verde: luz dorada frontal sobre el toro, figura de primer término con luz de borde y cielo rosa-violeta al fondo.
- El Prado Alto está al **noroeste**, en ladera ascendente.

---

## 6. Condiciones temporales del capítulo 1

| Escena | Día | Hora | Luz | Tiempo |
|---|---|---|---|---|
| E001 | sáb. 8 marzo | 9:40 | sol bajo invernal, niebla levantándose | 6 °C, despejando |
| E002 | sáb. 8 marzo | 13:05 | mediodía blanco, cielo cubierto alto | 11 °C, viento flojo |
| E003 | sáb. 8 marzo | 14:10 | cubierto con claros | 12 °C |
| E004 | sáb. 8 marzo | 16:30 | luz de ventana lateral, fría | 12 °C |
| E005 | sáb. 8 marzo | 18:20–19:00 | hora dorada → atardecer | 9 °C, sin viento |
| E006 | sáb. 8 marzo | 22:30 | fuego de chimenea + lámpara | 2 °C fuera |
| E007 | dom. 9 marzo | 10:00 | sol limpio de mañana, sombras largas | 7 °C, helada fundiéndose |
| E008 | dom. 9 marzo | 18:50 | último sol rasante y cielo naranja | 8 °C |

---

## 7. Cronología visual y evolución emocional

| Capítulo | Alejandro | Manuel | Ricardo | Lucía |
|---|---|---|---|---|
| C01 | Traje negro → chaqueta del padre. Mirada esquiva, hombros cerrados, ojeras. | Traje viejo → ropa de campo. Contención. | Impecable, relajado, siempre a la altura de los ojos o por encima. | Eficaz, distante, a la defensiva. |

La chaqueta verde de Ernesto es el **objeto de continuidad principal**: Alejandro la lleva desde C01 E004 hasta el final (en el FINAL C la sustituye por el blazer azul marino).

---

## 8. Relaciones en el encuadre

- Alejandro y Manuel: al principio, siempre con distancia física (dos o tres metros, o un objeto entre ellos). Se acercan a lo largo de la campaña. En C09, nadie entre ellos y nadie mirando al otro.
- Ricardo: siempre en posición de poder (de pie si el otro está sentado, en plano ligeramente contrapicado, nunca bajo la lluvia ni manchado).
- Lucía: plano de trabajo; se la encuadra con las manos ocupadas.
