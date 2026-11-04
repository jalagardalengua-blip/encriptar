// Avisos y misiones basadas en el catálogo del GDD (M-01, M-02, M-03, M-04, M-09)
import * as THREE from 'three';
import { CITY, DIRS, clamp, CITY_NAME } from './config.js';
import { AICar, LaneDriver } from './vehicles.js';

const pick = (a, r = Math.random) => a[(r() * a.length) | 0];
const COLOR_NAMES = [[0xb3121b, 'rojo'], [0x1d3a6b, 'azul oscuro'], [0xe8e8e8, 'blanco'], [0x111316, 'negro'], [0x6d7278, 'gris'], [0x2f4a2f, 'verde'], [0xd68910, 'naranja']];
const MODEL_NAMES = { sedan: 'berlina', hatch: 'compacto', suv: 'todoterreno', van: 'furgoneta' };
const FIRST = ['Lucía', 'Javier', 'Marta', 'Andrés', 'Carmen', 'Raúl', 'Elena', 'Sergio', 'Nuria', 'Pablo', 'Irene', 'Hugo', 'Rosa', 'Iván', 'Alba', 'Tomás', 'Sara', 'Diego'];
const LAST = ['García', 'Moreno', 'Navarro', 'Ruiz', 'Ortega', 'Delgado', 'Castro', 'Vidal', 'Romero', 'Serrano', 'Molina', 'Herrera', 'Prieto', 'Campos'];
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;
const plate = () => `${(1000 + Math.random() * 8999) | 0} ${pick('BCDFGHJKLMNPRSTVWXYZ'.split(''))}${pick('BCDFGHJKLMNPRSTVWXYZ'.split(''))}${pick('BCDFGHJKLMNPRSTVWXYZ'.split(''))}`;

// ---------------- Base ----------------
export class Mission {
  constructor(G, opts) {
    this.G = G; this.code = opts.code; this.title = opts.title; this.category = opts.category; this.priority = opts.priority;
    this.pos = opts.pos; this.details = opts.details; this.location = G.city.locationName(this.pos.x, this.pos.z);
    this.objs = []; this.facts = []; this.evidence = []; this.flags = {}; this.npcs = []; this.cars = []; this.fx = []; this.services = [];
    this.s = { seguridad: 100, legalidad: 100, resolucion: 0, comunicacion: 60, informe: 0 };
    this.notes = []; this.startTime = G.elapsed; this.arrived = false; this.reportReady = false; this.done = false;
  }
  obj(id, text, optional = false) { const o = { id, text, done: false, optional }; this.objs.push(o); this.refresh(); return o; }
  complete(id) { const o = this.objs.find((x) => x.id === id); if (o && !o.done) { o.done = true; this.G.audio.click(); this.G.hud.toast('✓ ' + o.text, 'good', 1800); this.refresh(); } }
  has(id) { return this.objs.find((x) => x.id === id)?.done; }
  fact(t) { if (!this.facts.includes(t)) this.facts.push(t); }
  ev(key, label, relevant = true) { if (this.evidence.some((e) => e.key === key)) return; this.evidence.push({ key, label, relevant }); this.G.hud.toast(`Prueba añadida: ${label}`, 'xp', 2000); }
  adj(cat, v, note) { this.s[cat] = clamp(this.s[cat] + v, 0, 100); if (note) this.notes.push(note); }
  refresh() { this.G.hud.objectives(`${this.code} · ${this.title}`, this.objs.filter((o) => !o.hidden), this.reportReady ? '<span class="kbd">I</span> Informe' : ''); }
  say(lines, choices, done) { this.G.hud.say(lines, choices, done); }
  addNPC(o) { const n = this.G.addNPC(o); this.npcs.push(n); return n; }
  addCar(type, color, pose, flags = {}) {
    const c = new AICar(this.G.traffic, type, color, null, { static: true, pose, state: 'stopped', flags: { mission: true, ...flags } });
    c.y = 0; this.G.traffic.cars.push(c); this.cars.push(c); return c;
  }
  // punto de calzada sin coches aparcados
  roadSpot(minD = 160, maxD = 420) {
    const G = this.G; const from = G.playerPos();
    for (let k = 0; k < 60; k++) {
      const p = G.city.randomRoadPoint(G.rnd, minD, maxD, from); if (!p) continue;
      if (p.seg.parked) continue; if (p.seg.axis === 'x' && p.seg.j === CITY.N - 1) continue;
      return p;
    }
    return G.city.randomRoadPoint(G.rnd, minD, maxD, from);
  }
  sidewalkOf(p, extra = 0) { // punto de acera al lado derecho del sentido
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading); const rx = -fz, rz = fx;
    return { x: p.x + rx * (9.2 - CITY.PARK + extra), z: p.z + rz * (9.2 - CITY.PARK + extra) };
  }
  start() {}
  update(dt) {
    const G = this.G; const p = G.playerPos();
    if (!this.arrived && this.arrivalPos && Math.hypot(p.x - this.arrivalPos.x, p.z - this.arrivalPos.z) < (this.arrivalR || 30)) {
      this.arrived = true; this.complete('arrive'); this.respTime = G.elapsed - this.startTime; this.onArrive?.();
      if (this.priority === 1 && G.car.lights) this.adj('seguridad', 0); else if (this.priority === 1) this.notes.push('Aproximación a aviso prioritario sin señales luminosas.');
    }
    for (const n of this.npcs) n.update(dt);
    this.tick?.(dt);
  }
  interactables() { return []; }
  canReport() { return this.reportReady; }
  setReportReady() { if (!this.reportReady) { this.reportReady = true; this.G.hud.toast('Intervención estabilizada · pulsa I para redactar el informe', 'info', 3500); this.G.audio.success(); this.refresh(); } }
  officerNear(n, r = 2.6) { const p = this.G.playerPos(); return this.G.onFoot && Math.hypot(p.x - n.x, p.z - n.z) < r; }
  reportData() { return { code: this.code, title: this.title, location: this.location, officer: this.G.officerName, time: this.G.clock(), facts: this.facts, resolutions: this.resolutions(), evidence: this.evidence.map((e) => ({ ...e, preselect: false })), observations: this.notes.join(' ') }; }
  // evaluación genérica
  evaluate(resIdx, evIdx) {
    const res = this.resolutions()[resIdx];
    const r = this.judge(res, resIdx);
    // informe: pruebas relevantes adjuntadas
    const rel = this.evidence.filter((e) => e.relevant).length; const att = evIdx.map((i) => this.evidence[i]);
    const good = att.filter((e) => e.relevant).length, bad = att.filter((e) => !e.relevant).length;
    let inf = rel ? (good / rel) * 85 : 50; inf += Math.min(15, this.facts.length * 3); inf -= bad * 20;
    this.s.informe = clamp(Math.round(inf), 0, 100);
    if (bad) r.cons.push('Se adjuntaron elementos no relacionados con el caso, lo que debilita el expediente.');
    if (rel && good < rel) r.cons.push('Faltan pruebas relevantes en el expediente; la fiscalía podría pedir diligencias adicionales.');
    if (this.respTime !== undefined) { if (this.respTime < 70) { this.s.resolucion = clamp(this.s.resolucion + 5, 0, 100); r.cons.push(`Tiempo de respuesta excelente (${Math.round(this.respTime)} s).`); } else if (this.respTime > 200) r.cons.push(`Tiempo de respuesta elevado (${Math.round(this.respTime)} s).`); }
    const sc = [['Seguridad', this.s.seguridad], ['Legalidad', this.s.legalidad], ['Resolución', this.s.resolucion], ['Comunicación', this.s.comunicacion], ['Informe', this.s.informe]].map(([label, v]) => ({ label, value: Math.round(v) }));
    const avg = sc.reduce((a, b) => a + b.value, 0) / sc.length;
    const grade = avg >= 94 ? 'S' : avg >= 84 ? 'A' : avg >= 70 ? 'B' : avg >= 55 ? 'C' : 'D';
    const xp = Math.round(avg * 2.4 + (grade === 'S' ? 80 : grade === 'A' ? 40 : 0) + (this.priority === 1 ? 60 : 0));
    return { scores: sc, avg, grade, xp, cons: [...r.cons, ...this.notes.slice(0, 3)], title: r.title, sub: `${this.code} · ${this.title} — ${res.label}` };
  }
  cleanup() {
    for (const n of this.npcs) this.G.removeNPC(n);
    for (const c of this.cars) this.G.traffic.remove(c);
    for (const f of this.fx) this.G.removeFx(f);
    for (const s of this.services) this.G.removeService(s);
    this.G.setTarget(null); this.G.setSearchArea(null);
  }
}

