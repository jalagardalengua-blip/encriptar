// Postprocesado cinematográfico: GTAO, bloom HDR, tonemapping ACES, SMAA y gradación
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.32 }, uGrain: { value: 0.045 }, uCA: { value: 0.0018 }, uRain: { value: 0 },
    uDamage: { value: 0 }, uFlash: { value: 0 }, uSat: { value: 1.1 }, uSharp: { value: 0.35 }, uBlur: { value: 0 }, uSiren: { value: 0 }, uSirenCol: { value: new THREE.Color() },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uVignette; uniform float uGrain; uniform float uCA; uniform float uRain; uniform float uDamage; uniform float uFlash; uniform float uSat; uniform float uSiren; uniform vec3 uSirenCol; uniform float uSharp; uniform float uBlur;
    varying vec2 vUv;
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    vec2 drops(vec2 uv, float t, float scale){
      vec2 a = vec2(uRes.x/uRes.y, 1.0);
      vec2 st = uv*a*scale; vec2 id = floor(st); vec2 f = fract(st) - 0.5;
      float r = h21(id); float tt = t*0.4 + r*6.28;
      float life = fract(tt*0.15);
      vec2 c = vec2((r-0.5)*0.6, 0.35 - life*0.9*step(0.6, r));
      vec2 d = f - c; d.x *= 1.3;
      float s = smoothstep(0.18, 0.0, length(d)) * step(0.35, r) * (1.0 - life*0.5);
      return d * s * 0.9;
    }
    void main(){
      vec2 uv = vUv;
      if (uRain > 0.01) {
        vec2 o = drops(uv, uTime, 7.0) + drops(uv*1.7+0.3, uTime*1.3, 11.0) * 0.6;
        uv -= o * 0.05 * uRain;
      }
      vec2 dc = uv - 0.5; float r2 = dot(dc, dc);
      vec2 off = dc * uCA * (1.0 + r2*4.0);
      vec3 col;
      // desenfoque radial por velocidad
      if (uBlur > 0.001) { vec3 acc = vec3(0.0); for (int i = 0; i < 6; i++) { float k = float(i) / 5.0; acc += texture2D(tDiffuse, uv - dc * uBlur * k * 0.06 * smoothstep(0.1, 0.6, length(dc))).rgb; } col = acc / 6.0; }
      else {
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      }
      // enfoque (máscara de desenfoque)
      vec2 px = 1.0 / uRes;
      vec3 nb = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
      col += (col - nb * 0.25) * uSharp;
      // gradación: sombras frías, luces cálidas
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col += vec3(-0.008, 0.0, 0.018) * (1.0 - l) + vec3(0.015, 0.006, -0.012) * l;
      col = mix(col, col*col*(3.0-2.0*col), 0.26);
      col = pow(max(col, 0.0), vec3(1.03));
      // viñeta
      float v = smoothstep(0.85, 0.15, length(dc*vec2(1.0, 0.85)) * (1.0 + uVignette));
      col *= mix(1.0, v, 0.9);
      // daño / impacto
      col = mix(col, vec3(0.6, 0.05, 0.03), uDamage * smoothstep(0.15, 0.6, length(dc)));
      // reflejo de sirenas en la lente
      col += uSirenCol * uSiren * 0.05 * smoothstep(0.2, 0.9, length(dc));
      col += uFlash;
      // grano
      float g = h21(uv*uRes + fract(uTime*7.13)*100.0) - 0.5;
      col += g * uGrain * (1.2 - l);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera, q) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.q = q;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(scene, camera));
    this.hidden = [];
    if (q.ao) {
      this.gtao = new GTAOPass(scene, camera, size.x, size.y);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.blendIntensity = 0.85;
      this.gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 2.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
      const orig = this.gtao.render.bind(this.gtao);
      this.gtao.render = (...a) => {
        const vis = this.hidden.map((o) => o.visible); this.hidden.forEach((o) => (o.visible = false));
        const bg = scene.background; orig(...a); scene.background = bg;
        this.hidden.forEach((o, i) => (o.visible = vis[i]));
      };
      this.composer.addPass(this.gtao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.62, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (q.smaa) { this.smaa = new SMAAPass(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio()); this.composer.addPass(this.smaa); }
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }
  hideForAO(objs) { this.hidden.push(...objs.filter(Boolean)); }
  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.grade.uniforms.uRes.value.set(w, h);
  }
  render(dt, env, fx = {}) {
    const u = this.grade.uniforms;
    u.uTime.value += dt;
    u.uRain.value = fx.lensRain ?? 0;
    u.uDamage.value = fx.damage ?? 0;
    u.uFlash.value = (env.flash || 0) * 0.08;
    u.uBlur.value = fx.speedBlur ?? 0;
    u.uSiren.value = fx.siren ?? 0; if (fx.sirenCol) u.uSirenCol.value.copy(fx.sirenCol);
    this.bloom.strength = 0.32 + env.night * 0.28 + env.fogginess * 0.1;
    this.bloom.threshold = env.night > 0.5 ? 0.85 : 0.95;
    this.composer.render(dt);
  }
}
