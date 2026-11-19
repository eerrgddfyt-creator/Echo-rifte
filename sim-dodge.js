import { EV, emit } from './sim-combat.js';

const S = (u) => u * u * (3 - 2 * u); // smoothstep: o deslize acelera e freia suave

/**
 * Esquiva do jogador: botão guardado (buffer), início (pode cancelar a recuperação de um golpe, nunca o startup nem o ativo),
 * deslize de `dist` metros durante a janela de invulnerabilidade e recarga contada do início de uma esquiva ao início da próxima.
 * dt = ticks desde o início (-1 = fora da esquiva): startup 0..s-1, invulnerável s..s+i-1, recuperação até o fim.
 */
export function stepDodge(w, input) {
  const p = w.player, k = w.params.dodge;
  if (p.dbuf > 0) p.dbuf--;
  if (p.dcd > 0) p.dcd--;
  if (input.dodge && w.phase === 'fight') p.dbuf = w.params.buffer;
  p.dmx = 0; p.dmz = 0;
  if (p.dt >= 0 && ++p.dt >= k.startup + k.iframes + k.recovery) p.dt = -1;
  if (p.dt < 0 && p.dbuf > 0 && p.dcd === 0 && w.phase === 'fight') {
    const A = p.st === 1 ? w.params.attacks[p.step] : null;
    if (!A || p.t >= A.startup + A.active) begin(w, p, input, k);
  }
  p.invul = p.dt >= k.startup && p.dt < k.startup + k.iframes;
  if (p.invul) {
    const i = p.dt - k.startup, n = k.iframes, f = S((i + 1) / n) - S(i / n);
    p.dmx = p.ddx * k.dist * f; p.dmz = p.ddz * k.dist * f;
  }
}

function begin(w, p, input, k) {
  const t = w.target;
  let mx = input.mx || 0, mz = input.mz || 0, m = Math.hypot(mx, mz);
  if (m > 0.3) { mx /= m; mz /= m; } // direção do joystick
  else { // sem joystick: recuo, para longe do alvo
    mx = p.x - t.x; mz = p.z - t.z; m = Math.hypot(mx, mz);
    if (m < 1e-6) { mx = -1; mz = 0; } else { mx /= m; mz /= m; }
  }
  p.ddx = mx; p.ddz = mz; p.dox = p.x; p.doz = p.z;
  p.dt = 0; p.dcd = k.cooldown; p.dbuf = 0; p.vx = 0; p.vz = 0;
  if (p.st === 1) p.st = 0; // cancela a recuperação do golpe
  w.stats.dodges++;
  emit(w, EV.DODGE, 0);
}
