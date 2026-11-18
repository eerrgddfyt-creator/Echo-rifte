import { CH, NCH, loco, atk, solveArm, qFromTo } from './render-pose.js';
import { ANIM } from './data-anim.js';

/**
 * Figuras procedurais provisórias (VANGUARD e alvo de treino). Só leem o estado da sim.
 * O VANGUARD é animado por pose: locomoção + golpe (spline de keyframes, braços por IK), misturados e suavizados.
 */
export function createRig(scene, kind, params) {
  const B = window.BABYLON;
  const mat = (h, flat) => {
    const m = new B.StandardMaterial('m' + h, scene), c = B.Color3.FromHexString(h);
    m.diffuseColor = c; m.specularColor = B.Color3.Black();
    if (flat) { m.emissiveColor = c; m.disableLighting = true; } // cor chapada, sem brilho
    return m;
  };
  const node = (parent, x, y, z) => { const n = new B.TransformNode('n', scene); n.parent = parent; n.position.set(x, y, z); return n; };
  const part = (w, h, d, parent, x, y, z, m) => {
    const b = B.MeshBuilder.CreateBox('p', { width: w, height: h, depth: d }, scene);
    b.parent = parent; b.position.set(x, y, z); b.material = m; b.isPickable = false;
    return b;
  };
  const root = new B.TransformNode(kind, scene);

  // contato com o chão: sombra barata + anel de identificação (branco = jogador, óxido = alvo)
  const shadow = B.MeshBuilder.CreateDisc('shadow', { radius: 0.65, tessellation: 20 }, scene);
  const sm = mat('#000000', true); sm.alpha = 0.35; sm.backFaceCulling = false;
  shadow.material = sm; shadow.rotation.x = Math.PI / 2; shadow.parent = root; shadow.position.y = 0.01; shadow.isPickable = false;
  const ring = B.MeshBuilder.CreateTorus('ring', { diameter: 1.3, thickness: 0.06, tessellation: 28 }, scene);
  ring.material = mat(kind === 'player' ? '#E8E6E1' : '#C4452D', true);
  ring.parent = root; ring.position.y = 0.04; ring.isPickable = false;

  if (kind === 'target') {
    const body = B.MeshBuilder.CreateCapsule('body', { radius: 0.45, height: 1.8 }, scene), bm = mat('#4A4F57');
    body.material = bm; body.parent = root; body.position.y = 0.9; body.isPickable = false;
    let rec = 0, rdx = 0, rdz = 1, flash = 0, down = 0, koT = 0;
    return {
      update(x, z, dt) {
        rec *= Math.exp(-dt * 9); flash *= Math.exp(-dt * 14);
        koT += (down - koT) * (1 - Math.exp(-dt * 6));
        root.position.set(x + rdx * rec * 0.22, 0, z + rdz * rec * 0.22);
        const tilt = rec * 0.28 + koT * 1.35; // recuo do golpe + queda
        body.rotation.x = tilt * rdz; body.rotation.z = -tilt * rdx;
        body.position.y = 0.9 - koT * 0.42;
        const e = bm.emissiveColor; e.r = e.g = e.b = flash * 0.85; // flash de acerto
      },
      hit(dx, dz) { rdx = dx; rdz = dz; rec = 1; flash = 1; },
      ko() { down = 1; },
      reset() { down = 0; koT = 0; rec = 0; flash = 0; },
    };
  }

  // VANGUARD: ombros largos, lâmina de um gume. Frente = +z local.
  const dark = mat('#2A2D33'), mid = mat('#4A4F57'), blade = mat('#E8E6E1', true);
  const legs = node(root, 0, 0.95, 0), hips = node(root, 0, 0.95, 0);
  const legL = node(legs, -0.14, 0, 0), legR = node(legs, 0.14, 0, 0);
  part(0.2, 0.92, 0.22, legL, 0, -0.46, 0, dark); part(0.2, 0.92, 0.22, legR, 0, -0.46, 0, dark);
  const torso = node(hips, 0, 0.05, 0);
  part(0.5, 0.62, 0.3, torso, 0, 0.36, 0, mid);
  part(0.3, 0.16, 0.36, torso, -0.38, 0.64, 0, dark); part(0.3, 0.16, 0.36, torso, 0.38, 0.64, 0, dark);
  const head = node(torso, 0, 0.86, 0);
  part(0.26, 0.28, 0.28, head, 0, 0, 0, dark); part(0.2, 0.05, 0.02, head, 0, 0.02, 0.15, blade);

  // braços: 2 ossos cada, posicionados por IK. Os nós usam quaternion (um osso aponta de -y para a direção calculada).
  const qnode = () => { const n = node(torso, 0, 0, 0); n.rotationQuaternion = new B.Quaternion(); return n; };
  const upR = qnode(), foreR = qnode(), handR = qnode(), upL = qnode(), foreL = qnode();
  upR.position.set(0.36, 0.6, 0); upL.position.set(-0.36, 0.6, 0);
  for (const n of [upR, upL]) part(0.14, 0.3, 0.16, n, 0, -0.15, 0, mid);
  for (const n of [foreR, foreL]) part(0.13, 0.3, 0.15, n, 0, -0.15, 0, mid);
  part(0.06, 0.06, 0.2, handR, 0, 0, 0.06, dark); part(0.04, 0.04, 1.0, handR, 0, 0, 0.66, blade);

  const Q = new Float32Array(4), R = new Float32Array(12);
  const setQ = (n) => { const q = n.rotationQuaternion; q.x = Q[0]; q.y = Q[1]; q.z = Q[2]; q.w = Q[3]; };
  const arm = (up, fore, hand, sx, c, h0, b0, pole) => {
    solveArm(R, sx, 0.6, 0, c[h0], c[h0 + 1], c[h0 + 2], pole, -1, -0.4);
    qFromTo(Q, 0, -1, 0, R[3], R[4], R[5]); setQ(up);
    fore.position.set(R[0], R[1], R[2]); qFromTo(Q, 0, -1, 0, R[6], R[7], R[8]); setQ(fore);
    if (hand) { hand.position.set(R[9], R[10], R[11]); qFromTo(Q, 0, 0, 1, c[b0], c[b0 + 1], c[b0 + 2]); setQ(hand); }
  };
  const apply = (c) => {
    const y = 0.95 + c[CH.hipY];
    legs.position.y = y; hips.position.y = y; hips.rotation.y = c[CH.hipRY];
    torso.rotation.x = c[CH.torRX]; torso.rotation.y = c[CH.torRY]; torso.rotation.z = c[CH.torRZ];
    head.rotation.y = -(c[CH.hipRY] + c[CH.torRY]) * 0.6; // o olhar fica no alvo
    legL.rotation.x = c[CH.legL]; legR.rotation.x = c[CH.legR];
    arm(upR, foreR, handR, 0.36, c, CH.hx, CH.bx, 0.6);
    arm(upL, foreL, null, -0.36, c, CH.ox, 0, -0.6);
  };

  // rastro do golpe: dois crescentes planos (o arco do acerto), um principal e um atrasado
  const fx = node(root, 0, 1.0, 0), fm = mat('#E8E6E1', true);
  fm.backFaceCulling = false;
  const crescent = () => {
    const N = 12, W = 0.9, rc = params.reach - 0.25, pos = [], nor = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (u - 0.5) * W, hw = 0.25 * Math.pow(Math.sin(Math.PI * u), 0.8);
      pos.push(Math.sin(a) * (rc - hw), 0, Math.cos(a) * (rc - hw), Math.sin(a) * (rc + hw), 0, Math.cos(a) * (rc + hw));
      nor.push(0, 1, 0, 0, 1, 0);
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    const m = new B.Mesh('slash', scene), vd = new B.VertexData();
    vd.positions = pos; vd.normals = nor; vd.indices = idx; vd.applyToMesh(m);
    m.material = fm; m.parent = fx; m.isPickable = false; m.isVisible = false;
    return m;
  };
  const slashA = crescent(), slashB = crescent();
  const slash = (tf, step) => {
    const A = params.attacks[step], u = (tf - (A.startup - 1)) / (A.active + 3);
    if (u < 0 || u > 1) { slashA.isVisible = slashB.isVisible = false; return; }
    const dir = step === 0 ? 1 : -1, e = 1 - (1 - u) * (1 - u), e2 = Math.max(0, e - 0.2);
    const a = u < 0.25 ? u / 0.25 : Math.pow((1 - u) / 0.75, 1.3);
    slashA.isVisible = slashB.isVisible = true;
    slashA.rotation.y = dir * (1 - 2 * e) * 0.95; slashA.visibility = a * 0.9;
    slashB.rotation.y = dir * (1 - 2 * e2) * 0.95; slashB.visibility = a * 0.35;
    slashA.scaling.x = slashA.scaling.z = 1 + 0.12 * u;
    slashB.scaling.x = slashB.scaling.z = 1.1 + 0.12 * u;
  };

  const L = new Float32Array(NCH), A = new Float32Array(NCH), cur = new Float32Array(NCH), from = new Float32Array(NCH);
  loco(cur, 0, 0, 0, 0); A.set(cur); from.set(cur);
  let phase = 0, time = 0, w = 0, lastStep = -1, lastT = 999;
  return {
    /** x, z, yaw já interpolados; p = estado do jogador na sim; alpha = fração entre dois ticks. */
    update(x, z, yaw, p, alpha, dt, vmax) {
      root.position.set(x, 0, z); root.rotation.y = yaw;
      time += dt;
      const sp = Math.hypot(p.vx, p.vz);
      phase += sp * dt * 2.2;
      loco(L, phase, Math.min(sp / vmax, 1), (p.vx * Math.sin(yaw) + p.vz * Math.cos(yaw)) / vmax, time);
      const tf = Math.max(0, p.t + alpha - 1);
      if (p.st) {
        if (p.step !== lastStep || p.t < lastT) from.set(cur); // golpe novo: parte da pose atual, sem estalo
        atk(A, ANIM, ANIM.attacks[p.step].keys, tf, from);
        lastStep = p.step; lastT = p.t;
      } else { lastStep = -1; lastT = 999; }
      w += ((p.st ? 1 : 0) - w) * (1 - Math.exp(-dt * (p.st ? 40 : 14))); // peso do golpe: entra e sai suave
      const k = 1 - Math.exp(-dt * (p.st ? 55 : 18)); // filtro final: tira qualquer degrau da pose
      for (let c = 0; c < NCH; c++) cur[c] += (L[c] + (A[c] - L[c]) * w - cur[c]) * k;
      apply(cur);
      slash(p.st ? tf : -99, p.step);
    },
  };
}
