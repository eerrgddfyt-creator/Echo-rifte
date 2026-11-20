import { stepBot, BOT } from './sim-bot.js';

/** Alvo de treino: "parado", "circular" (órbita em torno do centro) ou "perseguidor" (bot que ataca). */
export function setDummyMode(w, mode) {
  w.dummyMode = mode;
  const t = w.target;
  t.bst = BOT.CHASE; t.bt = 0; t.bcd = w.params.bot.grace; t.bhit = false; t.bhitG = false; t.tgt = 0;
  if (mode === 'circular') { t.ang = Math.atan2(t.z, t.x); t.rad = Math.min(8, Math.max(3, Math.hypot(t.x, t.z))); }
}

export function stepDummy(w, dt) {
  const t = w.target, p = w.player;
  t.px = t.x; t.pz = t.z; t.pyaw = t.yaw;
  if (w.phase !== 'fight') return;
  if (w.dummyMode === 'perseguidor') { stepBot(w, dt); return; }
  t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
  if (w.dummyMode !== 'circular') return;
  t.ang += (w.params.dummy.orbitSpeed * dt) / t.rad;
  t.x = Math.cos(t.ang) * t.rad; t.z = Math.sin(t.ang) * t.rad;
}
