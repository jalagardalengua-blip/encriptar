// Vehículos: modelos procedurales, física de conducción, tráfico con IA
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CITY, DIRS, rightOf, nodeCoord, clamp, lerp, damp, wrapAngle, mulberry32 } from './config.js';
import * as T from './textures.js';

// ---------------- Definiciones de modelos ----------------
export const CAR_TYPES = {
  sedan: { L: 4.65, W: 1.82, wb: 2.72, r: 0.33, mass: 1450, max: 52, acc: 8.5,
    body: [[2.28, 0.3], [2.36, 0.46], [2.34, 0.63], [2.22, 0.75], [1.6, 0.87], [0.98, 0.95], [-1.55, 1.0], [-1.78, 1.03], [-2.22, 0.99], [-2.34, 0.82], [-2.36, 0.5], [-2.28, 0.3]],
    cabin: [[1.02, 0.93], [0.12, 1.39], [-0.98, 1.41], [-1.62, 1.03], [-1.62, 0.9], [1.02, 0.9]],
    roof: [[0.2, 1.355], [0.08, 1.425], [-0.95, 1.445], [-1.12, 1.37]], cabinW: 0.84 },
  hatch: { L: 4.05, W: 1.76, wb: 2.5, r: 0.31, mass: 1150, max: 46, acc: 7.5,
    body: [[1.98, 0.3], [2.05, 0.46], [2.03, 0.64], [1.9, 0.77], [1.3, 0.9], [0.8, 0.97], [-1.85, 1.02], [-2.0, 0.98], [-2.04, 0.5], [-1.98, 0.3]],
    cabin: [[0.85, 0.95], [0.0, 1.43], [-1.55, 1.45], [-1.95, 1.05], [-1.95, 0.92], [0.85, 0.92]],
    roof: [[0.1, 1.4], [-0.02, 1.47], [-1.55, 1.49], [-1.75, 1.4]], cabinW: 0.86 },
  suv: { L: 4.75, W: 1.94, wb: 2.85, r: 0.38, mass: 2000, max: 48, acc: 7.0,
    body: [[2.3, 0.4], [2.4, 0.58], [2.38, 0.86], [2.25, 0.98], [1.5, 1.08], [1.0, 1.13], [-2.2, 1.18], [-2.37, 1.12], [-2.4, 0.6], [-2.3, 0.4]],
    cabin: [[1.05, 1.1], [0.35, 1.7], [-2.05, 1.73], [-2.32, 1.2], [-2.32, 1.08], [1.05, 1.08]],
    roof: [[0.4, 1.67], [0.3, 1.75], [-2.05, 1.78], [-2.22, 1.7]], cabinW: 0.88 },
  van: { L: 5.3, W: 2.02, wb: 3.3, r: 0.36, mass: 2400, max: 40, acc: 5.5,
    body: [[2.6, 0.38], [2.68, 0.55], [2.66, 0.9], [2.5, 1.05], [2.0, 1.2], [1.65, 1.25], [-2.6, 1.25], [-2.66, 0.55], [-2.6, 0.38]],
    cabin: [[1.7, 1.22], [1.0, 2.12], [-2.62, 2.16], [-2.64, 1.25], [1.7, 1.2]],
    roof: [[1.0, 2.1], [0.9, 2.2], [-2.62, 2.22], [-2.64, 2.12]], cabinW: 0.95, boxy: true },
};
const PALETTE = [0xf2f2f2, 0x111316, 0x6d7278, 0x9aa1a8, 0x1d3a6b, 0x7a1414, 0x2f4a2f, 0xb8a27a, 0x3b2a20, 0xc9c9c9, 0x0d2238, 0x5a1e3c, 0xd4d1c8, 0x23272b];

function shapeFrom(pts, arches, r) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  if (arches) {
    const yb = pts[0][1];
    const [rx, fx] = arches;
    s.lineTo(rx - r - 0.07, yb); s.absarc(rx, yb, r + 0.07, Math.PI, 0, true);
    s.lineTo(fx - r - 0.07, yb); s.absarc(fx, yb, r + 0.07, Math.PI, 0, true);
  }
  s.closePath();
  return s;
}
function extrude(shape, width, bevel = 0.08, size = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: size, bevelSegments: 4, curveSegments: 14 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}
const boxG = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z); return g; };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const clean = (g) => { const n = ni(g); for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };

