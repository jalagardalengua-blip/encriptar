# CAPÍTULO 01 · LA ENCOMIENDA

**Fechas:** sábado 8 – domingo 9 de marzo
**Misiones principales:** M01 El regreso · M02 Ojo de mayoral · M03 La oferta
**Escenas:** 8 (C01_E001 – C01_E008)
**Duración estimada de cinemáticas:** 24–27 min · **Juego total del capítulo:** 60–75 min

## Resumen narrativo

Alejandro Galván conduce desde Madrid para enterrar a su padre, al que lleva cuatro años sin ver. Llega tarde al cementerio de Peñacorva y sin corbata. Manuel, el mayoral que le crio a medias, le recibe con la misma ironía de siempre y con algo nuevo: un reproche que no termina de decir. En el entierro aparece Ricardo Valcárcel, el vecino poderoso, que da el pésame con una elegancia que suena a amenaza y deja caer que Ernesto y él tenían «cosas a medias».

En La Encomienda, Alejandro se enfrenta a la casa de su padre: un despacho lleno de cartas sin abrir y una grabadora con la última nota de campo de Ernesto, del miércoles, en la que menciona las tres llamadas que su hijo no cogió. Esa misma tarde sale con Manuel a mover las vacas y, al ayudar a Lucía Ferrer, la veterinaria, con una vaca caída, descubre dos cosas: que el campo no se le ha olvidado y que su padre había pedido que alguien mirase a Lucero porque lo veía «raro».

Por la noche, en la cocina, Manuel y Alejandro tienen la conversación que llevan cuatro años evitando y no la terminan. A la mañana siguiente, Ricardo se presenta en la finca con una carpeta: la deuda de la ganadería es suya y Ernesto le firmó una opción de compra sobre la finca, el ganado y el hierro. Vence el 21 de septiembre. Manuel tampoco lo sabía.

Al atardecer, ante el cercado del toro que mató a su padre, Alejandro recibe la llamada de Carmen Olmedo: hay una corrida apalabrada para septiembre. Seis meses, una corrida y un hierro que su padre ya había vendido. Alejandro decide que no se vende.

## Mapa de escenas

| ID | Título | Misión | Lugar | Hora | Personajes |
|---|---|---|---|---|---|
| C01_E001 | Llamadas perdidas | M01 | Coche / carretera comarcal | 9:40 | Alejandro, Manuel (teléfono) |
| C01_E002 | Tierra de Peñacorva | M01 | Cementerio de Peñacorva | 13:05 | Alejandro, Manuel, Padre Julián, Remedios, Ricardo |
| C01_E003 | La portada | M01 | Todoterreno / camino y portada de La Encomienda | 14:10 | Alejandro, Manuel |
| C01_E004 | Notas de campo | M02 | Despacho de Ernesto | 16:30 | Alejandro, Don Ernesto (grabación), Manuel |
| C01_E005 | La Tórtola | M02 | Prado Alto | 18:20 | Alejandro, Manuel, Lucía |
| C01_E006 | Patatas meneás | — | Cocina de La Encomienda | 22:30 | Alejandro, Manuel |
| C01_E007 | La luz de los llanos | M03 | Porche y patio del caserío | 10:00 (dom.) | Alejandro, Manuel, Ricardo |
| C01_E008 | Lo que vale un hierro | M03 | Cercado de Lucero | 18:50 (dom.) | Alejandro, Manuel, Carmen (mensaje de voz) |

## Jugabilidad entre escenas

- **M01 El regreso:** conducción libre los últimos 9 km hasta Peñacorva (tutorial de conducción); recorrido a pie por el pueblo hasta el cementerio; trayecto como pasajero hasta la finca.
- **M02 Ojo de mayoral:** exploración libre del caserío (coleccionable S09 n.º 1: la grabadora); tutorial de monta con Canela; arreo de las vacas del Prado Alto con Manuel (sistema de manejo de ganado); evento de la vaca caída (minijuego de asistencia veterinaria y huida).
- **M03 La oferta:** echar de comer al amanecer (tutorial de alimentación y gestión); conversación con Ricardo con dos respuestas posibles en el momento final de E007 (ver «Consecuencias»); paseo libre hasta el cercado de Lucero.

## Consecuencias narrativas del capítulo

- Se activa el **contador de la opción de compra** (196 días hasta el 21 de septiembre) y la variable `DEUDA = 1.140.000 €`.
- Se desbloquean la casa, las cuadras, el Prado Alto y el cercado de Lucero como zonas jugables.
- `LEALTAD_MANUEL` empieza en 0. En E007, si el jugador elige **«Fuera de mi casa»**, `LEALTAD_MANUEL +1` (Manuel aprueba el gesto) y `PRESTIGIO −2` (Ricardo lo cuenta por la comarca). Si elige **«Lo pensaré»**, `INTEGRIDAD −1` y Ricardo responde con la variante alternativa. Ambas ramas convergen en E008.
- `CONFIANZA_LUCIA` sube a +1 si el jugador completa el minijuego de E005 sin soltar la cola de la vaca antes de tiempo.
- Pista abierta: Lucero estaba «raro» según Ernesto (misterio n.º 1).
- Pista abierta: Ernesto ocultó la opción de compra a Manuel (misterio n.º 2).
- Pista abierta: «Lo que tiene esta finca es luz» (misterio n.º 3).
- Gancho: Carmen Olmedo y la corrida de septiembre (lleva a C04).
