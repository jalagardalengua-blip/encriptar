# Licencias y procedencia de recursos

## Dependencias del proyecto

Todas son de código abierto y gratuitas. Ninguna API externa de pago.

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| three | 0.187.0 | MIT | Motor 3D, GLTFLoader, GLTFExporter, OrbitControls, RoomEnvironment |
| react / react-dom | 19.3.1 | MIT | Interfaz |
| zustand | 5.1.0 | MIT | Estado |
| idb | 8.0.4 | ISC | Envoltorio de IndexedDB |
| vite, @vitejs/plugin-react | 8.3.8 / 6.3.0 | MIT | Compilación (desarrollo) |
| typescript | 6.0.3 | Apache-2.0 | Tipos (desarrollo) |
| tailwindcss, @tailwindcss/vite | 4.3.5 | MIT | Estilos (desarrollo) |
| eslint, typescript-eslint | 10.15.0 / 8.73.0 | MIT | Lint (desarrollo) |
| vitest, jsdom | 5.1.1 / 31.0.1 | MIT | Pruebas (desarrollo) |
| fake-indexeddb | 6.2.8 | Apache-2.0 | Pruebas (desarrollo) |
| gltf-validator | (Khronos) | Apache-2.0 | Validación de GLB (desarrollo) |

Recuento de licencias en `node_modules` (todas permisivas): MIT, Apache-2.0, ISC, BSD-2/3, BlueOak-1.0.0, 0BSD; MPL-2.0 (`lightningcss`, sólo compilación) y CC-BY-4.0 (`caniuse-lite`, datos de compatibilidad, sólo compilación). Nada de esto se distribuye como recurso propio.

`RoomEnvironment` (iluminación del visor) se genera por código: no hay HDRI ni imágenes externas.

Las texturas del toro (color de pelo y mapa normal) se generan por código en cada exportación: no contienen imágenes de terceros, así que el GLB resultante no arrastra licencias externas.

## Código de TORERO y GANADERIA-27

- Ninguno de los dos repositorios tiene archivo `LICENSE`. Por defecto el código está bajo «todos los derechos reservados» de su autor.
- Ambos pertenecen a la misma cuenta que ALAGARDA 3D STUDIO, de modo que la reutilización la decide el propio titular. **Recomendación**: añadir un `LICENSE` explícito a los tres proyectos (p. ej. MIT o la que el autor prefiera) para dejar constancia.
- El código adaptado no se copia literalmente: se reescribe en TypeScript y se indica su origen en un comentario de cabecera de cada función.
- GANADERIA-27 carga Three.js r128 desde cdnjs (MIT): no se reutiliza esa copia.

## Recursos gráficos de los proyectos originales

| Recurso | Licencia / procedencia | Decisión |
|---|---|---|
| `GANADERIA-27/img/*.jpg` (retratos de toros, plaza, dehesa, palco…) | **Desconocida**: el repositorio no indica autor ni licencia | **No usar** hasta confirmar origen. Si son fotografías de terceros, no pueden redistribuirse |
| `TORERO/fonts/*.woff2` (Barlow, Barlow Condensed, Ultra) | SIL Open Font License 1.1 (Google Fonts), según `fonts/fonts.css` | Utilizables incluyendo el texto de la OFL; no son necesarias por ahora |
| `TORERO/icons/*` | Creados para el juego (sin licencia explícita) | No se usan; ALAGARDA tiene su propio icono (`public/favicon.svg`) |
| Texturas de TORERO | Procedurales (generadas por código en `src/assets.js`) | Algoritmos reutilizables sin restricciones de terceros |

## Recursos de terceros previstos

Si en fases futuras se usan modelos o texturas externos, sólo se aceptarán con licencia **CC0** o equivalente (p. ej. Poly Haven, ambientCG, Kenney), registrando aquí: nombre, URL de origen, autor, licencia y fecha.
