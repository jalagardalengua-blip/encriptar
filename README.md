# POLICE: LIFE ON DUTY · Demo técnica web

Simulador policial de mundo abierto en 3D que se ejecuta en el navegador (WebGL 2 + Three.js), basado en el GDD «Police: Life on Duty». Todo el contenido (ciudad, texturas PBR, coches, personas, sonido) se genera de forma procedural en tiempo real: no hay modelos ni texturas descargados.

## Cómo jugar

```bash
# desde la raíz del repositorio
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta un servidor HTTP local (los módulos ES no cargan con `file://`). Funciona en Chrome, Edge, Firefox y Safari recientes, con un ordenador con GPU dedicada o integrada moderna. En móvil se activa el preset gráfico «Bajo» y aparecen controles táctiles.

Parámetros opcionales en la URL: `?q=bajo|medio|alto|ultra` fuerza la calidad gráfica.

### Controles

| A pie | Conducción | General |
|---|---|---|
| `WASD` moverse, `Shift` correr | `W/S` acelerar / frenar y marcha atrás | `Y/N` aceptar / rechazar aviso |
| Ratón: cámara (clic para capturar) | `A/D` dirección, `Espacio` freno de mano | `R` radio (pedir aviso, apoyo, ambulancia) |
| `E` interactuar / hablar | `Q` luces, `H` sirena, `J` tono de sirena | `I` redactar informe · `M` mapa táctico |
| `F` subir o bajar del coche | `C` cámara, `L` faros, `G` claxon | `1–6` opciones · `Esc` pausa · `F2` modo foto |

También funciona con mando (gatillos para acelerar y frenar).

## Qué incluye

**Gráficos**
- Render PBR con mapas de color, rugosidad, metalicidad, normales y emisivos generados en canvas (asfalto con grietas y charcos, aceras, ladrillo, revoco mediterráneo con persianas, muros cortina de vidrio, naves industriales y escaparates).
- Cielo físico (dispersión de Rayleigh y Mie), ciclo día/noche, luna, estrellas, nubes procedurales e iluminación IBL que se regenera con la hora (incluido el resplandor nocturno de la ciudad).
- Clima dinámico: despejado, nublado, lluvia, tormenta con relámpagos y niebla. Con lluvia el asfalto se moja, aparecen charcos que reflejan el entorno, salpicaduras y gotas en la lente.
- Postprocesado: oclusión ambiental GTAO, bloom HDR, tonemapping ACES, SMAA, aberración cromática, viñeta, grano y gradación de color.
- Sombras dinámicas del sol y de la luna, faros que proyectan sombra, haces volumétricos de farolas y faros, sombras de contacto, marcas de frenada, humo de neumáticos y chispas.

**Mundo**
- Ciudad de 7×7 manzanas con distritos (centro financiero, ensanche residencial, zona de ocio con neones, polígono industrial, puerto con contenedores y grúas, parque, comisaría y hospital).
- Tráfico con IA: carriles, semáforos sincronizados, distancia de seguridad, cambio de carril, coches que se apartan al oír la sirena y claxon si les bloqueas.
- Peatones animados que esquivan vehículos.

**Juego (del GDD)**
- Bucle completo: patrulla → aviso de la central → intervención → informe → evaluación.
- Misiones: M-01 Accidente urbano, M-02 Conducción peligrosa / control de tráfico, M-03 Hurto en comercio, M-04 Alteración vecinal y M-09 Persecución de un vehículo sustraído.
- Rueda de interacción contextual, diálogos con decisiones, pruebas y declaraciones, consultas por radio, alcoholemia, detenciones con traslado a comisaría, ambulancias y unidades de apoyo.
- Evaluación por seguridad, legalidad, resolución, comunicación e informe, con consecuencias, experiencia y rangos. El progreso se guarda en el navegador.
- Radio con voz sintetizada en español, sirenas europeas bitonales, motor, lluvia y ambiente urbano sintetizados con WebAudio.

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
vendor/three/       Three.js r170 (licencia MIT)
```
