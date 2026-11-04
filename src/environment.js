// Cielo físico, ciclo día/noche, nubes volumétricas falsas, lluvia y entorno IBL
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { clamp, lerp, smooth, damp } from './config.js';
import { wetUniform } from './city.js';

const WEATHER = {
  despejado: { clouds: 0.18, rain: 0, fog: 0.0012, wet: 0, sun: 1, turb: 2.5, ray: 1.2, label: 'Despejado' },
  nublado:   { clouds: 0.72, rain: 0, fog: 0.0022, wet: 0.1, sun: 0.45, turb: 8, ray: 0.6, label: 'Nublado' },
  lluvia:    { clouds: 0.92, rain: 1, fog: 0.0042, wet: 1, sun: 0.22, turb: 12, ray: 0.4, label: 'Lluvia' },
  tormenta:  { clouds: 1.0, rain: 1.6, fog: 0.0055, wet: 1, sun: 0.12, turb: 16, ray: 0.3, label: 'Tormenta', lightning: true },
  niebla:    { clouds: 0.6, rain: 0, fog: 0.012, wet: 0.35, sun: 0.35, turb: 10, ray: 0.5, label: 'Niebla' },
};
export const WEATHER_KEYS = Object.keys(WEATHER);
export const weatherLabel = (k) => WEATHER[k].label;