// ---------------- M-01 Accidente urbano ----------------
export class Accident extends Mission {
  constructor(G) {
    const p = Mission.prototype.roadSpot.call({ G }, 170, 420);
    super(G, { code: 'M-01', title: 'Accidente urbano', category: 'Tráfico', priority: 2, pos: p,
      details: 'Colisión entre dos turismos. Un implicado podría estar herido. Información inicial incompleta.' });
    this.p = p; this.truth = Math.random() < 0.5 ? 'B' : 'A';
  }
  start() {
    const G = this.G, p = this.p; const fx = Math.sin(p.heading), fz = Math.cos(p.heading); const rx = -fz, rz = fx;
    // coches: A golpeado por detrás/lateral, B delante cruzado
    const ax = p.x - rx * 2.2, az = p.z - rz * 2.2;
    const colA = pick(COLOR_NAMES), colB = pick(COLOR_NAMES.filter((c) => c !== colA));
    this.carA = this.addCar('hatch', colA[0], { x: ax, z: az, heading: p.heading + 0.45 }, { hazardAlways: true });
    this.carB = this.addCar('sedan', colB[0], { x: ax + fx * 4.6 + rx * 0.6, z: az + fz * 4.6 + rz * 0.6, heading: p.heading - 0.25 });
    this.carA.hazard = this.carB.hazard = true; this.carA.blocking = this.carB.blocking = true;
    this.colA = colA[1]; this.colB = colB[1];
    this.fx.push(G.addSmoke(ax + fx * 1.6, 0.9, az + fz * 1.6, 0.6));
    this.fx.push(G.addDebris(ax + fx * 2.6 + rx * 0.4, az + fz * 2.6 + rz * 0.4));
    const sw = this.sidewalkOf(p, 0.4);
    this.A = this.addNPC({ name: fullName(), role: 'Conductor A', x: sw.x - fx * 1.5, z: sw.z - fz * 1.5, state: 'hurt', mood: 'dolorido', heading: p.heading + Math.PI / 2 });
    this.B = this.addNPC({ name: fullName(), role: 'Conductor B', x: ax + fx * 7 + rx * 3.6, z: az + fz * 7 + rz * 3.6, state: 'argue', mood: 'alterado' });
    this.W = this.addNPC({ name: fullName(), role: 'Testigo', x: sw.x + fx * 6, z: sw.z + fz * 6, state: 'phone', mood: 'calmado' });
    this.A.face(ax, az); this.B.face(ax, az); this.W.face(ax, az);
    this.center = { x: ax + fx * 2, z: az + fz * 2 };
    this.arrivalPos = this.center; this.arrivalR = 35;
    G.setTarget(this.center);
    this.obj('arrive', 'Llegar a la escena del accidente');
    this.obj('secure', 'Asegurar la zona (luces de emergencia + balizamiento)');
    this.obj('check', 'Comprobar el estado de los implicados');
    this.obj('witness', 'Tomar declaración al testigo');
    this.obj('photos', 'Documentar los daños de ambos vehículos (0/2)');
    this.photos = 0; this.talkedA = false; this.talkedB = false;
  }
  onArrive() { this.G.radioMsg(`Central: unidad en escena en ${this.location}. Asegure la zona y valore heridos.`, 2); }
  tick() {
    const done = this.has('secure') && this.has('check') && this.has('witness') && this.photos >= 2 && (!this.flags.injured || this.flags.ambulance);
    if (done) this.setReportReady();
    if (this.amb && this.amb.arrived && !this.flags.attended) {
      this.flags.attended = true; this.A.restState = 'idle'; this.A.state = 'walk';
      const fx = Math.sin(this.amb.heading), fz = Math.cos(this.amb.heading);
      this.A.walkTo(this.amb.x - fx * 3.5, this.amb.z - fz * 3.5);
      this.fact('Los servicios sanitarios atienden al conductor A y lo trasladan al hospital para valoración.');
      this.G.radioMsg('Ambulancia: paciente atendido, trasladamos al Hospital de Valmora.', 3);
      setTimeout(() => { this.A.visible = false; }, 9000);
    }
  }
  interactables() {
    const out = [];
    const G = this.G;
    if (!this.has('secure')) out.push({ x: this.center.x, z: this.center.z, r: 6, label: 'Asegurar la zona', actions: () => [
      { label: 'Colocar conos y balizas luminosas', fn: () => {
        if (!G.car.lights || Math.hypot(G.car.x - this.center.x, G.car.z - this.center.z) > 40) { G.hud.toast('Antes, estaciona cerca y activa las luces de emergencia (Q)', 'bad', 3200); return; }
        const fx = Math.sin(this.p.heading), fz = Math.cos(this.p.heading);
        this.fx.push(G.addCones(this.center.x - fx * 12, this.center.z - fz * 12, this.p.heading));
        this.complete('secure'); this.fact('Zona señalizada con luces de emergencia y balizamiento.'); this.adj('seguridad', 0);
      } },
    ] });
    if (this.A.visible && !this.flags.attended) out.push({ npc: this.A, x: this.A.x, z: this.A.z, r: 2.4, label: `Hablar con ${this.A.name} (conductor A)`, actions: () => this.actA() });
    out.push({ npc: this.B, x: this.B.x, z: this.B.z, r: 2.4, label: `Hablar con ${this.B.name} (conductor B)`, actions: () => this.actB() });
    out.push({ npc: this.W, x: this.W.x, z: this.W.z, r: 2.4, label: `Hablar con ${this.W.name} (testigo)`, actions: () => this.actW() });
    for (const [car, lbl] of [[this.carA, 'A'], [this.carB, 'B']]) out.push({ x: car.x, z: car.z, r: 3.6, label: `Vehículo ${lbl}`, actions: () => this.actCar(car, lbl) });
    return out;
  }
  actA() {
    const a = [];
    a.push({ label: 'Preguntar cómo se encuentra', fn: () => {
      this.talkedA = true; this.flags.injured = true;
      this.say([{ who: 'Agente', text: 'Policía Local. Tranquilo, ya estamos aquí. ¿Cómo se encuentra? No se mueva si le duele algo.' }, { who: this.A.name, sub: 'dolorido', text: 'Me duele mucho el cuello... y estoy mareado. Fue todo muy rápido.' }], null, () => {
        this.fact(`${this.A.name} (conductor A) refiere dolor cervical y mareo.`); this.adj('comunicacion', 8);
        if (!this.objs.find((o) => o.id === 'amb')) this.obj('amb', 'Solicitar asistencia sanitaria para el herido');
        this.checkBoth();
      });
    } });
    a.push({ label: 'Pedir su versión de los hechos', fn: () => this.say([{ who: this.A.name, text: this.truth === 'A' ? 'Yo... iba despacio. Bueno, puede que me distrajera un segundo, pero él venía muy rápido.' : 'El otro coche se saltó el semáforo en rojo y me embistió. ¡No pude hacer nada!' }], null, () => { this.fact(`Declaración del conductor A: ${this.truth === 'A' ? 'admite una posible distracción' : 'afirma que B se saltó el semáforo en rojo'}.`); this.ev('declA', 'Declaración del conductor A'); }) });
    a.push({ label: 'Solicitar documentación', fn: () => { this.say([{ who: this.A.name, text: 'Tome, aquí tiene el carné y los papeles del coche.' }]); this.ev('docA', 'Documentación del conductor A'); } });
    if (this.flags.injured && !this.flags.ambulance) a.push({ label: 'Radio: solicitar ambulancia', fn: () => this.requestAmbulance() });
    return a;
  }
  actB() {
    const a = [];
    a.push({ label: 'Calmar y pedir su versión', fn: () => {
      this.talkedB = true;
      this.say([{ who: 'Agente', text: 'Entiendo que está nervioso. Vamos a aclararlo con calma; cuénteme qué ha pasado.' }, { who: this.B.name, sub: 'alterado', text: this.truth === 'B' ? '¡El semáforo estaba en ámbar, no en rojo! Y ese iba mirando el móvil, seguro.' : '¡Iba mirando el móvil! Se me ha echado encima sin frenar. Mire cómo me ha dejado el coche.' }], null, () => {
        this.B.state = 'idle'; this.adj('comunicacion', 10); this.fact(`Declaración del conductor B: culpa al conductor A de ir distraído${this.truth === 'B' ? '; admite que el semáforo estaba cambiando' : ''}.`); this.ev('declB', 'Declaración del conductor B'); this.checkBoth();
      });
    } });
    a.push({ label: 'Ordenarle que se calme o será sancionado', risky: true, fn: () => {
      this.talkedB = true;
      this.say([{ who: 'Agente', text: '¡Baje la voz ahora mismo o le sanciono!' }, { who: this.B.name, sub: 'molesto', text: 'Encima me grita a mí... Vale, vale. Ha sido culpa suya, punto.' }], null, () => { this.adj('comunicacion', -15, 'Trato autoritario innecesario con un implicado alterado.'); this.B.state = 'idle'; this.fact('Conductor B, alterado, culpa al conductor A.'); this.ev('declB', 'Declaración del conductor B'); this.checkBoth(); });
    } });
    a.push({ label: 'Solicitar documentación', fn: () => { this.say([{ who: this.B.name, text: 'Aquí tiene. El seguro está al día, ¿eh?' }]); this.ev('docB', 'Documentación del conductor B'); } });
    a.push({ label: 'Prueba de alcoholemia (preventiva)', fn: () => { const pos = Math.random() < 0.15; this.say([{ who: 'Agente', text: 'Por protocolo en accidentes, vamos a realizar una prueba de alcoholemia. Sople de forma continua.' }, { who: 'Etilómetro', text: pos ? 'Resultado: 0,32 mg/l en aire espirado (infracción administrativa).' : 'Resultado: 0,00 mg/l.' }]); this.ev('alcB', `Prueba de alcoholemia conductor B (${pos ? 'positiva 0,32' : 'negativa'})`, pos); this.fact(`Alcoholemia al conductor B: ${pos ? 'positiva (0,32 mg/l)' : 'negativa'}.`); this.flags.alcB = pos; this.adj('seguridad', 3); } });
    return a;
  }
  actW() {
    return [{ label: 'Identificarse y tomar declaración', fn: () => {
      this.W.state = 'idle';
      this.say([{ who: 'Agente', text: 'Buenas noches, Policía Local. ¿Ha visto lo que ha ocurrido?' }, { who: this.W.name, sub: 'testigo', text: this.truth === 'B' ? 'Sí, lo vi todo desde la parada. El sedán se saltó el semáforo en rojo, bastante rápido, y golpeó al pequeño.' : 'Sí. El conductor del compacto iba con el móvil en la mano, no vio que el otro estaba frenando y le dio por detrás.' }, { who: this.W.name, text: 'Puedo dejarle mis datos por si hacen falta.' }], null, () => {
        this.complete('witness'); this.flags.witness = true; this.adj('comunicacion', 6);
        this.fact(`Testigo independiente (${this.W.name}): ${this.truth === 'B' ? 'el conductor B rebasó el semáforo en rojo' : 'el conductor A circulaba utilizando el teléfono móvil'}.`);
        this.ev('declW', 'Declaración del testigo independiente');
      });
    } }, { label: 'Ignorar al testigo', risky: true, fn: () => { this.adj('resolucion', -5); this.G.hud.toast('El testigo se queda esperando…', 'bad'); } }];
  }
  actCar(car, lbl) {
    const a = [{ label: 'Fotografiar daños', fn: () => {
      if (this.flags['ph' + lbl]) { this.G.hud.toast('Ya fotografiado', 'info'); return; }
      this.flags['ph' + lbl] = true; this.photos++; this.G.audio.camera(); this.G.flashCamera();
      this.ev('ph' + lbl, `Fotografías de daños vehículo ${lbl} (${lbl === 'A' ? this.colA : this.colB})`);
      this.objs.find((o) => o.id === 'photos').text = `Documentar los daños de ambos vehículos (${this.photos}/2)`;
      if (this.photos >= 2) this.complete('photos'); else this.refresh();
    } }];
    if (lbl === 'A') a.push({ label: 'Examinar el interior', fn: () => {
      if (this.truth === 'A') { this.say([{ who: 'Agente', text: 'Hay un teléfono en el suelo del conductor, con una conversación de mensajería abierta.' }]); this.ev('phone', 'Teléfono móvil en uso (interior vehículo A)'); this.fact('En el vehículo A se observa un teléfono móvil con la aplicación de mensajería abierta.'); }
      else { this.say([{ who: 'Agente', text: 'Airbag activado. Nada fuera de lo normal en el interior.' }]); this.ev('airbag', 'Airbag activado en vehículo A', false); }
    } });
    if (lbl === 'B') a.push({ label: 'Examinar marcas de frenada', fn: () => { this.say([{ who: 'Agente', text: this.truth === 'B' ? 'Frenada larga antes del cruce: circulaba por encima del límite.' : 'No hay marcas de frenada significativas.' }]); this.ev('skid', 'Marcas de frenada en calzada', this.truth === 'B'); } });
    a.push({ label: 'Recoger ticket de aparcamiento del suelo', fn: () => this.ev('ticket', 'Ticket de aparcamiento encontrado en el suelo', false) });
    return a;
  }
  checkBoth() { if (this.talkedA && this.talkedB) this.complete('check'); }
  requestAmbulance() {
    if (this.flags.ambulance) return; this.flags.ambulance = true;
    this.G.radioMsg(`Unidad a central: solicito ambulancia en ${this.location}, un herido consciente con dolor cervical.`, 2, false);
    setTimeout(() => this.G.radioMsg('Central: recibido, ambulancia en camino. Tiempo estimado: un minuto.', 3, true), 2200);
    this.amb = this.G.spawnService('ambulance', this.center); this.services.push(this.amb);
    this.complete('amb'); this.adj('seguridad', 0); this.fact('Se solicita asistencia sanitaria para el conductor A.');
  }
  radioActions() { return this.flags.injured && !this.flags.ambulance ? [{ label: 'Solicitar ambulancia', fn: () => this.requestAmbulance() }] : []; }
  resolutions() {
    return [
      { label: 'Atestado: responsabilidad del conductor A', desc: 'Conducción distraída' },
      { label: 'Atestado: responsabilidad del conductor B', desc: 'Rebase de semáforo en rojo' },
      { label: 'Atestado sin determinar responsabilidad', desc: 'Pendiente de investigación' },
      { label: 'Detención del conductor B', desc: 'Por su actitud en la escena' },
    ];
  }
  judge(res, i) {
    const cons = []; const known = this.flags.witness || this.evidence.some((e) => e.key === 'phone' || (e.key === 'skid' && e.relevant));
    if (!this.flags.injured) { this.adj('seguridad', -25); cons.push('No se comprobó el estado de salud de los implicados.'); }
    if (this.flags.injured && !this.flags.ambulance) { this.adj('seguridad', -30); cons.push('Un herido quedó sin asistencia sanitaria.'); }
    if (i === 3) { this.adj('legalidad', -60); this.s.resolucion = 15; cons.push('Detención sin fundamento legal: la actitud alterada no constituye delito. Se abre expediente disciplinario.'); return { cons, title: 'Actuación desproporcionada' }; }
    const correct = this.truth === 'A' ? 0 : 1;
    if (i === correct && known) { this.s.resolucion = 95; cons.push('El atestado coincide con las pruebas. La aseguradora resuelve el siniestro con rapidez.'); return { cons, title: 'Atestado sólido' }; }
    if (i === correct && !known) { this.s.resolucion = 60; this.adj('legalidad', -20); cons.push('Conclusión acertada, pero sin pruebas suficientes que la sostengan.'); return { cons, title: 'Conclusión sin respaldo' }; }
    if (i === 2) { this.s.resolucion = known ? 55 : 70; cons.push(known ? 'Había pruebas suficientes para determinar la responsabilidad; el caso queda pendiente innecesariamente.' : 'Prudente ante la falta de testigos: el caso pasa a la unidad de atestados.'); return { cons, title: 'Caso pendiente' }; }
    this.s.resolucion = 25; this.adj('legalidad', -25); cons.push('El atestado atribuye la culpa al conductor equivocado. El caso será recurrido.');
    return { cons, title: 'Atestado erróneo' };
  }
}

