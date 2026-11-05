// Audio sintetizado con WebAudio: motor, sirenas, lluvia, ciudad, radio y voz
export class AudioSys {
  constructor() { this.ctx = null; this.enabled = true; this.voice = true; this.volume = 0.8; this.sirenMode = 0; this.musicVol = 0.55; this.musicMode = 'menu'; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.volume;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    // buffers de ruido
    const len = c.sampleRate * 2;
    this.white = c.createBuffer(1, len, c.sampleRate); const w = this.white.getChannelData(0); for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    this.brown = c.createBuffer(1, len, c.sampleRate); const b = this.brown.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    // motor
    this.eng = c.createGain(); this.eng.gain.value = 0;
    this.engF = c.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 600; this.engF.Q.value = 3;
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = c.createOscillator(); this.o2.type = 'square'; this.o3 = c.createOscillator(); this.o3.type = 'sine';
    const g2 = c.createGain(); g2.gain.value = 0.35; const g3 = c.createGain(); g3.gain.value = 0.6;
    this.o1.connect(this.engF); this.o2.connect(g2).connect(this.engF); this.o3.connect(g3).connect(this.engF);
    const en = this.noise(this.brown, 'bandpass', 180, 0.6, 0); this.engNoise = en.g; en.g.connect(this.eng);
    this.engF.connect(this.eng).connect(this.master);
    this.o1.start(); this.o2.start(); this.o3.start();
    // chirrido de neumáticos
    const sq = this.noise(this.white, 'bandpass', 1800, 6, 0); this.squeal = sq.g; sq.g.connect(this.master);
    // lluvia
    const rn = this.noise(this.white, 'highpass', 900, 0.3, 0); this.rain = rn.g; rn.g.connect(this.master);
    const rn2 = this.noise(this.brown, 'lowpass', 400, 0.5, 0); this.rainLow = rn2.g; rn2.g.connect(this.master);
    // ambiente urbano
    const amb = this.noise(this.brown, 'lowpass', 300, 0.7, 0.12); amb.g.connect(this.master); this.amb = amb.g;
    const hum = this.noise(this.white, 'bandpass', 2400, 0.4, 0.008); hum.g.connect(this.master);
    // sirena
    this.sir = c.createGain(); this.sir.gain.value = 0;
    this.sirO = c.createOscillator(); this.sirO.type = 'sawtooth'; this.sirO.frequency.value = 700;
    this.sirO2 = c.createOscillator(); this.sirO2.type = 'square'; this.sirO2.frequency.value = 702;
    const sf = c.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2600; const sg2 = c.createGain(); sg2.gain.value = 0.25;
    const shaper = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.5); } shaper.curve = curve;
    this.sirO.connect(shaper); this.sirO2.connect(sg2).connect(shaper); shaper.connect(sf).connect(this.sir).connect(this.master);
    this.sirO.start(); this.sirO2.start();
    // sirena lejana (apoyo / ambulancia)
    this.sirFar = c.createGain(); this.sirFar.gain.value = 0; this.sirFarO = c.createOscillator(); this.sirFarO.type = 'triangle'; this.sirFarO.frequency.value = 800;
    const ff = c.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 1500; this.sirFarO.connect(ff).connect(this.sirFar).connect(this.master); this.sirFarO.start();
    this.t = 0;
    // ruido de rodadura, viento y lluvia sobre el techo
    const road = this.noise(this.brown, 'lowpass', 260, 0.7, 0); this.road = road.g; road.g.connect(this.master);
    const hiss = this.noise(this.white, 'bandpass', 3200, 0.6, 0); this.hiss = hiss.g; hiss.g.connect(this.master);
    const wind = this.noise(this.white, 'bandpass', 700, 0.4, 0); this.wind = wind.g; this.windF = wind.fl; wind.g.connect(this.master);
    const roof = this.noise(this.white, 'lowpass', 1600, 0.5, 0); this.roof = roof.g; roof.g.connect(this.master);
    // música adaptativa
    this.music = new Music(this);
    this.stepT = 0; this.ambT = 4; this.lastGear = 1;
  }
  noise(buf, type, f, q, gain) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = gain; s.connect(fl).connect(g); s.start(); return { s, fl, g };
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  update(dt, st) {
    if (!this.ctx) return; this.t += dt; const now = this.ctx.currentTime; const k = 0.08;
    this.music.update(dt);
    const sp = st.speed || 0, indoor = !!st.indoor;
    this.road.gain.setTargetAtTime(st.inCar ? Math.min(0.22, sp * 0.006) : 0, now, 0.2);
    this.hiss.gain.setTargetAtTime(st.inCar && st.wet ? Math.min(0.08, sp * 0.003) : 0, now, 0.2);
    this.wind.gain.setTargetAtTime(st.inCar ? Math.max(0, (sp - 12) * 0.0035) : 0, now, 0.3); this.windF.frequency.setTargetAtTime(500 + sp * 18, now, 0.3);
    this.roof.gain.setTargetAtTime(st.inCar ? (st.rain || 0) * 0.07 : 0, now, 0.4);
    if (st.inCar && (st.rain || 0) > 0.2 && Math.random() < dt * 30 * st.rain) this.oneShot(this.white, 'bandpass', 2500 + Math.random() * 3000, 4, 0.03 + Math.random() * 0.04, 0.001, 0.03);
    // cambio de marcha y petardeo
    if (st.inCar && st.gear !== this.lastGear) { if (st.gear > this.lastGear) { this.eng.gain.setValueAtTime(0.03, now); this.oneShot(this.brown, 'lowpass', 400, 1, 0.12, 0.002, 0.12); } this.lastGear = st.gear; }
    if (st.inCar && st.throttle === 0 && st.rpm > 4200 && Math.random() < dt * 3) this.oneShot(this.brown, 'bandpass', 180, 2, 0.35, 0.002, 0.08);
    // pasos
    if (!st.inCar && st.footSpeed > 0.4) {
      this.stepT -= dt * (st.footSpeed > 3 ? 1.9 : 1) * Math.max(0.7, st.footSpeed / 1.6);
      if (this.stepT <= 0) { this.stepT = 0.52; this.oneShot(this.brown, 'lowpass', indoor ? 700 : 380, 1, st.footSpeed > 3 ? 0.42 : 0.26, 0.002, 0.09, 0.9 + Math.random() * 0.2); this.oneShot(this.white, st.wet ? 'bandpass' : 'highpass', st.wet ? 1800 : 5000, 1, st.wet ? 0.07 : 0.025, 0.001, st.wet ? 0.12 : 0.04); }
    }
    // ambiente de ciudad (eventos aleatorios)
    this.ambT -= dt;
    if (this.ambT <= 0 && !indoor) {
      this.ambT = 5 + Math.random() * 9; const r = Math.random();
      if (r < 0.28) { const f = 330 + Math.random() * 120; this.tone(f, 0.25 + Math.random() * 0.3, 'square', 0.012); }
      else if (r < 0.4 && st.night) { let t0 = 0; for (let i = 0; i < 6; i++) { this.tone(i % 2 ? 440 : 590, 0.55, 'triangle', 0.006, t0); t0 += 0.55; } }
      else if (r < 0.62 && !st.night && !st.rain) { for (let i = 0; i < 3 + Math.random() * 4; i++) this.chirp(i * 0.13); }
      else if (r < 0.72) { this.oneShot(this.brown, 'lowpass', 120, 0.6, 0.18, 0.4, 2.5, 0.6); }
      else if (r < 0.82) this.bark();
    }
    // motor
    const rpm = st.inCar ? st.rpm : 0;
    const f = 28 + rpm / 60 * 0.9;
    this.o1.frequency.setTargetAtTime(f, now, k); this.o2.frequency.setTargetAtTime(f * 0.5, now, k); this.o3.frequency.setTargetAtTime(f * 0.25, now, k);
    this.engF.frequency.setTargetAtTime(250 + rpm * 0.25 + st.throttle * 600, now, k);
    this.eng.gain.setTargetAtTime(st.inCar ? 0.07 + st.throttle * 0.08 : 0, now, 0.15);
    this.engNoise.gain.setTargetAtTime(st.inCar ? 0.25 + st.speed * 0.01 : 0, now, 0.2);
    this.squeal.gain.setTargetAtTime(st.inCar ? Math.min(0.25, Math.max(0, st.slip - 2.5) * 0.05) * (st.wet ? 0.3 : 1) : 0, now, 0.05);
    // sirena del jugador
    if (st.siren) {
      let freq;
      const m = this.sirenMode;
      if (m === 0) freq = (Math.floor(this.t / 0.55) % 2) ? 435 : 580; // bitonal europeo
      else if (m === 1) freq = 650 + (Math.sin(this.t * 1.4) * 0.5 + 0.5) * 750; // wail
      else freq = 650 + (Math.abs(((this.t * 4) % 2) - 1)) * 800; // yelp
      this.sirO.frequency.setTargetAtTime(freq, now, m === 0 ? 0.01 : 0.03); this.sirO2.frequency.setTargetAtTime(freq * 1.004, now, 0.02);
      this.sir.gain.setTargetAtTime(st.inCar ? 0.09 : 0.05, now, 0.05);
    } else this.sir.gain.setTargetAtTime(0, now, 0.05);
    if (st.farSiren > 0) { const ff = (Math.floor(this.t / 0.6) % 2) ? 440 : 590; this.sirFarO.frequency.setTargetAtTime(ff, now, 0.02); }
    this.sirFar.gain.setTargetAtTime(Math.min(0.05, st.farSiren * 0.05), now, 0.2);
    this.amb.gain.setTargetAtTime(0.1 + (st.inCar ? 0 : 0.05), now, 0.5);
  }
  setRain(i) { if (!this.ctx) return; const now = this.ctx.currentTime; this.rain.gain.setTargetAtTime(i * 0.06, now, 0.5); this.rainLow.gain.setTargetAtTime(i * 0.12, now, 0.5); }
  env(node, a, d, peak) { const now = this.ctx.currentTime; node.gain.setValueAtTime(0, now); node.gain.linearRampToValueAtTime(peak, now + a); node.gain.exponentialRampToValueAtTime(0.0001, now + a + d); }
  oneShot(buf, type, f, q, peak, a, d, rate = 1) {
    if (!this.ctx) return; const c = this.ctx; const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain();
    s.connect(fl).connect(g).connect(this.master); this.env(g, a, d, peak); s.start(); s.stop(c.currentTime + a + d + 0.1);
  }
  impact(mag) { this.oneShot(this.brown, 'lowpass', 900, 0.8, Math.min(1.2, mag * 0.12), 0.005, 0.5); this.oneShot(this.white, 'bandpass', 3000, 2, Math.min(0.3, mag * 0.03), 0.002, 0.25); }
  thunder(delay) { if (!this.ctx) return; setTimeout(() => { this.oneShot(this.brown, 'lowpass', 220, 0.5, 1.4, 0.08, 4.5, 0.5); this.oneShot(this.brown, 'lowpass', 600, 0.5, 0.5, 0.01, 1.2); }, delay * 1000); }
  tone(freq, dur, type = 'sine', vol = 0.15, when = 0) {
    if (!this.ctx) return; const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = freq; const g = c.createGain();
    o.connect(g).connect(this.master); const t0 = c.currentTime + when; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.setValueAtTime(vol, t0 + dur - 0.02); g.gain.linearRampToValueAtTime(0, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  horn(vol = 1) { this.tone(392, 0.45, 'square', 0.05 * vol); this.tone(494, 0.45, 'square', 0.04 * vol); }
  radio() { this.oneShot(this.white, 'bandpass', 2000, 1.2, 0.18, 0.005, 0.25); this.tone(1250, 0.08, 'sine', 0.12, 0.05); this.tone(1650, 0.1, 'sine', 0.1, 0.14); }
  click() { this.tone(900, 0.04, 'sine', 0.06); }
  success() { this.tone(660, 0.12, 'sine', 0.12); this.tone(880, 0.18, 'sine', 0.12, 0.12); this.tone(1320, 0.25, 'sine', 0.08, 0.26); }
  fail() { this.tone(330, 0.2, 'sawtooth', 0.06); this.tone(220, 0.3, 'sawtooth', 0.06, 0.18); }
  cuffs() { this.oneShot(this.white, 'highpass', 4000, 1, 0.25, 0.001, 0.08); setTimeout(() => this.oneShot(this.white, 'highpass', 5000, 1, 0.2, 0.001, 0.06), 140); }
  camera() { this.oneShot(this.white, 'highpass', 3000, 1, 0.3, 0.001, 0.05); setTimeout(() => this.oneShot(this.white, 'bandpass', 1500, 1, 0.15, 0.001, 0.12), 60); }
  door() { this.oneShot(this.brown, 'lowpass', 500, 1, 0.8, 0.003, 0.25); }
  chirp(when = 0) {
    if (!this.ctx) return; const c = this.ctx; const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; const t0 = c.currentTime + when;
    const f = 2800 + Math.random() * 1800; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * (0.6 + Math.random() * 0.8), t0 + 0.09);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.01); g.gain.linearRampToValueAtTime(0, t0 + 0.1); o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + 0.12);
  }
  bark() { for (let i = 0; i < 2; i++) { this.oneShot(this.white, 'bandpass', 700, 3, 0.05, 0.005, 0.12, 1); this.tone(420 - i * 30, 0.09, 'sawtooth', 0.01, i * 0.22); } }
  setMusic(mode) { this.musicMode = mode; this.music?.setMode(mode); }
  setMusicVolume(v) { this.musicVol = v; this.music?.setVolume(v); }
  say(text) {
    if (!this.voice || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 1.08; u.pitch = 0.9; u.volume = this.volume;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('es')); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
}


