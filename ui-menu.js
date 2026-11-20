/**
 * ECHO//RIFT: menu inicial (ui-menu.js + ui-menu.css + sons ui-snd-tap/click/ok.mp3).
 * Ligação com o jogo: index.html abre o menu primeiro e só carrega app-boot.js quando o jogador toca em PLAY
 * (app-boot.js não foi alterado). index.html?jogo pula o menu. Se o menu falhar ao carregar, o jogo abre direto.
 * O menu tem o próprio Babylon (cena leve com o VANGUARD real, via data-vanguard.js e render-rig.js) e o descarta ao iniciar.
 * Só PLAY está ativo: TRAINING, CUSTOMIZATION, LOJA e SETTINGS aparecem como "Em breve".
 * Preferências em localStorage 'echorift.settings.v1' ({mute, volUI}). Licença dos 3 sons: A CONFIRMAR.
 */
const MARKUP = `<canvas id="mc"></canvas>
<div class="mn-vig"></div>
<div class="mn-lg"><h1 class="mn-logo" aria-label="ECHO//RIFT"><span>ECHO</span><i></i><i></i><span>RIFT</span></h1></div>
<p class="mn-prompt">Toque para continuar</p>
<div class="mn-hero" id="hero" aria-live="polite"><h2 id="ht"></h2><p id="hd"></p></div>
<nav class="mn-strip" aria-label="Menu principal">
  <button class="mn-card pri" style="--ac:var(--echo)" data-go="duelo" data-snd="ok" data-i="play"><span class="lb">PLAY</span></button>
  <button class="mn-card" aria-disabled="true" data-i="train"><span class="lb">TRAINING</span><small>Em breve</small></button>
  <button class="mn-card" aria-disabled="true" data-i="custom"><span class="lb">CUSTOMIZATION</span><small>Em breve</small></button>
  <button class="mn-card" aria-disabled="true" data-i="shop"><span class="lb">LOJA</span><small>Em breve</small></button>
  <button class="mn-card" aria-disabled="true" data-i="set"><span class="lb">SETTINGS</span><small>Em breve</small></button>
</nav>
<div class="mn-char"><b>VANGUARD</b><span>Lâmina de um gume</span><span class="hint">Arraste ou use as setas</span></div>
<button class="mn-btn ic" id="mute"></button>
<div class="mn-dev" data-dev>
  <button class="mn-btn sm" id="dso"><span class="lb">Design System</span></button>
  <button class="mn-btn sm" id="rep"><span class="lb">Relatório</span></button>
</div>
<section class="mn-ds" id="ds"><div class="w"></div></section>
<p class="mn-toast mn-glass" id="toast" role="status" hidden></p>
<div class="mn-rot" role="alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" aria-hidden="true"><path d="M8 2h8v20H8zM11 19h2"/></svg><span>Gire o celular para jogar</span></div>`;

function loadCss() {
  if (document.getElementById('mn-css')) return Promise.resolve();
  return new Promise((ok) => {
    const l = document.createElement('link'); l.id = 'mn-css'; l.rel = 'stylesheet'; l.href = new URL('./ui-menu.css', import.meta.url).href;
    l.onload = l.onerror = ok; document.head.append(l);
  });
}

/** Mostra o menu. onStart({mode}) deve devolver uma Promise que resolve quando o jogo estiver pronto. */
export async function showMenu({ onStart }) {
await loadCss();
const root = document.createElement('div'); root.id = 'mn'; root.dataset.s = 'boot'; root.innerHTML = MARKUP; document.body.append(root);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const B = window.BABYLON, body = root, DEV = true; // DEV = false remove os botões de desenvolvimento
const ac = new AbortController(), on = (t, ev, fn) => t.addEventListener(ev, fn, { signal: ac.signal }); // ao iniciar a partida, todos os ouvintes do menu saem de uma vez
const KEY = 'echorift.settings.v1', cfg = { mute: false, volUI: 0.8 };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem armazenamento */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignora */ } };
const RM = matchMedia('(prefers-reduced-motion: reduce)'), errs = [];
const note = (m) => { m = String((m && m.message) || m).slice(0, 140); if (errs[errs.length - 1] !== m) errs.push(m); if (errs.length > 6) errs.shift(); };
on(window, 'error', (e) => note(e.message)); on(window, 'unhandledrejection', (e) => note(e.reason));

