import { createArena } from './sim-arena.js';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** @typedef {{mx:number, mz:number}} InputFrame mx: +direita, mz: +fundo da tela (câmera fixa de duelo) */

/**
 * Mundo do duelo (Fase 1: 1 jogador + alvo de treino parado).
 * `params` é lido a cada tick, então pode mudar ao vivo (painel de ajustes).
 */
export function createWorld({ arenaData, params }) {
  const s = arenaData.spawn;
  const yaw = Math.atan2(s.target.x - s.player.x, s.target.z - s.player.z);
  return {
    tick: 0,
    arena: createArena(arenaData),
    params,
    player: { x: s.player.x, z: s.player.z, px: s.player.x, pz: s.player.z, vx: 0, vz: 0, yaw, pyaw: yaw, r: params.radius },
    target: { x: s.target.x, z: s.target.z, r: params.radius },
  };
}

/** Avança 1 tick (1/60 s). Sem alocação: roda a 60 Hz no celular. */
export function stepWorld(w, input) {
  const p = w.player, k = w.params, t = w.target;
  p.px = p.x; p.pz = p.z; p.pyaw = p.yaw;

  let mx = input.mx, mz = input.mz;
  const m = Math.hypot(mx, mz);
  if (m > 1) { mx /= m; mz /= m; }

  // aceleração linear: máximo em accelTicks, parada em stopTicks
  const rate = k.maxSpeed / (m > 0.01 ? k.accelTicks : k.stopTicks);
  let dx = mx * k.maxSpeed - p.vx, dz = mz * k.maxSpeed - p.vz;
  const dl = Math.hypot(dx, dz);
  if (dl > rate) { dx *= rate / dl; dz *= rate / dl; }
  p.vx += dx; p.vz += dz;

  p.x += p.vx * DT; p.z += p.vz * DT;
  w.arena.contain(p, p.r);

  // o alvo é sólido: separa os dois corpos
  const sx = p.x - t.x, sz = p.z - t.z, sd = Math.hypot(sx, sz), min = p.r + t.r;
  if (sd < min && sd > 1e-9) {
    p.x = t.x + (sx / sd) * min; p.z = t.z + (sz / sd) * min;
    w.arena.contain(p, p.r);
  }

  p.yaw = Math.atan2(t.x - p.x, t.z - p.z); // lock 1v1: sempre encara o alvo
  w.tick++;
}