// ---------------- Música adaptativa (secuenciador WebAudio) ----------------
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
  // acordes en notas MIDI; bpm; capas
  menu:    { bpm: 76, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], drums: 0, bass: 0.6, arp: 0.25, pad: 1 },
  patrol:  { bpm: 94, chords: [[50, 57, 60, 65], [46, 53, 57, 62], [53, 57, 60, 64], [48, 55, 59, 62]], drums: 0.7, bass: 1, arp: 0.35, pad: 0.7 },
  pursuit: { bpm: 132, chords: [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66], [47, 54, 59, 63]], drums: 1, bass: 1.2, arp: 0.8, pad: 0.45 },
  indoor:  { bpm: 84, chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]], drums: 0.4, bass: 0.6, arp: 0, pad: 0.8, keys: 1 },
  silent:  { bpm: 90, chords: [[57, 60, 64]], drums: 0, bass: 0, arp: 0, pad: 0 },
};
class Music {
  constructor(a) {
    this.a = a; const c = this.c = a.ctx;
    this.out = c.createGain(); this.out.gain.value = a.musicVol * 0.5;
    // eco/«reverb» sencilla
    const d1 = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(); d1.delayTime.value = 0.33; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.wet = c.createGain(); this.wet.gain.value = 0.35; this.wet.connect(d1); d1.connect(lp).connect(fb).connect(d1); lp.connect(this.out);
    this.out.connect(a.master);
    this.mode = a.musicMode; this.song = SONGS[this.mode]; this.step = 0; this.next = c.currentTime + 0.1; this.duck = 1;
  }
  setMode(m) { if (!SONGS[m] || m === this.mode) return; this.mode = m; this.pending = SONGS[m]; }
  setVolume(v) { this.out.gain.setTargetAtTime(v * 0.5, this.c.currentTime, 0.3); }
  update() {
    const c = this.c; const ahead = c.currentTime + 0.15;
    while (this.next < ahead) {
      if (this.pending && this.step % 16 === 0) { this.song = this.pending; this.pending = null; }
      this.play(this.step, this.next); const S = this.song; this.next += 60 / S.bpm / 4; this.step++;
    }
  }
  voice(type, f, t, dur, vol, cutoff = 1800, send = 0.3) {
    const c = this.c; const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); g.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
    o.connect(fl).connect(g); g.connect(this.out); if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s).connect(this.wet); }
    o.start(t); o.stop(t + dur + 0.6);
  }
  hit(kind, t, vol) {
    const a = this.a, c = this.c;
    if (kind === 'kick') { const o = c.createOscillator(); const g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.3); return; }
    const s = c.createBufferSource(); s.buffer = a.white; const fl = c.createBiquadFilter(); const g = c.createGain();
    if (kind === 'hat') { fl.type = 'highpass'; fl.frequency.value = 7000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); }
    else { fl.type = 'bandpass'; fl.frequency.value = 1800; fl.Q.value = 0.7; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); }
    s.connect(fl).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + 0.25);
  }
  play(step, t) {
    const S = this.song; const bar = Math.floor(step / 16) % S.chords.length; const st = step % 16; const ch = S.chords[bar]; const beat = 60 / S.bpm;
    if (st === 0 && S.pad) for (const n of ch) this.voice('sawtooth', NOTE(n), t, beat * 4, 0.022 * S.pad, 900, 0.5);
    if (S.keys && (st === 0 || st === 6 || st === 10)) for (const n of ch) this.voice('sine', NOTE(n + 12), t, beat * 1.2, 0.03, 3000, 0.4);
    if (S.bass) { const pat = S.bpm > 120 ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 6, 8, 11]; if (pat.includes(st)) this.voice('triangle', NOTE(ch[0] - 12), t, beat * (S.bpm > 120 ? 0.45 : 0.9), 0.09 * S.bass, 600, 0); }
    if (S.arp && st % 2 === 0) { const n = ch[(st / 2) % ch.length] + 12; this.voice('square', NOTE(n), t, beat * 0.3, 0.012 * S.arp, 2200, 0.6); }
    if (S.drums) {
      if (S.bpm > 120 ? st % 4 === 0 : st === 0 || st === 10) this.hit('kick', t, 0.5 * S.drums);
      if (st === 4 || st === 12) this.hit('snare', t, 0.16 * S.drums);
      if (st % 2 === 0 || S.bpm > 120) this.hit('hat', t, (st % 4 === 2 ? 0.05 : 0.03) * S.drums);
    }
  }
}
