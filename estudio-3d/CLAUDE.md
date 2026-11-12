# Estudio de Modelos 3D: guía para Claude

Herramienta para crear modelos 3D con esqueleto y animaciones y exportarlos a GLB. El usuario la usa para sus juegos (granja/ganadería y otros). Escribe en español con el usuario.

## Cuando el usuario pide un modelo

1. Mira si un generador existente lo cubre: `node herramientas/generar.mjs --lista`.
2. Si lo cubre, genera el GLB con los parámetros adecuados (`--preset`, colores `"#rrggbb"`, `--semilla`) y cópialo al juego que lo necesite.
3. Si no, crea un generador nuevo a partir de `src/generadores/_plantilla.js` y regístralo en `src/generadores/index.js`. Añade presets útiles.
4. Comprueba siempre:
   - `node herramientas/generar.mjs --todos modelos` y `node herramientas/validar.mjs modelos` (0 errores; el aviso `NODE_SKINNED_MESH_NON_ROOT` es esperado e inofensivo).
   - Una captura en la app (`python3 -m http.server`, Playwright con `window.__estudio.elegir(id, preset)` y `window.__estudio.pose(indiceAnimacion, fraccion)`) para revisar la forma y las animaciones.

## Cuando el usuario manda una foto

- Si la foto se parece a algo que cubre un generador (animal, persona, tractor...), elige preset, opciones y colores mirándola y genera el GLB por terminal.
- Si es algo nuevo con forma propia (un personaje concreto, un vehículo...), escribe un generador con esqueleto inspirado en la foto: así tendrá animaciones.
- Para una figura plana con la imagen como textura, el generador `relieve` funciona en la app web (no por terminal).
- Si quiere realismo: modelo por IA (Hunyuan3D/TRELLIS) o escaneo → generador `esqueleto` (auto-rig en `src/core/autorig.js`), que usa los esqueletos y animaciones de `cuadrupedo`, `humanoide` y `ave`. Si añades huesos a esos generadores, el auto-rig los aprovecha solo.

## Modelos para los juegos del usuario

Genera siempre con las opciones de juego: `--plataforma movil|pc --motor <el del juego> --lods`, y copia los archivos y el LEEME a la carpeta de modelos del juego. Para móvil, menos de 8.000 triángulos y una sola llamada de dibujo (paleta).

## Convenciones

- Metros, Y arriba, el modelo mira a +Z, apoya en y = 0. Lado `_L` = +X.
- Con esqueleto: `Modelo` (`src/core/modelo.js`), `m.hueso(nombre, padre, [x,y,z])` con posiciones absolutas en reposo y sin rotación, `m.parte(geometría, material, hueso, { suave })`.
- Material por triángulo: pasa una función `(centro, normal) => clave` (manchas, cinturones…).
- Sin esqueleto: `malla(nombre, [[geo, material]...], materiales)` y `pivote(nombre, pos)` para las partes móviles.
- Animaciones: `clip(nombre, duración, objeto, (f, P) => { P.rot(n, x, y, z); P.mov(n, x, y, z); })`; `f` va de 0 a 1 y los ciclos deben cerrar (usa `onda(f, veces)`), giros en radianes relativos al reposo. Animaciones en el sitio.
- Nombres de huesos en inglés estándar; nombres de animaciones y nodos en español sin tildes ni espacios (`Subir_pala`).
- Para doblar una extremidad colgante hacia delante: rotación X negativa. Para inclinar el tronco hacia delante: X positiva.
- Sin texturas de imagen: solo materiales PBR de color, para que funcione igual en Node y en el navegador.

## Comandos

```bash
npm install
node herramientas/generar.mjs <generador> --preset <p> [--param valor] --salida ruta.glb
node herramientas/validar.mjs <carpeta>
python3 -m http.server 8080   # app web
```
