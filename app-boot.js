import { VANGUARD } from './data-vanguard.js';
import { ARENA_01 } from './data-arena-01.js';
import { createWorld, stepWorld } from './sim-world.js';
import { setDummyMode } from './sim-dummy.js';
import { createStepper } from './app-loop.js';
import { createStage } from './render-stage.js';
import { createRig } from './render-rig.js';
import { createInput } from './input.js';
import { createHud } from './ui-hud.js';
import { createOverlay } from './debug-overlay.js';
import { ANIM } from './data-anim.js';

const ui = document.getElementById('ui');
if (!window.BABYLON) {
  ui.innerHTML = '<div class="dbg">O Babylon.js não carregou. Confira a conexão e a versão no index.html (ex.: 9.29.0).</div>';
  throw new Error('BABYLON ausente');
}

const params = JSON.parse(JSON.stringify(VANGUARD)); // cópia: o painel de ajustes muda estes valores ao vivo
const world = createWorld({ arenaData: ARENA_01, params });
const stage = createStage(document.getElementById('c'), ARENA_01);
const player = createRig(stage.scene, 'player', params);
const target = createRig(stage.scene, 'target', params);
const echo = createRig(stage.scene, 'ghost', params); // a cópia do ECHO
echo.hide();
const input = createInput(ui); // antes do HUD: o HUD procura os botões
const hud = createHud(ui, params);
const overlay = createOverlay({ host: ui, engine: stage.engine, scene: stage.scene, params, world, onDummyMode: (m) => setDummyMode(world, m) });
const stepper = createStepper(() => stepWorld(world, input.read()));

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * t;
// reação do alvo a cada acerto espera a lâmina chegar (ANIM.hitDelay): uma vaga para o golpe do jogador, outra para o da cópia
const pends = [{ t: -1, dx: 0, dz: 1, ko: false }, { t: -1, dx: 0, dz: 1, ko: false }];
let lastPend = pends[0], echoOn = false;
const arm = (slot, delay, dx, dz) => { lastPend = slot; slot.t = delay / 60; slot.dx = dx; slot.dz = dz; slot.ko = false; };

/** Esvazia a fila de eventos da sim e entrega a quem desenha. */
function drain() {
  const p = world.player, t = world.target, g = world.echo.g;
  for (let i = 0; i < world.nev; i++) {
    const e = world.events[i];
    if (e.type === 'hit') {
      if (e.a === 1) { // jogador acertou o alvo
        const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz) || 1;
        arm(pends[0], ANIM.hitDelay[e.b], dx / d, dz / d);
      } else { // bot acertou o jogador
        const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1;
        player.hurt(dx / d, dz / d);
      }
    } else if (e.type === 'echohit') { // a cópia acertou o alvo
      const dx = t.x - g.x, dz = t.z - g.z, d = Math.hypot(dx, dz) || 1;
      arm(pends[1], ANIM.hitDelay[e.a], dx / d, dz / d);
    } else if (e.type === 'echohurt') { // o bot acertou a cópia
      const dx = g.x - t.x, dz = g.z - t.z, d = Math.hypot(dx, dz) || 1;
      echo.hurt(dx / d, dz / d);
    } else if (e.type === 'echoend') {
      if (e.a === 1) hud.toast('ECHO destruído');
    } else if (e.type === 'perfect') {
      player.perfect(); hud.toast('Esquiva perfeita');
    } else if (e.type === 'ko') {
      if (e.a === 1) lastPend.ko = true; else player.ko();
      hud.message(e.a === 1 ? 'Alvo derrotado' : 'Você caiu');
    } else if (e.type === 'reset') {
      target.reset(); player.reset(); echo.reset();
      for (const s of pends) { s.t = -1; s.ko = false; }
      hud.message(null); hud.snap();
    }
  }
  world.nev = 0;
}

stage.engine.runRenderLoop(() => {
  const alpha = stepper.advance(performance.now());
  drain();
  const dt = Math.min(stage.engine.getDeltaTime() / 1000, 0.1), p = world.player, t = world.target, E = world.echo, g = E.g;
  const x = lerp(p.px, p.x, alpha), z = lerp(p.pz, p.z, alpha), tx = lerp(t.px, t.x, alpha), tz = lerp(t.pz, t.z, alpha);
  for (const s of pends) if (s.t >= 0 && (s.t -= dt) < 0) { target.hit(s.dx, s.dz); if (s.ko) target.ko(); }
  try {
    player.update(x, z, lerpAngle(p.pyaw, p.yaw, alpha), p, alpha, dt, params.maxSpeed);
    target.update(tx, tz, lerpAngle(t.pyaw, t.yaw, alpha), t, dt, alpha);
    if ((E.phase > 0) !== echoOn) { echoOn = E.phase > 0; if (echoOn) echo.show(); else echo.hide(); }
    if (echoOn) { // cópia: aparece aos poucos no telégrafo e pisca nos últimos 0,5 s
      const left = E.len - E.t, fade = E.phase === 1 ? E.t / params.echo.telegraph : left <= 30 && Math.floor(left / 6) % 2 === 1 ? 0.5 : 1;
      echo.update(lerp(g.px, g.x, alpha), lerp(g.pz, g.z, alpha), lerpAngle(g.pyaw, g.yaw, alpha), g, alpha, dt, params.maxSpeed, fade);
    }
  } catch (e) { overlay.error(e); } // erro de animação aparece no painel e não derruba o jogo
  stage.frame(x, z, tx, tz, dt);
  hud.update(p, t, E);
  stage.scene.render();
  overlay.frame();
});
addEventListener('resize', () => stage.engine.resize());
