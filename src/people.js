// Personas: esqueleto procedural, animación, multitudes instanciadas y PNJ de misión
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CITY, clamp, damp, lerp, wrapAngle, mulberry32 } from './config.js';

const ni = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };

let GEO = null;
export function humanGeometry() {
  if (GEO) return GEO;
  const torsoProf = [[0.001, 0], [0.135, 0.01], [0.142, 0.1], [0.138, 0.2], [0.16, 0.32], [0.185, 0.42], [0.19, 0.48], [0.17, 0.53], [0.1, 0.57], [0.055, 0.6], [0.05, 0.64], [0.001, 0.645]].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.LatheGeometry(torsoProf, 18); torso.scale(1.08, 1, 0.66);
  const hips = new THREE.SphereGeometry(0.15, 14, 10); hips.scale(1.05, 0.7, 0.7); hips.translate(0, 0.0, 0);
  const head = new THREE.SphereGeometry(0.105, 18, 14); head.scale(0.9, 1.12, 1.0);
  const nose = new THREE.ConeGeometry(0.018, 0.04, 6); nose.rotateX(Math.PI / 2); nose.translate(0, -0.005, 0.105);
  const ears = [-1, 1].map((s) => { const e = new THREE.SphereGeometry(0.022, 6, 6); e.scale(0.5, 1, 0.8); e.translate(s * 0.093, 0, 0); return e; });
  const hair = new THREE.SphereGeometry(0.112, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55); hair.scale(0.93, 1.1, 1.05); hair.translate(0, 0.012, -0.006);
  const uarm = new THREE.CapsuleGeometry(0.05, 0.2, 4, 10); uarm.translate(0, -0.14, 0);
  const farm = new THREE.CapsuleGeometry(0.041, 0.19, 4, 10); farm.translate(0, -0.13, 0);
  const hand = new THREE.SphereGeometry(0.047, 8, 6); hand.scale(0.7, 1.15, 1); hand.translate(0, -0.29, 0.005);
  const thigh = new THREE.CapsuleGeometry(0.075, 0.3, 4, 10); thigh.translate(0, -0.21, 0);
  const shin = new THREE.CapsuleGeometry(0.058, 0.32, 4, 10); shin.translate(0, -0.21, 0);
  const shoe = new THREE.BoxGeometry(0.1, 0.075, 0.25); shoe.translate(0, -0.43, 0.04);
  const shoeT = new THREE.SphereGeometry(0.05, 8, 6); shoeT.scale(1, 0.75, 1); shoeT.translate(0, -0.43, 0.15);
  GEO = {
    torso: mergeGeometries([ni(torso), ni(hips)]),
    head: mergeGeometries([ni(head), ni(nose), ...ears.map(ni)]),
    hair: ni(hair), uarm: ni(uarm), farm: mergeGeometries([ni(farm), ni(hand)]), farmNoHand: ni(farm), hand: ni(hand),
    thigh: ni(thigh), shin: ni(shin), shoe: mergeGeometries([ni(shoe), ni(shoeT)]),
  };
  return GEO;
}

// Dimensiones del esqueleto
const HIP_Y = 0.93, SH_Y = 0.5, SH_X = 0.2, HEAD_Y = 0.7, HIP_X = 0.095, UARM = 0.29, THIGH = 0.43;