// ---------------- M-02 Control de tráfico / conducción peligrosa ----------------
export class TrafficStop extends Mission {
  constructor(G) {
    const from = G.playerPos();
    super(G, { code: 'M-02', title: 'Conducción peligrosa', category: 'Tráfico', priority: 2, pos: { x: from.x + 1, z: from.z + 1 }, details: '' });
    this.col = pick(COLOR_NAMES); this.type = pick(['sedan', 'hatch', 'suv']); this.plate = plate();
    this.outcome = pick(['ok', 'ok', 'ok', 'seguro', 'permiso', 'robado']);
    this.flee = Math.random() < 0.22 || this.outcome === 'robado' && Math.random() < 0.5;
    this.driverName = fullName();
    this.car = G.traffic.spawnOne(from, 140, 300, { type: this.type, color: this.col[0], cruise: 15, flags: { mission: true, ignoreLights: true } });
    if (!this.car) this.car = G.traffic.spawnOne(from, 60, 400, { type: this.type, color: this.col[0], cruise: 15, flags: { mission: true, ignoreLights: true } });
    this.pos = { x: this.car.x, z: this.car.z }; this.location = G.city.locationName(this.pos.x, this.pos.z);
    this.details = `${MODEL_NAMES[this.type]} de color ${this.col[1]}, matrícula ${this.plate}, circulando a velocidad excesiva y rebasando semáforos en rojo.`;
  }
  cleanup() {
    super.cleanup();
    if (this.car && (this.car.flags.mission || this.car.state !== 'drive')) this.G.traffic.remove(this.car);
    clearTimeout(this.fleeTimer); this.G.pursuitInfo = null;
  }
  start() {
    this.obj('find', 'Localizar el vehículo descrito');
    this.obj('stop', 'Situarse detrás y darle el alto con las luces (Q)');
    this.obj('approach', 'Acercarse a la ventanilla del conductor');
    this.obj('docs', 'Solicitar documentación y consultar el vehículo');
    this.obj('decide', 'Resolver la intervención de forma proporcionada');
    this.searchT = 0;
  }
  tick(dt) {
    const G = this.G, c = this.car; if (!c) return;
    const p = G.playerPos(); const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (this.prisoner) this.prisonerTick();
    if (this.pursuit) { this.pursuitTick(dt); return; }
    if (this.flags.lost) return;
    if (!this.has('find')) {
      this.searchT -= dt; if (this.searchT <= 0) { this.searchT = 8; G.setSearchArea({ x: c.x + (Math.random() - 0.5) * 80, z: c.z + (Math.random() - 0.5) * 80, r: 75 }); }
      if (d < 45) { this.complete('find'); G.setSearchArea(null); this.fact(`Vehículo localizado: ${MODEL_NAMES[this.type]} ${this.col[1]} (${this.plate}). Se observa velocidad inadecuada.`); this.ev('obs', 'Observación directa de la infracción (velocidad/semáforo)'); }
    } else if (!this.has('stop')) {
      G.setTarget({ x: c.x, z: c.z, follow: c });
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading); const al = (p.x - c.x) * fx + (p.z - c.z) * fz;
      if (G.car.lights && !G.onFoot && d < 34 && al < 0) {
        if (this.flee) { this.startPursuit(); return; }
        if (c.state !== 'pullover' && c.state !== 'stopped') { c.state = 'pullover'; G.radioMsg(`Unidad a central: procedo a dar el alto al ${MODEL_NAMES[this.type]} ${this.plate}.`, 3); this.adj('seguridad', 0); }
      }
      if (c.state === 'stopped') { this.complete('stop'); this.fact('El conductor detiene el vehículo en el arcén tras la señal acústica y luminosa.'); }
      if (d > 520) { this.lost(); }
    } else if (!this.has('approach')) {
      G.setTarget(this.windowPos());
      if (this.officerNear(this.windowPos(), 2.2)) this.complete('approach');
    }
  }
  windowPos() { const c = this.car; const fx = Math.sin(c.heading), fz = Math.cos(c.heading); const rx = -fz, rz = fx; return { x: c.x - rx * 1.45 + fx * 0.3, z: c.z - rz * 1.45 + fz * 0.3 }; }
  lost() {
    this.G.radioMsg('Central: hemos perdido el rastro del vehículo. Se cierra el aviso.', 2); this.flags.lost = true; this.setReportReady();
  }
  startPursuit() {
    const G = this.G, c = this.car;
    c.state = 'flee'; c.cruise = 24; c.flags.ignoreLights = true;
    c.driver.chooser = (opts, drv) => {
      const pl = G.playerPos(); let best = opts[0], bs = -1e9;
      for (const d of opts) { const nx = CITY.HALF * 0 + (drv.bi + DIRS[d][0]) * CITY.PITCH - CITY.HALF, nz = (drv.bj + DIRS[d][1]) * CITY.PITCH - CITY.HALF; const s = Math.hypot(nx - pl.x, nz - pl.z) + Math.random() * 90; if (s > bs) { bs = s; best = d; } }
      return best;
    };
    this.pursuit = { lostT: 0, stuckT: 0, hits: 0 }; this.flags.fled = true;
    G.radioMsg(`Unidad a central: el ${MODEL_NAMES[this.type]} ${this.plate} se da a la fuga. Inicio persecución.`, 1, false);
    setTimeout(() => G.radioMsg('Central: recibido. Prioridad a la seguridad de terceros. Puede solicitar apoyo por radio (R).', 1, true), 1800);
    this.objs.find((o) => o.id === 'stop').text = 'Persecución: interceptar el vehículo con seguridad';
    this.refresh(); this.ev('flee', 'Registro de la fuga y persecución (cámara del vehículo)');
    this.fact('El conductor desobedece la orden de detención y huye a gran velocidad.');
  }
  pursuitTick(dt) {
    const G = this.G, c = this.car, P = this.pursuit; if (P.done) return;
    const p = G.playerPos(); const d = Math.hypot(p.x - c.x, p.z - c.z); G.pursuitInfo = { d };
    G.setTarget({ x: c.x, z: c.z, follow: c });
    if (c.stunT > 0 && !P.lastStun) { P.hits++; } P.lastStun = c.stunT > 0;
    if (c.speed < 1.2) P.stuckT += dt; else P.stuckT = Math.max(0, P.stuckT - dt * 0.5);
    if (d > 260) P.lostT += dt; else P.lostT = 0;
    if (P.hits >= 3 || P.stuckT > 2.2) this.bail();
    else if (P.lostT > 14) { P.done = true; G.pursuitInfo = null; c.flags.mission = false; this.lost(); this.flags.escaped = true; }
  }
  bail() {
    const G = this.G, c = this.car; this.pursuit.done = true; G.pursuitInfo = null;
    c.state = 'stopped'; c.hazard = false; c.static = true; c.blocking = true;
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading); const rx = -fz, rz = fx;
    const n = this.addNPC({ name: this.driverName, role: 'Sospechoso', x: c.x - rx * 1.6, z: c.z - rz * 1.6, state: 'run', mood: 'huida', shirt: 0x202020 });
    this.runner = n; this.runT = 0; G.radioMsg('Unidad a central: el conductor abandona el vehículo y huye a pie.', 1);
    this.objs.find((o) => o.id === 'approach').text = 'Interceptar al conductor huido a pie';
    this.complete('stop'); this.refresh();
    this.fleeFoot();
  }
  fleeFoot() {
    const n = this.runner; const G = this.G; const p = G.playerPos();
    const a = Math.atan2(n.x - p.x, n.z - p.z) + (Math.random() - 0.5) * 1.2;
    n.walkTo(n.x + Math.sin(a) * 30, n.z + Math.cos(a) * 30, true);
    n.restState = 'run';
    clearTimeout(this.fleeTimer); this.fleeTimer = setTimeout(() => { if (this.runner && !this.caught) this.fleeFoot(); }, 3500);
  }
  prisonerTick() {
    const G = this.G; const st = G.city.station.door;
    if (this.prisoner === 'transport' && Math.hypot(G.car.x - st.x, G.car.z - st.z) < 30 && !G.onFoot) {
      this.prisoner = 'delivered'; this.complete('custody'); this.fact('Detenido trasladado a comisaría e ingresado en calabozos con lectura de derechos.');
      G.radioMsg('Comisaría: detenido recibido y registrado en el libro de custodia.', 3); this.setReportReady();
    }
  }
  interactables() {
    const out = []; const G = this.G; const c = this.car;
    if (this.runner && !this.caught) {
      const n = this.runner;
      if (this.officerNear(n, 1.9)) out.push({ npc: n, x: n.x, z: n.z, r: 2, label: 'Interceptar y reducir al sospechoso', actions: () => [{ label: 'Reducir de forma controlada y esposar', fn: () => this.arrest(n, true) }] });
      return out;
    }
    if (this.has('approach') && !this.has('decide') && !this.flags.escaped) {
      const w = this.windowPos();
      out.push({ x: w.x, z: w.z, r: 2.4, label: `Conductor/a: ${this.driverName}`, actions: () => this.actDriver() });
    }
    if (this.detainee && this.prisoner === 'cuffed') out.push({ npc: this.detainee, x: this.detainee.x, z: this.detainee.z, r: 2.4, label: 'Detenido', actions: () => [{ label: 'Trasladar al vehículo policial', fn: () => this.toCar() }] });
    void G; void c;
    return out;
  }
  actDriver() {
    const a = []; const G = this.G;
    if (!this.flags.greet) a.push({ label: 'Saludar, identificarse y explicar el motivo', fn: () => { this.flags.greet = true; this.adj('comunicacion', 15); this.say([{ who: 'Agente', text: 'Buenas, Policía Local. Le hemos parado porque circulaba muy por encima del límite y ha rebasado un semáforo en rojo.' }, { who: this.driverName, sub: this.outcome === 'ok' ? 'nervioso' : 'evasivo', text: this.outcome === 'ok' ? 'Lo siento, agente, llego tarde al trabajo... no me he dado cuenta.' : 'Eh... ¿yo? Si iba normal. ¿Tardaremos mucho?' }]); } });
    if (!this.flags.docs) a.push({ label: 'Solicitar documentación (DNI, permiso, seguro)', fn: () => { this.flags.docs = true; if (!this.flags.greet) this.adj('comunicacion', -10, 'No se informó al conductor del motivo del control.'); this.say([{ who: this.driverName, text: this.outcome === 'permiso' ? 'Aquí tiene el DNI... el carné no lo llevo encima ahora mismo.' : 'Sí, claro. Aquí tiene.' }], null, () => { this.ev('docs', 'Documentación aportada por el conductor'); }); } });
    if (this.flags.docs && !this.flags.query) a.push({ label: 'Consultar matrícula y conductor (terminal)', fn: () => this.query() });
    if (!this.flags.alc) a.push({ label: 'Prueba de alcoholemia', fn: () => { this.flags.alc = true; this.alc = Math.random() < 0.2 ? 0.71 : 0; this.say([{ who: 'Etilómetro', text: this.alc ? `Resultado: ${this.alc.toFixed(2)} mg/l en aire espirado. Supera la tasa penal (0,60).` : 'Resultado: 0,00 mg/l.' }]); this.ev('alc', `Alcoholemia: ${this.alc ? this.alc.toFixed(2) + ' mg/l (delito)' : 'negativa'}`, !!this.alc); this.fact(`Prueba de alcoholemia: ${this.alc ? this.alc.toFixed(2) + ' mg/l, tasa penal' : 'negativa'}.`); } });
    if (this.flags.query || this.flags.docs) {
      a.push({ label: 'Advertencia verbal', fn: () => this.decide('warn') });
      a.push({ label: 'Formular denuncia administrativa', fn: () => this.decide('fine') });
      if (this.outcome === 'seguro') a.push({ label: 'Denuncia e inmovilización del vehículo', fn: () => this.decide('immob') });
      a.push({ label: 'Proceder a la detención', risky: true, fn: () => this.decide('arrest') });
    }
    void G;
    return a;
  }
  query() {
    const G = this.G; this.flags.query = true; G.radioMsg(`Unidad a central: consulta de matrícula ${this.plate} y titular.`, 3, false);
    setTimeout(() => {
      const msg = { ok: 'sin requisitorias. Seguro e ITV en vigor. Conductor con permiso vigente.', seguro: 'seguro obligatorio CADUCADO desde hace tres meses. Permiso vigente.', permiso: 'conductor con permiso RETIRADO por resolución judicial. Conducir constituye delito.', robado: 'vehículo con AVISO DE SUSTRACCIÓN desde ayer. Precaución.' }[this.outcome];
      G.radioMsg(`Central: matrícula ${this.plate}, ${msg}`, this.outcome === 'ok' ? 3 : 1, true);
      this.fact(`Consulta en base de datos: ${msg}`); this.ev('db', 'Resultado de la consulta en base de datos'); this.complete('docs');
      if (this.outcome === 'robado' && Math.random() < 0.5) { this.flee = true; this.car.state = 'drive'; this.car.static = false; this.car.lat = CITY.PARK - CITY.LANE_IN; this.car.latTarget = 0; this.startPursuit(); }
    }, 2600);
  }
  correctDecision() {
    if (this.alc) return ['arrest'];
    return { ok: ['fine'], seguro: ['immob', 'fine'], permiso: ['arrest'], robado: ['arrest'] }[this.outcome];
  }
  decide(kind) {
    const G = this.G; this.decision = kind; this.complete('decide');
    if (!this.flags.query) this.notes.push('No se consultó la base de datos antes de resolver.');
    if (kind === 'arrest') {
      const just = this.outcome === 'permiso' || this.outcome === 'robado' || this.alc;
      if (!just) this.notes.push('Detención sin causa legal suficiente.');
      this.say([{ who: 'Agente', text: 'Salga del vehículo, por favor. Queda usted detenido. Tiene derecho a guardar silencio y a ser asistido por un abogado.' }, { who: this.driverName, text: just ? 'Está bien... no voy a dar problemas.' : '¿Detenido? ¡Pero si sólo iba rápido!' }], null, () => {
        const w = this.windowPos(); const n = this.addNPC({ name: this.driverName, role: 'Detenido', x: w.x, z: w.z, state: 'idle', shirt: 0x445566 });
        this.arrest(n, false);
      });
    } else {
      const txt = { warn: 'Por esta vez quedará en una advertencia. Modere la velocidad, por favor.', fine: 'Le voy a formular una denuncia por exceso de velocidad y por rebasar un semáforo en rojo. Puede firmarla aquí.', immob: 'Además de la denuncia, el vehículo queda inmovilizado hasta que acredite un seguro en vigor.' }[kind];
      this.say([{ who: 'Agente', text: txt }, { who: this.driverName, text: kind === 'warn' ? 'Muchas gracias, agente. Tendré más cuidado.' : 'Vale... entendido.' }], null, () => {
        this.fact({ warn: 'Se resuelve con advertencia verbal.', fine: 'Se formula denuncia por velocidad y semáforo en rojo.', immob: 'Se formula denuncia y se inmoviliza el vehículo por carecer de seguro.' }[kind]);
        if (kind !== 'immob') { const c = this.car; c.static = false; c.state = 'drive'; c.hazard = false; c.cruise = 11; c.flags.ignoreLights = false; c.latTarget = 0; c.flags.mission = false; }
        this.setReportReady();
      });
    }
    void G;
  }
  arrest(n, chased) {
    this.caught = true; this.detainee = n; n.target = null; n.state = 'cuffed'; n.restState = 'cuffed'; this.G.audio.cuffs();
    this.prisoner = 'cuffed'; this.fact(chased ? 'El conductor es interceptado tras huir a pie y reducido de forma controlada.' : 'El conductor es detenido e informado de sus derechos.');
    if (chased) { this.complete('approach'); this.complete('docs'); this.complete('decide'); this.decision = 'arrest'; this.adj('seguridad', 0); }
    if (!this.objs.find((o) => o.id === 'custody')) this.obj('custody', 'Trasladar al detenido a comisaría');
    this.G.hud.toast('Detenido esposado · trasládalo al vehículo', 'info');
  }
  toCar() {
    const G = this.G; const n = this.detainee; const fx = Math.sin(G.car.h), fz = Math.cos(G.car.h); const rx = -fz, rz = fx;
    n.restState = 'cuffed'; n.walkTo(G.car.x + rx * 1.4 - fx * 0.6, G.car.z + rz * 1.4 - fz * 0.6);
    this.prisoner = 'walking';
    const chk = setInterval(() => { if (!n.target) { clearInterval(chk); n.visible = false; this.prisoner = 'transport'; G.audio.door(); G.hud.toast('Detenido a bordo · conduce hasta la comisaría', 'info'); G.setTarget(G.city.station.door); } }, 300);
  }
  radioActions() {
    if (this.pursuit && !this.pursuit.done && !this.flags.backup) return [{ label: 'Solicitar apoyo / control de carretera', fn: () => this.backup() }];
    return [];
  }
  backup() {
    const G = this.G; this.flags.backup = true; this.adj('seguridad', 0);
    G.radioMsg('Unidad a central: solicito unidades de apoyo y control en la ruta del sospechoso.', 1, false);
    setTimeout(() => {
      if (!this.pursuit || this.pursuit.done) return;
      const c = this.car; const drv = c.driver; const d = drv.dir; const [dx, dz] = DIRS[d];
      // control en el tramo siguiente
      const ni = drv.bi + dx, nj = drv.bj + dz;
      if (ni < 0 || nj < 0 || ni >= CITY.N || nj >= CITY.N) return;
      const x0 = (drv.bi * CITY.PITCH - CITY.HALF) + dx * 40, z0 = (drv.bj * CITY.PITCH - CITY.HALF) + dz * 40;
      const h = Math.atan2(dx, dz) + Math.PI / 2;
      const rx = -dz, rz = dx;
      for (const o of [-4.5, 0, 4.5]) this.addCar('sedan', 0xf4f6f8, { x: x0 + rx * o, z: z0 + rz * o, heading: h + (Math.random() - 0.5) * 0.2 }, { police: true }).blocking = true;
      this.cars.slice(-3).forEach((k) => (k.hazard = true));
      G.radioMsg(`Unidad 23: control establecido en ${G.city.locationName(x0, z0)}.`, 1, true);
      this.fact('Unidades de apoyo establecen un control en la ruta de huida.');
      c.driver.chooser = null; c.driver.route = [d];
    }, 9000);
  }
  resolutions() {
    return [
      { label: 'Advertencia verbal', desc: 'Sin sanción' },
      { label: 'Denuncia administrativa', desc: 'Velocidad / semáforo' },
      { label: 'Denuncia e inmovilización', desc: 'Falta de seguro obligatorio' },
      { label: 'Detención por delito contra la seguridad vial', desc: 'Permiso retirado, alcohol o fuga' },
      { label: 'Recuperación de vehículo sustraído y detención', desc: 'Aviso de robo' },
      { label: 'Vehículo no localizado / huido', desc: 'Cierre sin intervención' },
    ];
  }
  judge(res, i) {
    const cons = [];
    if (this.flags.escaped || this.flags.lost && !this.caught) {
      this.s.resolucion = i === 5 ? 40 : 15; cons.push(i === 5 ? 'El vehículo no pudo ser interceptado. Se emite aviso a todas las unidades.' : 'El informe no refleja que el vehículo huyó.');
      return { cons, title: 'Vehículo huido' };
    }
    const map = { warn: 0, fine: 1, immob: 2, arrest: this.outcome === 'robado' ? 4 : 3 };
    const correct = this.correctDecision();
    const ok = correct.includes(this.decision);
    if (this.decision === 'arrest' && !ok) { this.adj('legalidad', -55); cons.push('La detención carecía de fundamento: una infracción administrativa no justifica privar de libertad.'); }
    if (this.decision === 'warn' && this.outcome !== 'ok') { this.adj('legalidad', -25); cons.push('Se dejó marchar a un conductor con irregularidades graves.'); }
    if (this.decision === 'warn' && this.outcome === 'ok') { this.s.resolucion = 70; cons.push('Advertencia aceptable, aunque la infracción observada era grave.'); }
    if (ok) { this.s.resolucion = 95; cons.push('Resolución proporcionada y ajustada a los hechos comprobados.'); }
    else if (this.s.resolucion < 50) this.s.resolucion = 45;
    if (this.flags.fled) { cons.push(this.flags.backup ? 'Coordinación con unidades de apoyo durante la persecución.' : 'Persecución resuelta sin apoyo: riesgo elevado para terceros.'); if (!this.flags.backup) this.adj('seguridad', -10); }
    if (this.prisoner === 'delivered') cons.push('Cadena de custodia del detenido correctamente documentada.');
    if (map[this.decision] !== i) { this.adj('legalidad', -10); cons.push('La resolución del informe no coincide con la actuación realizada.'); }
    return { cons, title: ok ? 'Intervención correcta' : 'Intervención mejorable' };
  }
}

