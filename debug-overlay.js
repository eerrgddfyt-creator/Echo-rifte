/** Painel de depuração (M0): métricas, ajustes ao vivo, relatório exportável e erros. */
export function createOverlay({ host, engine, scene, params, tick }) {
  const B = window.BABYLON, inst = new B.SceneInstrumentation(scene);
  const el = document.createElement('div'), pre = document.createElement('pre'), er = document.createElement('pre');
  const tune = document.createElement('div'), ta = document.createElement('textarea');
  el.className = 'dbg'; er.className = 'err'; tune.hidden = ta.hidden = true; ta.readOnly = true;
  el.append(pre, er, tune, ta); host.append(el);

  const N = 300, ft = new Float32Array(N), errors = [], dpr = window.devicePixelRatio || 1;
  const LV = [['100%', 1 / dpr], ['75%', 1 / (dpr * 0.75)], ['50%', 1 / (dpr * 0.5)]];
  let n = 0, lvl = 0, first = 0, last = 0;
  engine.setHardwareScalingLevel(LV[0][1]); // 100% = resolução nativa da tela

  const addErr = (m) => { errors.push(String(m).slice(0, 140)); if (errors.length > 4) errors.shift(); };
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
      primeiroQuadroMs: Math.round(first), ticks: tick(), ...stats(), erros: errors,
    }, null, 1);
  };

  const btn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label; b.onclick = fn; el.insertBefore(b, tune);
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
  btn('Ajustes', () => { tune.hidden = !tune.hidden; });
  btn('Tela cheia', () => {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    Promise.resolve(document.documentElement.requestFullscreen?.())
      .then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  });

  for (const [key, name, min, max, step] of [
    ['maxSpeed', 'Velocidade máx. (m/s)', 3, 9, 0.1], ['accelTicks', 'Aceleração (ticks)', 1, 20, 1], ['stopTicks', 'Parada (ticks)', 1, 20, 1],
  ]) {
    const lab = document.createElement('label'), txt = document.createTextNode(''), inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = params[key];
    inp.oninput = () => { params[key] = +inp.value; txt.nodeValue = `${name}: ${inp.value}`; };
    inp.oninput(); lab.append(txt, inp); tune.append(lab);
  }

  return {
    /** Chamar uma vez por quadro desenhado. */
    frame() {
      ft[n++ % N] = engine.getDeltaTime();
      const now = performance.now();
      if (!first) first = now;
      if (now - last < 500) return;
      last = now;
      const s = stats();
      pre.textContent =
        `FPS ${s.fps}  quadro ${engine.getDeltaTime().toFixed(1)} ms  p95 ${s.p95}  p99 ${s.p99}\n` +
        `draw ${s.drawCalls}  tri ${s.triangulos}  malhas ${s.malhas}\n` +
        `heap ${s.heapMB ?? 'n/d'} MB  res ${LV[lvl][0]}  tick ${tick()}\n` +
        `Babylon ${B.Engine.Version}  1º quadro ${Math.round(first)} ms`;
      er.textContent = errors.map((e) => 'ERRO ' + e).join('\n');
    },
  };
}