// Poses: devuelve ángulos articulares
export function computePose(state, t, speed, out = {}) {
  const P = out;
  P.bob = 0; P.lean = 0; P.yawT = 0; P.headP = 0; P.headY = 0; P.drop = 0;
  P.lS = 0; P.lA = 0.08; P.lE = -0.15; P.rS = 0; P.rA = 0.08; P.rE = -0.15;
  P.lH = 0; P.lK = 0; P.rH = 0; P.rK = 0;
  if (state === 'walk' || state === 'run') {
    const run = state === 'run'; const amp = run ? 0.85 : 0.45 + Math.min(speed, 2) * 0.05;
    const s = Math.sin(t), c = Math.cos(t);
    P.lH = s * amp; P.rH = -s * amp;
    P.lK = Math.max(0, -Math.sin(t - 0.9)) * (run ? 1.5 : 0.8) + 0.05; P.rK = Math.max(0, Math.sin(t - 0.9)) * (run ? 1.5 : 0.8) + 0.05;
    P.lS = -s * amp * (run ? 1.1 : 0.7); P.rS = s * amp * (run ? 1.1 : 0.7);
    P.lE = run ? -1.4 : -0.25 - Math.max(0, s) * 0.3; P.rE = run ? -1.4 : -0.25 - Math.max(0, -s) * 0.3;
    P.bob = Math.abs(c) * (run ? 0.06 : 0.025); P.lean = run ? 0.18 : 0.03; P.yawT = s * 0.08;
  } else if (state === 'idle' || state === 'talk' || state === 'argue') {
    const b = Math.sin(t * 0.9) * 0.012; P.bob = b; P.lean = 0.0; P.headY = Math.sin(t * 0.37) * 0.25;
    P.lA = 0.12 + Math.sin(t * 0.5) * 0.02; P.rA = 0.12;
    if (state === 'talk') { P.rS = -0.5 - Math.sin(t * 2.3) * 0.25; P.rE = -1.0 + Math.sin(t * 3.1) * 0.3; P.headY = Math.sin(t * 1.1) * 0.15; P.headP = Math.sin(t * 2.7) * 0.06; }
    if (state === 'argue') { P.rS = -0.9 - Math.sin(t * 4.3) * 0.5; P.rE = -0.6 - Math.sin(t * 5.1) * 0.5; P.lS = -0.5 - Math.sin(t * 3.7 + 1) * 0.4; P.lE = -1.2; P.lean = 0.08 + Math.sin(t * 4) * 0.05; P.headP = Math.sin(t * 5) * 0.1; }
  } else if (state === 'hurt') { // sentado en el bordillo
    P.drop = 0.5; P.lH = -1.45; P.rH = -1.35; P.lK = 1.5; P.rK = 1.35; P.lean = 0.35; P.lS = -0.6; P.lE = -1.4; P.rS = -0.3; P.rE = -1.6; P.headP = 0.35 + Math.sin(t * 0.6) * 0.05;
  } else if (state === 'cuffed') {
    P.lS = 0.45; P.rS = 0.45; P.lA = -0.05; P.rA = -0.05; P.lE = -1.3; P.rE = -1.3; P.headP = 0.2; P.bob = Math.sin(t) * 0.01;
  } else if (state === 'hands') {
    P.lS = -2.6; P.rS = -2.6; P.lA = 0.35; P.rA = 0.35; P.lE = -0.6; P.rE = -0.6;
  } else if (state === 'down') {
    P.down = true;
  } else if (state === 'phone') {
    P.rS = -0.4; P.rA = 0.25; P.rE = -2.3; P.headY = 0.25; P.headP = 0.1;
  } else if (state === 'photo') {
    P.lS = -1.2; P.rS = -1.2; P.lE = -1.4; P.rE = -1.4; P.lA = -0.2; P.rA = -0.2; P.headP = 0.1;
  }
  return P;
}

