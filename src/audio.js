// Audio sintetizado con WebAudio: motor, sirenas, lluvia, ciudad, radio y voz
export class AudioSys {
  constructor() { this.ctx = null; this.enabled = true; this.voice = true; this.volume = 0.8; this.sirenMode = 0; }
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
  }
  noise(buf, type, f, q, gain) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = gain; s.connect(fl).connect(g); s.start(); return { s, fl, g };
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  update(dt, st) {
    if (!this.ctx) return; this.t += dt; const now = this.ctx.currentTime; const k = 0.08;
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
  say(text) {
    if (!this.voice || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 1.08; u.pitch = 0.9; u.volume = this.volume;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('es')); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
}
