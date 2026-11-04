// Generación procedural de la ciudad de Valmora
import * as THREE from 'three';
import { CITY, nodeCoord, DIRS, rightOf, mulberry32, STREETS_X, STREETS_Z, clamp } from './config.js';
import * as T from './textures.js';

// ---------------- Constructor de geometría ----------------
class Geo {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  quad(a, b, c, d, uv, color = [1, 1, 1]) {
    // a,b,c,d en sentido antihorario visto desde el exterior
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c, d]) { this.pos.push(p[0], p[1], p[2]); this.nor.push(nx, ny, nz); this.col.push(color[0], color[1], color[2]); }
    this.uv.push(...uv);
    const n = this.n; this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3); this.n += 4;
  }
  // pared vertical de p0 a p1 (normal hacia la derecha del recorrido)
  wall(x0, z0, x1, z1, y0, y1, tw, th, color, uOff = 0, vBase = y0) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const u0 = uOff, u1 = uOff + len / tw, v0 = (y0 - vBase) / th, v1 = (y1 - vBase) / th;
    this.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [u0, v0, u1, v0, u1, v1, u0, v1], color);
  }
  walls(x0, z0, x1, z1, y0, y1, tw, th, color, uOff = 0, vBase = y0) {
    this.wall(x0, z1, x1, z1, y0, y1, tw, th, color, uOff, vBase);
    this.wall(x1, z1, x1, z0, y0, y1, tw, th, color, uOff + 0.37, vBase);
    this.wall(x1, z0, x0, z0, y0, y1, tw, th, color, uOff + 0.71, vBase);
    this.wall(x0, z0, x0, z1, y0, y1, tw, th, color, uOff + 0.13, vBase);
  }
  top(x0, z0, x1, z1, y, s = 1, color) {
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [x0 / s, -z1 / s, x1 / s, -z1 / s, x1 / s, -z0 / s, x0 / s, -z0 / s], color);
  }
  box(cx, cy, cz, w, h, d, s = 1, color, bottom = false) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    this.walls(x0, z0, x1, z1, y0, y1, s, s, color, 0, 0);
    this.top(x0, z0, x1, z1, y1, s, color);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, 0, 1, 0, 1, 1, 0, 1], color);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65000 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// Modificación de materiales del suelo para mojado y charcos
