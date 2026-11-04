// Entrada: teclado, ratón (pointer lock), mando y controles táctiles contextuales
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set(); this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.locked = false; this.touch = { jx: 0, jy: 0, buttons: new Set(), tilt: 0 };
    this.isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    this.lastDevice = this.isTouch ? 'touch' : 'kb';
    this.steerMode = 'joy'; this.haptics = true; this.invertY = false;
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.code; if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); this.lastDevice = 'kb';
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.touch.buttons.clear(); });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && this.wantLock && !this.locked && !this.isTouch) { try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* sin pointer lock */ } } this.mouseDown = true; });
    addEventListener('mouseup', () => (this.mouseDown = false));
    addEventListener('mousemove', (e) => { if (this.locked || this.mouseDown) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    this.wantLock = false;
    if (this.isTouch) { document.body.classList.add('touch'); this.setupTouch(); }
    addEventListener('deviceorientation', (e) => {
      if (this.steerMode !== 'tilt') return;
      const land = Math.abs(window.orientation ?? (screen.orientation?.angle || 0)) === 90;
      const raw = land ? (e.beta || 0) * Math.sign(window.orientation ?? screen.orientation?.angle ?? 90) : (e.gamma || 0);
      this.touch.tilt = Math.max(-1, Math.min(1, raw / 28));
    });
  }
  vibrate(ms) { if (this.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* no disponible */ } }
  setupTouch() {
    const root = this.root = document.getElementById('touch'); if (!root) return; root.classList.add('on');
    const joy = root.querySelector('#joy'), knob = joy.querySelector('.knob');
    const move = root.querySelector('#tz-move'), look = root.querySelector('#tz-look');
    const home = () => { joy.style.left = ''; joy.style.top = ''; joy.style.bottom = ''; joy.style.right = ''; };
    let jid = null, jx0 = 0, jy0 = 0, R = 55;
    move.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (jid !== null) continue; jid = t.identifier; jx0 = t.clientX; jy0 = t.clientY;
        const s = joy.offsetWidth; R = s * 0.42;
        joy.style.left = `${jx0 - s / 2}px`; joy.style.top = `${jy0 - s / 2}px`; joy.style.bottom = 'auto'; joy.style.right = 'auto'; joy.classList.add('on');
      }
      e.preventDefault(); this.lastDevice = 'touch';
    }, { passive: false });
    const lookIds = new Map();
    look.addEventListener('touchstart', (e) => { for (const t of e.changedTouches) lookIds.set(t.identifier, [t.clientX, t.clientY]); e.preventDefault(); this.lastDevice = 'touch'; }, { passive: false });
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) {
          let dx = (t.clientX - jx0) / R, dy = (t.clientY - jy0) / R; const l = Math.hypot(dx, dy);
          if (l > 1) { dx /= l; dy /= l; }
          this.touch.jx = dx; this.touch.jy = dy; this.touch.jmag = Math.min(1, l);
          knob.style.transform = `translate(${dx * R}px,${dy * R}px)`;
        }
        const p = lookIds.get(t.identifier);
        if (p) { this.mdx += (t.clientX - p[0]) * 1.5; this.mdy += (t.clientY - p[1]) * 1.5; lookIds.set(t.identifier, [t.clientX, t.clientY]); }
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) { jid = null; this.touch.jx = this.touch.jy = 0; this.touch.jmag = 0; knob.style.transform = ''; joy.classList.remove('on'); home(); }
        lookIds.delete(t.identifier);
      }
    };
    for (const el of [move, look]) { el.addEventListener('touchmove', (e) => { onMove(e); e.preventDefault(); }, { passive: false }); el.addEventListener('touchend', onEnd); el.addEventListener('touchcancel', onEnd); }
    // botones
    root.querySelectorAll('[data-k]').forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('touchstart', (e) => { this.touch.buttons.add(k); this.pressed.add(k); b.classList.add('down'); this.vibrate(10); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      const up = (e) => { this.touch.buttons.delete(k); b.classList.remove('down'); e.preventDefault(); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    });
  }
  setMode(mode) { if (this.root && this.root.dataset.mode !== mode) { this.root.dataset.mode = mode; this.touch.buttons.clear(); this.root.querySelectorAll('.down').forEach((b) => b.classList.remove('down')); } }
  setSteerMode(m) {
    this.steerMode = m;
    if (this.root) { this.root.classList.toggle('steer-buttons', m === 'buttons'); this.root.classList.toggle('steer-tilt', m === 'tilt'); }
    if (m === 'tilt' && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
  }
  down(...codes) { return codes.some((c) => this.keys.has(c) || this.touch.buttons.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }
  gamepad() { try { const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (gp) this.lastDevice = this.lastDevice === 'touch' ? 'touch' : 'pad'; return gp; } catch { return null; } }
  // mode: 'foot' o 'car'
  axes(mode = 'foot') {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1; if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y += 1; if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.touch.jx || this.touch.jy) {
      if (mode === 'car') { if (this.steerMode === 'joy') x = Math.sign(this.touch.jx) * Math.min(1, Math.abs(this.touch.jx) * 1.15) ** 1.3; }
      else { x = this.touch.jx; y = -this.touch.jy; }
    }
    if (mode === 'car' && this.steerMode === 'tilt' && this.isTouch) x = Math.sign(this.touch.tilt) * Math.max(0, Math.abs(this.touch.tilt) - 0.06) / 0.94;
    const gp = this.gamepad();
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.15) x = gp.axes[0]; if (mode === 'foot' && Math.abs(gp.axes[1]) > 0.15) y = -gp.axes[1];
      if (mode === 'car') { const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0; if (rt > 0.05 || lt > 0.05) y = rt - lt; }
    }
    return [x, y];
  }
  runHeld() { return this.down('ShiftLeft', 'ShiftRight') || (this.touch.jmag || 0) > 0.92 || !!this.gamepad()?.buttons[10]?.pressed; }
  look() {
    let x = this.mdx, y = this.mdy; this.mdx = 0; this.mdy = 0;
    const gp = this.gamepad(); if (gp) { if (Math.abs(gp.axes[2]) > 0.15) x += gp.axes[2] * 12; if (Math.abs(gp.axes[3]) > 0.15) y += gp.axes[3] * 12; }
    return [x, this.invertY ? -y : y];
  }
  endFrame() { this.pressed.clear(); this.wheel = 0; }
}
