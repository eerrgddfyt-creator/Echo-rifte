import { EV, emit, inArc, applyDamage } from './sim-combat.js';

/** Campos de cada quadro gravado: x z yaw st step t dt ddx ddz dox doz vx vz (estado do jogador no fim do tick). */
export const F = 13;

/**
 * ECHO: o jogo grava o estado do jogador num anel de `size` ticks. Ao ativar, congela os últimos ticks (clip) e uma cópia os
 * reproduz: primeiro aparece sem agir e sem poder ser atingida (telégrafo), depois repete o clip quadro a quadro.
 * Replay de ESTADO (não de input): a cópia faz exatamente o que o jogador fez, e os golpes dela são testados contra o mundo de agora.
 * phase: 0 sem cópia, 1 telégrafo, 2 reprodução (atingível).
 */
export function createEcho(size) {
  return {
    rec: new Float64Array(size * F), clip: new Float64Array(size * F), head: 0, count: 0,
    phase: 0, t: 0, len: 0, hp: 0, cd: 0, buf: 0, ghit: false, ox: 0, oz: 0,
    g: { x: 0, z: 0, px: 0, pz: 0, yaw: 0, pyaw: 0, vx: 0, vz: 0, st: 0, step: 0, t: 0, dt: -1, ddx: 0, ddz: 0, dox: 0, doz: 0, r: 0 },
  };
}

export function resetEcho(e, radius) {
  e.head = 0; e.count = 0; e.phase = 0; e.t = 0; e.len = 0; e.hp = 0; e.cd = 0; e.buf = 0; e.ghit = false; e.ox = 0; e.oz = 0;
  const g = e.g;
  g.x = g.z = g.px = g.pz = g.yaw = g.pyaw = g.vx = g.vz = g.st = g.step = g.t = g.ddx = g.ddz = g.dox = g.doz = 0;
  g.dt = -1; g.r = radius;
}

/** Grava o estado do jogador (chamado no fim de cada tick da luta). */
export function recordFrame(w) {
  const e = w.echo, p = w.player, o = e.head * F, r = e.rec;
  r[o] = p.x; r[o + 1] = p.z; r[o + 2] = p.yaw; r[o + 3] = p.st; r[o + 4] = p.step; r[o + 5] = p.t; r[o + 6] = p.dt;
  r[o + 7] = p.ddx; r[o + 8] = p.ddz; r[o + 9] = p.dox; r[o + 10] = p.doz; r[o + 11] = p.vx; r[o + 12] = p.vz;
  e.head = (e.head + 1) % w.params.echo.ticks;
  if (e.count < w.params.echo.ticks) e.count++;
}

function loadGhost(w, i, still) {
  const e = w.echo, g = e.g, c = e.clip, o = i * F;
  g.px = g.x; g.pz = g.z; g.pyaw = g.yaw;
  g.x = c[o] + e.ox; g.z = c[o + 1] + e.oz; g.yaw = c[o + 2];
  if (still) { g.vx = 0; g.vz = 0; g.st = 0; g.step = 0; g.t = 0; g.dt = -1; g.ddx = 0; g.ddz = 0; g.dox = g.x; g.doz = g.z; }
  else {
    g.vx = c[o + 11]; g.vz = c[o + 12]; g.st = c[o + 3]; g.step = c[o + 4]; g.t = c[o + 5]; g.dt = c[o + 6];
    g.ddx = c[o + 7]; g.ddz = c[o + 8]; g.dox = c[o + 9] + e.ox; g.doz = c[o + 10] + e.oz;
  }
  if (e.ox !== 0 || e.oz !== 0) w.arena.contain(g, g.r); // a ancoragem B pode empurrar a cópia para fora da arena
}

function activate(w) {
  const e = w.echo, p = w.player, k = w.params.echo, size = k.ticks, n = e.count, c = e.clip, r = e.rec;
  for (let i = 0; i < n; i++) { // desenrola o anel em ordem cronológica
    const s = ((e.head - n + i + size) % size) * F, d = i * F;
    for (let f = 0; f < F; f++) c[d + f] = r[s + f];
  }
  e.len = n; e.ox = 0; e.oz = 0;
  if (k.anchor === 'B') { e.ox = p.x - c[0]; e.oz = p.z - c[1]; }
  e.phase = 1; e.t = 0; e.hp = k.integrity; e.cd = k.cooldown; e.buf = 0; e.ghit = false; e.g.r = p.r;
  let swings = 0, path = 0; // relevância da gravação (para o relatório): teve golpe ou deslocamento?
  for (let i = 0; i < n; i++) {
    const o = i * F;
    if (c[o + 3] === 1 && c[o + 5] === 0) swings++;
    if (i) path += Math.hypot(c[o] - c[o - F], c[o + 1] - c[o - F + 1]);
  }
  w.stats.echos++;
  if (swings >= 1 || path >= k.relevantPath) w.stats.echoRelevant++;
  loadGhost(w, 0, true);
  e.g.px = e.g.x; e.g.pz = e.g.z; e.g.pyaw = e.g.yaw;
  emit(w, EV.ECHO, 0, n);
}

function endEcho(w, why) { // why: 1 destruída pelo bot, 2 reprodução terminou
  const e = w.echo;
  e.phase = 0; e.t = 0;
  if (why === 1) w.stats.echoDestroyed++; else w.stats.echoExpired++;
  emit(w, EV.ECHOEND, why);
}

/** O bot acertou a cópia: perde 1 de integridade; com 0 ela é destruída. */
export function echoHurt(w) {
  const e = w.echo;
  e.hp--;
  emit(w, EV.ECHOHURT, e.hp);
  if (e.hp <= 0) endEcho(w, 1);
}

/** Golpe da cópia: mesma regra do jogador (ticks ativos, uma vez por golpe), com dano reduzido. */
function ghostHit(w) {
  const e = w.echo, g = e.g, k = w.params;
  if (g.st === 1 && g.t === 0) e.ghit = false; // começou um golpe novo na gravação
  if (g.st !== 1 || e.ghit) return;
  const A = k.attacks[g.step];
  if (g.t < A.startup || g.t >= A.startup + A.active) return;
  const t = w.target;
  if (!inArc(g.x, g.z, g.yaw, t.x, t.z, t.r, k.reach, k.arcDeg)) return;
  e.ghit = true; w.stats.echoHits++;
  applyDamage(w, 1, A.damage * k.echo.damageMul, g.step, 1);
}

/**
 * Um tick do ECHO: recarga, botão guardado (buffer), ativação (este tick é o 0 do telégrafo) e reprodução.
 * O telégrafo dura k.telegraph ticks; o primeiro tick atingível e com golpe possível é o seguinte.
 */
export function stepEcho(w, input) {
  const e = w.echo, k = w.params.echo;
  if (e.cd > 0) e.cd--;
  if (e.buf > 0) e.buf--;
  if (w.phase !== 'fight') return;
  if (input.echo) e.buf = w.params.buffer;
  if (e.phase === 0 && e.buf > 0 && e.cd === 0 && e.count >= k.minClip) { activate(w); return; }
  if (e.phase === 1) {
    if (++e.t >= k.telegraph) { e.phase = 2; e.t = 0; } else loadGhost(w, 0, true);
  }
  if (e.phase === 2) {
    if (e.t >= e.len) endEcho(w, 2);
    else { loadGhost(w, e.t, false); ghostHit(w); e.t++; }
  }
}
