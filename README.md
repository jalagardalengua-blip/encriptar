# POLICE: LIFE ON DUTY · Demo técnica web

Simulador policial de mundo abierto en 3D que se ejecuta en el navegador (WebGL 2 + Three.js), basado en el GDD «Police: Life on Duty». Funciona en ordenador, iPhone y Android. La ciudad, las texturas PBR, el cielo, el clima y el sonido se generan por código; los vehículos y las personas usan modelos gratuitos CC0 (ver «Créditos»).

## Cómo jugar

```bash
# desde la raíz del repositorio
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta un servidor HTTP local (los módulos ES no cargan con `file://`). Funciona en Chrome, Edge, Firefox y Safari recientes.

### Móvil (iPhone y Android)

- Juega en horizontal. En móvil se activan el preset gráfico «Bajo», la resolución dinámica y los controles táctiles.
- Android: al tocar la pantalla de título el juego pasa a pantalla completa y bloquea la orientación horizontal.
- iPhone: Safari no permite pantalla completa en páginas web; usa **Compartir → Añadir a pantalla de inicio** para abrirlo a pantalla completa como una app.
- Al conducir en móvil se usa un **volante táctil** (gíralo con el dedo; vuelve solo al centro). También puedes elegir joystick, botones o inclinación.
- Controles táctiles: joystick izquierdo (aparece donde toques; empujarlo al máximo hace correr), arrastrar a la derecha para la cámara, botón de acción contextual, pedales de acelerador y freno, freno de mano, y botones de luces, sirena, cámara y salir. En Ajustes → Controles puedes elegir dirección por joystick, botones o inclinación, cambiar tamaño y opacidad, y activar el modo zurdo.

Parámetros opcionales en la URL: `?q=bajo|medio|alto|ultra` fuerza la calidad gráfica.

### Controles

| A pie | Conducción | General |
|---|---|---|
| `WASD` moverse, `Shift` correr | `W/S` acelerar / frenar y marcha atrás | `Y/N` aceptar / rechazar aviso |
| Ratón: cámara (clic para capturar) | `A/D` dirección, `Espacio` freno de mano | `R` radio (pedir aviso, apoyo, ambulancia) |
| `E` interactuar / hablar | `Q` luces, `H` sirena, `J` tono de sirena | `I` redactar informe · `M` mapa táctico |
| `F` subir o bajar del coche | `C` cámara, `L` faros, `G` claxon | `1–6` opciones · `Esc` pausa · `F1` ayudas · `F2` modo foto |

También funciona con mando (gatillos para acelerar y frenar).

## Qué incluye

**Gráficos**
- Render PBR con mapas de color, rugosidad, metalicidad, normales y emisivos generados en canvas (asfalto con grietas y charcos, aceras, ladrillo, revoco mediterráneo con persianas, muros cortina de vidrio, naves industriales y escaparates).
- Cielo físico (dispersión de Rayleigh y Mie), ciclo día/noche, luna, estrellas, nubes procedurales e iluminación IBL que se regenera con la hora (incluido el resplandor nocturno de la ciudad).
- Clima dinámico: despejado, nublado, lluvia, tormenta con relámpagos y niebla. Con lluvia el asfalto se moja, aparecen charcos que reflejan el entorno, salpicaduras y gotas en la lente.
- Postprocesado: oclusión ambiental GTAO, bloom HDR, tonemapping ACES, SMAA, enfoque (sharpen), desenfoque radial por velocidad, aberración cromática, viñeta, grano y gradación de color.
- Halos en farolas y luces de vehículos, y reflejos alargados de faros, pilotos, balizas y farolas sobre el asfalto mojado (calculados en GPU).
- Sombras dinámicas del sol y de la luna, faros que proyectan sombra, haces volumétricos de farolas y faros, sombras de contacto, marcas de frenada, humo de neumáticos y chispas.

**Mundo**
- Ciudad de 7×7 manzanas con distritos (centro financiero, ensanche residencial, zona de ocio con neones, polígono industrial, puerto con contenedores y grúas, parque, comisaría y hospital).
- Tráfico con IA: carriles, semáforos sincronizados, distancia de seguridad, cambio de carril, coches que se apartan al oír la sirena y claxon si les bloqueas.
- Peatones animados que esquivan vehículos.