// ---------------- M-03 Hurto en comercio ----------------
export class Theft extends Mission {
  constructor(G) {
    const from = G.playerPos();
    const shops = G.city.shops.filter((s) => { const d = Math.hypot(s.x - from.x, s.z - from.z); return d > 140 && d < 420; });
    const shop = pick(shops.length ? shops : G.city.shops);
    super(G, { code: 'M-03', title: 'Hurto en comercio', category: 'Delitos patrimoniales', priority: 3, pos: { x: shop.x, z: shop.z }, details: `El responsable de «${shop.name}» informa de la sustracción de un objeto. El autor ha huido a pie.` });
    this.shop = shop; this.guilty = Math.random() < 0.75;
  }
  start() {
    const G = this.G, s = this.shop;
    this.keeper = this.addNPC({ name: fullName(), role: 'Comerciante', x: s.x, z: s.z, state: 'phone', shirt: 0xe6e6e6, pants: 0x2b2b2b });
    this.keeper.face(s.x + s.nx * 5, s.z + s.nz * 5);
    this.arrivalPos = s; this.arrivalR = 25; G.setTarget(s);
    // sospechoso caminando por la manzana
    const blk = G.city.blockObjAt(s.x - s.nx * 6, s.z - s.nz * 6) || G.city.blocks[0];
    this.blk = blk;
    const corner = (k) => { const a = 34.2; const c = [[-a, -a], [a, -a], [a, a], [-a, a]][k % 4]; return { x: blk.cx + c[0], z: blk.cz + c[1] }; };
    const startK = (Math.random() * 4) | 0;
    const c0 = corner(startK);
    this.suspect = this.addNPC({ name: fullName(), role: 'Persona descrita', x: c0.x, z: c0.z, state: 'walk', shirt: 0xb01515, pants: 0x1c2433, cap: 0x111111 });
    this.decoy = this.addNPC({ name: fullName(), role: 'Viandante', x: corner(startK + 2).x, z: corner(startK + 2).z, state: 'walk', shirt: 0xa01818, pants: 0x30405a });
    this.route = [1, 2, 3, 0].map((k) => corner(startK + k)); this.ri = 0;
    this.droute = [3, 2, 1, 0].map((k) => corner(startK + 2 + k)); this.di = 0;
    this.obj('arrive', 'Acudir al comercio');
    this.obj('keeper', 'Entrevistar al comerciante');
    this.obj('find', 'Localizar a la persona descrita');
    this.obj('identify', 'Identificar y entrevistar al sospechoso');
    this.obj('resolve', 'Resolver con proporcionalidad');
    this.obj('return', 'Devolver el objeto recuperado al comercio', true);
  }
  tick() {
    const s = this.suspect;
    if (s.visible && !s.target && !this.stopped) { const p = this.route[this.ri++ % 4]; s.walkTo(p.x, p.z); s.restState = 'walk'; }
    if (!this.decoyStopped && !this.decoy.target) { const p = this.droute[this.di++ % 4]; this.decoy.walkTo(p.x, p.z); this.decoy.restState = 'walk'; }
    if (this.has('keeper') && !this.has('find')) {
      const p = this.G.playerPos(); if (Math.hypot(p.x - s.x, p.z - s.z) < 18) { this.complete('find'); this.G.setSearchArea(null); }
    }
    if (this.fleeing && this.caught === undefined) {
      const p = this.G.playerPos(); if (!s.target) { const a = Math.atan2(s.x - p.x, s.z - p.z) + (Math.random() - 0.5); s.walkTo(s.x + Math.sin(a) * 25, s.z + Math.cos(a) * 25, true); }
    }
    if (this.prisoner === 'transport' && !this.G.onFoot && Math.hypot(this.G.car.x - this.G.city.station.door.x, this.G.car.z - this.G.city.station.door.z) < 30) {
      this.prisoner = 'delivered'; this.complete('custody'); this.fact('Detenido trasladado a comisaría.'); this.setReportReady();
    }
    if (this.has('resolve')) { const cust = this.objs.find((o) => o.id === 'custody'); if (!cust || cust.done) this.setReportReady(); }
  }
  interactables() {
    const out = [];
    out.push({ npc: this.keeper, x: this.keeper.x, z: this.keeper.z, r: 2.5, label: `Hablar con ${this.keeper.name} (comerciante)`, actions: () => this.actKeeper() });
    if (this.has('keeper')) {
      if (this.suspect.visible && this.caught !== true) out.push({ npc: this.suspect, x: this.suspect.x, z: this.suspect.z, r: this.fleeing ? 1.9 : 2.6, label: this.fleeing ? 'Interceptar al sospechoso' : 'Persona con sudadera roja y gorra', actions: () => this.actSuspect() });
      if (this.caught && this.prisoner === 'cuffed') out.push({ npc: this.suspect, x: this.suspect.x, z: this.suspect.z, r: 2.4, label: 'Detenido', actions: () => [{ label: 'Trasladar al vehículo policial', fn: () => this.toCar() }] });
      out.push({ npc: this.decoy, x: this.decoy.x, z: this.decoy.z, r: 2.4, label: 'Viandante con camiseta roja', actions: () => this.actDecoy() });
    }
    return out;
  }
  actKeeper() {
    const a = [];
    if (!this.has('keeper')) a.push({ label: 'Tomar declaración', fn: () => {
      this.keeper.state = 'talk';
      this.say([{ who: 'Agente', text: 'Buenas, Policía Local. ¿Qué ha ocurrido?' }, { who: this.keeper.name, sub: 'comerciante', text: 'Un chico joven, con sudadera roja y gorra negra, ha cogido unos auriculares de 89 euros del expositor y ha salido andando deprisa.' }, { who: this.keeper.name, text: 'Ha girado la esquina hace un par de minutos. Tengo la grabación de la cámara si la necesitan.' }], null, () => {
        this.keeper.state = 'idle'; this.complete('keeper'); this.adj('comunicacion', 6);
        this.fact('Comerciante: sustracción de auriculares (89 €). Autor: varón joven, sudadera roja y gorra negra.');
        this.G.setTarget(null); this.G.setSearchArea({ x: this.blk.cx, z: this.blk.cz, r: 60 });
      });
    } });
    if (this.has('keeper') && !this.flags.video) a.push({ label: 'Revisar la grabación de seguridad', fn: () => { this.flags.video = true; this.say([{ who: 'Agente', text: 'En las imágenes se ve con claridad a una persona con sudadera roja y gorra negra guardando un objeto en la mochila.' }]); this.ev('video', 'Grabación de la cámara de seguridad del comercio'); this.fact('La grabación muestra al autor con gorra negra guardando el objeto en una mochila.'); } });
    if (this.recovered && !this.has('return')) a.push({ label: 'Devolver los auriculares', fn: () => { this.complete('return'); this.adj('resolucion', 0); this.say([{ who: this.keeper.name, text: '¡Muchísimas gracias! Pasaré mañana por comisaría a firmar la denuncia.' }]); this.fact('Objeto recuperado y devuelto a su propietario.'); } });
    return a;
  }
  actSuspect() {
    const a = [];
    const s = this.suspect;
    if (this.fleeing) return [{ label: 'Reducir de forma controlada y esposar', fn: () => this.arrest(true) }];
    if (!this.stopped) a.push({ label: 'Dar el alto e identificarse con calma', fn: () => {
      this.stopped = true; s.target = null; s.state = 'idle'; s.face(this.G.officer.x, this.G.officer.z); this.complete('identify');
      this.say([{ who: 'Agente', text: 'Disculpe, Policía Local. ¿Puede detenerse un momento?' }, { who: s.name, sub: this.guilty ? 'nervioso' : 'sorprendido', text: this.guilty ? '¿Qué pasa? Yo no he hecho nada... tengo prisa.' : '¿Sí? ¿Ocurre algo, agente?' }]);
      this.adj('comunicacion', 6);
    } });
    if (!this.stopped) a.push({ label: 'Gritarle que se detenga', risky: true, fn: () => {
      this.stopped = true; this.adj('comunicacion', -12, 'Abordaje brusco que provocó la huida.');
      if (this.guilty) { this.flee(); } else { s.target = null; s.state = 'hands'; s.restState = 'idle'; setTimeout(() => (s.state = 'idle'), 2500); this.complete('identify'); this.say([{ who: s.name, text: '¡Vale, vale! ¿Qué he hecho?' }]); }
    } });
    if (this.stopped) {
      if (!this.flags.idS) a.push({ label: 'Solicitar documentación', fn: () => { this.flags.idS = true; this.say([{ who: s.name, text: 'Aquí tiene mi DNI.' }]); this.ev('idS', 'Identificación del sospechoso (DNI)'); this.fact(`Identificado: ${s.name}.`); } });
      if (!this.flags.ask) a.push({ label: 'Preguntar por el hurto', fn: () => { this.flags.ask = true; this.say([{ who: s.name, text: this.guilty ? 'No sé de qué me habla. Yo sólo estaba paseando.' : 'Ni he entrado en esa tienda. Vengo del gimnasio, mire.' }]); } });
      if (!this.flags.search) a.push({ label: 'Pedir consentimiento para revisar la mochila', fn: () => {
        this.flags.search = true;
        if (this.guilty) { this.say([{ who: s.name, text: 'Bueno... vale.' }, { who: 'Agente', text: 'Hay unos auriculares precintados con la etiqueta antirrobo del comercio y sin ticket.' }]); this.ev('item', 'Auriculares con etiqueta antirrobo (recuperados)'); this.recovered = true; this.fact('En la mochila se hallan los auriculares sustraídos, con la etiqueta del comercio.'); }
        else { this.say([{ who: s.name, text: 'Claro, mire. Sólo llevo la ropa del gimnasio.' }, { who: 'Agente', text: 'No hay nada relacionado con el hurto.' }]); this.fact('Registro voluntario de la mochila: sin hallazgos.'); this.ev('noitem', 'Registro de mochila sin hallazgos', false); }
      } });
      a.push({ label: 'Denuncia por delito leve y citación', fn: () => this.resolve('cite') });
      a.push({ label: 'Proceder a la detención', risky: true, fn: () => this.resolve('arrest') });
      a.push({ label: 'Disculparse y dejarle marchar', fn: () => this.resolve('release') });
    }
    return a;
  }
  actDecoy() {
    const d = this.decoy;
    return [{ label: 'Dar el alto y preguntar', fn: () => {
      this.decoyStopped = true; d.target = null; d.state = 'idle'; d.face(this.G.officer.x, this.G.officer.z);
      this.say([{ who: d.name, text: '¿Yo? No llevo gorra y vengo del trabajo... aquí tiene mi DNI si quiere.' }], [
        { label: 'Agradecer y dejarle seguir', fn: () => { this.adj('comunicacion', 5); this.decoyStopped = false; this.fact('Se descarta a un viandante que no coincide con la descripción.'); } },
        { label: 'Detenerle igualmente', risky: true, fn: () => { this.adj('legalidad', -45, 'Se detuvo a una persona que no coincidía con la descripción.'); this.wrongArrest = true; d.state = 'cuffed'; this.G.audio.cuffs(); this.G.hud.toast('Detención sin indicios…', 'bad'); } },
      ]);
    } }];
  }
  flee() { this.fleeing = true; this.flags.fledOnce = true; const s = this.suspect; s.restState = 'run'; this.G.radioMsg('Unidad: el sospechoso huye a pie.', 1); this.fact('El sospechoso emprende la huida al ser requerido.'); }
  resolve(kind) {
    this.decision = kind; this.complete('resolve');
    const s = this.suspect;
    if (kind === 'arrest') { if (!this.recovered && !this.fleeing) this.notes.push('Detención sin indicios suficientes.'); this.arrest(false); return; }
    this.say([{ who: 'Agente', text: kind === 'cite' ? 'Le informo de que va a ser denunciado por un delito leve de hurto. Recibirá una citación del juzgado.' : 'Disculpe las molestias. Puede continuar.' }], null, () => {
      s.state = 'walk'; this.stopped = false; s.restState = 'walk';
      this.fact(kind === 'cite' ? 'Se formula denuncia por delito leve de hurto y se cita al autor.' : 'Se deja marchar a la persona identificada.');
    });
  }
  arrest(chased) {
    const s = this.suspect; this.caught = true; this.fleeing = false; s.target = null; s.state = 'cuffed'; s.restState = 'cuffed'; this.G.audio.cuffs();
    this.prisoner = 'cuffed'; if (chased) { this.decision = 'arrest'; this.complete('identify'); this.complete('resolve'); this.fact('Sospechoso interceptado tras la huida.'); }
    if (!this.objs.find((o) => o.id === 'custody')) this.obj('custody', 'Trasladar al detenido a comisaría');
  }
  toCar() {
    const G = this.G, n = this.suspect; const fx = Math.sin(G.car.h), fz = Math.cos(G.car.h);
    n.walkTo(G.car.x + fz * 1.4 - fx * 0.6, G.car.z - fx * 1.4 - fz * 0.6); this.prisoner = 'walking';
    const chk = setInterval(() => { if (!n.target) { clearInterval(chk); n.visible = false; this.prisoner = 'transport'; G.audio.door(); G.setTarget(G.city.station.door); G.hud.toast('Detenido a bordo · conduce a comisaría', 'info'); } }, 300);
  }
  resolutions() {
    return [
      { label: 'Denuncia por delito leve de hurto y citación', desc: 'Valor inferior a 400 €' },
      { label: 'Detención por hurto', desc: 'Huida o falta de identificación' },
      { label: 'Persona identificada no relacionada', desc: 'Sin indicios' },
      { label: 'Autor no localizado', desc: 'Se tramita denuncia' },
    ];
  }
  judge(res, i) {
    const cons = [];
    if (this.wrongArrest) cons.push('Un ciudadano inocente fue detenido: queja formal ante Asuntos Internos.');
    const guiltyKnown = this.recovered || this.flags.video;
    let correct;
    if (this.guilty) correct = this.fleeing || this.flags.fledOnce || (this.decision === 'arrest' && this.caught && !this.recovered) ? [1, 0] : [0];
    else correct = [2];
    if (this.guilty && this.caught && this.decision === 'arrest' && this.recovered && !this.flags.fledOnce) { cons.push('El hurto es un delito leve: la detención no era necesaria con el autor identificado.'); this.adj('legalidad', -15); }
    if (this.decision === 'arrest' && !this.guilty) { this.adj('legalidad', -55); cons.push('Detención de una persona inocente.'); }
    if (this.decision === 'release' && this.guilty && this.recovered) { this.adj('legalidad', -20); cons.push('Se dejó marchar al autor con el objeto sustraído en su poder.'); }
    if (correct.includes(i)) { this.s.resolucion = guiltyKnown || !this.guilty ? 95 : 70; cons.push(this.guilty ? 'El juzgado admite la denuncia con pruebas sólidas.' : 'Se evitó una actuación injusta contra un ciudadano.'); }
    else this.s.resolucion = 35;
    if (this.has('return')) cons.push('El comerciante valora muy positivamente la actuación (+reputación de distrito).');
    return { cons, title: correct.includes(i) ? 'Caso resuelto' : 'Resolución discutible' };
  }
}