/* ---------- ícones (24x24, traço reto: mesma linguagem dos botões do jogo) ---------- */
const P = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  play: P('M7 4.5v15l12-7.5z'), train: P('M12 3v5M12 16v5M3 12h5M16 12h5M12 9l3 3-3 3-3-3z'),
  custom: P('M12 3l9 5-9 5-9-5zM3 13l9 5 9-5'), set: P('M4 7h9M17 7h3M4 17h3M11 17h9M13 4.5v5M7 14.5v5'),
  back: P('M15 5l-7 7 7 7'), on: P('M4 9v6h4l5 4V5L8 9zM16.5 9.5c1.3 1.4 1.3 3.6 0 5M19 7c2.6 2.8 2.6 7.2 0 10'),
  off: P('M4 9v6h4l5 4V5L8 9zM17 9.5l4 5M21 9.5l-4 5'), lock: P('M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z'), shop: P('M5 8h14l-1.2 11H6.2zM9 8V6a3 3 0 0 1 6 0v2'),
};

/* ---------- som: hierarquia + prevenção de pilha ----------
 off/dur recortam o silêncio (o click tem 0,21 s de silêncio no começo); g nivela os três; gap evita metralhadora. */
const SND = {
  tap: { file: 'ui-snd-tap.mp3', off: 0, dur: 0.3, g: 1.6, gap: 0.07, nome: 'UI Tap Light', uso: 'Navegar e selecionar' },
  click: { file: 'ui-snd-click.mp3', off: 0.21, dur: 0.2, g: 2.2, gap: 0.05, nome: 'UI Click', uso: 'Pressionar e confirmar leve' },
  ok: { file: 'ui-snd-ok.mp3', off: 0.05, dur: 0.62, g: 0.6, gap: 0.15, nome: 'UI Sound', uso: 'Confirmação importante e telas especiais' },
};
const AU = {
  ctx: null, bus: null, buf: {}, last: {}, live: 0,
  init() {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C(); this.bus = this.ctx.createGain(); this.bus.connect(this.ctx.destination); this.apply(); // bus de interface; música e efeitos ganham o seu depois
    for (const k in SND) { // os sons ficam em arquivos soltos, na mesma pasta
      fetch(new URL(SND[k].file, import.meta.url)).then((r) => r.arrayBuffer()).then((ab) => this.ctx.decodeAudioData(ab)).then((b) => { this.buf[k] = b; }).catch(() => { SND[k].erro = true; });
    }
  },
  /** Navegadores só liberam o áudio depois de um gesto: chamar dentro de pointerdown/keydown. */
  unlock() { return this.ctx && this.ctx.state !== 'running' ? this.ctx.resume().catch(() => {}) : Promise.resolve(); },
  apply() { if (this.bus) this.bus.gain.value = cfg.mute ? 0 : cfg.volUI; },
  play(k, o = {}) {
    const c = this.ctx, b = this.buf[k], s = SND[k];
    if (!c || !b || cfg.mute || c.state !== 'running') return;
    const t = c.currentTime;
    if (t - (this.last[k] || -9) < s.gap || this.live >= 3) return;
    this.last[k] = t; this.live++;
    const src = c.createBufferSource(), g = c.createGain(), v = (o.vol || 1) * s.g;
    src.buffer = b; src.playbackRate.value = o.rate || 1;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + s.dur - 0.04); g.gain.linearRampToValueAtTime(0, t + s.dur);
    src.connect(g); g.connect(this.bus); src.start(t, s.off, s.dur); src.onended = () => { this.live--; };
  },
};

/* ---------- cenário 3D: usa o VANGUARD real do jogo; sem os arquivos, boneco provisório ---------- */
const CH = { vanguard: { yaw: 0.93, land: { x: 2.1, y: 1.45, z: 5.2, ty: 1.1 } } }; // só paisagem: o personagem fica à direita dos cards
const cur = CH.vanguard;
let stage = null;