const geoCache = {};
export function carGeometry(type) {
  if (geoCache[type]) return geoCache[type];
  const S = CAR_TYPES[type];
  const L = S.L, W = S.W, hb = S.wb / 2;
  const body = extrude(shapeFrom(S.body, [-hb, hb], S.r), W, 0.1, 0.05);
  const cabin = extrude(shapeFrom(S.cabin), W * S.cabinW, 0.08, 0.04);
  const roof = extrude(shapeFrom(S.roof), W * S.cabinW + 0.02, 0.06, 0.03);
  const front = L / 2, rear = -L / 2; const yb = S.body[0][1];
  const lightY = type === 'van' ? 0.92 : type === 'suv' ? 0.88 : 0.68;
  const tailY = type === 'van' ? 1.0 : type === 'suv' ? 1.0 : 0.86;
  const trim = [
    boxG(W * 0.98, 0.16, 0.12, 0, yb + 0.06, front - 0.02), boxG(W * 0.98, 0.18, 0.12, 0, yb + 0.08, rear + 0.04),
    boxG(W * 0.5, 0.14, 0.06, 0, lightY - 0.14, front + 0.02),
    boxG(0.04, 0.12, L * 0.62, W / 2 + 0.005, yb + 0.12, 0), boxG(0.04, 0.12, L * 0.62, -W / 2 - 0.005, yb + 0.12, 0),
    boxG(0.12, 0.1, 0.2, W / 2 + 0.06, S.cabin[0][1] + 0.08, S.cabin[0][0] - 0.2), boxG(0.12, 0.1, 0.2, -W / 2 - 0.06, S.cabin[0][1] + 0.08, S.cabin[0][0] - 0.2),
    boxG(W * 0.86, 0.04, 0.8, 0, (S.roof[1][1] + S.roof[2][1]) / 2 + 0.05, (S.roof[1][0] + S.roof[2][0]) / 2 + 0.2),
  ];
  const head = [boxG(0.42, 0.11, 0.08, W * 0.32, lightY, front - 0.05), boxG(0.42, 0.11, 0.08, -W * 0.32, lightY, front - 0.05)];
  const tail = [boxG(0.4, 0.13, 0.08, W * 0.34, tailY, rear + 0.02), boxG(0.4, 0.13, 0.08, -W * 0.34, tailY, rear + 0.02)];
  const plate = [boxG(0.52, 0.12, 0.02, 0, yb + 0.22, front + 0.05), boxG(0.52, 0.12, 0.02, 0, yb + 0.32, rear - 0.01)];
  // flip UV de la matrícula trasera
  const merge = (arr) => mergeGeometries(arr.map(clean));
  // neumático (torneado)
  const r = S.r, w = 0.24;
  const prof = [new THREE.Vector2(r * 0.62, -w / 2), new THREE.Vector2(r * 0.92, -w / 2), new THREE.Vector2(r, -w / 2 + 0.04), new THREE.Vector2(r, w / 2 - 0.04), new THREE.Vector2(r * 0.92, w / 2), new THREE.Vector2(r * 0.62, w / 2)];
  const tire = new THREE.LatheGeometry(prof, 26); tire.rotateZ(Math.PI / 2);
  const rimParts = [new THREE.CylinderGeometry(r * 0.64, r * 0.64, w * 0.7, 20).rotateZ(Math.PI / 2)];
  for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(0.02, r * 1.1, 0.05); sp.rotateX((k / 5) * Math.PI * 2); sp.translate(w * 0.37, 0, 0); rimParts.push(sp); }
  rimParts.push(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w * 0.8, 10).rotateZ(Math.PI / 2));
  const rim = merge(rimParts);
  const wheels = [[W / 2 - 0.16, r, hb], [-W / 2 + 0.16, r, hb], [W / 2 - 0.16, r, -hb], [-W / 2 + 0.16, r, -hb]];
  const g = { paint: merge([body, roof]), glass: merge([cabin]), trim: merge(trim), head: merge(head), tail: merge(tail), plate: merge(plate), tire: clean(tire), rim, wheels, spec: S };
  for (const k of ['paint', 'glass', 'trim', 'head', 'tail', 'plate', 'tire', 'rim']) g[k].computeBoundingSphere();
  geoCache[type] = g;
  return g;
}

let MATS = null;
export function carMaterials() {
  if (MATS) return MATS;
  const rub = T.rubber();
  MATS = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x07090b, metalness: 0.5, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.0, envMapIntensity: 1.6 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x111213, roughness: 0.55, metalness: 0.2 }),
    head: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    tail: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    plate: new THREE.MeshStandardMaterial({ map: T.plateTex(), roughness: 0.4 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, normalMap: rub.normalMap }),
    rim: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.22, metalness: 1 }),
  };
  return MATS;
}

