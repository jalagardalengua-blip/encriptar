// Interior jugable de la Comisaría Central (recepción, calabozos, taquillas, sala de operaciones,
// despacho de la comisaria y acceso al garaje). Se construye fuera del mapa urbano y se entra por la puerta.
import * as THREE from 'three';
import * as T from './textures.js';
import { NPC } from './people.js';

export const IN = { x: 2000, z: 0, y: 0.15 }; // origen del interior (coordenadas del mundo)

function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  return T.tex(c, srgb, repeat);
}

export class StationInterior {
  constructor(scene, city, mapCanvas) {
    this.scene = scene; this.city = city; this.group = new THREE.Group(); this.group.position.set(IN.x, IN.y, IN.z);
    this.group.visible = false; scene.add(this.group); this.npcs = []; this.lights = [];
    const W = 20, D = 26, H = 3.6; this.H = H;
    // materiales
    const floorT = canvasTex(512, 512, (x, w) => {
      x.fillStyle = '#c9cdd2'; x.fillRect(0, 0, w, w);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 196 + ((i + j) % 2) * 14 + Math.random() * 6; x.fillStyle = `rgb(${v},${v + 2},${v + 6})`; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
      x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k <= 4; k++) { x.fillRect(k * 128 - 1, 0, 2, w); x.fillRect(0, k * 128 - 1, w, 2); }
    }, [W / 2, D / 2]);
    const wallT = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#e8eaee'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#0b3d91'; x.fillRect(0, h * 0.62, w, h * 0.06); x.fillStyle = '#c7ccd4'; x.fillRect(0, h * 0.88, w, h * 0.12);
    }, [4, 1]);
    const M = {
      floor: new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.18, metalness: 0.05 }),
      wall: new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.85 }),
      ceil: new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6b4a31, roughness: 0.55 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1d222b, roughness: 0.5, metalness: 0.3 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8c949e, roughness: 0.35, metalness: 0.85 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x173a7a, roughness: 0.6 }),
      locker: new THREE.MeshStandardMaterial({ color: 0x4d6a8f, roughness: 0.45, metalness: 0.6 }),
      screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.65, 1.4) }),
      panel: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.5) }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25 }),
    };
    this.M = M;
    const g = this.group;
    const box = (w, h, d, x, y, z, m, col = true, cast = true) => {
      const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y + h / 2, z); me.castShadow = cast; me.receiveShadow = true; g.add(me);
      if (col) this.city.addCollider(IN.x + x - w / 2, IN.z + z - d / 2, IN.x + x + w / 2, IN.z + z + d / 2, y + h, 'interior');
      return me;
    };
    const plane = (w, h, x, y, z, ry, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); return p; };
    // suelo y techo
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.001, D / 2); fl.receiveShadow = true; g.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D), M.ceil); ce.rotation.x = Math.PI / 2; ce.position.set(0, H, D / 2); g.add(ce);
    for (let x = -15; x <= 15; x += 7.5) for (let z = 4; z < D; z += 7) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), M.panel); p.rotation.x = Math.PI / 2; p.position.set(x, H - 0.01, z); g.add(p); }
    // muros exteriores
    const t = 0.25;
    box(W * 2, H, t, 0, 0, -t / 2, M.wall); box(W * 2, H, t, 0, 0, D + t / 2, M.wall);
    box(t, H, D, -W - t / 2, 0, D / 2, M.wall); box(t, H, D, W + t / 2, 0, D / 2, M.wall);
    // tabique entre recepción y zona interior (z=10) con tres vanos
    const z10 = 10; const gaps = [-12, 0, 12]; let x0 = -W;
    for (const gx of gaps) { box(gx - 1.3 - x0, H, t, (x0 + gx - 1.3) / 2, 0, z10, M.wall); x0 = gx + 1.3; }
    box(W - x0, H, t, (x0 + W) / 2, 0, z10, M.wall);
    // tabiques de las salas traseras
    box(t, H, D - z10, -7, 0, (z10 + D) / 2, M.wall); box(t, H, D - z10, 7, 0, (z10 + D) / 2, M.wall);
    // puerta de salida y marco
    box(2.6, 0.2, 0.3, 0, 2.6, 0.1, M.dark, false); plane(2.2, 2.5, 0, 1.25, 0.14, 0, M.glass);
    // ---------- RECEPCIÓN ----------
    box(8, 1.05, 0.9, 0, 0, 6.2, M.wood); box(8.2, 0.06, 1.1, 0, 1.05, 6.2, M.dark, false);
    for (const x of [-2.5, 2.5]) { box(0.55, 0.38, 0.05, x, 1.11, 6.4, M.dark, false); const s = plane(0.5, 0.32, x, 1.3, 6.37, Math.PI, M.screen); void s; }
    const emblem = T.textPanel('POLICÍA LOCAL · VALMORA', { w: 1024, h: 180, bg: '#0b3d91', fg: '#ffffff', font: 'bold 90px Arial Black, Arial' });
    plane(9, 1.6, 0, 2.6, 9.86, Math.PI, new THREE.MeshStandardMaterial({ map: emblem, emissiveMap: emblem, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    for (const x of [-15, -10.5]) { box(3.4, 0.45, 0.6, x, 0, 1.2, M.blue); box(3.4, 0.6, 0.1, x, 0.45, 0.95, M.blue, false); }
    // cuadro con el mapa de la ciudad
    if (mapCanvas) { const mt = new THREE.CanvasTexture(mapCanvas); mt.colorSpace = THREE.SRGBColorSpace; plane(3.4, 3.4, -W + 0.15, 1.9, 6, Math.PI / 2, new THREE.MeshBasicMaterial({ map: mt })); }
    // acceso al garaje (pared izquierda)
    box(0.2, 2.8, 3.2, -W + 0.1, 0, 3.6, M.metal, false);
    const gs = T.textPanel('GARAJE', { w: 512, h: 128, bg: '#1d222b', fg: '#ffb020', font: 'bold 90px Arial' }); plane(1.6, 0.4, -W + 0.22, 3.0, 3.6, Math.PI / 2, new THREE.MeshBasicMaterial({ map: gs }));
    // ---------- CALABOZOS (derecha de recepción) ----------
    const barM = M.metal;
    box(t, H, z10 - 0.2, 12, 0, z10 / 2 + 0.1, M.glass, true, false).visible = false; // colisión de la reja
    for (let z = 0.4; z < z10 - 0.2; z += 0.28) box(0.05, 2.6, 0.05, 12, 0, z, barM, false, false);
    box(0.08, 0.1, z10, 12, 2.6, z10 / 2, barM, false);
    box(W - 12, H, t, 16, 0, 5, M.wall); // separa dos celdas
    for (const z of [2.5, 7.5]) box(3.2, 0.45, 0.7, 18.2, 0, z, M.dark);
    const cs = T.textPanel('CALABOZOS', { w: 512, h: 128, bg: '#1d222b', fg: '#ffffff', font: 'bold 80px Arial' }); plane(1.8, 0.45, 11.85, 3.0, 5, -Math.PI / 2, new THREE.MeshBasicMaterial({ map: cs }));
    this.cellSeats = [{ x: 18.2, z: 2.5 }, { x: 18.2, z: 7.5 }];
    // ---------- TAQUILLAS (atrás izquierda) ----------
    for (let k = 0; k < 7; k++) { const x = -19 + k * 1.6; box(1.5, 2.1, 0.55, x + 0.75, 0, D - 0.4, M.locker); box(0.06, 0.2, 0.02, x + 1.2, 1.1, D - 0.68, M.metal, false); }
    box(5, 0.45, 0.4, -13.5, 0, 18, M.wood);
    const ls = T.textPanel('VESTUARIOS', { w: 512, h: 128, bg: '#e8eaee', fg: '#0b3d91', font: 'bold 80px Arial' }); plane(1.8, 0.45, -12, 3.0, 10.15, 0, new THREE.MeshBasicMaterial({ map: ls }));
    // ---------- SALA DE OPERACIONES (atrás centro) ----------
    for (const [x, z] of [[-4, 14], [0, 14], [4, 14], [-4, 19], [0, 19], [4, 19]]) {
      box(2.2, 0.75, 1.1, x, 0, z, M.wood); box(0.7, 0.45, 0.05, x, 0.78, z - 0.25, M.dark, false);
      plane(0.62, 0.38, x, 1.0, z - 0.22, 0, M.screen); box(0.5, 0.5, 0.5, x, 0, z + 0.9, M.dark, false);
    }
    const os = T.textPanel('SALA DE OPERACIONES', { w: 1024, h: 128, bg: '#e8eaee', fg: '#0b3d91', font: 'bold 70px Arial' }); plane(2.6, 0.33, 0, 3.0, 10.15, 0, new THREE.MeshBasicMaterial({ map: os }));
    if (mapCanvas) { const mt = new THREE.CanvasTexture(mapCanvas); mt.colorSpace = THREE.SRGBColorSpace; plane(5, 2.6, 0, 1.9, D - 0.15, Math.PI, new THREE.MeshBasicMaterial({ map: mt, color: new THREE.Color(1.2, 1.2, 1.3) })); }
    // ---------- DESPACHO DE LA COMISARIA (atrás derecha) ----------
    box(2.6, 0.78, 1.2, 13.5, 0, 20, M.wood); box(0.6, 0.4, 0.05, 13.5, 0.8, 19.7, M.dark, false); plane(0.55, 0.33, 13.5, 1.0, 19.68, 0, M.screen);
    for (const x of [8.5, 19]) box(0.5, 2.2, 3.5, x, 0, 23.5, M.wood);
    const ds = T.textPanel('COMISARÍA', { w: 512, h: 128, bg: '#e8eaee', fg: '#0b3d91', font: 'bold 80px Arial' }); plane(1.8, 0.45, 12, 3.0, 10.15, 0, new THREE.MeshBasicMaterial({ map: ds }));
    for (let k = 0; k < 3; k++) { box(0.05, 2.4, 0.05, 17.5 + k * 0.8, 0, D - 0.6, M.metal, false); }
    const flagC = [0xc8102e, 0xffc400, 0x0b3d91];
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: flagC[k], side: THREE.DoubleSide })); f.position.set(17.85 + k * 0.8, 2.1, D - 0.6); g.add(f); }
    // luces interiores (sólo activas dentro)
    for (const [x, z] of [[2, 5], [-10, 18], [10, 18]]) { const l = new THREE.PointLight(0xfff2e0, 0, 16, 1.6); l.position.set(x, H - 0.4, z); g.add(l); this.lights.push(l); }
    // personal
    this.staff = [];
    this.recep = this.addNPC({ name: 'Agente Sara Molina', role: 'Recepción', x: 0, z: 7.4, heading: Math.PI, state: 'idle', officer: true });
    this.chief = this.addNPC({ name: 'Comisaria Elena Ortega', role: 'Jefatura', x: 13.5, z: 21.3, heading: Math.PI, state: 'idle', officer: true });
    this.desk1 = this.addNPC({ name: 'Agente Hugo Prieto', role: 'Operaciones', x: 4, z: 15.1, heading: Math.PI, state: 'phone', officer: true });
    this.detainees = [];
  }
  addNPC(o) { const n = new NPC(this.scene, this.city, { ...o, x: IN.x + o.x, z: IN.z + o.z }); n.heading = o.heading || 0; n.faceTarget = n.heading; n.h.root.visible = false; this.npcs.push(n); return n; }
  local(x, z) { return { x: IN.x + x, z: IN.z + z }; }
  setDetainees(n) {
    while (this.detainees.length < Math.min(2, n)) { const s = this.cellSeats[this.detainees.length]; const d = this.addNPC({ name: 'Detenido', role: 'Calabozo', x: s.x, z: s.z + 0.3, heading: -Math.PI / 2, state: 'hurt', shirt: 0x3a3f47 }); d.visible = this.inside; this.detainees.push(d); }
  }
  setInside(on) {
    this.inside = on; this.group.visible = on;
    for (const l of this.lights) { l.intensity = on ? 9 : 0; l.distance = on ? 22 : 0.01; }
    for (const n of this.npcs) n.visible = on;
  }
  update(dt) { if (!this.inside) return; for (const n of this.npcs) n.update(dt); }
  static isInside(x) { return x > IN.x - 100; }
}
