# ALAGARDA 3D STUDIO

Software de creación y edición de modelos 3D **procedurales** para navegador de escritorio y móvil. Los modelos se generan a partir de parámetros y una semilla, se ven en un visor Three.js y se exportan a **GLB** (glTF 2.0) para Blender, motores de juego o la web.

Estado: **Fase 1** (generador de toro). Ver [`docs/ESTADO-FASE-1.md`](docs/ESTADO-FASE-1.md).

## Requisitos

Node.js 20.19+ o 22.12+ (probado con 22.23) y npm.

## Uso

```bash
cd ALAGARDA-3D-STUDIO
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run check      # tipos + lint + pruebas + compilación
npm run build      # genera dist/ (publicable en cualquier ruta, base './')
npm run preview    # sirve dist/
npm run validate:glb -- modelo.glb   # valida un GLB con el validador oficial de Khronos
```

## Qué hace hoy

- Visor 3D con órbita táctil y de ratón, sombras, rejilla, modo alambre y encuadre.
- **Generador de toro de lidia**: toro, vaca, becerro o cabestro; 12 capas, particularidades, 10 encornaduras, morfología por encaste, posturas y divisa; texturas de pelo horneadas y materiales PBR. Descarga GLB validado con el validador de Khronos.
- **De foto a toro**: subes una foto, se recorta el toro, el generador se ajusta a su silueta (proporciones, astas, postura, cámara), detecta la capa y proyecta la foto como textura. Ver [`docs/FOTO-A-3D.md`](docs/FOTO-A-3D.md).
- Generador «Muestrario de primitivas»: esfera deformable, sólido de revolución, tubo de radio variable y barrido de secciones.
- Exportación GLB e importación de `.glb`/`.gltf`.
- Proyectos guardados en el navegador (IndexedDB).

## Tecnologías

React 19 · TypeScript 6 · Vite 8 · Three.js 0.187 · Tailwind CSS 4 · Zustand 5 · idb (IndexedDB) · Vitest · ESLint. Todo de código abierto, sin servicios de pago.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): capas, flujo de datos, contrato de generador y cómo añadir generadores.
- [`docs/AUDITORIA-REUTILIZACION.md`](docs/AUDITORIA-REUTILIZACION.md): qué se aprovecha de TORERO y GANADERIA-27 y qué no.
- [`docs/LICENCIAS.md`](docs/LICENCIAS.md): licencias de dependencias y procedencia de recursos.
- [`docs/ESTADO-FASE-0.md`](docs/ESTADO-FASE-0.md) y [`docs/ESTADO-FASE-1.md`](docs/ESTADO-FASE-1.md): implementado, límites y siguientes pasos.
