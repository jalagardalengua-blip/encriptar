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


---

# C01_E001 · LLAMADAS PERDIDAS

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M01 · El regreso |
| Localización | Interior del coche de Alejandro · carretera comarcal hacia Peñacorva (Salamanca) |
| Hora del día | 9:40 · sábado 8 de marzo |
| Climatología | Sol bajo de invierno, niebla que se levanta entre las encinas, 6 °C |
| Personajes presentes | ALEJANDRO (en pantalla) · MANUEL (solo voz, por teléfono) |
| Duración estimada | 2 min 10 s |
| Tipo | Cinemática de apertura → transición a conducción jugable |

## Situación

Alejandro lleva tres horas conduciendo desde Madrid sin dormir. Va con el traje negro que se compró para una boda hace dos años; la corbata, sin anudar, en el asiento del copiloto, encima de una bolsa de deporte. Tiene en el regazo un café de gasolinera frío. Ha dejado sonar el teléfono dos veces antes de esta escena. Al tercer intento de Manuel, descuelga.

## Guion

**FUNDIDO DESDE NEGRO.**

Ruido de neumáticos sobre asfalto viejo. Una carretera estrecha entre paredes de piedra. A los lados, la dehesa: encinas negras saliendo de una niebla baja que el sol empieza a deshacer.

Dentro del coche. Alejandro conduce con una mano. El móvil, en el soporte de la rejilla, vibra. En pantalla: «MANUEL». Lo mira. Lo deja sonar dos tonos más. Descuelga con el pulgar sin apartar la vista de la carretera.

**MANUEL** *(teléfono, voz por el altavoz del coche; de fondo, cucharillas y murmullo de gente)*
> ¿Por dónde vas?
`C01_E001_L001 · Emoción: cansancio contenido · Intención: tantear sin presionar · Ritmo: lento · Pausas: ninguna · FX: teléfono`

**ALEJANDRO** *(sin quitar los ojos de la carretera)*
> Acabo de dejar la autovía.
`C01_E001_L002 · Emoción: neutra, a la defensiva · Intención: dar lo mínimo · Ritmo: normal · Pausas: ninguna`

**MANUEL**
> [exhales] Eso no es un sitio.
`C01_E001_L003 · Emoción: ironía seca · Intención: hacerle ver que se escaquea · Ritmo: lento · Pausas: breve antes de hablar · FX: teléfono`

**ALEJANDRO**
> Pues a una hora. Menos.
`C01_E001_L004 · Emoción: impaciencia · Intención: cerrar el tema · Ritmo: rápido · Pausas: corta antes de «Menos» · FX: —`

**MANUEL**
> El entierro es a las doce.
`C01_E001_L005 · Emoción: firmeza · Intención: recordarle la obligación · Ritmo: lento · Pausas: ninguna · FX: teléfono`

**ALEJANDRO** *(aprieta el volante)*
> Ya sé a qué hora es, Manuel.
`C01_E001_L006 · Emoción: irritación · Intención: marcar distancia · Ritmo: normal, cortante · Pausas: ninguna`

Silencio en la línea. Se oye, lejos, una puerta, una mujer que dice algo que no se entiende.

**MANUEL**
> Ha venido medio pueblo a casa a velarle. Esta noche no se ha ido nadie.
`C01_E001_L007 · Emoción: tristeza tranquila · Intención: informar, y que le pese · Ritmo: lento · Pausas: breve entre frases · FX: teléfono`

**ALEJANDRO**
> ¿Y?
`C01_E001_L008 · Emoción: falsa indiferencia · Intención: no entrar · Ritmo: seco · Pausas: ninguna`

**MANUEL**
> Y nada. Que preguntan por ti.
`C01_E001_L009 · Emoción: neutra · Intención: dejar caer el peso · Ritmo: lento · Pausas: tras «nada» · FX: teléfono`

**ALEJANDRO**
> ¿Y qué les dices?
`C01_E001_L010 · Emoción: curiosidad que no quiere mostrar · Intención: saber qué piensan de él · Ritmo: normal · Pausas: ninguna`

**MANUEL**
> Que estás de camino. [short pause] Llevo dos días diciéndolo.
`C01_E001_L011 · Emoción: reproche contenido · Intención: herir un poco · Ritmo: lento · Pausas: la marcada · FX: teléfono`

Alejandro tensa la mandíbula. Adelanta a un tractor sin necesidad.

**ALEJANDRO**
> Me enteré el jueves por la noche. ¿Qué querías, que viniera andando?
`C01_E001_L012 · Emoción: rabia defensiva · Intención: contraatacar · Ritmo: rápido · Pausas: ninguna`

**MANUEL**
> Te llamé el jueves a las siete de la mañana.
`C01_E001_L013 · Emoción: calma dura · Intención: corregirle con un hecho · Ritmo: lento · Pausas: ninguna · FX: teléfono`

**ALEJANDRO**
> Estaba trabajando.
`C01_E001_L014 · Emoción: excusa que sabe débil · Intención: defenderse · Ritmo: normal, baja al final · Pausas: ninguna`

**MANUEL**
> Y tu padre te llamó el miércoles… ¿También estabas trabajando?
`C01_E001_L015 · Emoción: dolor convertido en reproche · Intención: decir lo que lleva dos días callando · Ritmo: lento · Pausas: silencio de 2 s antes de empezar (en montaje); suspensión tras «miércoles» · FX: teléfono`

Alejandro no contesta. Los dedos le blanquean en el volante. Por la ventanilla pasa un cartel oxidado, ilegible por el sol, con la silueta de un toro.

Silencio largo. Cuatro segundos.

**ALEJANDRO** *(muy bajo)*
> ¿Cómo fue?
`C01_E001_L016 · Emoción: miedo · Intención: preguntar lo que no quiere saber · Ritmo: lento, casi susurrado · Pausas: precedida de 4 s de silencio`

**MANUEL**
> Eso no se cuenta por teléfono.
`C01_E001_L017 · Emoción: ternura áspera · Intención: protegerle · Ritmo: lento · Pausas: ninguna · FX: teléfono`

**ALEJANDRO**
> Manuel.
`C01_E001_L018 · Emoción: súplica dura · Intención: exigir · Ritmo: seco · Pausas: ninguna`

**MANUEL**
> Que no, chaval. Tú conduce. [short pause] Y ponte la corbata antes de llegar, que te conozco.
`C01_E001_L019 · Emoción: cariño escondido en una orden · Intención: cerrar y cuidarle · Ritmo: lento, se suaviza al final · Pausas: la marcada · FX: teléfono`

Clic. Manuel cuelga.

En la pantalla del móvil vuelve a aparecer el registro de llamadas. Alejandro lo mira un segundo: «Papá — 3 llamadas perdidas — miércoles». Lo aparta con el pulgar.

Mira la corbata en el asiento de al lado. La coge. La deja caer en el asiento de atrás.

**ALEJANDRO** *(para sí, sin voz casi)*
> Joder, papá.
`C01_E001_L020 · Emoción: culpa · Intención: ninguna, se le escapa · Ritmo: muy lento · Pausas: ninguna`

La carretera corona una loma. Abajo, entre la niebla que se levanta, aparece Peñacorva: la espadaña de la iglesia, los tejados, los nidos de cigüeña.

**CONTROL AL JUGADOR.** Objetivo: «Llega a Peñacorva».

## Indicaciones de interpretación (resumen de dirección)

- La escena es una conversación entre dos hombres que se quieren y no saben decírselo. Ninguno sube el volumen.
- Manuel habla desde la casa llena de gente: baja la voz como quien se ha apartado a un pasillo.
- El «¿Cómo fue?» es el único momento en que Alejandro se rompe; inmediatamente se recompone.
- El «Joder, papá» no es llanto. Es casi un reproche al muerto.

## Sonido ambiente

- Neumáticos sobre asfalto rugoso, viento en la goma de la ventanilla del conductor (no cierra bien).
- Intermitente al adelantar al tractor; motor del tractor en paso (doppler).
- En la línea de Manuel: murmullo de velatorio, tazas, una puerta, la voz lejana de una mujer, un reloj de pared.
- Al coronar la loma: campanas lejanas de Peñacorva tocando a muerto (tres toques lentos).
- Sin música hasta el plano final; entra entonces el tema principal (guitarra y cuerdas graves) en *pianissimo*.

## Transición

Corte a plano general aéreo de Peñacorva bajo la niebla → control al jugador → la conducción termina al aparcar en la plaza; fundido a C01_E002 cuando el jugador cruza la verja del cementerio.

## Consecuencias narrativas

- El jugador conoce el reproche central de la campaña: las tres llamadas perdidas del miércoles.
- La corbata queda en el asiento de atrás (continuidad: Alejandro llega al cementerio sin corbata).
- Se establece la dinámica Alejandro–Manuel: cariño, reproche, evasión.

---

# C01_E002 · TIERRA DE PEÑACORVA

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M01 · El regreso |
| Localización | Cementerio de Peñacorva · pasillo de nichos del muro norte y puerta de entrada |
| Hora del día | 13:05 · sábado 8 de marzo |
| Climatología | Cielo cubierto alto, luz blanca sin sombras, viento flojo que mueve los cipreses, 11 °C |
| Personajes presentes | ALEJANDRO · MANUEL · PADRE JULIÁN · REMEDIOS · RICARDO VALCÁRCEL · vecinos (figuración, 40–50 personas) · dos operarios del cementerio |
| Duración estimada | 3 min 40 s |
| Tipo | Cinemática |

## Situación

El funeral en la iglesia ha terminado. Alejandro ha llegado a la iglesia con la misa empezada y se ha quedado de pie al fondo, sin acercarse; ha salido el primero. Ahora la comitiva está en el cementerio, ante el nicho de la familia Galván, en el muro norte. El féretro ya está en la plataforma elevadora. Alejandro se coloca junto a Manuel. Todo el pueblo le mira y nadie le dice nada.

## Guion

Grava bajo los zapatos. Alejandro cruza la verja oxidada. Al fondo, ante el muro de nichos, cincuenta personas de negro y gris. Se vuelven algunas cabezas. Una mujer le da un codazo discreto a otra.

Alejandro avanza por el pasillo. La gente se aparta sin que nadie lo pida. Llega junto a Manuel, que está en primera fila con el sombrero en las manos. Manuel no le mira.

El Padre Julián, con estola morada sobre el abrigo, termina la oración. Tiene la voz de un hombre que ha enterrado a medio pueblo y a muchos amigos.

**PADRE JULIÁN**
> Concédele, Señor, el descanso eterno.
`C01_E002_L001 · Emoción: pena serena · Intención: rito, y despedida de un amigo · Ritmo: lento, litúrgico · Pausas: ninguna · FX: exterior`

*(Los vecinos responden a coro, en murmullo: «Y brille para él la luz perpetua». Grabación de grupo, no ElevenLabs.)*

**PADRE JULIÁN**
> Descanse en paz.
`C01_E002_L002 · Emoción: pena serena · Intención: cerrar el rito · Ritmo: lento · Pausas: ninguna · FX: exterior`

*(Coro: «Amén».)*

Los operarios empujan el féretro dentro del nicho. El roce de la madera contra el cemento. Uno de ellos coge la paleta y la masa.

Manuel, sin girar la cabeza, mira de reojo el cuello abierto de la camisa de Alejandro.