function figure(scene) {
  const m = new B.StandardMaterial('fg', scene), w = new B.StandardMaterial('fw', scene), root = new B.TransformNode('fig', scene);
  m.diffuseColor = B.Color3.FromHexString('#4A4F57'); m.specularColor = B.Color3.Black();
  w.emissiveColor = B.Color3.FromHexString('#E8E6E1'); w.disableLighting = true;
  const box = (sx, sy, sz, x, y, z, mt = m) => { const b = B.MeshBuilder.CreateBox('b', { width: sx, height: sy, depth: sz }, scene); b.parent = root; b.position.set(x, y, z); b.material = mt; };
  box(0.5, 0.62, 0.3, 0, 1.6, 0); box(0.26, 0.28, 0.28, 0, 2.15, 0); box(0.2, 0.92, 0.22, -0.14, 0.46, 0); box(0.2, 0.92, 0.22, 0.14, 0.46, 0);
  box(0.3, 0.16, 0.36, -0.38, 1.9, 0); box(0.3, 0.16, 0.36, 0.38, 1.9, 0); box(0.04, 0.04, 1, 0.36, 1.3, 0.62, w);
  let t = 0;
  return { update(x, z, yaw, p, a, dt) { t += dt; root.position.set(x, Math.sin(t * 1.6) * 0.008, z); root.rotation.y = yaw; } };
}

