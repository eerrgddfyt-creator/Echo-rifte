/** Combate puro: estados do golpe, hitbox em arco, dano e eventos. Sem render, sem DOM. */
export const EV = { SWING: 'swing', HIT: 'hit', KO: 'ko', RESET: 'reset' };
const TAU = Math.PI * 2;

/** Escreve um evento no pool reutilizado (sem alocação). Se encher, descarta e conta. */
export function emit(w, type, a = 0, b = 0, c = 0) {
  if (w.nev >= w.events.length) { w.stats.drops++; return; }
  const e = w.events[w.nev++];
  e.type = type; e.a = a; e.b = b; e.c = c;
}

/** true se o círculo (tx, tz, tr) está no arco do atacante (ax, az, yaw). */
export function inArc(ax, az, yaw, tx, tz, tr, reach, arcDeg) {
  const dx = tx - ax, dz = tz - az;
  if (Math.hypot(dx, dz) - tr > reach) return false;
  const diff = Math.abs((((Math.atan2(dx, dz) - yaw + Math.PI) % TAU) + TAU) % TAU - Math.PI);
  return diff <= (arcDeg * Math.PI) / 360;
}

/** Aplica dano. who: 0 = jogador, 1 = alvo. A vida trava em 0 e o zero encerra a rodada. */
export function applyDamage(w, who, amount, step = 0) {
  const e = who ? w.target : w.player;
  if (w.phase !== 'fight' || e.hp <= 0) return;
  e.hp = Math.max(0, e.hp - amount);
  emit(w, EV.HIT, who, step, amount);
  if (e.hp === 0) { w.phase = 'ended'; w.endTick = w.tick; w.stats.kos++; emit(w, EV.KO, who); }
}

function start(w, p, step) {
  p.st = 1; p.step = step; p.t = 0; p.hit = false; p.buf = 0;
  w.stats.swings++;
  emit(w, EV.SWING, step);
}

/** Buffer do botão, início do golpe, encadeamento A1 -> A2 e fim da recuperação. */
export function stepCombat(w, input) {
  const p = w.player, k = w.params;
  if (p.buf > 0) p.buf--;
  if (input.attack && w.phase === 'fight') p.buf = k.buffer;
  if (p.st === 1) {
    p.t++;
    const A = k.attacks[p.step], total = A.startup + A.active + A.recovery;
    if (p.step === 0 && p.buf > 0 && p.t >= total - k.chainWindow) start(w, p, 1);
    else if (p.t >= total) p.st = 0;
  }
  if (p.st === 0 && p.buf > 0 && w.phase === 'fight') start(w, p, 0);
}

/** Acerto: só nos ticks ativos, no máximo uma vez por golpe. */
export function resolveHit(w) {
  const p = w.player, k = w.params;
  if (p.st !== 1 || p.hit || w.phase !== 'fight') return;
  const A = k.attacks[p.step];
  if (p.t < A.startup || p.t >= A.startup + A.active) return;
  const t = w.target;
  if (!inArc(p.x, p.z, p.yaw, t.x, t.z, t.r, k.reach, k.arcDeg)) return;
  p.hit = true; w.stats.hits++;
  applyDamage(w, 1, A.damage, p.step);
}

/** Fração da velocidade permitida no tick atual. */
export function moveMul(p, k) {
  if (p.st !== 1) return 1;
  const A = k.attacks[p.step];
  return p.t < A.startup ? k.moveMul.startup : p.t < A.startup + A.active ? k.moveMul.active : k.moveMul.recovery;
}

/** Avanço (m) deste tick: o corpo entra no golpe nos 2 ticks antes do ativo e durante o ativo. */
export function lungeStep(p, k) {
  if (p.st !== 1) return 0;
  const A = k.attacks[p.step];
  return p.t >= A.startup - 2 && p.t < A.startup + A.active ? A.lunge / (A.active + 2) : 0;
}
