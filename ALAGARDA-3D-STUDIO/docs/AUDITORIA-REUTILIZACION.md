# Auditoría de reutilización: TORERO y GANADERIA-27

Revisión hecha en modo **sólo lectura** (clon superficial fuera de este repositorio; no se ha modificado nada en los originales).

| Proyecto | Repositorio | Commit auditado | Nombre del juego | Motor 3D |
|---|---|---|---|---|
| TORERO | jalagardalengua-blip/TORERO | `ef7b57b` | *Embestida* | WebGL2 propio escrito a mano (`src/engine.js`), sin Three.js |
| GANADERIA-27 | jalagardalengua-blip/GANADERIA-27 | `e2fdb31` | *Hierro y Divisa* | Three.js **r128** cargado desde CDN (`js/mundo3d.js`) |

## 1. Conclusión

- **No se integra ningún motor de renderizado.** El renderizador WebGL de TORERO (shaders, *shadow maps*, postproceso, `render()`, `post()`) y el bucle de escena de GANADERIA-27 quedan fuera. ALAGARDA usa sólo `THREE.WebGLRenderer` estándar.
- **Lo valioso es la geometría procedural de TORERO**: sus primitivas (`blob`, `lathe`, `tube`, `loft`) producen mallas orgánicas de mucha más calidad que las de GANADERIA-27, que monta los animales con esferas y cilindros escalados.
- **Lo valioso de GANADERIA-27 son los datos y la parametrización**: el modelo morfológico `morf()`/`bprof()` (longitud, alzada, morrillo, perímetro, papada…), encastes, pelos y encornaduras expresados como números; encaja directamente con un generador paramétrico.
- Ambos proyectos son código minificado a mano, en JavaScript sin tipos y con estado global. **Se adaptan algoritmos, no se copian ficheros**: cada función reutilizada se reescribe en TypeScript, se convierte a `THREE.BufferGeometry`, se le quitan las dependencias globales y se cubre con pruebas.

## 2. Funciones ya adaptadas en la Fase 0

| Original | Ubicación original | Adaptación en ALAGARDA | Cambios |
|---|---|---|---|
| `mulberry(s)` | TORERO `src/engine.js:8` · GANADERIA-27 | `src/engine/math/random.ts` (`mulberry32`, `createRng`) | Idéntica secuencia (verificado en prueba) + `range/int/pick/gaussian` |
| `noise3`, `fbm3` | TORERO `src/engine.js:13,17` | `src/engine/math/noise.ts` | Tabla de permutación por instancia y semilla, en vez de global |
| `curve(x, pts)` | TORERO `src/engine.js:19` | `piecewiseSmooth` en `math/curves.ts` | Tipado y validación |
| `crPts(c, n)` | TORERO `src/assets.js:69` | `catmullRomPoints` en `math/curves.ts` | Igual algoritmo |
| `ga(t,c,w)` | GANADERIA-27 `js/mundo3d.js:5` | `gaussianBump` en `math/scalar.ts` | — |
| `class Geo` | TORERO `src/engine.js:69` | `GeometryBuilder` en `geometry/builder.ts` | Produce `THREE.BufferGeometry` (exportable a glTF) |
| `weldNormals`, `fixWinding` | TORERO `src/engine.js:70,81` | `orientByHint`, `computeWeldedNormals`, `fixWinding` en `geometry/normals.ts` | Usa `computeVertexNormals` de Three y suelda costuras sin fusionar vértices (conserva UV) |
| `blob(ws,hs,fn,col)` | TORERO `src/engine.js:85` · `bodyGeo` GANADERIA-27 `:97` | `blobGeometry` en `geometry/blob.ts` | Mismo convenio (eje largo Z) para portar los perfiles del toro sin cambios |
| `lathe(prof,seg,opts)` | TORERO `src/engine.js:90` | `latheGeometry` en `geometry/lathe.ts` | Mismo convenio de normal `(-dy, dr)`; omite triángulos degenerados en el eje |
| `tube(pts,rs,rad,col)` | TORERO `src/engine.js:101` · `hornGeo` GANADERIA-27 `:47` | `tubeGeometry` en `geometry/tube.ts` | Transporte paralelo con `THREE.Vector3`; tapa final opcional |
| `loft(keys,seg,col,rows)` | TORERO `src/assets.js:121` | `loftGeometry` en `geometry/loft.ts` | Tapas opcionales |

Todas tienen pruebas en `tests/geometry.test.ts` y `tests/math.test.ts` (volumen con signo positivo = caras hacia fuera, normales unitarias, sin NaN, sin índices fuera de rango, sin triángulos degenerados).

## 3. Funciones reutilizables en fases siguientes

### 3.1 Toro (Fase 1, **ya implementado**: ver `ESTADO-FASE-1.md`)