**MANUEL** *(muy bajo)*
> La corbata.
`C01_E002_L003 · Emoción: reproche mínimo · Intención: hacerle saber que le ha visto · Ritmo: lento · Pausas: ninguna · FX: exterior, voz baja`

**ALEJANDRO** *(igual de bajo)*
> En el coche.
`C01_E002_L004 · Emoción: desafío · Intención: no ceder · Ritmo: seco · Pausas: ninguna · FX: exterior, voz baja`

**MANUEL**
> Claro.
`C01_E002_L005 · Emoción: ironía cansada · Intención: dar por perdida la batalla · Ritmo: lento · Pausas: ninguna · FX: exterior, voz baja`

El operario coloca el primer ladrillo. Alejandro mira la paleta, la masa, el hueco que se va cerrando. Desvía la vista hacia la gente.

**ALEJANDRO**
> ¿Quién es toda esta gente?
`C01_E002_L006 · Emoción: incomodidad · Intención: hablar de otra cosa · Ritmo: normal, bajo · Pausas: ninguna · FX: exterior, voz baja`

**MANUEL**
> Unos le debían algo a tu padre. A otros les debía él. Están mezclados, no te esfuerces.
`C01_E002_L007 · Emoción: ironía · Intención: aliviar sin sonreír · Ritmo: lento · Pausas: breve tras cada frase · FX: exterior, voz baja`

Alejandro casi sonríe. No llega.

Termina el tabique. Los operarios recogen. El grupo empieza a deshacerse en corrillos. Una mujer menuda, de abrigo negro y pelo cardado, se abre paso hasta Alejandro y le coge el antebrazo con las dos manos.

**REMEDIOS**
> Ay, hijo. [short pause] Lo siento mucho, de verdad. Es que estás igualito a él, ¿eh, Manuel? Igualito.
`C01_E002_L008 · Emoción: cariño invasivo · Intención: consolar y opinar · Ritmo: rápido · Pausas: tras «hijo» · FX: exterior`

**MANUEL**
> Más quisiera.
`C01_E002_L009 · Emoción: humor seco · Intención: pinchar a Alejandro · Ritmo: lento · Pausas: ninguna · FX: exterior`

Alejandro le mira. Manuel sigue mirando al nicho.

**REMEDIOS** *(dándole dos palmadas en el brazo)*
> Pásate por el bar, que no vas a comer de lata. ¿Me oyes? Que te conozco desde que llevabas pañales.
`C01_E002_L010 · Emoción: ternura mandona · Intención: cuidarle a su manera · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> Gracias, Remedios.
`C01_E002_L011 · Emoción: educación cansada · Intención: despedirla · Ritmo: normal · Pausas: ninguna · FX: exterior`

Remedios se va. Entre los corrillos, alguien se acerca sin prisa por el pasillo de grava: un hombre alto, pelo plateado peinado hacia atrás, abrigo azul marino abierto sobre un traje gris marengo. Lleva las gafas de sol en la mano. La gente le saluda con un respeto distinto: menos cariño, más cuidado.

**RICARDO**
> Alejandro. Ricardo Valcárcel. No sé si te acuerdas de mí.
`C01_E002_L012 · Emoción: cordialidad medida · Intención: presentarse como alguien importante sin decirlo · Ritmo: pausado · Pausas: breve tras el nombre de Alejandro · FX: exterior`

**ALEJANDRO**
> Los Arenales.
`C01_E002_L013 · Emoción: desconfianza · Intención: dejar claro que sabe quién es · Ritmo: seco · Pausas: ninguna · FX: exterior`

**RICARDO** *(sonríe con los labios cerrados)*
> Eso es. Tendrías… ¿catorce años? Viniste con tu padre a una tienta en mi casa. Te volteó una becerra y no lloraste. [short pause] Me acuerdo porque tu padre estaba más orgulloso de eso que de la becerra.
`C01_E002_L014 · Emoción: nostalgia calculada · Intención: crear intimidad, mostrar que lo sabe todo · Ritmo: pausado, con placer en contar · Pausas: tras «años» y antes de la última frase · FX: exterior`

**ALEJANDRO**
> No me acuerdo.
`C01_E002_L015 · Emoción: frialdad · Intención: negarle la intimidad · Ritmo: seco · Pausas: ninguna · FX: exterior`

**RICARDO**
> Normal. Eras un crío. [short pause] Lo siento mucho. Tu padre era un hombre difícil, y en este oficio eso es casi un elogio.
`C01_E002_L016 · Emoción: pésame sincero en apariencia · Intención: halagar al muerto para ganarse al vivo · Ritmo: pausado · Pausas: la marcada · FX: exterior`

Ricardo se vuelve hacia Manuel y le tiende la mano. Manuel tarda un segundo de más en dársela.

**MANUEL**
> Gracias por venir, don Ricardo.
`C01_E002_L017 · Emoción: desprecio educado · Intención: cumplir y nada más · Ritmo: lento · Pausas: ninguna · FX: exterior`

**RICARDO**
> Manuel.
`C01_E002_L018 · Emoción: cortesía fría · Intención: reconocerle sin concederle nada · Ritmo: lento · Pausas: ninguna · FX: exterior`

Ricardo vuelve a mirar a Alejandro. Baja un poco la voz, como quien hace un favor.

**RICARDO**
> No es el momento, ya lo sé. Pero tu padre y yo dejamos algunas cosas a medias. Me pasaré por la finca. Cuando tú me digas.
`C01_E002_L019 · Emoción: discreción calculada · Intención: plantar la semilla · Ritmo: pausado, más bajo · Pausas: tras «ya lo sé» · FX: exterior, voz baja`

**ALEJANDRO**
> ¿Qué cosas?
`C01_E002_L020 · Emoción: alarma · Intención: exigir · Ritmo: rápido · Pausas: ninguna · FX: exterior`

Ricardo le pone la mano en el hombro, un segundo. Alejandro no se mueve.

**RICARDO**
> Entierra a tu padre. Lo demás puede esperar.
`C01_E002_L021 · Emoción: falsa ternura · Intención: cerrar la puerta en su cara con elegancia · Ritmo: lento · Pausas: breve entre frases · FX: exterior`

Se pone las gafas de sol y se aleja hacia la verja. Saluda a dos hombres con un gesto. Un chófer le espera junto a un todoterreno negro.

Manuel saca la petaca de tabaco y empieza a liar un cigarro con calma.

**ALEJANDRO**
> ¿Qué dejó mi padre a medias con ese?
`C01_E002_L022 · Emoción: inquietud con rabia · Intención: obtener respuesta ya · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**MANUEL**
> Aquí no.
`C01_E002_L023 · Emoción: firmeza · Intención: aplazar · Ritmo: lento · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> Todo es «aquí no» contigo. «Por teléfono no». «Aquí no».
`C01_E002_L024 · Emoción: frustración · Intención: acorralarle · Ritmo: rápido, imitándole en las citas · Pausas: ninguna · FX: exterior`

**MANUEL** *(enciende el cigarro, suelta el humo)*
> [exhales] Es que eliges fatal los sitios. [short pause] Vámonos a casa.
`C01_E002_L025 · Emoción: humor seco y cansancio · Intención: ganar la discusión sin pelearla · Ritmo: lento · Pausas: la marcada · FX: exterior`

Manuel echa a andar hacia la salida. Alejandro mira una última vez el nicho. El cemento fresco, todavía oscuro. Ni una letra todavía. Le sigue.

## Indicaciones de interpretación

- Todo el diálogo entre Manuel y Alejandro junto al nicho se dice en voz baja, casi sin mover los labios. Están en un entierro.
- Ricardo nunca tiene prisa. Cada frase la ha pensado antes. Cuando pone la mano en el hombro de Alejandro, es exactamente un segundo.
- Remedios es el único color de la escena: habla un poco más alto de lo adecuado y no se da cuenta.
- Manuel no mira a Alejandro en toda la escena hasta el último plano.

## Sonido ambiente

- Viento en los cipreses (susurro continuo). Grava. Un perro ladrando lejos, en el pueblo.
- Murmullo de grupo, toses, algún sollozo contenido (figuración: walla castellana rural, sin palabras inteligibles salvo el «Amén»).
- Paleta raspando la masa, ladrillo asentándose (en primer plano sonoro, deliberadamente incómodo).
- Motor del todoterreno de Ricardo arrancando fuera de la verja.
- Cigüeñas crotorando desde la espadaña de la iglesia.

## Transición

Corte a negro breve con el sonido del mechero de Manuel → C01_E003 abre con el portazo del todoterreno.

## Consecuencias narrativas

- Primera aparición de Ricardo; el jugador lo identifica como amenaza educada.
- Se planta la frase «cosas a medias».
- Remedios queda establecida como contacto del pueblo (misión secundaria S05).
- Se establece el chiste interno «aquí no» / «por teléfono no» de Manuel.

---

# C01_E003 · LA PORTADA

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M01 · El regreso |
| Localización | Interior del todoterreno de Manuel · camino de tierra a La Encomienda · portada de la finca |
| Hora del día | 14:10 · sábado 8 de marzo |
| Climatología | Cubierto con claros; un rayo de sol entra y sale entre las nubes. 12 °C. Charcos en las rodadas del camino. |
| Personajes presentes | ALEJANDRO · MANUEL |
| Duración estimada | 3 min 20 s |
| Tipo | Cinemática con momento interactivo (abrir la cancela) |

## Situación

Alejandro ha dejado su coche en la plaza («luego te lo sube Toño», le ha dicho Manuel). Van los dos en el todoterreno de Manuel por el camino de tierra de 4,5 km. Manuel conduce despacio, esquivando baches que se sabe de memoria. Se ha quitado la corbata y la lleva enrollada en el bolsillo de la chaqueta. Alejandro va con la ventanilla bajada a pesar del frío.

## Guion

El todoterreno da tumbos por el camino. Barro seco en el salpicadero, una garrocha corta atravesada en el asiento de atrás, un cencerro sin badajo colgando del retrovisor.

Alejandro mira la dehesa. Una piara de cerdos negros hozando bajo las encinas de la finca vecina. Un milano. Las paredes de piedra.

**ALEJANDRO**
> Lo han arreglado.
`C01_E003_L001 · Emoción: sorpresa leve · Intención: romper el silencio · Ritmo: normal · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> ¿El qué?
`C01_E003_L002 · Emoción: neutra · Intención: obligarle a hablar · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

**ALEJANDRO**
> El camino. Antes, en el último kilómetro, te dejabas los bajos.
`C01_E003_L003 · Emoción: nostalgia que no admite · Intención: hablar de cosas · Ritmo: normal · Pausas: breve tras «camino» · FX: interior vehículo`

**MANUEL**
> Lo arregló la Diputación. Por las elecciones. [short pause] Dentro de dos años estará igual.
`C01_E003_L004 · Emoción: ironía · Intención: comentar el mundo · Ritmo: lento · Pausas: la marcada · FX: interior vehículo`

Silencio. El motor. Las ruedas sobre la grava.

**ALEJANDRO**
> Ahora no hay nadie, Manuel. Ni teléfono, ni cementerio.
`C01_E003_L005 · Emoción: decisión · Intención: exigir lo que le debe · Ritmo: lento, firme · Pausas: tras «Manuel» · FX: interior vehículo`

Manuel no contesta enseguida. Cambia de marcha. Mira al frente.

**MANUEL**
> Le encontré yo. El jueves, a las siete menos veinte. En el cercado de Lucero, al lado del pilón.
`C01_E003_L006 · Emoción: dolor seco, sin dramatismo · Intención: decirlo de una vez, como un parte · Ritmo: lento, uniforme · Pausas: breve entre frases · FX: interior vehículo`

Alejandro le mira.

**ALEJANDRO**
> ¿Con el toro?
`C01_E003_L007 · Emoción: incredulidad · Intención: entender · Ritmo: rápido · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Con el toro.
`C01_E003_L008 · Emoción: cansancio · Intención: confirmar sin añadir · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

**ALEJANDRO**
> ¿Y qué hacía de noche metido con el semental?
`C01_E003_L009 · Emoción: angustia que se vuelve enfado · Intención: buscar culpable · Ritmo: rápido · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Eso me pregunto yo cada vez que cierro los ojos.
`C01_E003_L010 · Emoción: culpa escondida · Intención: no mentir del todo · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

Manuel se toca el bigote. Un instante.

**MANUEL**
> La Guardia Civil dice que fue un accidente. El forense, también. Que se cayó, que el toro se arrancó, y ya está.
`C01_E003_L011 · Emoción: neutralidad forzada · Intención: dar la versión oficial · Ritmo: lento · Pausas: breve antes de «y ya está» · FX: interior vehículo`

**ALEJANDRO**
> ¿Y tú qué dices?
`C01_E003_L012 · Emoción: necesidad · Intención: oír la verdad de Manuel · Ritmo: normal · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Yo digo que tu padre llevaba cuarenta años entrando en ese cercado sin pedirle permiso a nadie. [short pause] Ni al toro.
`C01_E003_L013 · Emoción: orgullo y pena · Intención: honrarle y esquivar · Ritmo: lento · Pausas: la marcada · FX: interior vehículo`