// ---------------- Rig de coche individual (grupo) ----------------
export class CarRig {
  constructor(type, color, opts = {}) {
    const G = carGeometry(type); const M = carMaterials();
    this.type = type; this.spec = G.spec;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    const paint = M.paint.clone(); paint.color.set(color);
    this.headMat = M.head.clone(); this.tailMat = M.tail.clone();
    for (const [k, m] of [['paint', paint], ['glass', M.glass], ['trim', M.trim], ['head', this.headMat], ['tail', this.tailMat], ['plate', M.plate]]) {
      const mesh = new THREE.Mesh(G[k], m); mesh.castShadow = k !== 'head' && k !== 'tail'; mesh.receiveShadow = true; this.body.add(mesh);
    }
    this.paintMat = paint;
    this.wheels = G.wheels.map(([x, y, z]) => {
      const piv = new THREE.Group(); piv.position.set(x, y, z);
      const spin = new THREE.Group(); piv.add(spin);
      const t = new THREE.Mesh(G.tire, M.tire), r = new THREE.Mesh(G.rim, M.rim); t.castShadow = true; spin.add(t, r);
      if (x < 0) spin.scale.x = -1;
      this.root.add(piv); return { piv, spin, front: z > 0 };
    });
    this.spin = 0;
    if (opts.police) this.addPolice();
    if (opts.ambulance) this.addAmbulance();
    this.setLights(0.3, 0.3);
  }
  addPolice() {
    const S = this.spec; const W = S.W; const roofY = S.roof[2][1] + 0.03; const zc = (S.roof[1][0] + S.roof[2][0]) / 2 + 0.25;
    const liv = T.policeLivery('VALMORA');
    const lm = new THREE.MeshPhysicalMaterial({ map: liv, transparent: true, roughness: 0.3, clearcoat: 1, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(S.L * 0.86, 0.42), lm);
      p.position.set(side * (W / 2 + 0.005), 0.68, -0.05); p.rotation.y = side * Math.PI / 2; this.body.add(p);
    }
    const hoodT = T.textPanel('POLICÍA', { w: 512, h: 128, bg: 'rgba(0,0,0,0)', fg: '#0a3fa8', font: 'bold 96px Arial Black, Arial' });
    const hood = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: hoodT, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    hood.rotation.x = -Math.PI / 2 + 0.12; hood.rotation.z = Math.PI; hood.position.set(0, 0.9, 1.5); this.body.add(hood);
    // puente de luces
    const bar = new THREE.Group(); bar.position.set(0, roofY, zc);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.28), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })); base.position.y = 0.04; bar.add(base);
    this.barMats = [];
    for (let k = 0; k < 6; k++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x0a1a4a });
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.24), m); lens.position.set(-0.52 + k * 0.208, 0.13, 0); bar.add(lens);
      this.barMats.push(m);
    }
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.27, 0.11, 0.27), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0, transparent: true, opacity: 0.18, roughness: 0.05 }));
    cover.position.y = 0.13; bar.add(cover);
    this.body.add(bar); this.bar = bar;
    this.isPolice = true;
    // rejilla frontal con luces ocultas
    this.gridMats = [new THREE.MeshBasicMaterial({ color: 0x000000 }), new THREE.MeshBasicMaterial({ color: 0x000000 })];
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.02), this.gridMats[s < 0 ? 0 : 1]); m.position.set(s * 0.18, 0.55, S.L / 2 + 0.03); this.body.add(m); }
  }
  addAmbulance() {
    const t = T.textPanel('AMBULANCIA', { w: 1024, h: 160, bg: '#ffffff', fg: '#d0101e', font: 'bold 110px Arial Black, Arial' });
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const side of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.55), m); p.position.set(side * (this.spec.W / 2 + 0.01), 1.4, -0.6); p.rotation.y = side * Math.PI / 2; this.body.add(p); }
    const stripe = new THREE.MeshStandardMaterial({ color: 0x0aa04a, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const side of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.2), stripe); p.position.set(side * (this.spec.W / 2 + 0.008), 0.85, 0); p.rotation.y = side * Math.PI / 2; this.body.add(p); }
    this.barMats = [];
    for (const [x, z] of [[-0.8, 1.0], [0.8, 1.0], [-0.8, -2.6], [0.8, -2.6]]) { const mm = new THREE.MeshBasicMaterial({ color: 0x000000 }); const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), mm); l.position.set(x, 2.27, z); this.body.add(l); this.barMats.push(mm); }
    this.isAmbulance = true;
  }
  setLights(head, tail) {
    this.headMat.color.setRGB(1, 0.97, 0.9).multiplyScalar(head);
    this.tailMat.color.setRGB(1, 0.03, 0.02).multiplyScalar(tail);
  }
  // patrón de destellos estilo europeo (azul) con estroboscopio blanco
  updateBeacons(t, on, scheme = 'azul') {
    if (!this.barMats) return [0, 0];
    let L = 0, R = 0;
    if (on) {
      const ph = (t * 2.6) % 1; const side = ph < 0.5;
      const flick = (ph % 0.5) < 0.12 || ((ph % 0.5) > 0.2 && (ph % 0.5) < 0.32) ? 1 : 0.06;
      L = side ? flick : 0.04; R = side ? 0.04 : flick;
    }
    const n = this.barMats.length;
    this.barMats.forEach((m, k) => {
      const left = k < n / 2; const v = left ? L : R;
      let c;
      if (this.isAmbulance) c = [1, 0.35, 0.05];
      else if (scheme === 'rojo-azul') c = left ? [1, 0.03, 0.02] : [0.05, 0.25, 1];
      else c = [0.05, 0.25, 1];
      const strobe = (k === 2 || k === 3) && on && Math.sin(t * 40) > 0.6 && !this.isAmbulance ? 1 : 0;
      if (strobe) m.color.setRGB(8, 8, 9); else m.color.setRGB(c[0] * v * 12, c[1] * v * 12, c[2] * v * 12);
    });
    if (this.gridMats) { this.gridMats[0].color.setRGB(0.05 * R * 12, 0.25 * R * 12, 1 * R * 12); this.gridMats[1].color.setRGB(0.05 * L * 12, 0.25 * L * 12, 1 * L * 12); }
    return [L, R];
  }
  sync(x, y, z, heading, pitch, roll, steer, speed, dt) {
    this.root.position.set(x, y, z); this.root.rotation.set(0, heading, 0);
    this.body.rotation.set(pitch, 0, roll, 'YXZ');
    this.spin += speed * dt / this.spec.r;
    for (const w of this.wheels) { w.spin.rotation.x = this.spin; w.piv.rotation.y = w.front ? steer : 0; }
  }
}

