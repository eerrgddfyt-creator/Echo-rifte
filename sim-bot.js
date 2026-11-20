import { EV, emit, inArc, applyDamage } from './sim-combat.js';

/** Estados do bot "perseguidor". Sem sorteio: o ritmo vem só de contadores (determinístico). */
export const BOT = { CHASE: 0, TELE: 1, STRIKE: 2 };

/**
 * Persegue o jogador; ao chegar perto, telegrafa (k.telegraph ticks), golpeia (k.active), recupera e espera (k.pause).
 * Nos últimos k.commit ticks do telégrafo a direção do golpe trava: sair do arco ou esquivar funciona.
 */
export function stepBot(w, dt) {
  const t = w.target, p = w.player, k = w.params.bot;
  const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), face = Math.atan2(dx, dz);
  if (t.bst === BOT.CHASE) {
    t.yaw = face;
    if (t.bcd > 0) t.bcd--;
    if (d > k.engage) { const s = (k.speed * dt) / d; t.x += dx * s; t.z += dz * s; w.arena.contain(t, t.r); }
    else if (t.bcd === 0) { t.bst = BOT.TELE; t.bt = 0; emit(w, EV.TELE, 1, k.telegraph); }
  } else if (t.bst === BOT.TELE) {
    if (++t.bt >= k.telegraph) { t.bst = BOT.STRIKE; t.bt = 0; t.bhit = false; } // este tick já é o 1º ativo
    else if (t.bt < k.telegraph - k.commit) t.yaw = face;
  } else if (++t.bt >= k.active + k.recovery) { t.bst = BOT.CHASE; t.bt = 0; t.bcd = k.pause; }
}

/** Acerto do bot: nos ticks ativos, uma vez por golpe. Esquiva (invulnerável) consome o golpe. */
export function resolveBotHit(w) {
  const t = w.target, p = w.player, k = w.params.bot;
  if (t.bst !== BOT.STRIKE || t.bhit || t.bt >= k.active || w.phase !== 'fight') return;
  if (!inArc(t.x, t.z, t.yaw, p.x, p.z, p.r, k.reach, k.arcDeg)) return;
  t.bhit = true;
  applyDamage(w, 0, k.damage, 2);
}
