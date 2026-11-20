import { EV, emit, inArc, applyDamage } from './sim-combat.js';
import { echoHurt } from './sim-echo.js';

/** Estados do bot "perseguidor". Sem sorteio: o ritmo vem só de contadores (determinístico). */
export const BOT = { CHASE: 0, TELE: 1, STRIKE: 2 };

/**
 * Persegue o alvo mais perto entre o jogador e a cópia do ECHO (com histerese k.retarget); ao chegar perto, telegrafa
 * (k.telegraph ticks), golpeia (k.active), recupera e espera (k.pause). Só troca de alvo enquanto persegue.
 * Nos últimos k.commit ticks do telégrafo a direção do golpe trava: sair do arco ou esquivar funciona.
 */
export function stepBot(w, dt) {
  const t = w.target, p = w.player, k = w.params.bot, e = w.echo;
  if (t.tgt === 1 && e.phase !== 2) t.tgt = 0;
  if (t.bst === BOT.CHASE && e.phase === 2) {
    const dp = Math.hypot(p.x - t.x, p.z - t.z), dg = Math.hypot(e.g.x - t.x, e.g.z - t.z);
    if (t.tgt === 0 && dg + k.retarget < dp) t.tgt = 1;
    else if (t.tgt === 1 && dp + k.retarget < dg) t.tgt = 0;
  }
  const gx = t.tgt ? e.g.x : p.x, gz = t.tgt ? e.g.z : p.z;
  const dx = gx - t.x, dz = gz - t.z, d = Math.hypot(dx, dz), face = Math.atan2(dx, dz);
  if (t.bst === BOT.CHASE) {
    t.yaw = face;
    if (t.bcd > 0) t.bcd--;
    if (d > k.engage) { const s = (k.speed * dt) / d; t.x += dx * s; t.z += dz * s; w.arena.contain(t, t.r); }
    else if (t.bcd === 0) { t.bst = BOT.TELE; t.bt = 0; emit(w, EV.TELE, 1, k.telegraph); }
  } else if (t.bst === BOT.TELE) {
    if (++t.bt >= k.telegraph) { t.bst = BOT.STRIKE; t.bt = 0; t.bhit = false; t.bhitG = false; } // este tick já é o 1º ativo
    else if (t.bt < k.telegraph - k.commit) t.yaw = face;
  } else if (++t.bt >= k.active + k.recovery) { t.bst = BOT.CHASE; t.bt = 0; t.bcd = k.pause; }
}

/**
 * Acerto do bot: nos ticks ativos, uma vez por golpe em cada alvo. O golpe pega quem estiver no arco:
 * o jogador (esquiva consome o golpe) e/ou a cópia do ECHO (se já atingível).
 */
export function resolveBotHit(w) {
  const t = w.target, p = w.player, k = w.params.bot, e = w.echo;
  if (t.bst !== BOT.STRIKE || t.bt >= k.active || w.phase !== 'fight') return;
  if (!t.bhit && inArc(t.x, t.z, t.yaw, p.x, p.z, p.r, k.reach, k.arcDeg)) {
    t.bhit = true;
    applyDamage(w, 0, k.damage, 2);
  }
  if (!t.bhitG && w.phase === 'fight' && e.phase === 2 && inArc(t.x, t.z, t.yaw, e.g.x, e.g.z, p.r, k.reach, k.arcDeg)) {
    t.bhitG = true;
    echoHurt(w);
  }
}