La portada aparece al final del camino: los dos pilares de granito, el arco de forja con el hierro, la cancela verde con la pintura saltada. Manuel frena delante de la rejilla.

Mira a Alejandro. Espera.

Alejandro entiende. Resopla. Se baja.

**INTERACCIÓN:** el jugador abre la cancela (empujar las dos hojas, enganchar el cerrojo de suelo). Si tarda más de 15 segundos, Manuel toca el claxon una vez.

Alejandro abre la cancela. El hierro chirría como siempre ha chirriado. Mira arriba: la «E», la «G», la media luna. Se queda un segundo de más.

El todoterreno pasa. Alejandro cierra y vuelve a subir.

**MANUEL**
> Mira, eso no se te ha olvidado.
`C01_E003_L014 · Emoción: ternura escondida · Intención: darle algo · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

**ALEJANDRO**
> Abrir una puerta. Qué mérito.
`C01_E003_L015 · Emoción: sarcasmo · Intención: rechazar el elogio · Ritmo: seco · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> No sabes la de gente que no sabe.
`C01_E003_L016 · Emoción: humor de campo · Intención: insistir sin insistir · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

Avanzan por el camino del encinar. Entre los troncos se ven, lejos, unas siluetas cárdenas: vacas.

**ALEJANDRO**
> ¿Y el toro?
`C01_E003_L017 · Emoción: frialdad · Intención: saber · Ritmo: normal · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Ahí está. Comiendo. Como si nada.
`C01_E003_L018 · Emoción: algo parecido al rencor · Intención: informar · Ritmo: lento · Pausas: breves entre frases · FX: interior vehículo`

**ALEJANDRO**
> Pues habrá que matarlo.
`C01_E003_L019 · Emoción: rabia fría · Intención: castigar a alguien · Ritmo: seco · Pausas: ninguna · FX: interior vehículo`

Manuel frena en seco. El cencerro del retrovisor golpea el cristal. Se vuelve despacio.

**MANUEL**
> Repite eso.
`C01_E003_L020 · Emoción: indignación controlada · Intención: darle la oportunidad de retirarlo · Ritmo: muy lento · Pausas: ninguna · FX: interior vehículo`

**ALEJANDRO**
> Ha matado a mi padre, Manuel.
`C01_E003_L021 · Emoción: dolor que se vuelve grito sin gritar · Intención: justificarse · Ritmo: normal, se quiebra al final · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Ese toro es lo único que tenía tu padre que valiera más que sus deudas. [short pause] Y mira que eso ya es decir.
`C01_E003_L022 · Emoción: dureza · Intención: poner los pies en la tierra, y se le escapa el dato · Ritmo: lento · Pausas: la marcada · FX: interior vehículo`

Alejandro se queda quieto.

**ALEJANDRO**
> ¿Qué deudas?
`C01_E003_L023 · Emoción: alarma · Intención: agarrarse al dato · Ritmo: rápido · Pausas: ninguna · FX: interior vehículo`

Manuel mete primera. Arranca.

**MANUEL**
> Mañana.
`C01_E003_L024 · Emoción: cansancio · Intención: aplazar · Ritmo: lento · Pausas: ninguna · FX: interior vehículo`

**ALEJANDRO**
> Otra vez.
`C01_E003_L025 · Emoción: exasperación · Intención: reprochar · Ritmo: seco · Pausas: ninguna · FX: interior vehículo`

**MANUEL**
> Hoy has enterrado a tu padre, Alejandro. Un día. [short pause] Dale un día.
`C01_E003_L026 · Emoción: ternura dura · Intención: proteger, y pedirle algo por primera vez · Ritmo: lento · Pausas: breve tras «Un día» · FX: interior vehículo`

Alejandro mira por la ventanilla. Al fondo del camino aparece el caserío: el porche de piedra, la parra seca, las cuadras encaladas. Una yegua castaña asoma la cabeza por la puerta de un box.

Alejandro la reconoce. No dice nada. Se le mueve algo en la cara.

## Indicaciones de interpretación

- Manuel cuenta la muerte como un parte de trabajo. Es su manera de poder contarla. El tocarse el bigote (miente por omisión) tiene que verse.
- «Pues habrá que matarlo» es impulsivo e injusto: Alejandro lo sabe en cuanto lo dice, pero no lo va a admitir.
- «Dale un día» es la primera vez que Manuel pide algo. Su voz baja medio tono.

## Sonido ambiente

- Motor diésel viejo, chasis que cruje, grava y charcos. Cencerro sin badajo golpeando contra el retrovisor en cada bache.
- Exterior al abrir la cancela: chirrido largo de bisagras oxidadas, cerrojo de suelo sobre piedra, cencerros lejanos de cabestros, un milano.
- Frenazo: grava arrastrada, cencerro contra el cristal.
- Final: relincho corto de Canela.

## Transición

Plano de la yegua → corte a C01_E004 en el interior oscuro del despacho, el sonido de una persiana de madera al abrirse.

## Consecuencias narrativas

- El jugador sabe dónde y cuándo murió Ernesto, y la versión oficial.
- Primera mención de las deudas.
- Primera señal de que Manuel calla algo (gesto del bigote).
- Canela aparece: se desbloquea la misión secundaria S02.

---

# C01_E004 · NOTAS DE CAMPO

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M02 · Ojo de mayoral |
| Localización | Despacho de Ernesto, planta baja de la casa principal, ala este |
| Hora del día | 16:30 · sábado 8 de marzo |
| Climatología | Interior. Luz fría lateral de una sola ventana honda; polvo en suspensión. Fuera, cubierto. |
| Personajes presentes | ALEJANDRO · DON ERNESTO (solo voz, grabación) · MANUEL (entra al final) |
| Duración estimada | 3 min 30 s (incluye exploración guiada) |
| Tipo | Exploración libre con cinemática disparada al usar la grabadora |

## Situación

Alejandro lleva una hora en la casa. Ha subido la bolsa a su antiguo cuarto, que su padre no tocó: pósteres despegándose, una garrocha de juguete, un trofeo de un concurso escolar de dibujo. Ha bajado. Ha evitado el despacho dos veces. Ahora entra. Se ha quitado la chaqueta del traje; lleva la camisa remangada.

## Guion

La puerta cede con un chasquido. Dentro, penumbra. Alejandro cruza hasta la ventana y abre una contraventana de madera. La luz entra en diagonal, gris, y revela el cuarto: el escritorio de roble sepultado en sobres; la cabeza disecada de un toro cárdeno sobre la chimenea; fotos en blanco y negro de hombres a caballo; un sillón de cuero gastado con la forma exacta de un cuerpo grande.

**EXPLORACIÓN (jugable).** Objetos inspeccionables, cada uno con una línea interior opcional de Alejandro (no se sintetiza: es texto en pantalla para el diario del jugador):
- Sobres del banco, sin abrir, apilados por fechas.
- Una foto enmarcada: Ernesto joven con Alejandro de 9 años sobre una yegua castaña.
- Un tablón de corcho con papeles de saneamiento y un pósit: «Lucía — viernes».
- La cabeza disecada (placa ilegible: «Campanero I»).
- **La grabadora digital** plateada, junto al teléfono fijo. Al usarla, dispara la cinemática.

Alejandro coge la grabadora. Pequeña, plateada, con la goma del borde gastada. La gira. Pulsa la tecla de reproducción.

Un clic. Ruido de manipulación. Viento contra el micrófono. De fondo, cencerros.

**DON ERNESTO** *(grabación; voz al aire libre, el viento roza el micrófono)*
> Miércoles, cinco. Cercado del semental, las cinco y media de la tarde. [short pause] Lucero, número veintisiete. Come, pero poco. Se echa más de lo normal. Cojea un poco de la mano izquierda, o eso me parece a mí, que a lo mejor el que cojea soy yo.
`C01_E004_L001 · Emoción: concentración técnica, autoironía al final · Intención: nota de trabajo · Ritmo: pausado, como dictando · Pausas: tras la hora · FX: grabadora digital, exterior, viento`

Breve ruido. Ernesto se aclara la garganta.

**DON ERNESTO**
> He llamado a Lucía. Viene el viernes. [short pause] Hay que mirarle esa mano antes de que se le meta algo.
`C01_E004_L002 · Emoción: preocupación contenida · Intención: dejar constancia · Ritmo: pausado · Pausas: tras «viernes» · FX: grabadora digital, exterior`

Silencio en la grabación. Dos segundos. Viento. Un mugido lejano. Alejandro está a punto de parar la grabadora.

**DON ERNESTO** *(otro tono: más bajo, más cerca del micro, como si se hubiera dado la vuelta para que nadie le oyera)*
> [sighs] He llamado al chico. Tres veces… [chuckles] Ha salido a mí, el cabrón. No coge el teléfono cuando sabe que le van a decir algo que no quiere oír.
`C01_E004_L003 · Emoción: ternura avergonzada · Intención: hablar consigo mismo, no para el archivo · Ritmo: lento · Pausas: tras «tres veces», risa breve antes de la segunda frase · FX: grabadora digital, voz más cercana`

Pausa en la grabación.

**DON ERNESTO**
> Bueno. Mañana lo intento otra vez.
`C01_E004_L004 · Emoción: resignación · Intención: cerrar el tema · Ritmo: lento · Pausas: tras «Bueno» · FX: grabadora digital`

Clic. Fin de la grabación. La pantallita de la grabadora parpadea y se apaga.

Alejandro se queda de pie, con la grabadora en la mano. Se sienta despacio en el sillón de su padre. El cuero cede y le recibe en una forma que no es la suya.

No llora. Mira los sobres.

Coge uno. El membrete del banco. Lo gira. Mete el pulgar bajo la solapa.

Un golpe de nudillos en el marco de la puerta. Manuel, ya con ropa de campo, lleva algo doblado en el brazo: una chaqueta encerada verde oliva, vieja, con el cuello de pana gastado.

Alejandro deja el sobre, sin abrir.

**MANUEL**
> Tu padre la dejó en la cuadra. Colgada en el clavo de siempre.
`C01_E004_L005 · Emoción: pudor · Intención: dársela sin ceremonia · Ritmo: lento · Pausas: ninguna · FX: interior`

Le tiende la chaqueta. Alejandro no la coge.

**ALEJANDRO**
> ¿Has oído esto?
`C01_E004_L006 · Emoción: emoción contenida que suena a acusación · Intención: compartir y reprochar a la vez · Ritmo: normal · Pausas: ninguna · FX: interior`

Levanta la grabadora. Manuel la mira. Tarda.

**MANUEL**
> Tu padre se pasaba el día hablando con ese chisme. Yo no escucho las conversaciones de nadie.
`C01_E004_L007 · Emoción: incomodidad · Intención: no entrar · Ritmo: lento · Pausas: tras «chisme» · FX: interior`

**ALEJANDRO**
> Dice que Lucero cojeaba.
`C01_E004_L008 · Emoción: urgencia · Intención: atar cabos · Ritmo: rápido · Pausas: ninguna · FX: interior`

**MANUEL**
> Tu padre decía muchas cosas. [short pause] Y el toro, que yo vea, anda bien.
`C01_E004_L009 · Emoción: evasión · Intención: cerrar la puerta · Ritmo: lento · Pausas: la marcada · FX: interior`

Manuel deja la chaqueta sobre el respaldo de una silla.

**MANUEL**
> Voy a subir las vacas del Prado Alto, que esta noche hiela y abajo no tienen abrigo. Canela está ensillada. [short pause] Si quieres venir, vienes. Si no, también.
`C01_E004_L010 · Emoción: invitación disfrazada de indiferencia · Intención: sacarle de esa habitación · Ritmo: lento · Pausas: la marcada · FX: interior`

Manuel se va. Sus botas en el pasillo de piedra. La puerta de la calle.

Alejandro mira la chaqueta. Mira la grabadora. Se mete la grabadora en el bolsillo del pantalón.

Coge la chaqueta. Se la pone. Le queda ancha de hombros.

**CONTROL AL JUGADOR.** Objetivo: «Ve a las cuadras».

## Indicaciones de interpretación

- La grabación de Ernesto tiene dos registros: el técnico (nota de campo) y el íntimo (se le escapa). El cambio debe notarse en la cercanía al micrófono más que en el volumen.
- «Ha salido a mí, el cabrón» se dice con cariño y con orgullo, no con rabia.
- Manuel no puede quedarse en esa habitación. Habla desde el marco de la puerta y no entra del todo.
- Alejandro no dice nada al ponerse la chaqueta. El gesto es todo.

## Sonido ambiente

- Interior: silencio de casa grande vacía, reloj de pared en otra habitación, madera que cruje, contraventana de madera.
- Grabación: viento sobre micrófono pequeño, cencerros a media distancia, un mugido, roce de la mano en la carcasa de plástico, clic de inicio y fin.
- Botas de Manuel en losa de granito; puerta de entrada pesada.
- Música: entra un motivo de guitarra sola al sentarse Alejandro en el sillón (tema de Ernesto), muy bajo.

## Transición

Alejandro sale al patio con la chaqueta puesta → transición jugable a las cuadras → tutorial de monta con Canela → al llegar al Prado Alto se dispara C01_E005.

## Consecuencias narrativas

- Se obtiene el objeto clave **Grabadora de Ernesto** (coleccionable S09 n.º 1; desbloquea el sistema de grabaciones).
- **Pista:** Lucero cojeaba de la mano izquierda; Ernesto había llamado a Lucía para el viernes.
- **Pista:** Manuel evita hablar del toro.
- Continuidad: desde aquí Alejandro lleva la chaqueta verde de su padre (`WARDROBE A2`).
- El sobre del banco queda sin abrir sobre el escritorio (se abre en C02).

---

# C01_E005 · LA TÓRTOLA

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M02 · Ojo de mayoral |
| Localización | Prado Alto (ladera con afloramientos de granito y charca grande) |
| Hora del día | 18:20 → 19:00 · sábado 8 de marzo |
| Climatología | Se abren las nubes por el oeste: hora dorada, luego atardecer. Sin viento. 9 °C bajando. Vaho en los animales. |
| Personajes presentes | ALEJANDRO (a caballo, Canela) · MANUEL (a caballo, Moro) · LUCÍA (llega en su pick-up) · vacas · cabestros |
| Duración estimada | 5 min 30 s (cinemática + jugable intercalado) |
| Tipo | Jugable (arreo) → cinemática → minijuego (asistencia veterinaria) → secuencia de acción (huida) → cinemática |

## Situación

Manuel y Alejandro suben la vacada del Prado Alto hacia el cercado del encinar, más resguardado. Alejandro no monta desde hace cuatro años y se nota; Canela tampoco tiene ya prisa por nada. Manuel lleva la garrocha cruzada sobre la silla. Los cabestros abren camino con los cencerros.

## Guion

**ARREO (jugable).** El jugador conduce el ganado detrás de los cabestros. Durante el arreo se disparan estas líneas según el comportamiento:

**MANUEL** *(a voz en grito, al ganado)*
> [shouting] ¡Eeeh, vaca! ¡Vamos, vamos!
`C01_E005_L001 · Emoción: oficio · Intención: mover el ganado · Ritmo: largo, cantado · Pausas: ninguna · FX: exterior, distancia media`

**MANUEL**
> ¡Por la izquierda, que se te va la Gitanilla!
`C01_E005_L002 · Emoción: urgencia práctica · Intención: corregir a Alejandro · Ritmo: rápido · Pausas: ninguna · FX: exterior, distancia media`

**ALEJANDRO**
> ¿Cuál es la Gitanilla?
`C01_E005_L003 · Emoción: agobio · Intención: pedir ayuda sin admitirlo · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**MANUEL**
> ¡La que se te está yendo!
`C01_E005_L004 · Emoción: humor exasperado · Intención: obvio · Ritmo: rápido · Pausas: ninguna · FX: exterior, distancia media`