async function initStage() {
  if (!B) throw new Error('Babylon não carregou (3D indisponível)');
  const eng = new B.Engine($('#mc'), true, { stencil: false, powerPreference: 'high-performance' }, false);
  eng.setHardwareScalingLevel(1 / Math.min(devicePixelRatio || 1, 1.5)); // menu: poupa GPU e bateria
  const scene = new B.Scene(eng), hex = (h) => B.Color3.FromHexString(h), V = (x, y, z) => new B.Vector3(x, y, z);
  scene.clearColor = new B.Color4(0.043, 0.047, 0.055, 1);
  scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = 0.07; scene.fogColor = hex('#0B0C0E');
  const cam = new B.FreeCamera('cam', V(0, 1.5, 5), scene); cam.fov = 0.62; cam.minZ = 0.3; cam.maxZ = 60;
  const hemi = new B.HemisphericLight('h', V(0, 1, 0), scene); hemi.intensity = 0.5; hemi.groundColor = hex('#1A1C20');
  const key = new B.DirectionalLight('k', V(-0.5, -0.7, -0.6), scene); key.intensity = 0.85;
  const rim = new B.DirectionalLight('r', V(0.6, -0.15, 0.8), scene); rim.intensity = 0.9; rim.diffuse = hex('#7FD6E8'); rim.specular = hex('#000000');
  const flat = (h) => { const m = new B.StandardMaterial('f' + h, scene); m.emissiveColor = hex(h); m.disableLighting = true; m.backFaceCulling = false; return m; };

  // piso: octógono como o da arena, com anéis de distância; a névoa apaga a borda
  const R = 13, N = 8, pos = [0, 0, 0], nor = [0, 1, 0], uv = [0.5, 0.5], idx = [];
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) * 2 * Math.PI) / N, x = Math.cos(a) * R, z = Math.sin(a) * R;
    pos.push(x, 0, z); nor.push(0, 1, 0); uv.push(x / (2 * R) + 0.5, z / (2 * R) + 0.5); idx.push(0, 1 + ((i + 1) % N), 1 + i);
  }
  const floor = new B.Mesh('floor', scene), vd = new B.VertexData();
  vd.positions = pos; vd.normals = nor; vd.uvs = uv; vd.indices = idx; vd.applyToMesh(floor);
  const S = 512, tex = new B.DynamicTexture('ft', S, scene, true), c = tex.getContext();
  c.fillStyle = '#16181C'; c.fillRect(0, 0, S, S); c.strokeStyle = '#2A2D33'; c.lineWidth = 2;
  for (let r = 2; r < R; r += 2) { c.beginPath(); c.arc(S / 2, S / 2, (r / (2 * R)) * S, 0, 6.2832); c.stroke(); }
  tex.update(); tex.anisotropicFilteringLevel = 4;
  const fm = new B.StandardMaterial('fm', scene); fm.diffuseTexture = tex; fm.specularColor = B.Color3.Black(); fm.backFaceCulling = false;
  floor.material = fm; floor.isPickable = false; floor.freezeWorldMatrix();

  // ECHO: três ondas finas em gelo saem do chão, uma de cada vez (parada se o movimento estiver reduzido)
  const ripM = flat('#7FD6E8');
  const ripples = [0, 1, 2].map(() => {
    const n = 64, p = [], q = [], ix = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832, co = Math.cos(a), si = Math.sin(a), j = (i + 1) % n;
      p.push(co * 0.492, 0, si * 0.492, co * 0.5, 0, si * 0.5); q.push(0, 1, 0, 0, 1, 0); ix.push(i * 2, j * 2, i * 2 + 1, i * 2 + 1, j * 2, j * 2 + 1);
    }
    const m = new B.Mesh('rp', scene), v = new B.VertexData();
    v.positions = p; v.normals = q; v.indices = ix; v.applyToMesh(m);
    m.material = ripM; m.position.y = 0.03; m.isPickable = false; m.visibility = 0;
    return m;
  });
  // RIFT: uma fresta de luz fina atrás do personagem
  const rift = B.MeshBuilder.CreatePlane('rift', { width: 0.035, height: 7 }, scene);
  rift.material = flat('#E8E6E1'); rift.position.set(-0.7, 3.5, -3.5); rift.visibility = 0.55; rift.isPickable = false;

  let rig = null, real = false, params = null;
  const idle = { vx: 0, vz: 0, st: 0, step: 0, t: 0, dt: -1, ddx: 0, ddz: 1, dox: 0, doz: 0 };
  try {
    const [d, r] = await Promise.all([import('./data-vanguard.js'), import('./render-rig.js')]);
    params = JSON.parse(JSON.stringify(d.VANGUARD)); rig = r.createRig(scene, 'player', params); real = true;
  } catch (e) { note('VANGUARD provisório: ' + ((e && e.message) || e)); rig = figure(scene); }

  const st = { eng, real, ft: new Float32Array(300), live: true, want: 0, pan: 0 };
  const tgt = V(0, 1.1, 0);
  let t = 0, n = 0, k = 0, pn = 0, nextFx = 7, fx = -1;
  eng.runRenderLoop(() => {
    const dt = Math.min(eng.getDeltaTime() / 1000, 0.1), rm = RM.matches;
    t += dt; st.ft[n++ % 300] = dt * 1000;
    if (!st.live) return;
    const L = cur.land, dx = rm ? 0 : Math.sin(t * 0.23) * 0.06;
    k += (st.want - k) * (1 - Math.exp(-dt * 2.4)); // empurrão de câmera na entrada do menu
    pn += (st.pan - pn) * (1 - Math.exp(-dt * 5)); // a câmera acompanha o card em foco
    cam.position.set(L.x * k + dx + pn, L.y, L.z + (1 - k) * 2.2); tgt.set(L.x * k + dx + pn, L.ty, 0); cam.setTarget(tgt);
    let a = 0;
    if (real && !rm) { // de vez em quando, o VANGUARD faz o golpe A1 do jogo
      if (fx < 0 && t > nextFx) fx = 0;
      if (fx >= 0) {
        fx += dt;
        const f = fx * 60, A = params.attacks[0], tot = A.startup + A.active + A.recovery;
        idle.st = f < tot ? 1 : 0; idle.step = 0; idle.t = Math.floor(f); a = f - idle.t;
        if (f >= tot + 10) { fx = -1; idle.st = 0; idle.t = 0; nextFx = t + 12 + Math.random() * 8; }
      }
    }
    rig.update(0, 0, cur.yaw + (rm ? 0 : Math.sin(t * 0.45) * 0.09), idle, a, dt, 5.5);
    ripples.forEach((m, i) => {
      const p = rm ? 0.5 : (t / 3.8 + i / 3) % 1, s = 1.2 + p * 24;
      m.scaling.set(s, 1, s); m.visibility = rm ? (i === 0 ? 0.22 : 0) : Math.pow(1 - p, 2) * 0.5 * Math.min(1, p * 12);
    });
    scene.render();
  });
  on(window, 'resize', () => eng.resize());
  return st;
}

