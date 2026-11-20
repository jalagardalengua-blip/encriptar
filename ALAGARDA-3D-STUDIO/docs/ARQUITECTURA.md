# Arquitectura de ALAGARDA 3D STUDIO

## Capas

```
src/
├── engine/                 Motor procedural: TypeScript puro + Three.js, sin React
│   ├── math/               RNG determinista, ruido Perlin/fBm, curvas por tramos, Catmull-Rom
│   ├── geometry/           Primitivas → THREE.BufferGeometry (blob, lathe, tube, loft) y validación
│   ├── procedural/         Contratos: parámetros, generador, registro, especificaciones de dominio
│   └── generators/         Implementaciones registradas (Fase 0: muestrario de primitivas)
├── viewer/Viewer.ts        Visor Three.js independiente de React (render bajo demanda)
├── io/gltf.ts              Exportación GLB/glTF (GLTFExporter) e importación (GLTFLoader)
├── storage/projectsDb.ts   Proyectos en IndexedDB (idb)
├── state/studioStore.ts    Estado global de la interfaz (Zustand)
├── ui/                     Componentes React (visor, panel de parámetros, proyectos)
└── App.tsx                 Composición y orquestación
```

Reglas de dependencia: `engine` no importa nada de `ui`, `state`, `storage` ni del DOM, por lo que se prueba en Node y podrá moverse a un Web Worker. `viewer` sólo conoce Three.js. React sólo orquesta.

## Flujo de datos

```
UI (ParamPanel) ──setParam──▶ Zustand (values saneados)
                                   │
                                   ▼
          runGenerator(generator, values, detail)   ← función pura: misma semilla ⇒ mismo modelo
                                   │ GeneratorOutput { root, parts, stats }
                                   ▼
                     Viewer.setModel(root) ──▶ render bajo demanda
                                   │
            ┌──────────────────────┴───────────────────────┐
     exportGLB(root) → descarga .glb          saveProject(values) → IndexedDB
```

Un proyecto guardado contiene **sólo parámetros** (`generatorId`, `generatorVersion`, `values`), no geometría: ocupa bytes y el modelo se regenera de forma idéntica.

## Contrato de generador

Definido en `src/engine/procedural/types.ts`:

```ts
interface ProceduralGenerator {
  id: string;                       // 'toro.bravo', 'plaza.clasica'…
  name: string;
  category: 'toro' | 'torero' | 'caballo' | 'plaza' | 'escenario' | 'utilidad';
  version: string;                  // semver del algoritmo, se guarda con el proyecto
  description: string;
  params: readonly ParamDef[];      // number | integer | boolean | enum | color | seed
  presets?: readonly GeneratorPreset[];
  generate(values: ParamValues, ctx: GeneratorContext): GeneratorOutput;
}
interface GeneratorContext { rng: Rng; noise: Noise3; detail: 'bajo' | 'medio' | 'alto' }
interface GeneratorOutput { root: THREE.Group; parts: GeneratedPart[]; stats: GeneratorStats }
```

Garantías que da `runGenerator` (`procedural/registry.ts`):
- sanea los valores con el esquema (rangos, tipos, opciones, colores `#rrggbb`), así que un proyecto antiguo o un archivo manipulado nunca rompe un generador;
- siembra `rng` y `noise` con el parámetro `seed`;
- anota `root.userData.generator = { id, version, values }`, que viaja dentro del GLB como `extras`.

La interfaz se construye a partir de `params`: cada control visible corresponde a un parámetro real. Una prueba (`tests/procedural.test.ts`) recorre el esquema y falla si algún parámetro no modifica el resultado.

## Convenios

- Unidades en metros; Y arriba; frente del modelo hacia +Z (igual que TORERO, GANADERIA-27 y glTF).
- Colores de parámetros en sRGB; colores por vértice en lineal.
- Cada pieza (`GeneratedPart`) tiene nombre estable; se exporta como nodo glTF con ese nombre.
- Nivel de detalle: los generadores multiplican sus segmentos por 0,5 / 1 / 2.
- `latheGeometry`: normal de cada tramo = (-dy, dr), como en TORERO. Un perfil recorrido de arriba abajo por el exterior da normales hacia fuera; de abajo arriba, hacia el eje (útil para barrera y tendidos vistos desde el ruedo).

## Cómo se añadirán los generadores de las siguientes fases

1. Crear `src/engine/generators/<categoria>/<nombre>.ts` que exporte un `ProceduralGenerator`.
2. Exponer sus parámetros a partir de la especificación de dominio correspondiente de `procedural/domain.ts` (`ToroSpec`, `ToreroSpec`, `CaballoSpec`, `PlazaSpec`, `EscenarioSpec`).
3. Construir la malla con las primitivas de `engine/geometry` y piezas jerárquicas (`THREE.Group` por articulación) para permitir poses.
4. Registrar en `createDefaultRegistry()` (`generators/index.ts`).
5. Añadir pruebas: geometría limpia, determinismo, cada parámetro tiene efecto, exportación GLB.

Previsto por categoría:

| Categoría | Generador | Origen principal |
|---|---|---|
| toro | `toro.bravo` (toro, vaca, becerro, cabestro) | `buildBull` de TORERO + `morf/bprof` de GANADERIA-27 |
| torero | `persona.torero` (matador, subalterno, picador, mozo) | `buildHuman`, `TRAJES`, `armIK` de TORERO |
| caballo | `caballo.picador`, `caballo.mula` | proporciones de `makeHorse2` de GANADERIA-27, reconstruido con primitivas |
| plaza | `plaza.clasica` | `buildPlaza`, `PLZ` de TORERO |
| escenario | `escenario.dehesa`, `escenario.encierro`, `escenario.pueblo` | `gH`/finca de GANADERIA-27; `encierro.js`, `bous.js` de TORERO |

Accesorios (capote, muleta, estoque, banderillas, divisa) serán piezas opcionales de su generador padre o generadores propios.

## Calidad

| Orden | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript estricto (`strict`, `noUncheckedIndexedAccess`) |
| `npm run lint` | ESLint 10 + typescript-eslint + reglas de hooks de React |
| `npm test` | Vitest: matemáticas, geometría, parámetros, registro, GLB, IndexedDB, estado |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run check` | Las cuatro anteriores en orden |

La integración continua (`.github/workflows/alagarda-studio.yml` en la raíz del repositorio) ejecuta `npm run check` en cada cambio dentro de `ALAGARDA-3D-STUDIO/`.
