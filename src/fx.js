// Efectos: partículas (humo, chispas), marcas de frenada, baliza de objetivo, conos, restos
import * as THREE from 'three';
import * as T from './textures.js';

export class Particles {
  constructor(scene, max = 700, { additive = false, tex = null, color = new THREE.Color(1, 1, 1) } = {}) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.size = new Float32Array(max); this.grow = new Float32Array(max); this.alpha = new Float32Array(max); this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex || T.smokeSprite() }, uColor: { value: color }, uScale: { value: 600 }, uLight: { value: 1 } },
      vertexShader: 'attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale; void main(){ vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = aSize * uScale / max(0.5, -mv.z); }',
      fragmentShader: 'uniform sampler2D uTex; uniform vec3 uColor; uniform float uLight; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor*uLight, t.a*vA); }',
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 4; scene.add(this.points);
    this.g = g;
  }
  emit(x, y, z, vx, vy, vz, life, size, grow, alpha) {
    let i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life; this.size[i] = size; this.grow[i] = grow; this.a0[i] = alpha;
  }
  update(dt, gravity = 0, drag = 0.5) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { // compactar
        const j = --this.n;
        for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[j * 3 + k]; this.vel[i * 3 + k] = this.vel[j * 3 + k]; }
        this.life[i] = this.life[j]; this.maxLife[i] = this.maxLife[j]; this.size[i] = this.size[j]; this.grow[i] = this.grow[j]; this.a0[i] = this.a0[j]; i--; continue;
      }
      const f = Math.exp(-drag * dt);
      this.vel[i * 3] *= f; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * f - gravity * dt; this.vel[i * 3 + 2] *= f;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = this.a0[i] * Math.min(1, t * 2) * Math.min(1, (1 - t) * 6 + 0.2);
    }
    this.g.setDrawRange(0, this.n);
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aSize.needsUpdate = true; this.g.attributes.aAlpha.needsUpdate = true;
  }
}

export class SkidMarks {
  constructor(scene, max = 800) {
    this.max = max; this.i = 0; this.count = 0;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    this.mat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.mesh = new THREE.InstancedMesh(g, this.mat, max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.last = new Map();
  }
  add(id, x, y, z) {
    const l = this.last.get(id);
    if (!l) { this.last.set(id, [x, z]); return; }
    const dx = x - l[0], dz = z - l[1]; const d = Math.hypot(dx, dz); if (d < 0.25) return;
    if (d > 3) { this.last.set(id, [x, z]); return; }
    this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx, dz));
    this.m.compose(new THREE.Vector3((x + l[0]) / 2, y + 0.02, (z + l[1]) / 2), this.q, new THREE.Vector3(0.22, 1, d + 0.05));
    this.mesh.setMatrixAt(this.i, this.m); this.i = (this.i + 1) % this.max; this.count = Math.min(this.max, this.count + 1);
    this.mesh.count = this.count; this.mesh.instanceMatrix.needsUpdate = true;
    this.last.set(id, [x, z]);
  }
  break(id) { this.last.delete(id); }
}

export class Beacon {
  constructor(scene) {
    const g = new THREE.CylinderGeometry(1.4, 1.4, 70, 24, 1, true); g.translate(0, 35, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(1, 0.62, 0.1) }, uO: { value: 1 } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y/70.0; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float uTime; uniform vec3 uCol; uniform float uO; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(vN,vV)), 1.4); float a = (1.0-vY)*(1.0-vY)*(0.35+0.65*f)*uO; a *= 0.75 + 0.25*sin(vY*40.0 - uTime*4.0); gl_FragColor = vec4(uCol*2.2*a, a*0.6); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.renderOrder = 6; this.mesh.frustumCulled = false;
    const rg = new THREE.RingGeometry(2.2, 2.7, 48); rg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.3), transparent: true, opacity: 0.8, depthWrite: false }));
    this.ring.position.y = 0.2; this.group = new THREE.Group(); this.group.add(this.mesh, this.ring); this.group.visible = false; scene.add(this.group);
  }
  update(dt, target, camPos) {
    this.mat.uniforms.uTime.value += dt;
    if (!target) { this.group.visible = false; return; }
    this.group.visible = true; this.group.position.set(target.x, 0, target.z);
    const d = Math.hypot(camPos.x - target.x, camPos.z - target.z);
    this.mat.uniforms.uO.value = Math.min(1, Math.max(0, (d - 8) / 25));
    this.ring.scale.setScalar(1 + Math.sin(this.mat.uniforms.uTime.value * 3) * 0.08); this.ring.visible = d > 14;
  }
}

let CONE = null;
function coneModel() {
  if (CONE) return CONE;
  const cone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xff4a0a, roughness: 0.45 })); body.position.y = 0.35;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.12, 0.11, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.15, metalness: 0.6 })); band.position.y = 0.39;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 })); base.position.y = 0.02;
  cone.add(body, band, base); cone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  CONE = cone; return cone;
}
export function makeCones(scene, x, z, heading) {
  const g = new THREE.Group(); const fx = Math.sin(heading), fz = Math.cos(heading); const rx = -fz, rz = fx;
  for (let k = 0; k < 6; k++) {
    const c = coneModel().clone(); const t = k * 2.2; const lat = -3.8 + k * 1.1;
    c.position.set(x + fx * t + rx * lat, 0.01, z + fz * t + rz * lat); g.add(c);
  }
  // bengalas
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 1.5, 0.4) }));
  fl.position.set(x - fx * 3 - rx * 2, 0.08, z - fz * 3 - rz * 2); g.add(fl); g.userData.flare = fl;
  const pl = new THREE.PointLight(0xff3010, 6, 14, 2); pl.position.copy(fl.position).y += 0.3; g.add(pl); g.userData.light = pl;
  scene.add(g); return g;
}
export function makeDebris(scene, x, z) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfd3dd, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, roughness: 0.3, emissive: 0x200000 });
  for (let k = 0; k < 60; k++) {
    const m = k < 40 ? glass : k < 52 ? plastic : red; const s = k < 40 ? 0.03 + Math.random() * 0.04 : 0.08 + Math.random() * 0.2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(s, 0.01, s * (0.6 + Math.random())), m);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 2.6;
    b.position.set(x + Math.cos(a) * r, 0.02, z + Math.sin(a) * r); b.rotation.y = Math.random() * 6; b.receiveShadow = true; g.add(b);
  }
  // mancha de líquido
  const sp = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -3 }));
  sp.position.set(x - 0.6, 0.015, z + 0.4); sp.scale.set(1.3, 1, 0.8); g.add(sp);
  scene.add(g); return g;
}