/* ---------- fluxo de telas: boot, tap, home, match, ds ---------- */
const sync = () => { if (stage) { stage.want = body.dataset.s === 'home' ? 1 : 0; stage.live = !/^(match|ds)$/.test(body.dataset.s); } };
const go = (s) => { body.dataset.s = s; sync(); };
const toast = (m) => { const t = $('#toast'); t.hidden = true; t.textContent = m; void t.offsetWidth; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 1700); };
const dis = (b) => b.getAttribute('aria-disabled') === 'true';
const CARDS = $$('.mn-card'), DESC = ['Entre na arena. Partida em desenvolvimento.', 'Alvo parado, circular ou perseguidor.', 'Skins, armas, emblemas e títulos.', 'Ainda não disponível.', 'Áudio, gráficos, controles e interface.'];
let sel = -1, fsTried = false;
/** Foco do menu, como no console: o card em foco sobe e cresce; o título grande e a câmera acompanham. */
function pick(i, snd) {
  i = Math.max(0, Math.min(CARDS.length - 1, i)); if (i === sel) return;
  sel = i; CARDS.forEach((c, j) => c.classList.toggle('on', j === i));
  const c = CARDS[i], h = $('#hero');
  $('#ht').innerHTML = $('.lb', c).textContent + (dis(c) ? '<small>Em breve</small>' : ''); $('#hd').textContent = DESC[i];
  h.classList.remove('sw'); void h.offsetWidth; h.classList.add('sw');
  if (stage) stage.pan = (i - 2) * 0.05;
  if (snd) AU.play('tap', { vol: 0.8 });
}
/** Paisagem: o Chrome só trava a orientação em tela cheia e depois de um toque. Sem trava, a tela "gire o celular" cobre o retrato. */
function landscape() {
  if (fsTried) return; fsTried = true;
  try {
    const d = document.documentElement;
    Promise.resolve(!document.fullscreenElement && d.requestFullscreen && d.requestFullscreen())
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  } catch (e) { /* sem tela cheia */ }
}
const cd = (l, c, i) => `<button class="mn-card ${c === 'dis' ? '' : c}" tabindex="-1"${c === 'dis' ? ' aria-disabled="true"' : ''}><span class="art">${ICON[i]}</span>${ICON[i]}<span class="lb">${l}</span>${c === 'dis' ? '<small>Em breve</small>' : ''}</button>`;

/** Ponto de plug com o jogo: PLAY chama onStart({mode}). Quando a Promise resolve, o menu sai; se falhar, o menu fica e mostra o motivo. */
const EchoMenu = (window.EchoMenu = { cfg, onStart });
/** Fecha o menu depois que o jogo já abriu por baixo: some, solta os ouvintes, libera o 3D e o áudio do menu. */
function close() {
  root.classList.add('out'); ac.abort();
  if (stage) stage.live = false;
  setTimeout(() => {
    try { if (stage) stage.eng.dispose(); } catch (e) { /* já liberado */ }
    stage = null; try { if (AU.ctx) AU.ctx.close(); } catch (e) { /* ignora */ }
    root.remove();
  }, 600);
}
let busy = false;
async function start(b) {
  if (busy) return; busy = true;
  b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true');
  try { await EchoMenu.onStart({ mode: b.dataset.go }); close(); return; } catch (e) { note(e); toast((e && e.message) || 'Não foi possível iniciar'); }
  b.classList.remove('is-loading'); b.removeAttribute('aria-busy'); busy = false;
}
function enter(viaKey) {
  AU.unlock().then(() => AU.play('ok'));
  go('home');
  if (viaKey) { landscape(); setTimeout(() => CARDS[0].focus({ preventScroll: true }), 900); }
}