// Calcula matrices de cada parte a partir de la raíz y la pose
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
function TRS(x, y, z, rx, ry, rz, out) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); return out.compose(_v, _q, _one); }
export function poseMatrices(root, P, scale, out) {
  // out: {torso, head, hair, uarmL, uarmR, farmL, farmR, thighL, thighR, shinL, shinR, shoeL, shoeR} Matrix4
  const base = out.base || (out.base = new THREE.Matrix4());
  base.copy(root);
  if (P.down) { base.multiply(TRS(0, 0.15, 0, -Math.PI / 2, 0, 0, _m)); }
  const pelvis = out.pelvis || (out.pelvis = new THREE.Matrix4());
  pelvis.multiplyMatrices(base, TRS(0, (HIP_Y - P.drop + P.bob) * scale, 0, 0, 0, 0, _m)).multiply(_m2.makeScale(scale, scale, scale));
  const chest = out.chest || (out.chest = new THREE.Matrix4());
  chest.multiplyMatrices(pelvis, TRS(0, 0, 0, P.lean, P.yawT, 0, _m));
  out.torso.copy(chest);
  out.head.multiplyMatrices(chest, TRS(0, HEAD_Y, 0, P.headP, P.headY, 0, _m));
  out.hair.copy(out.head);
  // brazos
  out.uarmL.multiplyMatrices(chest, TRS(SH_X, SH_Y, 0, P.lS, 0, P.lA, _m));
  out.farmL.multiplyMatrices(out.uarmL, TRS(0, -UARM, 0, P.lE, 0, 0, _m));
  out.uarmR.multiplyMatrices(chest, TRS(-SH_X, SH_Y, 0, P.rS, 0, -P.rA, _m));
  out.farmR.multiplyMatrices(out.uarmR, TRS(0, -UARM, 0, P.rE, 0, 0, _m));
  // piernas
  out.thighL.multiplyMatrices(pelvis, TRS(HIP_X, -0.02, 0, -P.lH, 0, 0.02, _m));
  out.shinL.multiplyMatrices(out.thighL, TRS(0, -THIGH, 0, P.lK, 0, 0, _m));
  out.thighR.multiplyMatrices(pelvis, TRS(-HIP_X, -0.02, 0, -P.rH, 0, -0.02, _m));
  out.shinR.multiplyMatrices(out.thighR, TRS(0, -THIGH, 0, P.rK, 0, 0, _m));
  out.shoeL.copy(out.shinL); out.shoeR.copy(out.shinR);
  return out;
}
const PARTS = ['torso', 'head', 'hair', 'uarmL', 'uarmR', 'farmL', 'farmR', 'thighL', 'thighR', 'shinL', 'shinR', 'shoeL', 'shoeR'];
const newOut = () => { const o = {}; for (const p of PARTS) o[p] = new THREE.Matrix4(); return o; };

const SKIN = [0xf1c8a8, 0xe0ac87, 0xc68a62, 0x8d5a3b, 0x5c3a24, 0xf5d5bd];
const HAIR = [0x1a1410, 0x3b2a1e, 0x6b4a2b, 0xb08a5a, 0x2a2a2a, 0x8a8a8a, 0x5a1a10];
const SHIRT = [0x2c3e50, 0x8e2b2b, 0xd9d4c7, 0x3d6b4a, 0x1f1f22, 0x6a4c93, 0xc08a3e, 0x4a6fa5, 0x777777, 0xa83f6f, 0x1d5c7a, 0xe6e6e6];
const PANTS = [0x1c2433, 0x2b2b2b, 0x4a4036, 0x30405a, 0x5b5b5b, 0x6b5a45, 0x1a1a1a];

