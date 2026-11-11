# Estudio de Modelos 3D

Genera modelos 3D **con esqueleto y animaciones** y los exporta a **GLB** (glTF 2.0 binario). Es gratis, funciona sin conexión y no necesita Blender. Los archivos sirven para Three.js, Godot, Unity, Unreal, Babylon.js, PlayCanvas y cualquier motor que lea glTF.

Hay dos formas de usarlo:

1. **App web**: eliges qué crear, ajustas forma y colores con deslizadores, ves el modelo animado y descargas el `.glb`.
2. **Terminal**: un comando genera el `.glb`. Claude lo usa para crearte los modelos que pidas mientras programa tus juegos.

## Qué puede crear ahora

| Generador | Presets | Esqueleto | Animaciones |
|---|---|---|---|
| `humanoide` Persona | granjero, granjera, vaquero, aldeano, nino, caricatura | 18 huesos | Reposo, Caminar, Correr, Saltar, Saludar, Recoger, Sentarse |
| `cuadrupedo` Animal de 4 patas | vaca, toro, ternero, cerdo, oveja, carnero, cabra, caballo, burro, perro, gato | 22 huesos | Reposo, Caminar, Trotar, Galopar, Comer, Tumbado (+ Sentado en perro y gato) |
| `ave` Ave de corral | gallina, gallo, pollito, pato, pato_real, oca | 13 huesos | Reposo, Caminar, Correr, Picotear, Aletear, Echada |
| `tractor` Tractor | rojo, verde, azul, pequeno, con_pala | nodos | Avanzar, Girar, Ralenti, Subir_pala |
| `granja` Objetos de granja | arbol, pino, valla, granero, molino, fardo, abrevadero, comedero, roca | nodos | Viento, Abrir_puertas, Girar |

Cada preset es solo un punto de partida: todos los parámetros (tamaños, proporciones, cuernos, orejas, cola, pelaje, ropa, colores…) se pueden cambiar. La **semilla** cambia los detalles aleatorios (manchas, lana, copa de los árboles) para que no haya dos animales iguales.

En `modelos/` tienes ya generados todos los presets (37 archivos, validados con el validador oficial de Khronos sin errores).

## Abrir la app

```bash
cd estudio-3d
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta un servidor local porque los módulos JavaScript no cargan con `file://`. También sirve `npx serve`.

- **Descargar .glb** exporta el modelo con su esqueleto y todas sus animaciones.
- **Variar** cambia la semilla.
- **Esqueleto** y **Malla** muestran los huesos y los triángulos.
- **Abrir archivo .glb** carga cualquier GLB (tuyo o descargado) para revisar sus huesos y animaciones.
- **Generarlo desde la terminal** te da el comando exacto para reproducir el modelo que estás viendo.

## Generar desde la terminal

```bash
cd estudio-3d
npm install                      # una vez (instala three.js para Node)

node herramientas/generar.mjs --lista                         # generadores, presets y parámetros
node herramientas/generar.mjs cuadrupedo --preset vaca        # → modelos/vaca.glb
node herramientas/generar.mjs cuadrupedo --preset vaca --patron cinturon --colorManchas "#ffffff" --colorBase "#222222" --salida modelos/vaca_cinturon.glb
node herramientas/generar.mjs humanoide --preset granjero --altura 1.9 --sombrero vaquero --semilla 4
node herramientas/generar.mjs --todos modelos                 # regenera todos los presets
node herramientas/validar.mjs modelos                         # validación oficial glTF
```

## Usar los modelos en un juego

Convenciones de todos los modelos:

- Metros, Y hacia arriba, el modelo **mira hacia +Z** y apoya en `y = 0`.
- Las animaciones son **en el sitio**: el personaje no se desplaza; el juego lo mueve y reproduce `Caminar` o `Correr` a la vez.
- Los huesos tienen nombres estándar en inglés (`Hips`, `Spine`, `Head`, `UpperArm_L`, `FrontUpper_R`…). `_L` es la izquierda del personaje (+X).
- Las piezas móviles de los objetos sin esqueleto son nodos con nombre: `Rueda_TI`, `Rueda_DD`, `Direccion_DI`, `Volante`, `Pala`, `Puerta_I`, `Aspas`, `Copa`…

### Three.js

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('modelos/cuadrupedo/vaca.glb');
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
const anim = (nombre) => mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, nombre));
anim('Caminar').play();
// en el bucle: mixer.update(delta);
```

Para varias vacas con el mismo archivo, clona con `SkeletonUtils.clone(gltf.scene)`.

### Godot 4

Arrastra el `.glb` a la carpeta del proyecto. Se importa con su `AnimationPlayer`:

```gdscript
$Vaca/AnimationPlayer.play("Caminar")
```

Para que una animación se repita, en la ventana de importación marca **Loop Mode: Linear** en `Caminar`, `Correr`, `Reposo`…

### Unity

Instala el paquete gratuito **glTFast** (`com.unity.cloud.gltfast`) y arrastra el `.glb` al proyecto. Las animaciones aparecen como clips para el `Animator`.

### Unreal Engine

Activa el plugin **glTF Importer** (incluido en el motor) e importa el `.glb` como Skeletal Mesh con sus animaciones.

## Pedirle a Claude un modelo nuevo

En tus repositorios de juegos puedes pedirle a Claude cosas como:

- «Hazme una vaca marrón con manchas blancas y cuernos largos, en GLB, y ponla en el juego.»
- «Crea un generador de *caballero medieval* con armadura, espada y animaciones de atacar y defender.»
- «Añade al estudio un generador de *gallinero* con puerta que se abre.»

Claude usará los generadores que ya existen o escribirá uno nuevo en `src/generadores/` (hay una plantilla en `src/generadores/_plantilla.js`). Todo generador nuevo aparece solo en la app y en la terminal. El archivo `CLAUDE.md` le explica a Claude cómo hacerlo.

## Estructura

```
estudio-3d/
├── index.html               app web
├── src/
│   ├── app.js               interfaz y visor
│   ├── core/
│   │   ├── modelo.js        esqueleto, piezas, materiales y fusión en una malla
│   │   ├── formas.js        formas básicas (esfera, cápsula, tubo entre dos puntos…)
│   │   ├── animacion.js     animaciones por código
│   │   ├── exportar.js      construcción y exportación a GLB
│   │   └── azar.js          aleatorio reproducible por semilla
│   └── generadores/         un archivo por tipo de modelo + index.js
├── herramientas/
│   ├── generar.mjs          generar GLB desde la terminal
│   └── validar.mjs          validar GLB con gltf-validator de Khronos
├── modelos/                 GLB ya generados
└── lib/                     three.js r170 (MIT), incluido para usarlo sin conexión
```

## Licencia

El código del estudio y los modelos que generes son tuyos y puedes usarlos en juegos comerciales. Three.js se distribuye con licencia MIT (`lib/LICENSE`).
