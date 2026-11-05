// Interfaz: HUD, minimapa, radio, despacho, rueda contextual, diálogos, informe y evaluación
import { CITY, nodeCoord, RANKS } from './config.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class HUD {
  constructor(audio) {
    this.audio = audio; this.cache = {}; this.radioMsgs = [];
    this.mm = $('minimap'); this.mctx = this.mm.getContext('2d');
    this.sp = $('speedo').querySelector('canvas').getContext('2d');
    this.wheelCb = null; this.dialogQueue = []; this.dialogCb = null; this.choiceCb = null;
  }
  show(on) { $('hud').classList.toggle('hidden', !on); }
  set(id, html) { if (this.cache[id] !== html) { this.cache[id] = html; $(id).innerHTML = html; } }
  vis(id, on) { const k = id + '_v'; if (this.cache[k] !== on) { this.cache[k] = on; $(id).classList.toggle('hidden', !on); } }

  // ---------- Mapa estático ----------
  buildMap(city) {
    this.city = city;
    const S = 1.5; this.scale = S; const ext = CITY.HALF + 60; this.ext = ext;
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(ext * 2 * S);
    const x = c.getContext('2d'); const tx = (v) => (v + ext) * S;
    x.fillStyle = '#16211a'; x.fillRect(0, 0, c.width, c.height);
    // agua
    x.fillStyle = '#0d2233'; x.fillRect(0, tx(CITY.HALF + 14), c.width, c.height);
    // calles
    x.fillStyle = '#2a3140'; x.fillRect(tx(-CITY.HALF - 8), tx(-CITY.HALF - 8), (CITY.HALF * 2 + 16) * S, (CITY.HALF * 2 + 16) * S);
    // manzanas
    const col = { residencial: '#3b4352', ocio: '#4a3d55', centro: '#404c60', industrial: '#3d4040', puerto: '#36424a', parque: '#25402a', comisaria: '#24427a', hospital: '#5a2f36' };
    for (const b of city.blocks) {
      x.fillStyle = '#5a6272'; x.fillRect(tx(b.cx - 36), tx(b.cz - 36), 72 * S, 72 * S);
      x.fillStyle = col[b.type] || '#3b4352'; x.fillRect(tx(b.cx - 32), tx(b.cz - 32), 64 * S, 64 * S);
    }
    x.fillStyle = 'rgba(200,210,230,0.16)';
    for (const b of city.buildings) x.fillRect(tx(b.x0), tx(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S);
    // líneas centrales
    x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 1;
    for (let i = 0; i < CITY.N; i++) { const v = tx(nodeCoord(i)); x.beginPath(); x.moveTo(v, tx(-CITY.HALF)); x.lineTo(v, tx(CITY.HALF)); x.stroke(); x.beginPath(); x.moveTo(tx(-CITY.HALF), v); x.lineTo(tx(CITY.HALF), v); x.stroke(); }
    // iconos
    const icon = (px, pz, ch, bg) => { x.fillStyle = bg; x.beginPath(); x.arc(tx(px), tx(pz), 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 12px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, tx(px), tx(pz) + 1); };
    if (city.station) icon(city.station.x, city.station.z, 'P', '#2f7bff');
    if (city.hospital) icon(city.hospital.x, city.hospital.z, '+', '#d33');
    this.mapImg = c;
  }
  drawMinimap(view) {
    const ctx = this.mctx, W = this.mm.width, R = W / 2;
    ctx.save(); ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#0b1018'; ctx.fillRect(0, 0, W, W);
    const z = view.zoom * 2; const S = this.scale;
    ctx.translate(R, R + R * 0.25); ctx.rotate(view.heading + Math.PI);
    ctx.scale(z, z);
    ctx.translate(-(view.x + this.ext) * S, -(view.z + this.ext) * S);
    ctx.drawImage(this.mapImg, 0, 0);
    const tx = (v) => (v + this.ext) * S;
    // ruta GPS
    if (view.route && view.route.length > 1) {
      ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 5 / z * 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = '#b06cff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(tx(view.route[0][0]), tx(view.route[0][1])); for (const p of view.route) ctx.lineTo(tx(p[0]), tx(p[1])); ctx.stroke(); ctx.shadowBlur = 0;
    }
    // vehículos y unidades
    for (const d of view.dots || []) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(tx(d.x), tx(d.z), (d.r || 2.5) / z * 2, 0, 7); ctx.fill(); }
    if (view.searchArea) { ctx.strokeStyle = 'rgba(255,176,32,.9)'; ctx.fillStyle = 'rgba(255,176,32,.15)'; ctx.lineWidth = 2 / z * 2; ctx.beginPath(); ctx.arc(tx(view.searchArea.x), tx(view.searchArea.z), view.searchArea.r * S, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    // objetivo (con borde si fuera de rango)
    if (view.target) {
      const dx = view.target.x - view.x, dz = view.target.z - view.z;
      const a = view.heading + Math.PI; // misma rotación que el mapa
      const ca = Math.cos(a), sa = Math.sin(a);
      let mx = (dx * ca - dz * sa) * S * z, my = (dx * sa + dz * ca) * S * z;
      const cy = R + R * 0.25; let px = R + mx, py = cy + my;
      const dd = Math.hypot(px - R, py - R); const lim = R - 14;
      if (dd > lim) { px = R + (px - R) / dd * lim; py = R + (py - R) / dd * lim; }
      ctx.fillStyle = '#ffb020'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px + 8, py); ctx.lineTo(px, py + 10); ctx.lineTo(px - 8, py); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // jugador
    const cy = R + R * 0.25;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2f7bff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(R, cy - 13); ctx.lineTo(R + 9, cy + 9); ctx.lineTo(R, cy + 4); ctx.lineTo(R - 9, cy + 9); ctx.closePath(); ctx.stroke(); ctx.fill();
    // borde y norte
    ctx.save(); ctx.translate(R, R); const na = view.heading + Math.PI;
    const north = { x: Math.sin(na) * (R - 14), y: -Math.cos(na) * (R - 14) };
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(north.x, north.y, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', north.x, north.y + 1);
    ctx.restore();
  }
  drawBigMap(view) {
    const cv = $('bigmap').querySelector('canvas'); const ctx = cv.getContext('2d'); const W = cv.width;
    const k = W / this.mapImg.width; ctx.clearRect(0, 0, W, W); ctx.drawImage(this.mapImg, 0, 0, W, W);
    const tx = (v) => (v + this.ext) * this.scale * k;
    ctx.font = '600 15px Inter, Arial'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.textAlign = 'center';
    if (view.route) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 5; ctx.beginPath(); view.route.forEach((p, i) => (i ? ctx.lineTo(tx(p[0]), tx(p[1])) : ctx.moveTo(tx(p[0]), tx(p[1])))); ctx.stroke(); }
    for (const d of view.dots || []) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(tx(d.x), tx(d.z), (d.r || 2.5) * 1.6, 0, 7); ctx.fill(); }
    if (view.target) { ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(tx(view.target.x), tx(view.target.z), 12, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(tx(view.x), tx(view.z)); ctx.rotate(-view.heading + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2f7bff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, 11); ctx.lineTo(0, 5); ctx.lineTo(-11, 11); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    // nombres de distritos
    const names = { centro: 'CENTRO', ocio: 'ZONA DE OCIO', industrial: 'POLÍGONO', puerto: 'PUERTO', parque: 'PARQUE', comisaria: 'COMISARÍA', hospital: 'HOSPITAL' };
    const done = new Set();
    for (const b of this.city.blocks) { const n = names[b.type]; if (!n || done.has(n)) continue; done.add(n); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(n, tx(b.cx), tx(b.cz)); }
  }

  // ---------- Velocímetro ----------
  drawSpeedo(kmh, rpm) {
    const c = this.sp, W = c.canvas.width, R = W * 0.447, C = W / 2; c.clearRect(0, 0, W, W);
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    c.lineCap = 'round';
    c.lineWidth = 14; c.strokeStyle = 'rgba(10,14,22,.65)'; c.beginPath(); c.arc(C, C, R - 20, a0, a1); c.stroke();
    const t = Math.min(1, kmh / 220);
    const g = c.createLinearGradient(0, W, W, 0); g.addColorStop(0, '#2f7bff'); g.addColorStop(1, '#9fd0ff');
    c.strokeStyle = g; c.beginPath(); c.arc(C, C, R - 20, a0, a0 + (a1 - a0) * t); c.stroke();
    const rt = Math.min(1, rpm / 7000);
    c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(C, C, R - 44, a0, a1); c.stroke();
    c.strokeStyle = rt > 0.85 ? '#ff4b4b' : '#ffb020'; c.beginPath(); c.arc(C, C, R - 44, a0, a0 + (a1 - a0) * rt); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '600 15px Barlow Condensed, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let v = 0; v <= 220; v += 40) { const a = a0 + (a1 - a0) * v / 220; c.fillText(v, C + Math.cos(a) * (R + 4), C + Math.sin(a) * (R + 4)); }
  }

  // ---------- Mensajes ----------
  toast(text, kind = 'info', ms = 1900) {
    const d = document.createElement('div'); d.className = `toast ${kind}`; d.textContent = text; const tb = $('toasts'); tb.appendChild(d); while (tb.children.length > 2) tb.firstChild.remove();
    setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = 0; setTimeout(() => d.remove(), 450); }, ms);
  }
  radio(from, text, prio = 3, speak = false) {
    this.audio.radio();
    const d = document.createElement('div'); d.className = `rmsg glass p${prio}`;
    const now = this.clockStr || '';
    d.innerHTML = `<div class="h"><span>${esc(from)}</span><span>${now}</span></div>${esc(text)}`;
    const box = $('radio'); box.prepend(d);
    while (box.children.length > 2) box.lastChild.remove();
    setTimeout(() => { d.style.transition = 'opacity .8s'; d.style.opacity = 0; setTimeout(() => d.remove(), 800); }, 7000);
    if (speak) this.audio.say(text.replace(/\bAv\./g, 'Avenida'));
  }
  dispatch(call, onAccept, onReject) {
    const el = $('dispatch');
    el.innerHTML = `<div class="cat">${esc(call.category)} · Prioridad ${call.priority}</div><div class="ttl">${esc(call.title)}</div>
      <div class="det">${esc(call.details)}<br><b>Ubicación:</b> ${esc(call.location)} · ${Math.round(call.distance)} m</div>
      <div class="act"><button class="ok" id="d-ok">Aceptar <span class="kbd">Y</span></button><button id="d-no">Rechazar <span class="kbd">N</span></button></div><div class="timer"><i id="d-t"></i></div>`;
    el.classList.remove('hidden'); $('radio').classList.add('hidden');
    this.dispatchOpen = { onAccept, onReject, t: 30 };
    $('d-ok').onclick = () => this.closeDispatch(true); $('d-no').onclick = () => this.closeDispatch(false);
  }
  closeDispatch(accept) {
    if (!this.dispatchOpen) return; const d = this.dispatchOpen; this.dispatchOpen = null;
    $('dispatch').classList.add('hidden'); $('radio').classList.remove('hidden');
    (accept ? d.onAccept : d.onReject)?.();
  }
  tickDispatch(dt) {
    if (!this.dispatchOpen) return; this.dispatchOpen.t -= dt;
    const i = $('d-t'); if (i) i.style.width = `${Math.max(0, this.dispatchOpen.t / 30 * 100)}%`;
    if (this.dispatchOpen.t <= 0) this.closeDispatch(false);
  }
  objectives(title, list, extra = '') {
    if (list && document.body.classList.contains('touch')) list = list.map((o) => ({ ...o, text: o.text.replace(/\s*\((?:[A-Z]|[A-Z] \/ [A-Z]|Q)\)/g, '').replace(/Pulsa R para solicitar/, 'Usa la radio para solicitar') }));
    if (!list) { this.vis('objective', false); this.vis('objpill', false); this.objKey = null; return; }
    const html = `<div class="t"><span>${esc(title)}</span><span>${extra}</span></div><ul>${list.map((o) => `<li class="${o.done ? 'done' : ''} ${o.optional ? 'optional' : ''}">${esc(o.text)}${o.optional ? ' (opcional)' : ''}</li>`).join('')}</ul>`;
    this.set('objective', html);
    const cur = list.find((o) => !o.done && !o.optional) || list.find((o) => !o.done);
    const done = list.filter((o) => o.done && !o.optional).length, tot = list.filter((o) => !o.optional).length;
    const txt = cur ? cur.text : 'Objetivos completados';
    this.set('obj-txt', esc(extra && !cur ? (document.body.classList.contains('touch') ? 'Toca el botón de informe' : 'Pulsa I para redactar el informe') : txt));
    this.objProgress = tot > 1 ? `${done}/${tot}` : '';
    this.vis('objpill', true);
    const key = title + '|' + list.map((o) => o.text + o.done).join('|');
    if (key !== this.objKey) { this.objKey = key; if (!document.body.classList.contains('touch')) this.expandObjectives(4.5); }
  }
  expandObjectives(t = 6) { this.objExpandT = t; this.vis('objective', true); }
  tickObjectives(dt, compass) {
    if (this.objExpandT > 0) { this.objExpandT -= dt; if (this.objExpandT <= 0) this.vis('objective', false); }
    const cmp = $('obj-cmp');
    if (compass) { cmp.style.display = ''; cmp.style.transform = `rotate(${compass.angle}rad)`; this.set('obj-dist', compass.dist > 15 ? `${compass.dist < 1000 ? Math.round(compass.dist / 10) * 10 + ' m' : (compass.dist / 1000).toFixed(1) + ' km'}` : (this.objProgress || '')); }
    else { cmp.style.display = 'none'; this.set('obj-dist', this.objProgress || ''); }
  }
  prompt(text) {
    if (!text) { this.vis('prompt', false); return; }
    this.set('prompt', text); this.vis('prompt', true);
  }
  hints(list) { this.set('hints', list.map((h) => `<div>${h}</div>`).join('')); }
  fadeHints(on) { $('hints').classList.toggle('fade', on); }

  // ---------- Rueda contextual ----------
  openWheel(title, options, cb) {
    const el = $('wheel'); const n = options.length; const R = 142;
    let html = `<div class="hub glass">${esc(title)}</div>`;
    options.forEach((o, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2; const x = 200 + Math.cos(a) * R, y = 200 + Math.sin(a) * R;
      html += `<div class="it glass" data-i="${i}" style="left:${x}px;top:${y}px"><b>${i + 1}</b>${esc(o.label)}</div>`;
    });
    html += '<button class="close" id="wh-close">Cerrar</button>';
    el.innerHTML = html; el.classList.remove('hidden'); this.wheelCb = cb; this.wheelOpts = options;
    el.querySelectorAll('.it').forEach((d) => (d.onclick = () => this.pickWheel(+d.dataset.i)));
    $('wh-close').onclick = () => this.closeWheel();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  pickWheel(i) {
    if (!this.wheelCb) return; const cb = this.wheelCb; const o = this.wheelOpts[i]; this.closeWheel(); this.audio.click(); if (o) cb(o);
  }
  closeWheel() { $('wheel').classList.add('hidden'); this.wheelCb = null; }
  get wheelOpen() { return !!this.wheelCb; }

  // ---------- Diálogos ----------
  // lines: [{who, text, sub}], choices: [{label, risky, fn}]
  say(lines, choices = null, onDone = null) {
    this.dialogQueue = Array.isArray(lines) ? [...lines] : [lines];
    this.dialogChoices = choices; this.dialogCb = onDone; this.nextLine();
  }
  nextLine() {
    const el = $('dialog');
    const line = this.dialogQueue.shift();
    if (!line) {
      if (this.dialogChoices) { this.showChoices(this.dialogChoices); return; }
      el.classList.add('hidden'); this.dialogActive = false; const cb = this.dialogCb; this.dialogCb = null; cb?.(); return;
    }
    this.dialogActive = true;
    el.innerHTML = `<div class="who"><span>${esc(line.who)}</span><em>${esc(line.sub || '')}</em></div><div class="txt">${esc(line.text)}</div><div class="cont">Pulsa <span class="kbd">E</span> / <span class="kbd">Espacio</span> o haz clic para continuar</div>`;
    el.classList.remove('hidden'); el.onclick = () => this.nextLine();
    this.lineT = 0;
  }
  showChoices(choices) {
    const el = $('dialog'); this.dialogChoices = null;
    const prev = el.querySelector('.who') ? el.querySelector('.who').outerHTML + el.querySelector('.txt').outerHTML : '';
    el.innerHTML = `${prev}<div class="choices">${choices.map((c, i) => `<button class="${c.risky ? 'risky' : ''}" data-i="${i}"><span class="kbd">${i + 1}</span>${esc(c.label)}</button>`).join('')}</div>`;
    el.onclick = null; this.choiceList = choices;
    el.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); this.pickChoice(+b.dataset.i); }));
    if (document.pointerLockElement) document.exitPointerLock();
  }
  pickChoice(i) {
    const c = this.choiceList?.[i]; if (!c) return; this.choiceList = null; this.audio.click();
    $('dialog').classList.add('hidden'); this.dialogActive = false; c.fn?.();
  }
  get choosing() { return !!this.choiceList; }

  // ---------- Informe ----------
  openReport(m, onSend, onLater) {
    $('rep-head').innerHTML = `<b>${esc(m.code)} · ${esc(m.title)}</b> — ${esc(m.location)}. Agente: ${esc(m.officer)}. Hora: ${esc(m.time)}.`;
    $('rep-facts').innerHTML = m.facts.length ? m.facts.map((f) => `<div class="fact">${esc(f)}</div>`).join('') : '<div class="fact">Sin hechos relevantes registrados.</div>';
    let sel = null;
    $('rep-res').innerHTML = m.resolutions.map((r, i) => `<button class="card" data-i="${i}"><b>${esc(r.label)}</b><small>${esc(r.desc || '')}</small></button>`).join('');
    $('rep-res').querySelectorAll('.card').forEach((b) => (b.onclick = () => { $('rep-res').querySelectorAll('.card').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = +b.dataset.i; this.audio.click(); }));
    $('rep-ev').innerHTML = m.evidence.length ? m.evidence.map((e, i) => `<label class="ev"><input type="checkbox" data-i="${i}" ${e.preselect ? 'checked' : ''}> ${esc(e.label)}</label>`).join('') : '<div class="fact">No se han recogido pruebas.</div>';
    $('rep-obs').textContent = m.observations || 'Sin incidencias adicionales.';
    $('report').classList.remove('hidden');
    $('rep-send').onclick = () => {
      if (sel === null) { this.toast('Selecciona una resolución', 'bad'); return; }
      const ev = [...$('rep-ev').querySelectorAll('input:checked')].map((x) => +x.dataset.i);
      $('report').classList.add('hidden'); onSend(sel, ev);
    };
    $('rep-later').onclick = () => { $('report').classList.add('hidden'); onLater?.(); };
    if (document.pointerLockElement) document.exitPointerLock();
  }
  openResults(r, onOk) {
    $('res-title').textContent = r.title; $('res-sub').textContent = r.sub; $('res-grade').textContent = r.grade;
    $('res-grade').style.color = r.grade === 'A' || r.grade === 'S' ? '#69a6ff' : r.grade === 'B' ? '#35d07f' : r.grade === 'C' ? '#ffb020' : '#ff6b6b';
    $('res-scores').innerHTML = r.scores.map((s) => `<div class="score"><span>${esc(s.label)}</span><div class="b"><i data-w="${s.value}"></i></div><b>${s.value}</b></div>`).join('');
    $('res-cons').innerHTML = r.consequences.map((c) => `<div class="cons">${esc(c)}</div>`).join('');
    $('res-xp').textContent = r.xp ? `+${r.xp} XP · ${r.rank}` : r.rank;
    $('results').classList.remove('hidden');
    requestAnimationFrame(() => setTimeout(() => $('res-scores').querySelectorAll('i').forEach((i) => (i.style.width = i.dataset.w + '%')), 60));
    $('res-ok').onclick = () => { $('results').classList.add('hidden'); onOk?.(); };
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ---------- Estado ----------
  updateStatus(s) {
    this.clockStr = s.clock;
    this.set('clock', s.clock); this.set('shiftlbl', s.shift); this.set('wlbl', s.weather);
    const r = rankOf(s.xp); this.set('rank', `${r.name} · ${s.xp} XP`);
    const bar = $('xpbar').firstElementChild; const w = `${Math.round(r.progress * 100)}%`; if (bar.style.width !== w) bar.style.width = w;
    this.set('loc', `<b>${esc(s.district)}</b>${esc(s.street)}`);
    this.vis('speedo', s.inCar);
    if (s.inCar) {
      this.set('spd', String(Math.round(s.kmh)));
      this.set('i-gear', s.kmh < 1 && s.reverse ? 'R' : String(s.gear));
      $('i-lights').classList.toggle('on', s.lights); $('i-siren').classList.toggle('on', s.siren);
      this.drawSpeedo(s.kmh, s.rpm);
    }
    if (s.pursuit) { this.vis('pursuit', true); this.set('pur-d', `${Math.round(s.pursuit.d)} m`); $('pur-b').style.width = `${Math.max(0, Math.min(100, 100 - s.pursuit.d / 3))}%`; } else this.vis('pursuit', false);
    $('vignette').style.boxShadow = `inset 0 0 160px rgba(255,30,30,${(s.danger || 0) * 0.5})`;
  }
}

export function rankOf(xp) {
  let i = 0; while (i < RANKS.length - 1 && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i], next = RANKS[i + 1];
  return { name: cur.name, index: i, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1, next: next?.name };
}