// ---------------- M-04 Alteración vecinal ----------------
export class Dispute extends Mission {
  constructor(G) {
    const from = G.playerPos();
    const doors = G.city.doors.filter((d) => { const dd = Math.hypot(d.x - from.x, d.z - from.z); return dd > 150 && dd < 430; });
    const door = pick(doors.length ? doors : G.city.doors);
    super(G, { code: 'M-04', title: 'Alteración vecinal', category: 'Orden público', priority: 3, pos: { x: door.x, z: door.z }, details: 'Varios vecinos alertan de una fuerte discusión en el portal. Posible aviso repetido.' });
    this.door = door; this.truth = Math.random() < 0.55 ? 'ruido' : 'empujon';
  }
  start() {
    const G = this.G, d = this.door; const tx = -d.nz, tz = d.nx;
    this.P1 = this.addNPC({ name: fullName(), role: 'Vecino del 2.º', x: d.x + tx * 0.8, z: d.z + tz * 0.8, state: 'argue', shirt: 0x3d6b4a });
    this.P2 = this.addNPC({ name: fullName(), role: 'Vecina del 3.º', x: d.x - tx * 0.8, z: d.z - tz * 0.8, state: 'argue', shirt: 0x6a4c93, pants: 0x2b2b2b });
    this.P1.face(this.P2.x, this.P2.z); this.P2.face(this.P1.x, this.P1.z);
    this.N = this.addNPC({ name: fullName(), role: 'Vecina testigo', x: d.x + d.nx * 3 + tx * 5, z: d.z + d.nz * 3 + tz * 5, state: 'idle', shirt: 0xc08a3e });
    this.N.face(d.x, d.z);
    this.arrivalPos = d; this.arrivalR = 25; G.setTarget(d);
    this.obj('arrive', 'Acudir al domicilio');
    this.obj('separate', 'Separar a las partes');
    this.obj('v1', 'Escuchar la versión del vecino del 2.º');
    this.obj('v2', 'Escuchar la versión de la vecina del 3.º');
    this.obj('neighbor', 'Hablar con la vecina testigo', true);
    this.obj('resolve', 'Proponer una solución proporcionada');
  }
  tick() { if (this.has('resolve')) this.setReportReady(); }
  interactables() {
    const out = [];
    for (const [n, k] of [[this.P1, 'v1'], [this.P2, 'v2']]) out.push({ npc: n, x: n.x, z: n.z, r: 2.4, label: `Hablar con ${n.name} (${n.role})`, actions: () => this.actParty(n, k) });
    out.push({ npc: this.N, x: this.N.x, z: this.N.z, r: 2.4, label: `Hablar con ${this.N.name} (testigo)`, actions: () => this.actN() });
    return out;
  }
  actParty(n, k) {
    const a = [];
    if (!this.has('separate')) {
      a.push({ label: 'Pedir calma y separarlos', fn: () => {
        this.complete('separate'); this.adj('comunicacion', 12);
        const d = this.door; const tx = -d.nz, tz = d.nx;
        this.P1.walkTo(d.x + tx * 5 + d.nx * 1.5, d.z + tz * 5 + d.nz * 1.5); this.P2.walkTo(d.x - tx * 5 + d.nx * 1.5, d.z - tz * 5 + d.nz * 1.5);
        this.P1.restState = 'idle'; this.P2.restState = 'idle';
        this.say([{ who: 'Agente', text: 'Buenas noches. Vamos a bajar el tono. Ustedes dos, un momento por separado y les escucho a ambos.' }]);
        this.fact('A la llegada, las partes discuten acaloradamente en el portal. Se separa a ambas.');
      } });
      a.push({ label: 'Amenazar con detenerlos a los dos', risky: true, fn: () => { this.complete('separate'); this.adj('comunicacion', -18, 'Intimidación innecesaria durante la mediación.'); this.P1.state = 'idle'; this.P2.state = 'idle'; this.say([{ who: 'Agente', text: '¡Basta ya! Como sigan así se vienen los dos a comisaría.' }, { who: n.name, text: 'Vale, vale... tampoco hace falta ponerse así.' }]); } });
      return a;
    }
    if (!this.has(k)) a.push({ label: 'Escuchar su versión', fn: () => {
      n.talkT = 5;
      const t = k === 'v1'
        ? (this.truth === 'ruido' ? 'Llevo tres noches sin dormir. Ponen música altísima hasta las tres de la mañana y hoy he subido a quejarme.' : 'Le he pedido que bajara la música y me ha empujado contra la puerta. Mire, tengo un rasguño en el brazo.')
        : (this.truth === 'ruido' ? 'Era un cumpleaños, ¡un día al año! Y este señor ha venido aporreando la puerta a gritos.' : 'Él ha empezado a gritarme. Yo sólo le he apartado, no le he empujado... bueno, un poco.');
      this.say([{ who: n.name, sub: n.role, text: t }], null, () => {
        this.complete(k); this.adj('comunicacion', 4);
        this.fact(`${n.role}: ${k === 'v1' ? (this.truth === 'ruido' ? 'denuncia ruidos reiterados de madrugada' : 'afirma haber sido empujado y presenta un rasguño') : (this.truth === 'ruido' ? 'reconoce una celebración con música alta' : 'reconoce haberle apartado físicamente')}.`);
        this.ev('decl' + k, `Declaración: ${n.role}`);
      });
    } });
    if (k === 'v1' && this.has('v1') && this.truth === 'empujon' && !this.flags.injury) a.push({ label: 'Valorar la lesión y ofrecer asistencia', fn: () => { this.flags.injury = true; this.adj('seguridad', 0); this.say([{ who: 'Agente', text: 'Es un rasguño superficial. ¿Quiere que avisemos a los sanitarios o que le acompañemos al centro de salud?' }, { who: n.name, text: 'No hace falta, pero quiero que conste.' }]); this.ev('injury', 'Fotografía de la lesión (rasguño en el brazo)'); this.fact('Se observa un rasguño superficial en el brazo del vecino del 2.º. Rehúsa asistencia sanitaria.'); } });
    return a;
  }
  actN() {
    if (this.has('neighbor')) return [{ label: 'Agradecer la colaboración', fn: () => this.say([{ who: this.N.name, text: 'De nada, a ver si se arregla.' }]) }];
    return [{ label: 'Preguntar qué ha visto u oído', fn: () => {
      this.say([{ who: this.N.name, sub: 'testigo', text: this.truth === 'ruido' ? 'La música se oye en todo el edificio casi todos los fines de semana. Hoy sólo ha habido gritos, nadie se ha tocado.' : 'He bajado al oír golpes y he visto cómo ella le empujaba contra la puerta. Luego ya se gritaban los dos.' }], null, () => {
        this.complete('neighbor'); this.ev('declN', 'Declaración de la vecina testigo');
        this.fact(this.truth === 'ruido' ? 'Testigo: ruidos reiterados; no hubo agresión física.' : 'Testigo: presenció el empujón de la vecina del 3.º.');
      });
    } }, ...this.resolveOptions()];
  }
  resolveOptions() {
    if (!this.has('v1') || !this.has('v2') || this.has('resolve')) return [];
    return [
      { label: 'Mediar y advertir a ambas partes', fn: () => this.resolve('mediar') },
      { label: 'Denuncia por ordenanza de ruidos', fn: () => this.resolve('ruido') },
      { label: 'Denuncia por delito leve de lesiones', fn: () => this.resolve('lesiones') },
      { label: 'Detener a la vecina del 3.º', risky: true, fn: () => this.resolve('detener') },
    ];
  }
  interactablesExtra() { return []; }
  resolve(kind) {
    this.decision = kind; this.complete('resolve');
    const txt = { mediar: 'Les propongo que cada uno respete los horarios de descanso. Si se repite, habrá denuncia. ¿De acuerdo?', ruido: 'Voy a tramitar una denuncia por infracción de la ordenanza municipal de ruidos. Les pido que bajen la música.', lesiones: 'Por el empujón, se tramitará una denuncia por delito leve. El juzgado les citará a ambos.', detener: 'Queda usted detenida por agresión.' }[kind];
    this.say([{ who: 'Agente', text: txt }], null, () => { this.P1.state = 'idle'; this.P2.state = kind === 'detener' ? 'cuffed' : 'idle'; this.fact({ mediar: 'Mediación entre las partes con advertencia formal.', ruido: 'Denuncia por infracción de la ordenanza de ruidos.', lesiones: 'Denuncia por delito leve de lesiones / maltrato de obra.', detener: 'Detención de la vecina del 3.º.' }[kind]); });
  }
  resolutions() {
    return [
      { label: 'Mediación y advertencia', desc: 'Conflicto resuelto en el lugar' },
      { label: 'Denuncia administrativa por ruidos', desc: 'Ordenanza municipal' },
      { label: 'Denuncia por delito leve de lesiones', desc: 'Agresión leve acreditada' },
      { label: 'Detención', desc: 'Delito grave o flagrante' },
    ];
  }
  judge(res, i) {
    const cons = []; const map = { mediar: 0, ruido: 1, lesiones: 2, detener: 3 };
    const correct = this.truth === 'ruido' ? [1, 0] : [2];
    if (this.decision === 'detener' || i === 3) { this.adj('legalidad', -45); cons.push('Una detención por un conflicto vecinal leve es desproporcionada.'); }
    if (this.truth === 'empujon' && this.decision === 'mediar') { this.adj('legalidad', -15); cons.push('Hubo una agresión leve acreditada que debía documentarse.'); }
    if (correct.includes(i)) { this.s.resolucion = i === correct[0] ? 95 : 80; cons.push(this.truth === 'ruido' ? 'Los vecinos aceptan la solución y no se repiten avisos en el edificio.' : 'El juzgado recibe una denuncia bien documentada.'); }
    else this.s.resolucion = 40;
    if (map[this.decision] !== undefined && map[this.decision] !== i) { this.adj('informe', 0); cons.push('El informe no coincide con la solución aplicada en el lugar.'); this.adj('legalidad', -5); }
    if (!this.has('neighbor')) cons.push('No se contrastó la versión con la testigo disponible.');
    return { cons, title: correct.includes(i) ? 'Convivencia restablecida' : 'Resolución mejorable' };
  }
}
// las opciones de resolución también desde cualquiera de las partes
const _ap = Dispute.prototype.actParty;
Dispute.prototype.actParty = function (n, k) { return [..._ap.call(this, n, k), ...this.resolveOptions()]; };

