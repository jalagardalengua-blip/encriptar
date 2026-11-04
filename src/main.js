// POLICE: LIFE ON DUTY — demo técnica web (Three.js)
import * as THREE from 'three';
import { QUALITY, defaultQuality, CITY, clamp, damp, lerp, wrapAngle, mulberry32 } from './config.js';
import { City } from './city.js';
import { Environment, WEATHER_KEYS, weatherLabel } from './environment.js';
import { Post } from './post.js';
import { CarRig, DriveCar, Traffic, ServiceCar } from './vehicles.js';
import { Humanoid, Crowd, NPC } from './people.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { HUD, rankOf } from './hud.js';
import { makeDispatch } from './missions.js';
import { Particles, SkidMarks, Beacon, makeCones, makeDebris } from './fx.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

const settings = Object.assign({ quality: defaultQuality(), volume: 0.8, voice: true, grain: true, shake: true, redblue: false, sens: 1, timeScale: 60, fps: false }, store.get('pold_settings', {}));
const URLP = new URLSearchParams(location.search);
if (URLP.get('q') && QUALITY[URLP.get('q')]) settings.quality = URLP.get('q');
const Q = QUALITY[settings.quality] || QUALITY.alto;
const MANUAL = URLP.has('manual');

const DISTRICT = { residencial: 'Barrio de San Telmo', ocio: 'Zona de Ocio · La Ribera', centro: 'Centro Financiero', industrial: 'Polígono Industrial', puerto: 'Puerto de Valmora', parque: 'Parque de la Alameda', comisaria: 'Comisaría Central', hospital: 'Hospital de Valmora' };

class Game {
  constructor() {
    this.canvas = $('c');
    this.audio = new AudioSys(); this.audio.voice = settings.voice; this.audio.volume = settings.volume;
    this.input = new Input(this.canvas);
    this.hud = new HUD(this.audio);
    this.state = 'loading'; this.elapsed = 0; this.rnd = mulberry32(Date.now() & 0xffff);
    this.npcs = []; this.services = []; this.fxList = [];
    this.save = store.get('pold_save_v1', null);
    this.officerName = 'Agente R. Vega (U-12)';
  }

