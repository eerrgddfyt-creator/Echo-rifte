// Teste de fumaça do render e da entrada com Babylon e DOM SIMULADOS (Node 22): node render.test.js
// Acha erro de código (nome errado, exceção, NaN, geometria inválida). NÃO valida a aparência nem a API real do Babylon:
// isso só o aparelho mostra. Os objetos simulados são "selados": escrever numa propriedade que não existe dá erro.
import { VANGUARD } from './data-vanguard.js';
import { ARENA_01 } from './data-arena-01.js';
import { createWorld, stepWorld } from './sim-world.js';
import { setDummyMode } from './sim-dummy.js';
import { createRig } from './render-rig.js';
import { createInput } from './input.js';

let falhas = 0;
const ok = (nome, cond, info = '') => { console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}${info ? ' (' + info + ')' : ''}`); if (!cond) falhas++; };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- Babylon simulado (só o que o jogo usa) ----------
const nodes = [];
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; Object.seal(this); } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class C3 {
  constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; Object.seal(this); }
  static FromHexString(h) { const n = parseInt(h.slice(1), 16); return new C3((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
  static Black() { return new C3(); }
}
class Q4 { constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; Object.seal(this); } }
class Base { constructor(name) { this.name = name; this.parent = null; this.position = new V3(); this.rotation = new V3(); this.scaling = new V3(1, 1, 1); this.rotationQuaternion = null; nodes.push(this); } }
class TransformNode extends Base { constructor(n) { super(n); Object.seal(this); } }
class Mesh extends Base { constructor(n) { super(n); this.material = null; this.visibility = 1; this.isVisible = true; this.isPickable = true; this.geometry = null; Object.seal(this); } }
class StandardMaterial { constructor(n) { this.name = n; this.diffuseColor = new C3(); this.specularColor = new C3(); this.emissiveColor = new C3(); this.disableLighting = false; this.alpha = 1; this.backFaceCulling = true; Object.seal(this); } }
class VertexData {
  constructor() { this.positions = null; this.normals = null; this.uvs = null; this.indices = null; Object.seal(this); }
  applyToMesh(m) {
    const p = this.positions, n = this.normals, i = this.indices;
    const bom = Array.isArray(p) && p.length % 3 === 0 && p.every(Number.isFinite) && Array.isArray(n) && n.length === p.length && Array.isArray(i) && i.length % 3 === 0 && i.every((k) => Number.isInteger(k) && k >= 0 && k < p.length / 3);
    if (!bom) throw new Error('geometria inválida em ' + m.name);
    m.geometry = { vertices: p.length / 3, triangles: i.length / 3 };
  }
}
const make = (name) => new Mesh(name);
const BABYLON = {
  Vector3: V3, Color3: C3, Quaternion: Q4, TransformNode, Mesh, StandardMaterial, VertexData,
  MeshBuilder: { CreateBox: (n) => make(n), CreateDisc: (n) => make(n), CreateTorus: (n) => make(n), CreateCapsule: (n) => make(n) },
};
globalThis.window = { BABYLON };

// ---------- 1. Rig animado dirigido pela sim real ----------
const params = JSON.parse(JSON.stringify(VANGUARD));
const w = createWorld({ arenaData: ARENA_01, params });
const player = createRig({}, 'player', params), target = createRig({}, 'target', params);
const por = (n) => nodes.filter((x) => x.name === n);
const slashes = por('slash'), trail = por('trail')[0], wedges = por('wedge'), body = por('body')[0], ring = por('ring').find((m) => m.parent && m.parent.name === 'player');
ok('rig: geometrias dos arcos e dos setores válidas', slashes.length === 2 && wedges.length === 2 && slashes.every((m) => m.geometry.triangles === 24) && wedges.every((m) => m.geometry.triangles === 14), `meshes criadas: ${nodes.filter((n) => n instanceof Mesh).length}`);

const rnd = mulberry32(31337);
const cobre = { golpe: false, deslize: false, setor: false, setorCheio: false, queda: false, levantou: false, pulso: false, flashDano: false, jogadorCaiu: false };
let ruins = 0, excecao = null, mx = 0, mz = 0, hold = 0, depoisReset = 0;
const pend = { t: -1, dx: 0, dz: 1, ko: false };
const midMat = por('p').map((m) => m.material).find((m) => m && m.name === 'm#4A4F57' && !m.disableLighting && m.diffuseColor.r > 0.25);
const modos = ['parado', 'perseguidor', 'circular', 'perseguidor'];
const quadros = 12000, dt = 1 / 60;
const checa = () => {
  for (const n of nodes) {
    const v = [n.position.x, n.position.y, n.position.z, n.rotation.x, n.rotation.y, n.rotation.z, n.scaling.x, n.scaling.y, n.scaling.z];
    const q = n.rotationQuaternion;
    if (!v.every(Number.isFinite) || (q && !(Math.abs(Math.hypot(q.x, q.y, q.z, q.w) - 1) < 1e-4)) || (n.visibility !== undefined && !(n.visibility >= -1e-9 && n.visibility <= 1 + 1e-9))) ruins++;
  }
};
const quadro = (f, entrada) => {
  stepWorld(w, entrada);
  const p = w.player, t = w.target, alpha = [0, 0.25, 0.5, 0.75][f % 4];
  for (let i = 0; i < w.nev; i++) { // mesmo roteamento de eventos do app-boot.js
    const e = w.events[i];
    if (e.type === 'hit') {
      const dx = e.a === 1 ? t.x - p.x : p.x - t.x, dz = e.a === 1 ? t.z - p.z : p.z - t.z, d = Math.hypot(dx, dz) || 1;
      if (e.a === 1) { pend.t = 0.027; pend.dx = dx / d; pend.dz = dz / d; } else { player.hurt(dx / d, dz / d); cobre.flashDano = true; }
    } else if (e.type === 'perfect') { player.perfect(); cobre.pulso = true; }
    else if (e.type === 'ko') { if (e.a === 1) pend.ko = true; else { player.ko(); cobre.jogadorCaiu = true; } }
    else if (e.type === 'reset') { target.reset(); player.reset(); pend.t = -1; pend.ko = false; depoisReset = 20; }
  }
  w.nev = 0;
  if (pend.t >= 0 && (pend.t -= dt) < 0) { target.hit(pend.dx, pend.dz); if (pend.ko) target.ko(); }
  player.update(p.x, p.z, p.yaw, p, alpha, dt, params.maxSpeed);
  target.update(t.x, t.z, t.yaw, t, dt, alpha);
  checa();
  if (slashes.some((m) => m.isVisible && m.visibility > 0.3)) cobre.golpe = true;
  if (trail.isVisible && trail.visibility > 0.3) cobre.deslize = true;
  if (wedges.some((m) => m.isVisible && m.visibility > 0.2)) cobre.setor = true;
  if (wedges[1].isVisible && wedges[1].scaling.x > 0.95) cobre.setorCheio = true;
  if (Math.hypot(body.rotation.x, body.rotation.z) > 1.0) cobre.queda = true;
  if (depoisReset > 0 && --depoisReset === 0 && Math.hypot(body.rotation.x, body.rotation.z) < 0.1) cobre.levantou = true;
  if (ring.scaling.x > 1.5) cobre.pulso = true;
  if (midMat && midMat.emissiveColor.r > 0.3) cobre.flashDano = true;
};
try {
  setDummyMode(w, 'perseguidor');
  for (let f = 0; f < quadros; f++) { // fase 1: entradas aleatórias, trocando o modo do alvo e forçando contato
    if (f % 3000 === 0) setDummyMode(w, modos[(f / 3000) | 0]);
    if (f % 240 === 0) { const t = w.target, p = w.player, d = 1 + rnd() * 2; p.x = p.px = t.x - d; p.z = p.pz = t.z; }
    if (--hold <= 0) { hold = 1 + Math.floor(rnd() * 30); mx = rnd() < 0.3 ? 0 : rnd() * 2 - 1; mz = rnd() < 0.3 ? 0 : rnd() * 2 - 1; }
    quadro(f, { mx, mz, attack: rnd() < 0.1, dodge: rnd() < 0.06 });
  }
  setDummyMode(w, 'perseguidor'); // fase 2: jogador parado ao lado do bot até ser derrotado e a rodada reiniciar
  { const p = w.player, t = w.target; p.x = p.px = 0; p.z = p.pz = 0; t.x = t.px = 2; t.z = t.pz = 0; t.bcd = 0; }
  for (let f = 0; f < 1800 && !(cobre.jogadorCaiu && depoisReset === 0 && w.stats.resets > 0 && f > 1500); f++) quadro(f, { mx: 0, mz: 0 });
} catch (e) { excecao = e; }
ok(`rig: ${quadros} quadros dirigidos pela sim real, sem exceção`, excecao === null, excecao ? excecao.stack.split('\n').slice(0, 3).join(' | ') : 'ok');
ok('rig: nenhuma posição, rotação, escala, quaternion ou transparência inválida', ruins === 0, ruins + ' violações');
ok('rig: arco do golpe apareceu', cobre.golpe);
ok('rig: faixa do deslize apareceu', cobre.deslize);
ok('rig: setor de telégrafo apareceu e encheu até o fim', cobre.setor && cobre.setorCheio);
ok('rig: alvo caiu ao morrer e levantou no reinício', cobre.queda && cobre.levantou);
ok('rig: jogador derrotado, pulso da esquiva perfeita e flash de dano aconteceram', cobre.jogadorCaiu && cobre.pulso && cobre.flashDano, JSON.stringify(cobre));

// ---------- 2. Entrada com DOM simulado ----------
const handlers = {};
globalThis.addEventListener = (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); };
globalThis.innerWidth = 800; globalThis.innerHeight = 360;
const mkEl = () => {
  const el = { className: '', hidden: false, style: {}, children: [], on: {}, classes: new Set(), innerHTML: '', append: (...c) => el.children.push(...c), addEventListener: (t, f) => { el.on[t] = f; }, setAttribute() {}, closest: () => null };
  el.classList = { add: (c) => el.classes.add(c), remove: (c) => el.classes.delete(c), toggle: (c, f) => (f ? el.classes.add(c) : el.classes.delete(c)) };
  return el;
};
globalThis.document = { createElement: () => mkEl() };
const fire = (type, ev) => (handlers[type] || []).forEach((f) => f({ preventDefault() {}, ...ev }));
const host = mkEl(), inp = createInput(host);
let r = inp.read();
ok('entrada: parado não gera nada', r.mx === 0 && r.mz === 0 && !r.attack && !r.dodge);
fire('keydown', { key: 'j' }); const j1 = inp.read().attack, j2 = inp.read().attack;
ok('entrada: J = golpe por 1 leitura só', j1 && !j2);
fire('keydown', { key: ' ' }); ok('entrada: Espaço = golpe', inp.read().attack);
fire('keydown', { key: 'k' }); r = inp.read(); ok('entrada: K = esquiva por 1 leitura só', r.dodge && !r.attack && !inp.read().dodge);
fire('keydown', { key: 'Shift' }); ok('entrada: Shift = esquiva', inp.read().dodge);
fire('keydown', { key: 'j', repeat: true }); ok('entrada: tecla segurada não repete o golpe', !inp.read().attack);
fire('keydown', { key: 'd' }); fire('keydown', { key: 'w' }); r = inp.read();
ok('entrada: D e W = direita e fundo da tela', r.mx === 1 && r.mz === 1);
fire('keyup', { key: 'd' }); fire('keyup', { key: 'w' }); r = inp.read(); ok('entrada: soltar as teclas zera o movimento', r.mx === 0 && r.mz === 0);
fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 300, target: { closest: () => null } });
fire('pointermove', { pointerId: 1, clientX: 160, clientY: 240 }); r = inp.read();
ok('entrada: joystick à esquerda (arrastar para cima e direita, vetor limitado a 1)', Math.abs(r.mx - Math.SQRT1_2) < 1e-9 && Math.abs(r.mz - Math.SQRT1_2) < 1e-9, r.mx.toFixed(3) + ', ' + r.mz.toFixed(3));
fire('pointerup', { pointerId: 1 }); r = inp.read(); ok('entrada: soltar o joystick zera o movimento', r.mx === 0 && r.mz === 0);
fire('pointerdown', { pointerId: 2, clientX: 700, clientY: 300, target: { closest: () => null } }); fire('pointermove', { pointerId: 2, clientX: 740, clientY: 260 });
ok('entrada: toque na metade direita não vira joystick', inp.read().mx === 0);
fire('pointerup', { pointerId: 2 });
host.children[3].on.pointerdown({ preventDefault() {} }); r = inp.read();
ok('entrada: botão de esquiva (toque)', r.dodge && !r.attack);
host.children[2].on.pointerdown({ preventDefault() {} }); r = inp.read();
ok('entrada: botão de golpe (toque)', r.attack && !r.dodge);
ok('entrada: botões com as classes certas (o HUD procura .btn.dodge)', host.children[3].className === 'btn dodge' && host.children[2].className === 'btn');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodos os testes de fumaça passaram');
setTimeout(() => process.exit(falhas ? 1 : 0), 150);
