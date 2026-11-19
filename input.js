/**
 * Entrada -> InputFrame {mx, mz, attack, dodge}. Teclado: WASD/setas; golpe J ou Espaço; esquiva K ou Shift.
 * Toque: joystick flutuante na metade esquerda e, à direita, o botão de golpe (grande) e o de esquiva (menor, acima e à esquerda).
 * attack e dodge valem 1 tick por aperto (borda); a sim guarda o aperto por 6 ticks.
 */
export function createInput(host) {
  const R = 60; // raio do joystick (px)
  const keys = new Set(), out = { mx: 0, mz: 0, attack: false, dodge: false }, joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  let atk = false, dod = false;
  const base = document.createElement('div'), knob = document.createElement('div');
  base.className = 'joy joy-base'; knob.className = 'joy joy-knob'; base.hidden = knob.hidden = true;
  const button = (cls, label, svg, onPress) => {
    const b = document.createElement('div');
    b.className = cls; b.setAttribute('aria-label', label); b.innerHTML = svg;
    const release = () => b.classList.remove('on');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); onPress(); b.classList.add('on'); });
    b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('pointerleave', release);
    return { b, flash: () => { b.classList.add('on'); setTimeout(release, 90); } };
  };
  const A = button('btn', 'Golpe', '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M7 27 15 5h4L11 27zM15 27 23 5h4l-8 22z"/></svg>', () => { atk = true; });
  const D = button('btn dodge', 'Esquiva', '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="M6 7l9 9-9 9M17 7l9 9-9 9"/></svg>', () => { dod = true; });
  host.append(base, knob, A.b, D.b);
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!e.repeat) {
      if (k === 'j' || k === ' ') { e.preventDefault(); atk = true; A.flash(); }
      else if (k === 'k' || k === 'shift') { dod = true; D.flash(); }
    }
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
    /** @returns {{mx:number, mz:number, attack:boolean, dodge:boolean}} mx: +direita, mz: +fundo da tela */
    read() {
      let mx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
      let mz = (keys.has('w') || keys.has('arrowup')) - (keys.has('s') || keys.has('arrowdown'));
      if (!mx && !mz && joy.id !== -1) {
        mx = (joy.x - joy.ox) / R; mz = -(joy.y - joy.oy) / R;
        if (Math.hypot(mx, mz) < 0.12) mx = mz = 0; // zona morta
      }
      out.mx = mx; out.mz = mz; out.attack = atk; out.dodge = dod; atk = dod = false;
      return out;
    },
  };
}