// ---------------- Humanoide individual (jugador y PNJ) ----------------
export class Humanoid {
  constructor(opts = {}) {
    const G = humanGeometry();
    this.root = new THREE.Group(); this.root.matrixAutoUpdate = true;
    this.scale = opts.scale || 1;
    const std = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const skin = new THREE.MeshPhysicalMaterial({ color: opts.skin ?? SKIN[0], roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0.9, 0.5, 0.4) });
    this.mats = { skin, shirt: std(opts.shirt ?? 0x334455, 0.8), pants: std(opts.pants ?? 0x222222, 0.8), hair: std(opts.hair ?? 0x1a1410, 0.6), shoe: std(opts.shoe ?? 0x111111, 0.45) };
    const sleeve = opts.sleeves === false ? skin : this.mats.shirt;
    const mk = (g, m) => { const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; me.matrixAutoUpdate = false; this.root.add(me); return me; };
    this.parts = {
      torso: mk(G.torso, this.mats.shirt), head: mk(G.head, skin), hair: mk(G.hair, this.mats.hair),
      uarmL: mk(G.uarm, this.mats.shirt), uarmR: mk(G.uarm, this.mats.shirt),
      farmL: mk(G.farmNoHand, sleeve), farmR: mk(G.farmNoHand, sleeve), handL: mk(G.hand, skin), handR: mk(G.hand, skin),
      thighL: mk(G.thigh, this.mats.pants), thighR: mk(G.thigh, this.mats.pants), shinL: mk(G.shin, this.mats.pants), shinR: mk(G.shin, this.mats.pants),
      shoeL: mk(G.shoe, this.mats.shoe), shoeR: mk(G.shoe, this.mats.shoe),
    };
    this.extras = [];
    if (opts.officer) this.makeOfficer();
    if (opts.cap) this.addCap(opts.cap);
    this.out = newOut(); this.P = {};
    this.x = 0; this.z = 0; this.y = 0; this.heading = 0; this.phase = 0; this.state = 'idle'; this.speed = 0; this.t = Math.random() * 10;
    this.rootM = new THREE.Matrix4();
  }
  makeOfficer() {
    // uniforme azul marino, chaleco reflectante, gorra, cinturón y placa
    this.mats.shirt.color.set(0x1b2a4a); this.mats.pants.color.set(0x141c2e);
    const vest = new THREE.Mesh(humanGeometry().torso, new THREE.MeshStandardMaterial({ color: 0xc9f227, roughness: 0.6, emissive: 0x2a3300, emissiveIntensity: 0.2 }));
    vest.matrixAutoUpdate = false; vest.castShadow = true; this.root.add(vest);
    this.vest = vest;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.035, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.8 }));
    band.scale.set(1.04, 1, 0.7); band.position.y = 0.36; band.matrixAutoUpdate = true;
    this.vestBand = band;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4 }));
    belt.scale.set(1.08, 1, 0.75); belt.position.y = 0.02;
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4 })); holster.position.set(-0.18, -0.04, 0.0);
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.03), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })); radio.position.set(0.12, 0.47, 0.1);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.01), new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 1 })); badge.position.set(-0.08, 0.43, 0.125);
    const chestGroup = new THREE.Group(); chestGroup.add(band, belt, holster, radio, badge); chestGroup.matrixAutoUpdate = false;
    this.root.add(chestGroup); this.chestGroup = chestGroup;
    this.addCap(0x141c2e, true);
  }
  addCap(color, police = false) {
    const g = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.075, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.6 })); crown.position.y = 0.095;
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 })); visor.position.set(0, 0.06, 0.06); visor.scale.set(1, 1, 0.8);
    g.add(crown, visor);
    if (police) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.116, 0.025, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })); b.position.y = 0.085; g.add(b); const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.01), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.3 })); e.position.set(0, 0.1, 0.115); g.add(e); }
    g.matrixAutoUpdate = false; this.root.add(g); this.cap = g; this.parts.hair.visible = !police;
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'walk' || this.state === 'run') this.phase += dt * (this.state === 'run' ? 9.5 : 5.2 + this.speed * 0.9);
    const P = computePose(this.state, this.state === 'walk' || this.state === 'run' ? this.phase : this.t, this.speed, this.P);
    this.rootM.compose(_v.set(this.x, this.y, this.z), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading), _one);
    this.root.position.set(0, 0, 0); this.root.rotation.set(0, 0, 0); this.root.updateMatrix();
    poseMatrices(this.rootM, P, this.scale, this.out);
    const o = this.out, p = this.parts;
    for (const k of ['torso', 'head', 'hair', 'uarmL', 'uarmR', 'farmL', 'farmR', 'thighL', 'thighR', 'shinL', 'shinR', 'shoeL', 'shoeR']) p[k].matrix.copy(o[k]);
    p.handL.matrix.copy(o.farmL); p.handR.matrix.copy(o.farmR);
    if (this.vest) { this.vest.matrix.copy(o.torso).multiply(_m.makeScale(1.07, 0.8, 1.1)).premultiply(_m2.identity()); this.vest.matrix.copy(o.torso); this.vest.matrix.multiply(_m.compose(_v.set(0, 0.17, 0), _q.identity(), new THREE.Vector3(1.07, 0.62, 1.12))); }
    if (this.chestGroup) this.chestGroup.matrix.copy(o.torso);
    if (this.cap) this.cap.matrix.copy(o.head);
    this.root.matrixWorldNeedsUpdate = true;
  }
}