// ---------------- M-09 Persecución (vehículo sustraído localizado) ----------------
export class Pursuit extends TrafficStop {
  constructor(G) {
    super(G); this.code = 'M-09'; this.title = 'Vehículo sustraído'; this.category = 'Emergencias'; this.priority = 1;
    this.outcome = 'robado'; this.flee = true;
    this.details = `Cámaras de tráfico detectan un ${MODEL_NAMES[this.type]} ${this.col[1]} (${this.plate}) con denuncia de robo. Aproximación con precaución.`;
  }
  start() { super.start(); }
}

export const MISSION_TYPES = [Accident, TrafficStop, Theft, Dispute, Pursuit];

export function makeDispatch(G, forced) {
  const r = Math.random();
  let C = forced;
  if (!C) {
    const hour = G.env.hour; const night = hour > 21 || hour < 6;
    const pool = night ? [Accident, TrafficStop, Dispute, Dispute, Pursuit, Theft] : [Accident, Accident, TrafficStop, Theft, Theft, Pursuit, Dispute];
    C = pool[(r * pool.length) | 0];
    if (G.lastMissionType === C && Math.random() < 0.7) C = pool[((r * pool.length) | 0 + 1) % pool.length];
  }
  const m = new C(G);
  return m;
}

export function sceneProps(scene) {
  // conos de balizamiento reutilizables
  const cone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xff4a0a, roughness: 0.5 }));
  body.position.y = 0.33; const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.125, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.5, emissive: 0x333333 }));
  band.position.y = 0.38; const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })); base.position.y = 0.02;
  cone.add(body, band, base); cone.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  void scene; void CITY_NAME;
  return { cone };
}