const cloudVS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`;
const cloudFS = `
uniform float uTime; uniform float uCover; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uFog; uniform float uFlash;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  if (d.y < 0.0) discard;
  vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime*0.012, uTime*0.004);
  float base = fbm(uv);
  float detail = fbm(uv*3.1 - uTime*0.01);
  float c = smoothstep(1.0 - uCover - 0.05, 1.0 - uCover + 0.35, base*0.75 + detail*0.35);
  // iluminación: muestras desplazadas hacia el sol
  float l = fbm(uv + uSunDir.xz*0.08);
  float shade = clamp(1.0 - (l - base)*3.5, 0.25, 1.3);
  vec3 lit = uSunCol * shade * 0.9 + uAmb;
  vec3 dark = uAmb * 0.55;
  vec3 col = mix(lit, dark, smoothstep(0.4, 1.0, c) * uCover * 0.85);
  float sunGlow = pow(max(dot(d, uSunDir), 0.0), 8.0);
  col += uSunCol * sunGlow * 0.6 * (1.0 - c*0.5);
  col += vec3(0.75,0.8,1.0) * uFlash * 3.0 * c;
  float horizon = smoothstep(0.0, 0.25, d.y);
  col = mix(uFog, col, horizon);
  gl_FragColor = vec4(col, c * smoothstep(0.0, 0.06, d.y));
  #include <colorspace_fragment>
}`;

export class Environment {
  constructor(renderer, scene, quality) {
    this.renderer = renderer; this.scene = scene; this.q = quality;
    this.hour = 21.5; this.timeScale = 60; // 1 s real = 1 min de juego
    this.weatherKey = 'lluvia'; this.w = { ...WEATHER.lluvia };
    this.cur = { clouds: 0.9, rain: 1, fog: 0.004, wet: 1, sun: 0.2, turb: 10, ray: 0.5 };
    this.flash = 0; this.nextLightning = 6; this.time = 0;
    this.night = 1; this.dark = 1; this.fogginess = 0.5;

    // Cielo
    this.sky = new Sky(); this.sky.scale.setScalar(4500);
    const u = this.sky.material.uniforms; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.82;
    scene.add(this.sky);

    // Nubes
    this.cloudMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCover: { value: 0.5 }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uFlash: { value: 0 } },
      vertexShader: cloudVS, fragmentShader: cloudFS, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), this.cloudMat); this.clouds.renderOrder = -1; this.clouds.frustumCulled = false;
    scene.add(this.clouds);

    // Estrellas y luna
    const sg = new THREE.BufferGeometry(); const sp = []; const ss = [];
    for (let i = 0; i < 2500; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < 0.05) v.y = Math.abs(v.y) + 0.05; v.normalize().multiplyScalar(2800); sp.push(v.x, v.y, v.z); ss.push(Math.random()); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
    this.starMat = new THREE.ShaderMaterial({ uniforms: { uO: { value: 1 }, uT: { value: 0 } }, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'attribute float aS; varying float vS; uniform float uT; void main(){ vS = aS * (0.7 + 0.3*sin(uT*3.0 + aS*50.0)); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.99998; gl_PointSize = 1.0 + aS*1.8; }',
      fragmentShader: 'uniform float uO; varying float vS; void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c)); gl_FragColor = vec4(vec3(1.0,0.97,0.9)*vS*1.5, a*uO*vS); }' });
    this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.stars.renderOrder = -2; scene.add(this.stars);
    const mc = document.createElement('canvas'); mc.width = mc.height = 128; const mx = mc.getContext('2d');
    const gr = mx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.28, 'rgba(240,240,230,1)'); gr.addColorStop(0.33, 'rgba(200,210,255,0.25)'); gr.addColorStop(1, 'rgba(150,170,255,0)');
    mx.fillStyle = gr; mx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 14; i++) { mx.fillStyle = 'rgba(160,160,150,0.35)'; mx.beginPath(); mx.arc(48 + Math.random() * 32, 48 + Math.random() * 32, 2 + Math.random() * 6, 0, 7); mx.fill(); }
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: new THREE.Color(3, 3, 3), fog: false, depthWrite: false, transparent: true }));
    this.moon.scale.setScalar(260); this.moon.renderOrder = -1; scene.add(this.moon);

    // Luces
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = quality.shadowSize > 0;
    this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const sc = this.sun.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 900;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd6ff, 0x3a3a3a, 0.6); scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0x8899aa, 0.002);

    // Entorno IBL (cielo + resplandor urbano)
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky(); this.envSky.scale.setScalar(900); this.envScene.add(this.envSky);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    this.envGlowMat = glowMat;
    const ringG = new THREE.CylinderGeometry(400, 400, 60, 48, 1, true); ringG.translate(0, 20, 0);
    const ring = new THREE.Mesh(ringG, glowMat); this.envScene.add(ring);
    // paneles de ventanas para reflejos nocturnos
    const panelM = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }); this.envPanelMat = panelM;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2; const p = new THREE.Mesh(new THREE.PlaneGeometry(20 + Math.random() * 40, 4 + Math.random() * 30), panelM);
      p.position.set(Math.cos(a) * 380, 5 + Math.random() * 40, Math.sin(a) * 380); p.lookAt(0, p.position.y, 0); this.envScene.add(p);
    }
    this.envGround = new THREE.Mesh(new THREE.CircleGeometry(800, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this.envGround.position.y = -2; this.envScene.add(this.envGround);
    this.envClouds = new THREE.Mesh(new THREE.SphereGeometry(850, 32, 16), this.cloudMat); this.envScene.add(this.envClouds);
    this.envTimer = 999; this.envRT = null;

    this.buildRain(quality.rain);
    this.sunDir = new THREE.Vector3();
    this.setWeather('lluvia', true);
  }

  buildRain(count) {
    const g = new THREE.BufferGeometry(); const p = []; const s = [];
    for (let i = 0; i < count; i++) { const x = Math.random(), y = Math.random(), z = Math.random(); p.push(x, y, z, x, y, z); s.push(0, 1); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aEnd', new THREE.Float32BufferAttribute(s, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uInt: { value: 1 }, uWind: { value: new THREE.Vector2(2, 1) }, uCol: { value: new THREE.Color(0.6, 0.65, 0.7) }, uVel: { value: new THREE.Vector3() } },
      vertexShader: `attribute float aEnd; uniform vec3 uCam; uniform float uTime; uniform vec2 uWind; uniform vec3 uVel; varying float vA; varying float vEnd;
        void main(){ vec3 B = vec3(50.0, 30.0, 50.0); float sp = 22.0 + position.x*6.0;
          vec3 p = position * B; p.y = mod(p.y - uTime*sp, B.y); p.xz += uWind * (B.y - p.y) * 0.05;
          vec3 o = uCam - B*0.5; p.x = mod(p.x - o.x, B.x) + o.x; p.z = mod(p.z - o.z, B.z) + o.z; p.y += uCam.y - B.y*0.4;
          vec3 streak = normalize(vec3(uWind.x*0.05, -1.0, uWind.y*0.05)) * (0.55 + 0.5*position.z) - uVel*0.03;
          p += streak * aEnd; vEnd = aEnd;
          vec4 mv = modelViewMatrix*vec4(p,1.0); vA = smoothstep(45.0, 2.0, -mv.z);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uInt; uniform vec3 uCol; varying float vA; varying float vEnd; void main(){ gl_FragColor = vec4(uCol, 0.32*vA*uInt*(0.4+0.6*vEnd)); }`,
      transparent: true, depthWrite: false, fog: false,
    });
    this.rain = new THREE.LineSegments(g, this.rainMat); this.rain.frustumCulled = false; this.rain.renderOrder = 5;
    this.scene.add(this.rain);
    // salpicaduras en el suelo
    const sg = new THREE.BufferGeometry(); const sp = [];
    for (let i = 0; i < 1600; i++) sp.push(Math.random(), Math.random(), Math.random());
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.splashMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uInt: { value: 1 }, uCol: { value: new THREE.Color(0.7, 0.75, 0.8) } },
      vertexShader: `uniform vec3 uCam; uniform float uTime; varying float vT; varying float vA;
        void main(){ float ph = fract(uTime*2.3 + position.z*13.0); float cyc = floor(uTime*2.3 + position.z*13.0);
          vec2 r = fract(position.xy + vec2(cyc*0.618, cyc*0.382)) - 0.5; vec3 p = vec3(uCam.x + r.x*36.0, 0.18, uCam.z + r.y*36.0);
          vT = ph; vec4 mv = modelViewMatrix*vec4(p,1.0); vA = smoothstep(30.0, 3.0, -mv.z); gl_Position = projectionMatrix*mv; gl_PointSize = (0.6 + ph*2.6) * 34.0 / -mv.z; }`,
      fragmentShader: `uniform float uInt; uniform vec3 uCol; varying float vT; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; c.y *= 2.2; float d = length(c); float ring = smoothstep(0.5, 0.35, d) * smoothstep(0.2, 0.38, d); gl_FragColor = vec4(uCol, ring*(1.0-vT)*0.3*uInt*vA); }`,
      transparent: true, depthWrite: false,
    });
    this.splash = new THREE.Points(sg, this.splashMat); this.splash.frustumCulled = false; this.scene.add(this.splash);
  }

  setWeather(key, instant = false) {
    this.weatherKey = key; this.w = { ...WEATHER[key] };
    if (instant) Object.assign(this.cur, this.w);
  }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.envTimer = 999; }

  update(dt, camPos, audio, camVel) {
    this.time += dt;
    this.hour = (this.hour + dt * this.timeScale / 3600) % 24;
    // transición de clima
    for (const k of ['clouds', 'rain', 'fog', 'sun', 'turb', 'ray']) this.cur[k] = damp(this.cur[k], this.w[k], 0.4, dt);
    this.cur.wet = damp(this.cur.wet, this.w.wet, this.w.wet > this.cur.wet ? 0.08 : 0.02, dt);
    const C = this.cur;
    // posición solar (latitud media, primavera)
    const t = (this.hour - 6) / 12 * Math.PI; // 6h salida, 18h puesta
    const elev = Math.sin(t) * 62 * Math.PI / 180 - 0.05;
    const azim = Math.PI * 0.15 + t;
    this.sunDir.set(Math.cos(azim) * Math.cos(elev), Math.sin(elev), Math.sin(azim) * Math.cos(elev) * 0.6 + 0.4).normalize();
    const sunUp = smooth(-0.12, 0.25, this.sunDir.y);
    this.night = 1 - smooth(-0.1, 0.12, this.sunDir.y);
    this.dark = Math.max(this.night, C.clouds * 0.6 * (1 - this.night) > 0.5 ? 0.6 : 0);
    // cielo
    const u = this.sky.material.uniforms; u.sunPosition.value.copy(this.sunDir); u.turbidity.value = C.turb; u.rayleigh.value = lerp(C.ray, 0.25, this.night * 0.5);
    const eu = this.envSky.material.uniforms; eu.sunPosition.value.copy(this.sunDir); eu.turbidity.value = C.turb; eu.rayleigh.value = u.rayleigh.value; eu.mieCoefficient.value = 0.005; eu.mieDirectionalG.value = 0.8;
    // luz principal: sol o luna
    const moonDir = this.sunDir.clone().negate(); moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.35; moonDir.normalize();
    const lowSun = smooth(0.0, 0.35, this.sunDir.y);
    const sunCol = new THREE.Color().setRGB(1, lerp(0.55, 0.96, lowSun), lerp(0.3, 0.9, lowSun));
    const moonCol = new THREE.Color(0.55, 0.65, 1.0);
    const isDay = this.sunDir.y > -0.02;
    const L = isDay ? this.sunDir : moonDir;
    this.sun.color.copy(isDay ? sunCol : moonCol);
    const sunI = isDay ? 3.4 * sunUp * C.sun : 0.12 * (1 - C.clouds * 0.7);
    this.sun.intensity = sunI + this.flash * 4;
    if (this.flash > 0) this.sun.color.lerp(new THREE.Color(0.8, 0.85, 1), this.flash);
    this.sun.position.copy(camPos).addScaledVector(L, 400); this.sun.target.position.copy(camPos);
    // ajuste de texel para evitar parpadeo de sombras
    const texel = 220 / this.q.shadowSize; this.sun.target.position.x = Math.round(this.sun.target.position.x / texel) * texel; this.sun.target.position.z = Math.round(this.sun.target.position.z / texel) * texel;
    this.sun.position.copy(this.sun.target.position).addScaledVector(L, 400);
    this.sun.target.updateMatrixWorld();
    // hemisférica
    const skyDay = new THREE.Color(0.55, 0.68, 0.9).lerp(new THREE.Color(0.55, 0.58, 0.62), C.clouds);
    const skyNight = new THREE.Color(0.05, 0.07, 0.13);
    this.hemi.color.copy(skyNight).lerp(skyDay, sunUp);
    this.hemi.groundColor.setRGB(0.18, 0.16, 0.14).lerp(new THREE.Color(0.04, 0.035, 0.04), this.night);
    this.hemi.intensity = lerp(0.9, 1.6, this.night) * (1 + this.flash * 3) + C.clouds * 0.3;
    // niebla
    const fogDay = new THREE.Color(0.66, 0.74, 0.84).lerp(new THREE.Color(0.55, 0.57, 0.6), C.clouds);
    const fogDusk = new THREE.Color(0.75, 0.55, 0.42);
    const fogNight = new THREE.Color(0.035, 0.04, 0.06).lerp(new THREE.Color(0.07, 0.065, 0.07), C.clouds);
    const dusk = (1 - lowSun) * (1 - this.night);
    const fogC = fogNight.clone().lerp(fogDay, sunUp).lerp(fogDusk, dusk * 0.6 * (1 - C.clouds));
    this.scene.fog.color.copy(fogC); this.scene.fog.density = C.fog * (this.night > 0.5 ? 1.15 : 1);
    this.fogginess = clamp(C.fog / 0.006, 0, 1.5);
    // nubes
    const cu = this.cloudMat.uniforms; cu.uTime.value = this.time; cu.uCover.value = C.clouds; cu.uSunDir.value.copy(L); cu.uFlash.value = this.flash;
    cu.uSunCol.value.copy(isDay ? sunCol : moonCol).multiplyScalar(isDay ? lerp(0.15, 1.1, sunUp) * lerp(1, 0.45, C.clouds) : 0.08);
    cu.uAmb.value.copy(fogC).multiplyScalar(isDay ? 0.9 : 1.6);
    if (this.night > 0.3) cu.uAmb.value.add(new THREE.Color(0.06, 0.045, 0.035).multiplyScalar(this.night)); // contaminación lumínica
    cu.uFog.value.copy(fogC);
    this.sky.visible = true;
    this.starMat.uniforms.uO.value = this.night * (1 - C.clouds * 0.95); this.starMat.uniforms.uT.value = this.time;
    this.moon.position.copy(camPos).addScaledVector(moonDir, 2700); this.moon.material.opacity = this.night * (1 - C.clouds * 0.85);
    this.stars.position.copy(camPos); this.clouds.position.copy(camPos); this.sky.position.copy(camPos);
    // lluvia
    const rainI = C.rain;
    this.rain.visible = this.splash.visible = rainI > 0.02;
    this.rainMat.uniforms.uTime.value = this.time; this.rainMat.uniforms.uCam.value.copy(camPos); this.rainMat.uniforms.uInt.value = rainI;
    if (camVel) this.rainMat.uniforms.uVel.value.copy(camVel);
    const rc = this.night > 0.5 ? new THREE.Color(0.35, 0.37, 0.42) : new THREE.Color(0.65, 0.7, 0.75); this.rainMat.uniforms.uCol.value.copy(rc);
    this.splashMat.uniforms.uTime.value = this.time; this.splashMat.uniforms.uCam.value.copy(camPos); this.splashMat.uniforms.uInt.value = rainI; this.splashMat.uniforms.uCol.value.copy(rc);
    wetUniform.value = C.wet;
    // relámpagos
    if (this.w.lightning) {
      this.nextLightning -= dt;
      if (this.nextLightning < 0) { this.flash = 1; this.nextLightning = 7 + Math.random() * 14; audio?.thunder(1.2 + Math.random() * 2.5); }
    }
    this.flash = Math.max(0, this.flash - dt * (this.flash > 0.5 ? 4 : 2.2)) * (Math.random() < 0.08 ? 1.5 : 1);
    this.flash = Math.min(this.flash, 1);
    // exposición
    this.exposure = lerp(0.62, 1.05, this.night) * lerp(1, 1.18, C.clouds * (1 - this.night));
    // entorno IBL
    this.envTimer += dt;
    if (this.envTimer > 2.5) { this.envTimer = 0; this.updateEnv(); }
    audio?.setRain(rainI);
  }

  updateEnv() {
    const n = this.night;
    this.envGlowMat.color.setRGB(0.5, 0.36, 0.22).multiplyScalar(n * 0.35 + 0.0);
    this.envPanelMat.color.setRGB(1.0, 0.8, 0.55).multiplyScalar(n * 1.6);
    this.envGround.material.color.copy(this.scene.fog.color).multiplyScalar(0.5);
    this.envSky.visible = true;
    const prev = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.5, 2000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = lerp(1.0, 0.7, n) * lerp(1, 0.75, this.cur.clouds);
    if (prev) prev.dispose();
  }
}