**Comisaría jugable**
- Entra por la puerta principal: recepción, calabozos (aparecen tus detenidos), vestuarios para cambiar de uniforme, garaje para elegir turismo, todoterreno o furgón, sala de operaciones con terminal (expediente e informes pendientes) y despacho de la comisaria (valoración y fin de turno).

**Modos**
- Carrera, Patrulla libre y **Mundo libre** (explora la ciudad sin avisos automáticos; pide uno por radio cuando quieras).

**Audio**
- Música adaptativa generada en tiempo real (menú, patrulla, persecución e interior), pasos, ruido de rodadura y viento, cambios de marcha, petardeo, lluvia sobre el techo y ambiente urbano (claxon lejano, sirenas, pájaros, perros).

**Juego (del GDD)**
- Bucle completo: patrulla → aviso de la central → intervención → informe → evaluación.
- Misiones: M-01 Accidente urbano, M-02 Conducción peligrosa / control de tráfico, M-03 Hurto en comercio, M-04 Alteración vecinal y M-09 Persecución de un vehículo sustraído.
- Rueda de interacción contextual, diálogos con decisiones, pruebas y declaraciones, consultas por radio, alcoholemia, detenciones con traslado a comisaría, ambulancias y unidades de apoyo.
- Evaluación por seguridad, legalidad, resolución, comunicación e informe, con consecuencias, experiencia y rangos. El progreso se guarda en el navegador.
- Radio con voz sintetizada en español, sirenas europeas bitonales, motor, lluvia y ambiente urbano sintetizados con WebAudio.

## Publicar en GitHub Pages

El repositorio incluye el flujo `.github/workflows/pages.yml`, que en cada push comprueba el código (`node tools/check.mjs`) y publica el juego.

1. En GitHub, ve a **Settings → Pages** del repositorio.
2. En **Build and deployment → Source**, elige **GitHub Actions** (sólo hay que hacerlo una vez).
3. Ve a la pestaña **Actions**, abre «Publicar en GitHub Pages» y pulsa **Run workflow** (o haz cualquier push).
4. Al terminar, el juego queda en `https://<usuario>.github.io/<repositorio>/`; en este repositorio: **https://jalagardalengua-blip.github.io/encriptar/**

Comprobación local antes de subir cambios:

```bash
node tools/check.mjs   # sintaxis de JS, imports, modelos e iconos (rutas sensibles a mayúsculas)
```

## Créditos de modelos 3D

| Elemento | Fuente | Licencia |
|---|---|---|
| Vehículos (patrulla, turismo, todoterreno, taxi, furgoneta, pick-up, ambulancia) | Kenney · «Car Kit» (kenney.nl) | CC0 1.0 |
| Personas animadas (agente, civiles) | Quaternius · «Ultimate Animated Character Pack» (quaternius.com) | CC0 1.0 |

Los modelos se optimizaron con glTF-Transform (cuantización + compresión meshopt) y están en `assets/`. Los vehículos se reescalan a medidas reales y reciben materiales PBR propios; los personajes se recolorean por prenda.

## Estructura

```
index.html          HUD, menús y estilos
src/main.js         bucle de juego, cámara, jugador, despacho
src/city.js         generación de la ciudad y colisiones
src/textures.js     texturas PBR procedurales
src/environment.js  cielo, sol/luna, nubes, clima, IBL
src/post.js         postprocesado
src/vehicles.js     modelos de coche, física, IA de tráfico
src/people.js       esqueleto procedural, multitudes, PNJ
src/missions.js     avisos y misiones
src/hud.js          minimapa, radio, diálogos, informe
src/audio.js        audio sintetizado
src/fx.js           partículas, marcas, balizas
src/assets.js       carga y adaptación de modelos glTF
src/station.js      interior de la comisaría
src/ui.css          estilos de menús, HUD y controles táctiles
assets/             modelos .glb e iconos
vendor/three/       Three.js r170 (licencia MIT)
```