on(document, 'pointerdown', (e) => {
  AU.unlock();
  const s = body.dataset.s;
  if ((s === 'boot' || s === 'tap') && !e.target.closest('#mute')) { enter(); return; }
  const k = e.target.closest('.mn-card'); if (k) pick(CARDS.indexOf(k), false);
  const b = k || e.target.closest('.mn-btn'); if (!b) return;
  if (dis(b)) { AU.play('tap', { vol: 0.6, rate: 0.8 }); toast('Ainda não disponível'); return; }
  b.classList.add('dn'); AU.play(b.dataset.snd || 'click', { rate: +b.dataset.rate || 1 });
});
const rel = () => $$('.dn').forEach((x) => x.classList.remove('dn'));
on(window, 'pointerup', rel); on(window, 'pointercancel', rel);
CARDS.forEach((c, i) => {
  c.addEventListener('focusin', () => pick(i, false));
  c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pick(i, true); });
});
const drag = { id: -1, x: 0, i: 0, on: false }; // arrastar a faixa troca o foco sem abrir nada
on(document, 'pointerdown', (e) => { drag.on = false; if (e.target.closest('.mn-strip')) { drag.id = e.pointerId; drag.x = e.clientX; drag.i = sel; } });
on(document, 'pointermove', (e) => {
  if (e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x; if (Math.abs(dx) > 12) drag.on = true;
  if (drag.on) pick(drag.i - Math.round(dx / 64), true);
});
const dend = (e) => { if (e.pointerId === drag.id) drag.id = -1; };
on(window, 'pointerup', dend); on(window, 'pointercancel', dend);
on(document, 'click', (e) => {
  landscape(); AU.unlock();
  if (drag.on) { drag.on = false; return; }
  const g = e.target.closest('[data-go]'); if (g && !dis(g)) start(g);
  if (e.target.closest('#dsb')) go('home');
  if (e.target.closest('#dso')) { buildDS(); go('ds'); }
  if (e.target.closest('#rep')) report();
  if (e.target.closest('#mute')) { cfg.mute = !cfg.mute; save(); AU.apply(); paintMute(); if (!cfg.mute) AU.play('click'); }
});
on(window, 'keydown', (e) => {
  const s = body.dataset.s;
  if (s === 'boot' || s === 'tap') { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(true); } return; }
  if (e.key === 'Escape' && (s === 'match' || s === 'ds')) { AU.play('click', { rate: 0.88 }); go('home'); return; }
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { const b = document.activeElement; if (b && b.classList && (b.classList.contains('mn-btn') || b.classList.contains('mn-card')) && !dis(b)) AU.play(b.dataset.snd || 'click', { rate: +b.dataset.rate || 1 }); }
  if (s === 'home' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault();
    const i = Math.max(0, Math.min(CARDS.length - 1, sel + (e.key === 'ArrowRight' ? 1 : -1)));
    if (i !== sel) { CARDS[i].focus({ preventScroll: true }); AU.play('tap', { vol: 0.7 }); }
  }
});
const paintMute = () => { const m = $('#mute'); m.innerHTML = ICON[cfg.mute ? 'off' : 'on']; m.setAttribute('aria-pressed', String(cfg.mute)); m.setAttribute('aria-label', cfg.mute ? 'Ativar som' : 'Silenciar'); };