*(Línea de éxito, si el jugador recupera a la vaca)*

**MANUEL**
> Mira tú. Eso no ha estado mal del todo.
`C01_E005_L005 · Emoción: aprobación mínima · Intención: no regalar nada · Ritmo: lento · Pausas: tras «Mira tú» · FX: exterior`

*(Línea de fallo, si la vaca se escapa al encinar)*

**MANUEL**
> Déjala. Ya volverá cuando tenga hambre. Como otros.
`C01_E005_L006 · Emoción: ironía con dardo · Intención: pinchar · Ritmo: lento · Pausas: antes de «Como otros» · FX: exterior`

**CINEMÁTICA.** Al llegar a lo alto de la ladera, junto a la charca, Manuel levanta la mano. Alejandro frena a Canela.

Junto a un peñasco de granito hay una vaca cárdena clara tumbada sobre el pecho, con la cabeza vuelta hacia el flanco. A su lado, un becerro de horas, mojado todavía, intentando mamar sin conseguirlo.

**MANUEL**
> La Tórtola. Parió de madrugada y desde el mediodía no se levanta.
`C01_E005_L007 · Emoción: preocupación · Intención: informar · Ritmo: lento · Pausas: breve entre frases · FX: exterior`

**ALEJANDRO**
> ¿Y qué hacemos?
`C01_E005_L008 · Emoción: impulso de actuar · Intención: hacer algo · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**MANUEL**
> Nada. He llamado a Lucía.
`C01_E005_L009 · Emoción: calma · Intención: frenarle · Ritmo: lento · Pausas: tras «Nada» · FX: exterior`

**ALEJANDRO**
> ¿Quién es Lucía?
`C01_E005_L010 · Emoción: curiosidad · Intención: saber · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> La veterinaria. [short pause] Y cuando llegue, tú calladito.
`C01_E005_L011 · Emoción: advertencia con guasa · Intención: prevenirle · Ritmo: lento · Pausas: la marcada · FX: exterior`

Un motor por el camino. Una pick-up blanca con un módulo de aluminio en la caja sube dando botes por la pista del prado y frena a veinte metros. Baja una mujer joven con un mono azul marino y un chaleco verde, coleta baja. Abre el módulo trasero mientras habla, sin saludar.

