/** Figuras procedurais provisórias (VANGUARD e alvo de treino). Só leem o estado da sim. */
export function createRig(scene, kind) {
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
    const body = B.MeshBuilder.CreateCapsule('body', { radius: 0.45, height: 1.8 }, scene);
    body.material = mat('#4A4F57'); body.parent = root; body.position.y = 0.9; body.isPickable = false;
    return { update(x, z, yaw) { root.position.set(x, 0, z); root.rotation.y = yaw; } };
  }

  // VANGUARD: ombros largos, lâmina de um gume. Frente = +z local.
  const dark = mat('#2A2D33'), mid = mat('#4A4F57'), blade = mat('#E8E6E1', true);
  const hips = node(root, 0, 0.95, 0);
  const legL = node(hips, -0.14, 0, 0), legR = node(hips, 0.14, 0, 0);
  part(0.2, 0.92, 0.22, legL, 0, -0.46, 0, dark); part(0.2, 0.92, 0.22, legR, 0, -0.46, 0, dark);
  const torso = node(hips, 0, 0.05, 0);
  part(0.5, 0.62, 0.3, torso, 0, 0.36, 0, mid);
  part(0.3, 0.16, 0.36, torso, -0.38, 0.64, 0, dark); part(0.3, 0.16, 0.36, torso, 0.38, 0.64, 0, dark);
  part(0.26, 0.28, 0.28, torso, 0, 0.86, 0, dark); part(0.2, 0.05, 0.02, torso, 0, 0.88, 0.15, blade);
  const armL = node(torso, -0.36, 0.6, 0), armR = node(torso, 0.36, 0.6, 0);
  part(0.14, 0.58, 0.16, armL, 0, -0.29, 0, mid); part(0.14, 0.58, 0.16, armR, 0, -0.29, 0, mid);
  part(0.06, 0.06, 0.2, armR, 0, -0.6, 0.08, dark); part(0.04, 0.04, 1.0, armR, 0, -0.6, 0.7, blade);

  let phase = 0;
  return {
    update(x, z, yaw, vx, vz, dt, vmax) {
      root.position.set(x, 0, z); root.rotation.y = yaw;
      const sp = Math.hypot(vx, vz), s = Math.min(sp / vmax, 1);
      const fwd = vx * Math.sin(yaw) + vz * Math.cos(yaw); // velocidade para onde o corpo olha
      phase += sp * dt * 2.2;
      const sw = Math.sin(phase) * 0.9 * s;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.7; armR.rotation.x = -0.35 + sw * 0.25;
      torso.rotation.x = 0.2 * (fwd / vmax);
      hips.position.y = 0.95 + Math.abs(Math.sin(phase)) * 0.05 * s;
    },
  };
}