| Original | Ubicación | Qué aporta | Cómo se adaptará |
|---|---|---|---|
| `buildBull(o)` | TORERO `src/assets.js:73` | Cuerpo esculpido con `blob` + perfiles `curve` (lomo, vientre, anchura), relieves gaussianos de escápulas y muslos, cuello, cabeza, orejas, ojos, astas `tube`, patas `lathe` en dos segmentos con pezuñas, rabo, divisa | Generador `toro` con jerarquía de `THREE.Group` (cadera/rodilla/pezuña) lista para animación y `THREE.Skeleton` más adelante |
| `CAPAS`, `coat()` | TORERO `src/assets.js:60,62` | 10 capas con patrones por ruido (cárdeno, berrendo, salinero, sardo, chorreado) | Color por vértice o textura generada en `CanvasTexture` |
| `HORNS` (TORERO) | `src/assets.js:71` | 7 encornaduras con puntos de control 3D | Tabla de datos tipada (`Encornadura`) |
| `morf(a)`, `ENCMORF`, `HORNS`, `PELO` | GANADERIA-27 `js/juego.js:67-69,22` | Morfología por encaste y edad, particularidades (lucero, bragado, calcetero, rabicano), 8 encornaduras paramétricas | `MorfologiaToro`, `ParticularidadesToro` en `procedural/domain.ts` |
| `bprof(m)` | GANADERIA-27 `js/mundo3d.js:94` | Perfil del cuerpo como funciones continuas de `t` (`e,w,top,bot,cy`) a partir de la morfología | Combinar con el cuerpo de TORERO: los parámetros de GANADERIA modulan los perfiles de TORERO |
| `animBull` | GANADERIA-27 `js/mundo3d.js:134` | Ciclo de paso/galope por fase | Futuro módulo de poses, no de geometría |

### 3.2 Torero y personas

| Original | Ubicación | Qué aporta |
|---|---|---|
| `buildHuman(o)` | TORERO `src/assets.js:130` | Cuerpo con `loft` (pelvis, torso, cabeza con nariz esculpida), traje de luces con hombreras y flecos, montera, ojos, brazos, piernas; variante `mozo` |
| `TRAJES` | TORERO `src/assets.js:128` | 7 combinaciones de traje (color + bordado) |
| `armIK` | TORERO `src/assets.js:186` | IK analítica de dos huesos para colocar manos (útil para poses de capote/muleta) |
| `makePerson`, `mkTorero` | GANADERIA-27 `js/mundo3d.js:150,830` | Versión simplificada (útil como LOD bajo) |

### 3.3 Caballo

| Original | Ubicación | Qué aporta |
|---|---|---|
| `makeHorse2(o)` | GANADERIA-27 `js/mundo3d.js:193` | Única referencia de caballo/mula: proporciones, montura, **peto de picador**. Geometría muy básica (esferas): se tomarán proporciones y se reconstruirá con `blob`/`lathe` como el toro de TORERO |

### 3.4 Plaza y escenarios

| Original | Ubicación | Qué aporta |
|---|---|---|
| `buildPlaza(scene,q)`, `PLZ` | TORERO `src/assets.js:224-225` | Ruedo, barrera, callejón, tendidos y gradas como **un único perfil `lathe`**, columnas instanciadas, burladeros, toriles, palco con colgadura, banderas; radio 30 m, barrera 1,6 m |
| `crowdMesh` | TORERO `src/assets.js:216` | Público con `InstancedMesh` |
| `makeTextures`, `tfbm`, `nrmFromH` | TORERO `src/assets.js:6-12` | Texturas procedurales en canvas (albero, madera, piedra encalada, ladrillo neomudéjar, adoquín, bordado de oro) y mapas normales desde altura → `THREE.CanvasTexture` |
| `buildPlaza` | GANADERIA-27 `js/mundo3d.js:781` | Alternativa simple |
| `gH(x,z)` y finca | GANADERIA-27 `js/mundo3d.js:310` | Terreno de dehesa por altura procedural |
| `bous.js`, `encierro.js` | TORERO | Plaza de pueblo y recorrido del encierro: referencias de escenario |
| `class Cloth` (Verlet) | TORERO `src/assets.js:192` | Simulación de tela para capote y muleta |
| `mkCloth/clothTick` | GANADERIA-27 `js/mundo3d.js:185-186` | Ondulación senoidal barata (LOD bajo) |

## 4. Qué NO se reutiliza

| Elemento | Motivo |
|---|---|
| Renderizador WebGL de TORERO (`engine.js` desde `// WEBGL`, shaders, `post()`) | Regla 3: no integrar motores. Three.js lo sustituye |
| Matemáticas `V`, `Q`, `m4` de TORERO | Sustituidas por `THREE.Vector3/Quaternion/Matrix4` |
| Lógica de juego (`game.js`, `director.js`, `suerte.js`, `juego.js`, `carrera.js`), audio, HUD | Fuera del alcance de un editor 3D |
| Three.js r128 vía CDN de GANADERIA-27 | Versión antigua (2021); ALAGARDA usa three 0.187 empaquetado con Vite |
| **Fotografías de `GANADERIA-27/img/`** (52 JPG) | Procedencia y licencia no documentadas. **No se reutilizan** hasta que el autor confirme su origen (ver `LICENCIAS.md`) |
| Tipografías de `TORERO/fonts/` | No son necesarias; si se usan, son SIL OFL (Barlow, Barlow Condensed, Ultra) y habría que incluir la licencia |

## 5. Diferencias de convenios a tener en cuenta al portar

- **Ejes**: TORERO y GANADERIA usan Y arriba y el frente del animal hacia +Z. Se mantiene en ALAGARDA (y es compatible con glTF, que define Y arriba).
- **Color**: TORERO trabaja en color lineal (sus tablas `CAPAS` ya son lineales); GANADERIA usa hex sRGB. En ALAGARDA los parámetros de color son sRGB (`#rrggbb`) y los colores por vértice se guardan lineales.
- **Unidades**: metros en ambos proyectos; se conserva.
- **Materiales**: TORERO usa un material propio con `sheen`, mapas de detalle y modos; se traducirá a `MeshPhysicalMaterial` (`sheen`, `sheenColor`, `normalMap`), que glTF exporta mediante `KHR_materials_sheen`.
