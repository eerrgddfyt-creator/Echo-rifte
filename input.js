/**
 * Entrada -> InputFrame {mx, mz, attack}. Teclado (WASD/setas; golpe: J ou Espaço), botão de golpe na direita
 * e joystick flutuante na metade esquerda da tela. `attack` vale 1 tick por aperto (borda).
 * Os botões de esquiva e ECHO entram junto com essas funções (M4 e M5).
 */
export function createInput(host) {
  const R = 60; // raio do joystick (px)
  const keys = new Set(), out = { mx: 0, mz: 0, attack: false }, joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  let atk = false;
  const base = document.createElement('div'), knob = document.createElement('div'), btn = document.createElement('div');
  base.className = 'joy joy-base'; knob.className = 'joy joy-knob'; base.hidden = knob.hidden = true;
  btn.className = 'btn'; btn.setAttribute('aria-label', 'Golpe');
  btn.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M7 27 15 5h4L11 27zM15 27 23 5h4l-8 22z"/></svg>';
  host.append(base, knob, btn);
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };

  const press = () => { atk = true; btn.classList.add('on'); };
  const release = () => btn.classList.remove('on');
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release); btn.addEventListener('pointerleave', release);

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((k === 'j' || k === ' ') && !e.repeat) { e.preventDefault(); press(); setTimeout(release, 90); }
    keys.add(k);
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('pointerdown', (e) => {
    if (joy.id !== -1 || e.clientX > innerWidth / 2 || (e.target.closest && e.target.closest('.dbg, .btn'))) return;
    joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY;
    place(base, joy.ox, joy.oy); place(knob, joy.ox, joy.oy); base.hidden = knob.hidden = false;
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    joy.x = joy.ox + dx; joy.y = joy.oy + dy; place(knob, joy.x, joy.y);
  });
  const end = (e) => { if (e.pointerId === joy.id) { joy.id = -1; base.hidden = knob.hidden = true; } };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  return {
    /** @returns {{mx:number, mz:number, attack:boolean}} mx: +direita, mz: +fundo da tela */
    read() {
      let mx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
      let mz = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown'));
      if (!mx && !mz && joy.id !== -1) {
        mx = (joy.x - joy.ox) / R; mz = -(joy.y - joy.oy) / R;
        if (Math.hypot(mx, mz) < 0.12) mx = mz = 0; // zona morta
      }
      out.mx = mx; out.mz = mz; out.attack = atk; atk = false;
      return out;
    },
  };
}