  async boot() {
    const prog = (p, l) => { $('loadbar').style.width = `${Math.round(p * 100)}%`; $('loadlbl').textContent = l; };
    prog(0.02, 'Iniciando WebGL 2…');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, Q.pixelRatio));
    r.setSize(innerWidth, innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 6000);
    this.env = new Environment(r, this.scene, Q);
    this.env.timeScale = settings.timeScale;
    this.city = new City(this.scene, Q, prog);
    await this.city.build();
    prog(0.78, 'Tráfico y peatones…'); await tick();
    this.traffic = new Traffic(this.scene, this.city, Q);
    this.traffic.spawnParked();
    const sp = this.city.spawn;
    this.traffic.spawnTraffic(Q.traffic, sp);
    this.crowd = new Crowd(this.scene, this.city, Q.peds);
    prog(0.84, 'Coche patrulla y agente…'); await tick();
    this.buildPlayer();
    this.fx = { smoke: new Particles(this.scene, 900, { color: new THREE.Color(0.55, 0.55, 0.57) }), tire: new Particles(this.scene, 500, { color: new THREE.Color(0.8, 0.8, 0.82) }), sparks: new Particles(this.scene, 300, { additive: true, color: new THREE.Color(6, 3, 0.8) }), skids: new SkidMarks(this.scene), beacon: new Beacon(this.scene), emitters: [] };
    this.post = new Post(r, this.scene, this.camera, Q);
    this.post.hideForAO([this.env.sky, this.env.clouds, this.env.stars, this.env.moon, this.env.rain, this.env.splash, ...this.city.fxObjects, ...this.traffic.fx, this.fx.smoke.points, this.fx.tire.points, this.fx.sparks.points, this.fx.beacon.group, ...this.rig.fxObjs]);
    this.post.setSize(innerWidth, innerHeight);
    if (!settings.grain) { this.post.grade.uniforms.uGrain.value = 0; this.post.grade.uniforms.uCA.value = 0; }
    this.hud.buildMap(this.city);
    prog(0.9, 'Compilando shaders…'); await tick();
    this.camState = { mode: 'foot', yaw: Math.PI, pitch: 0.25, dist: 3.8, carYaw: 0, carMode: 0, shake: 0, idle: 0, fov: 62 };
    this.placeAtStation();
    this.env.setHour(22.5); this.env.setWeather('lluvia', true);
    this.env.update(0.01, this.camera.position, null);
    try { r.compile(this.scene, this.camera); } catch (e) { /* ok */ }
    prog(1, 'Listo');
    addEventListener('resize', () => this.resize());
    this.bindUI();
    this.last = performance.now();
    this.frames = 0; this.fpsT = 0;
    if (!MANUAL) this.renderer.setAnimationLoop(() => this.frame());
    this.step = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) { this.last = performance.now() - dt * 1000; this.frame(); } };
    this.ready = true;
    setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 800); this.showMenu(); }, 300);
  }

  buildPlayer() {
    const rig = this.rig = new CarRig('sedan', 0xf4f6f8, { police: true });
    this.scene.add(rig.root);
    const s = this.city.spawn.car;
    this.car = new DriveCar(this.city, rig, s.x, s.z, s.heading);
    this.car.isPlayer = true; this.car.W = rig.spec.W;
    // faros
    const head = this.headlight = new THREE.SpotLight(0xfff2dd, 0, 75, 0.55, 0.55, 1.4);
    head.position.set(0, 0.75, 2.2); head.target.position.set(0, 0, 22); rig.body.add(head, head.target);
    if (Q.ao) { head.castShadow = true; head.shadow.mapSize.set(512, 512); head.shadow.bias = -0.0005; head.shadow.camera.near = 0.5; }
    this.beaconL = new THREE.PointLight(0x2050ff, 0, 32, 1.8); this.beaconR = new THREE.PointLight(0x2050ff, 0, 32, 1.8);
    const by = rig.spec.roof[2][1] + 0.3; this.beaconL.position.set(0.5, by, -0.3); this.beaconR.position.set(-0.5, by, -0.3); rig.body.add(this.beaconL, this.beaconR);
    // conos volumétricos de faros
    const cg = new THREE.ConeGeometry(2.6, 16, 24, 1, true); cg.translate(0, -8, 0); cg.rotateX(-Math.PI / 2 - 0.04);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uO: { value: 0 } },
      vertexShader: 'varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vD = position.z/16.0; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float uO; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN,vV)), 2.0); float a = uO*(1.0-vD)*(1.0-vD)*f*0.16; gl_FragColor = vec4(vec3(1.0,0.95,0.85)*a, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const beams = [];
    for (const x of [0.58, -0.58]) { const m = new THREE.Mesh(cg, this.beamMat); m.position.set(x, 0.68, 2.3); m.renderOrder = 3; rig.body.add(m); beams.push(m); }
    rig.fxObjs = beams;
    // agente
    this.officer = new Humanoid({ officer: true, skin: 0xe0ac87, hair: 0x2a1d14 });
    this.scene.add(this.officer.root);
    this.onFoot = true; this.inCar = false;
    this.traffic.extra = [this.car];
  }

  placeAtStation() {
    const s = this.city.spawn;
    this.car.x = s.car.x; this.car.z = s.car.z; this.car.h = s.car.heading; this.car.vx = this.car.vz = 0; this.car.w = 0;
    this.car.lights = false; this.car.siren = false;
    this.officer.x = s.x; this.officer.z = s.z; this.officer.heading = s.heading; this.onFoot = true; this.inCar = false; this.officer.root.visible = true;
    this.camState.mode = 'foot'; this.camState.yaw = Math.PI;
    this.car.update(0.016, { throttle: 0, brake: 0, steer: 0, handbrake: false }, 0, []);
  }

  // ---------- Interfaz ----------
  bindUI() {
    const sel = (id, v, cb) => { const el = $(id); el.querySelectorAll('.opt').forEach((b) => { b.classList.toggle('sel', b.dataset.v === String(v)); b.onclick = () => { el.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); this.audio.click(); cb(b.dataset.v); }; }); };
    this.shiftCfg = { hour: 22.5, weather: 'lluvia', assist: 'arcade' };
    sel('opt-hour', 22.5, (v) => (this.shiftCfg.hour = +v));
    sel('opt-weather', 'lluvia', (v) => (this.shiftCfg.weather = v));
    sel('opt-assist', 'arcade', (v) => (this.shiftCfg.assist = v));
    sel('opt-quality', settings.quality, (v) => { if (v !== settings.quality) { settings.quality = v; store.set('pold_settings', settings); location.reload(); } });
    const open = (id) => $(id).classList.remove('hidden'); const close = (id) => $(id).classList.add('hidden');
    $('m-new').onclick = () => { this.audio.init(); this.mode = 'career'; this.save = { xp: 0, cases: 0, history: [] }; open('shift'); };
    $('m-free').onclick = () => { this.audio.init(); this.mode = 'free'; if (!this.save) this.save = { xp: 0, cases: 0, history: [] }; open('shift'); };
    $('m-continue').onclick = () => { this.audio.init(); this.mode = 'career'; open('shift'); };
    $('m-settings').onclick = () => { this.audio.init(); open('settings'); };
    $('m-controls').onclick = () => open('controls');
    $('shift-back').onclick = () => close('shift');
    $('shift-go').onclick = () => { close('shift'); this.startShift(); };
    $('settings-close').onclick = () => { close('settings'); store.set('pold_settings', settings); };
    $('controls-close').onclick = () => close('controls');
    const vol = $('s-vol'); vol.value = settings.volume; vol.oninput = () => { settings.volume = +vol.value; this.audio.setVolume(settings.volume); };
    const bind = (id, key, fn) => { const el = $(id); el.checked = settings[key]; el.onchange = () => { settings[key] = el.checked; fn?.(el.checked); }; };
    bind('s-voice', 'voice', (v) => (this.audio.voice = v));
    bind('s-grain', 'grain', (v) => { this.post.grade.uniforms.uGrain.value = v ? 0.045 : 0; this.post.grade.uniforms.uCA.value = v ? 0.0018 : 0; });
    bind('s-shake', 'shake'); bind('s-redblue', 'redblue'); bind('s-fps', 'fps', (v) => $('fps').classList.toggle('hidden', !v));
    $('fps').classList.toggle('hidden', !settings.fps);
    const sens = $('s-sens'); sens.value = settings.sens; sens.oninput = () => (settings.sens = +sens.value);
    const ts = $('s-time'); ts.value = settings.timeScale; ts.oninput = () => { settings.timeScale = +ts.value; this.env.timeScale = settings.timeScale; };
    $('p-resume').onclick = () => this.resume();
    $('p-settings').onclick = () => open('settings');
    $('p-controls').onclick = () => open('controls');
    $('p-weather').onclick = () => { const i = (WEATHER_KEYS.indexOf(this.env.weatherKey) + 1) % WEATHER_KEYS.length; this.env.setWeather(WEATHER_KEYS[i]); this.hud.toast(`Clima: ${weatherLabel(WEATHER_KEYS[i])}`); };
    $('p-time').onclick = () => { this.env.setHour(this.env.hour + 3); };
    $('p-reset').onclick = () => { this.resetToCar(); this.resume(); };
    $('p-quit').onclick = () => { $('pause').classList.add('hidden'); this.endShift(); };
    if (this.save && this.save.xp !== undefined) { $('m-continue').disabled = false; $('m-continue-sub').textContent = `${rankOf(this.save.xp).name} · ${this.save.xp} XP · ${this.save.cases} casos`; }
  }

  showMenu() {
    this.state = 'menu'; this.hud.show(false); $('menu').classList.remove('hidden');
    this.menuT = 0; this.input.wantLock = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.car.lights = true; this.car.siren = false;
  }

  startShift() {
    $('menu').classList.add('hidden');
    this.env.setHour(this.shiftCfg.hour); this.env.setWeather(this.shiftCfg.weather, true);
    this.assist = this.shiftCfg.assist;
    this.placeAtStation();
    this.mission = null; this.nextCall = this.mode === 'career' && (this.save.cases || 0) === 0 ? 14 : 10; this.pendingDispatch = null;
    this.shiftStats = { cases: 0, xp: 0, grades: [] };
    this.state = 'play'; this.hud.show(true); this.input.wantLock = true;
    this.car.lights = false;
    this.tutorial = (this.save.cases || 0) === 0;
    const h = this.env.hour; const turno = h >= 6 && h < 14 ? 'mañana' : h >= 14 && h < 21 ? 'tarde' : 'noche';
    setTimeout(() => this.radioMsg(`Central a unidad doce: ${turno === 'noche' ? 'buenas noches' : turno === 'tarde' ? 'buenas tardes' : 'buenos días'}, agente. Turno de ${turno} iniciado en el distrito de Valmora. ${this.env.w.rain ? 'Precaución, calzada mojada.' : 'Sin incidencias destacables.'}`, 3, true), 900);
    this.hud.toast('Turno iniciado', 'info');
    this.idleObjectives();
  }

  idleObjectives() {
    if (this.mission) return;
    const list = [];
    if (this.onFoot) list.push({ text: 'Sube a tu vehículo patrulla (F)', done: false });
    else list.push({ text: 'Sube a tu vehículo patrulla (F)', done: true });
    list.push({ text: 'Patrulla el distrito y espera avisos de la central', done: false });
    list.push({ text: 'Pulsa R para solicitar un aviso por radio', done: false, optional: true });
    this.hud.objectives('Patrulla preventiva', list);
  }

  resume() { $('pause').classList.add('hidden'); this.state = 'play'; this.input.wantLock = true; }
  pause() { if (this.state !== 'play') return; this.state = 'pause'; $('pause').classList.remove('hidden'); $('pause-info').textContent = `${this.officerName} · ${rankOf(this.save.xp).name} · ${this.save.xp} XP · Casos del turno: ${this.shiftStats.cases}`; if (document.pointerLockElement) document.exitPointerLock(); }

  endShift() {
    if (this.mission) { this.mission.cleanup(); this.mission = null; }
    this.hud.closeDispatch(false);
    const s = this.shiftStats;
    const avg = s.grades.length ? s.grades.reduce((a, b) => a + b, 0) / s.grades.length : 0;
    this.hud.openResults({ title: 'Fin de turno', sub: `${s.cases} intervenciones cerradas · ${this.officerName}`, grade: !s.cases ? '—' : avg >= 90 ? 'A' : avg >= 75 ? 'B' : avg >= 60 ? 'C' : 'D', scores: [{ label: 'Casos cerrados', value: Math.min(100, s.cases * 20) }, { label: 'Calidad media', value: Math.round(avg) }], consequences: [s.cases ? 'Tu actuación queda registrada en tu expediente profesional.' : 'Turno sin intervenciones registradas.', `Rango actual: ${rankOf(this.save.xp).name}.`], xp: s.xp, rank: rankOf(this.save.xp).name }, () => { this.hud.show(false); this.showMenu(); });
    store.set('pold_save_v1', this.save);
    $('m-continue').disabled = false; $('m-continue-sub').textContent = `${rankOf(this.save.xp).name} · ${this.save.xp} XP · ${this.save.cases} casos`;
    this.state = 'modal';
  }

  // ---------- API para misiones ----------
  playerPos() { return this.onFoot ? { x: this.officer.x, z: this.officer.z } : { x: this.car.x, z: this.car.z }; }
  clock() { const h = Math.floor(this.env.hour), m = Math.floor((this.env.hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
  radioMsg(text, prio = 3, speak = false) { const from = text.split(':')[0]; const body = text.includes(':') ? text.slice(text.indexOf(':') + 1).trim() : text; this.hud.radio(from.length < 30 ? from : 'Radio', body, prio, speak); }
  addNPC(o) { const n = new NPC(this.scene, this.city, o); this.npcs.push(n); return n; }
  removeNPC(n) { n.dispose(); this.npcs = this.npcs.filter((x) => x !== n); }
  spawnService(kind, target) {
    const [ti, tj] = this.city.nearestNode(target.x, target.z);
    const cands = [];
    for (let i = 0; i < CITY.N; i++) for (let j = 0; j < CITY.N; j++) { const d = Math.abs(i - ti) + Math.abs(j - tj); if (d >= 2 && d <= 3) cands.push([i, j]); }
    const from = cands[(Math.random() * cands.length) | 0] || [0, 0];
    const s = new ServiceCar(this.scene, this.city, kind, from, target); this.services.push(s); this.traffic.extra.push(s); return s;
  }
  removeService(s) { s.dispose(this.scene); this.services = this.services.filter((x) => x !== s); this.traffic.extra = this.traffic.extra.filter((x) => x !== s); }
  addSmoke(x, y, z, rate = 1) { const e = { type: 'smoke', x, y, z, rate, acc: 0 }; this.fx.emitters.push(e); return e; }
  addCones(x, z, h) { const g = makeCones(this.scene, x, z, h); return { type: 'obj', obj: g }; }
  addDebris(x, z) { return { type: 'obj', obj: makeDebris(this.scene, x, z) }; }
  removeFx(f) { if (!f) return; if (f.type === 'obj') this.scene.remove(f.obj); else this.fx.emitters = this.fx.emitters.filter((e) => e !== f); }
  setTarget(t) { this.target = t; this.routeT = 0; }
  setSearchArea(a) { this.searchArea = a; }
  flashCamera() { this.camFlash = 1; }

  // ---------- Bucle principal ----------
  frame() {
    const now = performance.now(); let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.frames++; this.fpsT += dt; if (this.fpsT > 0.5) { if (settings.fps) $('fps').textContent = `${Math.round(this.frames / this.fpsT)} FPS · ${this.renderer.info.render.calls} draw calls · ${settings.quality}`; this.frames = 0; this.fpsT = 0; }
    const paused = this.state === 'pause' || this.state === 'loading';
    if (paused) dt = 0;
    this.elapsed += dt;
    const I = this.input;
    if (I.hit('Escape', 'KeyP')) {
      if (this.hud.wheelOpen) this.hud.closeWheel();
      else if (this.state === 'play' && !this.hud.dialogActive) this.pause();
      else if (this.state === 'pause') this.resume();
    }
    if (I.hit('F2')) { this.photoMode = !this.photoMode; this.hud.show(!this.photoMode && this.state === 'play'); }
    if (this.state === 'play') this.updatePlay(dt);
    else if (this.state === 'menu') this.updateMenu(dt);
    else if (this.state === 'modal') this.updateWorldOnly(dt);
    this.render(dt);
    I.endFrame();
  }

  updateMenu(dt) {
    this.menuT += dt;
    this.car.update(dt, { throttle: 0, brake: 0, steer: 0, handbrake: false }, 0, []);
    this.updateCarLights(dt);
    this.officer.x = this.car.x + 2.2; this.officer.z = this.car.z - 1.5; this.officer.heading = -2.2; this.officer.state = 'idle'; this.officer.update(dt); this.officer.root.visible = true;
    const a = this.menuT * 0.08 + 2.2; const r = 9.5;
    this.camera.position.set(this.car.x + Math.sin(a) * r, 2.2 + Math.sin(this.menuT * 0.2) * 0.4, this.car.z + Math.cos(a) * r);
    this.camera.lookAt(this.car.x, 1.0, this.car.z);
    this.camera.fov = 50; this.camera.updateProjectionMatrix();
    this.updateWorldOnly(dt, true);
  }

  updateWorldOnly(dt, menu = false) {
    this.env.update(dt, this.camera.position, this.audio, null);
    this.city.update(dt, this.elapsed, this.env);
    this.traffic.update(dt, this.elapsed, { player: this.car, sirenOn: false, night: this.env.night, peds: null });
    this.crowd.update(dt, { player: this.officer, playerCar: null, camPos: this.camera.position, events: [] });
    for (const n of this.npcs) n.update(dt);
    for (const s of this.services) s.update(dt, this.elapsed, this.traffic.cars, this.env.night);
    this.updateFx(dt);
    if (!menu) this.updateCarLights(dt);
    this.audio.update(dt, { inCar: false, rpm: 0, throttle: 0, speed: 0, slip: 0, siren: false, farSiren: 0 });
  }

  updatePlay(dt) {
    const I = this.input; const hud = this.hud; const car = this.car;
    const blocked = hud.dialogActive || hud.wheelOpen || hud.choosing || !$('report').classList.contains('hidden') || !$('results').classList.contains('hidden') || !$('bigmap').classList.contains('hidden');
    // diálogo y rueda
    if (hud.choosing) { for (let k = 1; k <= 6; k++) if (I.hit('Digit' + k, 'Numpad' + k)) hud.pickChoice(k - 1); }
    else if (hud.dialogActive && I.hit('KeyE', 'Space', 'Enter')) hud.nextLine();
    if (hud.wheelOpen) for (let k = 1; k <= 8; k++) if (I.hit('Digit' + k, 'Numpad' + k)) hud.pickWheel(k - 1);
    if (hud.dispatchOpen) { if (I.hit('KeyY')) hud.closeDispatch(true); else if (I.hit('KeyN')) hud.closeDispatch(false); }
    hud.tickDispatch(dt);
    if (I.hit('KeyM') && !hud.dialogActive) { const bm = $('bigmap'); bm.classList.toggle('hidden'); if (!bm.classList.contains('hidden')) this.drawBigMap(); }
    // entrada de conducción / a pie
    const [ax, ay] = blocked ? [0, 0] : I.axes();
    const [lx, ly] = I.look();
    const cs = this.camState; const sens = 0.0028 * settings.sens;
    cs.yaw -= lx * sens; cs.pitch = clamp(cs.pitch + ly * sens, -0.35, 1.1);
    if (Math.abs(lx) + Math.abs(ly) > 0) cs.idle = 0; else cs.idle += dt;
    let throttle = 0, brake = 0, steer = 0, hb = false;
    if (this.inCar && !blocked) {
      throttle = Math.max(0, ay); brake = Math.max(0, -ay); steer = -ax; hb = I.down('Space');
      if (this.assist === 'arcade') steer *= 1; else steer *= 0.85;
      if (I.hit('KeyQ')) { car.lights = !car.lights; this.audio.click(); if (!car.lights) car.siren = false; }
      if (I.hit('KeyH')) { car.siren = !car.siren; if (car.siren) car.lights = true; this.audio.click(); }
      if (I.hit('KeyJ')) { this.audio.sirenMode = (this.audio.sirenMode + 1) % 3; this.hud.toast(['Sirena: bitonal', 'Sirena: wail', 'Sirena: yelp'][this.audio.sirenMode], 'info', 1200); }
      if (I.hit('KeyL')) car.headlights = !car.headlights;
      if (I.hit('KeyG')) this.audio.horn(1.3);
      if (I.hit('KeyC')) cs.carMode = (cs.carMode + 1) % 3;
    }
    const wet = this.env.cur.wet;
    car.update(dt, { throttle, brake, steer, handbrake: hb, reverseOk: false }, wet * (this.assist === 'sim' ? 1.2 : 0.8), this.inCar || Math.abs(car.vLong) > 0.2 ? this.traffic.cars.concat(this.traffic.parked, this.services) : []);
    if (car.impact > 2.5) { this.audio.impact(car.impact); cs.shake = Math.min(1, car.impact * 0.06); this.sparkBurst(car); if (this.mission && car.impact > 5) { this.mission.adj('seguridad', -3); } }
    // a pie
    if (this.onFoot) this.updateOfficer(dt, blocked ? [0, 0] : [ax, ay], blocked ? false : I.down('ShiftLeft', 'ShiftRight'));
    else { this.officer.x = car.x; this.officer.z = car.z; }
    // subir / bajar
    if (!blocked && I.hit('KeyF')) this.toggleCar();
    // interacción
    this.updateInteraction(blocked);
    // radio
    if (!blocked && I.hit('KeyR')) this.openRadio();
    // informe
    if (!blocked && I.hit('KeyI')) { if (this.mission?.canReport()) this.openReport(); else if (this.mission) hud.toast('Aún no puedes cerrar el informe: completa los objetivos principales', 'bad'); }
    // mundo
    this.env.update(dt, this.camera.position, this.audio, this.inCar ? new THREE.Vector3(car.vx, 0, car.vz) : null);
    this.city.update(dt, this.elapsed, this.env);
    const events = []; this.traffic.events = events;
    this.traffic.update(dt, this.elapsed, { player: car, sirenOn: car.siren && this.inCar, night: this.env.night, peds: this.npcs.filter((n) => n.visible) });
    this.crowd.update(dt, { player: this.onFoot ? this.officer : null, playerCar: this.inCar ? car : null, camPos: this.camera.position, events });
    for (const n of this.npcs) if (!this.mission || !this.mission.npcs.includes(n)) n.update(dt);
    for (const s of this.services) s.update(dt, this.elapsed, this.traffic.cars.concat([car]), this.env.night);
    this.handleEvents(events);
    // despacho y misiones
    this.updateDispatch(dt);
    if (this.mission) this.mission.update(dt);
    else if (this.tutorialRefresh !== this.onFoot) { this.tutorialRefresh = this.onFoot; this.idleObjectives(); }
    this.updateCarLights(dt);
    this.updateFx(dt);
    this.updateCamera(dt);
    this.updateHUD(dt);
    // audio
    let farSiren = 0; for (const s of this.services) { const d = Math.hypot(s.x - this.camera.position.x, s.z - this.camera.position.z); farSiren = Math.max(farSiren, clamp(1 - d / 260, 0, 1)); }
    this.audio.update(dt, { inCar: this.inCar, rpm: car.rpm, throttle, speed: car.speed, slip: car.slip, wet: wet > 0.4, siren: car.siren, farSiren });
  }

  updateOfficer(dt, [ax, ay], run) {
    const o = this.officer; const cs = this.camState;
    const fx = Math.sin(cs.yaw), fz = Math.cos(cs.yaw); const rx = -fz, rz = fx;
    let mx = fx * ay + rx * ax, mz = fz * ay + rz * ax; const l = Math.hypot(mx, mz);
    const target = l > 0.1 ? (run ? 5.4 : 1.75) * Math.min(1, l) : 0;
    o.speed = damp(o.speed, target, 8, dt);
    if (l > 0.1) { mx /= l; mz /= l; o.heading += wrapAngle(Math.atan2(mx, mz) - o.heading) * Math.min(1, dt * 10); o.mvx = mx; o.mvz = mz; }
    if (o.speed > 0.05) {
      o.x += (o.mvx || 0) * o.speed * dt; o.z += (o.mvz || 0) * o.speed * dt;
      o.state = o.speed > 3 ? 'run' : 'walk';
    } else o.state = this.camFlashT > 0 ? 'photo' : 'idle';
    const p = { x: o.x, z: o.z }; this.city.resolveCircle(p, 0.32);
    // coches
    for (const c of this.traffic.cars.concat(this.traffic.parked, [this.car], this.services)) {
      const dx = p.x - c.x, dz = p.z - c.z; if (dx * dx + dz * dz > 16) continue;
      const h = c.heading ?? c.h; const cf = [Math.sin(h), Math.cos(h)];
      const al = dx * cf[0] + dz * cf[1], la = dx * -cf[1] + dz * cf[0];
      const hl = (c.L || 4.6) / 2 + 0.3, hw = (c.W || 1.8) / 2 + 0.3;
      if (Math.abs(al) < hl && Math.abs(la) < hw) {
        const pa = hl - Math.abs(al), pl = hw - Math.abs(la);
        if (pa < pl) { const s = Math.sign(al); p.x += cf[0] * s * pa; p.z += cf[1] * s * pa; } else { const s = Math.sign(la); p.x += -cf[1] * s * pl; p.z += cf[0] * s * pl; }
      }
    }
    o.x = p.x; o.z = p.z; o.y = damp(o.y, this.city.groundY(o.x, o.z), 12, dt);
    o.update(dt);
  }

  toggleCar() {
    const car = this.car; const o = this.officer;
    if (this.onFoot) {
      const fx = Math.sin(car.h), fz = Math.cos(car.h); const lx = fz, lz = -fx; // izquierda del coche (+X local)
      const door = { x: car.x + lx * 1.3 + fx * 0.3, z: car.z + lz * 1.3 + fz * 0.3 };
      if (Math.hypot(o.x - door.x, o.z - door.z) < 2.6 || Math.hypot(o.x - car.x, o.z - car.z) < 3.0) {
        this.onFoot = false; this.inCar = true; o.root.visible = false; this.audio.door(); this.camState.carYaw = car.h; this.camState.mode = 'car';
        this.input.wantLock = true;
      } else this.hud.toast('Acércate a la puerta del conductor del coche patrulla', 'info', 1500);
    } else {
      if (car.speed > 3) { this.hud.toast('Detén el vehículo para bajar', 'info', 1200); return; }
      const fx = Math.sin(car.h), fz = Math.cos(car.h); const lx = fz, lz = -fx;
      o.x = car.x + lx * 1.4 + fx * 0.4; o.z = car.z + lz * 1.4 + fz * 0.4; o.heading = car.h + Math.PI / 2;
      const p = { x: o.x, z: o.z }; this.city.resolveCircle(p, 0.3); o.x = p.x; o.z = p.z;
      this.onFoot = true; this.inCar = false; o.root.visible = true; this.audio.door(); this.camState.mode = 'foot'; this.camState.yaw = car.h; this.camState.pitch = 0.2;
    }
  }

  resetToCar() {
    const car = this.car; car.vx = car.vz = 0; car.w = 0;
    const seg = this.city.randomRoadPoint(this.rnd, 0, 60, { x: car.x, z: car.z });
    if (seg) { car.x = seg.x; car.z = seg.z; car.h = seg.heading; }
    this.onFoot = false; this.inCar = true; this.officer.root.visible = false; this.camState.mode = 'car';
  }

  updateInteraction(blocked) {
    this.interact = null;
    if (blocked) { this.hud.prompt(null); return; }
    let best = null, bd = 1e9; const p = this.playerPos();
    const list = this.mission ? this.mission.interactables() : [];
    if (this.onFoot) {
      for (const it of list) { const d = Math.hypot(p.x - it.x, p.z - it.z); if (d < (it.r || 2.5) && d < bd) { bd = d; best = it; } }
      const st = this.city.station.door;
      if (!this.mission && Math.hypot(p.x - st.x, p.z - st.z) < 4) best = { label: 'Comisaría: terminar turno', actions: () => [{ label: 'Terminar turno', fn: () => this.endShift() }, { label: 'Seguir patrullando', fn: () => {} }] };
      const car = this.car; if (!best && Math.hypot(p.x - car.x, p.z - car.z) < 3.2) { this.hud.prompt('<span class="kbd">F</span> Subir al coche patrulla'); return; }
    } else {
      for (const it of list) if (it.inCar) { const d = Math.hypot(p.x - it.x, p.z - it.z); if (d < (it.r || 6) && d < bd) { bd = d; best = it; } }
    }
    if (!best) { this.hud.prompt(this.mission?.canReport() ? '<span class="kbd">I</span> Redactar informe' : null); return; }
    this.interact = best;
    this.hud.prompt(`<span class="kbd">E</span> ${best.label}`);
    if (this.input.hit('KeyE')) {
      const acts = best.actions(); if (!acts.length) return;
      if (best.npc) best.npc.face(this.officer.x, this.officer.z);
      if (acts.length === 1) acts[0].fn();
      else this.hud.openWheel(best.label, acts, (o) => o.fn());
    }
  }

  openRadio() {
    const opts = [];
    if (!this.mission && !this.hud.dispatchOpen) opts.push({ label: 'Solicitar aviso a la central', fn: () => { this.radioMsg('Unidad doce: disponible, en patrulla. Solicito aviso.', 3); this.nextCall = Math.min(this.nextCall, 3); } });
    if (this.mission) opts.push(...(this.mission.radioActions?.() || []));
    opts.push({ label: 'Comunicar posición', fn: () => this.radioMsg(`Unidad doce: en ${this.city.locationName(this.playerPos().x, this.playerPos().z)}.`, 3) });
    if (this.mission) opts.push({ label: 'Cancelar intervención', fn: () => { this.radioMsg('Unidad doce: abandono la intervención. Solicito relevo.', 2); this.hud.toast('Intervención abandonada', 'bad'); this.mission.cleanup(); this.mission = null; this.nextCall = 30; this.hud.objectives(null); this.idleObjectives(); } });
    opts.push({ label: 'Cerrar', fn: () => {} });
    this.hud.openWheel('Radio · canal 2', opts, (o) => o.fn());
  }

  updateDispatch(dt) {
    if (this.mission || this.hud.dispatchOpen) return;
    this.nextCall -= dt;
    if (this.nextCall > 0) return;
    const m = makeDispatch(this);
    m.distance = Math.hypot(m.pos.x - this.playerPos().x, m.pos.z - this.playerPos().z);
    this.audio.radio(); this.audio.say(`Central a unidades. Aviso de ${m.category.toLowerCase()}: ${m.title}. ${m.location.replace(/\bAv\./g, 'Avenida')}.`);
    this.hud.dispatch({ category: m.category, priority: m.priority, title: `${m.code} · ${m.title}`, details: m.details, location: m.location, distance: m.distance }, () => {
      this.mission = m; this.lastMissionType = m.constructor; m.startTime = this.elapsed; m.start(); m.refresh();
      this.radioMsg(`Unidad doce: recibido, me dirijo a ${m.location}.`, 3);
      if (m.priority === 1) this.hud.toast('Aviso prioritario: usa luces y sirena (Q / H)', 'info', 3000);
    }, () => { m.cleanup(); this.nextCall = 20 + Math.random() * 15; this.radioMsg('Central: recibido, asignamos otra unidad.', 3); });
  }

  openReport() {
    const m = this.mission; const data = m.reportData();
    this.hud.openReport(data, (res, ev) => {
      const r = m.evaluate(res, ev);
      this.save.xp += r.xp; this.save.cases = (this.save.cases || 0) + 1; (this.save.history = this.save.history || []).push({ code: m.code, grade: r.grade, avg: Math.round(r.avg) });
      this.shiftStats.cases++; this.shiftStats.xp += r.xp; this.shiftStats.grades.push(r.avg);
      store.set('pold_save_v1', this.save);
      const before = this.rankBefore ?? rankOf(this.save.xp - r.xp).index; const after = rankOf(this.save.xp);
      if (after.index > before) r.cons.unshift(`¡Ascenso! Nuevo rango: ${after.name}.`);
      if (r.grade === 'S' || r.grade === 'A') this.audio.success(); else if (r.grade === 'D') this.audio.fail();
      this.hud.openResults({ title: r.title, sub: r.sub, grade: r.grade, scores: r.scores, consequences: r.cons, xp: r.xp, rank: after.name }, () => {
        m.cleanup(); this.mission = null; this.hud.objectives(null); this.nextCall = 22 + Math.random() * 20; this.tutorialRefresh = null;
        this.radioMsg('Central: informe recibido. Unidad doce, quede disponible.', 3);
      });
    }, () => {});
  }

  handleEvents(events) {
    for (const e of events) {
      if (e.type === 'honk') { const d = Math.hypot(e.car.x - this.camera.position.x, e.car.z - this.camera.position.z); if (d < 60) this.audio.horn(clamp(1 - d / 60, 0.1, 1)); }
      if (e.type === 'hit' && e.mag > 3) { if (this.mission) this.mission.adj('seguridad', -6, 'Colisión con vehículos de terceros.'); this.hud.toast('Colisión con un vehículo civil', 'bad', 1500); }
      if (e.type === 'pedHit') { this.hud.toast('¡Has atropellado a un peatón! Conduce con precaución', 'bad', 2600); if (this.mission) this.mission.adj('seguridad', -25, 'Atropello de un peatón durante el servicio.'); this.audio.impact(4); }
    }
  }

  updateCarLights(dt) {
    const car = this.car, rig = this.rig; const night = this.env.night;
    const head = car.headlights ? (night > 0.35 || this.env.cur.fog > 0.004 ? 1 : 0.15) : 0;
    rig.setLights(head > 0.5 ? 10 : 1.2, car.braking ? 8 : head > 0.5 ? 1.8 : 0.4);
    this.headlight.intensity = head * 140;
    this.beamMat.uniforms.uO.value = head > 0.5 ? 0.6 + this.env.fogginess * 1.2 + this.env.cur.rain * 0.6 : 0;
    const [L, R] = rig.updateBeacons(this.elapsed, car.lights, settings.redblue ? 'rojo-azul' : 'azul');
    const col = settings.redblue ? [new THREE.Color(1, 0.05, 0.03), new THREE.Color(0.1, 0.3, 1)] : [new THREE.Color(0.1, 0.3, 1), new THREE.Color(0.1, 0.3, 1)];
    this.beaconL.color.copy(col[0]); this.beaconR.color.copy(col[1]);
    const k = lerp(18, 40, night);
    this.beaconL.intensity = L * k; this.beaconR.intensity = R * k;
    this.sirenFx = car.lights ? Math.max(L, R) * (this.inCar ? 1 : 0.6) : 0; this.sirenCol = L > R ? col[0] : col[1];
  }

  sparkBurst(car) {
    const fx = Math.sin(car.h), fz = Math.cos(car.h);
    for (let k = 0; k < 30; k++) this.fx.sparks.emit(car.x + fx * 2 * Math.sign(car.vLong || 1), 0.5, car.z + fz * 2 * Math.sign(car.vLong || 1), (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.3 + Math.random() * 0.4, 0.05, -0.05, 1);
  }

  updateFx(dt) {
    const F = this.fx;
    for (const e of F.emitters) { e.acc += dt * 14 * e.rate; while (e.acc > 1) { e.acc--; F.smoke.emit(e.x + (Math.random() - 0.5) * 0.4, e.y, e.z + (Math.random() - 0.5) * 0.4, 0.3 + (Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4, 4 + Math.random() * 2, 0.5, 0.7, 0.35); } }
    // humo de neumáticos y marcas
    const car = this.car;
    if (this.inCar && car.slip > 3.2 && car.speed > 2.5) {
      const fx = Math.sin(car.h), fz = Math.cos(car.h); const lx = fz, lz = -fx;
      for (const s of [-1, 1]) {
        const x = car.x - fx * 1.35 + lx * 0.75 * s, z = car.z - fz * 1.35 + lz * 0.75 * s;
        F.skids.add('p' + s, x, car.y, z);
        if (Math.random() < (this.env.cur.wet > 0.5 ? 0.25 : 0.7)) F.tire.emit(x, 0.25, z, (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 1.5, 1.5 + Math.random(), 0.6, 1.1, this.env.cur.wet > 0.5 ? 0.2 : 0.45);
      }
    } else { F.skids.break('p-1'); F.skids.break('p1'); }
    const lightK = lerp(1, 0.18, this.env.night) + this.env.flash;
    F.smoke.mat.uniforms.uLight.value = lightK; F.tire.mat.uniforms.uLight.value = lightK;
    F.smoke.mat.uniforms.uScale.value = F.tire.mat.uniforms.uScale.value = innerHeight * this.renderer.getPixelRatio() * 0.9;
    F.sparks.mat.uniforms.uScale.value = F.smoke.mat.uniforms.uScale.value;
    F.smoke.update(dt, -0.15, 0.4); F.tire.update(dt, -0.1, 0.9); F.sparks.update(dt, 9.8, 0.5);
    // objetivo
    let t = this.target; if (t?.follow) t = { x: t.follow.x, z: t.follow.z };
    F.beacon.update(dt, t, this.camera.position);
    if (this.camFlash > 0) this.camFlash = Math.max(0, this.camFlash - dt * 5);
    this.camFlashT = (this.camFlashT || 0) - dt; if (this.camFlash > 0.9) this.camFlashT = 0.8;
  }

  updateCamera(dt) {
    const cs = this.camState; const cam = this.camera; const car = this.car;
    let pos = new THREE.Vector3(), look = new THREE.Vector3(), fov = 62;
    if (this.inCar) {
      const sp = car.speed; const vh = sp > 2 ? Math.atan2(car.vx, car.vz) : car.h;
      const back = car.vLong < -1;
      const tgtYaw = back ? car.h : (sp > 4 ? lerp(car.h, car.h + wrapAngle(vh - car.h), 0.6) : car.h);
      cs.carYaw += wrapAngle(tgtYaw - cs.carYaw) * Math.min(1, dt * 3.2);
      if (cs.idle > 1.6) cs.yawOff = damp(cs.yawOff || 0, 0, 2.5, dt); else cs.yawOff = (cs.yawOff || 0) + wrapAngle(cs.yaw - (cs.lastYaw ?? cs.yaw));
      cs.lastYaw = cs.yaw;
      const yaw = cs.carYaw + (cs.yawOff || 0);
      if (cs.carMode === 2) { // capó
        const fx = Math.sin(car.h), fz = Math.cos(car.h);
        pos.set(car.x + fx * 0.2, car.y + 1.32, car.z + fz * 0.2); look.set(car.x + fx * 20, car.y + 1.1, car.z + fz * 20); fov = 72 + sp * 0.25;
      } else {
        const dist = cs.carMode === 0 ? 6.4 : 10.5; const h = cs.carMode === 0 ? 2.15 : 3.4;
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const d = dist + sp * 0.04;
        pos.set(car.x - fx * d, car.y + h + sp * 0.01, car.z - fz * d);
        look.set(car.x + fx * 3, car.y + 1.0, car.z + fz * 3);
        fov = 60 + Math.min(18, sp * 0.45);
      }
    } else {
      const o = this.officer; const yaw = cs.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); const rx = -fz, rz = fx;
      const tx = o.x + rx * 0.45, tz = o.z + rz * 0.45, ty = o.y + 1.55;
      const d = cs.dist; const cp = Math.cos(cs.pitch), spp = Math.sin(cs.pitch);
      let px = tx - fx * d * cp, py = ty + d * spp, pz = tz - fz * d * cp;
      // colisión de cámara
      for (let k = 1; k <= 8; k++) {
        const t = k / 8; const qx = lerp(tx, px, t), qz = lerp(tz, pz, t), qy = lerp(ty, py, t);
        let hit = false; for (const c of this.city.query(qx, qz, 0.3)) if (qx > c.x0 - 0.25 && qx < c.x1 + 0.25 && qz > c.z0 - 0.25 && qz < c.z1 + 0.25 && qy < c.h + 0.5) { hit = true; break; }
        if (hit) { const tt = (k - 1) / 8; px = lerp(tx, px, tt); py = lerp(ty, py, tt); pz = lerp(tz, pz, tt); break; }
      }
      py = Math.max(py, this.city.groundY(px, pz) + 0.25);
      pos.set(px, py, pz); look.set(tx + fx * 2, ty - 0.1 + Math.sin(cs.pitch) * -0.5, tz + fz * 2);
      fov = 58 + (o.state === 'run' ? 6 : 0);
    }
    const k = this.inCar && cs.carMode !== 2 ? 1 - Math.exp(-dt * 12) : 1;
    if (!this.camInit) { cam.position.copy(pos); this.camInit = true; }
    cam.position.lerp(pos, this.inCar ? (cs.carMode === 2 ? 1 : k) : 1 - Math.exp(-dt * 25));
    if (cs.shake > 0 && settings.shake) { cam.position.x += (Math.random() - 0.5) * cs.shake * 0.4; cam.position.y += (Math.random() - 0.5) * cs.shake * 0.3; cs.shake = Math.max(0, cs.shake - dt * 2); }
    if (this.inCar && settings.shake && car.speed > 25) { cam.position.y += (Math.random() - 0.5) * 0.012 * (car.speed - 25) * 0.15; }
    cam.lookAt(look);
    cs.fov = damp(cs.fov, fov, 3, dt); cam.fov = cs.fov; cam.updateProjectionMatrix();
  }

  updateHUD(dt) {
    this.hudT = (this.hudT || 0) + dt;
    const car = this.car, p = this.playerPos();
    const blk = this.city.blockAt(p.x, p.z);
    const h = this.env.hour; const turno = h >= 6 && h < 14 ? 'Turno de mañana' : h >= 14 && h < 22 ? 'Turno de tarde' : 'Turno de noche';
    if (this.hudT > 0.1) {
      this.hudT = 0;
      this.hud.updateStatus({ clock: this.clock(), shift: turno, weather: weatherLabel(this.env.weatherKey), xp: this.save.xp, district: DISTRICT[blk] || 'Valmora', street: this.city.locationName(p.x, p.z), inCar: this.inCar, kmh: Math.abs(car.vLong) * 3.6, reverse: car.vLong < -0.3, gear: car.vLong < -0.3 ? 'R' : car.gear, rpm: car.rpm, lights: car.lights, siren: car.siren, pursuit: this.pursuitInfo, danger: this.camState.shake });
      const hints = this.inCar
        ? ['<span class="kbd">W</span><span class="kbd">S</span> Acelerar/frenar · <span class="kbd">Espacio</span> Freno de mano', '<span class="kbd">Q</span> Luces · <span class="kbd">H</span> Sirena · <span class="kbd">C</span> Cámara · <span class="kbd">F</span> Bajar', '<span class="kbd">R</span> Radio · <span class="kbd">M</span> Mapa · <span class="kbd">Esc</span> Pausa']
        : ['<span class="kbd">WASD</span> Moverse · <span class="kbd">Shift</span> Correr · Ratón: cámara', '<span class="kbd">E</span> Interactuar · <span class="kbd">F</span> Vehículo · <span class="kbd">R</span> Radio', '<span class="kbd">M</span> Mapa · <span class="kbd">I</span> Informe · <span class="kbd">Esc</span> Pausa'];
      if (!this.input.locked && !this.input.isTouch) hints.push('<i style="color:#9fd0ff">Haz clic en la pantalla para controlar la cámara con el ratón</i>');
      this.hud.hints(hints);
    }
    // ruta
    let t = this.target; if (t?.follow) t = { x: t.follow.x, z: t.follow.z };
    this.routeT = (this.routeT || 0) - dt;
    if (t && this.routeT <= 0) {
      this.routeT = 0.8;
      const a = this.city.nearestNode(p.x, p.z), b = this.city.nearestNode(t.x, t.z);
      const nodes = this.city.route(a, b).map(([i, j]) => [i * CITY.PITCH - CITY.HALF, j * CITY.PITCH - CITY.HALF]);
      this.route = [[p.x, p.z], ...nodes, [t.x, t.z]];
    }
    if (!t) this.route = null;
    const dots = [];
    for (const c of this.traffic.cars) { const d = Math.abs(c.x - p.x) + Math.abs(c.z - p.z); if (d < 220) dots.push({ x: c.x, z: c.z, c: c.flags.police ? '#69a6ff' : c.state === 'flee' ? '#ff4b4b' : 'rgba(255,255,255,.35)', r: c.state === 'flee' ? 4 : 2 }); }
    for (const s of this.services) dots.push({ x: s.x, z: s.z, c: s.kind === 'ambulance' ? '#ff6b6b' : '#69a6ff', r: 3.5 });
    if (this.onFoot) dots.push({ x: car.x, z: car.z, c: '#2f7bff', r: 4 });
    for (const n of this.npcs) if (n.visible && this.mission?.npcs.includes(n) && this.mission.has?.('keeper') !== false) { if (Math.hypot(n.x - p.x, n.z - p.z) < 25) dots.push({ x: n.x, z: n.z, c: '#ffd27a', r: 2.5 }); }
    const heading = this.inCar ? car.h : this.camState.yaw;
    this.hud.drawMinimap({ x: p.x, z: p.z, heading, zoom: this.inCar ? clamp(1.1 - car.speed / 60, 0.55, 1.1) : 1.25, route: this.route, target: t, dots, searchArea: this.searchArea });
    this.mapView = { x: p.x, z: p.z, heading, route: this.route, target: t, dots };
  }
  drawBigMap() { if (this.mapView) this.hud.drawBigMap(this.mapView); }

  render(dt) {
    const env = this.env;
    this.renderer.toneMappingExposure = (env.exposure || 0.8) * (1 + (this.camFlash || 0) * 0.6);
    const rain = env.cur.rain; const lensRain = this.inCar && this.camState.carMode === 2 ? rain * 0.5 : rain * 0.85;
    this.post.render(dt, env, { lensRain: this.state === 'menu' ? rain * 0.6 : lensRain, damage: this.camState?.shake * 0.4 || 0, siren: this.sirenFx || 0, sirenCol: this.sirenCol });
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight); this.post.setSize(innerWidth, innerHeight);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

const game = new Game();
window.__game = game;
game.boot().catch((e) => {
  console.error(e);
  $('loadlbl').textContent = 'Error al iniciar: ' + e.message + ' — tu navegador debe soportar WebGL 2.';
});
