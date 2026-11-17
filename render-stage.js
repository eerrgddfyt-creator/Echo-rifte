/** Render: motor Babylon, luz, arena e câmera de duelo. Só lê o estado da sim. */
const EL = 0.87; // elevação da câmera (~50°): fixa, sem rotação

function floorTexture(B, scene, R, sides) {
  const S = 1024, k = S / (2 * R), c0 = S / 2;
  const tex = new B.DynamicTexture('floorTex', S, scene, true);
  const c = tex.getContext();
  c.fillStyle = '#202328'; c.fillRect(0, 0, S, S);
  c.strokeStyle = '#2E3238'; c.lineWidth = 3;
  for (let r = 4; r < R; r += 4) { c.beginPath(); c.arc(c0, c0, r * k, 0, 6.2832); c.stroke(); } // anéis de distância (4 m)
  c.fillStyle = '#3A3F46';
  for (let o = 0; o < 2; o++) { // emblema "//": duas barras deslocadas no tempo
    const x = c0 - 40 + o * 52, y = c0 + o * 14;
    c.beginPath(); c.moveTo(x - 20, y + 90); c.lineTo(x + 2, y + 90); c.lineTo(x + 40, y - 90); c.lineTo(x + 18, y - 90); c.fill();
  }
  c.strokeStyle = '#6B727B'; c.lineWidth = 8; c.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = ((i + 0.5) * 2 * Math.PI) / sides, x = c0 + Math.cos(a) * R * k, y = c0 + Math.sin(a) * R * k;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.stroke();
  tex.update(); tex.anisotropicFilteringLevel = 4;
  return tex;
}

export function createStage(canvas, arena) {
  const B = window.BABYLON, hex = (h) => B.Color3.FromHexString(h);
  const engine = new B.Engine(canvas, true, { stencil: false, powerPreference: 'high-performance' }, false);
  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.043, 0.047, 0.055, 1);
  scene.skipPointerMovePicking = true;

  const camera = new B.FreeCamera('cam', new B.Vector3(0, 18, -15), scene);
  camera.fov = 0.72; camera.minZ = 1; camera.maxZ = 90; camera.rotation.x = EL;
  const hemi = new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85; hemi.groundColor = hex('#1A1C20');
  const sun = new B.DirectionalLight('sun', new B.Vector3(-0.4, -1, 0.5), scene);
  sun.intensity = 0.7;

  // piso: octógono com os cantos nos ângulos (i + 0.5) * 45°, igual à colisão da sim
  const R = arena.apothem / Math.cos(Math.PI / arena.sides);
  const pos = [0, 0, 0], nor = [0, 1, 0], uv = [0.5, 0.5], idx = [];
  for (let i = 0; i < arena.sides; i++) {
    const a = ((i + 0.5) * 2 * Math.PI) / arena.sides, x = Math.cos(a) * R, z = Math.sin(a) * R;
    pos.push(x, 0, z); nor.push(0, 1, 0); uv.push(x / (2 * R) + 0.5, z / (2 * R) + 0.5);
    idx.push(0, 1 + ((i + 1) % arena.sides), 1 + i);
  }
  const floor = new B.Mesh('floor', scene), vd = new B.VertexData();
  vd.positions = pos; vd.normals = nor; vd.uvs = uv; vd.indices = idx; vd.applyToMesh(floor);
  const fm = new B.StandardMaterial('floorMat', scene);
  fm.diffuseTexture = floorTexture(B, scene, R, arena.sides);
  fm.specularColor = B.Color3.Black(); fm.backFaceCulling = false;
  floor.material = fm; floor.isPickable = false; floor.freezeWorldMatrix();

  // paredes baixas: caixas no lado de fora de cada face (largura 0,5 m na direção da normal)
  const wm = new B.StandardMaterial('wallMat', scene);
  wm.diffuseColor = hex('#3A3F46'); wm.specularColor = B.Color3.Black();
  const L = 2 * arena.apothem * Math.tan(Math.PI / arena.sides) * 1.06;
  for (let i = 0; i < arena.sides; i++) {
    const a = (i * 2 * Math.PI) / arena.sides, d = arena.apothem + 0.25;
    const w = B.MeshBuilder.CreateBox('wall' + i, { width: 0.5, height: 0.7, depth: L }, scene);
    w.position.set(Math.cos(a) * d, 0.35, Math.sin(a) * d); w.rotation.y = -a;
    w.material = wm; w.isPickable = false; w.freezeWorldMatrix();
  }

  const look = { x: 0, z: 0 };
  let dist = 22;
  /** Câmera de duelo: enquadra os dois lutadores com zoom suave (sem rotação). */
  function frame(ax, az, bx, bz, dt) {
    const sep = Math.hypot(ax - bx, az - bz), k = 1 - Math.exp(-dt * 4);
    const want = Math.min(24, Math.max(16, 12 + sep));
    look.x += ((ax + bx) * 0.35 - look.x) * k;
    look.z += ((az + bz) * 0.35 - look.z) * k;
    dist += (want - dist) * k;
    camera.position.set(look.x, dist * Math.sin(EL), look.z - dist * Math.cos(EL));
  }
  return { engine, scene, camera, frame };
}