**LUCÍA**
> ¿Desde cuándo está así?
`C01_E005_L012 · Emoción: concentración · Intención: diagnóstico · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**MANUEL** *(desmontando)*
> Desde el mediodía, por lo menos. Ha parido sobre las cuatro.
`C01_E005_L013 · Emoción: respeto profesional · Intención: datos · Ritmo: normal · Pausas: ninguna · FX: exterior`

Lucía saca un fonendoscopio, una bolsa de suero con un líquido transparente, un equipo de goteo. Se pone el guante largo azul hasta el hombro. Solo entonces mira a Alejandro, que sigue a caballo.

**LUCÍA**
> ¿Y tú eres…?
`C01_E005_L014 · Emoción: neutralidad · Intención: identificar · Ritmo: normal · Pausas: suspensión final · FX: exterior`

**ALEJANDRO**
> Alejandro.
`C01_E005_L015 · Emoción: neutra · Intención: responder · Ritmo: seco · Pausas: ninguna · FX: exterior`

Un segundo. Lucía cae en la cuenta.

**LUCÍA**
> Ah. [short pause] Lo siento. No he podido ir al entierro, tenía un parto complicado en Lumbrales.
`C01_E005_L016 · Emoción: incomodidad sincera · Intención: dar el pésame sin teatro · Ritmo: normal, más bajo · Pausas: tras «Ah» · FX: exterior`

**ALEJANDRO**
> No pasa nada.
`C01_E005_L017 · Emoción: cortesía · Intención: quitar importancia · Ritmo: normal · Pausas: ninguna · FX: exterior`

**LUCÍA**
> Sí pasa, pero es lo que hay. [short pause] Bájate, que te necesito.
`C01_E005_L018 · Emoción: sequedad franca · Intención: ponerle a trabajar · Ritmo: rápido · Pausas: la marcada · FX: exterior`

Alejandro desmonta. Lucía se arrodilla junto a la vaca, que gira la cabeza hacia ella, cansada. Le pone el fonendo en el costado.

**LUCÍA**
> Está fría y tiene el corazón flojo. Hipocalcemia. Fiebre de la leche. Se ha quedado sin calcio al parir.
`C01_E005_L019 · Emoción: concentración · Intención: diagnosticar en voz alta (para Manuel) · Ritmo: rápido, entrecortado · Pausas: breve entre frases · FX: exterior`

**MANUEL**
> En bravo no se ve casi.
`C01_E005_L020 · Emoción: extrañeza · Intención: cuestionar con respeto · Ritmo: lento · Pausas: ninguna · FX: exterior`

**LUCÍA**
> Casi. [short pause] Tú sujétame la cola.
`C01_E005_L021 · Emoción: humor seco · Intención: zanjar y ordenar · Ritmo: rápido · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> ¿Yo?
`C01_E005_L022 · Emoción: sorpresa · Intención: confirmar · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**LUCÍA**
> La cola. De la vaca. Que no me dé con ella en la cara mientras le pincho la vena.
`C01_E005_L023 · Emoción: paciencia mínima · Intención: explicar lo obvio · Ritmo: rápido, separando las partes · Pausas: breve tras «La cola» · FX: exterior`

**MINIJUEGO (jugable).** El jugador sujeta la cola (mantener pulsado / mantener el dedo) mientras Lucía canaliza la yugular y pasa el calcio gota a gota. La vaca se agita a intervalos; hay que aguantar sin tirar. Lucía comenta:

**LUCÍA** *(si el jugador aguanta bien)*
> Así. Muy bien. No tires, solo sujeta.
`C01_E005_L024 · Emoción: aprobación profesional · Intención: guiar · Ritmo: tranquilo · Pausas: breve entre frases · FX: exterior`

**LUCÍA** *(si el jugador suelta)*
> ¡Que no la sueltes! [exhales] Venga, otra vez.
`C01_E005_L025 · Emoción: irritación breve · Intención: corregir · Ritmo: rápido · Pausas: tras la exclamación · FX: exterior`

**CINEMÁTICA.** El suero baja. La vaca respira hondo. Mueve las orejas. Lucía retira la aguja y aprieta con el pulgar.

**LUCÍA** *(sin cambiar el tono)*
> Manuel, coge al becerro. Y tú, suelta la cola despacio y vete andando hacia la camioneta.
`C01_E005_L026 · Emoción: calma deliberada · Intención: evitar el pánico · Ritmo: lento, muy controlado · Pausas: tras «becerro» · FX: exterior`

**ALEJANDRO**
> ¿Por qué?
`C01_E005_L027 · Emoción: confusión · Intención: entender · Ritmo: normal · Pausas: ninguna · FX: exterior`

La vaca encoge las patas traseras. Lucía ya se está levantando.

**LUCÍA**
> Porque es brava. Y se va a levantar. [short pause] Andando he dicho, no corriendo.
`C01_E005_L028 · Emoción: urgencia contenida · Intención: que obedezca ya · Ritmo: rápido, voz baja · Pausas: tras «levantar» · FX: exterior`

**ACCIÓN (jugable, 8–12 s).** La Tórtola se pone en pie de un impulso, se tambalea, ve a Alejandro y se arranca. El jugador corre hacia la pick-up (QTE: esquivar a la derecha en el último segundo). Manuel, montado otra vez en Moro con el becerro atravesado en la silla, se cruza entre la vaca y la camioneta y le da un toque con la garrocha en el anca para desviarla. La vaca vuelve hacia el becerro que Manuel suelta en la hierba.

Alejandro y Lucía, con la espalda contra la puerta de la pick-up, jadeando. La vaca, a quince metros, lame al becerro como si no hubiera pasado nada.

**LUCÍA** *(recuperando el aliento)*
> Bueno. [short pause] Pues ya está curada.
`C01_E005_L029 · Emoción: alivio y humor negro · Intención: quitar hierro · Ritmo: lento, jadeando · Pausas: tras «Bueno» · FX: exterior, respiración`

**ALEJANDRO**
> [exhales] ¿Siempre es así?
`C01_E005_L030 · Emoción: adrenalina, risa nerviosa · Intención: preguntar de verdad · Ritmo: entrecortado · Pausas: ninguna · FX: exterior, respiración`

**LUCÍA**
> No. A veces se mueren.
`C01_E005_L031 · Emoción: humor seco · Intención: pinchar · Ritmo: normal · Pausas: tras «No» · FX: exterior`

Alejandro se ríe sin querer. Es la primera vez en todo el día. Se le corta enseguida, como si le hubieran pillado.

Lucía se quita el guante largo dándole la vuelta, lo mete en una bolsa. Mira a Alejandro un momento, de otra manera.

**LUCÍA**
> Tu padre me llamó el miércoles.
`C01_E005_L032 · Emoción: duda · Intención: contarlo, aunque no sabe si debe · Ritmo: lento · Pausas: ninguna · FX: exterior`

Alejandro deja de reírse del todo.

**LUCÍA**
> Quería que viniera a ver al semental. Decía que lo veía raro. Le dije que el viernes, que antes no podía. [short pause] Y el viernes ya…
`C01_E005_L033 · Emoción: culpa contenida · Intención: confesar sin dramatizar · Ritmo: normal, se apaga al final · Pausas: la marcada, y la frase queda en suspenso · FX: exterior`

**ALEJANDRO**
> ¿Raro cómo?
`C01_E005_L034 · Emoción: urgencia · Intención: saber · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**LUCÍA**
> No me lo explicó. Tu padre explicaba las cosas regular.
`C01_E005_L035 · Emoción: cariño irónico · Intención: ser honesta · Ritmo: normal · Pausas: breve entre frases · FX: exterior`

**MANUEL** *(desde el caballo, sin acercarse)*
> Explicaba lo justo.
`C01_E005_L036 · Emoción: lealtad · Intención: defender al muerto · Ritmo: lento · Pausas: ninguna · FX: exterior, distancia media`

**LUCÍA** *(sin volverse)*
> Lo justo para que tuvieras que venir a verlo tú.
`C01_E005_L037 · Emoción: ironía afectuosa · Intención: rematar · Ritmo: normal · Pausas: ninguna · FX: exterior`

Lucía cierra el módulo de la pick-up. Abre la puerta del conductor.

**LUCÍA**
> El lunes me paso a ver a Lucero. Si a alguien le parece bien.
`C01_E005_L038 · Emoción: profesionalidad · Intención: comprometerse y pedir permiso al nuevo dueño sin decirlo · Ritmo: normal · Pausas: breve tras «Lucero» · FX: exterior`

Mira a Alejandro. Alejandro no sabe que es a él a quien se lo pregunta. Manuel le mira también.

**ALEJANDRO**
> Ah. Sí. [short pause] Claro.
`C01_E005_L039 · Emoción: desconcierto · Intención: aceptar el papel sin entenderlo del todo · Ritmo: titubeante · Pausas: entre palabras · FX: exterior`

Lucía arranca y se va. El sol se esconde detrás de la ladera. La vaca y el becerro, recortados contra el cielo naranja.

**MANUEL**
> Venga. Que esta noche hiela.
`C01_E005_L040 · Emoción: satisfacción que no enseña · Intención: volver · Ritmo: lento · Pausas: ninguna · FX: exterior`

## Indicaciones de interpretación

- Lucía no tiene tiempo para la cortesía; la cortesía la tiene con los animales. Su pésame es breve y sincero, y luego trabajo.
- La calma de Lucía al pedir que se aparten es fingida: es lo más peligroso de la escena y lo sabe.
- La risa de Alejandro tras la huida tiene que sonar a alivio, no a chiste.
- «Si a alguien le parece bien» es la primera vez que alguien trata a Alejandro como el dueño. Él tarda en darse cuenta.

## Sonido ambiente

- Cencerros de los cabestros (grave, lento), mugidos, cascos sobre hierba húmeda y piedra.
- Respiración pesada de la vaca, gemido corto, el becerro balando.
- Pick-up: motor gasolina, puerta, cierre de aluminio del módulo, chasquido del guante de látex.
- Acción: galope corto, pezuñas, jadeos, golpe de la garrocha en el anca, Moro resoplando.
- Final: grajos volviendo a los árboles, la charca, silencio.

## Transición

Plano general de la vacada subiendo hacia el encinar en contraluz → fundido a negro → C01_E006 abre con el chisporroteo de la chimenea.

## Consecuencias narrativas

- Primera aparición de Lucía. `CONFIANZA_LUCIA +1` si el minijuego se completa sin soltar.
- **Pista confirmada:** Ernesto vio «raro» a Lucero; Lucía vendrá el lunes (abre C02).
- Alejandro es tratado por primera vez como dueño.
- Se desbloquea el sistema de manejo de ganado y el estado sanitario de las reses.

---

# C01_E006 · PATATAS MENEÁS

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | — (escena de transición entre M02 y M03) |
| Localización | Cocina de la casa principal de La Encomienda |
| Hora del día | 22:30 · sábado 8 de marzo |
| Climatología | Interior. Fuego bajo en la chimenea de campana, una lámpara colgante cálida sobre el extremo de la mesa. Fuera, helada (2 °C), noche cerrada. |
| Personajes presentes | ALEJANDRO · MANUEL |
| Duración estimada | 4 min 20 s |
| Tipo | Cinemática |

## Situación

Manuel ha hecho la cena en la cocina grande, como hacía cuando Alejandro era pequeño y Ernesto volvía tarde. Dos platos en una esquina de una mesa para doce. Una sartén de patatas meneás con torreznos en medio, una botella de vino de las Arribes sin etiqueta y una hogaza. Alejandro sigue con la chaqueta de su padre puesta. Manuel, en mangas de camisa y zapatillas.

## Guion

La sartén humea entre los dos. Manuel sirve con la espumadera. Mucho para Alejandro, poco para él.

**MANUEL**
> Patatas meneás. Como las hacía tu madre.
`C01_E006_L001 · Emoción: ternura disimulada · Intención: ofrecer algo de hogar · Ritmo: lento · Pausas: breve tras «meneás» · FX: interior, cocina con reverberación de piedra`

**ALEJANDRO** *(mira el plato)*
> Mi madre las hacía con chorizo.
`C01_E006_L002 · Emoción: nostalgia que corrige · Intención: marcar que se acuerda · Ritmo: normal · Pausas: ninguna · FX: interior`

**MANUEL**
> Tu madre las hacía mal. [short pause] Pero no se lo digas.
`C01_E006_L003 · Emoción: humor tierno · Intención: hacerle sonreír · Ritmo: lento · Pausas: la marcada · FX: interior`

Alejandro sonríe a su pesar. Come. Comen los dos en silencio. Diez segundos. El fuego. El tenedor contra el plato.

**ALEJANDRO**
> Están buenas.
`C01_E006_L004 · Emoción: reconciliación mínima · Intención: dar las gracias sin decirlo · Ritmo: lento · Pausas: ninguna · FX: interior`

**MANUEL**
> Ya.
`C01_E006_L005 · Emoción: orgullo seco · Intención: aceptar · Ritmo: lento · Pausas: ninguna · FX: interior`

Manuel sirve vino. Alejandro bebe más de la cuenta de un trago.

**ALEJANDRO**
> La Lucía esa. ¿Desde cuándo viene?
`C01_E006_L006 · Emoción: curiosidad que disimula · Intención: hablar de algo que no duela · Ritmo: normal · Pausas: ninguna · FX: interior`

**MANUEL**
> Tres años. Al principio tu padre no la quería. Decía que era una niña de ciudad.
`C01_E006_L007 · Emoción: diversión recordando · Intención: contar · Ritmo: lento · Pausas: breve entre frases · FX: interior`

**ALEJANDRO**
> ¿Y?
`C01_E006_L008 · Emoción: interés · Intención: que siga · Ritmo: rápido · Pausas: ninguna · FX: interior`