// ---------------- Física del coche del jugador ----------------
export class DriveCar {
  constructor(city, rig, x, z, heading) {
    this.city = city; this.rig = rig; this.spec = rig.spec;
    this.x = x; this.z = z; this.y = 0; this.h = heading;
    this.vx = 0; this.vz = 0; this.w = 0; this.steer = 0;
    this.pitch = 0; this.roll = 0; this.pv = 0; this.rv = 0;
    this.rpm = 900; this.gear = 1; this.slip = 0; this.impact = 0; this.damage = 0;
    this.lights = false; this.siren = false; this.headlights = true; this.braking = false;
    this.L = this.spec.L; this.Wd = this.spec.W;
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }
  get vLong() { const [fx, fz] = this.fwd; return this.vx * fx + this.vz * fz; }
  update(dt, inp, wet, others) {
    const sub = 3; const h = dt / sub; this.impact = 0;
    for (let s = 0; s < sub; s++) this.step(h, inp, wet, others);
    // suspensión visual
    const kP = 60, cP = 9;
    this.pv += (-this.pitchTarget - this.pitch) * kP * dt - this.pv * cP * dt; this.pitch += this.pv * dt;
    this.rv += (this.rollTarget - this.roll) * kP * dt - this.rv * cP * dt; this.roll += this.rv * dt;
    const gy = this.city.groundY(this.x, this.z);
    this.y = damp(this.y, gy, 14, dt);
    this.rig.sync(this.x, this.y, this.z, this.h, this.pitch, this.roll, this.steer, this.vLong, dt);
    // motor
    const v = Math.abs(this.vLong); const gears = [0, 9, 17, 26, 35, 45, 70];
    let g = 1; while (g < gears.length - 1 && v > gears[g]) g++;
    this.gear = g; const lo = gears[g - 1], hi = gears[g];
    const target = 900 + clamp((v - lo) / (hi - lo), 0, 1) * 5400 + (inp.throttle > 0 ? 400 : 0);
    this.rpm = damp(this.rpm, target, 8, dt);
  }
  step(dt, inp, wet, others) {
    const S = this.spec; const [fx, fz] = this.fwd; const rx = -fz, rz = fx;
    let vL = this.vx * fx + this.vz * fz; let vS = this.vx * rx + this.vz * rz;
    const sp = Math.abs(vL);
    // dirección
    const maxSteer = lerp(0.62, 0.11, clamp(sp / 38, 0, 1));
    this.steer = damp(this.steer, inp.steer * maxSteer, 7, dt);
    // motor/frenos
    let acc = 0; this.braking = false;
    if (inp.throttle > 0) acc += inp.throttle * S.acc * (vL >= 0 ? clamp(1 - (vL / S.max) ** 2, 0, 1) : 2);
    if (inp.brake > 0) {
      if (vL > 0.8) { acc -= inp.brake * 15; this.braking = true; }
      else acc -= inp.brake * 6 * clamp(1 + vL / 9, 0, 1); // marcha atrás
    }
    if (inp.handbrake) { acc -= Math.sign(vL) * 4; this.braking = true; }
    const drag = 0.0016 * vL * Math.abs(vL) + 0.25 * vL * 0.1 + (inp.throttle === 0 && inp.brake === 0 ? Math.sign(vL) * 0.6 : 0);
    const prev = vL;
    vL += (acc - drag) * dt;
    if (inp.brake > 0 && prev > 0 && vL < 0 && !inp.reverseOk) vL = 0;
    if (Math.abs(vL) < 0.05 && inp.throttle === 0 && inp.brake === 0) vL = 0;
    // agarre lateral
    let grip = (inp.handbrake ? 1.6 : 8.5) * (1 - wet * 0.28);
    if (sp < 3) grip = 14;
    vS *= Math.exp(-grip * dt);
    this.slip = Math.abs(vS) + (inp.handbrake && sp > 6 ? 3 : 0) + (inp.throttle > 0 && sp < 8 && sp > 1 ? 1.5 * inp.throttle : 0);
    // guiñada
    let tw = vL * Math.tan(this.steer) / S.wb;
    if (inp.handbrake) tw *= 1.45;
    this.w = damp(this.w, tw, inp.handbrake ? 3 : 10 * (1 - wet * 0.25), dt);
    this.h += this.w * dt;
    this.vx = fx * vL + rx * vS; this.vz = fz * vL + rz * vS;
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.pitchTarget = clamp(acc * 0.006, -0.06, 0.05);
    this.rollTarget = clamp(vL * this.w * 0.009, -0.07, 0.07);
    this.collide(others);
  }
  collide(others) {
    const [fx, fz] = this.fwd; const r = this.Wd / 2 + 0.05; const off = this.L / 2 - r;
    const pts = [-off, 0, off];
    for (const o of pts) {
      const p = { x: this.x + fx * o, z: this.z + fz * o };
      const ox = p.x, oz = p.z;
      const hit = this.city.resolveCircle(p, r);
      if (hit) this.applyHit(p.x - ox, p.z - oz, hit.nx, hit.nz, o, 0.25);
    }
    // otros vehículos
    if (others) for (const c of others) {
      if (c === this) continue;
      const dx = c.x - this.x, dz = c.z - this.z; if (dx * dx + dz * dz > 64) continue;
      const [cfx, cfz] = [Math.sin(c.heading ?? c.h), Math.cos(c.heading ?? c.h)];
      const cr = (c.W || 1.8) / 2 + 0.05, coff = (c.L || 4.5) / 2 - cr;
      for (const o of pts) {
        const px = this.x + fx * o, pz = this.z + fz * o;
        for (const co of [-coff, 0, coff]) {
          const qx = c.x + cfx * co, qz = c.z + cfz * co;
          let ddx = px - qx, ddz = pz - qz; const d = Math.hypot(ddx, ddz);
          if (d < r + cr && d > 1e-4) {
            const nx = ddx / d, nz = ddz / d; const push = r + cr - d;
            this.applyHit(nx * push, nz * push, nx, nz, o, 0.35);
            c.onHit?.(this, -nx, -nz, Math.abs(this.vx * nx + this.vz * nz));
          }
        }
      }
    }
  }
  applyHit(dx, dz, nx, nz, o, rest) {
    this.x += dx; this.z += dz;
    const vn = this.vx * nx + this.vz * nz;
    if (vn < 0) {
      this.vx -= nx * vn * (1 + rest); this.vz -= nz * vn * (1 + rest);
      this.vx *= 0.94; this.vz *= 0.94;
      const [fx, fz] = this.fwd; const cross = fx * nz - fz * nx; // par de giro
      this.w += cross * o * vn * 0.06;
      this.impact = Math.max(this.impact, -vn);
      if (-vn > 4) this.damage = Math.min(1, this.damage + (-vn) * 0.006);
    }
  }
}