/* ---------- Marco 1: Design System (botão "Design System" na tela principal) ---------- */
let dsDone = false;
function buildDS() {
  if (dsDone) return; dsDone = true;
  const sw = [['Fundo', '#0B0C0E'], ['Grafite', '#1A1C20'], ['Grafite claro', '#2A2D33'], ['Metal', '#6B727B'], ['Branco', '#E8E6E1'], ['ECHO (gelo)', '#7FD6E8'], ['Dano (óxido)', '#C4452D']];
  const stt = [['Normal', ''], ['Hover', 'is-hover'], ['Focus', 'is-focus'], ['Selected', 'is-sel'], ['Pressed', 'is-press'], ['Disabled', 'dis'], ['Loading', 'is-loading']];
  const b = (l, c = '', i = 'play') => `<button class="mn-btn ${c === 'dis' ? '' : c}" tabindex="-1"${c === 'dis' ? ' aria-disabled="true"' : ''}>${ICON[i]}<span class="lb">${l}</span></button>`;
  $('#ds .w').innerHTML =
    `<div class="hd"><button class="mn-btn sm" id="dsb" data-rate=".88">${ICON.back}<span class="lb">Menu</span></button><span>Design System, Marco 1</span></div>` +
    `<h2>Paleta</h2><div class="g">${sw.map(([n, h]) => `<div class="sw" style="background:${h};color:${/E8E6E1|7FD6E8/.test(h) ? '#0B0C0E' : '#E8E6E1'}">${n}<br>${h}</div>`).join('')}</div><p class="nt">Gelo só para ECHO. Óxido só para dano e ameaça. O resto é neutro. Os valores são os do hud.css.</p>` +
    `<h2>Tipografia, Chakra Petch</h2><div style="display:grid;gap:10px"><div style="font:700 40px/1 var(--f);letter-spacing:.14em">ECHO//RIFT</div><div style="font:600 17px var(--f);letter-spacing:.16em">PLAY</div><div style="font:500 14px var(--f)">Texto de interface, 14 px.</div><div style="font:500 12px var(--f);color:var(--dim)">Legenda, 12 px.</div></div>` +
    `<h2>Botões e estados</h2><div class="g">${stt.map(([n, c]) => `<div>${b(n, c)}</div>`).join('')}</div><div class="g l" style="margin-top:10px"><div>${b('PLAY', 'pri')}</div><div>${b('Secundário', '', 'train')}</div></div>` +
    `<h2>Cards do menu</h2><div class="cg">${cd('PLAY', 'pri on', 'play')}${cd('TRAINING', '', 'train')}${cd('LOJA', 'dis', 'shop')}</div><p class="nt">Em foco: sobe, cresce e ganha borda branca. Indisponível: texto apagado e Em breve.</p>` +
    `<h2>Painel de vidro</h2><div class="bgp"><div class="mn-glass" style="padding:18px"><b>Vidro escuro</b><p class="nt">Fundo desfocado, reflexo no topo, borda interna fina e dois cantos cortados. O desfoque fica só nos painéis grandes.</p></div></div>` +
    `<h2>Ícones</h2><div class="g">${Object.keys(ICON).map((k) => `<div class="ik">${ICON[k]}${k}</div>`).join('')}</div>` +
    `<h2>Sons (toque para ouvir)</h2><div class="g l">${Object.keys(SND).map((k) => `<button class="mn-btn" data-snd="${k}"><span class="lb">${SND[k].nome}</span><small>${SND[k].uso}</small></button>`).join('')}</div><p class="nt">Licença dos 3 arquivos: a confirmar. Até lá são placeholders.</p>`;
}

/* ---------- relatório para colar no chat (mesmo jeito do painel do jogo) ---------- */
function report() {
  const s = stage ? [...stage.ft].filter(Boolean).sort((a, b) => a - b) : [], p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(1) : null);
  const txt = JSON.stringify({
    quando: new Date().toISOString(), menu: 'M1+M2', babylon: B ? B.Engine.Version : null, vanguard: stage && stage.real ? 'real (render-rig.js)' : 'provisório',
    fps: stage ? Math.round(stage.eng.getFps()) : null, quadroMs: { p50: p(0.5), p95: p(0.95), p99: p(0.99) },
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    tela: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio }, movimentoReduzido: RM.matches,
    audio: { estado: AU.ctx ? AU.ctx.state : null, mudo: cfg.mute, sons: Object.fromEntries(Object.keys(SND).map((k) => [k, AU.buf[k] ? 'ok' : SND[k].erro ? 'erro' : 'pendente'])) },
    erros: errs, navegador: navigator.userAgent,
  }, null, 1);
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Relatório copiado'), () => prompt('Copie o relatório:', txt));
}

/* ---------- partida ---------- */
$$('[data-i]').forEach((e) => e.insertAdjacentHTML('afterbegin', (e.classList.contains('mn-card') ? `<span class="art">${ICON[e.dataset.i]}</span>` : '') + ICON[e.dataset.i]));
CARDS.forEach((c, i) => c.style.setProperty('--i', i));
pick(0, false);
if (!DEV) $$('[data-dev]').forEach((e) => e.remove());
paintMute();
try { AU.init(); } catch (e) { note(e); }
initStage().then((s) => { stage = s; sync(); }).catch((e) => { note(e); body.classList.add('no3d'); });
setTimeout(() => { if (body.dataset.s === 'boot') go('tap'); }, 2000);
return { close };
}