**MANUEL**
> Y en el primer saneamiento le sacó un ternero atravesado a la vaca favorita de tu padre a las tres de la mañana, con un brazo metido hasta el hombro. [short pause] Al día siguiente ya era «la Lucía».
`C01_E006_L009 · Emoción: admiración divertida · Intención: dar el retrato · Ritmo: normal, acelera en la anécdota · Pausas: la marcada · FX: interior`

Alejandro asiente. Bebe. Mira alrededor: la mesa vacía, las sillas que nadie ocupa, la silla de la cabecera con el respaldo más alto.

**ALEJANDRO**
> Esta mesa es ridícula para dos.
`C01_E006_L010 · Emoción: melancolía que suena a queja · Intención: decir algo de la ausencia sin decirlo · Ritmo: lento · Pausas: ninguna · FX: interior`

**MANUEL**
> Para uno era peor.
`C01_E006_L011 · Emoción: tristeza seca · Intención: hacerle ver cómo vivía su padre · Ritmo: lento · Pausas: ninguna · FX: interior`

Silencio. Alejandro deja el tenedor.

**ALEJANDRO**
> ¿Cenaba aquí solo?
`C01_E006_L012 · Emoción: culpa que asoma · Intención: saber · Ritmo: lento · Pausas: ninguna · FX: interior`

**MANUEL**
> Cuando yo me iba a mi casa, sí. Con la radio. [short pause] Ponía el fútbol aunque no le gustaba. Para que hubiera ruido.
`C01_E006_L013 · Emoción: pena · Intención: contar la verdad sin cargar las tintas · Ritmo: lento · Pausas: la marcada · FX: interior`

Alejandro aparta la mirada hacia el fuego.

**ALEJANDRO**
> Él me dijo que no volviera.
`C01_E006_L014 · Emoción: herida antigua · Intención: defenderse antes de que le acusen · Ritmo: lento · Pausas: ninguna · FX: interior`

**MANUEL**
> Ya lo sé. Estaba yo delante.
`C01_E006_L015 · Emoción: firmeza · Intención: no dejarle reescribir la historia · Ritmo: lento · Pausas: breve entre frases · FX: interior`

**ALEJANDRO**
> Pues entonces.
`C01_E006_L016 · Emoción: desafío · Intención: dar por zanjado · Ritmo: seco · Pausas: ninguna · FX: interior`

**MANUEL**
> Pues entonces, ¿qué? [short pause] Te dijo que no volvieras y le hiciste caso. Es la única vez en tu vida que le has hecho caso a tu padre.
`C01_E006_L017 · Emoción: dolor convertido en ironía · Intención: decirle la verdad · Ritmo: lento, más firme al final · Pausas: la marcada · FX: interior`

Alejandro le mira. Por un momento parece que va a levantarse.

**ALEJANDRO**
> Tú siempre estabas de su parte.
`C01_E006_L018 · Emoción: rencor de adolescente · Intención: herir · Ritmo: normal · Pausas: ninguna · FX: interior`

**MANUEL**
> Yo estaba en medio, que es distinto. [short pause] Y en medio te dan por los dos lados.
`C01_E006_L019 · Emoción: cansancio, humor triste · Intención: corregirle sin pelear · Ritmo: lento · Pausas: la marcada · FX: interior`

**ALEJANDRO**
> ¿Y por qué no me llamaste nunca? En cuatro años. Ni una vez.
`C01_E006_L020 · Emoción: herida verdadera · Intención: reprochar lo que de verdad le duele · Ritmo: normal, se acelera · Pausas: breve tras «nunca» · FX: interior`

Manuel deja el vaso. Se toma su tiempo.

**MANUEL**
> Porque si te llamaba yo, tu padre no te iba a llamar nunca. [short pause] Y pensé que tenía que ser él.
`C01_E006_L021 · Emoción: culpa y razón a la vez · Intención: explicarse por primera vez · Ritmo: lento · Pausas: la marcada · FX: interior`

Silencio largo. Cinco segundos. El fuego cruje.

**ALEJANDRO** *(muy bajo)*
> Y llamó.
`C01_E006_L022 · Emoción: culpa absoluta · Intención: ninguna, constatar · Ritmo: muy lento · Pausas: precedida de 5 s de silencio`

**MANUEL**
> Y llamó.
`C01_E006_L023 · Emoción: pena compartida · Intención: acompañar · Ritmo: muy lento · Pausas: ninguna · FX: interior`

Manuel se levanta. Recoge su plato. Lo lleva al fregadero. De espaldas:

**MANUEL**
> ¿Quieres saber qué pasó esa noche?
`C01_E006_L024 · Emoción: duda · Intención: ofrecer algo que no quiere dar · Ritmo: lento · Pausas: ninguna · FX: interior, de espaldas`

Alejandro levanta la cabeza.

**ALEJANDRO**
> Sí.
`C01_E006_L025 · Emoción: necesidad · Intención: aceptar · Ritmo: seco · Pausas: ninguna · FX: interior`

Manuel abre el grifo. Se queda mirando el agua. Se toca el bigote.

**MANUEL**
> Pues no lo sé. [short pause] Me fui a dormir pronto. Por la mañana estaba en el cercado.
`C01_E006_L026 · Emoción: mentira a medias · Intención: protegerse · Ritmo: lento, uniforme · Pausas: la marcada · FX: interior, de espaldas, agua corriendo`

Alejandro le mira la espalda. No le cree del todo. No insiste.

Manuel cierra el grifo, se seca las manos con el paño, coge el sombrero del gancho.

**MANUEL**
> A las siete hay que echar de comer. Si estás, bien.
`C01_E006_L027 · Emoción: retirada · Intención: irse antes de decir más · Ritmo: lento · Pausas: breve entre frases · FX: interior`

**ALEJANDRO**
> Manuel.
`C01_E006_L028 · Emoción: algo parecido al cariño · Intención: retenerle un segundo · Ritmo: lento · Pausas: ninguna · FX: interior`

Manuel se para en la puerta.

**ALEJANDRO**
> Gracias por la cena.
`C01_E006_L029 · Emoción: ternura torpe · Intención: lo que no sabe decir de otra manera · Ritmo: lento · Pausas: ninguna · FX: interior`

**MANUEL** *(sin volverse)*
> Friega tú.
`C01_E006_L030 · Emoción: cariño seco · Intención: responder a su manera · Ritmo: lento · Pausas: ninguna · FX: interior`

La puerta se cierra. Alejandro solo en la mesa para doce. Se sirve otro vaso. Saca la grabadora del bolsillo de la chaqueta. La deja sobre la mesa. No la enciende.

Fuera, en la oscuridad, muge un toro. Largo. Grave.

## Indicaciones de interpretación

- Es la escena más importante del capítulo para la relación. No hay gritos. Todo va por debajo.
- El silencio de 10 s al principio y el de 5 s antes de «Y llamó» se respetan en montaje.
- «Pues no lo sé» es una mentira. Manuel la dice de espaldas porque no podría decirla de frente. El jugador atento debe recordar el gesto del bigote.
- «Friega tú» es un «te quiero».

## Sonido ambiente

- Fuego de leña de encina (crepitar irregular), tenedores en loza, vino en vaso de cristal grueso, silla arrastrada en losa.
- Reloj de pared en el pasillo. Nevera vieja con zumbido intermitente.
- Grifo antiguo con golpe de ariete al abrirse.
- Exterior: mugido largo de Lucero, perro de la casa del mayoral, helada (silencio total del campo).
- Música: ninguna hasta el mugido; con él entra un acorde grave sostenido.

## Transición

Plano fijo de la grabadora sobre la mesa con el reflejo del fuego → corte a negro → título «DOMINGO» (en Unity, sobreimpresión de interfaz, no en vídeo) → amanecer en C01_E007.

## Consecuencias narrativas

- Se revela la soledad de Ernesto y el motivo por el que Manuel nunca llamó.
- **Pista:** Manuel miente sobre la última noche (misterio n.º 5).
- Se activa el objetivo de la mañana siguiente: «Echa de comer a las 7:00» (tutorial de alimentación; si el jugador llega tarde, `LEALTAD_MANUEL −1`).

---

# C01_E007 · LA LUZ DE LOS LLANOS

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M03 · La oferta |
| Localización | Porche y patio de grava del caserío de La Encomienda |
| Hora del día | 10:00 · domingo 9 de marzo |
| Climatología | Sol limpio de mañana, sombras largas, escarcha fundiéndose en la sombra del porche, vaho al hablar. 7 °C. |
| Personajes presentes | ALEJANDRO · MANUEL · RICARDO |
| Duración estimada | 4 min 40 s |
| Tipo | Cinemática con elección de diálogo al final (2 ramas, convergen) |

## Situación

Alejandro y Manuel llevan desde las siete echando pienso y heno. Alejandro ha llegado a las siete y cuatro; Manuel no ha dicho nada, pero lo ha mirado. Ahora toman café en tazas de metal en el banco corrido del porche, sucios de polvo de pienso. Alejandro lleva vaqueros, jersey gris y la chaqueta de su padre. Un todoterreno negro aparece por el camino del encinar.

## Guion

El vaho de las tazas. Un gallo, tarde. Manuel entorna los ojos hacia el camino.

**MANUEL**
> Mira quién viene.
`C01_E007_L001 · Emoción: fastidio · Intención: avisar · Ritmo: lento · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> ¿Ese no era el de «lo demás puede esperar»?
`C01_E007_L002 · Emoción: sarcasmo · Intención: burlarse · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> Ha esperado una noche. [short pause] Para lo que es él, es mucho.
`C01_E007_L003 · Emoción: ironía · Intención: describirle · Ritmo: lento · Pausas: la marcada · FX: exterior`

El todoterreno se detiene en la grava, a diez metros. Hoy conduce el propio Ricardo. Baja sin prisa: chaleco acolchado verde oliva sobre un blazer azul marino, camisa celeste abierta, una carpeta fina de piel en la mano. Antes de acercarse, se vuelve un instante hacia el sur, hacia los llanos, y los mira con los ojos entornados contra el sol. Luego sonríe y sube al porche.

**RICARDO**
> Buenos días. Perdonad que me presente así, sin avisar. Voy a misa a Peñacorva y he pensado que mejor quitarnos esto de en medio cuanto antes.
`C01_E007_L004 · Emoción: cordialidad impecable · Intención: parecer considerado · Ritmo: pausado · Pausas: breve tras «sin avisar» · FX: exterior`

**MANUEL**
> La misa es a las doce.
`C01_E007_L005 · Emoción: desconfianza · Intención: desenmascararle · Ritmo: lento · Pausas: ninguna · FX: exterior`

