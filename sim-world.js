import { createArena } from './sim-arena.js';
import { EV, emit, stepCombat, resolveHit, moveMul, lungeStep } from './sim-combat.js';
import { stepDodge } from './sim-dodge.js';
import { stepDummy } from './sim-dummy.js';
import { resolveBotHit } from './sim-bot.js';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
const EVENT_CAP = 24;

/** @typedef {{mx:number, mz:number, attack?:boolean, dodge?:boolean}} InputFrame mx: +direita, mz: +fundo da tela; attack/dodge: borda do botão */

function initState(w) {
  const s = w.arenaData.spawn, k = w.params;
  const yaw = Math.atan2(s.target.x - s.player.x, s.target.z - s.player.z), tyaw = Math.atan2(s.player.x - s.target.x, s.player.z - s.target.z);
  w.tick = 0; w.phase = 'fight'; w.endTick = 0; w.nev = 0;
  w.player = {
    x: s.player.x, z: s.player.z, px: s.player.x, pz: s.player.z, vx: 0, vz: 0, yaw, pyaw: yaw, r: k.radius, hp: k.hp,
    st: 0, step: 0, t: 0, hit: false, buf: 0, // golpe
    dt: -1, dcd: 0, dbuf: 0, invul: false, dmx: 0, dmz: 0, ddx: 0, ddz: 0, dox: s.player.x, doz: s.player.z, // esquiva
  };
  w.target = {
    x: s.target.x, z: s.target.z, px: s.target.x, pz: s.target.z, r: k.radius, hp: k.hp, ang: 0, rad: Math.hypot(s.target.x, s.target.z),
    yaw: tyaw, pyaw: tyaw, bst: 0, bt: 0, bcd: k.bot.grace, bhit: false, // bot
  };
}

/**
 * Mundo do duelo (Fase 1: 1 jogador + alvo de treino). `params` é lido a cada tick e pode mudar ao vivo.
 * Eventos (EV) vão para o pool `events`; quem desenha esvazia a fila (nev = 0) a cada quadro.
 */
export function createWorld({ arenaData, params }) {
  const w = {
    arenaData, arena: createArena(arenaData), params, dummyMode: 'parado',
    events: Array.from({ length: EVENT_CAP }, () => ({ type: '', a: 0, b: 0, c: 0 })),
    stats: { swings: 0, hits: 0, kos: 0, resets: 0, drops: 0, dodges: 0, perfect: 0, taken: 0 },
  };
  initState(w);
  return w;
}

/** Volta ao estado inicial (o modo do alvo é mantido). */
export function resetWorld(w) {
  initState(w);
  w.stats.resets++;
  emit(w, EV.RESET);
}

/** Avança 1 tick (1/60 s). Sem alocação: roda a 60 Hz no celular. */
export function stepWorld(w, input) {
  const p = w.player, k = w.params, t = w.target, dk = k.dodge;
  p.px = p.x; p.pz = p.z; p.pyaw = p.yaw;
  stepDummy(w, DT);
  stepDodge(w, input);
  stepCombat(w, input);

  let mx = input.mx, mz = input.mz;
  const m = Math.hypot(mx, mz);
  if (m > 1) { mx /= m; mz /= m; }

  // aceleração linear: máximo em accelTicks, parada em stopTicks. No golpe e na esquiva a velocidade-alvo cai e o freio é o de parada
  const dodging = p.dt >= 0;
  const mul = dodging ? (p.dt < dk.startup + dk.iframes ? 0 : dk.recoveryMul) : moveMul(p, k);
  const vmax = k.maxSpeed * mul, wx = mx * vmax, wz = mz * vmax;
  const slowing = (p.st === 1 || dodging) && Math.hypot(wx, wz) < Math.hypot(p.vx, p.vz);
  const rate = k.maxSpeed / (m > 0.01 && !slowing ? k.accelTicks : k.stopTicks);
  let dx = wx - p.vx, dz = wz - p.vz;
  const dl = Math.hypot(dx, dz);
  if (dl > rate) { dx *= rate / dl; dz *= rate / dl; }
  p.vx += dx; p.vz += dz;
  p.x += p.vx * DT + p.dmx; p.z += p.vz * DT + p.dmz; // dmx/dmz: deslize da esquiva neste tick

  const lg = lungeStep(p, k);
  if (lg) { p.x += Math.sin(p.yaw) * lg; p.z += Math.cos(p.yaw) * lg; }
  w.arena.contain(p, p.r);

  // o alvo é sólido: separa os dois corpos
  const sx = p.x - t.x, sz = p.z - t.z, sd = Math.hypot(sx, sz), min = p.r + t.r;
  if (sd < min && sd > 1e-9) {
    p.x = t.x + (sx / sd) * min; p.z = t.z + (sz / sd) * min;
    w.arena.contain(p, p.r);
  }

  p.yaw = Math.atan2(t.x - p.x, t.z - p.z); // lock 1v1: sempre encara o alvo
  resolveHit(w);
  resolveBotHit(w);

  if (w.phase === 'ended' && w.tick - w.endTick >= k.resetDelay) { resetWorld(w); return; }
  w.tick++;
}
