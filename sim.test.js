// Testes headless da simulação (Node 22): node sim.test.js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VANGUARD } from './data-vanguard.js';
import { ARENA_01 } from './data-arena-01.js';
import { createWorld, stepWorld } from './sim-world.js';

let falhas = 0;
const ok = (nome, cond, info = '') => { console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}${info ? ' (' + info + ')' : ''}`); if (!cond) falhas++; };
const novo = () => createWorld({ arenaData: ARENA_01, params: { ...VANGUARD } });
const vel = (w) => Math.hypot(w.player.vx, w.player.vz);
const rodar = (w, n, mx, mz) => { for (let i = 0; i < n; i++) stepWorld(w, { mx, mz }); };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { maxSpeed, accelTicks, stopTicks } = VANGUARD;

{ // aceleração: velocidade máxima em exatamente accelTicks
  const w = novo(); rodar(w, accelTicks - 1, 0, 1); const antes = vel(w); rodar(w, 1, 0, 1);
  ok(`aceleração: abaixo do máximo 1 tick antes`, antes < maxSpeed, antes.toFixed(3) + ' m/s');
  ok(`aceleração: máximo em ${accelTicks} ticks (±2%)`, Math.abs(vel(w) - maxSpeed) / maxSpeed <= 0.02, vel(w).toFixed(3) + ' m/s');
}
{ const w = novo(); rodar(w, 30, 1, 1); ok('diagonal normalizada (não passa do máximo)', vel(w) <= maxSpeed + 1e-9, vel(w).toFixed(3) + ' m/s'); }
{ const w = novo(); rodar(w, 20, 0, 1); rodar(w, stopTicks, 0, 0); ok(`parada em ${stopTicks} ticks`, vel(w) < 1e-9, vel(w).toExponential(1) + ' m/s'); }
{ // lock 1v1: o corpo encara o alvo
  const w = novo(); rodar(w, 40, 0, 1); const p = w.player, t = w.target;
  ok('lock 1v1: yaw aponta para o alvo', Math.abs(p.yaw - Math.atan2(t.x - p.x, t.z - p.z)) < 1e-12);
}
{ // fuzz: 100 mil ticks de entradas aleatórias com semente fixa
  const rnd = mulberry32(1234), w = novo(), { arena, player: p, target: t } = w, tol = 1e-6;
  let mx = 0, mz = 0, hold = 0, nan = 0, fora = 0, dentro = 0, rapido = 0;
  for (let i = 0; i < 100000; i++) {
    if (--hold <= 0) { hold = 1 + Math.floor(rnd() * 40); mx = rnd() < 0.3 ? 0 : rnd() * 2 - 1; mz = rnd() < 0.3 ? 0 : rnd() * 2 - 1; }
    stepWorld(w, { mx, mz });
    if (![p.x, p.z, p.vx, p.vz, p.yaw].every(Number.isFinite)) nan++;
    if (arena.normals.some((n) => p.x * n.x + p.z * n.z + p.r > arena.apothem + tol)) fora++;
    if (Math.hypot(p.x - t.x, p.z - t.z) < p.r + t.r - tol) dentro++;
    if (vel(w) > maxSpeed + 1e-9) rapido++;
  }
  ok('fuzz 100k ticks: sem NaN', nan === 0, nan + ' violações');
  ok('fuzz 100k ticks: sempre dentro da arena', fora === 0, fora + ' violações');
  ok('fuzz 100k ticks: nunca atravessa o alvo', dentro === 0, dentro + ' violações');
  ok('fuzz 100k ticks: velocidade nunca passa do máximo', rapido === 0, rapido + ' violações');
}
{ // determinismo
  const a = novo(), b = novo(), r1 = mulberry32(7), r2 = mulberry32(7);
  for (let i = 0; i < 5000; i++) { stepWorld(a, { mx: r1() * 2 - 1, mz: r1() * 2 - 1 }); stepWorld(b, { mx: r2() * 2 - 1, mz: r2() * 2 - 1 }); }
  ok('determinismo: mesmas entradas, mesmo estado', JSON.stringify(a.player) === JSON.stringify(b.player));
}
{ // camadas: a sim (arquivos sim-*.js) não importa render/DOM nem usa Math.random
  const proibido = /\b(BABYLON|document|window|navigator)\b|Math\.random|from\s+['"]\.\/(render|input|debug|app)[-.]/;
  const raiz = fileURLToPath(new URL('.', import.meta.url));
  const arquivos = readdirSync(raiz).filter((f) => f.startsWith('sim-') && f.endsWith('.js'));
  const ruins = arquivos.filter((f) => proibido.test(readFileSync(join(raiz, f), 'utf8')));
  ok('sim pura: sem Babylon, DOM, Math.random nem import de outras camadas', ruins.length === 0, ruins.join(', ') || arquivos.length + ' arquivos');
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