**RICARDO**
> Por eso. Voy con tiempo.
`C01_E007_L006 · Emoción: humor elegante · Intención: no darse por aludido · Ritmo: pausado · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> ¿Quitarnos qué de en medio?
`C01_E007_L007 · Emoción: tensión · Intención: ir al grano · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**RICARDO**
> ¿Me invitas a un café o lo hacemos de pie?
`C01_E007_L008 · Emoción: ligereza · Intención: medir hasta dónde llega · Ritmo: pausado · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> De pie.
`C01_E007_L009 · Emoción: hostilidad · Intención: negarle hospitalidad · Ritmo: seco · Pausas: ninguna · FX: exterior`

**RICARDO** *(sonríe con los labios cerrados)*
> De pie. Igualito que tu padre.
`C01_E007_L010 · Emoción: diversión · Intención: pinchar con nostalgia · Ritmo: lento · Pausas: breve tras «De pie» · FX: exterior`

Abre la carpeta. No saca nada todavía.

**RICARDO**
> Hace un año el banco le pidió a tu padre que devolviera un préstamo. Uno grande. Tu padre no podía, y el banco iba a ejecutar. [short pause] Así que compré yo la deuda.
`C01_E007_L011 · Emoción: neutralidad de negociador · Intención: exponer los hechos como un favor · Ritmo: pausado, preciso · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> ¿Que la compraste?
`C01_E007_L012 · Emoción: incredulidad · Intención: entender · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**RICARDO**
> Los bancos venden deudas, Alejandro. Igual que vosotros vendéis toros. Más baratas de lo que valen, porque prefieren cobrar algo hoy que esperar a cobrarlo todo nunca.
`C01_E007_L013 · Emoción: paciencia didáctica · Intención: hacerle sentir ingenuo · Ritmo: pausado · Pausas: breve entre frases · FX: exterior`

**ALEJANDRO**
> ¿Cuánto?
`C01_E007_L014 · Emoción: miedo contenido · Intención: la cifra · Ritmo: seco · Pausas: ninguna · FX: exterior`

Ricardo deja pasar un segundo.

**RICARDO**
> Un millón… ciento cuarenta mil euros.
`C01_E007_L015 · Emoción: calma absoluta · Intención: dejar caer el peso · Ritmo: lento, cada palabra separada · Pausas: 1 s antes de empezar (en montaje) y suspensión tras «millón» · FX: exterior`

Alejandro se vuelve hacia Manuel. Manuel mira su taza.

**ALEJANDRO**
> ¿Tú lo sabías?
`C01_E007_L016 · Emoción: traición · Intención: acusar · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> Lo del banco, sí. [short pause] Lo de este, no.
`C01_E007_L017 · Emoción: vergüenza y rabia · Intención: decir la verdad exacta · Ritmo: lento · Pausas: la marcada · FX: exterior`

**RICARDO**
> Y no es lo único.
`C01_E007_L018 · Emoción: falsa pena · Intención: avanzar · Ritmo: pausado · Pausas: ninguna · FX: exterior`

Saca dos hojas grapadas con el sello de una notaría. Se las ofrece a Alejandro. Alejandro no las coge. Ricardo las deja sobre el banco de piedra, entre los dos hombres.

**RICARDO**
> En octubre tu padre y yo firmamos esto. Una opción de compra. Sobre La Encomienda, el ganado y el hierro. [short pause] Con su antigüedad.
`C01_E007_L019 · Emoción: precisión · Intención: enunciar el contrato · Ritmo: lento · Pausas: la marcada · FX: exterior`

Manuel levanta la cabeza de golpe.

**MANUEL**
> Eso no.
`C01_E007_L020 · Emoción: negación · Intención: rechazar la realidad · Ritmo: seco, bajo · Pausas: ninguna · FX: exterior`

**RICARDO**
> Lleva su firma, Manuel. Notaría de Vitigudino, tres de octubre. Puede mirarla usted mismo.
`C01_E007_L021 · Emoción: cortesía implacable · Intención: cerrar la duda · Ritmo: pausado · Pausas: breve entre frases · FX: exterior`

Manuel coge las hojas. Busca la última página. La firma. La reconoce. No se le mueve un músculo de la cara, pero tarda mucho en volver a dejar el papel.

**MANUEL**
> ¿Ernesto firmó esto?
`C01_E007_L022 · Emoción: herida profunda · Intención: casi para sí · Ritmo: muy lento · Pausas: ninguna · FX: exterior, voz baja`

**RICARDO**
> ¿No se lo contó? [short pause] Vaya. Lo siento, Manuel. De verdad.
`C01_E007_L023 · Emoción: compasión de superficie · Intención: hurgar · Ritmo: lento · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> ¿Y eso qué significa?
`C01_E007_L024 · Emoción: angustia · Intención: entender ya · Ritmo: rápido · Pausas: ninguna · FX: exterior`

**RICARDO**
> Significa que si el veintiuno de septiembre la deuda no está pagada, la finca pasa a ser mía. Toda. [short pause] Y yo te pago a ti trescientos mil euros. Limpios. Sin una sola deuda detrás.
`C01_E007_L025 · Emoción: generosidad estudiada · Intención: presentar la trampa como regalo · Ritmo: pausado · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> Trescientos mil euros. Por todo esto.
`C01_E007_L026 · Emoción: desprecio · Intención: devolverle la cifra · Ritmo: lento · Pausas: entre frases · FX: exterior`

**RICARDO**
> Trescientos mil más un millón que te quito de encima. Tu padre lo entendió muy bien. [short pause] Te lo digo con todo el cariño: es una salida digna. Más digna que la que tuvo él.
`C01_E007_L027 · Emoción: frialdad envuelta en afecto · Intención: rematar · Ritmo: pausado · Pausas: la marcada · FX: exterior`

Manuel se pone de pie. No dice nada. No hace falta.

**MANUEL**
> Cuidado.
`C01_E007_L028 · Emoción: amenaza tranquila · Intención: poner un límite · Ritmo: muy lento, bajo · Pausas: ninguna · FX: exterior`

Ricardo levanta una mano, conciliador.

**RICARDO**
> Tiene razón. Me he pasado. [short pause] Manuel, que conste: en Los Arenales tiene usted trabajo mientras quiera. Mismo sueldo. También eso lo hablé con Ernesto.
`C01_E007_L029 · Emoción: disculpa táctica · Intención: dividir · Ritmo: pausado · Pausas: la marcada · FX: exterior`

**MANUEL**
> No me hable usted de lo que habló con Ernesto.
`C01_E007_L030 · Emoción: rabia contenida · Intención: cortar · Ritmo: lento, cada palabra con peso · Pausas: ninguna · FX: exterior`

Ricardo asiente, como quien acepta una tarjeta amarilla. Se vuelve otra vez hacia el sur. Los llanos brillan con la escarcha derritiéndose al sol.

**RICARDO**
> ¿Sabes lo que tiene esta finca, Alejandro? [short pause] Luz. Mira eso. Tu padre nunca lo vio.
`C01_E007_L031 · Emoción: admiración verdadera, casi codicia · Intención: se le escapa algo · Ritmo: lento · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> ¿Qué quieres decir?
`C01_E007_L032 · Emoción: desconcierto · Intención: entender · Ritmo: normal · Pausas: ninguna · FX: exterior`

**RICARDO** *(se vuelve, sonríe)*
> Nada. Que hace una mañana preciosa.
`C01_E007_L033 · Emoción: cierre elegante · Intención: tapar lo que ha dicho · Ritmo: ligero · Pausas: breve tras «Nada» · FX: exterior`

**ALEJANDRO**
> ¿Y si pago?
`C01_E007_L034 · Emoción: orgullo · Intención: desafiar · Ritmo: seco · Pausas: ninguna · FX: exterior`

**RICARDO**
> ¿Con qué? [short pause] Perdona. Eso ha sido feo.
`C01_E007_L035 · Emoción: diversión sincera, luego cortesía · Intención: humillar y disculparse en el mismo gesto · Ritmo: rápido, luego lento · Pausas: la marcada · FX: exterior`

**RICARDO**
> Si me pagas antes del veintiuno de septiembre, rompo este papel delante de ti y te invito a comer. Donde tú quieras.
`C01_E007_L036 · Emoción: deportividad · Intención: dejar la puerta abierta sabiendo que no la cruzará · Ritmo: pausado · Pausas: breve tras «delante de ti» · FX: exterior`

### ELECCIÓN DEL JUGADOR

> **A.** «Fuera de mi casa.»
> **B.** «Lo pensaré.»

#### Rama A

**ALEJANDRO**
> Fuera de mi casa.
`C01_E007_L037 · Rama: A · Emoción: orgullo · Intención: echarle · Ritmo: lento, firme · Pausas: ninguna · FX: exterior`

**RICARDO**
> Técnicamente… [short pause] No. Tienes razón. Hoy es tu casa.
`C01_E007_L038 · Rama: A · Emoción: diversión contenida · Intención: recordarle que tiene fecha · Ritmo: pausado · Pausas: tras «Técnicamente…» · FX: exterior`

Manuel mira a Alejandro. Por primera vez en dos días, algo parecido al orgullo.

#### Rama B

**ALEJANDRO**
> Lo pensaré.
`C01_E007_L039 · Rama: B · Emoción: cálculo · Intención: ganar tiempo · Ritmo: lento · Pausas: ninguna · FX: exterior`

**RICARDO**
> Es lo más sensato que he oído en esta casa en muchos años.
`C01_E007_L040 · Rama: B · Emoción: satisfacción · Intención: elogiar al hijo a costa del padre · Ritmo: pausado · Pausas: ninguna · FX: exterior`

Manuel mira a Alejandro. Aparta la vista.

#### Convergencia

Ricardo deja la copia de la opción sobre el banco de piedra. Baja los escalones del porche.

**RICARDO** *(sin volverse, levantando la mano)*
> El original lo tiene mi abogado. Esa copia es para ti.
`C01_E007_L041 · Emoción: cortesía · Intención: última palabra · Ritmo: ligero · Pausas: ninguna · FX: exterior, alejándose`

El todoterreno negro gira en la grava y se va por el camino del encinar. El polvo queda suspendido en el sol.

Manuel deja la taza en el banco y echa a andar hacia las cuadras sin decir nada.

**ALEJANDRO**
> ¡Manuel!
`C01_E007_L042 · Emoción: necesidad · Intención: que no se vaya · Ritmo: alto · Pausas: ninguna · FX: exterior`

**MANUEL** *(sin pararse)*
> Ahora no.
`C01_E007_L043 · Emoción: dolor · Intención: estar solo · Ritmo: seco · Pausas: ninguna · FX: exterior, distancia media`

Alejandro, solo en el porche. Coge la copia. Lee la primera línea. Mira hacia los llanos, donde mira Ricardo. Solo ve hierba y escarcha y sol.

## Indicaciones de interpretación

- Ricardo no amenaza nunca. Expone. Todo lo que dice es verdad, y por eso es cruel.
- La única grieta de Ricardo es la frase de la luz: se le escapa porque de verdad le emociona. Debe sonar distinta, más baja, casi íntima.
- Manuel recibe en esta escena la peor noticia de su vida (Ernesto no confió en él). Lo interpreta con el cuerpo, no con la voz. Su «Eso no» es casi inaudible.
- «Ahora no» devuelve a Manuel su propia muletilla («aquí no», «por teléfono no»): por primera vez, el que no quiere hablar no puede hacerlo.

## Sonido ambiente

- Mañana de campo: gallo, gorriones en la parra, cencerros de cabestros, goteo de la escarcha derritiéndose del tejado.
- Todoterreno grande: neumáticos anchos sobre grava, motor silencioso, puerta de cierre suave y pesado.
- Papel grapado, carpeta de piel.
- Al irse el coche, el silencio vuelve de golpe.

## Transición

Plano de Alejandro con el papel y los llanos al fondo → control al jugador (tarde libre: el jugador puede revisar la finca; el objetivo «Habla con Manuel» lleva al cercado de Lucero al atardecer) → C01_E008.

## Consecuencias narrativas

- **Se activa el contador de la opción:** 196 días.
- `DEUDA = 1.140.000 €`.
- **Rama A:** `LEALTAD_MANUEL +1`, `PRESTIGIO −2`.
- **Rama B:** `INTEGRIDAD −1`. En C02, Ricardo llama a Alejandro «para ver qué has pensado».
- Manuel descubre que Ernesto le ocultó la opción.
- **Pista:** «Lo que tiene esta finca es luz» (misterio del parque solar).

---

# C01_E008 · LO QUE VALE UN HIERRO

| Campo | Valor |
|---|---|
| Capítulo | 01 · La Encomienda |
| Misión | M03 · La oferta |
| Localización | Exterior del cercado de Lucero · puerta metálica verde y muro de piedra |
| Hora del día | 18:50 · domingo 9 de marzo |
| Climatología | Último sol rasante desde el oeste, a la espalda de Alejandro; hacia el este, donde está el toro, cielo rosa y violeta. Sin viento. 8 °C bajando. |
| Personajes presentes | ALEJANDRO · MANUEL · LUCERO · CARMEN OLMEDO (solo voz, mensaje de buzón) |
| Duración estimada | 3 min 50 s |
| Tipo | Cinemática de cierre de capítulo |

## Situación

Alejandro lleva media hora apoyado en la cerca de piedra del cercado de Lucero, con la copia de la opción doblada en el bolsillo de la chaqueta y la grabadora en la mano. Dentro, a treinta metros, bajo la encina grande, el toro le mira. No se mueve. Manuel aparece por el camino a pie, con el sombrero en la mano.

## Guion

Plano del toro: cárdeno oscuro, casi negro, el sol en el lomo, los dos lunares claros de la frente. Rumia. Mira.

Alejandro, al otro lado del muro, le sostiene la mirada.

Pasos en la tierra. Manuel se coloca a dos metros de Alejandro, también apoyado en el muro. No se miran. Miran al toro.

Largo silencio. Seis segundos.

**MANUEL**
> Cuarenta años. [short pause] Y no me lo contó.
`C01_E008_L001 · Emoción: herida profunda, sin autocompasión · Intención: decir lo único que tiene dentro · Ritmo: muy lento · Pausas: tras «Cuarenta años» · FX: exterior, campo abierto`

**ALEJANDRO**
> A mí tampoco me contó nada.
`C01_E008_L002 · Emoción: solidaridad torpe · Intención: acompañarle · Ritmo: lento · Pausas: ninguna · FX: exterior`

**MANUEL**
> Tú no estabas.
`C01_E008_L003 · Emoción: dolor, no reproche · Intención: constatar · Ritmo: lento · Pausas: ninguna · FX: exterior`

Alejandro encaja el golpe. Asiente. Es verdad.

**ALEJANDRO**
> ¿Por qué lo hizo?
`C01_E008_L004 · Emoción: incomprensión · Intención: buscar una explicación · Ritmo: lento · Pausas: ninguna · FX: exterior`

**MANUEL**
> No lo sé. [short pause] Esta vez no lo sé.
`C01_E008_L005 · Emoción: sinceridad · Intención: admitir · Ritmo: lento · Pausas: la marcada · FX: exterior`

Alejandro le mira de reojo: «esta vez». Manuel no se toca el bigote. Es verdad.

Lucero da dos pasos hacia la encina. Se para. Apoya mal la mano izquierda, apenas; es tan poco que solo Alejandro parece notarlo. Frunce el ceño.

**ALEJANDRO**
> Seis meses.
`C01_E008_L006 · Emoción: cálculo · Intención: empezar a pensar en voz alta · Ritmo: lento · Pausas: ninguna · FX: exterior`

**MANUEL**
> Seis meses y doce días.
`C01_E008_L007 · Emoción: precisión de campo · Intención: corregir · Ritmo: lento · Pausas: ninguna · FX: exterior`

**ALEJANDRO**
> ¿Cuánto vale una corrida?
`C01_E008_L008 · Emoción: determinación incipiente · Intención: saber con qué cuenta · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> Depende de quién te la compre. Y de cómo embistan.
`C01_E008_L009 · Emoción: cautela · Intención: no darle falsas esperanzas · Ritmo: lento · Pausas: breve entre frases · FX: exterior`

