// Testes headless (Node 22): node sim.test.js
// Cobrem a simulação (movimento, combate, alvo) e a matemática pura da animação (sem Babylon).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VANGUARD } from './data-vanguard.js';
import { ARENA_01 } from './data-arena-01.js';
import { createWorld, stepWorld } from './sim-world.js';
import { applyDamage, inArc } from './sim-combat.js';
import { setDummyMode } from './sim-dummy.js';
import { CH, NCH, ARM, atk, loco, solveArm, qFromTo } from './render-pose.js';
import { ANIM } from './data-anim.js';

let falhas = 0;
const ok = (nome, cond, info = '') => { console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}${info ? ' (' + info + ')' : ''}`); if (!cond) falhas++; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const novo = () => createWorld({ arenaData: ARENA_01, params: clone(VANGUARD) });
const vel = (w) => Math.hypot(w.player.vx, w.player.vz);
const rodar = (w, n, mx, mz) => { for (let i = 0; i < n; i++) stepWorld(w, { mx, mz }); };
const passo = (w, o) => stepWorld(w, { mx: 0, mz: 0, attack: false, ...o });
const perto = (w, d) => { const t = w.target, p = w.player; p.x = p.px = t.x - d; p.z = p.pz = t.z; p.yaw = p.pyaw = Math.PI / 2; };
const drena = (w, tipo, fn) => { for (let j = 0; j < w.nev; j++) if (w.events[j].type === tipo) fn(w.events[j]); w.nev = 0; };
const snap = (w) => JSON.stringify({ p: w.player, t: w.target, k: w.tick, f: w.phase });
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { maxSpeed, accelTicks, stopTicks } = VANGUARD;

console.log('--- movimento (M2) ---');
{ const w = novo(); rodar(w, accelTicks - 1, 0, 1); const antes = vel(w); rodar(w, 1, 0, 1);
  ok('aceleração: abaixo do máximo 1 tick antes', antes < maxSpeed, antes.toFixed(3) + ' m/s');
  ok(`aceleração: máximo em ${accelTicks} ticks (±2%)`, Math.abs(vel(w) - maxSpeed) / maxSpeed <= 0.02, vel(w).toFixed(3) + ' m/s'); }
{ const w = novo(); rodar(w, 30, 1, 1); ok('diagonal normalizada (não passa do máximo)', vel(w) <= maxSpeed + 1e-9, vel(w).toFixed(3) + ' m/s'); }
{ const w = novo(); rodar(w, 20, 0, 1); rodar(w, stopTicks, 0, 0); ok(`parada em ${stopTicks} ticks`, vel(w) < 1e-9, vel(w).toExponential(1) + ' m/s'); }
{ const w = novo(); rodar(w, 40, 0, 1); const p = w.player, t = w.target;
  ok('lock 1v1: yaw aponta para o alvo', Math.abs(p.yaw - Math.atan2(t.x - p.x, t.z - p.z)) < 1e-12); }

console.log('--- combate (M3) ---');
{ const w = novo(); perto(w, 1.6); const quando = [];
  for (let i = 0; i < 40; i++) { passo(w, { attack: i === 0 }); drena(w, 'hit', () => quando.push(i)); }
  const A = w.params.attacks[0];
  ok('A1: acerta uma vez, no primeiro tick ativo', quando.length === 1 && quando[0] === A.startup, 'ticks ' + quando);
  ok(`A1: dano ${A.damage}`, w.target.hp === 100 - A.damage, 'vida ' + w.target.hp);
  ok(`A1: volta ao repouso após ${A.startup + A.active + A.recovery} ticks`, w.player.st === 0); }
const encadeia = (press2) => { const w = novo(); perto(w, 1.6); const q = [];
  for (let i = 0; i < 70; i++) { passo(w, { attack: i === 0 || i === press2 }); drena(w, 'hit', (e) => q.push([i, e.c])); } return q; };
{ const q = encadeia(14); ok('encadeamento: A2 entra no tick 14 e acerta no 20 com dano 12', q.length === 2 && q[1][0] === 20 && q[1][1] === 12, JSON.stringify(q)); }
{ const q = encadeia(9); ok('buffer: botão no tick 9 ainda encadeia (entra no 14)', q.length === 2 && q[1][0] === 20, JSON.stringify(q)); }
{ const q = encadeia(8); ok('buffer: botão no tick 8 expira antes da janela (sem A2)', q.length === 1, JSON.stringify(q)); }
{ const q = encadeia(3); ok('botão cedo demais não encadeia', q.length === 1, JSON.stringify(q)); }
{ const w = novo(); perto(w, 1.2); let ko = 0;
  for (let i = 0; i < 600 && w.phase === 'fight'; i++) { passo(w, { attack: true }); drena(w, 'ko', () => ko++); }
  ok('5 combos (10 acertos, 100 de dano) derrubam o alvo', w.stats.hits === 10 && w.target.hp === 0 && w.phase === 'ended' && ko === 1, `acertos ${w.stats.hits}, vida ${w.target.hp}`); }
{ const w = novo(), limpo = snap(novo()); let todos = true;
  for (let r = 0; r < 50; r++) {
    perto(w, 1.2);
    while (w.phase === 'fight') passo(w, { attack: true });
    const antes = w.stats.resets;
    while (w.stats.resets === antes) passo(w, {});
    if (snap(w) !== limpo) todos = false;
    w.nev = 0;
  }
  ok('50 reinícios seguidos: cada um idêntico a um mundo novo', todos && w.stats.kos === 50 && w.stats.resets === 50, `KO ${w.stats.kos}, reinícios ${w.stats.resets}`); }
{ const w = novo(); applyDamage(w, 0, 30); const a = w.player.hp === 70; applyDamage(w, 0, 999);
  ok('dano no jogador: vida trava em 0 e encerra a rodada', a && w.player.hp === 0 && w.phase === 'ended' && w.stats.kos === 1); }
{ const f = (x, z, yaw = 0) => inArc(0, 0, yaw, x, z, 0.45, 2.2, 110);
  ok('alcance: logo dentro acerta, logo fora não', f(0, 2.64) && !f(0, 2.66));
  const g = (g) => f(Math.sin((g * Math.PI) / 180) * 1.5, Math.cos((g * Math.PI) / 180) * 1.5);
  ok('arco: 54° acerta, 56° não (metade do arco = 55°)', g(54) && !g(56) && g(-54) && !g(-56));
  ok('arco respeita o yaw do atacante', f(1.5, 0, Math.PI / 2) && !f(0, 1.5, Math.PI / 2)); }
{ const w = novo(); rodar(w, 12, 1, 0); let v6 = 0;
  for (let i = 0; i < 8; i++) { stepWorld(w, { mx: 1, mz: 0, attack: i === 0 }); if (i === 6) v6 = vel(w); }
  ok('movimento durante o golpe: máx. 30% no startup', v6 <= maxSpeed * 0.3 + 1e-9, v6.toFixed(3) + ' m/s'); }
{ const w = novo(); perto(w, 6); const x0 = w.player.x;
  for (let i = 0; i < 22; i++) passo(w, { attack: i === 0 });
  ok('avanço do A1: o corpo anda 0,55 m', Math.abs(w.player.x - x0 - 0.55) < 1e-9, (w.player.x - x0).toFixed(4) + ' m'); }
{ const w = novo(); setDummyMode(w, 'circular'); let maxR = 0, minR = 1e9, passoMed = 0, ant = [w.target.x, w.target.z];
  for (let i = 0; i < 600; i++) { passo(w, {}); const r = Math.hypot(w.target.x, w.target.z); maxR = Math.max(maxR, r); minR = Math.min(minR, r);
    passoMed += Math.hypot(w.target.x - ant[0], w.target.z - ant[1]); ant = [w.target.x, w.target.z]; }
  const v = (passoMed / 600) * 60;
  ok('alvo circular: raio constante e 2,5 m/s', maxR - minR < 1e-9 && Math.abs(v - 2.5) < 0.01, `raio ${maxR.toFixed(3)}, ${v.toFixed(3)} m/s`); }
{ // fuzz: 100 mil ticks com movimento e golpes aleatórios, forçando luta de perto a cada 400 ticks
  const rnd = mulberry32(4321), w = novo(), { arena } = w, tol = 1e-6, v = { nan: 0, fora: 0, vida: 0, dentro: 0, ev: 0, st: 0 };
  let mx = 0, mz = 0, hold = 0;
  for (let i = 0; i < 100000; i++) {
    if (i % 400 === 0) perto(w, 1 + rnd() * 2);
    if (--hold <= 0) { hold = 1 + Math.floor(rnd() * 40); mx = rnd() < 0.3 ? 0 : rnd() * 2 - 1; mz = rnd() < 0.3 ? 0 : rnd() * 2 - 1; }
    stepWorld(w, { mx, mz, attack: rnd() < 0.15 });
    const p = w.player, t = w.target;
    if (![p.x, p.z, p.vx, p.vz, p.yaw, t.x, t.z].every(Number.isFinite)) v.nan++;
    if (arena.normals.some((n) => p.x * n.x + p.z * n.z + p.r > arena.apothem + tol)) v.fora++;
    if (p.hp < 0 || p.hp > 100 || t.hp < 0 || t.hp > 100) v.vida++;
    if (Math.hypot(p.x - t.x, p.z - t.z) < p.r + t.r - tol) v.dentro++;
    if (w.nev > w.events.length) v.ev++;
    if (p.st !== 0 && p.st !== 1) v.st++;
    w.nev = 0;
  }
  const s = w.stats;
  ok('fuzz 100k ticks: sem NaN', v.nan === 0, v.nan + ' violações');
  ok('fuzz 100k ticks: sempre dentro da arena', v.fora === 0, v.fora + ' violações');
  ok('fuzz 100k ticks: vida sempre entre 0 e 100', v.vida === 0, v.vida + ' violações');
  ok('fuzz 100k ticks: nunca atravessa o alvo', v.dentro === 0, v.dentro + ' violações');
  ok('fuzz 100k ticks: fila de eventos limitada e sem perda', v.ev === 0 && s.drops === 0, `descartados ${s.drops}`);
  ok('fuzz 100k ticks: acertos nunca passam dos golpes', s.hits <= s.swings, `golpes ${s.swings}, acertos ${s.hits}, KO ${s.kos}`);
  ok('fuzz 100k ticks: o combate foi exercitado de verdade', s.hits > 500 && s.kos > 10, `acertos ${s.hits}, KO ${s.kos}`);
}
{ const a = novo(), b = novo(), r1 = mulberry32(7), r2 = mulberry32(7);
  const f = (w, r, i) => { if (i % 300 === 0) perto(w, 1.5); stepWorld(w, { mx: r() * 2 - 1, mz: r() * 2 - 1, attack: r() < 0.2 }); w.nev = 0; };
  for (let i = 0; i < 8000; i++) { f(a, r1, i); f(b, r2, i); }
  ok('determinismo com golpes: mesmas entradas, mesmo estado', snap(a) === snap(b) && JSON.stringify(a.stats) === JSON.stringify(b.stats)); }

console.log('--- animação (matemática pura) ---');
{ const idle = new Float64Array(NCH); loco(idle, 0, 0, 0, 0);
  ANIM.attacks.forEach((a, i) => { const out = new Float64Array(NCH), ks = a.keys, total = ks[ks.length - 1][0];
    atk(out, ANIM, ks, total + ANIM.lagBlade, null); const dif = Math.max(...out.map((x, c) => Math.abs(x - idle[c])));
    ok(`A${i + 1}: termina exatamente na pose de repouso (após o atraso da lâmina)`, dif < 1e-9, dif.toExponential(1)); }); }
ANIM.attacks.forEach((a, i) => { const A = VANGUARD.attacks[i], ts = a.keys.map((k) => k[0]);
  ok(`A${i + 1}: chaves alinhadas com a frame data (início, fim do ativo, total)`, ts[ts.length - 1] === A.startup + A.active + A.recovery && ts.includes(A.startup) && ts.includes(A.startup + A.active), 'chaves ' + ts); });
ANIM.attacks.forEach((a, i) => {
  const ks = a.keys, total = ks[ks.length - 1][0], o0 = new Float64Array(NCH), o1 = new Float64Array(NCH), o2 = new Float64Array(NCH);
  let vA = 0, vV = 0, aA = 0, aV = 0, bad = 0;
  atk(o0, ANIM, ks, 0, null); atk(o1, ANIM, ks, 0.25, null);
  for (let tf = 0.5; tf <= total + 2; tf += 0.25) {
    atk(o2, ANIM, ks, tf, null);
    for (let c = 0; c < NCH; c++) {
      if (!Number.isFinite(o2[c])) bad++;
      const d = Math.abs(o2[c] - o1[c]), dd = Math.abs(o2[c] - 2 * o1[c] + o0[c]);
      if (c < 7) { vA = Math.max(vA, d); aA = Math.max(aA, dd); } else { vV = Math.max(vV, d); aV = Math.max(aV, dd); }
    }
    o0.set(o1); o1.set(o2);
  }
  ok(`A${i + 1}: movimento contínuo, sem saltos (passos de 1/4 de tick)`, bad === 0 && vA <= 0.08 && vV <= 0.2, `ângulo ${vA.toFixed(3)} rad, vetor ${vV.toFixed(3)}`);
  ok(`A${i + 1}: sem paradas nem trancos (aceleração limitada)`, aA <= 0.03 && aV <= 0.08, `ângulo ${aA.toFixed(4)}, vetor ${aV.toFixed(4)}`);
});
{ const az = (o) => Math.atan2(o[CH.bx], o[CH.bz]) + o[CH.hipRY] + o[CH.torRY];
  ANIM.attacks.forEach((a, i) => { const A = VANGUARD.attacks[i], ks = a.keys, o = new Float64Array(NCH), dir = i === 0 ? 1 : -1;
    let cross = null, prev = null;
    for (let tf = 0; tf <= A.startup + A.active + 3; tf += 0.05) { atk(o, ANIM, ks, tf, null); const v = az(o) * dir; if (prev !== null && prev > 0 && v <= 0 && cross === null) cross = tf; prev = v; }
    atk(o, ANIM, ks, A.startup - 0.5, null); const ini = az(o) * dir;
    atk(o, ANIM, ks, A.startup + A.active + 1, null); const fim = az(o) * dir;
    const graus = ((ini - fim) * 180) / Math.PI;
    ok(`A${i + 1}: a lâmina cruza o centro do arco dentro da janela ativa`, cross !== null && cross >= A.startup && cross <= A.startup + A.active, 'cruza em ' + (cross && cross.toFixed(2)) + ' (ativo ' + A.startup + ' a ' + (A.startup + A.active) + ')');
    ok(`A${i + 1}: o retardo do impacto visual (hitDelay) bate com o cruzamento da lâmina`, cross !== null && Math.abs(cross - A.startup - ANIM.hitDelay[i]) <= 0.15, 'hitDelay ' + ANIM.hitDelay[i] + ', medido ' + (cross && (cross - A.startup).toFixed(2)));
    ok(`A${i + 1}: a varredura cobre o arco do acerto (${VANGUARD.arcDeg}°)`, graus >= VANGUARD.arcDeg, graus.toFixed(0) + '°'); }); }
{ const r = new Float64Array(12), rnd = mulberry32(99); let mal = 0;
  for (let i = 0; i < 2000; i++) {
    const sx = 0.36, sy = 0.6, sz = 0, d = 0.12 + rnd() * 0.47, th = rnd() * Math.PI * 2, ph = (rnd() - 0.5) * Math.PI;
    const hx = sx + d * Math.cos(ph) * Math.sin(th), hy = sy + d * Math.sin(ph), hz = sz + d * Math.cos(ph) * Math.cos(th);
    solveArm(r, sx, sy, sz, hx, hy, hz, 0.6, -1, -0.4);
    const l1 = Math.hypot(r[0] - sx, r[1] - sy, r[2] - sz), l2 = Math.hypot(r[9] - r[0], r[10] - r[1], r[11] - r[2]), err = Math.hypot(r[9] - hx, r[10] - hy, r[11] - hz);
    if (Math.abs(l1 - ARM) > 1e-6 || Math.abs(l2 - ARM) > 1e-6 || err > 1e-6) mal++;
  }
  ok('IK do braço: ossos mantêm 0,3 m e a mão chega ao alvo (2000 alvos)', mal === 0, mal + ' falhas');
  solveArm(r, 0.36, 0.6, 0, 3, 0.6, 0, 0.6, -1, -0.4);
  ok('IK do braço: alvo fora de alcance estica o braço sem quebrar', Number.isFinite(r[0] + r[9]) && Math.hypot(r[9] - 0.36, r[10] - 0.6, r[11]) <= 2 * ARM); }
{ const q = new Float64Array(4), rnd = mulberry32(5); let mal = 0;
  const rot = ([x, y, z, w], [vx, vy, vz]) => { const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx); return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; };
  for (let i = 0; i < 2000; i++) {
    let t = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]; const l = Math.hypot(...t); t = t.map((x) => x / l);
    for (const f of [[0, -1, 0], [0, 0, 1]]) { qFromTo(q, f[0], f[1], f[2], t[0], t[1], t[2]); const v = rot(q, f); if (Math.hypot(v[0] - t[0], v[1] - t[1], v[2] - t[2]) > 1e-9) mal++; }
  }
  ok('quaternion osso->direção gira o vetor exatamente (4000 casos)', mal === 0, mal + ' falhas'); }

console.log('--- camadas ---');
{ const proibido = /\b(BABYLON|document|window|navigator)\b|Math\.random|from\s+['"]\.\/(render|input|debug|app|ui)[-.]/;
  const raiz = fileURLToPath(new URL('.', import.meta.url));
  const sims = readdirSync(raiz).filter((f) => f.startsWith('sim-') && f.endsWith('.js'));
  const poses = ['render-pose.js', 'data-anim.js'];
  const ruins = sims.filter((f) => proibido.test(readFileSync(join(raiz, f), 'utf8')));
  const ruinsPose = poses.filter((f) => /\b(BABYLON|document|window)\b/.test(readFileSync(join(raiz, f), 'utf8')));
  ok('sim pura: sem Babylon, DOM, Math.random nem import de outras camadas', ruins.length === 0, ruins.join(', ') || sims.length + ' arquivos');
  ok('pose pura: sem Babylon nem DOM', ruinsPose.length === 0, ruinsPose.join(', ') || poses.length + ' arquivos'); }
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
