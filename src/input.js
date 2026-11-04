// Entrada: teclado, ratón (pointer lock), mando y controles táctiles
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set(); this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.locked = false; this.touch = { active: false, jx: 0, jy: 0, cam: [0, 0], buttons: new Set(), tapped: new Set() };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      const k = e.code; if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && this.wantLock && !this.locked && !this.isTouch) canvas.requestPointerLock?.(); this.mouseDown = true; });
    addEventListener('mouseup', () => (this.mouseDown = false));
    addEventListener('mousemove', (e) => { if (this.locked || this.mouseDown) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    this.wantLock = false;
    if (this.isTouch) this.setupTouch();
  }
  setupTouch() {
    const root = document.getElementById('touch'); if (!root) return; root.classList.add('on');
    const joy = root.querySelector('.joy'), knob = root.querySelector('.knob');
    let jid = null, jx0 = 0, jy0 = 0, cid = null, cx0 = 0, cy0 = 0;
    root.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        const btn = t.target.closest('[data-k]');
        if (btn) { const k = btn.dataset.k; this.touch.buttons.add(k); this.pressed.add(k); btn.classList.add('down'); btn._tid = t.identifier; continue; }
        if (t.clientX < innerWidth * 0.4 && jid === null) { jid = t.identifier; jx0 = t.clientX; jy0 = t.clientY; joy.style.left = jx0 - 60 + 'px'; joy.style.top = jy0 - 60 + 'px'; joy.classList.add('show'); }
        else if (cid === null) { cid = t.identifier; cx0 = t.clientX; cy0 = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    root.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) { let dx = (t.clientX - jx0) / 55, dy = (t.clientY - jy0) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } this.touch.jx = dx; this.touch.jy = dy; knob.style.transform = `translate(${dx * 45}px,${dy * 45}px)`; }
        if (t.identifier === cid) { this.mdx += (t.clientX - cx0) * 1.4; this.mdy += (t.clientY - cy0) * 1.4; cx0 = t.clientX; cy0 = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) { jid = null; this.touch.jx = this.touch.jy = 0; knob.style.transform = ''; joy.classList.remove('show'); }
        if (t.identifier === cid) cid = null;
        root.querySelectorAll('[data-k]').forEach((b) => { if (b._tid === t.identifier) { this.touch.buttons.delete(b.dataset.k); b.classList.remove('down'); b._tid = null; } });
      }
    };
    root.addEventListener('touchend', end); root.addEventListener('touchcancel', end);
  }
  down(...codes) { return codes.some((c) => this.keys.has(c) || this.touch.buttons.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }
  gamepad() { const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; return gp; }
  axes() {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1; if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y += 1; if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.touch.jx || this.touch.jy) { x = this.touch.jx; y = -this.touch.jy; }
    const gp = this.gamepad();
    if (gp) { if (Math.abs(gp.axes[0]) > 0.15) x = gp.axes[0]; if (Math.abs(gp.axes[1]) > 0.15) y = -gp.axes[1]; if (gp.buttons[7]?.value > 0.05) y = gp.buttons[7].value; if (gp.buttons[6]?.value > 0.05) y = -gp.buttons[6].value; }
    return [x, y];
  }
  look() {
    let x = this.mdx, y = this.mdy; this.mdx = 0; this.mdy = 0;
    const gp = this.gamepad(); if (gp) { if (Math.abs(gp.axes[2]) > 0.15) x += gp.axes[2] * 12; if (Math.abs(gp.axes[3]) > 0.15) y += gp.axes[3] * 12; }
    return [x, y];
  }
  endFrame() { this.pressed.clear(); this.wheel = 0; }
}