**ALEJANDRO**
> Manuel. ¿Cuánto?
`C01_E008_L010 · Emoción: impaciencia · Intención: exigir la cifra · Ritmo: seco · Pausas: tras «Manuel» · FX: exterior`

**MANUEL**
> En una plaza buena, con un empresario serio… sesenta, ochenta mil. [short pause] Si te la pagan.
`C01_E008_L011 · Emoción: realismo · Intención: dar la cifra y el aviso · Ritmo: lento · Pausas: suspensión y la marcada · FX: exterior`

Alejandro hace la cuenta. No da.

**ALEJANDRO**
> No da.
`C01_E008_L012 · Emoción: desánimo · Intención: constatar · Ritmo: lento · Pausas: ninguna · FX: exterior`

**MANUEL**
> No da.
`C01_E008_L013 · Emoción: acompañamiento · Intención: no mentirle · Ritmo: lento · Pausas: ninguna · FX: exterior`

El móvil de Alejandro vibra en el bolsillo del pantalón. Lo saca. Número desconocido. Lo deja sonar. Se corta. Un segundo después: aviso de mensaje en el buzón de voz. Alejandro duda. Pone el altavoz.

**CARMEN** *(mensaje de buzón; ruido de estación de tren de fondo, megafonía lejana ininteligible)*
> Alejandro, buenas tardes, soy Carmen Olmedo. [short pause] Siento muchísimo lo de tu padre. De verdad. Ernesto y yo trabajamos juntos doce años y era de lo poco serio que queda en este negocio.
`C01_E008_L014 · Emoción: pésame profesional sincero · Intención: abrir con respeto · Ritmo: rápido, articulado · Pausas: tras el nombre · FX: teléfono, buzón de voz, estación`

**CARMEN**
> Te voy a ser muy clara, porque no tengo otra forma de hacerlo. Tenía apalabrada con tu padre una corrida para septiembre. Seis toros. [short pause] Necesito saber en quince días si la ganadería sigue en pie o si busco otro hierro.
`C01_E008_L015 · Emoción: firmeza · Intención: poner el plazo · Ritmo: rápido, sin titubeos · Pausas: la marcada · FX: teléfono, buzón de voz, estación`

**CARMEN**
> Llámame a este número. Un abrazo fuerte.
`C01_E008_L016 · Emoción: calidez breve · Intención: cerrar · Ritmo: rápido · Pausas: ninguna · FX: teléfono, buzón de voz, estación`

Pitido de fin de mensaje. Silencio. Alejandro mira el teléfono. Mira a Manuel.

**ALEJANDRO**
> ¿Carmen Olmedo?
`C01_E008_L017 · Emoción: curiosidad · Intención: saber con quién trata · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> Empresaria. De las buenas. [short pause] Esa no llama por pena.
`C01_E008_L018 · Emoción: respeto receloso · Intención: advertir · Ritmo: lento · Pausas: la marcada · FX: exterior`

**ALEJANDRO**
> ¿Y por qué llama?
`C01_E008_L019 · Emoción: interés creciente · Intención: entender · Ritmo: normal · Pausas: ninguna · FX: exterior`

**MANUEL**
> Por toros.
`C01_E008_L020 · Emoción: obviedad · Intención: lo que hay · Ritmo: lento · Pausas: ninguna · FX: exterior`

Alejandro mira al cercado. Lucero, quieto bajo la encina, dorado por el último sol contra un cielo que se vuelve violeta.

**ALEJANDRO**
> Pues tenemos toros.
`C01_E008_L021 · Emoción: decisión · Intención: dar el primer paso · Ritmo: lento, firme · Pausas: ninguna · FX: exterior`

Manuel le mira por fin. Largo.

Alejandro saca la copia de la opción del bolsillo. La mira. La vuelve a doblar. La guarda.

**ALEJANDRO**
> No se vende.
`C01_E008_L022 · Emoción: determinación · Intención: declarar · Ritmo: lento · Pausas: ninguna · FX: exterior`

**MANUEL**
> Eso decía tu padre.
`C01_E008_L023 · Emoción: ironía triste · Intención: probarle · Ritmo: lento · Pausas: ninguna · FX: exterior`

Alejandro se separa del muro. Se vuelve hacia él.

**ALEJANDRO**
> Pues ahora lo digo yo.
`C01_E008_L024 · Emoción: orgullo, desafío, algo de miedo · Intención: hacerse cargo · Ritmo: lento · Pausas: ninguna · FX: exterior`

Manuel se pone el sombrero. Echa a andar hacia el caserío. A los tres pasos, sin volverse:

**MANUEL**
> Mañana a las siete. [short pause] Y en punto, no a las siete y cuatro.
`C01_E008_L025 · Emoción: cariño, aprobación disfrazada · Intención: aceptarle como jefe a su manera · Ritmo: lento · Pausas: la marcada · FX: exterior, alejándose`

Alejandro casi sonríe. Se vuelve hacia el cercado.

Lucero levanta la cabeza. Muge. Largo, grave, al cielo que se apaga.

Plano general: el muro, el hombre pequeño con la chaqueta verde, el toro bajo la encina, la dehesa entera volviéndose azul.

**FUNDIDO A NEGRO.**

*(Interfaz de Unity, no vídeo: «EL PRECIO DE UN HIERRO — 196 días»)*

**FIN DEL CAPÍTULO 01.**

## Indicaciones de interpretación

- Los dos hombres hablan al toro más que entre ellos. No se miran hasta «Pues tenemos toros».
- «Tú no estabas» no es una acusación: Manuel está demasiado roto para acusar. Es una constatación que le duele a él también.
- El mensaje de Carmen es lo único rápido de la escena: viene de otro mundo, el del negocio, que no se para por nadie.
- «No se vende» se dice sin épica. Es casi una pregunta que se contesta a sí misma.
- La última línea de Manuel devuelve el humor y cierra con cariño. Debe sonar a que sonríe sin que se le vea.

## Sonido ambiente

- Campo al atardecer: grajos volviendo a la encina, un cárabo empezando, cencerros lejanos.
- Lucero rumiando, resoplido, pezuña sobre tierra seca.
- Móvil vibrando sobre tela, tono de buzón, pitido final.
- Mensaje de Carmen: estación de tren grande, megafonía ininteligible, maletas con ruedas.
- Mugido final de Lucero con reverberación natural de la dehesa.
- Música: el tema principal entra con el mugido, completo, por primera vez (guitarra, cuerdas, un tambor grave).

## Transición

Fundido a negro → pantalla de capítulo superado → C02.

## Consecuencias narrativas

- **Decisión de campaña:** Alejandro se compromete a no vender. Se activa el objetivo principal «Paga la deuda antes del 21 de septiembre».
- Se activa el contacto de **Carmen Olmedo** en el teléfono del jugador (plazo de 15 días: si no se la llama antes del 24 de marzo, `PRESTIGIO −5` y C04 empieza con desventaja).
- **Pista:** Lucero apoya mal la mano izquierda (confirmación visual de la grabación de Ernesto).
- La relación Alejandro–Manuel queda en un punto de tregua: Manuel le acepta como responsable.
