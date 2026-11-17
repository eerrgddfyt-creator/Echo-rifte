/**
 * Entrada -> InputFrame {mx, mz}. Teclado (WASD/setas) + joystick flutuante na metade esquerda da tela.
 * Os botões de ataque, esquiva e ECHO entram junto com essas funções (M3 a M5).
 */
export function createInput(host) {
  const R = 60; // raio do joystick (px)
  const keys = new Set(), out = { mx: 0, mz: 0 }, joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  const base = document.createElement('div'), knob = document.createElement('div');
  base.className = 'joy joy-base'; knob.className = 'joy joy-knob';
  base.hidden = knob.hidden = true; host.append(base, knob);
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };

  addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('pointerdown', (e) => {
    if (joy.id !== -1 || e.clientX > innerWidth / 2 || (e.target.closest && e.target.closest('.dbg'))) return;
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
    /** @returns {{mx:number, mz:number}} mx: +direita, mz: +fundo da tela */
    read() {
      let mx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
      let mz = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown'));
      if (!mx && !mz && joy.id !== -1) {
        mx = (joy.x - joy.ox) / R; mz = -(joy.y - joy.oy) / R;
        if (Math.hypot(mx, mz) < 0.12) mx = mz = 0; // zona morta
      }
      out.mx = mx; out.mz = mz;
      return out;
    },
  };
}