// ---------------- Conductor por carriles (IA) ----------------
export class LaneDriver {
  constructor(i, j, dir, off = CITY.LANE_IN, s = 0) {
    this.off = off; this.i = i; this.j = j; this.dir = dir; this.route = null; this.chooser = null;
    this.makeStraight(); this.s = s;
  }
  makeStraight() {
    const [dx, dz] = DIRS[this.dir]; const [rx, rz] = rightOf(this.dir);
    const ax = nodeCoord(this.i), az = nodeCoord(this.j);
    this.seg = { type: 'S', x0: ax + dx * 8 + rx * this.off, z0: az + dz * 8 + rz * this.off, x1: ax + dx * (CITY.PITCH - 8) + rx * this.off, z1: az + dz * (CITY.PITCH - 8) + rz * this.off, len: CITY.PITCH - 16, dir: this.dir };
    this.bi = this.i + dx; this.bj = this.j + dz; // nodo destino
    this.s = 0;
  }
  options() {
    const out = [];
    for (let d = 0; d < 4; d++) {
      if (d === (this.dir + 2) % 4) continue;
      const ni = this.bi + DIRS[d][0], nj = this.bj + DIRS[d][1];
      if (ni < 0 || nj < 0 || ni >= CITY.N || nj >= CITY.N) continue;
      out.push(d);
    }
    return out.length ? out : [(this.dir + 2) % 4];
  }
  makeTurn(nd) {
    const [dx, dz] = DIRS[this.dir]; const [rx, rz] = rightOf(this.dir);
    const [ndx, ndz] = DIRS[nd]; const [nrx, nrz] = rightOf(nd);
    const bx = nodeCoord(this.bi), bz = nodeCoord(this.bj);
    const x0 = this.seg.x1, z0 = this.seg.z1;
    const x2 = bx + ndx * 8 + nrx * this.off, z2 = bz + ndz * 8 + nrz * this.off;
    let cx, cz;
    if (nd === this.dir) { cx = (x0 + x2) / 2; cz = (z0 + z2) / 2; } else { cx = bx + rx * this.off + nrx * this.off; cz = bz + rz * this.off + nrz * this.off; }
    void dx; void dz;
    let len = 0, px = x0, pz = z0;
    for (let k = 1; k <= 10; k++) { const t = k / 10; const q = this.bez(x0, z0, cx, cz, x2, z2, t); len += Math.hypot(q[0] - px, q[1] - pz); px = q[0]; pz = q[1]; }
    this.seg = { type: 'C', x0, z0, cx, cz, x2, z2, len, from: this.dir, to: nd };
    this.s = 0;
  }
  bez(x0, z0, cx, cz, x2, z2, t) { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x2, u * u * z0 + 2 * u * t * cz + t * t * z2]; }
  nextDir() {
    if (this.route && this.route.length) return this.route.shift();
    const opts = this.options();
    if (this.chooser) return this.chooser(opts, this);
    // preferencia por seguir recto
    if (opts.includes(this.dir) && Math.random() < 0.55) return this.dir;
    return opts[(Math.random() * opts.length) | 0];
  }
  advance(ds) {
    this.s += ds;
    let guard = 4;
    while (this.s >= this.seg.len && guard--) {
      const rem = this.s - this.seg.len;
      if (this.seg.type === 'S') { const nd = this.nextDir(); this.makeTurn(nd); }
      else { this.i = this.bi; this.j = this.bj; this.dir = this.seg.to; this.makeStraight(); this.onNode?.(this.i, this.j); }
      this.s = rem;
    }
  }
  pose(lat = 0) {
    const sg = this.seg; let x, z, tx, tz;
    if (sg.type === 'S') { const t = this.s / sg.len; x = lerp(sg.x0, sg.x1, t); z = lerp(sg.z0, sg.z1, t); tx = sg.x1 - sg.x0; tz = sg.z1 - sg.z0; }
    else {
      const t = clamp(this.s / sg.len, 0, 1); [x, z] = this.bez(sg.x0, sg.z0, sg.cx, sg.cz, sg.x2, sg.z2, t);
      const u = 1 - t; tx = 2 * u * (sg.cx - sg.x0) + 2 * t * (sg.x2 - sg.cx); tz = 2 * u * (sg.cz - sg.z0) + 2 * t * (sg.z2 - sg.cz);
    }
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    // derecha = (-tz, tx)
    x += -tz * lat; z += tx * lat;
    return { x, z, heading: Math.atan2(tx, tz), turning: sg.type === 'C' };
  }
  // distancia hasta la línea de detención (si se aproxima a intersección)
  distToStop() { return this.seg.type === 'S' ? this.seg.len - 4.8 - this.s : Infinity; }
}

// ---------------- Vehículo IA ----------------
let AI_ID = 0;
export class AICar {
  constructor(traffic, type, color, driver, opts = {}) {
    this.id = AI_ID++; this.traffic = traffic; this.type = type; this.color = new THREE.Color(color);
    const S = CAR_TYPES[type]; this.L = S.L; this.W = S.W; this.spec = S;
    this.driver = driver; this.speed = opts.speed ?? 8; this.cruise = opts.cruise ?? (10 + Math.random() * 4);
    this.lat = 0; this.latTarget = 0; this.state = opts.state || 'drive';
    this.x = 0; this.z = 0; this.heading = 0; this.y = 0; this.pitch = 0; this.roll = 0;
    this.spinA = 0; this.steer = 0; this.brake = false; this.hazard = false; this.blockT = 0; this.stunT = 0; this.honkT = 0;
    this.static = !!opts.static; this.flags = opts.flags || {};
    if (opts.pose) Object.assign(this, opts.pose);
    else if (driver) this.updatePose(0);
  }
  updatePose(dt) {
    const p = this.driver.pose(this.lat);
    const dh = wrapAngle(p.heading - this.heading);
    this.steer = damp(this.steer, clamp(dh / Math.max(dt, 1e-3) * 0.12, -0.5, 0.5), 8, dt || 1);
    this.x = p.x; this.z = p.z; this.heading = p.heading;
    this.roll = damp(this.roll, clamp(-dh / Math.max(dt, 1e-3) * this.speed * 0.004, -0.05, 0.05), 6, dt || 1);
  }
  onHit(other, nx, nz, mag) {
    if (mag > 1.5) {
      this.stunT = 3 + Math.min(4, mag * 0.4); this.speed *= 0.2; this.hazard = true;
      this.traffic.events.push({ type: 'hit', car: this, mag });
    }
  }
}

