# De foto a toro 3D

## Cómo funciona (pestaña «Foto»)

Todo ocurre en el navegador, sin servidores ni IA de pago, también en el móvil.

1. **Recorte** (`src/engine/photo/segment.ts`): agrupa los colores de la foto en CIELAB (k-means), da por fondo los grupos que dominan el borde (arena, cielo, campo), limpia la máscara y se queda con la región tocada. Se corrige con un toque sobre el toro, el número de grupos de color y un pincel para añadir o quitar.
2. **Ajuste por análisis por síntesis** (`fit.ts`, `silhouette.ts`): genera la forma del toro, la proyecta con una cámara ortográfica, la compara con la silueta de la foto (error ponderado por la distancia al borde) y mejora proporciones (longitud, alzada, patas, morrillo, perímetro, papada, largo de astas), lado, giro y elevación de la cámara, postura y encornadura. Unas 330 evaluaciones, 3-4 s.
3. **Capa** (`capa.ts`): luminosidad, tono y proporción de pelo claro/oscuro del cuerpo; si lo claro forma manchas (berrendo) o va mezclado (cárdeno, salinero). También detecta patas blancas (calcetero).
4. **Foto como textura** (`projector.ts`): al hornear el pelaje, cada punto visible del modelo toma el color de la foto; las caras ocultas usan el lado simétrico; se compensa la luz de la foto para no sombrear dos veces. Lo que la foto no ve conserva la capa procedural.

El resultado son parámetros normales del generador: se pueden retocar, guardar en un proyecto y exportar a GLB (la textura de la foto va dentro del GLB; la foto en sí no se guarda en el proyecto).

## Resultados medidos

- Toro sintético de parámetros conocidos: recupera lado, giro, longitud y alzada (error < 0,07) con más de 90 % de coincidencia de silueta (prueba automática `tests/photo.test.ts`).
- Foto renderizada de un Miura colorado humillando: 87 % de coincidencia, postura y encornadura correctas, proporciones con error < 0,05, en 3,8 s (Chromium).

## Límites

- Funciona bien con fotos **de perfil o de tres cuartos y el animal entero**. De frente o en primer plano no hay silueta que ajustar.
- El resultado es el toro del generador parecido a la foto, no una copia exacta: el modelo no puede tener formas que el generador no sepa hacer.
- Fondos del mismo color que el toro, sombras pegadas o personas delante obligan a corregir el recorte con el pincel.
- Una sola foto no muestra el otro lado: se supone simétrico.

## Modo de máxima calidad con IA (pendiente: requiere GPU)

La reconstrucción con IA de una foto a malla texturizada necesita modelos que se ejecutan en una tarjeta gráfica:

| Modelo | Licencia | GPU | Nota |
|---|---|---|---|
| TRELLIS.2 (Microsoft) | MIT | NVIDIA ~24 GB | El más recomendable por calidad y licencia |
| TRELLIS (Microsoft) | MIT | NVIDIA ~16 GB | Menos calidad |
| TripoSR / TripoSG | MIT | menos | Calidad menor; TripoSG sin textura |
| Hunyuan3D 2.x (Tencent) | Comunidad Tencent | — | **Excluye la UE, el Reino Unido y Corea del Sur**: no utilizable desde España |

Diseño previsto: un servidor local (Python) en el ordenador con GPU que recibe la foto y devuelve un GLB; ALAGARDA lo importa y permite combinarlo con el generador (por ejemplo, usar la malla de IA como referencia de forma). No se ha implementado porque no hay GPU disponible para probarlo; se hará cuando exista.
