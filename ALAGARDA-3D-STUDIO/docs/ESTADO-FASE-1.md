# Estado de la Fase 1: generador de toro

## Implementado y verificado

Generador `toro.bravo` (`src/engine/generators/toro/`), primero en el selector de la aplicación.

**Geometría** (port de `buildBull` de TORERO a `THREE.BufferGeometry`, 27 mallas con nombre):
- Cuerpo esculpido con relieves de escápula, brazo, muslo y costillar; cuello con morrillo y papada.
- Cabeza con arcos superciliares, ojos, orejas, testuz rizado y morro con ollares.
- Astas con anillos en la cepa y degradado base → centro → pitón; 10 encornaduras.
- Patas articuladas (cadera → rodilla → pezuña) con pezuñas hendidas y espolones; corvejones en reposo.
- Rabo con borla de mechones individuales, divisa con arpón y cintas que caen por el costado.
- Escroto y prepucio (toro), ubre y pezones (vaca), collar y cencerro (cabestro).
- Jerarquía de nodos nombrados (`cadera_ad_izq`, `rodilla_tr_der`, `cabeza_nodo`…) lista para posar o riggear en Blender.

**Texturas horneadas** (`src/engine/texture/`):
- Todas las piezas con pelo comparten un atlas (512 / 1024 / 2048 px según el detalle) con densidad de texel uniforme.
- El patrón de capa se evalúa en la posición 3D real de cada texel, por eso es continuo entre cuerpo, cuello, cabeza y patas.
- Mechones orientados en la caída del pelo → variación de color + mapa normal; tangentes explícitas.
- 12 capas: negro, castaño, colorado, cárdeno, berrendo, jabonero, ensabanado, salinero, sardo, chorreado, entrepelado y burraco.
- Particularidades: lucero, bragado, calcetero y rabicano; cabos oscuros, hocico, polvo de albero.

**Materiales PBR** exportables: `MeshPhysicalMaterial` con *sheen* (pelo, borla y divisa), *clearcoat* (astas y ojos) y *specular* → `KHR_materials_sheen`, `KHR_materials_clearcoat`, `KHR_materials_specular`.

**Parámetros (27)**: tipo de res (toro, vaca, becerro, cabestro), encaste (proporciones de GANADERIA-27: Domecq, Albaserrada, Miura, Santa Coloma, Atanasio, Cuadri), capa, particularidades, longitud del pelo, brillo, polvo, encornadura, largo, grosor y color de astas, tamaño, longitud, alzada, morrillo, perímetro, papada, patas, postura (parado, humillando, al paso, alerta), divisa y sus dos colores, semilla. 8 presets.

**Verificación**
- 47 pruebas (Vitest). Para el toro: piezas presentes, geometría sin NaN ni índices rotos, pezuñas apoyadas en y = 0 en las 16 combinaciones de tipo y postura, dimensiones realistas, rasgos por tipo, atlas válido, negro oscuro / ensabanado claro, determinismo y **cada uno de los 27 parámetros cambia el modelo**.
- GLB exportado desde Chromium y validado con el validador oficial de Khronos (`npm run validate:glb -- archivo.glb`): **0 errores, 0 avisos**.
  - Detalle medio: 21 296 vértices, 37 176 triángulos, 2 texturas de 1024 px, 3,8 MB, se genera en ~0,9 s.
  - Detalle alto: ~40 000 vértices, texturas de 2048 px, 12,6 MB, se genera en ~4,5 s.
- Probado en escritorio (1280×800) y en iPhone 13 emulado, sin errores en consola.

## Límites honestos

- Es un modelo **procedural** de buena calidad para tiempo real, no un escaneo fotográfico: el pelo es textura y relieve (no hay pelos 3D salvo en la borla), y las uniones entre cuerpo, cuello y patas son mallas que se intersecan, no una única malla continua. Por eso de cerca se aprecian las costuras de sombreado en hombros y muslos.
- Sin esqueleto (`Skin`) ni animaciones: la postura se aplica rotando nodos. Las articulaciones están separadas y con nombre para riggear en Blender.
- La generación ocurre en el hilo principal (con 250 ms de espera tras el último cambio). En móviles modestos el detalle alto puede tardar varios segundos.

## Siguiente paso propuesto

1. Malla única de cuerpo con transición suave a patas y cuello (eliminar costuras) y esqueleto `THREE.Skeleton` exportable.
2. Generación en Web Worker.
3. Generador de torero (`buildHuman` de TORERO) reutilizando el atlas de texturas.
