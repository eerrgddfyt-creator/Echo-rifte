/** Painel de depuração: métricas, ajustes ao vivo, relatório exportável e erros. Começa recolhido. */
export function createOverlay({ host, engine, scene, params, world, onDummyMode }) {
  const B = window.BABYLON, inst = new B.SceneInstrumentation(scene);
  const el = document.createElement('div'), head = document.createElement('button'), body = document.createElement('div');
  const pre = document.createElement('pre'), er = document.createElement('pre'), tune = document.createElement('div'), ta = document.createElement('textarea');
  el.className = 'dbg min'; head.className = 'head'; er.className = 'err';
  body.hidden = tune.hidden = ta.hidden = true; ta.readOnly = true;
  body.append(pre, er, tune, ta); el.append(head, body); host.append(el);
  head.onclick = () => { body.hidden = !body.hidden; el.classList.toggle('min', body.hidden); };

  const N = 300, ft = new Float32Array(N), errors = [], dpr = window.devicePixelRatio || 1;
  const LV = [['100%', 1 / dpr], ['75%', 1 / (dpr * 0.75)], ['50%', 1 / (dpr * 0.5)]];
  let n = 0, lvl = 0, first = 0, last = 0;
  engine.setHardwareScalingLevel(LV[0][1]); // 100% = resolução nativa da tela

  const addErr = (m) => {
    m = String(m && m.message ? m.message : m).slice(0, 140);
    if (errors[errors.length - 1] === m) return;
    errors.push(m); if (errors.length > 4) errors.shift();
  };
  addEventListener('error', (e) => addErr(e.message));
  addEventListener('unhandledrejection', (e) => addErr(e.reason));

  const pct = (p) => {
    const a = Array.from(ft.subarray(0, Math.min(n, N))).sort((x, y) => x - y);
    return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  };
  const stats = () => ({
    fps: Math.round(engine.getFps()), p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), p99: +pct(0.99).toFixed(1),
    drawCalls: inst.drawCallsCounter.current, triangulos: Math.round(scene.getActiveIndices() / 3),
    malhas: scene.getActiveMeshes().length,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  });
  const report = () => {
    let gl = {};
    try { gl = engine.getGlInfo(); } catch (e) { /* sem info de GPU */ }
    return JSON.stringify({
      quando: new Date().toISOString(), babylon: B.Engine.Version, gpu: gl.renderer || null,
      navegador: navigator.userAgent, tela: { w: innerWidth, h: innerHeight, dpr }, resolucao: LV[lvl][0],
      primeiroQuadroMs: Math.round(first), ticks: world.tick, alvo: world.dummyMode, combate: world.stats, ...stats(), erros: errors,
    }, null, 1);
  };

  const btn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label; b.onclick = fn; body.insertBefore(b, tune);
    return b;
  };
  btn('Relatório', () => {
    ta.value = report(); ta.hidden = false;
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => {});
    ta.select();
  });
  const resBtn = btn('Res 100%', () => {
    lvl = (lvl + 1) % LV.length; engine.setHardwareScalingLevel(LV[lvl][1]); resBtn.textContent = 'Res ' + LV[lvl][0];
  });
  const MODOS = ['parado', 'circular', 'perseguidor'];
  const modeBtn = btn('Alvo: parado', () => {
    const m = MODOS[(MODOS.indexOf(world.dummyMode) + 1) % MODOS.length];
    onDummyMode(m); modeBtn.textContent = 'Alvo: ' + m;
  });
  btn('Ajustes', () => { tune.hidden = !tune.hidden; });
  btn('Tela cheia', () => {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    Promise.resolve(document.documentElement.requestFullscreen?.())
      .then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  });

  for (const [name, get, set, min, max, step] of [
    ['Velocidade máx. (m/s)', () => params.maxSpeed, (v) => (params.maxSpeed = v), 3, 9, 0.1],
    ['Aceleração (ticks)', () => params.accelTicks, (v) => (params.accelTicks = v), 1, 20, 1],
    ['Parada (ticks)', () => params.stopTicks, (v) => (params.stopTicks = v), 1, 20, 1],
    ['Dano A1', () => params.attacks[0].damage, (v) => (params.attacks[0].damage = v), 1, 30, 1],
    ['Dano A2', () => params.attacks[1].damage, (v) => (params.attacks[1].damage = v), 1, 40, 1],
    ['Alcance (m)', () => params.reach, (v) => (params.reach = v), 1, 4, 0.1],
    ['Dano do bot', () => params.bot.damage, (v) => (params.bot.damage = v), 1, 30, 1],
    ['Telégrafo do bot (ticks)', () => params.bot.telegraph, (v) => (params.bot.telegraph = v), 12, 40, 1],
    ['Recarga da esquiva (ticks)', () => params.dodge.cooldown, (v) => (params.dodge.cooldown = v), 10, 120, 1],
  ]) {
    const lab = document.createElement('label'), txt = document.createTextNode(''), inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = get();
    inp.oninput = () => { set(+inp.value); txt.nodeValue = `${name}: ${inp.value}`; };
    inp.oninput(); lab.append(txt, inp); tune.append(lab);
  }

  return {
    /** Erros do jogo (ex.: animação) aparecem no painel e no relatório. */
    error: addErr,
    /** Chamar uma vez por quadro desenhado. */
    frame() {
      ft[n++ % N] = engine.getDeltaTime();
      const now = performance.now();
      if (!first) first = now;
      if (now - last < 500) return;
      last = now;
      const s = stats(), c = world.stats;
      head.textContent = body.hidden ? 'FPS ' + s.fps + (errors.length ? ' (erro)' : '') : 'Fechar painel';
      pre.textContent =
        `FPS ${s.fps}  quadro ${engine.getDeltaTime().toFixed(1)} ms  p95 ${s.p95}  p99 ${s.p99}\n` +
        `draw ${s.drawCalls}  tri ${s.triangulos}  malhas ${s.malhas}\n` +
        `heap ${s.heapMB ?? 'n/d'} MB  res ${LV[lvl][0]}  tick ${world.tick}\n` +
        `golpes ${c.swings}  acertos ${c.hits}  KO ${c.kos}  reinícios ${c.resets}\n` +
        `esquivas ${c.dodges}  perfeitas ${c.perfect}  sofridos ${c.taken}\n` +
        `Babylon ${B.Engine.Version}  1º quadro ${Math.round(first)} ms`;
      er.textContent = errors.map((e) => 'ERRO ' + e).join('\n');
    },
  };
}