// ---------------- Multitud instanciada ----------------
export class Crowd {
  constructor(scene, city, count) {
    this.city = city; this.scene = scene; this.count = count; this.rnd = mulberry32(99);
    const G = humanGeometry();
    const skinM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const clothM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const shoeM = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
    const def = { torso: [G.torso, clothM, 1], head: [G.head, skinM, 1], hair: [G.hair, clothM, 1], uarm: [G.uarm, clothM, 2], farm: [G.farm, skinM, 2], thigh: [G.thigh, clothM, 2], shin: [G.shin, clothM, 2], shoe: [G.shoe, shoeM, 2] };
    this.im = {};
    for (const [k, [g, m, mult]] of Object.entries(def)) {
      const im = new THREE.InstancedMesh(g, m, count * mult); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      if (k !== 'shoe') im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * mult * 3), 3);
      scene.add(im); this.im[k] = im;
    }
    // sombras
    this.peds = [];
    for (let i = 0; i < count; i++) this.peds.push(this.makePed());
    this.out = newOut(); this.P = {}; this.root = new THREE.Matrix4(); this.c = new THREE.Color();
    this.colorsDirty = true;
  }
  makePed() {
    const r = this.rnd;
    return {
      blk: null, p: 0, dir: r() < 0.5 ? 1 : -1, lat: 0.4 + r() * 1.6, speed: 1.0 + r() * 0.6, phase: r() * 6, t: r() * 10,
      state: 'walk', idleT: 0, x: 1e5, z: 1e5, heading: 0, scale: 0.92 + r() * 0.16, fleeT: 0, downT: 0, vx: 0, vz: 0,
      skin: new THREE.Color(SKIN[(r() * SKIN.length) | 0]), hair: new THREE.Color(HAIR[(r() * HAIR.length) | 0]), shirt: new THREE.Color(SHIRT[(r() * SHIRT.length) | 0]), pants: new THREE.Color(PANTS[(r() * PANTS.length) | 0]),
      shortSleeve: r() < 0.3, bald: r() < 0.1, L: 0.6, W: 0.6,
    };
  }
  placeNear(ped, px, pz, minD, maxD) {
    const blocks = this.city.blocks.filter((b) => { const d = Math.hypot(b.cx - px, b.cz - pz); return d < maxD + 50 && b.type !== 'puerto' && b.type !== 'industrial'; });
    if (!blocks.length) return;
    for (let k = 0; k < 10; k++) {
      const b = blocks[(this.rnd() * blocks.length) | 0];
      ped.blk = b; ped.p = this.rnd() * 264;
      this.posOf(ped);
      const d = Math.hypot(ped.x - px, ped.z - pz);
      if (d > minD && d < maxD) return;
    }
  }
  posOf(ped) {
    const a = 33.6 - ped.lat; const b = ped.blk; const L = 2 * a; const per = 4 * L;
    let p = ((ped.p % per) + per) % per; const side = Math.floor(p / L); const t = p - side * L;
    let x, z, hx, hz;
    if (side === 0) { x = -a + t; z = -a; hx = 1; hz = 0; } else if (side === 1) { x = a; z = -a + t; hx = 0; hz = 1; } else if (side === 2) { x = a - t; z = a; hx = -1; hz = 0; } else { x = -a; z = a - t; hx = 0; hz = -1; }
    ped.tx = b.cx + x; ped.tz = b.cz + z;
    if (ped.state !== 'flee') { ped.x = ped.tx; ped.z = ped.tz; }
    const h = Math.atan2(hx * ped.dir, hz * ped.dir);
    ped.heading = ped.heading === undefined ? h : ped.heading + wrapAngle(h - ped.heading) * 0.2;
  }
  update(dt, ctx) {
    const { player, playerCar, camPos, events } = ctx;
    const ref = playerCar || player;
    for (const ped of this.peds) {
      if (!ped.blk || Math.hypot(ped.x - ref.x, ped.z - ref.z) > 190) { this.placeNear(ped, ref.x, ref.z, ped.blk ? 90 : 5, 170); ped.state = 'walk'; ped.downT = 0; }
      ped.t += dt;
      // reacción a vehículos
      if (playerCar && ped.state !== 'down') {
        const dx = ped.x - playerCar.x, dz = ped.z - playerCar.z; const d = Math.hypot(dx, dz);
        const sp = playerCar.speed;
        if (d < 1.6 + playerCar.L * 0.4 && sp > 3.5) {
          ped.state = 'down'; ped.downT = 4; events.push({ type: 'pedHit', ped, speed: sp });
          ped.vx = playerCar.vx * 0.5; ped.vz = playerCar.vz * 0.5;
        } else if (d < 9 && sp > 5 && ped.state !== 'flee') {
          const vx = playerCar.vx / sp, vz = playerCar.vz / sp; const ahead = -(dx * vx + dz * vz);
          if (ahead < 0) { ped.state = 'flee'; ped.fleeT = 1.4; const s = (dx * -vz + dz * vx) > 0 ? 1 : -1; ped.vx = -vz * s * 5.5; ped.vz = vx * s * 5.5; ped.heading = Math.atan2(ped.vx, ped.vz); }
        }
      }
      if (ped.state === 'down') {
        ped.downT -= dt; ped.x += ped.vx * dt; ped.z += ped.vz * dt; ped.vx *= 0.9; ped.vz *= 0.9;
        if (ped.downT <= 0) { ped.state = 'walk'; }
      } else if (ped.state === 'flee') {
        ped.fleeT -= dt; ped.x += ped.vx * dt; ped.z += ped.vz * dt; ped.phase += dt * 10;
        const p = { x: ped.x, z: ped.z }; this.city.resolveCircle(p, 0.3); ped.x = p.x; ped.z = p.z;
        if (ped.fleeT <= 0) { ped.state = 'return'; }
      } else if (ped.state === 'return') {
        const dx = ped.tx - ped.x, dz = ped.tz - ped.z; const d = Math.hypot(dx, dz);
        if (d < 0.3) ped.state = 'walk'; else { ped.x += dx / d * 1.6 * dt; ped.z += dz / d * 1.6 * dt; ped.heading = Math.atan2(dx, dz); ped.phase += dt * 6.5; }
      } else if (ped.state === 'idle') {
        ped.idleT -= dt; if (ped.idleT <= 0) ped.state = 'walk';
      } else {
        ped.p += ped.dir * ped.speed * dt; ped.phase += dt * (5.0 + ped.speed);
        this.posOf(ped);
        if (this.rnd() < dt * 0.02) { ped.state = 'idle'; ped.idleT = 2 + this.rnd() * 6; }
        if (this.rnd() < dt * 0.005) ped.dir *= -1;
      }
      // empuje del jugador a pie
      if (player && !playerCar) {
        const dx = ped.x - player.x, dz = ped.z - player.z; const d = Math.hypot(dx, dz);
        if (d < 0.65 && d > 1e-3) { ped.x += dx / d * (0.65 - d); ped.z += dz / d * (0.65 - d); }
      }
    }
    this.render(camPos);
  }
  render(camPos) {
    let n = 0;
    const one = new THREE.Vector3(1, 1, 1);
    for (const ped of this.peds) {
      if (!ped.blk) continue;
      const dx = ped.x - camPos.x, dz = ped.z - camPos.z; if (dx * dx + dz * dz > 200 * 200) continue;
      const st = ped.state === 'flee' ? 'run' : ped.state === 'return' ? 'walk' : ped.state;
      const P = computePose(st, st === 'walk' || st === 'run' ? ped.phase : ped.t, ped.speed, this.P);
      this.root.compose(new THREE.Vector3(ped.x, CITY.CURB * (this.city.groundY(ped.x, ped.z) > 0 ? 1 : 0), ped.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ped.heading), one);
      poseMatrices(this.root, P, ped.scale, this.out);
      const o = this.out, I = this.im;
      I.torso.setMatrixAt(n, o.torso); I.head.setMatrixAt(n, o.head); I.hair.setMatrixAt(n, o.hair);
      I.uarm.setMatrixAt(n * 2, o.uarmL); I.uarm.setMatrixAt(n * 2 + 1, o.uarmR);
      I.farm.setMatrixAt(n * 2, o.farmL); I.farm.setMatrixAt(n * 2 + 1, o.farmR);
      I.thigh.setMatrixAt(n * 2, o.thighL); I.thigh.setMatrixAt(n * 2 + 1, o.thighR);
      I.shin.setMatrixAt(n * 2, o.shinL); I.shin.setMatrixAt(n * 2 + 1, o.shinR);
      I.shoe.setMatrixAt(n * 2, o.shoeL); I.shoe.setMatrixAt(n * 2 + 1, o.shoeR);
      I.torso.setColorAt(n, ped.shirt); I.head.setColorAt(n, ped.skin); I.hair.setColorAt(n, ped.bald ? ped.skin : ped.hair);
      I.uarm.setColorAt(n * 2, ped.shortSleeve ? ped.skin : ped.shirt); I.uarm.setColorAt(n * 2 + 1, ped.shortSleeve ? ped.skin : ped.shirt);
      I.farm.setColorAt(n * 2, ped.skin); I.farm.setColorAt(n * 2 + 1, ped.skin);
      for (const k of ['thigh', 'shin']) { I[k].setColorAt(n * 2, ped.pants); I[k].setColorAt(n * 2 + 1, ped.pants); }
      n++;
    }
    for (const [k, im] of Object.entries(this.im)) {
      const mult = ['torso', 'head', 'hair'].includes(k) ? 1 : 2;
      im.count = n * mult; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }
  active() { return this.peds.filter((p) => p.blk && p.state !== 'down'); }
}