export const wetUniform = { value: 0 };
function makeWet(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWet = wetUniform;
    sh.fragmentShader = 'uniform float uWet;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      #ifdef USE_ROUGHNESSMAP
        float puddle = smoothstep(0.35, 0.75, texelRoughness.r) * smoothstep(0.25, 0.8, uWet);
        float wetR = mix(0.22, 0.03, puddle);
        roughnessFactor = mix(roughnessFactor, wetR, uWet);
        diffuseColor.rgb *= mix(1.0, mix(0.55, 0.3, puddle), uWet);
      #endif
    `);
  };
  mat.customProgramCacheKey = () => 'wet';
  return mat;
}

function pbr(t, extra = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.orm, metalnessMap: t.orm,
    roughness: 1, metalness: 1, ...extra,
  });
  if (t.emissiveMap && extra.emissive !== undefined) m.emissiveMap = t.emissiveMap;
  return m;
}

const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// ---------------- Ciudad ----------------
export class City {
  constructor(scene, quality, onProgress = () => {}) {
    this.scene = scene;
    this.q = quality;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.colliders = [];
    this.grid = new Map();
    this.blocks = [];
    this.buildings = [];
    this.shops = [];
    this.doors = [];
    this.parking = [];
    this.trafficLights = [];
    this.nightMats = [];
    this.rnd = mulberry32(20261104);
    this.onProgress = onProgress;
  }

  async build() {
    const step = async (p, label) => { this.onProgress(p, label); await new Promise((r) => setTimeout(r, 0)); };
    T.setAniso(this.q.aniso);
    await step(0.05, 'Generando asfalto y aceras…');
    this.tex = {
      asphalt: T.asphalt(), markings: T.roadMarkings(), sidewalk: T.sidewalk(), grass: T.grass(),
    };
    await step(0.15, 'Pintando fachadas…');
    this.tex.plaster = T.facadePlaster(); this.tex.brick = T.facadeBrick();
    await step(0.25, 'Fachadas de vidrio y oficinas…');
    this.tex.glass = T.facadeGlass(); this.tex.office = T.facadeOffice();
    await step(0.32, 'Naves industriales y comercios…');
    this.tex.industrial = T.facadeIndustrial(); this.tex.store = T.storefront(); this.tex.roof = T.roof(); this.tex.concrete = T.concrete(); this.tex.container = T.containerTex();
    this.tex.signs = T.signAtlas();
    await step(0.4, 'Construyendo materiales PBR…');
    this.makeMaterials();
    await step(0.45, 'Trazando calles…');
    this.buildGround();
    this.buildRoads();
    await step(0.52, 'Levantando edificios…');
    this.buildBlocks();
    await step(0.66, 'Farolas, semáforos y arbolado…');
    this.buildLamps();
    this.buildTrafficLights();
    this.buildTrees();
    this.buildFarCity();
    this.buildWater();
    await step(0.72, 'Optimizando geometría…');
    this.finalizeGeometry();
    return this;
  }

  makeMaterials() {
    const t = this.tex; const M = {};
    const as = pbr(t.asphalt); t.asphalt.map.repeat.set(1 / 8, 1 / 8); t.asphalt.orm.repeat.set(1 / 8, 1 / 8); t.asphalt.normalMap.repeat.set(1 / 8, 1 / 8);
    M.asphalt = makeWet(as); M.asphalt.metalness = 0; M.asphalt.metalnessMap = null;
    M.markings = new THREE.MeshStandardMaterial({ map: t.markings, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.sidewalk = makeWet(pbr(t.sidewalk)); M.sidewalk.metalness = 0; M.sidewalk.metalnessMap = null;
    M.grass = pbr(t.grass); M.grass.metalness = 0; M.grass.metalnessMap = null;
    const facade = (tx, emi) => pbr(tx, { emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, ...emi });
    M.plaster = facade(t.plaster); M.brick = facade(t.brick); M.glass = facade(t.glass, { envMapIntensity: 1.4 }); M.office = facade(t.office);
    M.industrial = facade(t.industrial); M.store = facade(t.store);
    M.roof = pbr(t.roof, { vertexColors: true }); M.roof.metalness = 0; M.roof.metalnessMap = null;
    M.concrete = pbr(t.concrete, { vertexColors: true }); M.concrete.metalness = 0; M.concrete.metalnessMap = null;
    M.metal = new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.45, metalness: 0.85, vertexColors: true });
    M.paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.1, vertexColors: true });
    M.signs = new THREE.MeshStandardMaterial({ map: t.signs, emissiveMap: t.signs, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.4 });
    M.container = pbr(t.container);
    M.fabric = new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: true, side: THREE.DoubleSide });
    M.neon = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true });
    this.mats = M;
    this.geos = {}; for (const k of Object.keys(M)) this.geos[k] = new Geo();
    this.nightMats.push(
      { m: M.plaster, day: 0.0, night: 0.9 }, { m: M.brick, day: 0.0, night: 0.9 }, { m: M.glass, day: 0.03, night: 1.1 },
      { m: M.office, day: 0.01, night: 0.8 }, { m: M.industrial, day: 0, night: 0.4 }, { m: M.store, day: 0.25, night: 1.3 },
      { m: M.signs, day: 0.3, night: 2.0 },
    );
  }

  // ---------- Colisiones ----------
  addCollider(x0, z0, x1, z1, h = 10, kind = 'building') {
    const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, kind };
    const id = this.colliders.push(c) - 1;
    const S = 16;
    for (let gx = Math.floor(c.x0 / S); gx <= Math.floor(c.x1 / S); gx++)
      for (let gz = Math.floor(c.z0 / S); gz <= Math.floor(c.z1 / S); gz++) {
        const k = gx * 10007 + gz; let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); } a.push(id);
      }
    return c;
  }
  query(x, z, r) {
    const S = 16; const out = new Set();
    for (let gx = Math.floor((x - r) / S); gx <= Math.floor((x + r) / S); gx++)
      for (let gz = Math.floor((z - r) / S); gz <= Math.floor((z + r) / S); gz++) {
        const a = this.grid.get(gx * 10007 + gz); if (a) for (const id of a) out.add(this.colliders[id]);
      }
    return out;
  }
  // Empuja un círculo fuera de los colisionadores. Devuelve normal de impacto o null
  resolveCircle(p, r) {
    let hit = null;
    for (const c of this.query(p.x, p.z, r + 1)) {
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1);
      let dx = p.x - cx, dz = p.z - cz; let d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        let d = Math.sqrt(d2);
        if (d < 1e-4) { // dentro: expulsar por el lado más cercano
          const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z; const m = Math.min(l, rr, t, b);
          if (m === l) { dx = -1; dz = 0; d = -l; } else if (m === rr) { dx = 1; dz = 0; d = -rr; } else if (m === t) { dx = 0; dz = -1; d = -t; } else { dx = 0; dz = 1; d = -b; }
          const push = r - d; p.x += dx * push; p.z += dz * push; hit = { nx: dx, nz: dz, depth: push, c };
        } else {
          const nx = dx / d, nz = dz / d; const push = r - d; p.x += nx * push; p.z += nz * push; hit = { nx, nz, depth: push, c };
        }
      }
    }
    // límites del mundo
    const L = CITY.HALF + 26, S = CITY.HALF + 13;
    if (p.x < -L) { p.x = -L; hit = { nx: 1, nz: 0, depth: 0.1 }; }
    if (p.x > L) { p.x = L; hit = { nx: -1, nz: 0, depth: 0.1 }; }
    if (p.z < -L) { p.z = -L; hit = { nx: 0, nz: 1, depth: 0.1 }; }
    if (p.z > S) { p.z = S; hit = { nx: 0, nz: -1, depth: 0.1 }; }
    return hit;
  }
  groundY(x, z) {
    const H = CITY.HALF, C = CITY.CURB;
    if (x > -H && x < H && z > -H && z < H) {
      const lx = (x + H) % CITY.PITCH, lz = (z + H) % CITY.PITCH;
      return lx > 8 && lx < 80 && lz > 8 && lz < 80 ? C : 0;
    }
    if (z > H + 8) return C;
    if (Math.abs(x) > H + 8 || z < -H - 8) return C;
    return 0;
  }
  isRoad(x, z) { return this.groundY(x, z) === 0 && Math.abs(x) <= CITY.HALF + 8 && z >= -CITY.HALF - 8 && z <= CITY.HALF + 8; }

  // ---------- Suelo y calles ----------
  buildGround() {
    const E = CITY.HALF + 30;
    const g = new THREE.PlaneGeometry(E * 2, E * 2 - 4); g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -2);
    // UV en metros para asfalto
    const uv = g.attributes.uv; const pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
    const m = new THREE.Mesh(g, this.mats.asphalt); m.receiveShadow = true; this.group.add(m);
    // terreno exterior
    const og = new THREE.PlaneGeometry(6000, 6000, 1, 1); og.rotateX(-Math.PI / 2);
    const ouv = og.attributes.uv; const op = og.attributes.position;
    for (let i = 0; i < ouv.count; i++) ouv.setXY(i, op.getX(i) / 6, -op.getZ(i) / 6);
    const outer = new THREE.Mesh(og, this.mats.grass); outer.position.y = -0.05; outer.receiveShadow = true; this.group.add(outer);
    // aceras perimetrales exteriores
    const G = this.geos.sidewalk; const H = CITY.HALF, C = CITY.CURB;
    const strip = (x0, z0, x1, z1) => { G.top(x0, z0, x1, z1, C, 4); G.walls(x0, z0, x1, z1, 0, C, 4, 4, [1, 1, 1]); };
    strip(-H - 12, -H - 12, H + 12, -H - 8); // norte
    strip(-H - 12, -H - 8, -H - 8, H + 12); strip(H + 8, -H - 8, H + 12, H + 12);
    // franja de césped exterior
    const gr = this.geos.grass;
    gr.top(-H - 30, -H - 30, H + 30, -H - 12, C - 0.05, 6); gr.top(-H - 30, -H - 12, -H - 12, H + 12, C - 0.05, 6); gr.top(H + 12, -H - 12, H + 30, H + 12, C - 0.05, 6);
  }

  buildRoads() {
    const N = CITY.N, P = CITY.PITCH;
    const segGeo = new THREE.PlaneGeometry(16, 72); segGeo.rotateX(-Math.PI / 2);
    const count = 2 * N * (N - 1);
    const im = new THREE.InstancedMesh(segGeo, this.mats.markings, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    let k = 0;
    this.segments = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) {
      // segmento a lo largo de X (z constante), sentido +X ~ local +Y del plano (-Z del mundo tras rotar)
      const x = (nodeCoord(i) + nodeCoord(i + 1)) / 2, z = nodeCoord(j);
      q.setFromAxisAngle(up, Math.PI / 2); m4.compose(new THREE.Vector3(x, 0.012, z), q, s); im.setMatrixAt(k++, m4);
      this.segments.push({ axis: 'x', i, j, x, z });
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) {
      const x = nodeCoord(i), z = (nodeCoord(j) + nodeCoord(j + 1)) / 2;
      q.identity(); m4.compose(new THREE.Vector3(x, 0.012, z), q, s); im.setMatrixAt(k++, m4);
      this.segments.push({ axis: 'z', i, j, x, z });
    }
    im.receiveShadow = true; im.renderOrder = 1;
    this.group.add(im);
    // alcantarillas / tapas en intersecciones
    const G = this.geos.metal;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = nodeCoord(i), z = nodeCoord(j);
      G.box(x + 3.1, 0.01, z - 2.7, 0.8, 0.03, 0.8, 1, [0.25, 0.25, 0.26]);
    }
  }

  // ---------- Manzanas ----------
  districtOf(bi, bj) {
    const N1 = CITY.N - 1;
    if (bi === 1 && bj === 3) return 'comisaria';
    if (bi === 5 && bj === 3) return 'hospital';
    if (bi === 3 && bj === 1) return 'parque';
    if (bj === N1 - 1) return 'puerto';
    if (bi === N1 - 1) return 'industrial';
    if (Math.abs(bi - 3) <= 1 && Math.abs(bj - 3) <= 1) return 'centro';
    if (bj <= 1 && bi >= 2 && bi <= 5) return 'ocio';
    return 'residencial';
  }

  buildBlocks() {
    const N1 = CITY.N - 1;
    for (let bj = 0; bj < N1; bj++) for (let bi = 0; bi < N1; bi++) {
      const cx = nodeCoord(bi) + CITY.PITCH / 2, cz = nodeCoord(bj) + CITY.PITCH / 2;
      const type = this.districtOf(bi, bj);
      const blk = { bi, bj, cx, cz, type, buildings: [] };
      this.blocks.push(blk);
      // losa de acera
      const S = this.geos.sidewalk, h = CITY.BLOCK / 2, C = CITY.CURB;
      S.top(cx - h, cz - h, cx + h, cz + h, C, 4);
      S.walls(cx - h, cz - h, cx + h, cz + h, 0, C, 4, 4, [0.85, 0.85, 0.85]);
      // bordillo de granito
      this.geos.concrete.walls(cx - h, cz - h, cx + h, cz + h, 0, C + 0.005, 1, 1, [0.8, 0.8, 0.82]);
      switch (type) {
        case 'residencial': this.perimeterBlock(blk, { minF: 3, maxF: 7, leisure: false }); break;
        case 'ocio': this.perimeterBlock(blk, { minF: 2, maxF: 5, leisure: true }); break;
        case 'centro': this.centerBlock(blk); break;
        case 'industrial': this.industrialBlock(blk); break;
        case 'puerto': this.portBlock(blk); break;
        case 'parque': this.parkBlock(blk); break;
        case 'comisaria': this.stationBlock(blk); break;
        case 'hospital': this.hospitalBlock(blk); break;
      }
    }
  }

  addBuilding(blk, b) {
    // b: x0,z0,x1,z1,height,facade,store,tint
    const G = this.geos; const tx = this.tex[b.facade];
    const tint = b.tint || [1, 1, 1];
    let y0 = 0.15;
    const uOff = this.rnd() * 3 | 0;
    if (b.store) {
      const st = this.tex.store;
      G.store.walls(b.x0, b.z0, b.x1, b.z1, y0, 4.65, st.tileW, st.tileH, [1, 1, 1], uOff * 0.333, y0);
      y0 = 4.65;
    }
    G[b.facade].walls(b.x0, b.z0, b.x1, b.z1, y0, b.height, tx.tileW, tx.tileH, tint, uOff * (1 / 3), y0);
    // cornisa
    G.concrete.box((b.x0 + b.x1) / 2, b.height + 0.05, (b.z0 + b.z1) / 2, b.x1 - b.x0 + 0.5, 0.35, b.z1 - b.z0 + 0.5, 2, [0.75, 0.73, 0.7]);
    G.roof.top(b.x0 + 0.2, b.z0 + 0.2, b.x1 - 0.2, b.z1 - 0.2, b.height + 0.23, 4, [1, 1, 1]);
    // pretil
    const ph = 0.9, pt = 0.25, Y = b.height + 0.22;
    G.concrete.box((b.x0 + b.x1) / 2, Y + ph / 2, b.z0 + pt / 2, b.x1 - b.x0, ph, pt, 2, [0.8, 0.78, 0.75]);
    G.concrete.box((b.x0 + b.x1) / 2, Y + ph / 2, b.z1 - pt / 2, b.x1 - b.x0, ph, pt, 2, [0.8, 0.78, 0.75]);
    G.concrete.box(b.x0 + pt / 2, Y + ph / 2, (b.z0 + b.z1) / 2, pt, ph, b.z1 - b.z0, 2, [0.8, 0.78, 0.75]);
    G.concrete.box(b.x1 - pt / 2, Y + ph / 2, (b.z0 + b.z1) / 2, pt, ph, b.z1 - b.z0, 2, [0.8, 0.78, 0.75]);
    // equipos de cubierta
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    const n = Math.floor(w * d / 90);
    for (let k = 0; k < n; k++) {
      const rx = b.x0 + 1.5 + this.rnd() * (w - 3), rz = b.z0 + 1.5 + this.rnd() * (d - 3);
      const r = this.rnd();
      if (r < 0.5) G.metal.box(rx, Y + 0.5, rz, 1.4, 1, 1.0, 1, [0.85, 0.86, 0.88]);
      else if (r < 0.75) { G.metal.box(rx, Y + 1.2, rz, 1.6, 1.6, 1.6, 1, [0.6, 0.62, 0.64]); G.metal.box(rx, Y + 0.2, rz, 1.8, 0.4, 1.8, 1, [0.3, 0.3, 0.3]); }
      else if (r < 0.85) G.metal.box(rx, Y + 2.5, rz, 0.08, 5, 0.08, 1, [0.4, 0.4, 0.4]);
      else G.concrete.box(rx, Y + 1.3, rz, 2.2, 2.6, 2.2, 2, [0.8, 0.78, 0.75]);
    }
    this.addCollider(b.x0, b.z0, b.x1, b.z1, b.height);
    blk.buildings.push(b); this.buildings.push(b);
  }

  // Fachada exterior de un lote: devuelve normal hacia la calle
  addShopSigns(b, side, leisure) {
    // side: 'n','s','e','w'
    const G = this.geos.signs; const y0 = 3.75, y1 = 4.5; const off = 0.06;
    const along = side === 'n' || side === 's' ? [b.x0, b.x1] : [b.z0, b.z1];
    const len = along[1] - along[0];
    const nShops = Math.max(1, Math.floor(len / 4));
    for (let k = 0; k < nShops; k++) {
      if (this.rnd() < 0.25) continue;
      const a0 = along[0] + k * 4 + 0.45, a1 = a0 + 3.3;
      if (a1 > along[1] - 0.2) break;
      const idx = (this.rnd() * 16) | 0; const u0 = (idx % 2) * 0.5, v1 = 1 - Math.floor(idx / 2) * 0.125, v0 = v1 - 0.125;
      const uv = [u0, v0, u0 + 0.5, v0, u0 + 0.5, v1, u0, v1];
      let x, z;
      if (side === 's') { z = b.z1 + off; G.quad([a0, y0, z], [a1, y0, z], [a1, y1, z], [a0, y1, z], uv); x = (a0 + a1) / 2; this.shops.push({ x, z: z + 2.2, nx: 0, nz: 1, name: T.SIGN_NAMES[idx] }); }
      if (side === 'n') { z = b.z0 - off; G.quad([a1, y0, z], [a0, y0, z], [a0, y1, z], [a1, y1, z], uv); x = (a0 + a1) / 2; this.shops.push({ x, z: z - 2.2, nx: 0, nz: -1, name: T.SIGN_NAMES[idx] }); }
      if (side === 'e') { x = b.x1 + off; G.quad([x, y0, a1], [x, y0, a0], [x, y1, a0], [x, y1, a1], uv); z = (a0 + a1) / 2; this.shops.push({ x: x + 2.2, z, nx: 1, nz: 0, name: T.SIGN_NAMES[idx] }); }
      if (side === 'w') { x = b.x0 - off; G.quad([x, y0, a0], [x, y0, a1], [x, y1, a1], [x, y1, a0], uv); z = (a0 + a1) / 2; this.shops.push({ x: x - 2.2, z, nx: -1, nz: 0, name: T.SIGN_NAMES[idx] }); }
      // toldo
      if (this.rnd() < 0.45) {
        const col = [[0.55, 0.1, 0.1], [0.1, 0.32, 0.2], [0.85, 0.75, 0.55], [0.12, 0.2, 0.4], [0.9, 0.9, 0.88]][(this.rnd() * 5) | 0];
        const F = this.geos.fabric; const ty = 3.6, by = 2.75, out = 1.3;
        if (side === 's') F.quad([a0, by, b.z1 + out], [a1, by, b.z1 + out], [a1, ty, b.z1 + 0.05], [a0, ty, b.z1 + 0.05], [0, 0, 1, 0, 1, 1, 0, 1], col);
        if (side === 'n') F.quad([a1, by, b.z0 - out], [a0, by, b.z0 - out], [a0, ty, b.z0 - 0.05], [a1, ty, b.z0 - 0.05], [0, 0, 1, 0, 1, 1, 0, 1], col);
        if (side === 'e') F.quad([b.x1 + out, by, a1], [b.x1 + out, by, a0], [b.x1 + 0.05, ty, a0], [b.x1 + 0.05, ty, a1], [0, 0, 1, 0, 1, 1, 0, 1], col);
        if (side === 'w') F.quad([b.x0 - out, by, a0], [b.x0 - out, by, a1], [b.x0 - 0.05, ty, a1], [b.x0 - 0.05, ty, a0], [0, 0, 1, 0, 1, 1, 0, 1], col);
      }
      if (leisure && this.rnd() < 0.6) { // neón vertical
        const NE = this.geos.neon; const c = [[4, 0.4, 2.5], [0.3, 2.5, 4], [4, 2.5, 0.3], [0.5, 4, 1]][(this.rnd() * 4) | 0];
        const yA = 5.5, yB = 5.5 + 2.5 + this.rnd() * 3; const m = (a0 + a1) / 2;
        if (side === 's') NE.quad([m - 0.1, yA, b.z1 + 0.4], [m + 0.1, yA, b.z1 + 0.4], [m + 0.1, yB, b.z1 + 0.4], [m - 0.1, yB, b.z1 + 0.4], [0, 0, 1, 0, 1, 1, 0, 1], c);
        if (side === 'n') NE.quad([m + 0.1, yA, b.z0 - 0.4], [m - 0.1, yA, b.z0 - 0.4], [m - 0.1, yB, b.z0 - 0.4], [m + 0.1, yB, b.z0 - 0.4], [0, 0, 1, 0, 1, 1, 0, 1], c);
      }
    }
  }

  perimeterBlock(blk, { minF, maxF, leisure }) {
    const { cx, cz } = blk; const I = 32; const D = 13 + (this.rnd() * 3 | 0);
    const tints = [[1, 1, 1], [1, 0.93, 0.8], [1, 0.85, 0.7], [0.95, 0.88, 0.85], [0.92, 0.95, 1], [1, 0.9, 0.75], [0.9, 0.83, 0.72]];
    const make = (x0, z0, x1, z1, side) => {
      const facade = this.rnd() < 0.62 ? 'plaster' : 'brick';
      const fh = facade === 'plaster' ? 3.1 : 3.2;
      const floors = minF + (this.rnd() * (maxF - minF + 1) | 0);
      const store = this.rnd() < (leisure ? 0.95 : 0.7);
      const height = (store ? 4.65 : 0.15) + floors * fh;
      const b = { x0, z0, x1, z1, height, facade, store, tint: facade === 'plaster' ? tints[(this.rnd() * tints.length) | 0] : [1, 1, 1] };
      this.addBuilding(blk, b);
      if (store) this.addShopSigns(b, side, leisure);
      // portal
      const doorAlong = side === 'n' || side === 's' ? (x0 + x1) / 2 : (z0 + z1) / 2;
      if (side === 's') this.doors.push({ x: doorAlong, z: z1 + 1.5, nx: 0, nz: 1 });
      if (side === 'n') this.doors.push({ x: doorAlong, z: z0 - 1.5, nx: 0, nz: -1 });
      if (side === 'e') this.doors.push({ x: x1 + 1.5, z: doorAlong, nx: 1, nz: 0 });
      if (side === 'w') this.doors.push({ x: x0 - 1.5, z: doorAlong, nx: -1, nz: 0 });
    };
    const split = (a0, a1, cb) => {
      let a = a0;
      while (a < a1 - 0.1) {
        let w = [10.8, 14.4, 18, 12.6][(this.rnd() * 4) | 0];
        if (a1 - (a + w) < 9) w = a1 - a;
        cb(a, a + w); a += w;
      }
    };
    split(cx - I, cx + I, (a, b) => make(a, cz - I, b, cz - I + D, 'n'));
    split(cx - I, cx + I, (a, b) => make(a, cz + I - D, b, cz + I, 's'));
    split(cz - I + D, cz + I - D, (a, b) => make(cx - I, a, cx - I + D, b, 'w'));
    split(cz - I + D, cz + I - D, (a, b) => make(cx + I - D, a, cx + I, b, 'e'));
    // patio interior (oculto) - suelo
  }

  centerBlock(blk) {
    const { cx, cz } = blk; const r = this.rnd();
    const tower = (x0, z0, x1, z1, h, facade) => {
      // podio comercial + torre con retranqueo
      const pod = { x0, z0, x1, z1, height: 4.65 + 2 * 3.4, facade: 'office', store: true };
      this.addBuilding(blk, pod);
      for (const s of ['n', 's', 'e', 'w']) this.addShopSigns(pod, s, false);
      const inset = 2.5;
      const t1 = { x0: x0 + inset, z0: z0 + inset, x1: x1 - inset, z1: z1 - inset, height: h, facade };
      // sobreescribe base a la altura del podio
      this.addTower(blk, t1, pod.height);
      if (h > 70 && this.rnd() < 0.7) {
        const i2 = 3 + this.rnd() * 3;
        this.addTower(blk, { x0: t1.x0 + i2, z0: t1.z0 + i2, x1: t1.x1 - i2, z1: t1.z1 - i2, height: h + 12 + this.rnd() * 30, facade }, h + 0.6);
      }
    };
    if (r < 0.45) {
      const h = 60 + this.rnd() * 90;
      tower(cx - 26, cz - 26, cx + 26, cz + 26, h, this.rnd() < 0.7 ? 'glass' : 'office');
    } else {
      const parts = [[-30, -30, -2, -2], [2, -30, 30, -2], [-30, 2, -2, 30], [2, 2, 30, 30]];
      for (const p of parts) {
        if (this.rnd() < 0.2) { this.plaza(cx + (p[0] + p[2]) / 2, cz + (p[1] + p[3]) / 2, 26); continue; }
        tower(cx + p[0], cz + p[1], cx + p[2], cz + p[3], 30 + this.rnd() * 70, this.rnd() < 0.55 ? 'glass' : 'office');
      }
    }
  }

  addTower(blk, b, base) {
    const G = this.geos; const tx = this.tex[b.facade];
    G[b.facade].walls(b.x0, b.z0, b.x1, b.z1, base, b.height, tx.tileW, tx.tileH, [1, 1, 1], (this.rnd() * 4 | 0) * 0.25, base);
    G.roof.top(b.x0, b.z0, b.x1, b.z1, b.height, 4, [0.9, 0.9, 0.9]);
    G.metal.box((b.x0 + b.x1) / 2, b.height + 0.6, (b.z0 + b.z1) / 2, b.x1 - b.x0 + 0.3, 1.2, b.z1 - b.z0 + 0.3, 1, [0.35, 0.37, 0.4]);
    // equipos y antena con baliza
    G.metal.box((b.x0 + b.x1) / 2, b.height + 3, (b.z0 + b.z1) / 2, (b.x1 - b.x0) * 0.4, 4, (b.z1 - b.z0) * 0.4, 1, [0.55, 0.57, 0.6]);
    if (b.height > 80) {
      G.metal.box((b.x0 + b.x1) / 2, b.height + 12, (b.z0 + b.z1) / 2, 0.3, 16, 0.3, 1, [0.5, 0.5, 0.5]);
      this.geos.neon.box((b.x0 + b.x1) / 2, b.height + 20.3, (b.z0 + b.z1) / 2, 0.5, 0.5, 0.5, 1, [8, 0.3, 0.2]);
    }
    this.addCollider(b.x0, b.z0, b.x1, b.z1, b.height);
    this.buildings.push(b); blk.buildings.push(b);
  }

  plaza(x, z, s) {
    const G = this.geos.concrete; G.top(x - s / 2, z - s / 2, x + s / 2, z + s / 2, 0.17, 3, [0.92, 0.9, 0.86]);
    this.treeSpots = this.treeSpots || [];
    for (let k = 0; k < 5; k++) this.treeSpots.push([x + (this.rnd() - 0.5) * s * 0.8, z + (this.rnd() - 0.5) * s * 0.8, 0.8 + this.rnd() * 0.5]);
    for (let k = 0; k < 4; k++) { const bx = x + (this.rnd() - 0.5) * s * 0.7, bz = z + (this.rnd() - 0.5) * s * 0.7; this.geos.paint.box(bx, 0.6, bz, 1.8, 0.1, 0.5, 1, [0.35, 0.22, 0.12]); this.geos.metal.box(bx, 0.35, bz, 1.6, 0.5, 0.1, 1, [0.2, 0.2, 0.2]); }
  }

  industrialBlock(blk) {
    const { cx, cz } = blk;
    const tints = [[0.85, 0.88, 0.92], [0.75, 0.8, 0.75], [0.95, 0.88, 0.78], [0.7, 0.75, 0.85]];
    const wh = (x0, z0, x1, z1) => this.addBuilding(blk, { x0, z0, x1, z1, height: 8 + this.rnd() * 6, facade: 'industrial', store: false, tint: tints[(this.rnd() * 4) | 0] });
    if (this.rnd() < 0.5) { wh(cx - 30, cz - 30, cx + 30, cz - 4); wh(cx - 30, cz + 6, cx + 6, cz + 30); this.containers(cx + 18, cz + 18, 2, 3); }
    else { wh(cx - 30, cz - 30, cx - 2, cz + 30); wh(cx + 4, cz - 30, cx + 30, cz + 2); this.containers(cx + 17, cz + 17, 2, 2); }
    // valla
    const F = this.geos.metal;
    F.box(cx, 1.2, cz + 33.5, 64, 2.2, 0.06, 1, [0.5, 0.52, 0.5]);
  }

  containers(x, z, nx, nz, stack = 2) {
    this.containerSpots = this.containerSpots || [];
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const h = 1 + (this.rnd() * stack | 0);
      for (let s = 0; s < h; s++) this.containerSpots.push([x + a * 2.7 - nx * 1.35, 0.15 + s * 2.6, z + b * 6.4 - nz * 3.2]);
      this.addCollider(x + a * 2.7 - nx * 1.35 - 1.22, z + b * 6.4 - nz * 3.2 - 3.05, x + a * 2.7 - nx * 1.35 + 1.22, z + b * 6.4 - nz * 3.2 + 3.05, h * 2.6, 'container');
    }
  }

  portBlock(blk) {
    const { cx, cz } = blk;
    if (blk.bi === 0 || blk.bi === CITY.N - 2) { this.industrialBlock(blk); return; }
    this.addBuilding(blk, { x0: cx - 30, z0: cz - 30, x1: cx + 2, z1: cz - 8, height: 12, facade: 'industrial', store: false, tint: [0.7, 0.8, 0.9] });
    this.containers(cx + 16, cz - 18, 4, 2, 3);
    this.containers(cx - 14, cz + 16, 6, 2, 3);
    this.containers(cx + 18, cz + 16, 3, 2, 2);
  }

  parkBlock(blk) {
    const { cx, cz } = blk; const G = this.geos.grass; const S = this.geos.sidewalk;
    G.top(cx - 32, cz - 32, cx + 32, cz + 32, 0.16, 6);
    S.top(cx - 2.5, cz - 32, cx + 2.5, cz + 32, 0.17, 4); S.top(cx - 32, cz - 2.5, cx + 32, cz + 2.5, 0.17, 4);
    // fuente
    const C = this.geos.concrete; C.box(cx, 0.45, cz, 9, 0.6, 9, 2, [0.9, 0.88, 0.84]); C.box(cx, 1.2, cz, 1.2, 1.6, 1.2, 2, [0.9, 0.88, 0.84]);
    this.fountain = { x: cx, z: cz };
    this.addCollider(cx - 4.5, cz - 4.5, cx + 4.5, cz + 4.5, 0.8, 'fountain');
    this.treeSpots = this.treeSpots || [];
    for (let k = 0; k < 46; k++) {
      const x = cx + (this.rnd() - 0.5) * 60, z = cz + (this.rnd() - 0.5) * 60;
      if (Math.abs(x - cx) < 5 || Math.abs(z - cz) < 5) continue;
      this.treeSpots.push([x, z, 0.9 + this.rnd() * 0.7]);
    }
    for (let k = 0; k < 8; k++) { const bz = cz + (k < 4 ? -1 : 1) * (10 + (k % 4) * 6); this.geos.paint.box(cx + 3.6, 0.6, bz, 0.5, 0.1, 1.8, 1, [0.35, 0.22, 0.12]); }
  }

  stationBlock(blk) {
    const { cx, cz } = blk;
    // edificio principal
    const b = { x0: cx - 30, z0: cz - 30, x1: cx + 30, z1: cz - 6, height: 15.5, facade: 'office', store: false, tint: [1, 1, 1] };
    this.addBuilding(blk, b);
    // franja de vidrio azul y rótulo
    const signTex = T.textPanel('POLICÍA', { bg: '#0b2f7a', fg: '#ffffff', font: 'bold 170px Arial Black, Arial' });
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.3 });
    this.nightMats.push({ m: signMat, day: 0.6, night: 3.5 });
    const sg = new THREE.PlaneGeometry(16, 4); const sign = new THREE.Mesh(sg, signMat); sign.position.set(cx, 11.5, cz - 5.9); this.group.add(sign);
    const sub = T.textPanel(`COMISARÍA DE DISTRITO · ${'VALMORA'}`, { w: 1024, h: 96, bg: '#e9edf3', fg: '#0b2f7a', font: 'bold 54px Arial' });
    const subm = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.3), new THREE.MeshStandardMaterial({ map: sub, roughness: 0.5 })); subm.position.set(cx, 3.6, cz - 5.9); this.group.add(subm);
    // marquesina de entrada
    this.geos.concrete.box(cx, 3.0, cz - 3.6, 12, 0.4, 5, 2, [0.95, 0.95, 0.97]);
    this.geos.metal.box(cx - 5.5, 1.6, cz - 1.5, 0.25, 2.9, 0.25, 1, [0.7, 0.7, 0.72]);
    this.geos.metal.box(cx + 5.5, 1.6, cz - 1.5, 0.25, 2.9, 0.25, 1, [0.7, 0.7, 0.72]);
    this.addCollider(cx - 5.7, cz - 1.7, cx - 5.3, cz - 1.3); this.addCollider(cx + 5.3, cz - 1.7, cx + 5.7, cz - 1.3);
    // aparcamiento con plazas
    this.geos.asphalt.top(cx - 31, cz + 3, cx + 31, cz + 33, 0.158, 1);
    const L = this.geos.paint;
    for (let k = 0; k < 10; k++) {
      const x = cx - 27 + k * 6; L.box(x, 0.165, cz + 18, 0.12, 0.01, 5.5, 1, [2.2, 2.2, 2.2]);
    }
    for (let k = 0; k < 10; k++) this.parkingLot = (this.parkingLot || []).concat([{ x: cx - 24 + k * 6, z: cz + 18, heading: Math.PI }]);
    this.station = { x: cx, z: cz - 1.5, door: { x: cx, z: cz - 5 } };
    this.spawn = { x: cx + 4.1, z: cz + 17.2, heading: Math.PI, car: { x: cx + 6, z: cz + 18, heading: Math.PI } };
    // mástiles
    for (let k = 0; k < 3; k++) this.geos.metal.box(cx + 20 + k * 2.2, 5, cz - 3, 0.12, 10, 0.12, 1, [0.9, 0.9, 0.9]);
    this.flags = [{ x: cx + 20, z: cz - 3, c: [[0.75, 0.1, 0.1], [1, 0.8, 0.0], [0.75, 0.1, 0.1]] }, { x: cx + 22.2, z: cz - 3, c: [[0.0, 0.2, 0.6], [0, 0.2, 0.6], [0, 0.2, 0.6]] }, { x: cx + 24.4, z: cz - 3, c: [[1, 1, 1], [0.1, 0.5, 0.2], [1, 1, 1]] }];
  }

  hospitalBlock(blk) {
    const { cx, cz } = blk;
    const b = { x0: cx - 30, z0: cz - 30, x1: cx + 30, z1: cz + 4, height: 28.5, facade: 'office', store: false, tint: [1.05, 1.05, 1.05] };
    this.addBuilding(blk, b);
    const t = T.textPanel('HOSPITAL', { bg: '#ffffff', fg: '#c8102e', font: 'bold 160px Arial Black, Arial' });
    const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.8 });
    this.nightMats.push({ m, day: 0.3, night: 2.5 });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), m); s.position.set(cx, 24, cz + 4.08); this.group.add(s);
    const u = T.textPanel('URGENCIAS', { w: 1024, h: 200, bg: '#c8102e', fg: '#ffffff', font: 'bold 130px Arial' });
    const um = new THREE.MeshStandardMaterial({ map: u, emissiveMap: u, emissive: 0xffffff, emissiveIntensity: 1 });
    this.nightMats.push({ m: um, day: 0.5, night: 3 });
    const us = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.8), um); us.position.set(cx + 16, 5, cz + 4.08); this.group.add(us);
    this.geos.concrete.box(cx + 16, 3.6, cz + 8, 14, 0.4, 8, 2, [0.95, 0.95, 0.97]);
    this.hospital = { x: cx + 16, z: cz + 12 };
  }

  // ---------- Mobiliario ----------
  buildLamps() {
    const spots = []; const decals = [];
    for (const s of this.segments) {
      for (const side of [-1, 1]) for (const t of [-24, 0, 24]) {
        let x, z, ax, az;
        if (s.axis === 'x') { x = s.x + t; z = s.z + side * 8.45; ax = 0; az = -side; } else { x = s.x + side * 8.45; z = s.z + t; ax = -side; az = 0; }
        // omitir el lado exterior del puerto
        if (z > CITY.HALF + 1) continue;
        spots.push({ x, z, ax, az });
        decals.push({ x: x + ax * 2.2, z: z + az * 2.2 });
        this.addCollider(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 8, 'pole');
      }
    }
    this.lampSpots = spots;
    const n = spots.length;
    const poleG = new THREE.CylinderGeometry(0.07, 0.12, 8.6, 8); poleG.translate(0, 4.3, 0);
    const armG = new THREE.BoxGeometry(0.08, 0.08, 2.2); armG.translate(0, 8.5, 1.1);
    const headG = new THREE.BoxGeometry(0.42, 0.14, 0.9); headG.translate(0, 8.42, 2.1);
    const bulbG = new THREE.PlaneGeometry(0.34, 0.7); bulbG.rotateX(Math.PI / 2); bulbG.translate(0, 8.34, 2.1);
    const poleM = new THREE.MeshStandardMaterial({ color: 0x3b4044, roughness: 0.5, metalness: 0.8 });
    this.lampBulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.85, 0.6) });
    const meshes = [new THREE.InstancedMesh(poleG, poleM, n), new THREE.InstancedMesh(armG, poleM, n), new THREE.InstancedMesh(headG, poleM, n), new THREE.InstancedMesh(bulbG, this.lampBulbMat, n)];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    spots.forEach((s, i) => {
      q.setFromAxisAngle(up, Math.atan2(s.ax, s.az)); m4.compose(new THREE.Vector3(s.x, 0.15, s.z), q, one);
      for (const m of meshes) m.setMatrixAt(i, m4);
    });
    meshes.slice(0, 3).forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    meshes.forEach((m) => this.group.add(m));
    // charcos de luz en el suelo
    const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
    const dt = T.radial('rgba(255,226,190,0.9)', 'rgba(255,226,190,0)', 128);
    this.lampDecalMat = new THREE.MeshBasicMaterial({ map: dt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
    const dm = new THREE.InstancedMesh(dg, this.lampDecalMat, decals.length);
    decals.forEach((d, i) => { m4.compose(new THREE.Vector3(d.x, 0.03, d.z), new THREE.Quaternion(), new THREE.Vector3(16, 1, 16)); dm.setMatrixAt(i, m4); });
    dm.renderOrder = 2; this.group.add(dm);
    this.fxObjects = [dm];
    // conos volumétricos
    if (this.q.cones) {
      const cg = new THREE.ConeGeometry(3.4, 8.2, 24, 1, true); cg.translate(0, -4.1, 0);
      this.coneMat = new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(1, 0.8, 0.55) } },
        vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH = -position.y/8.2; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.); vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vH; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.5); float a = uOpacity * (1.0 - vH) * (1.0-vH) * f * 0.22; gl_FragColor = vec4(uColor * a, a); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const cm = new THREE.InstancedMesh(cg, this.coneMat, n);
      spots.forEach((s, i) => { m4.compose(new THREE.Vector3(s.x + s.ax * 2.1, 8.4, s.z + s.az * 2.1), new THREE.Quaternion(), one); cm.setMatrixAt(i, m4); });
      cm.renderOrder = 3; cm.frustumCulled = false; this.group.add(cm); this.fxObjects.push(cm);
    }
  }

  buildTrafficLights() {
    const N = CITY.N; const poles = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const edge = (i === 0) + (i === N - 1) + (j === 0) + (j === N - 1);
      for (let d = 0; d < 4; d++) {
        const [dx, dz] = DIRS[d]; const [rx, rz] = rightOf(d);
        // ¿existe un tramo de llegada en esa dirección?
        const pi = i - dx, pj = j - dz; if (pi < 0 || pj < 0 || pi >= N || pj >= N) continue;
        const x = nodeCoord(i) - dx * 9.3 + rx * 9.3, z = nodeCoord(j) - dz * 9.3 + rz * 9.3;
        if (z > CITY.HALF + 1) continue;
        poles.push({ x, z, face: Math.atan2(-dx, -dz), g: (i + j) % 2, axis: d % 2, rx, rz });
        this.addCollider(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 4, 'pole');
      }
      void edge;
    }
    const n = poles.length;
    const poleG = new THREE.CylinderGeometry(0.07, 0.08, 3.6, 8); poleG.translate(0, 1.8, 0);
    const headG = new THREE.BoxGeometry(0.34, 1.0, 0.25); headG.translate(0, 3.15, 0.05);
    const poleM = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.7 });
    const pm = new THREE.InstancedMesh(poleG, poleM, n), hm = new THREE.InstancedMesh(headG, poleM, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    poles.forEach((p, k) => { q.setFromAxisAngle(up, p.face); m4.compose(new THREE.Vector3(p.x, 0.15, p.z), q, one); pm.setMatrixAt(k, m4); hm.setMatrixAt(k, m4); });
    pm.castShadow = hm.castShadow = true; this.group.add(pm, hm);
    // lámparas por (grupo, eje, color)
    const lg = new THREE.CircleGeometry(0.1, 12);
    this.tlMats = [];
    const offs = { R: 3.47, A: 3.15, G: 2.83 };
    for (let g = 0; g < 2; g++) for (let a = 0; a < 2; a++) for (const c of ['R', 'A', 'G']) {
      const sel = poles.filter((p) => p.g === g && p.axis === a);
      const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const im = new THREE.InstancedMesh(lg, mat, sel.length);
      sel.forEach((p, k) => {
        q.setFromAxisAngle(up, p.face);
        const v = new THREE.Vector3(0, 0.15 + offs[c], 0.181).applyQuaternion(q).add(new THREE.Vector3(p.x, 0, p.z));
        m4.compose(v, q, one); im.setMatrixAt(k, m4);
      });
      this.group.add(im);
      this.tlMats.push({ g, a, c, mat });
    }
    this.trafficPoles = poles;
  }

  // Estado del semáforo para el eje (0: X, 1: Z) en la intersección i,j
  lightState(i, j, axis, time) {
    const g = (i + j) % 2; const t = (time + g * 13) % 26;
    if (axis === 0) return t < 10 ? 'G' : t < 13 ? 'A' : 'R';
    return t >= 13 && t < 23 ? 'G' : t >= 23 ? 'A' : 'R';
  }

  buildTrees() {
    const spots = this.treeSpots || [];
    // arbolado de alineación en zonas residenciales y de ocio
    for (const s of this.segments) {
      const bA = s.axis === 'x' ? [s.x, s.z - 44] : [s.x - 44, s.z];
      const blkType = this.blockAt(bA[0], bA[1]);
      if (!blkType || !['residencial', 'ocio', 'centro'].includes(blkType)) continue;
      for (const side of [-1, 1]) for (const t of [-12, 12]) {
        let x, z; if (s.axis === 'x') { x = s.x + t; z = s.z + side * 9.6; } else { x = s.x + side * 9.6; z = s.z + t; }
        if (z > CITY.HALF) continue;
        spots.push([x, z, 0.75 + this.rnd() * 0.35]);
      }
    }
    const n = spots.length;
    const trunkG = new THREE.CylinderGeometry(0.12, 0.2, 3.4, 7); trunkG.translate(0, 1.7, 0);
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
    const folG = new THREE.IcosahedronGeometry(1.6, 2);
    const p = folG.attributes.position; const rr = mulberry32(5);
    const seen = new Map(); const vc = [];
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let f = seen.get(k); if (f === undefined) { f = [0.8 + rr() * 0.45, 0.7 + rr() * 0.5]; seen.set(k, f); }
      p.setXYZ(i, p.getX(i) * f[0], p.getY(i) * f[0] * 0.85, p.getZ(i) * f[0]);
      vc.push(f[1], f[1] * (0.95 + rr() * 0.1), f[1] * 0.9);
    }
    folG.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3));
    folG.computeVertexNormals();
    const folM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, vertexColors: true });
    const tm = new THREE.InstancedMesh(trunkG, trunkM, n);
    const fm = new THREE.InstancedMesh(folG, folM, n * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    spots.forEach(([x, z, s], i) => {
      const y = this.groundY(x, z);
      m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); tm.setMatrixAt(i, m4);
      for (let k = 0; k < 2; k++) {
        const ox = (this.rnd() - 0.5) * 1.2 * s, oz = (this.rnd() - 0.5) * 1.2 * s, sc = s * (1 + this.rnd() * 0.4);
        q.setFromEuler(new THREE.Euler(0, this.rnd() * 6, 0));
        m4.compose(new THREE.Vector3(x + ox, y + (3.6 + k * 1.1) * s, z + oz), q, new THREE.Vector3(sc, sc, sc)); fm.setMatrixAt(i * 2 + k, m4);
        c.setHSL(0.22 + this.rnd() * 0.08, 0.45 + this.rnd() * 0.2, 0.18 + this.rnd() * 0.1); fm.setColorAt(i * 2 + k, c);
      }
      q.identity();
      this.addCollider(x - 0.2 * s, z - 0.2 * s, x + 0.2 * s, z + 0.2 * s, 3, 'tree');
    });
    tm.castShadow = fm.castShadow = true; tm.receiveShadow = fm.receiveShadow = true;
    this.group.add(tm, fm);
    this.treeCount = n;
    // contenedores marítimos
    const cs = this.containerSpots || [];
    if (cs.length) {
      const cg = new THREE.BoxGeometry(2.44, 2.59, 6.06); cg.translate(0, 1.295, 0);
      const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i));
      const cm = new THREE.InstancedMesh(cg, this.mats.container, cs.length);
      const cols = [0xb03a2e, 0x1f5f8b, 0x2e7d32, 0xd68910, 0x6c3483, 0x7f8c8d, 0xa04000, 0x154360];
      cs.forEach(([x, y, z], i) => { m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); cm.setMatrixAt(i, m4); cm.setColorAt(i, c.set(cols[(this.rnd() * cols.length) | 0])); });
      cm.castShadow = cm.receiveShadow = true; this.group.add(cm);
    }
  }

  blockAt(x, z) {
    for (const b of this.blocks) if (Math.abs(x - b.cx) < 40 && Math.abs(z - b.cz) < 40) return b.type;
    return null;
  }
  blockObjAt(x, z) {
    for (const b of this.blocks) if (Math.abs(x - b.cx) < 44 && Math.abs(z - b.cz) < 44) return b;
    return null;
  }

  buildFarCity() {
    // horizonte urbano lejano (siluetas con ventanas)
    const n = 340; const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
    const t = T.facadeOffice(91);
    const m = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.8, metalness: 0.1 });
    this.nightMats.push({ m, day: 0, night: 1.2 });
    const im = new THREE.InstancedMesh(g, m, n); const m4 = new THREE.Matrix4(); let k = 0;
    while (k < n) {
      const a = this.rnd() * Math.PI * 2; const r = 520 + this.rnd() * 700;
      const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 300 && Math.abs(x) < 900) continue; // mar al sur
      const w = 20 + this.rnd() * 40, h = 15 + this.rnd() * (r < 800 ? 90 : 50);
      m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rnd() * 3), new THREE.Vector3(w, h, w * (0.6 + this.rnd() * 0.8)));
      im.setMatrixAt(k++, m4);
    }
    this.group.add(im);
  }

  buildWater() {
    const wn = T.waterNormal();
    wn.repeat.set(60, 20);
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x0b2733, roughness: 0.04, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.6 });
    const g = new THREE.PlaneGeometry(4000, 1600); g.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(g, this.waterMat); w.position.set(0, -1.2, CITY.HALF + 14 + 800); w.receiveShadow = true; this.group.add(w);
    // muelle
    const C = this.geos.concrete; const z0 = CITY.HALF + 8;
    C.top(-CITY.HALF - 30, z0, CITY.HALF + 30, z0 + 6, CITY.CURB, 3, [0.85, 0.85, 0.85]);
    C.wall(CITY.HALF + 30, z0 + 6, -CITY.HALF - 30, z0 + 6, -1.5, CITY.CURB, 3, 3, [0.6, 0.6, 0.6]);
    C.wall(-CITY.HALF - 30, z0 + 6, CITY.HALF + 30, z0 + 6, -1.5, CITY.CURB, 3, 3, [0.6, 0.6, 0.6]);
    this.geos.concrete.walls(-CITY.HALF - 30, z0, CITY.HALF + 30, z0 + 6, 0, CITY.CURB, 3, 3, [0.7, 0.7, 0.7]);
    // grúas portuarias
    const M = this.geos.metal; const Y = [0.95, 0.7, 0.1];
    for (const x of [-120, -40, 60, 150]) {
      const z = z0 + 3;
      for (const dx of [-4, 4]) for (const dz of [-2, 2]) M.box(x + dx, 14, z + dz, 0.6, 28, 0.6, 1, Y);
      M.box(x, 28.5, z, 9.5, 1.2, 5, 1, Y);
      M.box(x, 30, z - 10, 2, 1.4, 42, 1, Y);
      M.box(x, 31.5, z + 2, 4, 3, 4, 1, [0.9, 0.9, 0.9]);
      this.addCollider(x - 4.5, z - 2.5, x + 4.5, z + 2.5, 28, 'crane');
    }
    // bolardos
    for (let x = -CITY.HALF; x < CITY.HALF; x += 12) M.box(x, 0.45, z0 + 5.4, 0.35, 0.6, 0.35, 1, [0.15, 0.15, 0.15]);
  }

  finalizeGeometry() {
    for (const [k, g] of Object.entries(this.geos)) {
      if (!g.n || !this.mats[k]) continue;
      const mesh = new THREE.Mesh(g.build(), this.mats[k]);
      mesh.castShadow = !['sidewalk', 'grass', 'signs', 'neon', 'markings', 'store'].includes(k);
      mesh.receiveShadow = k !== 'neon';
      this.group.add(mesh);
    }
    this.geos = null;
  }

  // ---------- Actualización ----------
  update(dt, time, env) {
    const night = env.night; // 0..1
    for (const nm of this.nightMats) nm.m.emissiveIntensity = nm.day + (nm.night - nm.day) * night;
    const lampOn = night > 0.35 || env.dark > 0.5 ? 1 : 0; const wetBoost = env.cur ? env.cur.wet : 0;
    this.lampBulbMat.color.setRGB(1, 0.82, 0.55).multiplyScalar(lampOn ? 14 : 0.6);
    this.lampDecalMat.opacity = lampOn ? 0.2 + wetBoost * 0.1 : 0;
    if (this.coneMat) this.coneMat.uniforms.uOpacity.value = lampOn ? (0.35 + env.fogginess * 1.4) : 0;
    for (const t of this.tlMats) {
      const st = this.lightState(t.g === 0 ? 0 : 1, 0, t.a, time);
      const on = st === t.c;
      const col = t.c === 'R' ? [1, 0.06, 0.03] : t.c === 'A' ? [1, 0.5, 0.02] : [0.1, 1, 0.45];
      const k = on ? 9 : 0.04;
      t.mat.color.setRGB(col[0] * k, col[1] * k, col[2] * k);
    }
    if (this.waterMat) { this.waterMat.normalMap.offset.x += dt * 0.004; this.waterMat.normalMap.offset.y += dt * 0.0025; }
  }

  // ---------- Utilidades ----------
  locationName(x, z) {
    const i = clamp(Math.round((x + CITY.HALF) / CITY.PITCH), 0, CITY.N - 1);
    const j = clamp(Math.round((z + CITY.HALF) / CITY.PITCH), 0, CITY.N - 1);
    const dx = Math.abs(x - nodeCoord(i)), dz = Math.abs(z - nodeCoord(j));
    if (dz < dx) return `${STREETS_X[j]}, cruce con ${STREETS_Z[i]}`;
    return `${STREETS_Z[i]}, cruce con ${STREETS_X[j]}`;
  }
  nearestNode(x, z) {
    return [clamp(Math.round((x + CITY.HALF) / CITY.PITCH), 0, CITY.N - 1), clamp(Math.round((z + CITY.HALF) / CITY.PITCH), 0, CITY.N - 1)];
  }
  route(a, b) {
    // A* en rejilla (equivale a BFS manhattan); devuelve lista de nodos
    const path = [[a[0], a[1]]]; let [i, j] = a;
    let safety = 40;
    while ((i !== b[0] || j !== b[1]) && safety--) {
      const di = Math.sign(b[0] - i), dj = Math.sign(b[1] - j);
      if (di && (Math.abs(b[0] - i) >= Math.abs(b[1] - j) || !dj)) i += di; else j += dj;
      path.push([i, j]);
    }
    return path;
  }
  // punto aleatorio en carril exterior de un tramo
  randomRoadPoint(rnd, minD, maxD, from) {
    for (let tries = 0; tries < 200; tries++) {
      const s = this.segments[(rnd() * this.segments.length) | 0];
      if (s.axis === 'x' && s.j === CITY.N - 1) continue;
      const t = (rnd() - 0.5) * 40; const side = rnd() < 0.5 ? -1 : 1;
      let x, z, heading;
      if (s.axis === 'x') { x = s.x + t; z = s.z + side * CITY.PARK; heading = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { x = s.x - side * CITY.PARK; z = s.z + t; heading = side > 0 ? 0 : Math.PI; }
      const d = Math.hypot(x - from.x, z - from.z);
      if (d >= minD && d <= maxD) return { x, z, heading, seg: s, side };
    }
    return null;
  }
}