// ---------------- Gestor de tráfico ----------------
export class Traffic {
  constructor(scene, city, q) {
    this.scene = scene; this.city = city; this.q = q; this.cars = []; this.parked = []; this.events = [];
    this.rnd = mulberry32(77);
    const M = carMaterials();
    this.types = {};
    const cap = { sedan: 70, hatch: 60, suv: 40, van: 30 };
    for (const t of Object.keys(CAR_TYPES)) {
      const G = carGeometry(t); const ms = {};
      for (const k of ['paint', 'glass', 'trim', 'head', 'tail', 'plate']) {
        const im = new THREE.InstancedMesh(G[k], M[k], cap[t]); im.count = 0; im.frustumCulled = false;
        im.castShadow = k === 'paint' || k === 'glass'; im.receiveShadow = true;
        if (k === 'paint' || k === 'head' || k === 'tail') im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap[t] * 3), 3);
        scene.add(im); ms[k] = im;
      }
      ms.tire = new THREE.InstancedMesh(G.tire, M.tire, cap[t] * 4); ms.rim = new THREE.InstancedMesh(G.rim, M.rim, cap[t] * 4);
      ms.tire.count = ms.rim.count = 0; ms.tire.frustumCulled = ms.rim.frustumCulled = false; ms.tire.castShadow = true;
      scene.add(ms.tire, ms.rim);
      this.types[t] = { G, ms, n: 0 };
    }
    // sombras de contacto
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.blobMat = new THREE.MeshBasicMaterial({ map: T.radial('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)', 128), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.blobs = new THREE.InstancedMesh(sg, this.blobMat, 260); this.blobs.count = 0; this.blobs.frustumCulled = false; this.blobs.renderOrder = 2; scene.add(this.blobs);
    // charcos de luz de faros
    this.beamMat = new THREE.MeshBasicMaterial({ map: T.radial('rgba(255,240,215,0.6)', 'rgba(255,240,215,0)', 128), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
    this.beams = new THREE.InstancedMesh(sg, this.beamMat, 220); this.beams.count = 0; this.beams.frustumCulled = false; this.beams.renderOrder = 2; scene.add(this.beams);
    this.fx = [this.blobs, this.beams];
    this.m4 = new THREE.Matrix4(); this.q4 = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.s3 = new THREE.Vector3(1, 1, 1); this.e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.wm = new THREE.Matrix4(); this.tmp = new THREE.Matrix4(); this.c = new THREE.Color();
    this.extra = []; // vehículos tipo rig (jugador, servicios) para la IA
  }
  randomType() { const r = this.rnd(); return r < 0.45 ? 'sedan' : r < 0.75 ? 'hatch' : r < 0.92 ? 'suv' : 'van'; }
  randomColor() { return PALETTE[(this.rnd() * PALETTE.length) | 0]; }

  spawnParked() {
    // coches aparcados en carril exterior de calles residenciales
    for (const s of this.city.segments) {
      if (s.axis === 'x' && s.j === CITY.N - 1) continue;
      const near = s.axis === 'x' ? [this.city.blockAt(s.x, s.z - 44), this.city.blockAt(s.x, s.z + 44)] : [this.city.blockAt(s.x - 44, s.z), this.city.blockAt(s.x + 44, s.z)];
      for (const side of [-1, 1]) {
        const bt = near[side < 0 ? 0 : 1];
        if (!bt || !['residencial', 'ocio'].includes(bt)) continue;
        if (this.rnd() < 0.35) continue;
        s.parked = true;
        for (let t = -26; t <= 26; t += 6.2) {
          if (this.rnd() < 0.45) continue;
          let x, z, heading;
          if (s.axis === 'x') { x = s.x + t; z = s.z + side * CITY.PARK; heading = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
          else { x = s.x - side * CITY.PARK; z = s.z + t; heading = side > 0 ? 0 : Math.PI; }
          const type = this.rnd() < 0.5 ? 'sedan' : this.rnd() < 0.7 ? 'hatch' : 'suv';
          const car = new AICar(this, type, this.randomColor(), null, { static: true, pose: { x, z, heading: heading + (this.rnd() - 0.5) * 0.04 }, state: 'parked' });
          car.y = 0; this.parked.push(car);
        }
      }
    }
  }

  spawnTraffic(n, around) {
    for (let k = 0; k < n; k++) this.spawnOne(around, 40, 260);
  }
  spawnOne(around, minD = 120, maxD = 300, opts = {}) {
    for (let tries = 0; tries < 40; tries++) {
      const i = (this.rnd() * CITY.N) | 0, j = (this.rnd() * CITY.N) | 0, d = (this.rnd() * 4) | 0;
      const ni = i + DIRS[d][0], nj = j + DIRS[d][1]; if (ni < 0 || nj < 0 || ni >= CITY.N || nj >= CITY.N) continue;
      const drv = new LaneDriver(i, j, d, CITY.LANE_IN, 5 + this.rnd() * 60);
      const p = drv.pose(0); const dd = Math.hypot(p.x - around.x, p.z - around.z);
      if (dd < minD || dd > maxD) continue;
      if (this.cars.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 10)) continue;
      const car = new AICar(this, opts.type || this.randomType(), opts.color ?? this.randomColor(), drv, opts);
      car.speed = car.cruise * 0.8;
      this.cars.push(car); return car;
    }
    return null;
  }

  remove(car) { const i = this.cars.indexOf(car); if (i >= 0) this.cars.splice(i, 1); }

  // obstáculos a considerar por la IA
  obstacles() { return this.cars.concat(this.parked.filter((p) => p.blocking), this.extra); }

  update(dt, time, ctx) {
    const { player, sirenOn, night, peds } = ctx;
    const all = this.cars;
    const others = this.obstacles();
    for (const car of all) {
      if (car.static || car.state === 'parked' || car.state === 'stopped') { car.speed = 0; continue; }
      const drv = car.driver;
      let desired = car.cruise;
      if (car.state === 'flee') desired = car.cruise;
      if (car.stunT > 0) { car.stunT -= dt; desired = 0; if (car.stunT <= 0) car.hazard = false; }
      // semáforos
      if (!car.flags.ignoreLights) {
        const dStop = drv.distToStop();
        if (dStop > -0.5 && dStop < 45) {
          const axis = drv.dir % 2 === 0 ? 0 : 1;
          const st = this.city.lightState(drv.bi, drv.bj, axis, time);
          if (st === 'R' || (st === 'A' && dStop > car.speed * 1.2)) desired = Math.min(desired, Math.sqrt(Math.max(0, 2 * 5.5 * Math.max(0, dStop - 0.3))));
        }
      }
      // reducir en curvas
      if (drv.seg.type === 'C' && drv.seg.from !== drv.seg.to) desired = Math.min(desired, car.state === 'flee' ? 11 : 6.5);
      // seguimiento
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading); const rx = -fz, rz = fx;
      let gap = Infinity, blocker = null;
      for (const o of others) {
        if (o === car) continue;
        const dx = o.x - car.x, dz = o.z - car.z; if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue;
        const al = dx * fx + dz * fz; if (al <= 0 || al > 28) continue;
        const la = dx * rx + dz * rz; if (Math.abs(la) > 1.7) continue;
        const g = al - (car.L + (o.L || 4.5)) / 2;
        if (g < gap) { gap = g; blocker = o; }
      }
      if (peds) for (const p of peds) { const dx = p.x - car.x, dz = p.z - car.z; const al = dx * fx + dz * fz; if (al <= 0 || al > 14) continue; const la = dx * rx + dz * rz; if (Math.abs(la) > 1.5) continue; const g = al - car.L / 2 - 0.5; if (g < gap) { gap = g; blocker = p; } }
      if (gap < Infinity) desired = Math.min(desired, Math.max(0, (gap - 2.2) * 1.1));
      // bloqueos prolongados -> cambio de carril
      if (blocker && gap < 8 && (blocker.static || blocker.state === 'stopped' || blocker.state === 'parked' || (blocker.isPlayer && blocker.speed < 0.5) || blocker.stunT > 0)) {
        car.blockT += dt;
        if (car.blockT > 1.6 && car.latTarget === 0) car.latTarget = car.state === 'flee' ? -4.4 : CITY.LANE_OUT - CITY.LANE_IN;
        if (blocker.isPlayer && car.blockT > 2.2 && car.honkT <= 0) { car.honkT = 4 + Math.random() * 4; this.events.push({ type: 'honk', car }); }
      } else car.blockT = Math.max(0, car.blockT - dt);
      if (car.state === 'flee' && blocker && gap < 14 && car.latTarget === 0) car.latTarget = Math.random() < 0.5 ? -4.4 : 3.8;
      car.honkT -= dt;
      // ceder paso a la sirena
      if (sirenOn && player && car.state === 'drive') {
        const dx = player.x - car.x, dz = player.z - car.z; const al = dx * fx + dz * fz; const la = dx * rx + dz * rz;
        const pf = player.fwd; const same = pf[0] * fx + pf[1] * fz;
        if (al < 0 && al > -45 && Math.abs(la) < 6 && same > 0.6) { car.yieldT = 3; }
      }
      if (car.yieldT > 0) { car.yieldT -= dt; car.latTarget = CITY.LANE_OUT - CITY.LANE_IN + 0.6; desired = Math.min(desired, 3); }
      else if (car.latTarget > 0 && car.blockT === 0 && car.state === 'drive' && (!blocker || gap > 12)) car.returnT = (car.returnT || 0) + dt;
      if (car.returnT > 3 && car.state === 'drive') { car.latTarget = 0; car.returnT = 0; }
      if (car.state === 'flee' && car.latTarget !== 0 && (!blocker || gap > 18)) { car.returnT = (car.returnT || 0) + dt; if (car.returnT > 1.5) { car.latTarget = 0; car.returnT = 0; } }
      // detenerse en arcén
      if (car.state === 'pullover') {
        car.latTarget = CITY.PARK - CITY.LANE_IN; desired = Math.min(desired, Math.abs(car.lat - car.latTarget) < 0.4 ? 0 : 4);
        if (drv.seg.type === 'C' || drv.distToStop() < 6) desired = Math.max(desired, 5);
        if (car.speed < 0.2 && Math.abs(car.lat - car.latTarget) < 0.4 && drv.seg.type === 'S') { car.state = 'stopped'; car.hazard = true; this.events.push({ type: 'pulledOver', car }); }
      }
      if (drv.seg.type === 'C' && car.latTarget !== 0 && car.state !== 'flee') car.latTarget = 0;
      // dinámica
      const acc = desired > car.speed ? (car.state === 'flee' ? 6 : 2.6) : -7.5;
      car.speed = desired > car.speed ? Math.min(desired, car.speed + acc * dt) : Math.max(desired, car.speed + acc * dt);
      car.brake = desired < car.speed - 0.3 || car.speed < 0.3;
      car.lat = damp(car.lat, car.latTarget, car.state === 'flee' ? 3 : 1.4, dt);
      drv.advance(car.speed * dt);
      car.updatePose(dt);
      car.pitch = damp(car.pitch, car.brake ? 0.018 : 0, 5, dt);
      car.y = this.city.groundY(car.x, car.z) * 0.5;
      car.spinA += car.speed * dt / car.spec.r;
    }
    // reciclado de coches lejanos
    if (player) {
      for (const car of [...this.cars]) {
        if (car.flags.mission) continue;
        const d = Math.hypot(car.x - player.x, car.z - player.z);
        if (d > 340) { this.remove(car); this.spawnOne(player, 160, 300); }
      }
    }
    this.render(time, night, player);
  }

  render(time, night, player) {
    for (const t of Object.values(this.types)) t.n = 0;
    let nb = 0, nl = 0;
    const blink = Math.sin(time * 6.5) > 0;
    const px = player ? player.x : 0, pz = player ? player.z : 0;
    const list = this.cars.concat(this.parked);
    for (const car of list) {
      const dx = car.x - px, dz = car.z - pz; if (dx * dx + dz * dz > 330 * 330) continue;
      const T = this.types[car.type]; const k = T.n++; if (k >= T.ms.paint.instanceMatrix.count) { T.n--; continue; }
      this.e.set(car.pitch, car.heading, car.roll); this.q4.setFromEuler(this.e);
      this.v3.set(car.x, car.y, car.z); this.m4.compose(this.v3, this.q4, this.s3);
      for (const key of ['paint', 'glass', 'trim', 'head', 'tail', 'plate']) T.ms[key].setMatrixAt(k, this.m4);
      T.ms.paint.setColorAt(k, car.color);
      const moving = car.state !== 'parked';
      const hl = moving ? (night > 0.4 ? 9 : 0.9) : 0.15;
      this.c.setRGB(hl, hl * 0.96, hl * 0.86); if (car.hazard && blink) this.c.setRGB(4, 1.6, 0.1); T.ms.head.setColorAt(k, this.c);
      let tl = moving ? (night > 0.4 ? 1.6 : 0.35) : 0.1; if (car.brake && moving) tl = 7;
      this.c.setRGB(tl, tl * 0.04, tl * 0.03); if (car.hazard && blink) this.c.setRGB(5, 1.8, 0.1); T.ms.tail.setColorAt(k, this.c);
      // ruedas
      const W = T.G.wheels;
      for (let w = 0; w < 4; w++) {
        const [x, y, z] = W[w];
        this.tmp.makeRotationX(car.spinA);
        if (x < 0) this.tmp.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
        if (z > 0 && car.steer) this.tmp.premultiply(new THREE.Matrix4().makeRotationY(car.steer));
        this.tmp.setPosition(x, y, z);
        this.wm.multiplyMatrices(this.m4, this.tmp);
        T.ms.tire.setMatrixAt(k * 4 + w, this.wm); T.ms.rim.setMatrixAt(k * 4 + w, this.wm);
      }
      // sombra de contacto
      if (nb < 260) { this.q4.setFromAxisAngle(this.v3.set(0, 1, 0), car.heading); this.m4.compose(this.v3.set(car.x, car.y + 0.02, car.z), this.q4, new THREE.Vector3(car.W * 1.25, 1, car.L * 1.08)); this.blobs.setMatrixAt(nb++, this.m4); }
      if (moving && night > 0.4 && nl < 220) { const fx = Math.sin(car.heading), fz = Math.cos(car.heading); this.m4.compose(this.v3.set(car.x + fx * (car.L / 2 + 5), 0.035, car.z + fz * (car.L / 2 + 5)), this.q4, new THREE.Vector3(6, 1, 11)); this.beams.setMatrixAt(nl++, this.m4); }
    }
    // rigs externos (jugador, servicios): sólo sombra de contacto
    for (const r of this.extra) {
      if (nb >= 260) break;
      this.q4.setFromAxisAngle(this.v3.set(0, 1, 0), r.heading); this.m4.compose(this.v3.set(r.x, (r.y || 0) + 0.02, r.z), this.q4, new THREE.Vector3(r.W * 1.25, 1, r.L * 1.08)); this.blobs.setMatrixAt(nb++, this.m4);
    }
    for (const t of Object.values(this.types)) {
      for (const key of ['paint', 'glass', 'trim', 'head', 'tail', 'plate']) { t.ms[key].count = t.n; t.ms[key].instanceMatrix.needsUpdate = true; if (t.ms[key].instanceColor) t.ms[key].instanceColor.needsUpdate = true; }
      t.ms.tire.count = t.ms.rim.count = t.n * 4; t.ms.tire.instanceMatrix.needsUpdate = t.ms.rim.instanceMatrix.needsUpdate = true;
    }
    this.blobs.count = nb; this.blobs.instanceMatrix.needsUpdate = true;
    this.beams.count = nl; this.beams.instanceMatrix.needsUpdate = true; this.beamMat.opacity = night > 0.4 ? 0.7 : 0;
  }

  // coches cercanos a un punto (para interacción)
  nearest(x, z, maxD = 6, filter = () => true) {
    let best = null, bd = maxD;
    for (const c of this.cars.concat(this.parked)) { if (!filter(c)) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
    return best;
  }
}

// ---------------- Vehículo de servicio (patrulla de apoyo / ambulancia) ----------------
export class ServiceCar {
  constructor(scene, city, kind, from, target) {
    this.city = city; this.kind = kind;
    this.rig = kind === 'ambulance' ? new CarRig('van', 0xf5f5f2, { ambulance: true }) : new CarRig('sedan', 0xf4f6f8, { police: true });
    scene.add(this.rig.root);
    this.L = this.rig.spec.L; this.W = this.rig.spec.W; this.speed = 0; this.y = 0;
    const [ti, tj] = city.nearestNode(target.x, target.z);
    const [fi, fj] = from;
    this.driver = new LaneDriver(fi, fj, 0, CITY.LANE_IN, 0);
    // dirección inicial hacia el objetivo
    const route = city.route([fi, fj], [ti, tj]);
    const dirs = [];
    for (let k = 1; k < route.length; k++) { const di = route[k][0] - route[k - 1][0], dj = route[k][1] - route[k - 1][1]; dirs.push(DIRS.findIndex((d) => d[0] === di && d[1] === dj)); }
    if (!dirs.length) { const opts = [0, 1, 2, 3].filter((d) => { const a = fi + DIRS[d][0], b = fj + DIRS[d][1]; return a >= 0 && b >= 0 && a < CITY.N && b < CITY.N; }); dirs.push(opts[0]); }
    this.driver.dir = dirs.shift(); this.driver.makeStraight(); this.driver.route = dirs;
    this.target = target; this.arrived = false; this.lat = 0; this.heading = 0; this.x = 0; this.z = 0;
    this.state = 'drive';
  }
  update(dt, time, others, night) {
    if (!this.arrived) {
      const p0 = this.driver.pose(this.lat);
      const d = Math.hypot(p0.x - this.target.x, p0.z - this.target.z);
      let desired = 17;
      if ((!this.driver.route || !this.driver.route.length) && d < 45) desired = Math.max(0, d - 8) * 0.6;
      if (this.driver.seg.type === 'C' && this.driver.seg.from !== this.driver.seg.to) desired = Math.min(desired, 8);
      // evitar colisiones
      const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
      for (const o of others) { if (o === this) continue; const dx = o.x - this.x, dz = o.z - this.z; const al = dx * fx + dz * fz; if (al <= 0 || al > 20) continue; const la = dx * -fz + dz * fx; if (Math.abs(la) > 1.7) continue; desired = Math.min(desired, Math.max(0, al - 7)); }
      this.speed = damp(this.speed, desired, 1.5, dt);
      if (d < 12 && this.speed < 0.5) { this.arrived = true; this.state = 'stopped'; }
      if (!this.driver.route?.length && this.driver.seg.type === 'S' && d < 40) this.lat = damp(this.lat, CITY.PARK - CITY.LANE_IN, 1.2, dt);
      this.driver.advance(this.speed * dt);
      const p = this.driver.pose(this.lat); this.x = p.x; this.z = p.z; this.heading = p.heading;
    }
    this.rig.sync(this.x, 0, this.z, this.heading, 0, 0, 0, this.speed, dt);
    this.rig.setLights(night > 0.4 ? 9 : 1, 1.5);
    this.rig.updateBeacons(time + (this.kind === 'ambulance' ? 0.3 : 0.17), true);
  }
  dispose(scene) { scene.remove(this.rig.root); }
}
