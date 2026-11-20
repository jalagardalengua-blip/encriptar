# Estado de la Fase 0: preparación y auditoría

## Entorno comprobado

| Herramienta | Versión |
|---|---|
| Node.js | 22.23.5 |
| npm | 10.9.9 |
| Chromium + Playwright | preinstalados (usados para verificar la interfaz) |

## Implementado y verificado

| Tarea | Estado | Evidencia |
|---|---|---|
| 1. Comprobar el entorno | ✅ | Tabla anterior |
| 2. Estructura del proyecto | ✅ | `ALAGARDA-3D-STUDIO/` (ver `ARQUITECTURA.md`) |
| 3. React + TypeScript + Vite + Three.js (+ Tailwind, Zustand, idb) | ✅ | `npm run build` sin errores |
| 4. ESLint y comprobación de tipos | ✅ | `npm run lint` y `npm run typecheck` sin errores ni avisos |
| 5. Sistema de pruebas | ✅ | Vitest: 33 pruebas en 6 archivos, todas pasan |
| 6. Documentación técnica | ✅ | `README.md`, `docs/` |
| 7. Reutilización de TORERO y GANADERIA-27 | ✅ | `AUDITORIA-REUTILIZACION.md` |
| 8. Interfaces TypeScript del motor procedural | ✅ | `src/engine/procedural/{params,types,domain}.ts` |
| 9. Arquitectura para toros, toreros, caballos, plazas y escenarios | ✅ | Registro de generadores + especificaciones de dominio + primitivas portadas |
| 10. Proyecto preparado para la siguiente fase | ✅ | Ver «Siguiente fase» |

Funcionalidad real de la aplicación (verificada en Chromium de escritorio 1280×800 y emulando un iPhone 13, sin errores en consola ni desbordamiento horizontal):

- Visor Three.js con órbita, zoom y desplazamiento (ratón y táctil), iluminación de entorno generada por código, sombras, rejilla, encuadre automático y render bajo demanda.
- Generador «Muestrario de primitivas» con 8 parámetros reales y 2 presets; nivel de detalle bajo/medio/alto.
- Modo alambre y rejilla conmutables.
- Exportar GLB (descarga real; comprobado: 34 KB, cabecera `glTF`, reimportable).
- Importar `.glb` / `.gltf` autocontenido.
- Proyectos en IndexedDB: guardar, sobrescribir, listar, abrir y borrar; persisten tras recargar.
- Estadísticas del modelo (mallas, vértices, triángulos, tamaño en metros).

## Pendiente (no implementado en esta fase)

- **Generadores de dominio**: toro, torero, caballo, plaza y escenarios. Sólo existen sus especificaciones de tipos (`domain.ts`); no hay geometría de toro todavía, por decisión de la fase.
- Texturas procedurales (portar `makeTextures` de TORERO a `CanvasTexture`) y materiales con `sheen`.
- Esqueleto, animación y poses; IK (`armIK`).
- Simulación de tela (Verlet) para capote y muleta.
- Generación en Web Worker para modelos pesados.
- Edición manual (transformar, ocultar o aislar piezas) y jerarquía visible en la interfaz.
- **Publicación en GitHub Pages**: el proyecto compila con `base: './'` y funciona en cualquier subruta, pero no se ha creado el despliegue porque este repositorio ya publica otra web (la demo de la raíz) en su GitHub Pages, y un repositorio sólo tiene un sitio. Opciones: repositorio propio para ALAGARDA (recomendado) o publicar `dist/` en una subcarpeta del sitio actual.
- PWA (manifiesto y service worker para uso sin conexión en móvil).
- Archivo `LICENSE` en TORERO, GANADERIA-27 y ALAGARDA (decisión del autor) y confirmar la procedencia de las fotos de GANADERIA-27.
- El paquete de producción pesa 935 KB (251 KB gzip), casi todo Three.js; se dividirá en trozos cuando crezca la aplicación.

## Siguiente fase propuesta (Fase 1: toro)

1. Portar `CAPAS`/`coat()` y las dos tablas `HORNS` como datos tipados.
2. Generador `toro.bravo` con el cuerpo esculpido de `buildBull` modulado por `MorfologiaToro` (`morf/bprof`).
3. Jerarquía de articulaciones con nombre (cadera, rodilla, pezuña, cuello, cabeza, rabo).
4. Pruebas: geometría limpia por pieza, determinismo, cada parámetro tiene efecto, GLB válido.