// ---------------- PNJ de misión ----------------
export class NPC {
  constructor(scene, city, opts) {
    this.city = city; this.scene = scene;
    this.name = opts.name; this.role = opts.role; this.mood = opts.mood || 'calmado';
    this.h = new Humanoid({ skin: opts.skin ?? SKIN[(Math.random() * SKIN.length) | 0], shirt: opts.shirt ?? SHIRT[(Math.random() * SHIRT.length) | 0], pants: opts.pants ?? PANTS[(Math.random() * PANTS.length) | 0], hair: opts.hair ?? HAIR[(Math.random() * HAIR.length) | 0], cap: opts.cap, sleeves: opts.sleeves, officer: opts.officer });
    scene.add(this.h.root);
    this.x = opts.x; this.z = opts.z; this.heading = opts.heading || 0; this.state = opts.state || 'idle';
    this.target = null; this.speed = 0; this.talkT = 0; this.visible = true;
    this.data = opts.data || {};
    this.L = 0.6; this.W = 0.6;
  }
  walkTo(x, z, run = false) { this.target = { x, z }; this.run = run; }
  face(x, z) { this.faceTarget = Math.atan2(x - this.x, z - this.z); }
  update(dt) {
    if (!this.visible) { this.h.root.visible = false; return; }
    this.h.root.visible = true;
    if (this.target) {
      const dx = this.target.x - this.x, dz = this.target.z - this.z; const d = Math.hypot(dx, dz);
      if (d < 0.35) { this.target = null; this.state = this.restState || 'idle'; this.speed = 0; }
      else {
        const sp = this.run ? 5.6 : 1.5; this.speed = sp;
        this.x += dx / d * sp * dt; this.z += dz / d * sp * dt;
        const p = { x: this.x, z: this.z }; this.city.resolveCircle(p, 0.3); this.x = p.x; this.z = p.z;
        this.heading += wrapAngle(Math.atan2(dx, dz) - this.heading) * Math.min(1, dt * 8);
        this.state = this.run ? 'run' : 'walk';
      }
    } else if (this.faceTarget !== undefined && this.state !== 'hurt' && this.state !== 'down') {
      this.heading += wrapAngle(this.faceTarget - this.heading) * Math.min(1, dt * 4);
    }
    if (this.talkT > 0) { this.talkT -= dt; if (this.state === 'idle') this.h.state = 'talk'; } else this.h.state = this.state;
    if (this.talkT <= 0) this.h.state = this.state;
    this.h.x = this.x; this.h.z = this.z; this.h.y = this.city.groundY(this.x, this.z); this.h.heading = this.heading; this.h.speed = this.speed;
    this.h.update(dt);
  }
  dispose() { this.scene.remove(this.h.root); }
}
