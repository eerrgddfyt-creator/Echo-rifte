import { VANGUARD } from './data-vanguard.js';
import { ARENA_01 } from './data-arena-01.js';
import { createWorld, stepWorld } from './sim-world.js';
import { createStepper } from './app-loop.js';
import { createStage } from './render-stage.js';
import { createRig } from './render-rig.js';
import { createInput } from './input.js';
import { createOverlay } from './debug-overlay.js';

const ui = document.getElementById('ui');
if (!window.BABYLON) {
  ui.innerHTML = '<div class="dbg">O Babylon.js não carregou. Confira a conexão e a versão no index.html (ex.: 9.29.0).</div>';
  throw new Error('BABYLON ausente');
}

const params = { ...VANGUARD }; // cópia: o painel de ajustes muda estes valores ao vivo
const world = createWorld({ arenaData: ARENA_01, params });
const stage = createStage(document.getElementById('c'), ARENA_01);
const player = createRig(stage.scene, 'player');
const target = createRig(stage.scene, 'target');
const input = createInput(ui);
const overlay = createOverlay({ host: ui, engine: stage.engine, scene: stage.scene, params, tick: () => world.tick });
const stepper = createStepper(() => stepWorld(world, input.read()));

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * t;

stage.engine.runRenderLoop(() => {
  const alpha = stepper.advance(performance.now());
  const dt = stage.engine.getDeltaTime() / 1000, p = world.player, t = world.target;
  const x = lerp(p.px, p.x, alpha), z = lerp(p.pz, p.z, alpha);
  player.update(x, z, lerpAngle(p.pyaw, p.yaw, alpha), p.vx, p.vz, dt, params.maxSpeed);
  target.update(t.x, t.z, Math.atan2(x - t.x, z - t.z));
  stage.frame(x, z, t.x, t.z, dt);
  stage.scene.render();
  overlay.frame();
});
addEventListener('resize', () => stage.engine.resize());
